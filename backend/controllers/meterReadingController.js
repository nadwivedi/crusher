const mongoose = require("mongoose");
const { applyVisibility } = require("../middleware/staffAccess");
const MeterReading = require("../models/MeterReading");
const Vehicle = require("../models/Vehicle");
const { meterUnitFor } = require("../utils/diesel");
const { scopedFilter, scopedIdFilter } = require("../utils/ownership");

class ReadingError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// A meter value: null when left empty, otherwise a number of 0 or more
const readMeter = (value, label) => {
  if (value === "" || value === null || value === undefined) return null;
  const reading = Number(value);
  if (!Number.isFinite(reading) || reading < 0) {
    throw new ReadingError(400, `${label} must be a number of 0 or more`);
  }
  return reading;
};

// Checks the body and returns the fields to save
const readBody = async (req) => {
  const machine = req.body.machine === "dg" ? "dg" : req.body.machine === "vehicle" ? "vehicle" : "";
  if (!machine) throw new ReadingError(400, "Choose the DG set or a vehicle");

  let vehicle = null;
  if (machine === "vehicle") {
    if (!req.body.vehicle || !mongoose.Types.ObjectId.isValid(req.body.vehicle)) {
      throw new ReadingError(400, "Select the vehicle");
    }
    vehicle = await Vehicle.findOne({ _id: req.body.vehicle, userId: req.userId }).select("vehicleNo category");
    if (!vehicle) throw new ReadingError(404, "Vehicle not found");
  }

  const readingDate = new Date(req.body.readingDate);
  if (!req.body.readingDate || Number.isNaN(readingDate.getTime())) {
    throw new ReadingError(400, "Enter the date");
  }

  const openingReading = readMeter(req.body.openingReading, "Opening reading");
  if (openingReading === null) throw new ReadingError(400, "Enter the opening reading");
  const closingReading = readMeter(req.body.closingReading, "Closing reading");
  if (closingReading !== null && closingReading < openingReading) {
    throw new ReadingError(400, "Closing reading cannot be less than the opening reading");
  }

  return {
    machine,
    vehicle: vehicle?._id || null,
    vehicleNo: vehicle?.vehicleNo || "",
    meterUnit: meterUnitFor(machine, vehicle?.category),
    readingDate,
    openingReading,
    closingReading,
    notes: String(req.body.notes || "").trim(),
  };
};

const sendError = (res, error, message) => {
  if (error instanceof ReadingError) return res.status(error.status).json({ message: error.message });
  return res.status(400).json({ message, error: error.message });
};

const getMeterReadings = async (req, res) => {
  try {
    // Staff see only their allowed days
    const readings = await MeterReading.find(applyVisibility(req, scopedFilter(req), "readingDate"))
      .sort({ readingDate: -1, createdAt: -1 })
      .lean();
    return res.json({ data: readings });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch meter readings", error: error.message });
  }
};

const createMeterReading = async (req, res) => {
  try {
    const fields = await readBody(req);
    const reading = await MeterReading.create({ userId: req.userId, ...fields });
    return res.status(201).json({ data: reading });
  } catch (error) {
    return sendError(res, error, "Failed to save the meter reading");
  }
};

const updateMeterReading = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid meter reading id" });
  }

  try {
    const fields = await readBody(req);
    const reading = await MeterReading.findOneAndUpdate(scopedIdFilter(req, id), fields, { new: true, runValidators: true });
    if (!reading) return res.status(404).json({ message: "Meter reading not found" });
    return res.json({ data: reading });
  } catch (error) {
    return sendError(res, error, "Failed to update the meter reading");
  }
};

const deleteMeterReading = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid meter reading id" });
  }

  try {
    const reading = await MeterReading.findOneAndDelete(scopedIdFilter(req, id));
    if (!reading) return res.status(404).json({ message: "Meter reading not found" });
    return res.json({ message: "Meter reading deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete the meter reading", error: error.message });
  }
};

module.exports = {
  getMeterReadings,
  createMeterReading,
  updateMeterReading,
  deleteMeterReading,
};
