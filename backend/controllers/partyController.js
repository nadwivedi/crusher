const mongoose = require("mongoose");
const Party = require("../models/Party");
const Purchase = require("../models/Purchase");
const Expense = require("../models/Expense");
const { scopedFilter, scopedIdFilter } = require("../utils/ownership");

const isDefaultCashParty = (party) => (
  party?.type === "cash-in-hand" && String(party?.name || "").trim().toLowerCase() === "cash"
);

// Every account gets one default "Cash" party so cash sales/purchases/expenses
// have their own ledger. Older party-less purchases/expenses are moved onto it.
const ensureDefaultCashParty = async (userId) => {
  const existing = await Party.findOne({
    userId,
    type: "cash-in-hand",
    name: { $regex: /^cash$/i },
  });
  if (existing) return existing;

  const cashParty = await Party.create({ userId, name: "Cash", type: "cash-in-hand" });
  await Promise.all([
    Purchase.updateMany({ userId, party: null }, { $set: { party: cashParty._id } }),
    Expense.updateMany({ userId, party: null }, { $set: { party: cashParty._id } }),
  ]);
  return cashParty;
};

const createParty = async (req, res) => {
  try {
    const party = await Party.create({
      ...req.body,
      userId: req.userId,
    });
    return res.status(201).json(party);
  } catch (error) {
    return res.status(400).json({
      message: "Failed to create party",
      error: error.message,
    });
  }
};

const getAllParties = async (req, res) => {
  try {
    await ensureDefaultCashParty(req.userId);
    const parties = await Party.find(scopedFilter(req)).sort({ createdAt: -1 });
    return res.json(parties);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch parties",
      error: error.message,
    });
  }
};

const getPartyById = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid party id" });
  }

  try {
    const party = await Party.findOne(scopedIdFilter(req, id));

    if (!party) {
      return res.status(404).json({ message: "Party not found" });
    }

    return res.json(party);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch party",
      error: error.message,
    });
  }
};

const editParty = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid party id" });
  }

  try {
    const party = await Party.findOneAndUpdate(scopedIdFilter(req, id), req.body, {
      new: true,
      runValidators: true,
    });

    if (!party) {
      return res.status(404).json({ message: "Party not found" });
    }

    return res.json(party);
  } catch (error) {
    return res.status(400).json({
      message: "Failed to update party",
      error: error.message,
    });
  }
};

const deleteParty = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid party id" });
  }

  try {
    const existingParty = await Party.findOne(scopedIdFilter(req, id));
    if (isDefaultCashParty(existingParty)) {
      return res.status(400).json({ message: "The default Cash party cannot be deleted" });
    }

    const party = await Party.findOneAndDelete(scopedIdFilter(req, id));

    if (!party) {
      return res.status(404).json({ message: "Party not found" });
    }

    return res.json({ message: "Party deleted successfully" });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to delete party",
      error: error.message,
    });
  }
};

module.exports = {
  createParty,
  getAllParties,
  getPartyById,
  editParty,
  deleteParty,
};
