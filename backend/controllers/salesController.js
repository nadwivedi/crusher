const mongoose = require("mongoose");
const Sales = require("../models/Sales");
const Counter = require("../models/Counter");
const Receipt = require("../models/Receipt");
const Party = require("../models/Party");
const Vehicle = require("../models/Vehicle");
const { scopedFilter, scopedIdFilter } = require("../utils/ownership");

const SALE_TYPES = {
  CREDIT: "credit",
  CASH: "cash",
  PARTIAL: "partial",
};

const AUTO_RECEIPT_SOURCES = ["sale-payment", "sale-excess-payment"];

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeVehicleNo = (value) => String(value || "").trim().toUpperCase();

const normalizeSalesPayload = (payload = {}) => {
  const nextPayload = { ...payload };

  if (Object.prototype.hasOwnProperty.call(nextPayload, "party") && !Object.prototype.hasOwnProperty.call(nextPayload, "partyId")) {
    nextPayload.partyId = nextPayload.party;
  }

  if (Object.prototype.hasOwnProperty.call(nextPayload, "materialType") && !Object.prototype.hasOwnProperty.call(nextPayload, "stoneSize")) {
    nextPayload.stoneSize = nextPayload.materialType;
  }

  if (Object.prototype.hasOwnProperty.call(nextPayload, "invoice") && !Object.prototype.hasOwnProperty.call(nextPayload, "invoiceNumber")) {
    nextPayload.invoiceNumber = nextPayload.invoice;
  }

  if (Object.prototype.hasOwnProperty.call(nextPayload, "vehicleWeight") && !Object.prototype.hasOwnProperty.call(nextPayload, "tareWeight")) {
    nextPayload.tareWeight = nextPayload.vehicleWeight;
  }

  if (Object.prototype.hasOwnProperty.call(nextPayload, "materialWeight") && !Object.prototype.hasOwnProperty.call(nextPayload, "netWeight")) {
    nextPayload.netWeight = nextPayload.materialWeight;
  }

  if (
    Object.prototype.hasOwnProperty.call(nextPayload, "netWeight")
    && !Object.prototype.hasOwnProperty.call(nextPayload, "grossWeight")
    && Object.prototype.hasOwnProperty.call(nextPayload, "vehicleWeight")
  ) {
    nextPayload.grossWeight = nextPayload.netWeight;
    nextPayload.netWeight = nextPayload.materialWeight !== undefined
      ? nextPayload.materialWeight
      : toNumber(nextPayload.grossWeight) - toNumber(nextPayload.tareWeight);
  }

  if (
    !Object.prototype.hasOwnProperty.call(nextPayload, "netWeight")
    && Object.prototype.hasOwnProperty.call(nextPayload, "grossWeight")
    && Object.prototype.hasOwnProperty.call(nextPayload, "tareWeight")
  ) {
    nextPayload.netWeight = toNumber(nextPayload.grossWeight) - toNumber(nextPayload.tareWeight);
  }

  if (Object.prototype.hasOwnProperty.call(nextPayload, "entryTime")) {
    nextPayload.entryTime = `${nextPayload.entryTime || ""}`.trim().slice(0, 5);
  }

  if (Object.prototype.hasOwnProperty.call(nextPayload, "exitTime")) {
    nextPayload.exitTime = `${nextPayload.exitTime || ""}`.trim().slice(0, 5);
  }

  nextPayload.pricingMode = nextPayload.pricingMode === "per_cubic_meter"
    ? "per_cubic_meter"
    : "per_ton";
  nextPayload.cubicMeterQty = Math.max(0, toNumber(nextPayload.cubicMeterQty));

  delete nextPayload.party;
  delete nextPayload.materialType;
  delete nextPayload.invoice;
  delete nextPayload.vehicleWeight;
  delete nextPayload.materialWeight;

  return nextPayload;
};

