const mongoose = require("mongoose");
const { applyVisibility } = require("../middleware/staffAccess");
const Counter = require("../models/Counter");
const Stock = require("../models/Stock");
const StockAdjustment = require("../models/StockAdjustment");
const { scopedFilter, scopedIdFilter } = require("../utils/ownership");

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

    // Staff see only their allowed days
    applyVisibility(req, filter, "voucherDate");
    const adjustments = await StockAdjustment.find(filter).sort({ voucherDate: -1, createdAt: -1 });

    return res.json({ data: adjustments });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch stock adjustments",
      error: error.message,
    });
  }
};

// How an adjustment moved its item's stock: + for add, - for subtract
const effectOf = (adjustment) => (adjustment.adjustmentType === "add" ? 1 : -1) * toNumber(adjustment.quantity);

// Moves stock levels and refuses to take any item below zero. changes: [{ stock, change }]
const applyStockChanges = async (changes) => {
  for (const { stock, change } of changes) {
    if (toNumber(stock.currentStock) + change < 0) {
      throw Object.assign(new Error(`Only ${toNumber(stock.currentStock)} ${stock.unit || ""} of ${stock.name} in stock`.replace(/\s+/g, " ")), { userFacing: true });
    }
  }
  for (const { stock, change } of changes) {
    stock.currentStock = toNumber(stock.currentStock) + change;
    await stock.save();
  }
};

// PUT /api/stock-adjustments/:id — undoes the old change and makes the new one
const updateStockAdjustment = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid stock adjustment id" });
    const adjustment = await StockAdjustment.findOne(scopedIdFilter(req, id));
    if (!adjustment) return res.status(404).json({ message: "Stock adjustment not found" });

    const adjustmentType = String(req.body.adjustmentType || "").trim();
    if (!ADJUSTMENT_TYPES.includes(adjustmentType)) return res.status(400).json({ message: "Choose to increase or decrease stock" });
    const quantity = toNumber(req.body.quantity);
    if (quantity <= 0) return res.status(400).json({ message: "Quantity must be greater than 0" });
    const reason = String(req.body.reason || "").trim();
    if (!reason) return res.status(400).json({ message: "Reason is required" });
    const voucherDate = req.body.voucherDate ? new Date(req.body.voucherDate) : adjustment.voucherDate;
    if (Number.isNaN(voucherDate.getTime())) return res.status(400).json({ message: "Valid date is required" });
    const itemId = req.body.stockItem || adjustment.stockItem;
    if (!mongoose.Types.ObjectId.isValid(itemId)) return res.status(400).json({ message: "Valid stock item is required" });

    const newStock = await Stock.findOne({ _id: itemId, userId: req.userId });
    if (!newStock) return res.status(404).json({ message: "Stock item not found" });
    const newEffect = (adjustmentType === "add" ? 1 : -1) * quantity;

    if (String(newStock._id) === String(adjustment.stockItem)) {
      await applyStockChanges([{ stock: newStock, change: newEffect - effectOf(adjustment) }]);
    } else {
      const oldStock = await Stock.findOne({ _id: adjustment.stockItem, userId: req.userId });
      await applyStockChanges([
        ...(oldStock ? [{ stock: oldStock, change: -effectOf(adjustment) }] : []),
        { stock: newStock, change: newEffect },
      ]);
    }

    Object.assign(adjustment, {
      voucherDate,
      stockItem: newStock._id,
      stockItemName: newStock.name,
      unit: newStock.unit || "",
      adjustmentType,
      quantity,
      reason,
      notes: String(req.body.notes || "").trim(),
    });
    await adjustment.save();
    return res.json({ data: adjustment });
  } catch (error) {
    if (error.userFacing) return res.status(400).json({ message: error.message });
    return res.status(400).json({ message: "Failed to update stock adjustment", error: error.message });
  }
};

// DELETE /api/stock-adjustments/:id — puts the stock back as it was before the adjustment
const deleteStockAdjustment = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid stock adjustment id" });
    const adjustment = await StockAdjustment.findOne(scopedIdFilter(req, id));
    if (!adjustment) return res.status(404).json({ message: "Stock adjustment not found" });

    const stock = await Stock.findOne({ _id: adjustment.stockItem, userId: req.userId });
    if (stock) await applyStockChanges([{ stock, change: -effectOf(adjustment) }]);
    await StockAdjustment.deleteOne({ _id: adjustment._id });
    return res.json({ message: "Stock adjustment deleted" });
  } catch (error) {
    if (error.userFacing) return res.status(400).json({ message: error.message });
    return res.status(500).json({ message: "Failed to delete stock adjustment", error: error.message });
  }
};

module.exports = {
  createStockAdjustment,
  getAllStockAdjustments,
  updateStockAdjustment,
  deleteStockAdjustment,
};
