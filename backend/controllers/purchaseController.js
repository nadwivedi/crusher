const mongoose = require("mongoose");
const Purchase = require("../models/Purchase");
const Payment = require("../models/Payment");
const Stock = require("../models/Stock");
const Counter = require("../models/Counter");
const Party = require("../models/Party");
const { scopedFilter, scopedIdFilter } = require("../utils/ownership");

const PURCHASE_TYPES = {
  PURCHASE: "purchase",
  CREDIT: "credit purchase",
  CASH: "cash purchase",
};

const AUTO_PAYMENT_SOURCES = ["purchase-payment", "purchase-excess-payment"];

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getNextPurchaseNumber = async (userId) => {
  const lastEntry = await Purchase.findOne({ userId }).sort({ purchaseNumber: -1 }).select("purchaseNumber");
  return Math.max(1, Number(lastEntry?.purchaseNumber || 0) + 1);
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

const getPurchasePaymentBreakdown = (totalAmountValue, paidAmountValue) => {
  const totalAmount = Math.max(0, toNumber(totalAmountValue));
  const paidAmount = Math.max(0, toNumber(paidAmountValue));
  const appliedAmount = Math.min(totalAmount, paidAmount);
  const pendingAmount = Math.max(0, totalAmount - paidAmount);
  const excessAmount = Math.max(0, paidAmount - totalAmount);

  let type = PURCHASE_TYPES.CREDIT;
  if (paidAmount <= 0) {
    type = PURCHASE_TYPES.CREDIT;
  } else if (paidAmount === totalAmount) {
    type = PURCHASE_TYPES.CASH;
  } else {
    type = PURCHASE_TYPES.PURCHASE;
  }

  return {
    totalAmount,
    paidAmount,
    appliedAmount,
    pendingAmount,
    excessAmount,
    type,
  };
};

const syncPurchaseAutoPayments = async (purchaseDoc, userId) => {
  await Payment.deleteMany({
    userId,
    originPurchaseId: purchaseDoc._id,
    paymentSource: { $in: AUTO_PAYMENT_SOURCES },
  });

  return getPurchasePaymentBreakdown(purchaseDoc.totalAmount, purchaseDoc.paidAmount);
};

const normalizeItems = (items = []) => (
  Array.isArray(items)
    ? items.map((item) => {
        const quantity = toNumber(item.quantity);
        const unitPrice = toNumber(item.unitPrice);
        return {
          product: item.product,
          productName: String(item.productName || "Item").trim(),
          unit: String(item.unit || "").trim(),
          quantity,
          unitPrice,
          total: toNumber(item.total, quantity * unitPrice),
        };
      })
    : []
);

const validateItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    return "At least one item is required";
  }

  for (const item of items) {
    if (!item.product || !mongoose.Types.ObjectId.isValid(item.product)) {
      return "Each item must have a valid product";
    }

    if (toNumber(item.quantity) <= 0) {
      return "Item quantity must be greater than 0";
    }

    if (toNumber(item.unitPrice) < 0) {
      return "Item price cannot be negative";
    }
  }

  return null;
};

const adjustStockLevels = async (userId, items, direction) => {
  for (const item of items) {
    const stock = await Stock.findOneAndUpdate({
      _id: item.product,
      userId,
    }, {
      $inc: { currentStock: direction * toNumber(item.quantity) },
    });

    if (!stock) {
      throw new Error("Product not found");
    }
  }
};

const populatePurchase = (userId, purchaseId) => (
  Purchase.findOne({ _id: purchaseId, userId })
    .populate("party", "name")
    .populate("items.product", "name unit")
);

const createPurchase = async (req, res) => {
  try {
    const normalizedItems = normalizeItems(req.body.items);
    const itemError = validateItems(normalizedItems);
    if (itemError) {
      return res.status(400).json({ message: itemError });
    }

    const partyId = req.body.party || null;
    if (partyId) {
      const party = await Party.findOne({ _id: partyId, userId: req.userId }).select("_id");
      if (!party) {
        return res.status(404).json({ message: "Party not found" });
      }
    }

    const purchaseNumber = await getNextPurchaseNumber(req.userId);
    const totalAmount = toNumber(
      req.body.totalAmount,
      normalizedItems.reduce((sum, item) => sum + toNumber(item.total), 0)
    );
    const breakdown = getPurchasePaymentBreakdown(totalAmount, req.body.paymentAmount);
    const purchase = await Purchase.create({
      userId: req.userId,
      supplierInvoice: String(req.body.supplierInvoice || "").trim(),
      purchaseNumber,
      party: partyId,
      items: normalizedItems,
      purchaseDate: req.body.purchaseDate ? new Date(req.body.purchaseDate) : new Date(),
      invoiceLink: String(req.body.invoiceLink || "").trim(),
      totalAmount,
      paidAmount: breakdown.paidAmount,
      type: breakdown.type,
      notes: String(req.body.notes || "").trim(),
    });

    await adjustStockLevels(req.userId, normalizedItems, 1);
    await syncPurchaseAutoPayments(purchase, req.userId);

    const savedPurchase = await populatePurchase(req.userId, purchase._id);
    return res.status(201).json({ data: savedPurchase });
  } catch (error) {
    return res.status(400).json({
      message: "Failed to create purchase",
      error: error.message,
    });
  }
};

