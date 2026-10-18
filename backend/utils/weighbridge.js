const crypto = require("crypto");
const mongoose = require("mongoose");
const Weighment = require("../models/Weighment");

// Live weighbridge readings, kept in memory (the backend runs as one process).
// The cabin computer posts readings; every other screen gets them pushed over Server-Sent Events.

// A capture takes the last stable reading only if it is this fresh
const READING_MAX_AGE_MS = 3000;

const latest = new Map(); // deviceId -> { weightKg, stable, overload, at, source }
const subscribers = new Map(); // deviceId -> Set of res

const getLatestReading = (deviceId) => latest.get(String(deviceId)) || null;

const isFresh = (reading, now = Date.now()) => Boolean(reading) && now - reading.at <= READING_MAX_AGE_MS;

const sendEvent = (res, data) => {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
};

const publishReading = (deviceId, reading) => {
  const key = String(deviceId);
  latest.set(key, reading);
  const listeners = subscribers.get(key);
  if (!listeners) return;
  listeners.forEach((res) => sendEvent(res, { type: "reading", deviceId: key, ...reading }));
};

// Tells open screens that tickets changed, so they reload the list
const publishTickets = (deviceId) => {
  const listeners = subscribers.get(String(deviceId));
  if (!listeners) return;
  listeners.forEach((res) => sendEvent(res, { type: "tickets", deviceId: String(deviceId) }));
};

const subscribe = (deviceId, res) => {
  const key = String(deviceId);
  if (!subscribers.has(key)) subscribers.set(key, new Set());
  subscribers.get(key).add(res);
  const current = latest.get(key);
  if (current) sendEvent(res, { type: "reading", deviceId: key, ...current });
  return () => {
    const listeners = subscribers.get(key);
    if (!listeners) return;
    listeners.delete(res);
    if (!listeners.size) subscribers.delete(key);
  };
};

// Each closed ticket carries a hash over its weights and the previous ticket's hash,
// so a ticket changed in the database afterwards no longer matches the chain.
const hashWeighment = (weighment, prevHash) => crypto
  .createHash("sha256")
  .update(JSON.stringify({
    prevHash,
    userId: String(weighment.userId),
    rstNo: weighment.rstNo,
    vehicleNo: weighment.vehicleNo,
    direction: weighment.direction,
    first: [weighment.first?.weightKg, new Date(weighment.first?.at).toISOString(), weighment.first?.source],
    second: [weighment.second?.weightKg, new Date(weighment.second?.at).toISOString(), weighment.second?.source],
    grossKg: weighment.grossKg,
    tareKg: weighment.tareKg,
    netKg: weighment.netKg,
  }))
  .digest("hex");

// ---------- Sales and boulder entries made from a ticket ----------

const LINK_FIELD = { sale: "linkedSaleId", boulder: "linkedBoulderId" };

const timeOf = (date) => {
  const d = new Date(date);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

// Weights an entry must use when it comes from a ticket
const weighmentWeights = (weighment) => {
  const times = [weighment.first?.at, weighment.second?.at].filter(Boolean).map((t) => new Date(t)).sort((a, b) => a - b);
  return {
    grossWeight: weighment.grossKg,
    tareWeight: weighment.tareKg,
    netWeight: weighment.netKg,
    rstNo: String(weighment.rstNo),
    entryTime: times[0] ? timeOf(times[0]) : "",
    exitTime: times[1] ? timeOf(times[1]) : "",
    weighmentId: weighment._id,
    weightSource: "weighbridge",
  };
};

// Reserves a closed ticket for one new entry. Atomic, so two entries can never use the same ticket.
// kind: "sale" | "boulder". Throws with a message for the user when the ticket cannot be used.
const claimWeighment = async (userId, weighmentId, kind) => {
  if (!mongoose.Types.ObjectId.isValid(weighmentId)) throw new Error("Invalid weighbridge ticket");
  const claimed = await Weighment.findOneAndUpdate(
    { _id: weighmentId, userId, status: "closed", direction: { $in: [kind, "other"] } },
    { $set: { status: "used" } },
    { new: true }
  );
  if (claimed) return claimed;
  const existing = await Weighment.findOne({ _id: weighmentId, userId }).select("status direction rstNo").lean();
  if (!existing) throw new Error("Weighbridge ticket not found");
  if (existing.status === "used") throw new Error(`RST ${existing.rstNo} is already used by another entry`);
  if (existing.status === "open") throw new Error(`RST ${existing.rstNo} is waiting for its second weight`);
  if (existing.status === "cancelled") throw new Error(`RST ${existing.rstNo} was cancelled`);
  throw new Error(`RST ${existing.rstNo} is a ${existing.direction} ticket`);
};

const linkWeighment = (weighmentId, kind, entryId) => Weighment.updateOne(
  { _id: weighmentId },
  { $set: { [LINK_FIELD[kind]]: entryId } }
);

// The entry was not saved or was deleted: the ticket can be used again
const releaseWeighment = (userId, weighmentId) => {
  if (!weighmentId) return Promise.resolve();
  return Weighment.updateOne(
    { _id: weighmentId, userId, status: "used" },
    { $set: { status: "closed", linkedSaleId: null, linkedBoulderId: null } }
  );
};

// Fields an edit may not change on an entry whose weights came from the weighbridge
const LOCKED_FIELDS = ["grossWeight", "tareWeight", "netWeight", "rstNo", "weighmentId", "weightSource", "vehicleWeight", "materialWeight", "boulderWeight"];

const stripLockedFields = (payload) => {
  const next = { ...payload };
  LOCKED_FIELDS.forEach((field) => delete next[field]);
  return next;
};

module.exports = {
  READING_MAX_AGE_MS,
  getLatestReading,
  isFresh,
  publishReading,
  publishTickets,
  subscribe,
  sendEvent,
  hashWeighment,
  weighmentWeights,
  claimWeighment,
  linkWeighment,
  releaseWeighment,
  stripLockedFields,
};
