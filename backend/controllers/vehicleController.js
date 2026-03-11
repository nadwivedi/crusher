const mongoose = require("mongoose");
const Vehicle = require("../models/Vehicle");

const createVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.create(req.body);
    return res.status(201).json(vehicle);
  } catch (error) {
    return res.status(400).json({
      message: "Failed to create vehicle",
      error: error.message,
    });
  }
};

const getAllVehicles = async (_req, res) => {
  try {
    const vehicles = await Vehicle.find().sort({ createdAt: -1 });
    return res.json(vehicles);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch vehicles",
      error: error.message,
    });
  }
};

const getVehicleById = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid vehicle id" });
  }

  try {
    const vehicle = await Vehicle.findById(id);

    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    return res.json(vehicle);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch vehicle",
      error: error.message,
    });
  }
};

const editVehicle = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid vehicle id" });
  }

  try {
    const vehicle = await Vehicle.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    return res.json(vehicle);
  } catch (error) {
    return res.status(400).json({
      message: "Failed to update vehicle",
      error: error.message,
    });
  }
};

const deleteVehicle = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid vehicle id" });
  }

  try {
    const vehicle = await Vehicle.findByIdAndDelete(id);

    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    return res.json({ message: "Vehicle deleted successfully" });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to delete vehicle",
      error: error.message,
    });
  }
};

module.exports = {
  createVehicle,
  getAllVehicles,
  getVehicleById,
  editVehicle,
  deleteVehicle,
};
