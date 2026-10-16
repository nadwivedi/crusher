const mongoose = require("mongoose");
const { applyVisibility } = require("../middleware/staffAccess");
const Payment = require("../models/Payment");
const Purchase = require("../models/Purchase");
const Counter = require("../models/Counter");
const Party = require("../models/Party");
const { scopedFilter, scopedIdFilter } = require("../utils/ownership");
const { resolveAccountByIdOrName } = require("../utils/accounts");

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getPaymentYear = (paymentDateValue) => {
  const paymentDate = paymentDateValue ? new Date(paymentDateValue) : new Date();
  if (Number.isNaN(paymentDate.getTime())) {
    return new Date().getFullYear();
  }
  return paymentDate.getFullYear();
};

const createPaymentNumber = async (userId, paymentDateValue) => {
  const paymentYear = getPaymentYear(paymentDateValue);
  const counterKey = `payments:${paymentYear}`;
  const counter = await Counter.findOneAndUpdate(
    { userId, key: counterKey },
    { $inc: { seq: 1 } },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );

  return `PAY-${paymentYear}-${String(counter.seq).padStart(2, "0")}`;
};

// Money already paid against a purchase; `exceptId` leaves out the payment being edited
const getPurchasePaidTotal = async (userId, purchaseId, exceptId = null) => {
  const result = await Payment.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        refType: "purchase",
        refId: new mongoose.Types.ObjectId(purchaseId),
        ...(exceptId ? { _id: { $ne: new mongoose.Types.ObjectId(exceptId) } } : {}),
      },
    },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);

  return toNumber(result[0]?.total);
};

const createPayment = async (req, res) => {
  try {
    const amount = toNumber(req.body.amount, NaN);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: "Valid amount is required" });
    }

    const refType = ["purchase", "none"].includes(String(req.body.refType || "none"))
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

    if (refType === "purchase") {
      if (!req.body.refId || !mongoose.Types.ObjectId.isValid(req.body.refId)) {
        return res.status(400).json({ message: "Valid purchase id is required" });
      }

      const purchase = await Purchase.findOne({ _id: req.body.refId, userId: req.userId });
      if (!purchase) {
        return res.status(404).json({ message: "Purchase not found" });
      }

      const paidAmount = await getPurchasePaidTotal(req.userId, purchase._id);
      const pendingAmount = Math.max(0, toNumber(purchase.totalAmount) - paidAmount);
      if (amount > pendingAmount) {
        return res.status(400).json({ message: "Amount exceeds purchase pending amount" });
      }

      resolvedRefId = purchase._id;
      resolvedParty = resolvedParty || purchase.party || null;
    }

    const account = await resolveAccountByIdOrName(req.userId, req.body.account, req.body.method);
    const paymentNumber = await createPaymentNumber(req.userId, req.body.paymentDate);
    const payment = await Payment.create({
      userId: req.userId,
      party: resolvedParty,
      refType,
      refId: resolvedRefId,
      originPurchaseId: null,
      amount,
      paymentNumber,
      method: account?.name || String(req.body.method || "Cash Account").trim() || "Cash Account",
      account: account?._id || null,
      paymentDate: req.body.paymentDate ? new Date(req.body.paymentDate) : new Date(),
      notes: String(req.body.notes || "").trim(),
      paymentSource: "manual",
    });

    const savedPayment = await Payment.findOne({ _id: payment._id, userId: req.userId }).populate("party", "name");
    return res.status(201).json({ data: savedPayment });
  } catch (error) {
    return res.status(400).json({
      message: "Failed to create payment",
      error: error.message,
    });
  }
};

const getAllPayments = async (req, res) => {
  try {
    const filter = scopedFilter(req);
    const normalizedSearch = String(req.query.search || "").trim();
    const normalizedFromDate = String(req.query.fromDate || "").trim();

    if (normalizedFromDate) {
      const parsedFromDate = new Date(normalizedFromDate);
      if (!Number.isNaN(parsedFromDate.getTime())) {
        filter.paymentDate = { $gte: parsedFromDate };
      }
    }

    // Staff see only their allowed days
    applyVisibility(req, filter, "paymentDate");
    let query = Payment.find(filter).populate("party", "name");

    if (normalizedSearch) {
      query = query.find({
        $or: [
          { paymentNumber: { $regex: normalizedSearch, $options: "i" } },
          { notes: { $regex: normalizedSearch, $options: "i" } },
          { method: { $regex: normalizedSearch, $options: "i" } },
        ],
      });
    }

    const payments = await query.sort({ paymentDate: -1, createdAt: -1 });
    return res.json({ data: payments });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch payments",
      error: error.message,
    });
  }
};

class PaymentInputError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

// PUT /api/payments/:id — a payment entered by hand. One made by a purchase's "paid now" is changed through the purchase.
const updatePayment = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid payment id" });

    const payment = await Payment.findOne(scopedIdFilter(req, id));
    if (!payment) return res.status(404).json({ message: "Payment not found" });
    if (payment.paymentSource && payment.paymentSource !== "manual") {
      return res.status(400).json({ message: "This payment was made by a purchase's paid amount. Edit that purchase instead." });
    }

    const amount = toNumber(req.body.amount, NaN);
    if (!Number.isFinite(amount) || amount <= 0) throw new PaymentInputError("Valid amount is required");

    const refType = String(req.body.refType || "none") === "purchase" ? "purchase" : "none";
    let refId = null;
    let party = req.body.party || null;
    if (party) {
      if (!mongoose.Types.ObjectId.isValid(party)) throw new PaymentInputError("Party not found", 404);
      const found = await Party.findOne({ _id: party, userId: req.userId }).select("_id");
      if (!found) throw new PaymentInputError("Party not found", 404);
      party = found._id;
    }
    if (refType === "purchase") {
      if (!req.body.refId || !mongoose.Types.ObjectId.isValid(req.body.refId)) throw new PaymentInputError("Valid purchase id is required");
      const purchase = await Purchase.findOne({ _id: req.body.refId, userId: req.userId });
      if (!purchase) throw new PaymentInputError("Purchase not found", 404);
      const paid = await getPurchasePaidTotal(req.userId, purchase._id, payment._id);
      if (amount > Math.max(0, toNumber(purchase.totalAmount) - paid)) throw new PaymentInputError("Amount exceeds purchase pending amount");
      refId = purchase._id;
      party = party || purchase.party || null;
    }

    const account = await resolveAccountByIdOrName(req.userId, req.body.account, req.body.method);
    Object.assign(payment, {
      amount,
      refType,
      refId,
      party,
      method: account?.name || String(req.body.method || payment.method || "Cash Account").trim() || "Cash Account",
      account: account?._id || null,
      paymentDate: req.body.paymentDate ? new Date(req.body.paymentDate) : payment.paymentDate,
      notes: String(req.body.notes || "").trim(),
    });
    await payment.save();

    const savedPayment = await Payment.findOne({ _id: payment._id, userId: req.userId }).populate("party", "name");
    return res.json({ data: savedPayment });
  } catch (error) {
    if (error instanceof PaymentInputError) return res.status(error.status).json({ message: error.message });
    return res.status(400).json({ message: "Failed to update payment", error: error.message });
  }
};

const deletePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const payment = await Payment.findOneAndDelete(scopedIdFilter(req, id));

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    return res.json({ message: "Payment deleted successfully" });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to delete payment",
      error: error.message,
    });
  }
};

module.exports = {
  createPayment,
  getAllPayments,
  updatePayment,
  deletePayment,
};
