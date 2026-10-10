const mongoose = require("mongoose");
const Vehicle = require("../models/Vehicle");
const Party = require("../models/Party");
const { scopedFilter, scopedIdFilter } = require("../utils/ownership");
const { cleanTripRates } = require("../utils/transportBasis");

// My own vehicle belongs to no party
const resolvePartyId = async (userId, partyId, ownership) => {
  if (!partyId || ownership === "own") {
    return null;
  }

  if (!mongoose.Types.ObjectId.isValid(partyId)) {
    throw new Error("Invalid party id");
  }

  const party = await Party.findOne({ _id: partyId, userId }).select("_id");
  if (!party) {
    throw new Error("Party not found");
  }

  return party._id;
};

const createVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.create({
      ...req.body,
      tripRates: cleanTripRates(req.body.tripRates),
      userId: req.userId,
      partyId: await resolvePartyId(req.userId, req.body.partyId, req.body.ownership),
    });
    return res.status(201).json(vehicle);
  } catch (error) {
    return res.status(400).json({
      message: "Failed to create vehicle",
      error: error.message,
    });
  }
};

const getAllVehicles = async (req, res) => {
  try {
    const { vehicleType } = req.query;
    const filter = scopedFilter(req, vehicleType ? { vehicleType } : {});
    const vehicles = await Vehicle.find(filter).sort({ createdAt: -1 });
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
    const vehicle = await Vehicle.findOne(scopedIdFilter(req, id));

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
    const updatePayload = { ...req.body };
    if (Object.prototype.hasOwnProperty.call(req.body, "tripRates")) {
      updatePayload.tripRates = cleanTripRates(req.body.tripRates);
    }
    if (Object.prototype.hasOwnProperty.call(req.body, "partyId") || req.body.ownership === "own") {
      updatePayload.partyId = await resolvePartyId(req.userId, req.body.partyId, req.body.ownership);
    }

    const vehicle = await Vehicle.findOneAndUpdate(scopedIdFilter(req, id), updatePayload, {
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
    const vehicle = await Vehicle.findOneAndDelete(scopedIdFilter(req, id));

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
