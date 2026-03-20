const mongoose = require("mongoose");
const Purchase = require("../models/Purchase");
const Payment = require("../models/Payment");
const Stock = require("../models/Stock");

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getNextPurchaseNumber = async () => {
  const lastEntry = await Purchase.findOne().sort({ purchaseNumber: -1 }).select("purchaseNumber");
  return Math.max(1, Number(lastEntry?.purchaseNumber || 0) + 1);
};

const getNextPaymentNumber = async () => {
  const lastEntry = await Payment.findOne().sort({ paymentNumber: -1 }).select("paymentNumber");
  return Math.max(1, Number(lastEntry?.paymentNumber || 0) + 1);
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

const adjustStockLevels = async (items, direction) => {
  for (const item of items) {
    await Stock.findByIdAndUpdate(item.product, {
      $inc: { currentStock: direction * toNumber(item.quantity) },
    });
  }
};

const populatePurchase = (purchaseId) => (
  Purchase.findById(purchaseId)
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

    const purchaseNumber = await getNextPurchaseNumber();
    const totalAmount = toNumber(
      req.body.totalAmount,
      normalizedItems.reduce((sum, item) => sum + toNumber(item.total), 0)
    );
    const purchase = await Purchase.create({
      supplierInvoice: String(req.body.supplierInvoice || "").trim(),
      purchaseNumber,
      party: req.body.party || null,
      items: normalizedItems,
      purchaseDate: req.body.purchaseDate ? new Date(req.body.purchaseDate) : new Date(),
      dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
      invoiceLink: String(req.body.invoiceLink || "").trim(),
      totalAmount,
      notes: String(req.body.notes || "").trim(),
    });

    await adjustStockLevels(normalizedItems, 1);

    const paymentAmount = Math.max(0, toNumber(req.body.paymentAmount));
    if (paymentAmount > 0) {
      const paymentNumber = await getNextPaymentNumber();
      await Payment.create({
        party: req.body.party || null,
        refType: "purchase",
        refId: purchase._id,
        amount: paymentAmount,
        paymentNumber,
        method: String(req.body.paymentMethod || "Cash Account").trim() || "Cash Account",
        paymentDate: req.body.paymentDate ? new Date(req.body.paymentDate) : new Date(),
        notes: String(req.body.paymentNotes || "").trim(),
      });
    }

    const savedPurchase = await populatePurchase(purchase._id);
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
    const filter = {};
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
    const purchase = await Purchase.findById(id);
    if (!purchase) {
      return res.status(404).json({ message: "Purchase not found" });
    }

    const normalizedItems = normalizeItems(req.body.items);
    const itemError = validateItems(normalizedItems);
    if (itemError) {
      return res.status(400).json({ message: itemError });
    }

    await adjustStockLevels(purchase.items || [], -1);
    await adjustStockLevels(normalizedItems, 1);

    purchase.party = req.body.party || null;
    purchase.supplierInvoice = String(req.body.supplierInvoice || "").trim();
    purchase.items = normalizedItems;
    purchase.purchaseDate = req.body.purchaseDate ? new Date(req.body.purchaseDate) : purchase.purchaseDate;
    purchase.dueDate = req.body.dueDate ? new Date(req.body.dueDate) : null;
    purchase.invoiceLink = String(req.body.invoiceLink || "").trim();
    purchase.totalAmount = toNumber(
      req.body.totalAmount,
      normalizedItems.reduce((sum, item) => sum + toNumber(item.total), 0)
    );
    purchase.notes = String(req.body.notes || "").trim();

    await purchase.save();

    const savedPurchase = await populatePurchase(purchase._id);
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
    const purchase = await Purchase.findById(id);
    if (!purchase) {
      return res.status(404).json({ message: "Purchase not found" });
    }

    await adjustStockLevels(purchase.items || [], -1);
    await Payment.deleteMany({ refType: "purchase", refId: purchase._id });
    await Purchase.findByIdAndDelete(id);

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