const getAllPurchases = async (req, res) => {
  try {
    const filter = scopedFilter(req);
    const normalizedSearch = String(req.query.search || "").trim();
    const normalizedFromDate = String(req.query.fromDate || "").trim();

    if (normalizedFromDate) {
      const parsedFromDate = new Date(normalizedFromDate);
      if (!Number.isNaN(parsedFromDate.getTime())) {
        filter.purchaseDate = { $gte: parsedFromDate };
      }
    }

    let query = Purchase.find(filter)
      .populate("party", "name")
      .populate("items.product", "name unit");

    if (normalizedSearch) {
      const purchaseNumberSearch = Number.parseInt(
        normalizedSearch.replace(/^pur-/i, ""),
        10
      );

      query = query.find({
        $or: [
          ...(Number.isInteger(purchaseNumberSearch) ? [{ purchaseNumber: purchaseNumberSearch }] : []),
          { supplierInvoice: { $regex: normalizedSearch, $options: "i" } },
          { notes: { $regex: normalizedSearch, $options: "i" } },
        ],
      });
    }

    const purchases = await query.sort({ purchaseDate: -1, createdAt: -1 });
    return res.json({ data: purchases });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch purchases",
      error: error.message,
    });
  }
};

const updatePurchase = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid purchase id" });
  }

  try {
    const purchase = await Purchase.findOne(scopedIdFilter(req, id));
    if (!purchase) {
      return res.status(404).json({ message: "Purchase not found" });
    }

    const normalizedItems = normalizeItems(req.body.items);
    const itemError = validateItems(normalizedItems);
    if (itemError) {
      return res.status(400).json({ message: itemError });
    }

    const nextPartyId = Object.prototype.hasOwnProperty.call(req.body, "party")
      ? (req.body.party || null)
      : purchase.party;
    if (nextPartyId) {
      const party = await Party.findOne({ _id: nextPartyId, userId: req.userId }).select("_id");
      if (!party) {
        return res.status(404).json({ message: "Party not found" });
      }
    }

    await adjustStockLevels(req.userId, purchase.items || [], -1);
    await adjustStockLevels(req.userId, normalizedItems, 1);

    purchase.party = nextPartyId;
    purchase.supplierInvoice = String(req.body.supplierInvoice || "").trim();
    purchase.items = normalizedItems;
    purchase.purchaseDate = req.body.purchaseDate ? new Date(req.body.purchaseDate) : purchase.purchaseDate;
    purchase.invoiceLink = String(req.body.invoiceLink || "").trim();
    purchase.totalAmount = toNumber(
      req.body.totalAmount,
      normalizedItems.reduce((sum, item) => sum + toNumber(item.total), 0)
    );
    const nextPaidAmount = Object.prototype.hasOwnProperty.call(req.body, "paymentAmount")
      ? req.body.paymentAmount
      : purchase.paidAmount;
    const breakdown = getPurchasePaymentBreakdown(purchase.totalAmount, nextPaidAmount);
    purchase.paidAmount = breakdown.paidAmount;
    purchase.type = breakdown.type;
    purchase.notes = String(req.body.notes || "").trim();

    await purchase.save();
    await syncPurchaseAutoPayments(purchase, req.userId);

    const savedPurchase = await populatePurchase(req.userId, purchase._id);
    return res.json({ data: savedPurchase });
  } catch (error) {
    return res.status(400).json({
      message: "Failed to update purchase",
      error: error.message,
    });
  }
};

const deletePurchase = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid purchase id" });
  }

  try {
    const purchase = await Purchase.findOne(scopedIdFilter(req, id));
    if (!purchase) {
      return res.status(404).json({ message: "Purchase not found" });
    }

    await adjustStockLevels(req.userId, purchase.items || [], -1);
    await Payment.deleteMany({
      userId: req.userId,
      $or: [
        { refType: "purchase", refId: purchase._id },
        { originPurchaseId: purchase._id, paymentSource: { $in: AUTO_PAYMENT_SOURCES } },
      ],
    });
    await Purchase.deleteOne(scopedIdFilter(req, id));

    return res.json({ message: "Purchase deleted successfully" });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to delete purchase",
      error: error.message,
    });
  }
};

module.exports = {
  createPurchase,
  getAllPurchases,
  updatePurchase,
  deletePurchase,
};
