const multer = require("multer");

// Use memory storage so we don't touch the disk
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

/**
 * Normalize the raw material string from the slip into one of the
 * allowed enum values: 10mm | 20mm | 40mm | dust | wmm | gsb
 */
const normalizeMaterial = (raw = "") => {
  const s = String(raw).trim().toLowerCase().replace(/\s+/g, "");
  if (s.includes("10")) return "10mm";
  if (s.includes("20")) return "20mm";
  if (s.includes("40")) return "40mm";
  if (s.includes("gsb")) return "gsb";
  if (s.includes("wmm")) return "wmm";
  if (s.includes("dust")) return "dust";
  return s;
};

/**
 * Parse a date string from the slip (DD/MM/YYYY or YYYY/MM/DD) and
 * return it as yyyy-mm-dd for the HTML date input.
 */
const parseSlipDate = (raw = "") => {
  const s = String(raw).trim();
  // DD/MM/YYYY
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // YYYY/MM/DD or YYYY-MM-DD
  const ymd = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (ymd) {
    const [, y, m, d] = ymd;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return "";
};

const extractSaleFromImage = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No image file provided" });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ message: "GROQ_API_KEY is not configured" });
  }

  try {
    // Convert buffer to base64 data URL
    const base64 = req.file.buffer.toString("base64");
    const mimeType = req.file.mimetype || "image/jpeg";
    const dataUrl = `data:${mimeType};base64,${base64}`;

    const prompt = `You are an OCR assistant for a stone crusher business. 
Extract the following fields from this weighbridge slip image and return ONLY a valid JSON object with no extra text or markdown.

Fields to extract:
- vehicleNo: vehicle registration number (e.g. MP22ZD6430)
- materialType: material/stone type (e.g. 10MM, 20MM, 40MM, GSB, WMM, DUST)
- grossWeight: GROSS Wt in kg (numeric, no units)
- tareWeight: TARE Wt in kg (numeric, no units)  
- netWeight: NET Wt in kg (numeric, no units)
- saleDate: date from the slip in DD/MM/YYYY format

Return ONLY this JSON format:
{"vehicleNo":"","materialType":"","grossWeight":0,"tareWeight":0,"netWeight":0,"saleDate":""}`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: dataUrl },
              },
              {
                type: "text",
                text: prompt,
              },
            ],
          },
        ],
        max_tokens: 256,
        temperature: 0,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Groq API error:", errText);
      return res.status(502).json({ message: "Groq API request failed", detail: errText });
    }

    const groqData = await response.json();
    const rawContent = groqData?.choices?.[0]?.message?.content || "";

    // Extract JSON from the response (strip any markdown fences if present)
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(422).json({
        message: "Could not parse OCR response as JSON",
        raw: rawContent,
      });
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Normalize and validate the extracted values
    const result = {
      vehicleNo: String(parsed.vehicleNo || "").trim().toUpperCase(),
      materialType: normalizeMaterial(parsed.materialType),
      grossWeight: Number(parsed.grossWeight) || 0,   // maps to netWeight field in form
      tareWeight: Number(parsed.tareWeight) || 0,     // maps to vehicleWeight field in form
      netWeight: Number(parsed.netWeight) || 0,       // maps to materialWeight field in form
      saleDate: parseSlipDate(parsed.saleDate),
    };

    return res.json(result);
  } catch (err) {
    console.error("OCR extraction error:", err);
    return res.status(500).json({ message: "OCR extraction failed", error: err.message });
  }
};

module.exports = { extractSaleFromImage, upload };
