const mongoose = require("mongoose");
const Counter = require("../models/Counter");
const Stock = require("../models/Stock");
const StockAdjustment = require("../models/StockAdjustment");
const { scopedFilter } = require("../utils/ownership");

const ADJUSTMENT_TYPES = ["add", "subtract"];

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const createVoucherNumber = async (userId, voucherDate) => {
  const voucherYear = voucherDate.getFullYear();
  const counter = await Counter.findOneAndUpdate(
    { userId, key: `stockAdjustments:${voucherYear}` },
    { $inc: { seq: 1 } },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );

  return `ADJ-${voucherYear}-${String(counter.seq).padStart(2, "0")}`;
};

const createStockAdjustment = async (req, res) => {
  try {
    const adjustmentType = String(req.body.adjustmentType || "").trim();
    if (!ADJUSTMENT_TYPES.includes(adjustmentType)) {
      return res.status(400).json({ message: "Choose to increase or decrease stock" });
    }

    const quantity = toNumber(req.body.quantity);
    if (quantity <= 0) {
      return res.status(400).json({ message: "Quantity must be greater than 0" });
    }

    const reason = String(req.body.reason || "").trim();
    if (!reason) {
      return res.status(400).json({ message: "Reason is required" });
    }

    const voucherDate = req.body.voucherDate ? new Date(req.body.voucherDate) : new Date();
    if (Number.isNaN(voucherDate.getTime())) {
      return res.status(400).json({ message: "Valid date is required" });
    }

    if (!req.body.stockItem || !mongoose.Types.ObjectId.isValid(req.body.stockItem)) {
      return res.status(400).json({ message: "Valid stock item is required" });
    }

    const stock = await Stock.findOne({ _id: req.body.stockItem, userId: req.userId });
    if (!stock) {
      return res.status(404).json({ message: "Stock item not found" });
    }

    const previousStock = toNumber(stock.currentStock);
    const nextStock = previousStock + (adjustmentType === "add" ? quantity : -quantity);
    if (nextStock < 0) {
      return res.status(400).json({ message: `Only ${previousStock} ${stock.unit || ""} of ${stock.name} in stock`.replace(/\s+/g, " ") });
    }

    stock.currentStock = nextStock;
    await stock.save();

    try {
      const adjustment = await StockAdjustment.create({
        userId: req.userId,
        voucherNumber: await createVoucherNumber(req.userId, voucherDate),
        voucherDate,
        stockItem: stock._id,
        stockItemName: stock.name,
        unit: stock.unit || "",
        adjustmentType,
        quantity,
        reason,
        notes: String(req.body.notes || "").trim(),
      });

      return res.status(201).json({ data: adjustment });
    } catch (error) {
      stock.currentStock = previousStock;
      await stock.save();
      throw error;
    }
  } catch (error) {
    return res.status(400).json({
      message: "Failed to create stock adjustment",
      error: error.message,
    });
  }
};

const getAllStockAdjustments = async (req, res) => {
  try {
    const normalizedSearch = String(req.query.search || "").trim();
    const filter = scopedFilter(req);

    if (normalizedSearch) {
      filter.$or = [
        { voucherNumber: { $regex: normalizedSearch, $options: "i" } },
        { stockItemName: { $regex: normalizedSearch, $options: "i" } },
        { reason: { $regex: normalizedSearch, $options: "i" } },
        { notes: { $regex: normalizedSearch, $options: "i" } },
      ];
    }

    const adjustments = await StockAdjustment.find(filter).sort({ voucherDate: -1, createdAt: -1 });

    return res.json({ data: adjustments });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch stock adjustments",
      error: error.message,
    });
  }
};

module.exports = {
  createStockAdjustment,
  getAllStockAdjustments,
};
