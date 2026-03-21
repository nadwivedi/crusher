const Boulder = require("../models/Boulder");
const Expense = require("../models/Expense");
const MaterialUsed = require("../models/MaterialUsed");
const Payment = require("../models/Payment");
const Purchase = require("../models/Purchase");
const Receipt = require("../models/Receipt");
const Sales = require("../models/Sales");

const toDateBoundary = (value, endOfDay = false) => {
  const parsed = value ? new Date(value) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return null;

  if (endOfDay) {
    parsed.setHours(23, 59, 59, 999);
  } else {
    parsed.setHours(0, 0, 0, 0);
  }

  return parsed;
};

const formatPurchaseNumber = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return "-";
  return `PUR-${String(parsed).padStart(2, "0")}`;
};

const formatPaymentNumber = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return "-";
  return `PAY-${String(parsed).padStart(2, "0")}`;
};

const formatReceiptNumber = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return "-";
  return `REC-${String(parsed).padStart(2, "0")}`;
};

const withinRange = (dateValue, fromDate, toDate) => {
  const date = dateValue ? new Date(dateValue) : null;
  if (!date || Number.isNaN(date.getTime())) return false;
  if (fromDate && date < fromDate) return false;
  if (toDate && date > toDate) return false;
  return true;
};

const buildSummary = (entries) => entries.reduce((acc, entry) => {
  const amount = Number(entry.amount || 0);
  const inAmount = Number(entry.inAmount || 0);
  const outAmount = Number(entry.outAmount || 0);

  acc.entryCount += 1;
  acc.totalInward += inAmount;
  acc.totalOutward += outAmount;

  if (entry.type === "sale") acc.sales += amount;
  if (entry.type === "purchase") acc.purchases += amount;
  if (entry.type === "receipt") acc.receipts += amount;
  if (entry.type === "payment") acc.payments += amount;
  if (entry.type === "expense") acc.expenses += amount;
  if (entry.type === "purchaseReturn") acc.purchaseReturns += amount;
  if (entry.type === "saleReturn") acc.saleReturns += amount;

  return acc;
}, {
  entryCount: 0,
  totalInward: 0,
  totalOutward: 0,
  sales: 0,
  purchases: 0,
  receipts: 0,
  payments: 0,
  expenses: 0,
  purchaseReturns: 0,
  saleReturns: 0,
});

