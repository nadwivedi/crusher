const mongoose = require("mongoose");
const Boulder = require("../models/Boulder");

const createBoulder = async (req, res) => {
  try {
    const boulder = await Boulder.create(req.body);
    return res.status(201).json(boulder);
  } catch (error) {
    return res.status(400).json({
      message: "Failed to create boulder",
      error: error.message,
    });
  }
};

const getAllBoulders = async (_req, res) => {
  try {
    const boulders = await Boulder.find().sort({ createdAt: -1 });
    return res.json(boulders);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch boulders",
      error: error.message,
    });
  }
};

const getBoulderById = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid boulder id" });
  }

  try {
    const boulder = await Boulder.findById(id);

    if (!boulder) {
      return res.status(404).json({ message: "Boulder not found" });
    }

    return res.json(boulder);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch boulder",
      error: error.message,
    });
  }
};

const editBoulder = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid boulder id" });
  }

  try {
    const boulder = await Boulder.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!boulder) {
      return res.status(404).json({ message: "Boulder not found" });
    }

    return res.json(boulder);
  } catch (error) {
    return res.status(400).json({
      message: "Failed to update boulder",
      error: error.message,
    });
  }
};

const deleteBoulder = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid boulder id" });
  }

  try {
    const boulder = await Boulder.findByIdAndDelete(id);

    if (!boulder) {
      return res.status(404).json({ message: "Boulder not found" });
    }

    return res.json({ message: "Boulder deleted successfully" });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to delete boulder",
      error: error.message,
    });
  }
};

module.exports = {
  createBoulder,
  getAllBoulders,
  getBoulderById,
  editBoulder,
  deleteBoulder,
};
