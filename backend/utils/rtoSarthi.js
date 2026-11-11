// RTO Sarthi vehicle info API: the RC details of an Indian vehicle number (owner, model, insurance / PUC / fitness /
// tax / permit validity). The key lives in RTOSARTHI_API_KEY and never leaves the server.
// Only successful calls use the account's limit; errors are free.

const API_URL = "https://api.rtosarthi.com/api/v1/vehicle-info";
const TIMEOUT_MS = 30000;
const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

// The RC fields kept on a vehicle, in the order they are shown
const RC_FIELDS = [
  "REGN_NO", "REGISTERED_AT", "OWNER_NAME", "OWNER_SERIAL_NO", "PRESENT_ADDRESS",
  "VEHICLE_CLASS", "MAKER_DESC", "MAKER_MODEL", "FUEL_DESC", "FUEL_NORMS",
  "CHASI_NO", "ENG_NO", "REGN_DT", "REGN_UPTO", "FINANCER_DETAILS",
  "INSURANCE_COMP", "INS_POLICY_NO", "INSURANCE_UPTO", "PUCC_UPTO", "FIT_UPTO", "TAX_UPTO",
  "PERMIT_NO", "PERMIT_TYPE", "PERMIT_VALID_UPTO", "PERMIT_ISSUING_AUTHORITY",
  "BLACKLIST_STATUS", "NOC_DETAILS", "UNLADEN_WEIGHT", "LADEN_WEIGHT", "IS_COMMERCIAL",
  "PURCHASE_DT", "SALE_AMT", "VEHICLE_AGE",
];

class RtoSarthiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// "NA", "-", empty -> ""
const clean = (value) => {
  const text = String(value ?? "").trim();
  return !text || /^(na|n\/a|-|null|undefined)$/i.test(text) ? "" : text;
};

/** "15-Jun-2019", "15/06/2019" or "2019-06-15" as that day (UTC midnight, the way documents store days); else null. */
const parseRtoDate = (value) => {
  const text = clean(value);
  if (!text) return null;
  let match = text.match(/^(\d{1,2})[-/ ]([A-Za-z]{3})[A-Za-z]*[-/ ](\d{4})$/);
  if (match && MONTHS[match[2].toLowerCase()] !== undefined) {
    return new Date(Date.UTC(Number(match[3]), MONTHS[match[2].toLowerCase()], Number(match[1])));
  }
  match = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (match) return new Date(Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1])));
  match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return null;
};

// Tax paid for the vehicle's life ("LTT", "Lifetime", "One time")
const isLifetimeTax = (value) => /^(ltt|life\s*time|one\s*time|ott)\b/i.test(clean(value));

const normalizeVehicleNo = (value) => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

const callOnce = async (vno, apiKey) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${API_URL}?vno=${encodeURIComponent(vno)}`, {
      headers: { "x-api-key": apiKey, Accept: "application/json" },
      signal: controller.signal,
    });
    const body = await response.json().catch(() => ({}));
    return { status: response.status, body };
  } catch (error) {
    if (error.name === "AbortError") return { status: 504, body: { message: "RTO service took too long. Try again." } };
    return { status: 502, body: { message: "Could not reach the RTO service. Try again." } };
  } finally {
    clearTimeout(timer);
  }
};

/**
 * The RC details of a vehicle number: { data (only the known fields, "NA" dropped), source, usage }.
 * A 502 is retried once after a short wait. Throws RtoSarthiError with a message to show and the HTTP status.
 */
const fetchVehicleInfo = async (vehicleNo) => {
  const apiKey = String(process.env.RTOSARTHI_API_KEY || "").trim();
  if (!apiKey) throw new RtoSarthiError("RTO details are not set up on the server (RTOSARTHI_API_KEY)", 503);

  const vno = normalizeVehicleNo(vehicleNo);
  if (vno.length < 6) throw new RtoSarthiError("Enter the full vehicle number to fetch RTO details", 400);

  let result = await callOnce(vno, apiKey);
  if (result.status === 502) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    result = await callOnce(vno, apiKey);
  }

  const { status, body } = result;
  if (status !== 200 || !body?.success || !body.data) {
    const messages = {
      400: "This vehicle number is not valid for an RTO lookup",
      401: "The RTO Sarthi API key is wrong",
      403: "RTO Sarthi limit is used up (or the key is switched off). Recharge to fetch more.",
      404: "No RTO record found for this vehicle number",
    };
    throw new RtoSarthiError(body?.message || messages[status] || "RTO service is busy. Try again.", status === 200 ? 502 : status);
  }

  const data = {};
  for (const field of RC_FIELDS) {
    const value = clean(body.data[field]);
    if (value) data[field] = value;
  }
  return { data, source: body.source || "", usage: body.usage || null };
};

module.exports = { fetchVehicleInfo, parseRtoDate, isLifetimeTax, normalizeVehicleNo, RtoSarthiError, RC_FIELDS };
