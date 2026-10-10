const mongoose = require("mongoose");
const Counter = require("../models/Counter");
const Sales = require("../models/Sales");
const SaleReturn = require("../models/SaleReturn");
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
    { userId, key: `saleReturns:${voucherYear}` },
    { $inc: { seq: 1 } },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );

  return `SR-${voucherYear}-${String(counter.seq).padStart(2, "0")}`;
};

// Sold quantity in the unit the sale was priced in: tons (net weight is kept in kg) or cubic metres
const getSaleQty = (sale) => (
  sale.pricingMode === "per_cubic_meter"
    ? toNumber(sale.cubicMeterQty)
    : toNumber(sale.netWeight || sale.materialWeight) / 1000
);

// Material rate only; older sales without a rate fall back to the bill minus transport, per unit
const getSaleRate = (sale) => {
  const rate = toNumber(sale.rate);
  if (rate > 0) return rate;
  const qty = getSaleQty(sale);
  return qty > 0 ? Math.max(0, toNumber(sale.totalAmount) - toNumber(sale.transportCharge)) / qty : 0;
};

const populateReturn = (query) => query
  .populate("party", "name")
  .populate("sale", "invoiceNumber saleDate totalAmount vehicleNo");

const createSaleReturn = async (req, res) => {
  try {
    const saleId = req.body.sale;
    if (!saleId || !mongoose.Types.ObjectId.isValid(saleId)) {
      return res.status(400).json({ message: "Select the sale being returned" });
    }

    const voucherDate = req.body.voucherDate ? new Date(req.body.voucherDate) : new Date();
    if (Number.isNaN(voucherDate.getTime())) {
      return res.status(400).json({ message: "Valid date is required" });
    }

    const sale = await Sales.findOne(scopedIdFilter(req, saleId));
    if (!sale) {
      return res.status(404).json({ message: "Sale not found" });
    }

    const quantity = roundQty((Array.isArray(req.body.items) ? req.body.items : [])
      .reduce((sum, item) => sum + Math.max(0, toNumber(item?.quantity)), 0));
    if (quantity <= 0) {
      return res.status(400).json({ message: "Enter the quantity being returned" });
    }

    const unit = sale.pricingMode === "per_cubic_meter" ? "m3" : "ton";
    const previousReturns = await SaleReturn.find({ userId: req.userId, sale: sale._id }).select("items").lean();
    const alreadyReturned = previousReturns
      .flatMap((entry) => entry.items || [])
      .reduce((sum, item) => sum + toNumber(item.quantity), 0);
    const remaining = roundQty(getSaleQty(sale) - alreadyReturned);
    if (quantity > remaining) {
      return res.status(400).json({ message: `Only ${Math.max(0, remaining)} ${unit} of this sale can be returned` });
    }

    const unitPrice = roundAmount(getSaleRate(sale));
    const total = roundAmount(quantity * unitPrice);

    const saleReturn = await SaleReturn.create({
      userId: req.userId,
      voucherNumber: await createVoucherNumber(req.userId, voucherDate),
      voucherDate,
      sale: sale._id,
      party: sale.partyId || null,
      pricingMode: sale.pricingMode || "per_ton",
      items: [{
        saleItemId: String(sale._id),
        productName: String(sale.stoneSize || "Material").toUpperCase(),
        unit,
        quantity,
        unitPrice,
        total,
      }],
      totalAmount: total,
      notes: String(req.body.notes || "").trim(),
    });

    const saved = await populateReturn(SaleReturn.findById(saleReturn._id));
    return res.status(201).json({ data: saved });
  } catch (error) {
    return res.status(400).json({
      message: "Failed to create sale return",
      error: error.message,
    });
  }
};

const getAllSaleReturns = async (req, res) => {
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

    const returns = await populateReturn(SaleReturn.find(filter).sort({ voucherDate: -1, createdAt: -1 }));

    return res.json({ data: returns });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch sale returns",
      error: error.message,
    });
  }
};

const deleteSaleReturn = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid sale return id" });
  }

  try {
    const saleReturn = await SaleReturn.findOneAndDelete(scopedIdFilter(req, id));
    if (!saleReturn) {
      return res.status(404).json({ message: "Sale return not found" });
    }

    return res.json({ message: "Sale return deleted successfully" });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to delete sale return",
      error: error.message,
    });
  }
};

module.exports = {
  createSaleReturn,
  getAllSaleReturns,
  deleteSaleReturn,
};