const resolveSalesVehicle = async (payload = {}, userId) => {
  const normalizedVehicleId = `${payload.vehicleId || ""}`.trim();
  const normalizedVehicleNo = normalizeVehicleNo(payload.vehicleNo);

  if (!normalizedVehicleId && !normalizedVehicleNo) {
    return payload;
  }

  let vehicle = null;

  if (normalizedVehicleId) {
    if (!mongoose.Types.ObjectId.isValid(normalizedVehicleId)) {
      throw new Error("Invalid vehicle id");
    }

    vehicle = await Vehicle.findOne({ _id: normalizedVehicleId, userId });
    if (!vehicle) {
      throw new Error("Vehicle not found");
    }
  } else {
    vehicle = await Vehicle.findOne({ userId, vehicleNo: normalizedVehicleNo });

    if (!vehicle) {
      if (!payload.partyId || !mongoose.Types.ObjectId.isValid(payload.partyId)) {
        throw new Error("Party is required for new vehicle");
      }

      const party = await Party.findOne({ _id: payload.partyId, userId }).select("_id");
      if (!party) {
        throw new Error("Party not found");
      }

      vehicle = await Vehicle.create({
        userId,
        partyId: payload.partyId,
        vehicleNo: normalizedVehicleNo,
        unladenWeight: Math.max(0, toNumber(payload.tareWeight)),
        capacityCubicMeter: Math.max(0, toNumber(payload.cubicMeterQty)),
        vehicleType: "sales",
      });
    }
  }

  return {
    ...payload,
    vehicleId: vehicle._id,
    vehicleNo: vehicle.vehicleNo,
    tareWeight: Object.prototype.hasOwnProperty.call(payload, "tareWeight")
      ? payload.tareWeight
      : vehicle.unladenWeight,
  };
};

const serializeSale = (saleDoc) => {
  if (!saleDoc) return saleDoc;

  const sale = typeof saleDoc.toObject === "function" ? saleDoc.toObject() : { ...saleDoc };
  const tareWeight = toNumber(sale.tareWeight, toNumber(sale.vehicleWeight));
  const grossWeight = toNumber(sale.grossWeight, toNumber(sale.netWeight));
  const netWeight = toNumber(sale.netWeight, toNumber(sale.materialWeight, grossWeight - tareWeight));

  return {
    ...sale,
    party: sale.partyId || null,
    vehicleId: sale.vehicleId || null,
    materialType: sale.stoneSize || "",
    invoice: sale.invoiceNumber || "",
    entryTime: `${sale.entryTime || ""}`.trim().slice(0, 5),
    exitTime: `${sale.exitTime || ""}`.trim().slice(0, 5),
    tareWeight,
    grossWeight,
    netWeight,
    pricingMode: sale.pricingMode || "per_ton",
    cubicMeterQty: toNumber(sale.cubicMeterQty),
  };
};

const getNextReceiptNumber = async (userId) => {
  const lastEntry = await Receipt.findOne({ userId }).sort({ receiptNumber: -1 }).select("receiptNumber");
  return Math.max(1, Number(lastEntry?.receiptNumber || 0) + 1);
};

