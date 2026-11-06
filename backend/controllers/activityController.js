const mongoose = require("mongoose");
const AccountTransfer = require("../models/AccountTransfer");
const Bank = require("../models/Bank");
const Boulder = require("../models/Boulder");
const Employee = require("../models/Employee");
const DumpMovement = require("../models/DumpMovement");
const Expense = require("../models/Expense");
const MaterialUsed = require("../models/MaterialUsed");
const MeterReading = require("../models/MeterReading");
const Party = require("../models/Party");
const Payment = require("../models/Payment");
const Purchase = require("../models/Purchase");
const PurchaseReturn = require("../models/PurchaseReturn");
const Receipt = require("../models/Receipt");
const SaleReturn = require("../models/SaleReturn");
const Sales = require("../models/Sales");
const StockAdjustment = require("../models/StockAdjustment");
const Transport = require("../models/Transport");
const { usedForOf } = require("../utils/diesel");
const { serializeSale } = require("./salesController");

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
          // Billed by volume but also weighed: the weight too
          sale.pricingMode === "per_cubic_meter" && toNumber(sale.netWeight) > 0 ? tons(sale.netWeight) : "",
          sale.vehicleNo,
          sale.dispatchLocation,
          dueText(sale.totalAmount, sale.paidAmount),
        ]),
        amount: toNumber(sale.totalAmount),
        weightKg: toNumber(sale.netWeight),
      })),
      ...boulders.map((boulder) => ({
        ...base("boulder", boulder, boulder.boulderDate),
        // Own boulder has no supplier: its vehicle names it instead
        title: (boulder.ownBoulder ? boulder.vehicleNo : "") || boulder.partyId?.name || boulder.partyName || boulder.vehicleNo || "Boulder",
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
          title: entry.materialTypeName || "Material issued",
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
        title: move.vehicleNo || (move.type === "to_hopper" ? "Dump to hopper" : "Boulder to dump"),
        detail: join([ move.entryMode === "bulk" ? `${qty(move.trips)} trips` : "", move.notes]),
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
        // Every sale with a weight, including those billed by volume and weighed too
        salesKg: sum(sales, (sale) => sale.netWeight),
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

// ---------- One entry in full, for the Activity Center's view and edit ----------

const OWNERSHIP_LABELS = { party: "Party vehicle", own: "My vehicle", hired: "Hired vehicle" };
const PAY_TYPE_LABELS = { cash: "Cash (paid in full)", partial: "Part paid", credit: "Credit (not paid)" };
const BASIS_LABELS = {
  per_km: "Per KM", per_ton: "Per Ton", per_trip: "Per Trip", per_day: "Per Day",
  per_week: "Per Week", per_month: "Per Month", fixed: "Fixed Amount",
};

// A detail row: kind "date" and "money" are formatted by the page (dates in the viewer's time zone)
const field = (label, value, kind) => ({ label, value, ...(kind ? { kind } : {}) });
const kg = (value) => (toNumber(value) ? `${qty(value)} kg` : "");
const itemLines = (items) => (items || [])
  .map((item) => {
    const name = item.productName || item.product?.name || item.expenseGroupName || item.expenseGroup?.name || "Item";
    const unit = item.unit || item.product?.unit || "";
    const rate = toNumber(item.unitPrice) ? ` @ ${money(item.unitPrice)}` : "";
    return `${qty(item.quantity)}${unit ? ` ${unit}` : ""} ${name}${rate} = ${money(item.total || toNumber(item.quantity) * toNumber(item.unitPrice))}`;
  })
  .join("\n");
// Rows with no value are left out
const clean = (fields) => fields.filter((row) => row.value !== undefined && row.value !== null && row.value !== "" && row.value !== 0);

const partyName = async (userId, id) => {
  if (!id) return "";
  const party = await Party.findOne({ _id: id, userId }).select("name").lean();
  return party?.name || "";
};
const accountName = async (userId, id) => {
  if (!id) return "";
  const account = await Bank.findOne({ _id: id, userId }).select("name").lean();
  return account?.name || "";
};

/**
 * GET /reports/activity/:type/:id → { type, title, fields, record, editable, lockedHint }
 * record is the entry as its own page lists it, so the page's edit form can open on it.
 */
const getActivityEntry = async (req, res) => {
  const { type, id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid entry id" });
  const userId = req.userId;
  const filter = { _id: id, userId };
  const notFound = () => res.status(404).json({ message: "This entry no longer exists" });

  try {
    let title = "";
    let fields = [];
    let record = null;
    let editable = true;
    let lockedHint = "";

    if (type === "sale") {
      const sale = await Sales.findOne(filter);
      if (!sale) return notFound();
      const [party, transporter, account] = await Promise.all([
        partyName(userId, sale.partyId),
        sale.transportMode === "hired" ? partyName(userId, sale.transporterId) : "",
        accountName(userId, sale.account),
      ]);
      record = { ...serializeSale(sale), partyId: sale.partyId ? { _id: sale.partyId, name: party } : null };
      const total = toNumber(sale.totalAmount);
      const paid = toNumber(sale.paidAmount);
      const royalty = sale.isRoyalty ? toNumber(sale.royaltyAmount) : 0;
      const gst = sale.isGst ? toNumber(sale.gstAmount) : 0;
      const transport = sale.transportMode && sale.transportMode !== "party" ? toNumber(sale.transportCharge) : 0;
      const byCft = sale.pricingMode === "per_cubic_meter";
      title = party || "Sale";
      fields = [
        field("Invoice No", sale.invoiceNumber),
        field("RST No", sale.rstNo),
        field("Royalty No", sale.isRoyalty ? sale.royaltyNo || "Not entered" : ""),
        field("Date", sale.saleDate, "date"),
        field("Entry / exit time", [sale.entryTime, sale.exitTime].filter(Boolean).join(" → ")),
        field("Party", party),
        field("Dispatch to", sale.dispatchLocation),
        field("Vehicle No", sale.vehicleNo),
        field("Driver", sale.driverName),
        field("Vehicle", OWNERSHIP_LABELS[sale.transportMode || "party"]),
        field("Transporter", transporter),
        field("Transporter rate", sale.transportMode === "hired" && toNumber(sale.transportRate)
          ? `${money(sale.transportRate)} · ${BASIS_LABELS[sale.transportBasis] || ""}` : ""),
        field("Material", String(sale.stoneSize || "").toUpperCase()),
        field("Billed by", byCft ? "Cubic feet (cft)" : "Weight (ton)"),
        field("Gross weight", kg(sale.grossWeight)),
        field("Tare weight", kg(sale.tareWeight)),
        field("Net weight", toNumber(sale.netWeight) ? `${kg(sale.netWeight)} · ${tons(sale.netWeight)}` : ""),
        field("Cubic feet", toNumber(sale.cubicMeterQty) ? `${qty(sale.cubicMeterQty)} cft` : ""),
        field("Rate", toNumber(sale.rate) ? `${money(sale.rate)} / ${byCft ? "cft" : "ton"}` : ""),
        field("Material amount", Math.max(0, total - royalty - gst - transport), "money"),
        field("Royalty", royalty ? `${toNumber(sale.royaltyQty) ? `${qty(sale.royaltyQty)} ton × ${money(sale.royaltyRate)} = ` : ""}${money(royalty)}` : ""),
        field(`GST${gst ? ` (${qty(sale.gstRate)}%)` : ""}`, gst, "money"),
        field("Transport charge", transport, "money"),
        field("Total", total, "money"),
        field("Payment", PAY_TYPE_LABELS[sale.type] || "Credit (not paid)"),
        field("Paid", paid, "money"),
        field("Received in", paid > 0 ? account || "Cash Account" : ""),
        field("Balance", Math.max(0, total - paid), "money"),
        field("Weights from", sale.weightSource === "weighbridge" ? "Weighbridge ticket" : ""),
      ];
    } else if (type === "boulder") {
      const boulder = await Boulder.findOne(filter).populate("vehicleId").populate("blastingPartyId", "name");
      if (!boulder) return notFound();
      const [supplier, transporter] = await Promise.all([
        partyName(userId, boulder.partyId),
        partyName(userId, boulder.transporterId),
      ]);
      record = boulder;
      const bulk = boulder.entryMode === "bulk";
      title = supplier || boulder.partyName || "Boulder";
      fields = [
        field("Boulder No", boulder.boulderNumber),
        field("RST No", boulder.rstNo),
        field("Slip No", boulder.slipNo),
        field("Date", boulder.boulderDate, "date"),
        field("Entry / exit time", [boulder.entryTime, boulder.exitTime].filter(Boolean).join(" → ")),
        field("Supplier", boulder.ownBoulder ? "N/A (own boulder)" : supplier || boulder.partyName),
        field("Vehicle No", boulder.vehicleNo || boulder.vehicleId?.vehicleNo),
        field("Entry", bulk ? `Bulk · ${qty(boulder.tripCount)} trips` : "Single trip"),
        field(bulk ? "Average weight / trip" : "", bulk ? kg(boulder.averageWeight) : ""),
        field("Gross weight", bulk ? "" : kg(boulder.grossWeight)),
        field("Tare weight", bulk ? "" : kg(boulder.tareWeight)),
        field("Net weight", toNumber(boulder.netWeight) ? `${kg(boulder.netWeight)} · ${tons(boulder.netWeight)}` : ""),
        field("Boulder rate", boulder.boulderRateBasis === "per_trip"
          ? (toNumber(boulder.boulderRatePerTrip) ? `${money(boulder.boulderRatePerTrip)} / trip` : "")
          : (toNumber(boulder.boulderRatePerTon) ? `${money(boulder.boulderRatePerTon)} / ton` : "")),
        field("Boulder amount", toNumber(boulder.boulderAmount), "money"),
        field("Transporter", transporter),
        field("Transport place", boulder.transportLocation),
        field("Transport rate", toNumber(boulder.transportRate)
          ? `${money(boulder.transportRate)} / ${boulder.transportRateBasis === "per_trip" ? "trip" : "ton"}` : ""),
        field("Transport amount", toNumber(boulder.transportAmount), "money"),
        field("Blasting party", boulder.blastingPartyId?.name),
        field("Blasting rate", toNumber(boulder.blastingRatePerTon) ? `${money(boulder.blastingRatePerTon)} / ton` : ""),
        field("Blasting amount", toNumber(boulder.blastingAmount), "money"),
        field("Total amount", toNumber(boulder.amount), "money"),
        field("Weights from", boulder.weightSource === "weighbridge" ? "Weighbridge ticket" : ""),
      ];
    } else if (type === "purchase") {
      const purchase = await Purchase.findOne(filter).populate("party", "name").populate("items.product", "name unit");
      if (!purchase) return notFound();
      record = purchase;
      const total = toNumber(purchase.totalAmount);
      const paid = toNumber(purchase.paidAmount);
      title = purchase.party?.name || "Purchase";
      fields = [
        field("Purchase No", number("PUR", purchase.purchaseNumber)),
        field("Supplier bill", purchase.supplierInvoice),
        field("Date", purchase.purchaseDate, "date"),
        field("Supplier", purchase.party?.name),
        field("Pump fill vehicle", purchase.fillVehicleNo),
        field("Meter at fill", toNumber(purchase.fillMeter) ? qty(purchase.fillMeter) : ""),
        field("Items", itemLines(purchase.items)),
        field("Total", total, "money"),
        field("Paid", paid, "money"),
        field("Paid from", paid > 0 ? (await accountName(userId, purchase.account)) || "Cash Account" : ""),
        field("Balance", Math.max(0, total - paid), "money"),
        field("Notes", purchase.notes),
      ];
    } else if (type === "receipt" || type === "payment") {
      const isReceipt = type === "receipt";
      const Model = isReceipt ? Receipt : Payment;
      const entry = await Model.findOne(filter).populate("party", "name");
      if (!entry) return notFound();
      record = entry;
      const auto = isReceipt
        ? entry.receiptSource && entry.receiptSource !== "manual"
        : entry.paymentSource && entry.paymentSource !== "manual";
      let linked = "";
      if (isReceipt && entry.originSaleId) {
        linked = (await Sales.findOne({ _id: entry.originSaleId, userId }).select("invoiceNumber").lean())?.invoiceNumber || "";
      } else if (!isReceipt && entry.originPurchaseId) {
        linked = number("PUR", (await Purchase.findOne({ _id: entry.originPurchaseId, userId }).select("purchaseNumber").lean())?.purchaseNumber);
      }
      if (auto) {
        editable = false;
        lockedHint = isReceipt
          ? "Made by a sale's received amount: change it from that sale"
          : "Made by a purchase's paid amount: change it from that purchase";
      }
      title = entry.party?.name || (isReceipt ? "Money received" : "Money paid");
      fields = [
        field(isReceipt ? "Receipt No" : "Payment No", isReceipt ? number("REC", entry.receiptNumber) : entry.paymentNumber),
        field("Date", isReceipt ? entry.receiptDate : entry.paymentDate, "date"),
        field("Party", entry.party?.name),
        field("Amount", toNumber(entry.amount), "money"),
        field(isReceipt ? "Received in" : "Paid from", (await accountName(userId, entry.account)) || entry.method),
        field(isReceipt ? "Against sale" : "Against purchase", linked),
        field("Notes", entry.notes),
      ];
    } else if (type === "expense") {
      const expense = await Expense.findOne(filter)
        .populate("expenseGroup", "name")
        .populate("items.expenseGroup", "name unit")
        .populate("party", "name type")
        .populate("account", "name");
      if (!expense) return notFound();
      record = expense;
      if (expense.payrollEntry) {
        editable = false;
        lockedHint = "A salary / advance payment: change it in Payroll";
      } else if ((expense.items || []).length > 0) {
        editable = false;
        lockedHint = "An expense with items: change it on the Expenses page";
      }
      const total = toNumber(expense.amount);
      const paid = toNumber(expense.paidAmount ?? expense.amount);
      title = expense.expenseGroup?.name || "Expense";
      fields = [
        field("Expense No", expense.expenseNumber),
        field("Date", expense.expenseDate, "date"),
        field("Expense type", expense.expenseGroup?.name),
        field("Party", expense.party?.name),
        field("Items", itemLines(expense.items)),
        field("Amount", total, "money"),
        field("Paid", paid, "money"),
        field("Paid from", paid > 0 ? expense.account?.name || expense.method || "Cash Account" : ""),
        field("Balance", Math.max(0, total - paid), "money"),
        field("Notes", expense.notes),
      ];
    } else if (type === "materialUsed") {
      const entry = await MaterialUsed.findOne(filter)
        .populate("vehicle", "vehicleNo")
        .populate("materialType", "name unit")
        .populate("purchase", "purchaseNumber");
      if (!entry) return notFound();
      record = entry;
      if (entry.purchase) {
        editable = false;
        lockedHint = `Made by a pump fill: change purchase ${number("PUR", entry.purchase.purchaseNumber) || ""}`.trim();
      }
      const usedFor = usedForOf(entry);
      title = entry.materialTypeName || entry.materialType?.name || "Material issued";
      fields = [
        field("Date", entry.usedDate, "date"),
        field("Material", entry.materialTypeName || entry.materialType?.name),
        field("Quantity", `${qty(entry.usedQty)}${entry.unit ? ` ${entry.unit}` : ""}`),
        field("Issued to", usedFor === "dg" ? "DG Set" : usedFor === "vehicle" ? "Vehicle" : "Plant / Other"),
        field("Vehicle No", entry.vehicleNo || entry.vehicle?.vehicleNo),
        field("Notes", entry.notes),
      ];
    } else if (type === "meterReading") {
      const reading = await MeterReading.findOne(filter).lean();
      if (!reading) return notFound();
      record = reading;
      const closed = reading.closingReading !== null && reading.closingReading !== undefined;
      const unit = reading.meterUnit || "";
      title = reading.machine === "dg" ? "DG Set" : reading.vehicleNo || "Vehicle";
      fields = [
        field("Date", reading.readingDate, "date"),
        field("Machine", reading.machine === "dg" ? "DG Set" : `Vehicle ${reading.vehicleNo || ""}`.trim()),
        field("Opening", `${qty(reading.openingReading)} ${unit}`.trim()),
        field("Closing", closed ? `${qty(reading.closingReading)} ${unit}`.trim() : "Still running"),
        field("Run", closed ? `${qty(toNumber(reading.closingReading) - toNumber(reading.openingReading))} ${unit}`.trim() : ""),
        field("Notes", reading.notes),
      ];
    } else if (type === "dumpIn" || type === "dumpOut") {
      const move = await DumpMovement.findOne(filter).lean();
      if (!move) return notFound();
      record = move;
      const bulk = move.entryMode === "bulk";
      title = move.type === "to_hopper" ? "Dump to hopper" : "Boulder to dump";
      fields = [
        field("Voucher No", move.voucherNumber),
        field("Date", move.movementDate, "date"),
        field("Movement", move.type === "to_hopper" ? "Dump → hopper" : "Boulder → dump"),
        field("Vehicle No", move.vehicleNo),
        field("Entry", bulk ? `Bulk · ${qty(move.trips)} trips` : "Single trip"),
        field("Average weight / trip", bulk ? kg(move.averageWeight) : ""),
        field("Gross weight", bulk ? "" : kg(move.grossWeight)),
        field("Tare weight", bulk ? "" : kg(move.tareWeight)),
        field("Weight", toNumber(move.weight) ? `${kg(move.weight)} · ${tons(move.weight)}` : ""),
        field("Notes", move.notes),
      ];
    } else if (type === "saleReturn" || type === "purchaseReturn") {
      const isSale = type === "saleReturn";
      const entry = isSale
        ? await SaleReturn.findOne(filter).populate("party", "name").populate("sale", "invoiceNumber")
        : await PurchaseReturn.findOne(filter).populate("party", "name").populate("purchase", "purchaseNumber supplierInvoice");
      if (!entry) return notFound();
      record = entry;
      editable = false;
      lockedHint = "A return cannot be changed: delete it and make it again";
      title = entry.party?.name || (isSale ? "Sale return" : "Purchase return");
      fields = [
        field("Voucher No", entry.voucherNumber),
        field("Date", entry.voucherDate, "date"),
        field("Party", entry.party?.name),
        field(isSale ? "Against sale" : "Against purchase", isSale
          ? entry.sale?.invoiceNumber
          : number("PUR", entry.purchase?.purchaseNumber) || entry.purchase?.supplierInvoice),
        field("Items", itemLines(entry.items)),
        field("Total", toNumber(entry.totalAmount), "money"),
        field("Notes", entry.notes),
      ];
    } else if (type === "stockAdjustment") {
      const entry = await StockAdjustment.findOne(filter);
      if (!entry) return notFound();
      record = entry;
      title = entry.stockItemName || "Stock adjustment";
      fields = [
        field("Voucher No", entry.voucherNumber),
        field("Date", entry.voucherDate, "date"),
        field("Item", entry.stockItemName),
        field("Change", entry.adjustmentType === "add" ? "Added to stock" : "Reduced from stock"),
        field("Quantity", `${qty(entry.quantity)}${entry.unit ? ` ${entry.unit}` : ""}`),
        field("Reason", entry.reason),
        field("Notes", entry.notes),
      ];
    } else if (type === "transfer") {
      const entry = await AccountTransfer.findOne(filter).populate("fromAccount", "name").populate("toAccount", "name").lean();
      if (!entry) return notFound();
      record = entry;
      editable = false;
      lockedHint = "A transfer cannot be changed: delete it on the Accounts page and make it again";
      title = `${entry.fromAccount?.name || "-"} → ${entry.toAccount?.name || "-"}`;
      fields = [
        field("Date", entry.transferDate, "date"),
        field("From", entry.fromAccount?.name),
        field("To", entry.toAccount?.name),
        field("Amount", toNumber(entry.amount), "money"),
        field("Notes", entry.notes),
      ];
    } else if (type === "transport") {
      const entry = await Transport.findOne(filter).populate("partyId", "name").lean();
      if (!entry) return notFound();
      record = entry;
      editable = false;
      lockedHint = "Change it from the party's transport ledger";
      title = entry.partyId?.name || entry.vehicleNo || "Transport";
      fields = [
        field("Entry No", entry.entryNumber),
        field("Date", entry.entryDate, "date"),
        field("Party", entry.partyId?.name),
        field("Direction", entry.direction === "payable" ? "I pay" : "I receive"),
        field("Vehicle No", entry.vehicleNo),
        field("Basis", BASIS_LABELS[entry.basis]),
        field("Place", entry.location),
        field("Quantity", toNumber(entry.quantity) ? qty(entry.quantity) : ""),
        field("Rate", toNumber(entry.rate), "money"),
        field("Amount", toNumber(entry.amount), "money"),
        field("From", entry.fromDate, "date"),
        field("To", entry.toDate, "date"),
        field("Notes", entry.notes),
      ];
    } else {
      return res.status(400).json({ message: "Unknown entry type" });
    }

    return res.json({ type, id, title, fields: clean(fields), record, editable, lockedHint });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load entry", error: error.message });
  }
};

module.exports = { getActivity, getActivityEntry };
