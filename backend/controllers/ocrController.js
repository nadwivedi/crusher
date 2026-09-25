const multer = require("multer");

// ─── Multer Setup ────────────────────────────────────────────────────────────

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Normalize material type string into allowed enum values.
 */
const normalizeMaterial = (raw = "") => {
  const s = String(raw).trim().toLowerCase().replace(/\s+/g, "");
  if (/(^|[^0-9])60([^0-9]|$)/.test(s) || s.includes("60mm")) return "60mm";
  if (/(^|[^0-9])40([^0-9]|$)/.test(s) || s.includes("40mm")) return "40mm";
  if (/(^|[^0-9])20([^0-9]|$)/.test(s) || s.includes("20mm")) return "20mm";
  if (/(^|[^0-9])10([^0-9]|$)/.test(s) || s.includes("10mm")) return "10mm";
  if (/(^|[^0-9])6([^0-9]|$)/.test(s) || s.includes("6mm")) return "6mm";
  if (/(^|[^0-9])4([^0-9]|$)/.test(s) || s.includes("4mm")) return "4mm";
  if (s.includes("gsb")) return "gsb";
  if (s.includes("wmm")) return "wmm";
  if (s.includes("dust")) return "dust";
  return s;
};

/**
 * Parse a date string (DD/MM/YYYY or YYYY-MM-DD) → yyyy-mm-dd.
 */
const parseSlipDate = (raw = "") => {
  const s = String(raw).trim();
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const ymd = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (ymd) {
    const [, y, m, d] = ymd;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return "";
};

/**
 * Parse a time string → HH:MM.
 */
const parseSlipTime = (raw = "") => {
  const s = String(raw || "").trim();
  const match = s.match(/^(\d{1,2})[:.](\d{2})/);
  if (!match) return "";
  const [, h, m] = match;
  return `${String(Number(h)).padStart(2, "0")}:${String(Number(m)).padStart(2, "0")}`;
};

/**
 * Sort two HH:MM time strings and return { entryTime, exitTime }.
 */
const resolveEntryAndExitTimes = (time1, time2) => {
  const t1 = parseSlipTime(time1);
  const t2 = parseSlipTime(time2);
  
  if (!t1 && !t2) return { entryTime: "", exitTime: "" };
  if (t1 && !t2) return { entryTime: t1, exitTime: t1 };
  if (!t1 && t2) return { entryTime: t2, exitTime: t2 };

  // Compare minutes since midnight
  const [h1, m1] = t1.split(":").map(Number);
  const [h2, m2] = t2.split(":").map(Number);
  const minutes1 = h1 * 60 + m1;
  const minutes2 = h2 * 60 + m2;

  if (minutes1 <= minutes2) {
    return { entryTime: t1, exitTime: t2 };
  } else {
    return { entryTime: t2, exitTime: t1 };
  }
};

/**
 * Fix common OCR character confusions in the LAST 4 DIGITS of an Indian
 * vehicle registration number.
 *
 * Indian plates:  SS 00 LL 0000  (10 chars) e.g. CG04AB6430
 *            or:  SS 00 L  0000  ( 9 chars) e.g. CG12Y1234
 *
 * The last 4 characters are ALWAYS digits. Letters misread there are
 * corrected using the table below with very high confidence.
 *
 * Map: O→0  I/L→1  S→5  B→8  Z→2  G→6  T→7  A→4
 */
const LETTER_TO_DIGIT = {
  O: "0", I: "1", L: "1", S: "5",
  B: "8", Z: "2", G: "6", T: "7", A: "4",
};

const normalizeVehicleNo = (raw = "") => {
  const s = String(raw).trim().toUpperCase().replace(/[\s\-]/g, "");
  if (s.length < 4) return s;

  const prefix = s.slice(0, s.length - 4); // everything before last 4
  const suffix = s.slice(-4);               // last 4 — always should be digits

  const fixedSuffix = suffix
    .split("")
    .map((ch) => LETTER_TO_DIGIT[ch] ?? ch)
    .join("");

  return prefix + fixedSuffix;
};

// ─── Shared Groq Caller ───────────────────────────────────────────────────────

// Llama 4 Scout was retired by Groq; Qwen 3.8 is the current vision-capable model.
// Override with GROQ_VISION_MODEL if Groq changes its lineup again.
const GROQ_VISION_MODEL = process.env.GROQ_VISION_MODEL || "qwen/qwen3.8-27b";

const callGroq = async (apiKey, dataUrl, prompt) => {
  const body = JSON.stringify({
    model: GROQ_VISION_MODEL,
    messages: [
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: dataUrl } },
          { type: "text", text: prompt },
        ],
      },
    ],
    max_tokens: 1024,
    temperature: 0,
    // Qwen is a reasoning model — keep <think> output out of the content we parse
    reasoning_format: "hidden",
  });

  // Retry briefly on rate-limit / over-capacity responses
  let response;
  for (let attempt = 0; attempt < 3; attempt++) {
    response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body,
    });
    if (response.status !== 429 && response.status !== 503) break;
    if (attempt === 2) break;
    const retryAfterSec = Number(response.headers.get("retry-after"));
    const waitMs = retryAfterSec > 0 ? Math.min(retryAfterSec * 1000, 20000) : 1000 * 2 ** attempt;
    await new Promise((r) => setTimeout(r, waitMs));
  }

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq API error: ${errText}`);
  }

  const groqData = await response.json();
  const rawContent = (groqData?.choices?.[0]?.message?.content || "")
    .replace(/<think>[\s\S]*?<\/think>/g, "");
  const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`Could not parse OCR JSON. Raw: ${rawContent}`);
  }
  return JSON.parse(jsonMatch[0]);
};

// ─── Shared prompt section for vehicle number ────────────────────────────────

const VEHICLE_NO_PROMPT = `
IMPORTANT — Indian Vehicle Number Format:
Indian vehicle numbers are 9 or 10 characters with NO spaces or hyphens:
  10-char: SS 00 LL 0000  e.g. CG04AB6430  (2-letter series)
   9-char: SS 00 L  0000  e.g. CG12Y1234   (1-letter series)
  SS = 2-letter state code (CG, MP, MH, UP, RJ, HR …)
  00 = 2-digit district number
  L/LL = 1 or 2 letter series code
  0000 = 4-digit serial — THE LAST 4 CHARACTERS ARE ALWAYS DIGITS, NEVER LETTERS