const getDayBook = async (req, res) => {
  try {
    const fromDate = toDateBoundary(req.query.fromDate);
    const toDate = toDateBoundary(req.query.toDate, true);

    const [
      sales,
      purchases,
      payments,
      receipts,
      expenses,
      boulders,
      materialUsedEntries,
    ] = await Promise.all([
      Sales.find().populate("partyId", "name").sort({ saleDate: -1, createdAt: -1 }),
      Purchase.find().populate("party", "name").sort({ purchaseDate: -1, createdAt: -1 }),
      Payment.find().populate("party", "name").sort({ paymentDate: -1, createdAt: -1 }),
      Receipt.find().populate("party", "name").sort({ receiptDate: -1, createdAt: -1 }),
      Expense.find().populate("party", "name").populate("expenseGroup", "name").sort({ expenseDate: -1, createdAt: -1 }),
      Boulder.find().sort({ boulderDate: -1, createdAt: -1 }),
      MaterialUsed.find().populate("vehicle", "vehicleNo vehicleNumber").populate("materialType", "name").sort({ usedDate: -1, createdAt: -1 }),
    ]);

    const entries = [
      ...sales
        .filter((item) => withinRange(item.saleDate || item.createdAt, fromDate, toDate))
        .map((item) => ({
          type: "sale",
          refId: item._id,
          date: item.saleDate || item.createdAt,
          entryCreatedAt: item.createdAt,
          voucherNumber: item.invoiceNumber || "-",
          partyName: item.partyId?.name || "-",
          method: item.vehicleNo || item.stoneSize || "-",
          amount: Number(item.totalAmount || 0),
          inAmount: Number(item.totalAmount || 0),
          outAmount: 0,
        })),
      ...purchases
        .filter((item) => withinRange(item.purchaseDate || item.createdAt, fromDate, toDate))
        .map((item) => ({
          type: "purchase",
          refId: item._id,
          date: item.purchaseDate || item.createdAt,
          entryCreatedAt: item.createdAt,
          voucherNumber: formatPurchaseNumber(item.purchaseNumber),
          partyName: item.party?.name || "-",
          method: item.supplierInvoice || "-",
          amount: Number(item.totalAmount || 0),
          inAmount: 0,
          outAmount: Number(item.totalAmount || 0),
        })),
      ...payments
        .filter((item) => withinRange(item.paymentDate || item.createdAt, fromDate, toDate))
        .map((item) => ({
          type: "payment",
          refId: item._id,
          date: item.paymentDate || item.createdAt,
          entryCreatedAt: item.createdAt,
          voucherNumber: formatPaymentNumber(item.paymentNumber),
          partyName: item.party?.name || "-",
          method: item.method || "-",
          amount: Number(item.amount || 0),
          inAmount: 0,
          outAmount: Number(item.amount || 0),
        })),
      ...receipts
        .filter((item) => withinRange(item.receiptDate || item.createdAt, fromDate, toDate))
        .map((item) => ({
          type: "receipt",
          refId: item._id,
          date: item.receiptDate || item.createdAt,
          entryCreatedAt: item.createdAt,
          voucherNumber: formatReceiptNumber(item.receiptNumber),
          partyName: item.party?.name || "-",
          method: item.method || "-",
          amount: Number(item.amount || 0),
          inAmount: Number(item.amount || 0),
          outAmount: 0,
        })),
      ...expenses
        .filter((item) => withinRange(item.expenseDate || item.createdAt, fromDate, toDate))
        .map((item) => ({
          type: "expense",
          refId: item._id,
          date: item.expenseDate || item.createdAt,
          entryCreatedAt: item.createdAt,
          voucherNumber: item._id?.toString()?.slice(-6)?.toUpperCase() || "-",
          partyName: item.party?.name || item.expenseGroup?.name || "-",
          method: item.method || "-",
          amount: Number(item.amount || 0),
          inAmount: 0,
          outAmount: Number(item.amount || 0),
        })),
      ...boulders
        .filter((item) => withinRange(item.boulderDate || item.createdAt, fromDate, toDate))
        .map((item) => ({
          type: "boulder",
          refId: item._id,
          date: item.boulderDate || item.createdAt,
          entryCreatedAt: item.createdAt,
          voucherNumber: item.vehicleNo || "-",
          partyName: item.vehicleNo || "-",
          method: `Gross ${Number(item.grossWeight || 0)} | Tare ${Number(item.tareWeight || 0)} | Net ${Number(item.netWeight || 0)}`,
          amount: 0,
          inAmount: 0,
          outAmount: 0,
        })),
      ...materialUsedEntries
        .filter((item) => withinRange(item.usedDate || item.createdAt, fromDate, toDate))
        .map((item) => ({
          type: "materialUsed",
          refId: item._id,
          date: item.usedDate || item.createdAt,
          entryCreatedAt: item.createdAt,
          voucherNumber: item.vehicleNo || item.vehicle?.vehicleNo || item.vehicle?.vehicleNumber || "-",
          partyName: item.materialTypeName || item.materialType?.name || "-",
          method: `${Number(item.usedQty || 0)} ${item.unit || ""}`.trim() || "-",
          amount: 0,
          inAmount: 0,
          outAmount: 0,
        })),
    ].sort((a, b) => {
      const aTime = new Date(a.entryCreatedAt || a.date).getTime() || 0;
      const bTime = new Date(b.entryCreatedAt || b.date).getTime() || 0;
      return bTime - aTime;
    });

    return res.json({
      summary: buildSummary(entries),
      entries,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to load day book",
      error: error.message,
    });
  }
};

module.exports = {
  getDayBook,
};
