const mongoose = require("mongoose");
const Party = require("../models/Party");

const createParty = async (req, res) => {
  try {
    const party = await Party.create(req.body);
    return res.status(201).json(party);
  } catch (error) {
    return res.status(400).json({
      message: "Failed to create party",
      error: error.message,
    });
  }
};

const getAllParties = async (_req, res) => {
  try {
    const parties = await Party.find().sort({ createdAt: -1 });
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
    const party = await Party.findById(id);

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
    const party = await Party.findByIdAndUpdate(id, req.body, {
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
    const party = await Party.findByIdAndDelete(id);

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
