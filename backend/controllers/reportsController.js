const mongoose = require("mongoose");
const Boulder = require("../models/Boulder");
const Expense = require("../models/Expense");
const MaterialUsed = require("../models/MaterialUsed");
const Party = require("../models/Party");
const Payment = require("../models/Payment");
const Purchase = require("../models/Purchase");
const Receipt = require("../models/Receipt");
const Sales = require("../models/Sales");
const Stock = require("../models/Stock");
const { scopedFilter, scopedIdFilter } = require("../utils/ownership");

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
  const normalized = String(value || "").trim();
  if (!normalized) return "-";
  if (/^PAY-\d{4}-\d{2,}$/i.test(normalized)) return normalized.toUpperCase();
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

const toObjectId = (value) => {
  if (!value || !mongoose.Types.ObjectId.isValid(value)) return null;
  return new mongoose.Types.ObjectId(value);
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatAmount = (value) => `Rs ${toNumber(value).toLocaleString("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;

const getSaleTypeLabel = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "sale") return "Sale";
  if (normalized === "cash sale") return "Cash Sale";
  if (normalized === "credit sale") return "Credit Sale";
  return "Sale";
};

const getPurchaseTypeLabel = (total, paid) => {
  const totalAmount = toNumber(total);
  const paidAmount = toNumber(paid);
  
  if (paidAmount === 0) return "Credit Purchase";
  if (paidAmount >= totalAmount && totalAmount > 0) return "Cash Purchase";
  return "Partial Purchase";
};

const getEntryDisplayType = (baseType, entryType = "") => {
  if (baseType === "sale") {
    return getSaleTypeLabel(entryType);
  }

  if (baseType === "purchase") {
    return "Purchase"; // Default, usually overridden by getPurchaseTypeLabel
  }
  if (baseType === "receipt") return "Receipt";
  if (baseType === "payment") return "Payment";
  if (baseType === "opening") return "Opening";
  if (baseType === "expense") return "Expense";
  if (baseType === "boulder") return "Boulder";
  if (baseType === "materialUsed") return "Material Used";
  if (baseType === "purchaseReturn") return "Purchase Return";
  if (baseType === "saleReturn") return "Sale Return";

  return String(baseType || "").trim() || "-";
};

const getSaleAmounts = (sale) => {
  const totalAmount = Math.max(0, toNumber(sale?.totalAmount));
  const paidAmount = Math.max(0, toNumber(sale?.paidAmount));
  const appliedAmount = Math.min(totalAmount, paidAmount);
  const pendingAmount = Math.max(0, totalAmount - paidAmount);
  const excessAmount = Math.max(0, paidAmount - totalAmount);

  return {
    totalAmount,
    paidAmount,
    appliedAmount,
    pendingAmount,
    excessAmount,
  };
};

const getPartyOpeningImpact = (party) => {
  const openingBalance = Math.abs(toNumber(party?.openingBalance));
  if (openingBalance <= 0) return 0;
  return party?.openingBalanceType === "payable" ? -openingBalance : openingBalance;
};

const buildSaleSummary = (sale) => {
  const parts = [];
  if (sale.vehicleNo) parts.push(`Vehicle ${sale.vehicleNo}`);
  parts.push(`Type ${getSaleTypeLabel(sale.type)}`);
  const amounts = getSaleAmounts(sale);
  if (amounts.paidAmount > 0) parts.push(`Paid ${formatAmount(amounts.paidAmount)}`);
  if (amounts.pendingAmount > 0) parts.push(`Due ${formatAmount(amounts.pendingAmount)}`);
  if (amounts.excessAmount > 0) parts.push(`Excess ${formatAmount(amounts.excessAmount)}`);
  return parts.join(" | ");
};

const buildPurchaseSummary = (purchase) => (
  Array.isArray(purchase?.items)
    ? purchase.items
        .map((item) => {
          const productName = String(item?.productName || "").trim();
          const quantity = toNumber(item?.quantity);
          return productName ? `${productName}${quantity > 0 ? ` x ${quantity}` : ""}` : "";
        })
        .filter(Boolean)
        .join(", ")
    : ""
);

const buildSaleMaterialSummary = (sale) => {
  const materialType = String(sale?.stoneSize || "Uncategorized").trim();
  const quantity = sale?.pricingMode === "per_cubic_meter"
    ? toNumber(sale?.cubicMeterQty)
    : toNumber(sale?.netWeight || sale?.materialWeight);
  
  const quantityLabel = quantity > 0
    ? (sale?.pricingMode === "per_cubic_meter"
        ? `${quantity} m³`
        : `${quantity} kg (${(quantity / 1000).toFixed(2)} ton)`)
    : "";

  return [materialType, quantityLabel]
    .filter(Boolean)
    .join(" / ") || "-";
};

const buildLedgerRowsForParty = ({ party, sales, purchases, receipts, payments, boulders, fromDate, toDate }) => {
  const openingImpact = getPartyOpeningImpact(party);
  const openingDate = party?.createdAt || new Date(0);
  const rows = [];

  if (!fromDate && openingImpact !== 0) {
    rows.push({
      type: "opening",
      displayType: getEntryDisplayType("opening"),
      refId: `opening-${party._id}`,
      partyId: party._id,
      partyName: party.name || "-",
      date: openingDate,
      entryCreatedAt: openingDate,
      refNumber: "OPENING",
      itemSummary: "Opening balance",
      note: "",
      method: "",
      quantity: 0,
      amount: Math.abs(openingImpact),
      impact: openingImpact,
    });
  }

  rows.push(
    ...sales
      .filter((item) => String(item.partyId?._id || item.partyId) === String(party._id))
      .filter((item) => withinRange(item.saleDate || item.createdAt, fromDate, toDate))
      .map((item) => {
        const saleAmounts = getSaleAmounts(item);
        const saleImpact = saleAmounts.totalAmount - saleAmounts.paidAmount;

        return {
          type: "sale",
          displayType: getEntryDisplayType("sale", item.type),
          refId: item._id,
          partyId: party._id,
          partyName: party.name || "-",
          vehicleNo: item.vehicleNo || "-",
          date: item.saleDate || item.createdAt,
          entryCreatedAt: item.createdAt,
          refNumber: item.invoiceNumber || "-",
          itemSummary: buildSaleSummary(item),
          note: "",
          method: item.vehicleNo || "-",
          quantity: item.pricingMode === "per_cubic_meter"
            ? toNumber(item.cubicMeterQty)
            : toNumber(item.netWeight || item.materialWeight),
          amount: saleAmounts.totalAmount,
          paidAmount: saleAmounts.paidAmount,
          impact: saleImpact,
        };
      }),
    ...purchases
      .filter((item) => String(item.party?._id || item.party) === String(party._id))
      .filter((item) => withinRange(item.purchaseDate || item.createdAt, fromDate, toDate))
      .map((item) => ({
        type: "purchase",
        displayType: getPurchaseTypeLabel(item.totalAmount, item.paidAmount),
        refId: item._id,
        partyId: party._id,
        partyName: party.name || "-",
        date: item.purchaseDate || item.createdAt,
        entryCreatedAt: item.createdAt,
        refNumber: formatPurchaseNumber(item.purchaseNumber),
        itemSummary: buildPurchaseSummary(item),
        note: String(item.notes || "").trim(),
        method: item.supplierInvoice || "-",
        quantity: Array.isArray(item.items)
          ? item.items.reduce((sum, row) => sum + toNumber(row.quantity), 0)
          : 0,
        amount: toNumber(item.totalAmount),
        paidAmount: toNumber(item.paidAmount),
        impact: -(toNumber(item.totalAmount) - toNumber(item.paidAmount)),
      })),
    ...receipts
      .filter((item) => String(item.party?._id || item.party) === String(party._id))
      .filter((item) => withinRange(item.receiptDate || item.createdAt, fromDate, toDate))
      .map((item) => ({
        type: "receipt",
        displayType: getEntryDisplayType("receipt"),
        refId: item._id,
        partyId: party._id,
        partyName: party.name || "-",
        date: item.receiptDate || item.createdAt,
        entryCreatedAt: item.createdAt,
        refNumber: formatReceiptNumber(item.receiptNumber),
        itemSummary: item.refType === "sale" ? "Against sale" : "",
        note: String(item.notes || "").trim(),
        method: item.method || "-",
        quantity: 0,
        amount: toNumber(item.amount),
        impact: -toNumber(item.amount),
      })),
    ...payments
      .filter((item) => String(item.party?._id || item.party) === String(party._id))
      .filter((item) => withinRange(item.paymentDate || item.createdAt, fromDate, toDate))
      .map((item) => ({
        type: "payment",
        displayType: getEntryDisplayType("payment"),
        refId: item._id,
        partyId: party._id,
        partyName: party.name || "-",
        date: item.paymentDate || item.createdAt,
        entryCreatedAt: item.createdAt,
        refNumber: formatPaymentNumber(item.paymentNumber),
        itemSummary: item.refType === "purchase" ? "Against purchase" : "",
        note: String(item.notes || "").trim(),
        method: item.method || "-",
        quantity: 0,
        amount: toNumber(item.amount),
        impact: toNumber(item.amount),
      })),
    ...boulders
      .filter((item) => String(item.partyId?._id || item.partyId) === String(party._id))
      .filter((item) => withinRange(item.boulderDate || item.createdAt, fromDate, toDate))
      .map((item) => ({
        type: "boulder",
        displayType: getEntryDisplayType("boulder"),
        refId: item._id,
        partyId: party._id,
        partyName: party.name || "-",
        materialType: "Boulder",
        vehicleNo: item.vehicleNo || "-",
        date: item.boulderDate || item.createdAt,
        entryCreatedAt: item.createdAt,
        refNumber: item.boulderNumber || item.vehicleNo || "-",
        itemSummary: [
          item.vehicleNo ? `Vehicle ${item.vehicleNo}` : "",
          `Net ${toNumber(item.netWeight)} kg`,
        ].filter(Boolean).join(" | "),
        note: "",
        method: `Rate ${formatAmount(item.boulderRatePerTon)}/Ton`,
        quantity: toNumber(item.netWeight),
        amount: toNumber(item.amount),
        impact: -toNumber(item.amount),
      }))
  );

  const sortedRows = rows.sort((firstRow, secondRow) => {
    const firstTime = new Date(firstRow.entryCreatedAt || firstRow.date).getTime() || 0;
    const secondTime = new Date(secondRow.entryCreatedAt || secondRow.date).getTime() || 0;
    if (firstTime !== secondTime) return firstTime - secondTime;
    return String(firstRow.refId || "").localeCompare(String(secondRow.refId || ""));
  });

  let runningBalance = 0;

  return sortedRows.map((row) => {
    runningBalance += toNumber(row.impact);
    return {
      ...row,
      runningBalance,
    };
  });
};

const buildOutstandingResponse = (parties, ledgerRows) => {
  const partyOutstanding = parties.map((party) => {
    const partyRows = ledgerRows.filter((row) => String(row.partyId) === String(party._id));
    const closingBalance = partyRows.length > 0
      ? toNumber(partyRows[partyRows.length - 1].runningBalance)
      : getPartyOpeningImpact(party);

    return {
      partyId: party._id,
      partyName: party.name || "-",
      receivable: closingBalance > 0 ? closingBalance : 0,
      payable: closingBalance < 0 ? Math.abs(closingBalance) : 0,
      netBalance: closingBalance,
    };
  });

  return {
    partyOutstanding,
    totalReceivable: partyOutstanding.reduce((sum, row) => sum + toNumber(row.receivable), 0),
    totalPayable: partyOutstanding.reduce((sum, row) => sum + toNumber(row.payable), 0),
  };
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

const getPartyLedgerData = async ({ userId, partyId, fromDate, toDate }) => {
  const partyFilter = partyId ? { _id: partyId } : {};

  const [parties, sales, purchases, receipts, payments, boulders] = await Promise.all([
    Party.find({ userId, ...partyFilter }).sort({ name: 1 }),
    Sales.find({ userId, ...(partyId ? { partyId } : {}) }).populate("partyId", "name").sort({ saleDate: 1, createdAt: 1 }),
    Purchase.find({ userId, ...(partyId ? { party: partyId } : {}) }).populate("party", "name").sort({ purchaseDate: 1, createdAt: 1 }),
    Receipt.find({ userId, ...(partyId ? { party: partyId } : {}) }).populate("party", "name").sort({ receiptDate: 1, createdAt: 1 }),
    Payment.find({ userId, ...(partyId ? { party: partyId } : {}) }).populate("party", "name").sort({ paymentDate: 1, createdAt: 1 }),
    Boulder.find({ userId, ...(partyId ? { partyId } : {}) }).sort({ boulderDate: 1, createdAt: 1 }),
  ]);

  const ledgerRows = parties.flatMap((party) => buildLedgerRowsForParty({
    party,
    sales,
    purchases,
    receipts,
    payments,
    boulders,
    fromDate,
    toDate,
  }));

  return {
    parties,
    ledgerRows,
  };
};

const getStockLedgerData = async ({ userId, productId, fromDate, toDate }) => {
  const stockFilter = { userId };
  const purchaseFilter = { userId };
  const materialUsedFilter = { userId };

  if (productId) {
    stockFilter._id = productId;
    purchaseFilter["items.product"] = productId;
    materialUsedFilter.materialType = productId;
  }

  const [stocks, purchases, materialUsedEntries] = await Promise.all([
    Stock.find(stockFilter).sort({ name: 1 }),
    Purchase.find(purchaseFilter)
      .populate("party", "name")
      .populate("items.product", "name unit")
      .sort({ purchaseDate: 1, createdAt: 1 }),
    MaterialUsed.find(materialUsedFilter)
      .populate("vehicle", "vehicleNo vehicleNumber")
      .populate("materialType", "name unit")
      .sort({ usedDate: 1, createdAt: 1 }),
  ]);

  const ledgerRows = [
    ...purchases.flatMap((purchase) => (
      Array.isArray(purchase.items)
        ? purchase.items
            .filter((item) => !productId || String(item.product?._id || item.product) === String(productId))
            .filter(() => withinRange(purchase.purchaseDate || purchase.createdAt, fromDate, toDate))
            .map((item, index) => ({
              type: "purchase",
              displayType: getEntryDisplayType("purchase", purchase.type),
              refId: `${purchase._id}-${index}`,
              sourceRefId: purchase._id,
              productId: item.product?._id || item.product,
              productName: item.productName || item.product?.name || "-",
              unit: item.unit || item.product?.unit || "",
              partyName: purchase.party?.name || "-",
              date: purchase.purchaseDate || purchase.createdAt,
              entryCreatedAt: purchase.createdAt,
              refNumber: formatPurchaseNumber(purchase.purchaseNumber),
              vehicleNo: purchase.vehicleNo || "-",
              inQty: toNumber(item.quantity),
              outQty: 0,
              rate: toNumber(item.unitPrice),
              amount: toNumber(item.total),
              note: String(purchase.notes || purchase.supplierInvoice || "").trim(),
            }))
        : []
    )),
    ...materialUsedEntries
      .filter((entry) => withinRange(entry.usedDate || entry.createdAt, fromDate, toDate))
      .map((entry) => ({
        type: "materialUsed",
        displayType: getEntryDisplayType("materialUsed"),
        refId: entry._id,
        sourceRefId: entry._id,
        productId: entry.materialType?._id || entry.materialType,
        productName: entry.materialTypeName || entry.materialType?.name || "-",
        unit: entry.unit || entry.materialType?.unit || "",
        partyName: entry.vehicleNo || entry.vehicle?.vehicleNo || entry.vehicle?.vehicleNumber || "-",
        date: entry.usedDate || entry.createdAt,
        entryCreatedAt: entry.createdAt,
        refNumber: entry.vehicleNo || entry.vehicle?.vehicleNo || entry.vehicle?.vehicleNumber || "-",
        vehicleNo: entry.vehicleNo || entry.vehicle?.vehicleNo || entry.vehicle?.vehicleNumber || "-",
        inQty: 0,
        outQty: toNumber(entry.usedQty),
        rate: 0,
        amount: 0,
        note: String(entry.notes || "").trim(),
      })),
  ].sort((firstRow, secondRow) => {
    const firstTime = new Date(firstRow.entryCreatedAt || firstRow.date).getTime() || 0;
    const secondTime = new Date(secondRow.entryCreatedAt || secondRow.date).getTime() || 0;
    if (firstTime !== secondTime) return firstTime - secondTime;
    return String(firstRow.refId || "").localeCompare(String(secondRow.refId || ""));
  });

  const runningQtyByProduct = new Map();
  const ledger = ledgerRows.map((row) => {
    const key = String(row.productId || row.productName || "");
    const nextRunningQty = toNumber(runningQtyByProduct.get(key)) + toNumber(row.inQty) - toNumber(row.outQty);
    runningQtyByProduct.set(key, nextRunningQty);

    return {
      ...row,
      runningQty: nextRunningQty,
    };
  });

  const currentStock = stocks.map((stock) => ({
    productId: stock._id,
    productName: stock.name || "-",
    unit: stock.unit || "",
    currentStock: toNumber(stock.currentStock),
  }));

  return {
    ledger,
    currentStock,
  };
};
const getOutstanding = async (_req, res) => {
  try {
    const { parties, ledgerRows } = await getPartyLedgerData({
      userId: _req.userId,
      partyId: null,
      fromDate: null,
      toDate: null,
    });

    return res.json(buildOutstandingResponse(parties, ledgerRows));
  } catch (error) {
    return res.status(500).json({
      message: "Failed to load outstanding summary",
      error: error.message,
    });
  }
};

const getPartyLedger = async (req, res) => {
  try {
    const partyId = toObjectId(req.query.partyId);
    const fromDate = toDateBoundary(req.query.fromDate);
    const toDate = toDateBoundary(req.query.toDate, true);

    const { ledgerRows } = await getPartyLedgerData({ userId: req.userId, partyId, fromDate, toDate });
    return res.json(ledgerRows);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to load party ledger",
      error: error.message,
    });
  }
};

const getStockLedger = async (req, res) => {
  try {
    const productId = toObjectId(req.query.productId);
    const fromDate = toDateBoundary(req.query.fromDate);
    const toDate = toDateBoundary(req.query.toDate, true);

    const stockLedger = await getStockLedgerData({ userId: req.userId, productId, fromDate, toDate });
    return res.json(stockLedger);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to load stock ledger",
      error: error.message,
    });
  }
};

const getPartyLedgerEntryDetail = async (req, res) => {
  try {
    const type = String(req.query.type || "").trim().toLowerCase();
    const refId = req.query.refId;

    if (!refId || !mongoose.Types.ObjectId.isValid(refId)) {
      return res.status(400).json({ message: "Valid refId is required" });
    }

    if (type === "sale") {
      const sale = await Sales.findOne(scopedIdFilter(req, refId)).populate("partyId", "name");
      if (!sale) return res.status(404).json({ message: "Sale not found" });
      const quantity = sale.pricingMode === "per_cubic_meter"
        ? toNumber(sale.cubicMeterQty)
        : toNumber(sale.netWeight || sale.materialWeight);

      return res.json({
        type: "sale",
        title: "Sale Voucher",
        refNumber: sale.invoiceNumber || "-",
        partyName: sale.partyId?.name || "-",
        amount: toNumber(sale.totalAmount),
        quantity,
        method: sale.vehicleNo || "-",
        date: sale.saleDate || sale.createdAt,
        accountName: sale.partyId?.name || "-",
        linkedReference: sale.vehicleNo || "",
        notes: "",
        fields: [
          { label: "Invoice Date", value: sale.saleDate || sale.createdAt },
          { label: "Sale Type", value: getSaleTypeLabel(sale.type) },
          { label: "Paid Amount", value: formatAmount(getSaleAmounts(sale).paidAmount) },
          { label: "Pending Amount", value: formatAmount(getSaleAmounts(sale).pendingAmount) },
          { label: "Vehicle No", value: sale.vehicleNo || "-" },
          ...(sale.pricingMode === "per_cubic_meter"
            ? [
                { label: "Cubic Meter Qty", value: toNumber(sale.cubicMeterQty) || "-" },
                { label: "Rate Per M3", value: toNumber(sale.rate) || "-" },
              ]
            : [
                { label: "Gross Weight", value: toNumber(sale.grossWeight, toNumber(sale.netWeight)) || "-" },
                { label: "Tare Weight", value: toNumber(sale.tareWeight, toNumber(sale.vehicleWeight)) || "-" },
                { label: "Net Weight", value: toNumber(sale.netWeight, toNumber(sale.materialWeight)) || "-" },
                { label: "Rate Per Ton", value: toNumber(sale.rate) || "-" },
              ]),
        ],
        items: [],
      });
    }

    if (type === "purchase") {
      const purchase = await Purchase.findOne(scopedIdFilter(req, refId))
        .populate("party", "name")
        .populate("items.product", "name unit");

      if (!purchase) return res.status(404).json({ message: "Purchase not found" });

      return res.json({
        type: "purchase",
        title: "Purchase Voucher",
        refNumber: formatPurchaseNumber(purchase.purchaseNumber),
        partyName: purchase.party?.name || "-",
        amount: toNumber(purchase.totalAmount),
        quantity: Array.isArray(purchase.items)
          ? purchase.items.reduce((sum, row) => sum + toNumber(row.quantity), 0)
          : 0,
        method: purchase.supplierInvoice || "-",
        date: purchase.purchaseDate || purchase.createdAt,
        accountName: purchase.party?.name || "-",
        linkedReference: purchase.supplierInvoice || "",
        notes: String(purchase.notes || "").trim(),
        fields: [
          { label: "Purchase Date", value: purchase.purchaseDate || purchase.createdAt },
          { label: "Supplier Invoice", value: purchase.supplierInvoice || "-" },
          { label: "Paid Amount", value: formatAmount(purchase.paidAmount) },
          { label: "Pending Amount", value: formatAmount(toNumber(purchase.totalAmount) - toNumber(purchase.paidAmount)) },
          { label: "Invoice Link", value: purchase.invoiceLink || "-" },
        ],
        items: Array.isArray(purchase.items)
          ? purchase.items.map((item, index) => ({
              id: `${purchase._id}-${index}`,
              productName: item.productName || item.product?.name || "Item",
              quantity: toNumber(item.quantity),
              unitPrice: toNumber(item.unitPrice),
              total: toNumber(item.total),
              unit: item.unit || item.product?.unit || "",
            }))
          : [],
      });
    }

    if (type === "receipt") {
      const receipt = await Receipt.findOne(scopedIdFilter(req, refId)).populate("party", "name");
      if (!receipt) return res.status(404).json({ message: "Receipt not found" });

      const linkedSale = receipt.refType === "sale" && receipt.refId
        ? await Sales.findOne(scopedIdFilter(req, receipt.refId)).select("invoiceNumber")
        : null;

      return res.json({
        type: "receipt",
        title: "Receipt Voucher",
        refNumber: formatReceiptNumber(receipt.receiptNumber),
        partyName: receipt.party?.name || "-",
        amount: toNumber(receipt.amount),
        quantity: 0,
        method: receipt.method || "-",
        date: receipt.receiptDate || receipt.createdAt,
        accountName: receipt.party?.name || "-",
        linkedReference: linkedSale?.invoiceNumber || "",
        notes: String(receipt.notes || "").trim(),
        fields: [
          { label: "Receipt Date", value: receipt.receiptDate || receipt.createdAt },
          { label: "Method", value: receipt.method || "-" },
          { label: "Reference Type", value: receipt.refType || "-" },
        ],
        items: [],
      });
    }

    if (type === "payment") {
      const payment = await Payment.findOne(scopedIdFilter(req, refId)).populate("party", "name");
      if (!payment) return res.status(404).json({ message: "Payment not found" });

      const linkedPurchase = payment.refType === "purchase" && payment.refId
        ? await Purchase.findOne(scopedIdFilter(req, payment.refId)).select("purchaseNumber")
        : null;

      return res.json({
        type: "payment",
        title: "Payment Voucher",
        refNumber: formatPaymentNumber(payment.paymentNumber),
        partyName: payment.party?.name || "-",
        amount: toNumber(payment.amount),
        quantity: 0,
        method: payment.method || "-",
        date: payment.paymentDate || payment.createdAt,
        accountName: payment.party?.name || "-",
        linkedReference: linkedPurchase ? formatPurchaseNumber(linkedPurchase.purchaseNumber) : "",
        notes: String(payment.notes || "").trim(),
        fields: [
          { label: "Payment Date", value: payment.paymentDate || payment.createdAt },
          { label: "Method", value: payment.method || "-" },
          { label: "Reference Type", value: payment.refType || "-" },
        ],
        items: [],
      });
    }

    if (type === "boulder") {
      const boulder = await Boulder.findOne(scopedIdFilter(req, refId));
      if (!boulder) return res.status(404).json({ message: "Boulder not found" });

      return res.json({
        type: "boulder",
        title: "Boulder Voucher",
        refNumber: boulder.boulderNumber || boulder.vehicleNo || "-",
        partyName: boulder.partyName || "-",
        amount: toNumber(boulder.amount),
        quantity: toNumber(boulder.netWeight),
        method: boulder.vehicleNo || "-",
        date: boulder.boulderDate || boulder.createdAt,
        accountName: boulder.partyName || "-",
        linkedReference: boulder.vehicleNo || "",
        notes: "",
        fields: [
          { label: "Boulder Date", value: boulder.boulderDate || boulder.createdAt },
          { label: "Vehicle No", value: boulder.vehicleNo || "-" },
          { label: "Gross Weight", value: toNumber(boulder.grossWeight) || "-" },
          { label: "Tare Weight", value: toNumber(boulder.tareWeight) || "-" },
          { label: "Net Weight", value: toNumber(boulder.netWeight) || "-" },
          { label: "Rate Per Ton", value: toNumber(boulder.boulderRatePerTon) || "-" },
        ],
        items: [],
      });
    }

    return res.status(400).json({ message: "Voucher detail is not supported for this type yet" });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to load voucher detail",
      error: error.message,
    });
  }
};

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
      Sales.find(scopedFilter(req)).populate("partyId", "name").sort({ saleDate: -1, createdAt: -1 }),
      Purchase.find(scopedFilter(req)).populate("party", "name").sort({ purchaseDate: -1, createdAt: -1 }),
      Payment.find(scopedFilter(req)).populate("party", "name").sort({ paymentDate: -1, createdAt: -1 }),
      Receipt.find(scopedFilter(req)).populate("party", "name").sort({ receiptDate: -1, createdAt: -1 }),
      Expense.find(scopedFilter(req)).populate("party", "name").populate("expenseGroup", "name").sort({ expenseDate: -1, createdAt: -1 }),
      Boulder.find(scopedFilter(req)).sort({ boulderDate: -1, createdAt: -1 }),
      MaterialUsed.find(scopedFilter(req)).populate("vehicle", "vehicleNo vehicleNumber").populate("materialType", "name").sort({ usedDate: -1, createdAt: -1 }),
    ]);

    const entries = [
      ...sales
        .filter((item) => withinRange(item.saleDate || item.createdAt, fromDate, toDate))
        .map((item) => {
          const saleAmounts = getSaleAmounts(item);
          const saleCashIn = saleAmounts.paidAmount;

          return {
          type: "sale",
          displayType: getEntryDisplayType("sale", item.type),
          refId: item._id,
            date: item.saleDate || item.createdAt,
            entryCreatedAt: item.createdAt,
            voucherNumber: item.invoiceNumber || "-",
            partyName: item.partyId?.name || "-",
            vehicleNo: item.vehicleNo || "",
            materialSummary: buildSaleMaterialSummary(item),
            method: [
              getSaleTypeLabel(item.type),
              item.vehicleNo ? `Vehicle ${item.vehicleNo}` : "",
              item.pricingMode === "per_cubic_meter"
                ? `Qty ${toNumber(item.cubicMeterQty)} m³`
                : `Qty ${toNumber(item.netWeight || item.materialWeight)} kg (${toNumber(item.netWeight || item.materialWeight) / 1000} ton)`,
            ].filter(Boolean).join(" | ") || "-",
            totalAmount: saleAmounts.totalAmount,
            paidAmount: saleAmounts.paidAmount,
            amount: saleAmounts.totalAmount,
            inAmount: saleCashIn,
            outAmount: 0,
          };
        }),
      ...purchases
        .filter((item) => withinRange(item.purchaseDate || item.createdAt, fromDate, toDate))
        .map((item) => ({
          type: "purchase",
          displayType: getPurchaseTypeLabel(item.totalAmount, item.paidAmount),
          refId: item._id,
          date: item.purchaseDate || item.createdAt,
          entryCreatedAt: item.createdAt,
          voucherNumber: formatPurchaseNumber(item.purchaseNumber),
          partyName: item.party?.name || "-",
          method: item.supplierInvoice || "-",
          totalAmount: Number(item.totalAmount || 0),
          paidAmount: Number(item.paidAmount || 0),
          amount: Number(item.totalAmount || 0),
          inAmount: 0,
          outAmount: Number(item.paidAmount || 0),
        })),
      ...payments
        .filter((item) => withinRange(item.paymentDate || item.createdAt, fromDate, toDate))
        .map((item) => ({
          type: "payment",
          displayType: getEntryDisplayType("payment"),
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
          displayType: getEntryDisplayType("receipt"),
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
          displayType: getEntryDisplayType("expense"),
          refId: item._id,
          date: item.expenseDate || item.createdAt,
          entryCreatedAt: item.createdAt,
          voucherNumber: item.expenseNumber || "-",
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
          displayType: getEntryDisplayType("boulder"),
          refId: item._id,
          date: item.boulderDate || item.createdAt,
          entryCreatedAt: item.createdAt,
          voucherNumber: item.boulderNumber || item.vehicleNo || "-",
          partyName: item.partyName || item.vehicleNo || "-",
          vehicleNo: item.vehicleNo || "",
          method: `Vehicle ${item.vehicleNo || "-"} | Gross ${Number(item.grossWeight || 0)} | Tare ${Number(item.tareWeight || 0)} | Net ${Number(item.netWeight || 0)} | Rate ${Number(item.boulderRatePerTon || 0)}/Ton`,
          amount: Number(item.amount || 0),
          inAmount: 0,
          outAmount: 0,
        })),
      ...materialUsedEntries
        .filter((item) => withinRange(item.usedDate || item.createdAt, fromDate, toDate))
        .map((item) => ({
          type: "materialUsed",
          displayType: getEntryDisplayType("materialUsed"),
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

const getDashboardAnalytics = async (req, res) => {
  try {
    const now = new Date();
    
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const startOf3DaysAgo = new Date(startOfToday);
    startOf3DaysAgo.setDate(startOf3DaysAgo.getDate() - 2); // 3 days inclusive

    const startOf7DaysAgo = new Date(startOfToday);
    startOf7DaysAgo.setDate(startOf7DaysAgo.getDate() - 6); // 7 days inclusive 
    
    const startOf30DaysAgo = new Date(startOfToday);
    startOf30DaysAgo.setDate(startOf30DaysAgo.getDate() - 29); // 30 days inclusive

    const startOf90DaysAgo = new Date(startOfToday);
    startOf90DaysAgo.setDate(startOf90DaysAgo.getDate() - 89); // 90 days inclusive
    
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    
    const [boulders, expenses, sales, parties, purchases, receipts, payments] = await Promise.all([
      Boulder.find(scopedFilter(req)).select("netWeight boulderDate createdAt partyId amount").lean(),
      Expense.find(scopedFilter(req)).select("amount expenseDate createdAt expenseGroup").populate("expenseGroup", "name").lean(),
      Party.find(scopedFilter(req)).select("name openingBalance openingBalanceType").lean(),
      Purchase.find(scopedFilter(req)).select("totalAmount purchaseDate createdAt party type").lean(),
      Receipt.find(scopedFilter(req)).select("amount receiptDate createdAt party").lean(),
      Payment.find(scopedFilter(req)).select("amount paymentDate createdAt party").lean()
    ]);
    
    const getDaysMap = (daysCount) => {
      const map = new Map();
      const order = [];
      for (let i = daysCount - 1; i >= 0; i--) {
        const d = new Date(startOfToday);
        d.setDate(d.getDate() - i);
        map.set(d.getTime(), 0);
        order.push(d.getTime());
      }
      return { map, order };
    };
    
    const d7 = getDaysMap(7);
    const d30 = getDaysMap(30);
    const d90 = getDaysMap(90);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const computeTrendAndStats = (items, dateField, valueField, fallbackValueField) => {
      const stats = { today: 0, last3Days: 0, last7Days: 0, last30Days: 0, last90Days: 0, thisYear: 0, lifetime: 0 };
      
      const map7d = new Map(d7.map);
      const map30d = new Map(d30.map);
      const map90d = new Map(d90.map);
      const mapYear = new Map(months.map(m => [m, 0]));
      const mapLifetime = new Map();

      for (const item of items) {
        const itemDate = new Date(item[dateField] || item.createdAt);
        const value = toNumber(item[valueField], fallbackValueField ? toNumber(item[fallbackValueField]) : 0);
        
        stats.lifetime += value;
        if (itemDate >= startOfToday) stats.today += value;
        if (itemDate >= startOf3DaysAgo) stats.last3Days += value;
        if (itemDate >= startOf7DaysAgo) stats.last7Days += value;
        if (itemDate >= startOf30DaysAgo) stats.last30Days += value;
        if (itemDate >= startOf90DaysAgo) stats.last90Days += value;
        if (itemDate >= startOfYear) stats.thisYear += value;

        const dayTimestamp = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate()).getTime();
        
        if (map7d.has(dayTimestamp)) map7d.set(dayTimestamp, map7d.get(dayTimestamp) + value);
        if (map30d.has(dayTimestamp)) map30d.set(dayTimestamp, map30d.get(dayTimestamp) + value);
        if (map90d.has(dayTimestamp)) map90d.set(dayTimestamp, map90d.get(dayTimestamp) + value);

        if (itemDate.getFullYear() === now.getFullYear()) {
           const mn = months[itemDate.getMonth()];
           mapYear.set(mn, mapYear.get(mn) + value);
        }

        const monthKey = `${itemDate.getFullYear()} ${months[itemDate.getMonth()]}`;
        mapLifetime.set(monthKey, (mapLifetime.get(monthKey) || 0) + value);
      }
      
      const toTrend = (map, orderKeys) => orderKeys.map(ts => ({
          date: new Date(ts).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
          amount: map.get(ts)
      }));
      
      const trendLifetime = Array.from(mapLifetime.entries())
         .map(([date, amount]) => ({ date, amount }))
         .sort((a,b) => {
             const [yA, mA] = a.date.split(" ");
             const [yB, mB] = b.date.split(" ");
             if (yA !== yB) return Number(yA) - Number(yB);
             return months.indexOf(mA) - months.indexOf(mB);
         });

      return {
         stats,
         trends: {
           '7d': toTrend(map7d, d7.order),
           '30d': toTrend(map30d, d30.order),
           '90d': toTrend(map90d, d90.order),
           'thisYear': Array.from(mapYear.entries()).map(([date, amount]) => ({ date, amount })),
           'lifetime': trendLifetime
         }
      };
    };
    
    const boulderData = computeTrendAndStats(boulders, "boulderDate", "netWeight");
    const expenseData = computeTrendAndStats(expenses, "expenseDate", "amount");
    const salesTotalStats = computeTrendAndStats(sales, "saleDate", "netWeight", "materialWeight").stats;
    const salesRevenueData = computeTrendAndStats(sales, "saleDate", "totalAmount");

    const generateBreakdowns = (items, dateField, categoryField, valField1, valField2) => {
      const res = { '3d': new Map(), '7d': new Map(), '30d': new Map(), '90d': new Map(), 'thisYear': new Map(), 'lifetime': new Map() };
      
      for (const item of items) {
         let category = item[categoryField];
         if (category && typeof category === "object") category = category._id ? category.name : String(category);
         category = String(category || "Uncategorized").trim();
         if (category.toLowerCase() === "-") continue;
         
         const date = new Date(item[dateField] || item.createdAt);
         const val1 = toNumber(item[valField1]);
         const val2 = valField2 ? toNumber(item[valField2]) : 0;
         
         const add = (tf) => {
            const map = res[tf];
            const existing = map.get(category) || { size: category, name: category, quantity: 0, amount: 0 };
            existing.quantity += val1;     // usually netWeight for sales, but for expenses we use amount here (which we override later)
            if (valField2) {
               existing.amount += val2;    // if sale, val2 is totalAmount
            } else {
               existing.amount += val1;    // if expense, amount is val1
            }
            map.set(category, existing);
         };

         add('lifetime');
         if (date >= startOf3DaysAgo) add('3d');
         if (date >= startOf7DaysAgo) add('7d');
         if (date >= startOf30DaysAgo) add('30d');
         if (date >= startOf90DaysAgo) add('90d');
         if (date >= startOfYear) add('thisYear');
      }

      const format = (tfMap, sortField) => Array.from(tfMap.values())
          .filter(s => s.quantity > 0 || Math.abs(s.amount) > 0)
          .sort((a,b) => b[sortField] - a[sortField]);

      return {
         '3d': format(res['3d'], valField2 ? 'quantity' : 'amount'),
         '7d': format(res['7d'], valField2 ? 'quantity' : 'amount'),
         '30d': format(res['30d'], valField2 ? 'quantity' : 'amount'),
         '90d': format(res['90d'], valField2 ? 'quantity' : 'amount'),
         'thisYear': format(res['thisYear'], valField2 ? 'quantity' : 'amount'),
         'lifetime': format(res['lifetime'], valField2 ? 'quantity' : 'amount')
      };
    };

    const expensesBreakdowns = generateBreakdowns(expenses, "expenseDate", "expenseGroup", "amount", null);
    
    // For sales, val1=netWeight (or materialWeight fallback internally, let's just use netWeight. Wait, computeTrend uses fallback. Let's build a custom map for sales to be perfect)
    
    const salesRes = { '3d': new Map(), '7d': new Map(), '30d': new Map(), '90d': new Map(), 'thisYear': new Map(), 'lifetime': new Map() };
    for (const sale of sales) {
      const material = String(sale.stoneSize || "Uncategorized").trim();
      if (!material || material === "-") continue;
      
      const quantity = toNumber(sale.netWeight, toNumber(sale.materialWeight));
      const amount = toNumber(sale.totalAmount);
      const date = new Date(sale.saleDate || sale.createdAt);

      const addSale = (tf) => {
         const map = salesRes[tf];
         const existing = map.get(material) || { size: material, quantity: 0, amount: 0 };
         existing.quantity += quantity;
         existing.amount += amount;
         map.set(material, existing);
      };

      addSale('lifetime');
      if (date >= startOf3DaysAgo) addSale('3d');
      if (date >= startOf7DaysAgo) addSale('7d');
      if (date >= startOf30DaysAgo) addSale('30d');
      if (date >= startOf90DaysAgo) addSale('90d');
      if (date >= startOfYear) addSale('thisYear');
    }
    
    const formatSales = (tfMap) => Array.from(tfMap.values())
      .filter(s => s.quantity > 0 || s.amount > 0)
      .sort((a, b) => b.quantity - a.quantity);
      
    const salesBreakdowns = {
       '3d': formatSales(salesRes['3d']),
       '7d': formatSales(salesRes['7d']),
       '30d': formatSales(salesRes['30d']),
       '90d': formatSales(salesRes['90d']),
       'thisYear': formatSales(salesRes['thisYear']),
       'lifetime': formatSales(salesRes['lifetime']),
    };

    // Outstanding Calculation
    const partyBalanceMap = new Map();
    parties.forEach(p => {
       partyBalanceMap.set(p._id.toString(), {
          id: p._id,
          name: p.name || "-",
          balance: getPartyOpeningImpact(p)
       });
    });

    const addImpact = (item, partyRefField, impact) => {
       const p = item[partyRefField]?._id || item[partyRefField];
       if (!p) return;
       const pIdStr = p.toString();
       if (partyBalanceMap.has(pIdStr)) {
          partyBalanceMap.get(pIdStr).balance += impact;
       }
    };

    for (const sale of sales) {
       const saleAmounts = getSaleAmounts(sale);
       addImpact(sale, "partyId", saleAmounts.totalAmount - saleAmounts.paidAmount);
    }
    for (const purchase of purchases) {
       addImpact(purchase, "party", -(toNumber(purchase.totalAmount) - toNumber(purchase.paidAmount)));
    }
    for (const receipt of receipts) {
       addImpact(receipt, "party", -toNumber(receipt.amount));
    }
    for (const payment of payments) {
       addImpact(payment, "party", toNumber(payment.amount));
    }
    for (const boulder of boulders) {
       addImpact(boulder, "partyId", -toNumber(boulder.amount));
    }

    let totalReceivables = 0;
    let totalPayables = 0;
    const allBalances = Array.from(partyBalanceMap.values());
    allBalances.forEach(b => {
       if (b.balance > 0) totalReceivables += b.balance;
       if (b.balance < 0) totalPayables += Math.abs(b.balance);
    });
    
    const topDebtors = allBalances.filter(b => b.balance > 0).sort((a,b) => b.balance - a.balance).slice(0, 5);
    const topCreditors = allBalances.filter(b => b.balance < 0).sort((a,b) => a.balance - b.balance).slice(0, 5).map(b => ({...b, balance: Math.abs(b.balance)}));

    return res.json({
      boulders: {
        ...boulderData.stats,
        trends: boulderData.trends
      },
      expenses: {
        ...expenseData.stats,
        trends: expenseData.trends,
        breakdowns: expensesBreakdowns,
        breakdown: expensesBreakdowns['lifetime'] // fallback for backward compatibility
      },
      sales: {
        totals: salesTotalStats,
        revenue: {
           ...salesRevenueData.stats,
           trends: salesRevenueData.trends
        },
        breakdowns: salesBreakdowns,
        breakdown: salesBreakdowns['lifetime']
      },
      outstanding: {
         totalReceivables,
         totalPayables,
         topDebtors,
         topCreditors
      }
    });
  } catch (error) {
    console.error("Dashboard Analytics Error:", error);
    return res.status(500).json({
      message: "Failed to load dashboard analytics",
      error: error.message,
    });
  }
};

const getDieselConsumptionReport = async (req, res) => {
  const { userId } = req;
  const { fromDate: fromDateStr, toDate: toDateStr, vehicleId } = req.query;

  const fromDate = toDateBoundary(fromDateStr, false);
  const toDate = toDateBoundary(toDateStr, true);

  try {
    // 1. Find the Diesel product
    const dieselStock = await Stock.findOne({
      userId,
      name: { $regex: /^diesel$/i },
    });

    if (!dieselStock) {
      return res.json({
        summary: [],
        ledger: [],
        totalDieselUsed: 0,
        message: "Diesel product not found in stock masters",
      });
    }

    // 2. Fetch all material used entries for Diesel
    const materialUsedFilter = {
      userId,
      materialType: dieselStock._id,
    };

    if (vehicleId) {
      materialUsedFilter.vehicle = vehicleId;
    }

    const materialUsedEntries = await MaterialUsed.find(materialUsedFilter)
      .populate("vehicle", "vehicleNo vehicleNumber")
      .sort({ usedDate: -1, createdAt: -1 });

    // 3. Process data
    const vehicleSummaryMap = new Map();
    let totalDieselUsed = 0;

    const filteredEntries = materialUsedEntries.filter((entry) => (
      withinRange(entry.usedDate || entry.createdAt, fromDate, toDate)
    ));

    const ledger = filteredEntries.map((entry) => {
      const qty = toNumber(entry.usedQty);
      totalDieselUsed += qty;

      const vNo = entry.vehicleNo || entry.vehicle?.vehicleNo || entry.vehicle?.vehicleNumber || "Unknown";
      const vId = entry.vehicle?._id || "unknown";

      if (!vehicleSummaryMap.has(vId)) {
        vehicleSummaryMap.set(vId, {
          vehicleId: vId,
          vehicleNo: vNo,
          totalUsed: 0,
          entryCount: 0,
        });
      }

      const summary = vehicleSummaryMap.get(vId);
      summary.totalUsed += qty;
      summary.entryCount += 1;

      return {
        _id: entry._id,
        date: entry.usedDate || entry.createdAt,
        vehicleNo: vNo,
        vehicleId: vId,
        qty,
        note: entry.notes || "-",
      };
    });

    const summary = Array.from(vehicleSummaryMap.values()).sort((a, b) => b.totalUsed - a.totalUsed);

    return res.json({
      summary,
      ledger,
      totalDieselUsed,
      productName: dieselStock.name,
      unit: dieselStock.unit || "Ltrs",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch diesel consumption report",
      error: error.message,
    });
  }
};

const getPaymentReport = async (req, res) => {
  const { userId } = req;
  const { fromDate: fromDateStr, toDate: toDateStr, partyId } = req.query;

  const fromDate = toDateBoundary(fromDateStr, false);
  const toDate = toDateBoundary(toDateStr, true);

  try {
    const filter = { userId };
    if (partyId && mongoose.Types.ObjectId.isValid(partyId)) {
      filter.party = partyId;
    }

    const payments = await Payment.find(filter)
      .populate("party", "name")
      .sort({ paymentDate: -1, createdAt: -1 });

    const filtered = payments.filter((p) => withinRange(p.paymentDate || p.createdAt, fromDate, toDate));

    const rows = filtered.map((p) => ({
      _id: p._id,
      date: p.paymentDate || p.createdAt,
      paymentNumber: formatPaymentNumber(p.paymentNumber),
      partyName: p.party?.name || "-",
      amount: toNumber(p.amount),
      method: p.method || "-",
      notes: p.notes || "-",
    }));

    return res.json(rows);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch payment report",
      error: error.message,
    });
  }
};

module.exports = {
  getDayBook,
  getOutstanding,
  getPartyLedger,
  getPartyLedgerEntryDetail,
  getStockLedger,
  getDashboardAnalytics,
  getDieselConsumptionReport,
  getPaymentReport,
};