const getSalePaymentBreakdown = (totalAmountValue, paidAmountValue) => {
  const totalAmount = Math.max(0, toNumber(totalAmountValue));
  const paidAmount = Math.max(0, toNumber(paidAmountValue));
  const appliedAmount = Math.min(totalAmount, paidAmount);
  const pendingAmount = Math.max(0, totalAmount - paidAmount);
  const excessAmount = Math.max(0, paidAmount - totalAmount);

  let type = SALE_TYPES.CREDIT;
  if (paidAmount <= 0) {
    type = SALE_TYPES.CREDIT;
  } else if (paidAmount >= totalAmount) {
    type = SALE_TYPES.CASH;
  } else {
    type = SALE_TYPES.PARTIAL;
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

const syncSaleAutoReceipts = async (saleDoc, userId) => {
  const breakdown = getSalePaymentBreakdown(saleDoc.totalAmount, saleDoc.paidAmount);

  await Receipt.deleteMany({
    userId,
    originSaleId: saleDoc._id,
    receiptSource: { $in: AUTO_RECEIPT_SOURCES },
  });

  return breakdown;
};

const getInvoiceYear = (saleDateValue) => {
  const saleDate = saleDateValue ? new Date(saleDateValue) : new Date();
  if (Number.isNaN(saleDate.getTime())) {
    return new Date().getFullYear();
  }
  return saleDate.getFullYear();
};

const createInvoiceNumber = async (userId, saleDateValue) => {
  const invoiceYear = getInvoiceYear(saleDateValue);
  const counterKey = `sales:${invoiceYear}`;
  const counter = await Counter.findOneAndUpdate(
    { userId, key: counterKey },
    { $inc: { seq: 1 } },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );

  return `INV-${invoiceYear}-${String(counter.seq).padStart(4, "0")}`;
};

const createSales = async (req, res) => {
  try {
    const breakdown = getSalePaymentBreakdown(req.body.totalAmount, req.body.paidAmount);
    const normalizedBody = await resolveSalesVehicle(normalizeSalesPayload(req.body), req.userId);
    if (!normalizedBody.partyId || !mongoose.Types.ObjectId.isValid(normalizedBody.partyId)) {
      throw new Error("Party is required");
    }

    const party = await Party.findOne({ _id: normalizedBody.partyId, userId: req.userId }).select("_id");
    if (!party) {
      throw new Error("Party not found");
    }

    const payload = {
      ...normalizedBody,
      userId: req.userId,
      saleDate: normalizedBody.saleDate || new Date(),
      invoiceNumber: await createInvoiceNumber(req.userId, normalizedBody.saleDate),
      paidAmount: breakdown.paidAmount,
      type: breakdown.type,
    };

    const sales = await Sales.create(payload);
    await syncSaleAutoReceipts(sales, req.userId);
    return res.status(201).json(serializeSale(sales));
  } catch (error) {
    return res.status(400).json({
      message: "Failed to create sales",
      error: error.message,
    });
  }
};

const getAllSales = async (req, res) => {
  try {
    const query = scopedFilter(req);
    if (req.visibilityBoundary) {
       query.saleDate = { $gte: req.visibilityBoundary };
    }

    // Without ?page the full list is returned (other screens rely on this).
    if (req.query.page === undefined) {
      const sales = await Sales.find(query).sort({ createdAt: -1 });
      return res.json(sales.map(serializeSale));
    }

    const from = req.query.from ? new Date(req.query.from) : null;
    const to = req.query.to ? new Date(req.query.to) : null;
    if ((from && !Number.isNaN(from.getTime())) || (to && !Number.isNaN(to.getTime()))) {
      const range = { ...(query.saleDate || {}) };
      if (from && !Number.isNaN(from.getTime())) {
        range.$gte = range.$gte && range.$gte > from ? range.$gte : from;
      }
      if (to && !Number.isNaN(to.getTime())) range.$lte = to;
      query.saleDate = range;
    }

    const search = String(req.query.search || "").trim();
    if (search) {
      const pattern = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [
        { invoiceNumber: pattern },
        { customerName: pattern },
        { vehicleNo: pattern },
        { stoneSize: pattern },
        { type: pattern },
        { notes: pattern },
      ];
    }

    const material = String(req.query.material || "").trim();
    const statsQuery = { ...query };
    if (material) query.stoneSize = { $regex: `^${material.replace(/[^a-z0-9]/gi, "\\$&")}$`, $options: "i" };

    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const [sales, total, statRows] = await Promise.all([
      Sales.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Sales.countDocuments(query),
      Sales.find(statsQuery)
        .select("totalAmount type netWeight stoneSize pricingMode cubicMeterQty")
        .lean(),
    ]);

    const summary = { totalAmount: 0, cashAmount: 0, creditAmount: 0, totalWeight: 0 };
    const materialMap = new Map();
    statRows.forEach((row) => {
      const amount = Number(row.totalAmount || 0);
      const weight = Number(row.netWeight || 0);
      const key = String(row.stoneSize || "unknown").trim().toLowerCase() || "unknown";

      const entry = materialMap.get(key) || { materialType: key, count: 0, totalAmount: 0, totalWeight: 0, totalCubicMeter: 0 };
      entry.count += 1;
      entry.totalAmount += amount;
      entry.totalWeight += weight;
      if (row.pricingMode === "per_cubic_meter") entry.totalCubicMeter += Number(row.cubicMeterQty || 0);
      materialMap.set(key, entry);

      if (material && key !== material.toLowerCase()) return;
      summary.totalAmount += amount;
      summary.totalWeight += weight;
      if (row.type === "cash") summary.cashAmount += amount;
      else summary.creditAmount += amount;
    });
    const materialStats = [...materialMap.values()].sort((x, y) => y.totalAmount - x.totalAmount);

    return res.json({
      sales: sales.map(serializeSale),
      summary: { ...summary, count: total },
      materialStats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch sales",
      error: error.message,
    });
  }
};

const getSalesById = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid sales id" });
  }

  try {
    const query = scopedIdFilter(req, id);
    if (req.visibilityBoundary) {
      query.saleDate = { $gte: req.visibilityBoundary };
    }

    const sales = await Sales.findOne(query);

    if (!sales) {
      return res.status(404).json({ message: "Sales not found" });
    }

    return res.json(serializeSale(sales));
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch sales",
      error: error.message,
    });
  }
};