Common OCR confusions to watch for:
  Last 4 digits: O→0, I or L→1, S→5, B→8, Z→2, G→6, T→7, A→4
  Letter section: digit 0 may look like letter O, digit 1 like I — keep as letters there
  Y and V look very similar — read carefully from the image
  Output the full number as a single string with no spaces or hyphens.`;

// ─── Sales OCR ───────────────────────────────────────────────────────────────

const extractSaleFromImage = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No image file provided" });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ message: "GROQ_API_KEY is not configured" });

  try {
    const base64 = req.file.buffer.toString("base64");
    const mimeType = req.file.mimetype || "image/jpeg";
    const dataUrl = `data:${mimeType};base64,${base64}`;

    const prompt =
      `You are an OCR assistant for a stone crusher business in India.
Extract fields from this weighbridge SALE slip. Return ONLY a valid JSON object, no markdown.
${VEHICLE_NO_PROMPT}

Fields to extract:
- slipNo: the slip / serial / ticket / invoice number printed on the slip (e.g. "Sr No", "Slip No", "Ticket No", "RST No"), or "" if none
- vehicleNo: vehicle registration number (9 or 10 chars, no spaces)
- materialType: stone type (60MM, 40MM, 20MM, 10MM, 6MM, 4MM, WMM, GSB, DUST)
- grossWeight: GROSS weight in kg (number only)
- tareWeight: TARE weight in kg (number only)
- netWeight: NET weight in kg (number only)
- saleDate: date in DD/MM/YYYY format
- time1: first time seen on the slip (HH:MM format, 24h)
- time2: second time seen on the slip (HH:MM format, 24h, or "" if only one time visible)

Return ONLY:
{"slipNo":"","vehicleNo":"","materialType":"","grossWeight":0,"tareWeight":0,"netWeight":0,"saleDate":"","time1":"","time2":""}`;

    const parsed = await callGroq(apiKey, dataUrl, prompt);
    const { entryTime, exitTime } = resolveEntryAndExitTimes(parsed.time1, parsed.time2);

    return res.json({
      slipNo:       String(parsed.slipNo || "").trim().replace(/\s+/g, "").toUpperCase().slice(0, 40),
      vehicleNo:    normalizeVehicleNo(parsed.vehicleNo),
      materialType: normalizeMaterial(parsed.materialType),
      grossWeight:  Number(parsed.grossWeight) || 0,
      tareWeight:   Number(parsed.tareWeight)  || 0,
      netWeight:    Number(parsed.netWeight)   || 0,
      saleDate:     parseSlipDate(parsed.saleDate),
      entryTime,
      exitTime
    });
  } catch (err) {
    console.error("Sale OCR extraction error:", err);
    return res.status(500).json({ message: "OCR extraction failed", error: err.message });
  }
};

// ─── Boulder OCR ─────────────────────────────────────────────────────────────

const extractBoulderFromImage = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No image file provided" });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ message: "GROQ_API_KEY is not configured" });

  try {
    const base64 = req.file.buffer.toString("base64");
    const mimeType = req.file.mimetype || "image/jpeg";
    const dataUrl = `data:${mimeType};base64,${base64}`;

    const prompt =
      `You are an OCR assistant for a stone crusher business in India.
Extract fields from this BOULDER weighbridge slip (raw material incoming). Return ONLY a valid JSON object, no markdown.
${VEHICLE_NO_PROMPT}

Fields to extract:
- vehicleNo: vehicle registration number (9 or 10 chars, no spaces)
- grossWeight: GROSS weight in kg (number only)
- tareWeight: TARE weight in kg (number only)
- netWeight: NET weight in kg (number only)
- boulderDate: date in DD/MM/YYYY format
- time1: first time seen on the slip (HH:MM format, 24h)
- time2: second time seen on the slip (HH:MM format, 24h, or "" if only one time visible)

Return ONLY:
{"vehicleNo":"","grossWeight":0,"tareWeight":0,"netWeight":0,"boulderDate":"","time1":"","time2":""}`;

    const parsed = await callGroq(apiKey, dataUrl, prompt);
    const { entryTime, exitTime } = resolveEntryAndExitTimes(parsed.time1, parsed.time2);

    return res.json({
      vehicleNo:   normalizeVehicleNo(parsed.vehicleNo),
      materialType: "boulder",
      grossWeight:  Number(parsed.grossWeight) || 0,
      tareWeight:   Number(parsed.tareWeight)  || 0,
      netWeight:    Number(parsed.netWeight)   || 0,
      boulderDate:  parseSlipDate(parsed.boulderDate || parsed.saleDate),
      entryTime,
      exitTime
    });
  } catch (err) {
    console.error("Boulder OCR extraction error:", err);
    return res.status(500).json({ message: "Boulder OCR extraction failed", error: err.message });
  }
};

module.exports = { extractSaleFromImage, extractBoulderFromImage, upload };
