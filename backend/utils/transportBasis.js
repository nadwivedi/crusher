// How a vehicle is charged: by distance, by weight, by trip, by time, or one fixed amount
const TRANSPORT_BASES = ["per_km", "per_ton", "per_trip", "per_day", "per_week", "per_month", "fixed"];

// Rent for a period is booked from the Transport page, not on each sale
const PERIOD_BASES = ["per_day", "per_week", "per_month"];

const BASIS_UNITS = {
  per_km: "km",
  per_ton: "ton",
  per_trip: "trip",
  per_day: "day",
  per_week: "week",
  per_month: "month",
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const roundAmount = (value) => Math.round(toNumber(value) * 100) / 100;

const normalizeBasis = (value) => (TRANSPORT_BASES.includes(value) ? value : "per_ton");

// A fixed amount ignores the quantity
const calcTransportAmount = (basis, quantity, rate) => {
  const numericRate = Math.max(0, toNumber(rate));
  if (basis === "fixed") return roundAmount(numericRate);
  return roundAmount(Math.max(0, toNumber(quantity)) * numericRate);
};

// "120 km x Rs 40", "2 months x Rs 60,000", or "Fixed amount"
const describeTransportBasis = (entry) => {
  const unit = BASIS_UNITS[entry?.basis];
  if (!unit) return "Fixed amount";
  const quantity = toNumber(entry.quantity);
  const unitLabel = unit === "km" || quantity === 1 ? unit : `${unit}s`;
  return `${quantity.toLocaleString("en-IN")} ${unitLabel} x Rs ${toNumber(entry.rate).toLocaleString("en-IN")}`;
};

// Per-trip rates with a location name; blank rows are dropped
const cleanTripRates = (tripRates) => (Array.isArray(tripRates) ? tripRates : [])
  .map((row) => ({ location: String(row?.location || "").trim(), rate: Math.max(0, toNumber(row?.rate)) }))
  .filter((row) => row.location);

const TRIP_RATES_FIELD = [
  {
    _id: false,
    location: { type: String, trim: true, required: true },
    rate: { type: Number, default: 0, min: 0 },
  },
];

module.exports = {
  TRANSPORT_BASES,
  TRIP_RATES_FIELD,
  cleanTripRates,
  PERIOD_BASES,
  BASIS_UNITS,
  normalizeBasis,
  calcTransportAmount,
  describeTransportBasis,
};
