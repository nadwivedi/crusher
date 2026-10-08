const mongoose = require("mongoose");
const Receipt = require("../models/Receipt");
const Sales = require("../models/Sales");
const Party = require("../models/Party");
const { scopedFilter, scopedIdFilter } = require("../utils/ownership");
const { resolveAccountByIdOrName } = require("../utils/accounts");

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getNextReceiptNumber = async (userId) => {
  const lastEntry = await Receipt.findOne({ userId }).sort({ receiptNumber: -1 }).select("receiptNumber");
  return Math.max(1, Number(lastEntry?.receiptNumber || 0) + 1);
};

const getSaleReceiptTotal = async (userId, saleId) => {
  const result = await Receipt.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), refType: "sale", refId: new mongoose.Types.ObjectId(saleId) } },
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

    if (resolvedParty) {
      const party = await Party.findOne({ _id: resolvedParty, userId: req.userId }).select("_id");
      if (!party) {
        return res.status(404).json({ message: "Party not found" });
      }
      resolvedParty = party._id;
    }

    if (refType === "sale") {
      if (!req.body.refId || !mongoose.Types.ObjectId.isValid(req.body.refId)) {
        return res.status(400).json({ message: "Valid sale id is required" });
      }

      const sale = await Sales.findOne({ _id: req.body.refId, userId: req.userId });
      if (!sale) {
        return res.status(404).json({ message: "Sale not found" });
      }

      const receivedAmount = await getSaleReceiptTotal(req.userId, sale._id);
      const saleEntrySettledAmount = String(sale.type || "").trim() === "cash sale"
        ? Math.min(toNumber(sale.totalAmount), toNumber(sale.paidAmount))
        : 0;
      const pendingAmount = Math.max(0, toNumber(sale.totalAmount) - saleEntrySettledAmount - receivedAmount);
      if (amount > pendingAmount) {
        return res.status(400).json({ message: "Amount exceeds sale pending amount" });
      }

      resolvedRefId = sale._id;
      resolvedParty = resolvedParty || sale.partyId || null;
    }

    if (!resolvedParty) {
      return res.status(400).json({ message: "Select the party the money was received from" });
    }

    const account = await resolveAccountByIdOrName(req.userId, req.body.account, req.body.method);
    const receiptNumber = await getNextReceiptNumber(req.userId);
    const receipt = await Receipt.create({
      userId: req.userId,
      party: resolvedParty,
      refType,
      refId: resolvedRefId,
      amount,
      receiptNumber,
      method: account?.name || String(req.body.method || "Cash Account").trim() || "Cash Account",
      account: account?._id || null,
      receiptDate: req.body.receiptDate ? new Date(req.body.receiptDate) : new Date(),
      notes: String(req.body.notes || "").trim(),
    });

    const savedReceipt = await Receipt.findOne({ _id: receipt._id, userId: req.userId }).populate("party", "name");
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
    const filter = scopedFilter(req);
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

const deleteReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const receipt = await Receipt.findOneAndDelete(scopedIdFilter(req, id));

    if (!receipt) {
      return res.status(404).json({ message: "Receipt not found" });
    }

    return res.json({ message: "Receipt deleted successfully" });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to delete receipt",
      error: error.message,
    });
  }
};

module.exports = {
  createReceipt,
  getAllReceipts,
  deleteReceipt,
};
