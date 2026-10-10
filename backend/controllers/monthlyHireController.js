const mongoose = require("mongoose");
const MonthlyHire = require("../models/MonthlyHire");
const Party = require("../models/Party");
const Transport = require("../models/Transport");
const Vehicle = require("../models/Vehicle");
const { scopedFilter, scopedIdFilter } = require("../utils/ownership");
const { toDay, todayDay, formatDay, getHireMonths, syncHireEntries, findActiveVehicleHire } = require("../utils/monthlyHire");

const DIRECTIONS = ["payable", "receivable"];
const CANCEL_CHARGES = ["prorata", "full", "none", "custom"];
const ADJUSTMENT_KINDS = ["off_days", "deduct", "extra"];

const CANCEL_CHARGE_LABELS = {
  prorata: "days used charged",
  full: "full month charged",
  none: "remaining days not charged",
  custom: "custom amount",
};

const toDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : new Date(toDay(parsed));
};

const formatRs = (value) => `Rs ${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const addHistory = (hire, action, note = "") => {
  hire.history.push({ at: new Date(), action, note });
};

// The hire as the app shows it: party name, what is in the ledger so far, and the month now running
const serializeHire = (hireDoc, bookedTotals = new Map()) => {
  const hire = typeof hireDoc.toObject === "function" ? hireDoc.toObject() : { ...hireDoc };
  const party = hire.partyId && typeof hire.partyId === "object" && hire.partyId.name !== undefined ? hire.partyId : null;
  const booked = bookedTotals.get(String(hire._id)) || { amount: 0, count: 0 };
  // The month now running, in the ledger day by day
  const running = getHireMonths(hire).find((month) => month.running) || null;

  return {
    ...hire,
    partyId: party ? party._id : hire.partyId,
    partyName: party?.name || "",
    bookedAmount: booked.amount,
    bookedMonths: booked.count,
    runningMonth: running && {
      fromDate: new Date(running.fromDate),
      toDate: new Date(running.rangeEnd),
      daysUsed: running.daysUsed,
      monthDays: running.monthDays,
      dayRate: Math.round(running.dayRate * 100) / 100,
      amount: running.amount,
      note: running.note,
    },
  };
};

const getBookedTotals = async (userId, hireIds) => {
  const totals = await Transport.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(String(userId)), hireId: { $in: hireIds } } },
    { $group: { _id: "$hireId", amount: { $sum: "$amount" }, count: { $sum: 1 } } },
  ]);
  return new Map(totals.map((row) => [String(row._id), { amount: row.amount, count: row.count }]));
};

// Validated fields of a hire, or throws with a message for the user
const buildHireFields = async (body, userId) => {
  const direction = DIRECTIONS.includes(body.direction) ? body.direction : "payable";

  if (!body.partyId || !mongoose.Types.ObjectId.isValid(body.partyId)) {
    throw new Error("Party is required");
  }
  const party = await Party.findOne({ _id: body.partyId, userId }).select("_id");
  if (!party) {
    throw new Error("Party not found");
  }

  const monthlyRate = Number(body.monthlyRate);
  if (!Number.isFinite(monthlyRate) || monthlyRate <= 0) {
    throw new Error("Monthly amount must be greater than 0");
  }

  const startDate = toDate(body.startDate);
  if (!startDate) {
    throw new Error("From date is required");
  }
  const endDate = toDate(body.endDate);
  if (endDate && endDate < startDate) {
    throw new Error("To date cannot be before the from date");
  }

  let vehicleId = null;
  let vehicleNo = String(body.vehicleNo || "").trim().toUpperCase();
  if (body.vehicleId && mongoose.Types.ObjectId.isValid(body.vehicleId)) {
    const vehicle = await Vehicle.findOne({ _id: body.vehicleId, userId }).select("_id vehicleNo");
    if (vehicle) {
      vehicleId = vehicle._id;
      vehicleNo = vehicle.vehicleNo;
    }
  }

  return {
    direction,
    partyId: party._id,
    vehicleId,
    vehicleNo,
    monthlyRate: Math.round(monthlyRate * 100) / 100,
    startDate,
    endDate,
    notes: String(body.notes || "").trim(),
  };
};

const findHire = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ message: "Invalid monthly hire id" });
    return null;
  }
  const hire = await MonthlyHire.findOne(scopedIdFilter(req, id));
  if (!hire) {
    res.status(404).json({ message: "Monthly hire not found" });
    return null;
  }
  return hire;
};

// Saves the hire, books its months again, and returns it with its ledger entries
const saveAndRespond = async (req, res, hire, status = 200) => {
  await hire.save();
  await syncHireEntries(hire);
  await hire.populate("partyId", "name type");
  const bookedTotals = await getBookedTotals(req.userId, [hire._id]);
  return res.status(status).json(serializeHire(hire, bookedTotals));
};

const getMonthlyHires = async (req, res) => {
  try {
    const extra = {};
    if (req.query.partyId && mongoose.Types.ObjectId.isValid(req.query.partyId)) {
      extra.partyId = req.query.partyId;
    }
    if (req.query.vehicleId && mongoose.Types.ObjectId.isValid(req.query.vehicleId)) {
      extra.vehicleId = req.query.vehicleId;
    }
    const hires = await MonthlyHire.find(scopedFilter(req, extra))
      .populate("partyId", "name type")
      .sort({ startDate: -1, createdAt: -1 });
    const bookedTotals = await getBookedTotals(req.userId, hires.map((hire) => hire._id));

    return res.json(hires.map((hire) => serializeHire(hire, bookedTotals)));
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch monthly hires", error: error.message });
  }
};

// One hire with each month it put in the ledger
const getMonthlyHireById = async (req, res) => {
  try {
    const hire = await findHire(req, res);
    if (!hire) return;

    await hire.populate("partyId", "name type");
    const entries = await Transport.find({ userId: hire.userId, hireId: hire._id }).sort({ fromDate: 1 });
    const bookedTotals = await getBookedTotals(req.userId, [hire._id]);

    return res.json({
      ...serializeHire(hire, bookedTotals),
      entries: entries.map((entry) => ({
        _id: entry._id,
        entryNumber: entry.entryNumber,
        entryDate: entry.entryDate,
        fromDate: entry.fromDate,
        toDate: entry.toDate,
        amount: entry.amount,
        notes: entry.notes,
      })),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch monthly hire", error: error.message });
  }
};

const createMonthlyHire = async (req, res) => {
  try {
    const fields = await buildHireFields(req.body, req.userId);
    if (fields.vehicleId && await findActiveVehicleHire(req.userId, fields.vehicleId)) {
      return res.status(400).json({ message: "This vehicle already has a running monthly hire. Adjust or cancel that one instead." });
    }
    const hire = new MonthlyHire({ ...fields, userId: req.userId });
    if (fields.vehicleId && fields.direction === "payable") {
      await Vehicle.updateOne(
        { _id: fields.vehicleId, userId: req.userId },
        { ownership: "hired", hireBasis: "per_month", hireRate: fields.monthlyRate, partyId: fields.partyId, tripRates: [] }
      );
    }
    addHistory(hire, "Started", `${formatRs(hire.monthlyRate)} a month from ${formatDay(hire.startDate)}${hire.endDate ? ` to ${formatDay(hire.endDate)}` : ", until cancelled"}`);
    return await saveAndRespond(req, res, hire, 201);
  } catch (error) {
    return res.status(400).json({ message: error.message || "Failed to save monthly hire" });
  }
};

const editMonthlyHire = async (req, res) => {
  try {
    const hire = await findHire(req, res);
    if (!hire) return;

    const before = { rate: hire.monthlyRate, start: hire.startDate?.getTime(), end: hire.endDate?.getTime() || null };
    Object.assign(hire, await buildHireFields(req.body, req.userId));
    if (hire.cancelledAt && hire.cancelledAt < hire.startDate) {
      hire.cancelledAt = hire.startDate;
    }

    const changes = [
      before.rate !== hire.monthlyRate ? `rate ${formatRs(before.rate)} to ${formatRs(hire.monthlyRate)}` : "",
      before.start !== hire.startDate.getTime() ? `from date to ${formatDay(hire.startDate)}` : "",
      before.end !== (hire.endDate?.getTime() || null) ? `to date to ${hire.endDate ? formatDay(hire.endDate) : "until cancelled"}` : "",
    ].filter(Boolean);
    addHistory(hire, "Changed", changes.join(", ") || "details");
    // A vehicle on monthly rent keeps the same amount as its hire
    if (hire.vehicleId) {
      await Vehicle.updateOne(
        { _id: hire.vehicleId, userId: req.userId, hireBasis: "per_month" },
        { hireRate: hire.monthlyRate, partyId: hire.partyId }
      );
    }
    return await saveAndRespond(req, res, hire);
  } catch (error) {
    return res.status(400).json({ message: error.message || "Failed to update monthly hire" });
  }
};

// Stops the hire: the given day is the last one the vehicle was used, and the part month is charged as chosen
const cancelMonthlyHire = async (req, res) => {
  try {
    const hire = await findHire(req, res);
    if (!hire) return;

    const cancelDate = toDate(req.body?.cancelDate) || new Date(todayDay());
    if (cancelDate < hire.startDate) {
      return res.status(400).json({ message: "Cancel date cannot be before the hire started" });
    }
    const cancelCharge = CANCEL_CHARGES.includes(req.body?.cancelCharge) ? req.body.cancelCharge : "prorata";
    const cancelAmount = Math.max(0, Number(req.body?.cancelAmount) || 0);
    if (cancelCharge === "custom" && !Number.isFinite(Number(req.body?.cancelAmount))) {
      return res.status(400).json({ message: "Enter the amount for the last part month" });
    }

    hire.cancelledAt = cancelDate;
    hire.cancelCharge = cancelCharge;
    hire.cancelAmount = cancelCharge === "custom" ? cancelAmount : 0;
    addHistory(
      hire,
      "Cancelled",
      `Last day ${formatDay(cancelDate)}, ${CANCEL_CHARGE_LABELS[cancelCharge]}${cancelCharge === "custom" ? ` ${formatRs(cancelAmount)}` : ""}${req.body?.note ? ` (${String(req.body.note).trim()})` : ""}`
    );
    return await saveAndRespond(req, res, hire);
  } catch (error) {
    return res.status(400).json({ message: error.message || "Failed to cancel monthly hire" });
  }
};

// Undoes a cancel: the hire runs on as agreed
const resumeMonthlyHire = async (req, res) => {
  try {
    const hire = await findHire(req, res);
    if (!hire) return;
    if (!hire.cancelledAt) {
      return res.status(400).json({ message: "This hire is not cancelled" });
    }

    hire.cancelledAt = null;
    hire.cancelCharge = "prorata";
    hire.cancelAmount = 0;
    addHistory(hire, "Resumed", "Cancel undone, running again");
    return await saveAndRespond(req, res, hire);
  } catch (error) {
    return res.status(400).json({ message: error.message || "Failed to resume monthly hire" });
  }
};

const describeAdjustment = (adjustment) => {
  const note = adjustment.note ? ` (${adjustment.note})` : "";
  if (adjustment.kind === "off_days") return `${adjustment.days} off day(s) on ${formatDay(adjustment.date)}${note}`;
  if (adjustment.kind === "deduct") return `${formatRs(adjustment.amount)} less on ${formatDay(adjustment.date)}${note}`;
  return `${formatRs(adjustment.amount)} extra on ${formatDay(adjustment.date)}${note}`;
};

// Days the vehicle did not work, or an amount off or on top, for the month the date falls in
const addAdjustment = async (req, res) => {
  try {
    const hire = await findHire(req, res);
    if (!hire) return;

    const kind = String(req.body?.kind || "");
    if (!ADJUSTMENT_KINDS.includes(kind)) {
      return res.status(400).json({ message: "Choose off days, less amount or extra amount" });
    }
    const date = toDate(req.body?.date);
    if (!date) {
      return res.status(400).json({ message: "Date is required" });
    }
    if (date < hire.startDate) {
      return res.status(400).json({ message: "Date cannot be before the hire started" });
    }

    const adjustment = { date, kind, note: String(req.body?.note || "").trim() };
    if (kind === "off_days") {
      const days = Math.floor(Number(req.body?.days));
      if (!Number.isFinite(days) || days < 1 || days > 31) {
        return res.status(400).json({ message: "Off days must be between 1 and 31" });
      }
      adjustment.days = days;
    } else {
      const amount = Number(req.body?.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({ message: "Amount must be greater than 0" });
      }
      adjustment.amount = Math.round(amount * 100) / 100;
    }

    hire.adjustments.push(adjustment);
    addHistory(hire, "Adjusted", describeAdjustment(adjustment));
    return await saveAndRespond(req, res, hire);
  } catch (error) {
    return res.status(400).json({ message: error.message || "Failed to add adjustment" });
  }
};

const removeAdjustment = async (req, res) => {
  try {
    const hire = await findHire(req, res);
    if (!hire) return;

    const adjustment = hire.adjustments.id(req.params.adjustmentId);
    if (!adjustment) {
      return res.status(404).json({ message: "Adjustment not found" });
    }

    addHistory(hire, "Adjustment removed", describeAdjustment(adjustment));
    adjustment.deleteOne();
    return await saveAndRespond(req, res, hire);
  } catch (error) {
    return res.status(400).json({ message: error.message || "Failed to remove adjustment" });
  }
};

// Removes the hire and the months it booked
const deleteMonthlyHire = async (req, res) => {
  try {
    const hire = await findHire(req, res);
    if (!hire) return;

    await Transport.deleteMany({ userId: hire.userId, hireId: hire._id });
    await hire.deleteOne();
    return res.json({ message: "Monthly hire deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete monthly hire", error: error.message });
  }
};

module.exports = {
  getMonthlyHires,
  getMonthlyHireById,
  createMonthlyHire,
  editMonthlyHire,
  cancelMonthlyHire,
  resumeMonthlyHire,
  addAdjustment,
  removeAdjustment,
  deleteMonthlyHire,
};
