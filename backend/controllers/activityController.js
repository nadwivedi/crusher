const AccountTransfer = require("../models/AccountTransfer");
const Boulder = require("../models/Boulder");
const Employee = require("../models/Employee");
const DumpMovement = require("../models/DumpMovement");
const Expense = require("../models/Expense");
const MaterialUsed = require("../models/MaterialUsed");
const MeterReading = require("../models/MeterReading");
const Payment = require("../models/Payment");
const Purchase = require("../models/Purchase");
const PurchaseReturn = require("../models/PurchaseReturn");
const Receipt = require("../models/Receipt");
const SaleReturn = require("../models/SaleReturn");
const Sales = require("../models/Sales");
const StockAdjustment = require("../models/StockAdjustment");
const Transport = require("../models/Transport");
const { usedForOf } = require("../utils/diesel");

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

// "2026-10-01" → start or end of that day; today when missing
const dayBoundary = (value, endOfDay) => {
  const parsed = value ? new Date(value) : new Date();
  const date = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  if (endOfDay) date.setHours(23, 59, 59, 999);
  else date.setHours(0, 0, 0, 0);
  return date;
};

const join = (parts) => parts.filter(Boolean).join(" · ");
const money = (value) => `₹${toNumber(value).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const qty = (value) => toNumber(value).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const tons = (kg) => `${qty(toNumber(kg) / 1000)} ton`;
const dueText = (total, paid) => {
  const due = toNumber(total) - toNumber(paid);
  if (due <= 0) return "Paid";
  return toNumber(paid) > 0 ? `${money(due)} due` : "Credit";
};
const number = (prefix, value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? `${prefix}-${String(parsed).padStart(2, "0")}` : "";
};
const itemsText = (items) => (items || [])
  .map((item) => `${qty(item.quantity)}${item.unit ? ` ${item.unit}` : ""} ${item.productName || ""}`.trim())
  .join(", ");

/**
 * Activity Center: every entry made in the period, newest first.
 * Each item: { id, type, date, createdAt, title, detail, amount?, qty? } — the page groups them by day.
 * Transport rows made by a sale, a boulder entry or a monthly hire are left out: their own entry already shows them.
 */
const getActivity = async (req, res) => {
  const userId = req.userId;
  const from = dayBoundary(req.query.from, false);
  const to = dayBoundary(req.query.to || req.query.from, true);
  const within = (field) => ({ userId, [field]: { $gte: from, $lte: to } });

  try {
    let [
      sales, boulders, purchases, receipts, payments, expenses, materialUsed, meterReadings,
      dumpMoves, saleReturns, purchaseReturns, adjustments, transfers, transports,
    ] = await Promise.all([
      Sales.find(within("saleDate")).populate("partyId", "name").lean(),
      Boulder.find(within("boulderDate")).populate("partyId", "name").lean(),
      Purchase.find(within("purchaseDate")).populate("party", "name").lean(),
      Receipt.find(within("receiptDate")).populate("party", "name").populate("account", "name").lean(),
      Payment.find(within("paymentDate")).populate("party", "name").populate("account", "name").lean(),
      Expense.find(within("expenseDate")).populate("party", "name").populate("expenseGroup", "name").lean(),
      MaterialUsed.find(within("usedDate")).lean(),
      MeterReading.find(within("readingDate")).lean(),
      DumpMovement.find(within("movementDate")).lean(),
      SaleReturn.find(within("voucherDate")).populate("party", "name").lean(),
      PurchaseReturn.find(within("voucherDate")).populate("party", "name").lean(),
      StockAdjustment.find(within("voucherDate")).lean(),
      AccountTransfer.find(within("transferDate")).populate("fromAccount", "name").populate("toAccount", "name").lean(),
      Transport.find({ ...within("entryDate"), source: "manual" }).populate("partyId", "name").lean(),
    ]);

    // Who did it: "owner", "admin", or "staff:<id>". Entries saved before this was recorded have no person.
    const personKey = (doc) => {
      const by = doc.createdBy;
      if (!by?.kind) return "";
      return by.kind === "staff" ? `staff:${by.id}` : by.kind;
    };
    const byFilter = String(req.query.by || "").trim();
    const keep = (list) => (byFilter ? list.filter((doc) => personKey(doc) === byFilter) : list);
    [
      sales, boulders, purchases, receipts, payments, expenses, materialUsed, meterReadings,
      dumpMoves, saleReturns, purchaseReturns, adjustments, transfers, transports,
    ] = [
      sales, boulders, purchases, receipts, payments, expenses, materialUsed, meterReadings,
      dumpMoves, saleReturns, purchaseReturns, adjustments, transfers, transports,
    ].map(keep);

    const person = (actor) => (actor?.kind ? { kind: actor.kind, id: actor.id, name: actor.name } : null);
    const base = (type, doc, date) => ({
      id: doc._id,
      type,
      date: date || doc.createdAt,
      createdAt: doc.createdAt,
      by: person(doc.createdBy),
      editedBy: person(doc.updatedBy),
      editedAt: doc.updatedByAt || null,
    });

    const items = [
      ...sales.map((sale) => ({
        ...base("sale", sale, sale.saleDate),
        title: sale.partyId?.name || "Sale",
        detail: join([
          sale.invoiceNumber,
          String(sale.stoneSize || "").toUpperCase(),
          sale.pricingMode === "per_cubic_meter" ? `${qty(sale.cubicMeterQty)} cft` : tons(sale.netWeight),
          sale.vehicleNo,
          sale.dispatchLocation,
          dueText(sale.totalAmount, sale.paidAmount),
        ]),
        amount: toNumber(sale.totalAmount),
        weightKg: sale.pricingMode === "per_cubic_meter" ? 0 : toNumber(sale.netWeight),
      })),
      ...boulders.map((boulder) => ({
        ...base("boulder", boulder, boulder.boulderDate),
        title: boulder.partyId?.name || boulder.partyName || "Boulder",
        detail: join([
          boulder.vehicleNo,
          boulder.entryMode === "bulk" ? `${qty(boulder.tripCount)} trips` : "",
          tons(boulder.netWeight),
        ]),
        amount: toNumber(boulder.amount),
        weightKg: toNumber(boulder.netWeight),
      })),
      ...purchases.map((purchase) => ({
        ...base("purchase", purchase, purchase.purchaseDate),
        title: purchase.party?.name || "Purchase",
        detail: join([
          number("PUR", purchase.purchaseNumber),
          purchase.fillVehicleNo ? `Pump fill → ${purchase.fillVehicleNo}` : "",
          itemsText(purchase.items),
          purchase.supplierInvoice ? `Bill ${purchase.supplierInvoice}` : "",
          dueText(purchase.totalAmount, purchase.paidAmount),
        ]),
        amount: toNumber(purchase.totalAmount),
      })),
      ...receipts.map((receipt) => ({
        ...base("receipt", receipt, receipt.receiptDate),
        title: receipt.party?.name || "Money received",
        detail: join([
          number("REC", receipt.receiptNumber),
          receipt.account?.name || receipt.method,
          receipt.receiptSource && receipt.receiptSource !== "manual" ? "Paid with sale" : "",
          receipt.notes,
        ]),
        amount: toNumber(receipt.amount),
      })),
      ...payments.map((payment) => ({
        ...base("payment", payment, payment.paymentDate),
        title: payment.party?.name || "Money paid",
        detail: join([
          payment.paymentNumber,
          payment.account?.name || payment.method,
          payment.paymentSource && payment.paymentSource !== "manual" ? "Paid with purchase" : "",
          payment.notes,
        ]),
        amount: toNumber(payment.amount),
      })),
      ...expenses.map((expense) => ({
        ...base("expense", expense, expense.expenseDate),
        title: expense.expenseGroup?.name || "Expense",
        detail: join([expense.party?.name, expense.notes, expense.method]),
        amount: toNumber(expense.amount),
      })),
      // A pump fill's issue is already shown by its purchase
      ...materialUsed.filter((entry) => !entry.purchase).map((entry) => {
        const usedFor = usedForOf(entry);
        return {
          ...base("materialUsed", entry, entry.usedDate),
          title: entry.materialTypeName || "Material used",
          detail: join([usedFor === "dg" ? "DG Set" : usedFor === "vehicle" ? entry.vehicleNo : "Plant / Other", entry.notes]),
          qty: toNumber(entry.usedQty),
          unit: entry.unit || "",
        };
      }),
      ...meterReadings.map((reading) => {
        const closed = reading.closingReading !== null && reading.closingReading !== undefined;
        return {
          ...base("meterReading", reading, reading.readingDate),
          title: reading.machine === "dg" ? "DG Set" : reading.vehicleNo || "Vehicle",
          detail: join([
            closed ? `${qty(reading.openingReading)} → ${qty(reading.closingReading)}` : `Opening ${qty(reading.openingReading)} · running`,
            reading.notes,
          ]),
          qty: closed ? toNumber(reading.closingReading) - toNumber(reading.openingReading) : null,
          unit: reading.meterUnit,
        };
      }),
      ...dumpMoves.map((move) => ({
        ...base(move.type === "to_hopper" ? "dumpOut" : "dumpIn", move, move.movementDate),
        title: move.type === "to_hopper" ? "Dump to hopper" : "Boulder to dump",
        detail: join([move.vehicleNo, move.entryMode === "bulk" ? `${qty(move.trips)} trips` : "", move.notes]),
        qty: toNumber(move.weight) / 1000,
        unit: "ton",
      })),
      ...saleReturns.map((entry) => ({
        ...base("saleReturn", entry, entry.voucherDate),
        title: entry.party?.name || "Sale return",
        detail: join([entry.voucherNumber, itemsText(entry.items), entry.notes]),
        amount: toNumber(entry.totalAmount),
      })),
      ...purchaseReturns.map((entry) => ({
        ...base("purchaseReturn", entry, entry.voucherDate),
        title: entry.party?.name || "Purchase return",
        detail: join([entry.voucherNumber, itemsText(entry.items), entry.notes]),
        amount: toNumber(entry.totalAmount),
      })),
      ...adjustments.map((entry) => ({
        ...base("stockAdjustment", entry, entry.voucherDate),
        title: entry.stockItemName || "Stock adjustment",
        detail: join([entry.adjustmentType === "add" ? "Added" : "Reduced", entry.reason, entry.notes]),
        qty: (entry.adjustmentType === "add" ? 1 : -1) * toNumber(entry.quantity),
        unit: entry.unit || "",
      })),
      ...transfers.map((entry) => ({
        ...base("transfer", entry, entry.transferDate),
        title: `${entry.fromAccount?.name || "-"} → ${entry.toAccount?.name || "-"}`,
        detail: entry.notes || "",
        amount: toNumber(entry.amount),
      })),
      ...transports.map((entry) => ({
        ...base("transport", entry, entry.entryDate),
        title: entry.partyId?.name || entry.vehicleNo || "Transport",
        detail: join([entry.entryNumber, entry.vehicleNo, entry.location, entry.notes]),
        amount: toNumber(entry.amount),
        direction: entry.direction,
      })),
    ].sort((a, b) => (new Date(b.date) - new Date(a.date)) || (new Date(b.createdAt) - new Date(a.createdAt)));

    const sum = (list, pick) => list.reduce((total, item) => total + toNumber(pick(item)), 0);
    // Everyone who can make entries in this account, for the "by person" filter
    const staff = await Employee.find({ ownerId: userId }).select("name isActive").sort({ name: 1 }).lean();
    const people = [
      { key: "owner", name: "Owner", kind: "owner" },
      ...staff.map((emp) => ({ key: `staff:${emp._id}`, name: emp.name, kind: "staff", isActive: emp.isActive !== false })),
    ];
    return res.json({
      from,
      to,
      people,
      totals: {
        sales: sum(sales, (sale) => sale.totalAmount),
        salesKg: sum(sales, (sale) => (sale.pricingMode === "per_cubic_meter" ? 0 : sale.netWeight)),
        boulderKg: sum(boulders, (boulder) => boulder.netWeight),
        received: sum(receipts, (receipt) => receipt.amount),
        paid: sum(payments, (payment) => payment.amount),
        expenses: sum(expenses, (expense) => expense.amount),
        purchases: sum(purchases, (purchase) => purchase.totalAmount),
      },
      items,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load activity", error: error.message });
  }
};

module.exports = { getActivity };
