const mongoose = require("mongoose");
const Counter = require("../models/Counter");
const Party = require("../models/Party");
const Transport = require("../models/Transport");
const { PERIOD_BASES, normalizeBasis, calcTransportAmount } = require("./transportBasis");

// Whose vehicle carried the sale: the party's own, mine, or one hired from a transporter
const SALE_TRANSPORT_MODES = ["party", "own", "hired"];

const NO_SALE_TRANSPORT = {
  transportMode: "party",
  transportCharge: 0,
  transporterId: null,
  transportBasis: "per_ton",
  transportQty: 0,
  transportRate: 0,
  transportCost: 0,
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const createTransportNumber = async (userId, entryDate) => {
  const date = entryDate ? new Date(entryDate) : new Date();
  const year = Number.isNaN(date.getTime()) ? new Date().getFullYear() : date.getFullYear();
  const counter = await Counter.findOneAndUpdate(
    { userId, key: `transport:${year}` },
    { $inc: { seq: 1 } },
    {
      returnDocument: "after",
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );

  return `TRN-${year}-${String(counter.seq).padStart(2, "0")}`;
};

/**
 * The transport fields of a sale, cleaned up from what the client sent.
 * transportCharge is what the party pays (already inside the sale total);
 * transportCost is what I owe the transporter of a hired vehicle.
 */
const resolveSaleTransport = async (payload = {}, userId) => {
  const mode = SALE_TRANSPORT_MODES.includes(payload.transportMode) ? payload.transportMode : "party";
  if (mode === "party") return { ...NO_SALE_TRANSPORT };

  const transportCharge = Math.max(0, toNumber(payload.transportCharge));
  if (mode === "own") return { ...NO_SALE_TRANSPORT, transportMode: "own", transportCharge };

  const transporterId = `${payload.transporterId || ""}`.trim();
  if (!transporterId || !mongoose.Types.ObjectId.isValid(transporterId)) {
    throw new Error("Transporter is required for a hired vehicle");
  }

  const transporter = await Party.findOne({ _id: transporterId, userId }).select("_id");
  if (!transporter) {
    throw new Error("Transporter not found");
  }

  const transportBasis = normalizeBasis(payload.transportBasis);
  const transportQty = Math.max(0, toNumber(payload.transportQty));
  const transportRate = Math.max(0, toNumber(payload.transportRate));

  return {
    transportMode: "hired",
    transportCharge,
    transporterId: transporter._id,
    transportBasis,
    transportQty,
    transportRate,
    transportCost: PERIOD_BASES.includes(transportBasis)
      ? 0
      : calcTransportAmount(transportBasis, transportQty, transportRate),
  };
};

/**
 * Keeps the transport entries of a sale in step with the sale:
 * one "receivable" for the charge billed to the party, one "payable" for the hired vehicle's cost.
 */
const syncSaleTransportEntries = async (sale) => {
  const userId = sale.userId;
  const wanted = [];

  if (sale.transportMode !== "party" && toNumber(sale.transportCharge) > 0) {
    wanted.push({
      direction: "receivable",
      partyId: sale.partyId,
      basis: "fixed",
      quantity: 1,
      rate: toNumber(sale.transportCharge),
      amount: toNumber(sale.transportCharge),
    });
  }

  if (sale.transportMode === "hired" && sale.transporterId && toNumber(sale.transportCost) > 0) {
    wanted.push({
      direction: "payable",
      partyId: sale.transporterId,
      basis: sale.transportBasis,
      quantity: toNumber(sale.transportQty),
      rate: toNumber(sale.transportRate),
      amount: toNumber(sale.transportCost),
    });
  }

  const existing = await Transport.find({ userId, saleId: sale._id });
  const keptIds = [];

  for (const fields of wanted) {
    const shared = {
      ...fields,
      entryDate: sale.saleDate || sale.createdAt || new Date(),
      vehicleId: sale.vehicleId || null,
      vehicleNo: sale.vehicleNo || "",
    };
    const current = existing.find((entry) => entry.direction === fields.direction);

    if (current) {
      Object.assign(current, shared);
      await current.save();
      keptIds.push(String(current._id));
    } else {
      await Transport.create({
        ...shared,
        userId,
        source: "sale",
        saleId: sale._id,
        entryNumber: await createTransportNumber(userId, shared.entryDate),
      });
    }
  }

  const staleIds = existing.filter((entry) => !keptIds.includes(String(entry._id))).map((entry) => entry._id);
  if (staleIds.length > 0) {
    await Transport.deleteMany({ _id: { $in: staleIds } });
  }
};

const deleteSaleTransportEntries = (userId, saleId) => Transport.deleteMany({ userId, saleId });

// A charge billed inside a sale is already in that sale's total, so it must not hit the party ledger twice
const isBilledInSale = (entry) => entry?.source === "sale" && entry?.direction === "receivable";

module.exports = {
  SALE_TRANSPORT_MODES,
  createTransportNumber,
  resolveSaleTransport,
  syncSaleTransportEntries,
  deleteSaleTransportEntries,
  isBilledInSale,
};
