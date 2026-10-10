const MonthlyHire = require("../models/MonthlyHire");
const Transport = require("../models/Transport");
const { createTransportNumber } = require("./transport");

const DAY_MS = 24 * 60 * 60 * 1000;

// Dates are whole days (UTC midnight), the way date inputs send them
const toDay = (value) => {
  const date = new Date(value);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
};

// Today in India, where the crusher is
const todayDay = () => toDay(Date.now() + 5.5 * 60 * 60 * 1000);

// The same day n months later; the 31st becomes the month's last day when the month is shorter
const addMonths = (day, months) => {
  const date = new Date(day);
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(date.getUTCDate(), lastDay));
  return target.getTime();
};

const round = (value, places = 2) => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

const dayCount = (from, to) => Math.round((to - from) / DAY_MS) + 1;

const formatDay = (day) => new Date(day).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });

const formatRs = (value) => `Rs ${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

// The last day charged and why: the agreed end, or the cancel day if that comes first. null while it runs on.
const getHireStop = (hire) => {
  const end = hire.endDate ? toDay(hire.endDate) : null;
  const cancelled = hire.cancelledAt ? toDay(hire.cancelledAt) : null;
  if (cancelled !== null && (end === null || cancelled <= end)) return { day: cancelled, cancelled: true };
  if (end !== null) return { day: end, cancelled: false };
  return null;
};

// What the days after the last full month cost when the hire stops part-way through a month
const getCutCharge = (hire, stop, rate, usedDays, monthDays) => {
  const mode = stop.cancelled ? hire.cancelCharge || "prorata" : "prorata";
  if (mode === "full") return { amount: rate, note: `${usedDays} of ${monthDays} days, full month charged on cancel` };
  if (mode === "none") return { amount: 0, note: `${usedDays} of ${monthDays} days, not charged on cancel` };
  if (mode === "custom") return { amount: Math.max(0, Number(hire.cancelAmount) || 0), note: `${usedDays} of ${monthDays} days, settled at ${formatRs(hire.cancelAmount)} on cancel` };
  return {
    amount: round((rate * usedDays) / monthDays),
    note: `${usedDays} of ${monthDays} days${stop.cancelled ? " (cancelled)" : ""}`,
  };
};

/**
 * Every month of a hire up to its stop (or up to the running month while it has no stop), each with its charge.
 * booked: the month is over, so it belongs in the ledger. A month is booked on its last day; a month cut
 * short by the end or a cancel is booked on the stop day. Adjustments land in the month their date falls in;
 * one dated after the stop goes to the last month.
 */
const getHireMonths = (hire, today = todayDay()) => {
  const start = toDay(hire.startDate);
  const stop = getHireStop(hire);
  const rate = Math.max(0, Number(hire.monthlyRate) || 0);
  const months = [];

  for (let index = 0; index < 1200; index += 1) {
    const from = addMonths(start, index);
    if (stop && from > stop.day) break;
    if (!stop && from > today) break;

    const monthEnd = addMonths(start, index + 1) - DAY_MS;
    const monthDays = dayCount(from, monthEnd);
    const isCut = Boolean(stop) && stop.day < monthEnd;
    const to = isCut ? stop.day : monthEnd;
    const base = isCut ? getCutCharge(hire, stop, rate, dayCount(from, to), monthDays) : { amount: rate, note: "" };

    months.push({ fromDate: from, toDate: to, monthDays, base, booked: to <= today, adjustments: [] });
    if (isCut) break;
  }

  // Put each adjustment in its month
  const last = months[months.length - 1];
  for (const adjustment of hire.adjustments || []) {
    const day = toDay(adjustment.date);
    const month = months.find((item) => day >= item.fromDate && day <= item.toDate)
      || (last && stop && day > last.toDate ? last : null);
    if (month) month.adjustments.push(adjustment);
  }

  for (const month of months) {
    const notes = [base(month)];
    let amount = month.base.amount;
    for (const adjustment of month.adjustments) {
      const label = adjustment.note ? ` (${adjustment.note})` : "";
      if (adjustment.kind === "off_days") {
        const days = Math.min(Math.max(0, Number(adjustment.days) || 0), month.monthDays);
        const cut = round((rate * days) / month.monthDays);
        amount -= cut;
        notes.push(`less ${days} off day${days === 1 ? "" : "s"} ${formatRs(cut)}${label}`);
      } else if (adjustment.kind === "deduct") {
        amount -= Number(adjustment.amount) || 0;
        notes.push(`less ${formatRs(adjustment.amount)}${label}`);
      } else {
        amount += Number(adjustment.amount) || 0;
        notes.push(`plus ${formatRs(adjustment.amount)}${label}`);
      }
    }
    month.amount = round(Math.max(0, amount));
    month.quantity = round(dayCount(month.fromDate, month.toDate) / month.monthDays, 4);
    month.note = notes.filter(Boolean).join("; ");
  }

  return months;

  function base(month) {
    return [`Monthly hire ${formatDay(month.fromDate)} - ${formatDay(month.toDate)}`, month.base.note].filter(Boolean).join(", ");
  }
};

/** Brings a hire's ledger entries in line with its booked months: adds new months, fixes changed ones, drops the rest. */
const syncHireEntries = async (hire) => {
  const booked = getHireMonths(hire).filter((month) => month.booked);
  const existing = await Transport.find({ userId: hire.userId, hireId: hire._id });
  const keptIds = [];

  for (const month of booked) {
    const fields = {
      direction: hire.direction,
      partyId: hire.partyId,
      vehicleId: hire.vehicleId || null,
      vehicleNo: hire.vehicleNo || "",
      basis: "per_month",
      quantity: month.quantity,
      rate: hire.monthlyRate,
      amount: month.amount,
      fromDate: new Date(month.fromDate),
      toDate: new Date(month.toDate),
      entryDate: new Date(month.toDate),
      notes: [month.note, hire.notes].filter(Boolean).join(" | "),
    };
    const current = existing.find((entry) => entry.fromDate && toDay(entry.fromDate) === month.fromDate);

    if (current) {
      Object.assign(current, fields);
      if (current.isModified()) await current.save();
      keptIds.push(String(current._id));
    } else {
      await Transport.create({
        ...fields,
        userId: hire.userId,
        source: "monthly_hire",
        hireId: hire._id,
        entryNumber: await createTransportNumber(hire.userId, fields.entryDate),
      });
    }
  }

  const staleIds = existing.filter((entry) => !keptIds.includes(String(entry._id))).map((entry) => entry._id);
  if (staleIds.length > 0) {
    await Transport.deleteMany({ _id: { $in: staleIds } });
  }
};

// The hire a vehicle is on now: not cancelled and not past its agreed end
const findActiveVehicleHire = (userId, vehicleId) => MonthlyHire.findOne({
  userId,
  vehicleId,
  cancelledAt: null,
  $or: [{ endDate: null }, { endDate: { $gte: new Date(todayDay()) } }],
}).sort({ startDate: -1 });

/**
 * A hired vehicle on monthly rent always has a running monthly hire, made and kept from the vehicle's own terms.
 * Saving the vehicle starts the hire (from monthlyFrom, today if none), or updates the running one.
 * When the vehicle stops being on monthly rent, its running hire is cancelled today.
 */
const syncVehicleMonthlyHire = async (vehicle, monthlyFrom = null) => {
  const active = await findActiveVehicleHire(vehicle.userId, vehicle._id);
  const isMonthly = vehicle.ownership === "hired" && vehicle.hireBasis === "per_month" && vehicle.partyId && Number(vehicle.hireRate) > 0;
  const fromDate = monthlyFrom && !Number.isNaN(new Date(monthlyFrom).getTime()) ? new Date(toDay(monthlyFrom)) : null;

  if (isMonthly && active) {
    const changes = [];
    if (Number(active.monthlyRate) !== Number(vehicle.hireRate)) changes.push(`rate ${formatRs(active.monthlyRate)} to ${formatRs(vehicle.hireRate)}`);
    if (String(active.partyId) !== String(vehicle.partyId)) changes.push("owner changed");
    if (fromDate && fromDate.getTime() !== toDay(active.startDate)) changes.push(`from date to ${formatDay(fromDate)}`);
    if (changes.length === 0 && active.vehicleNo === vehicle.vehicleNo) return active;

    active.monthlyRate = vehicle.hireRate;
    active.partyId = vehicle.partyId;
    active.vehicleNo = vehicle.vehicleNo;
    if (fromDate) active.startDate = fromDate;
    active.history.push({ at: new Date(), action: "Changed", note: `From the vehicle: ${changes.join(", ") || "vehicle number"}` });
    await active.save();
    await syncHireEntries(active);
    return active;
  }

  if (isMonthly) {
    const startDate = fromDate || new Date(todayDay());
    const hire = await MonthlyHire.create({
      userId: vehicle.userId,
      direction: "payable",
      partyId: vehicle.partyId,
      vehicleId: vehicle._id,
      vehicleNo: vehicle.vehicleNo,
      monthlyRate: vehicle.hireRate,
      startDate,
      history: [{ at: new Date(), action: "Started", note: `${formatRs(vehicle.hireRate)} a month from ${formatDay(startDate)}, until cancelled` }],
    });
    await syncHireEntries(hire);
    return hire;
  }

  if (active) {
    const today = new Date(todayDay());
    active.cancelledAt = today < active.startDate ? active.startDate : today;
    active.cancelCharge = "prorata";
    active.history.push({ at: new Date(), action: "Cancelled", note: "The vehicle is no longer on monthly rent; days used charged" });
    await active.save();
    await syncHireEntries(active);
  }
  return null;
};

// Books months that have finished since the last look, once a day per user.
// Requests arriving together share one run, so a month is never booked twice.
const lastSyncDay = new Map();
const runningSyncs = new Map();

const syncUserMonthlyHires = async (userId, { force = false } = {}) => {
  const key = String(userId);
  const today = todayDay();
  if (!force && lastSyncDay.get(key) === today) return;
  if (runningSyncs.has(key)) return runningSyncs.get(key);

  const run = (async () => {
    const hires = await MonthlyHire.find({ userId });
    for (const hire of hires) {
      await syncHireEntries(hire);
    }
    lastSyncDay.set(key, today);
  })().finally(() => runningSyncs.delete(key));

  runningSyncs.set(key, run);
  return run;
};

// Route middleware: keep the ledger up to date before anything reads it
const syncMonthlyHiresMiddleware = async (req, res, next) => {
  if (req.method === "GET" && req.userId) {
    try {
      await syncUserMonthlyHires(req.userId);
    } catch (error) {
      console.error("Monthly hire sync failed:", error.message);
    }
  }
  next();
};

module.exports = {
  toDay,
  todayDay,
  formatDay,
  getHireStop,
  getHireMonths,
  syncHireEntries,
  findActiveVehicleHire,
  syncVehicleMonthlyHire,
  syncUserMonthlyHires,
  syncMonthlyHiresMiddleware,
};
