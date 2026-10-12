const mongoose = require("mongoose");
const MaterialUsed = require("../models/MaterialUsed");
const Stock = require("../models/Stock");
const Vehicle = require("../models/Vehicle");
const { scopedFilter, scopedIdFilter } = require("../utils/ownership");

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const adjustStock = async (userId, stockId, quantityChange) => {
  const stock = await Stock.findOne({ _id: stockId, userId });
  if (!stock) {
    throw new Error("Material type not found");
  }

  const nextStock = toNumber(stock.currentStock) + quantityChange;
  if (nextStock < 0) {
    throw new Error(`Insufficient stock for ${stock.name}`);
  }

  stock.currentStock = nextStock;
  await stock.save();
  return stock;
};

const populateMaterialUsed = (userId, id) => (
  MaterialUsed.findOne({ _id: id, userId })
    .populate("vehicle", "vehicleNo")
    .populate("materialType", "name unit")
);

class TargetError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Where the material went: a vehicle, the plant's DG set, or the plant / other.
// usedFor is "vehicle" | "dg" | "other"; older screens send only an optional vehicle.
const resolveTarget = async (req) => {
  const usedFor = ["vehicle", "dg", "other"].includes(req.body.usedFor)
    ? req.body.usedFor
    : req.body.vehicle ? "vehicle" : "other";

  if (usedFor === "vehicle") {
    if (!req.body.vehicle || !mongoose.Types.ObjectId.isValid(req.body.vehicle)) {
      throw new TargetError(400, "Select the vehicle");
    }
    const vehicle = await Vehicle.findOne({ _id: req.body.vehicle, userId: req.userId });
    if (!vehicle) throw new TargetError(404, "Vehicle not found");
    return { usedFor, vehicle };
  }

  return { usedFor, vehicle: null };
};

// KM / hour meter reading; null when left empty
const readMeterReading = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  const reading = Number(value);
  if (!Number.isFinite(reading) || reading < 0) {
    throw new TargetError(400, "Meter reading must be a number of 0 or more");
  }
  return reading;
};

const targetFields = ({ usedFor, vehicle }) => ({
  usedFor,
  vehicle: vehicle?._id || null,
  vehicleNo: vehicle?.vehicleNo || "",
});

const createMaterialUsed = async (req, res) => {
  try {
    const usedQty = toNumber(req.body.usedQty);
    if (usedQty <= 0) {
      return res.status(400).json({ message: "Used quantity must be greater than 0" });
    }

    if (!req.body.materialType || !mongoose.Types.ObjectId.isValid(req.body.materialType)) {
      return res.status(400).json({ message: "Valid material type is required" });
    }

    const stock = await Stock.findOne({ _id: req.body.materialType, userId: req.userId });
    if (!stock) {
      return res.status(404).json({ message: "Material type not found" });
    }

    const target = await resolveTarget(req);
    const meterReading = readMeterReading(req.body.meterReading);

    await adjustStock(req.userId, stock._id, -usedQty);

    const materialUsed = await MaterialUsed.create({
      userId: req.userId,
      ...targetFields(target),
      meterReading,
      materialType: stock._id,
      materialTypeName: stock.name,
      unit: stock.unit || "",
      usedQty,
      usedDate: req.body.usedDate ? new Date(req.body.usedDate) : new Date(),
      notes: String(req.body.notes || "").trim(),
    });

    const savedEntry = await populateMaterialUsed(req.userId, materialUsed._id);
    return res.status(201).json({ data: savedEntry });
  } catch (error) {
    if (error instanceof TargetError) return res.status(error.status).json({ message: error.message });
    return res.status(400).json({
      message: "Failed to create material used entry",
      error: error.message,
    });
  }
};

const getAllMaterialUsed = async (req, res) => {
  try {
    const normalizedSearch = String(req.query.search || "").trim();
    const filter = scopedFilter(req);

    if (normalizedSearch) {
      filter.$or = [
        { vehicleNo: { $regex: normalizedSearch, $options: "i" } },
        { materialTypeName: { $regex: normalizedSearch, $options: "i" } },
        { notes: { $regex: normalizedSearch, $options: "i" } },
      ];
    }

    const entries = await MaterialUsed.find(filter)
      .populate("vehicle", "vehicleNo")
      .populate("materialType", "name unit")
      .sort({ usedDate: -1, createdAt: -1 });

    return res.json({ data: entries });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch material used entries",
      error: error.message,
    });
  }
};

const updateMaterialUsed = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid material used id" });
  }

  try {
    const entry = await MaterialUsed.findOne(scopedIdFilter(req, id));
    if (!entry) {
      return res.status(404).json({ message: "Material used entry not found" });
    }

    const usedQty = toNumber(req.body.usedQty);
    if (usedQty <= 0) {
      return res.status(400).json({ message: "Used quantity must be greater than 0" });
    }

    if (!req.body.materialType || !mongoose.Types.ObjectId.isValid(req.body.materialType)) {
      return res.status(400).json({ message: "Valid material type is required" });
    }

    const stock = await Stock.findOne({ _id: req.body.materialType, userId: req.userId });
    if (!stock) {
      return res.status(404).json({ message: "Material type not found" });
    }

    const target = await resolveTarget(req);
    const meterReading = readMeterReading(req.body.meterReading);

    await adjustStock(req.userId, entry.materialType, entry.usedQty);
    try {
      await adjustStock(req.userId, stock._id, -usedQty);
    } catch (error) {
      await adjustStock(req.userId, entry.materialType, -entry.usedQty);
      throw error;
    }

    Object.assign(entry, targetFields(target));
    entry.meterReading = meterReading;
    entry.materialType = stock._id;
    entry.materialTypeName = stock.name;
    entry.unit = stock.unit || "";
    entry.usedQty = usedQty;
    entry.usedDate = req.body.usedDate ? new Date(req.body.usedDate) : entry.usedDate;
    entry.notes = String(req.body.notes || "").trim();

    await entry.save();

    const savedEntry = await populateMaterialUsed(req.userId, entry._id);
    return res.json({ data: savedEntry });
  } catch (error) {
    if (error instanceof TargetError) return res.status(error.status).json({ message: error.message });
    return res.status(400).json({
      message: "Failed to update material used entry",
      error: error.message,
    });
  }
};

const deleteMaterialUsed = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid material used id" });
  }

  try {
    const entry = await MaterialUsed.findOne(scopedIdFilter(req, id));
    if (!entry) {
      return res.status(404).json({ message: "Material used entry not found" });
    }

    await adjustStock(req.userId, entry.materialType, entry.usedQty);
    await MaterialUsed.deleteOne(scopedIdFilter(req, id));

    return res.json({ message: "Material used entry deleted successfully" });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to delete material used entry",
      error: error.message,
    });
  }
};

module.exports = {
  createMaterialUsed,
  getAllMaterialUsed,
  updateMaterialUsed,
  deleteMaterialUsed,
};