const editSales = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid sales id" });
  }

  try {
    const sales = await Sales.findOne(scopedIdFilter(req, id));

    if (!sales) {
      return res.status(404).json({ message: "Sales not found" });
    }

    const updatePayload = await resolveSalesVehicle(normalizeSalesPayload(req.body), req.userId);
    delete updatePayload.invoiceNumber;

    if (Object.prototype.hasOwnProperty.call(updatePayload, "partyId")) {
      if (!updatePayload.partyId || !mongoose.Types.ObjectId.isValid(updatePayload.partyId)) {
        throw new Error("Party is required");
      }

      const party = await Party.findOne({ _id: updatePayload.partyId, userId: req.userId }).select("_id");
      if (!party) {
        throw new Error("Party not found");
      }
    }

    const nextTotalAmount = Object.prototype.hasOwnProperty.call(updatePayload, "totalAmount")
      ? updatePayload.totalAmount
      : sales.totalAmount;
    const nextPaidAmount = Object.prototype.hasOwnProperty.call(updatePayload, "paidAmount")
      ? updatePayload.paidAmount
      : sales.paidAmount;
    const breakdown = getSalePaymentBreakdown(nextTotalAmount, nextPaidAmount);

    Object.assign(sales, updatePayload, {
      paidAmount: breakdown.paidAmount,
      type: breakdown.type,
    });

    await sales.save();
    await syncSaleAutoReceipts(sales, req.userId);

    return res.json(serializeSale(sales));
  } catch (error) {
    return res.status(400).json({
      message: "Failed to update sales",
      error: error.message,
    });
  }
};

const deleteSales = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid sales id" });
  }

  try {
    const sales = await Sales.findOneAndDelete(scopedIdFilter(req, id));

    if (!sales) {
      return res.status(404).json({ message: "Sales not found" });
    }

    await Receipt.deleteMany({
      userId: req.userId,
      originSaleId: sales._id,
      receiptSource: { $in: AUTO_RECEIPT_SOURCES },
    });

    return res.json({ message: "Sales deleted successfully" });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to delete sales",
      error: error.message,
    });
  }
};

module.exports = {
  createSales,
  getAllSales,
  getSalesById,
  editSales,
  deleteSales,
};
