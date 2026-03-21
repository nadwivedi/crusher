const mongoose = require("mongoose");
const Receipt = require("../models/Receipt");
const Sales = require("../models/Sales");

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getNextReceiptNumber = async () => {
  const lastEntry = await Receipt.findOne().sort({ receiptNumber: -1 }).select("receiptNumber");
  return Math.max(1, Number(lastEntry?.receiptNumber || 0) + 1);
};

const getSaleReceiptTotal = async (saleId) => {
  const result = await Receipt.aggregate([
    { $match: { refType: "sale", refId: new mongoose.Types.ObjectId(saleId) } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);

  return toNumber(result[0]?.total);
};

const createReceipt = async (req, res) => {
  try {
    const amount = toNumber(req.body.amount, NaN);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: "Valid amount is required" });
    }

    const refType = ["sale", "none"].includes(String(req.body.refType || "none"))
      ? String(req.body.refType || "none")
      : "none";

    let resolvedRefId = null;
    let resolvedParty = req.body.party || null;

    if (refType === "sale") {
      if (!req.body.refId || !mongoose.Types.ObjectId.isValid(req.body.refId)) {
        return res.status(400).json({ message: "Valid sale id is required" });
      }

      const sale = await Sales.findById(req.body.refId);
      if (!sale) {
        return res.status(404).json({ message: "Sale not found" });
      }

      const receivedAmount = await getSaleReceiptTotal(sale._id);
      const pendingAmount = Math.max(0, toNumber(sale.totalAmount) - receivedAmount);
      if (amount > pendingAmount) {
        return res.status(400).json({ message: "Amount exceeds sale pending amount" });
      }

      resolvedRefId = sale._id;
      resolvedParty = resolvedParty || sale.partyId || null;
    }

    const receiptNumber = await getNextReceiptNumber();
    const receipt = await Receipt.create({
      party: resolvedParty,
      refType,
      refId: resolvedRefId,
      amount,
      receiptNumber,
      method: String(req.body.method || "Cash Account").trim() || "Cash Account",
      receiptDate: req.body.receiptDate ? new Date(req.body.receiptDate) : new Date(),
      notes: String(req.body.notes || "").trim(),
    });

    const savedReceipt = await Receipt.findById(receipt._id).populate("party", "name");
    return res.status(201).json(savedReceipt);
  } catch (error) {
    return res.status(400).json({
      message: "Failed to create receipt",
      error: error.message,
    });
  }
};

const getAllReceipts = async (req, res) => {
  try {
    const filter = {};
    const normalizedSearch = String(req.query.search || "").trim();
    const normalizedFromDate = String(req.query.fromDate || "").trim();

    if (normalizedFromDate) {
      const parsedFromDate = new Date(normalizedFromDate);
      if (!Number.isNaN(parsedFromDate.getTime())) {
        filter.receiptDate = { $gte: parsedFromDate };
      }
    }

    let query = Receipt.find(filter).populate("party", "name");

    if (normalizedSearch) {
      const receiptNumberSearch = Number.parseInt(
        normalizedSearch.replace(/^rec-/i, ""),
        10
      );

      query = query.find({
        $or: [
          ...(Number.isInteger(receiptNumberSearch) ? [{ receiptNumber: receiptNumberSearch }] : []),
          { notes: { $regex: normalizedSearch, $options: "i" } },
          { method: { $regex: normalizedSearch, $options: "i" } },
        ],
      });
    }

    const receipts = await query.sort({ receiptDate: -1, createdAt: -1 });
    return res.json(receipts);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch receipts",
      error: error.message,
    });
  }
};

module.exports = {
  createReceipt,
  getAllReceipts,
};
