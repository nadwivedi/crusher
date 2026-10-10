const mongoose = require("mongoose");
const Party = require("../models/Party");
const Transport = require("../models/Transport");
const Vehicle = require("../models/Vehicle");
const { scopedFilter, scopedIdFilter } = require("../utils/ownership");
const { createTransportNumber, isBilledInSale } = require("../utils/transport");
const { TRANSPORT_BASES, calcTransportAmount } = require("../utils/transportBasis");

const DIRECTIONS = ["payable", "receivable"];

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const serializeEntry = (entryDoc) => {
  const entry = typeof entryDoc.toObject === "function" ? entryDoc.toObject() : { ...entryDoc };
  const party = entry.partyId && typeof entry.partyId === "object" && entry.partyId.name !== undefined ? entry.partyId : null;
  const sale = entry.saleId && typeof entry.saleId === "object" && entry.saleId.invoiceNumber !== undefined ? entry.saleId : null;

  return {
    ...entry,
    partyId: party ? party._id : entry.partyId,
    partyName: party?.name || "",
    partyType: party?.type || "",
    saleId: sale ? sale._id : entry.saleId,
    invoiceNumber: sale?.invoiceNumber || "",
    billedInSale: isBilledInSale(entry),
  };
};

// Validated fields of a manual entry, or throws with a message for the user
const buildEntryFields = async (body, userId) => {
  const direction = String(body.direction || "").trim();
  if (!DIRECTIONS.includes(direction)) {
    throw new Error("Choose whether you pay or receive for this entry");
  }

  if (!body.partyId || !mongoose.Types.ObjectId.isValid(body.partyId)) {
    throw new Error("Party is required");
  }
  const party = await Party.findOne({ _id: body.partyId, userId }).select("_id");
  if (!party) {
    throw new Error("Party not found");
  }

  const basis = String(body.basis || "").trim();
  if (!TRANSPORT_BASES.includes(basis)) {
    throw new Error("Choose how this vehicle is charged");
  }

  const quantity = basis === "fixed" ? 1 : Math.max(0, toNumber(body.quantity));
  const rate = Math.max(0, toNumber(body.rate));
  const amount = calcTransportAmount(basis, quantity, rate);
  if (amount <= 0) {
    throw new Error("Amount must be greater than 0");
  }

  const entryDate = toDate(body.entryDate) || new Date();

  let vehicleId = null;
  let vehicleNo = String(body.vehicleNo || "").trim().toUpperCase();
  if (body.vehicleId && mongoose.Types.ObjectId.isValid(body.vehicleId)) {
    const vehicle = await Vehicle.findOne({ _id: body.vehicleId, userId }).select("_id vehicleNo");
    if (vehicle) {
      vehicleId = vehicle._id;
      vehicleNo = vehicle.vehicleNo;
    }
  }

  return {
    direction,
    partyId: party._id,
    basis,
    location: basis === "per_trip" ? String(body.location || "").trim() : "",
    quantity,
    rate,
    amount,
    entryDate,
    vehicleId,
    vehicleNo,
    fromDate: toDate(body.fromDate),
    toDate: toDate(body.toDate),
    notes: String(body.notes || "").trim(),
  };
};

const getTransportEntries = async (req, res) => {
  try {
    const query = scopedFilter(req);
    if (req.visibilityBoundary) {
      query.entryDate = { $gte: req.visibilityBoundary };
    }

    const entries = await Transport.find(query)
      .populate("partyId", "name type")
      .populate("saleId", "invoiceNumber")
      .sort({ entryDate: -1, createdAt: -1 });

    return res.json(entries.map(serializeEntry));
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch transport entries",
      error: error.message,
    });
  }
};

const createTransportEntry = async (req, res) => {
  try {
    const fields = await buildEntryFields(req.body, req.userId);
    const entry = await Transport.create({
      ...fields,
      userId: req.userId,
      source: "manual",
      entryNumber: await createTransportNumber(req.userId, fields.entryDate),
    });

    return res.status(201).json(serializeEntry(entry));
  } catch (error) {
    return res.status(400).json({ message: error.message || "Failed to save transport entry" });
  }
};

const editTransportEntry = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid transport entry id" });
  }

  try {
    const entry = await Transport.findOne(scopedIdFilter(req, id));
    if (!entry) {
      return res.status(404).json({ message: "Transport entry not found" });
    }
    if (entry.source === "sale") {
      return res.status(400).json({ message: "This entry comes from a sale. Edit the sale to change it." });
    }
    if (entry.source === "monthly_hire") {
      return res.status(400).json({ message: "This month is booked by a monthly hire. Open the hire to change it." });
    }
    if (entry.source === "boulder") {
      return res.status(400).json({ message: "This entry comes from a boulder entry. Edit the boulder entry to change it." });
    }

    Object.assign(entry, await buildEntryFields(req.body, req.userId));
    await entry.save();

    return res.json(serializeEntry(entry));
  } catch (error) {
    return res.status(400).json({ message: error.message || "Failed to update transport entry" });
  }
};

const deleteTransportEntry = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid transport entry id" });
  }

  try {
    const entry = await Transport.findOne(scopedIdFilter(req, id));
    if (!entry) {
      return res.status(404).json({ message: "Transport entry not found" });
    }
    if (entry.source === "sale") {
      return res.status(400).json({ message: "This entry comes from a sale. Edit or delete the sale instead." });
    }
    if (entry.source === "monthly_hire") {
      return res.status(400).json({ message: "This month is booked by a monthly hire. Cancel or delete the hire instead." });
    }
    if (entry.source === "boulder") {
      return res.status(400).json({ message: "This entry comes from a boulder entry. Edit or delete the boulder entry instead." });
    }

    await entry.deleteOne();
    return res.json({ message: "Transport entry deleted successfully" });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to delete transport entry",
      error: error.message,
    });
  }
};

module.exports = {
  getTransportEntries,
  createTransportEntry,
  editTransportEntry,
  deleteTransportEntry,
};
