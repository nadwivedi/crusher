const mongoose = require("mongoose");
const Counter = require("../models/Counter");
const Purchase = require("../models/Purchase");
const PurchaseReturn = require("../models/PurchaseReturn");
const Stock = require("../models/Stock");
const { scopedFilter, scopedIdFilter } = require("../utils/ownership");

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const roundQty = (value) => Math.round(toNumber(value) * 1000) / 1000;
const roundAmount = (value) => Math.round(toNumber(value) * 100) / 100;

const createVoucherNumber = async (userId, voucherDate) => {
  const voucherYear = voucherDate.getFullYear();
  const counter = await Counter.findOneAndUpdate(
    { userId, key: `purchaseReturns:${voucherYear}` },
    { $inc: { seq: 1 } },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );

  return `PR-${voucherYear}-${String(counter.seq).padStart(2, "0")}`;
};

// Quantity already returned against each line of one purchase, keyed by line position
const getReturnedQtyByLine = async (userId, purchaseId) => {
  const returns = await PurchaseReturn.find({ userId, purchase: purchaseId }).select("items").lean();
  const map = new Map();
  returns.forEach((entry) => {
    (entry.items || []).forEach((item) => {
      map.set(item.purchaseItemId, toNumber(map.get(item.purchaseItemId)) + toNumber(item.quantity));
    });
  });
  return map;
};

// Set the new level directly: the currentStock setter turns a negative $inc into 0
const changeStock = async (userId, items, direction) => {
  for (const item of items) {
    const stock = await Stock.findOne({ _id: item.product, userId });
    if (!stock) continue;
    stock.currentStock = toNumber(stock.currentStock) + direction * toNumber(item.quantity);
    await stock.save();
  }
};

const populateReturn = (query) => query
  .populate("party", "name")
  .populate("purchase", "purchaseNumber supplierInvoice purchaseDate totalAmount");

const createPurchaseReturn = async (req, res) => {
  try {
    const purchaseId = req.body.purchase;
    if (!purchaseId || !mongoose.Types.ObjectId.isValid(purchaseId)) {
      return res.status(400).json({ message: "Select the purchase being returned" });
    }

    const voucherDate = req.body.voucherDate ? new Date(req.body.voucherDate) : new Date();
    if (Number.isNaN(voucherDate.getTime())) {
      return res.status(400).json({ message: "Valid date is required" });
    }

    const purchase = await Purchase.findOne(scopedIdFilter(req, purchaseId));
    if (!purchase) {
      return res.status(404).json({ message: "Purchase not found" });
    }

    // Same line sent twice counts once, with the quantities added
    const requestedByLine = new Map();
    (Array.isArray(req.body.items) ? req.body.items : []).forEach((item) => {
      const purchaseItemId = String(item?.purchaseItemId ?? "").trim();
      const quantity = roundQty(item?.quantity);
      if (quantity > 0) requestedByLine.set(purchaseItemId, roundQty(toNumber(requestedByLine.get(purchaseItemId)) + quantity));
    });
    const requested = [...requestedByLine].map(([purchaseItemId, quantity]) => ({ purchaseItemId, quantity }));
    if (requested.length === 0) {
      return res.status(400).json({ message: "Enter a return quantity for at least one item" });
    }

    const returnedByLine = await getReturnedQtyByLine(req.userId, purchase._id);
    const items = [];
    for (const { purchaseItemId, quantity } of requested) {
      const line = purchase.items[Number(purchaseItemId)];
      if (!/^\d+$/.test(purchaseItemId) || !line) {
        return res.status(400).json({ message: "One of the items is not on this purchase" });
      }

      const remaining = roundQty(toNumber(line.quantity) - toNumber(returnedByLine.get(purchaseItemId)));
      if (quantity > remaining) {
        return res.status(400).json({ message: `Only ${remaining} ${line.unit || ""} of ${line.productName} can be returned`.replace(/\s+/g, " ") });
      }

      items.push({
        purchaseItemId,
        product: line.product,
        productName: line.productName,
        unit: line.unit || "",
        quantity,
        unitPrice: toNumber(line.unitPrice),
        total: roundAmount(quantity * toNumber(line.unitPrice)),
      });
    }

    // The goods leave stock, so there must be enough left of each item
    const stocks = await Stock.find({ userId: req.userId, _id: { $in: items.map((item) => item.product) } });
    for (const item of items) {
      const stock = stocks.find((entry) => String(entry._id) === String(item.product));
      if (!stock) {
        return res.status(404).json({ message: `${item.productName} is no longer in stock items` });
      }
      const neededQty = items
        .filter((entry) => String(entry.product) === String(item.product))
        .reduce((sum, entry) => sum + entry.quantity, 0);
      if (toNumber(stock.currentStock) < neededQty) {
        return res.status(400).json({ message: `Only ${toNumber(stock.currentStock)} ${stock.unit || ""} of ${stock.name} in stock`.replace(/\s+/g, " ") });
      }
    }

    await changeStock(req.userId, items, -1);

    try {
      const purchaseReturn = await PurchaseReturn.create({
        userId: req.userId,
        voucherNumber: await createVoucherNumber(req.userId, voucherDate),
        voucherDate,
        purchase: purchase._id,
        party: purchase.party || null,
        items,
        totalAmount: roundAmount(items.reduce((sum, item) => sum + item.total, 0)),
        notes: String(req.body.notes || "").trim(),
      });

      const saved = await populateReturn(PurchaseReturn.findById(purchaseReturn._id));
      return res.status(201).json({ data: saved });
    } catch (error) {
      await changeStock(req.userId, items, 1);
      throw error;
    }
  } catch (error) {
    return res.status(400).json({
      message: "Failed to create purchase return",
      error: error.message,
    });
  }
};

const getAllPurchaseReturns = async (req, res) => {
  try {
    const normalizedSearch = String(req.query.search || "").trim();
    const filter = scopedFilter(req);

    if (normalizedSearch) {
      const pattern = normalizedSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { voucherNumber: { $regex: pattern, $options: "i" } },
        { "items.productName": { $regex: pattern, $options: "i" } },
        { notes: { $regex: pattern, $options: "i" } },
      ];
    }

    const returns = await populateReturn(PurchaseReturn.find(filter).sort({ voucherDate: -1, createdAt: -1 }));

    return res.json({ data: returns });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch purchase returns",
      error: error.message,
    });
  }
};

const deletePurchaseReturn = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid purchase return id" });
  }

  try {
    const purchaseReturn = await PurchaseReturn.findOneAndDelete(scopedIdFilter(req, id));
    if (!purchaseReturn) {
      return res.status(404).json({ message: "Purchase return not found" });
    }

    // The returned goods come back into stock
    await changeStock(req.userId, purchaseReturn.items, 1);

    return res.json({ message: "Purchase return deleted successfully" });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to delete purchase return",
      error: error.message,
    });
  }
};

module.exports = {
  createPurchaseReturn,
  getAllPurchaseReturns,
  deletePurchaseReturn,
};
