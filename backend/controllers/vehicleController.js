const mongoose = require("mongoose");
const Vehicle = require("../models/Vehicle");
const Party = require("../models/Party");
const MonthlyHire = require("../models/MonthlyHire");
const { scopedFilter, scopedIdFilter } = require("../utils/ownership");
const { cleanTripRates } = require("../utils/transportBasis");
const { todayDay, syncVehicleMonthlyHire, syncHireEntries, findActiveVehicleHire } = require("../utils/monthlyHire");

// The running monthly hire of each vehicle on monthly rent, so the app can show and edit its from date
const attachMonthlyHires = async (userId, vehicles) => {
  const monthlyIds = vehicles.filter((vehicle) => vehicle.hireBasis === "per_month").map((vehicle) => vehicle._id);
  if (monthlyIds.length === 0) return vehicles.map((vehicle) => vehicle.toObject());

  const hires = await MonthlyHire.find({
    userId,
    vehicleId: { $in: monthlyIds },
    cancelledAt: null,
    $or: [{ endDate: null }, { endDate: { $gte: new Date(todayDay()) } }],
  }).sort({ startDate: 1 });
  const byVehicle = new Map(hires.map((hire) => [String(hire.vehicleId), { _id: hire._id, startDate: hire.startDate, monthlyRate: hire.monthlyRate }]));

  return vehicles.map((vehicle) => ({ ...vehicle.toObject(), monthlyHire: byVehicle.get(String(vehicle._id)) || null }));
};

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
    await syncVehicleMonthlyHire(vehicle, req.body.monthlyFrom);
    const [saved] = await attachMonthlyHires(req.userId, [vehicle]);
    return res.status(201).json(saved);
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
    return res.json(await attachMonthlyHires(req.userId, vehicles));
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

    await syncVehicleMonthlyHire(vehicle, req.body.monthlyFrom);
    const [saved] = await attachMonthlyHires(req.userId, [vehicle]);
    return res.json(saved);
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

    // A vehicle that goes stops its monthly hire today; the months it already booked stay in the ledger
    const activeHire = await findActiveVehicleHire(vehicle.userId, vehicle._id);
    if (activeHire) {
      const today = new Date(todayDay());
      activeHire.cancelledAt = today < activeHire.startDate ? activeHire.startDate : today;
      activeHire.cancelCharge = "prorata";
      activeHire.history.push({ at: new Date(), action: "Cancelled", note: "Vehicle deleted; days used charged" });
      await activeHire.save();
      await syncHireEntries(activeHire);
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
