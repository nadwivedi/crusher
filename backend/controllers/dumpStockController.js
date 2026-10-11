const mongoose = require("mongoose");
const Boulder = require("../models/Boulder");
const Counter = require("../models/Counter");
const DumpMovement = require("../models/DumpMovement");
const Vehicle = require("../models/Vehicle");
const { DUMP_MOVEMENT_TYPES } = require("../models/DumpMovement");
const { scopedFilter, scopedIdFilter } = require("../utils/ownership");
const { getDumpBalance, formatTons } = require("../utils/dumpStock");

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const roundKg = (value) => Math.round(toNumber(value) * 1000) / 1000;

const VOUCHER_PREFIX = { to_dump: "DMP", to_hopper: "HOP" };

const createVoucherNumber = async (userId, type, movementDate) => {
  const year = movementDate.getFullYear();
  const counter = await Counter.findOneAndUpdate(
    { userId, key: `dump:${type}:${year}` },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return `${VOUCHER_PREFIX[type]}-${year}-${String(counter.seq).padStart(2, "0")}`;
};

/**
 * Entry fields from the request (weights in kg).
 * Boulder → dump: one slip (gross − tare) or bulk (trips × average). Dump → hopper: the weight fed, trips optional.
 */
const readMovement = async (body, userId) => {
  const type = String(body.type || "").trim();
  if (!DUMP_MOVEMENT_TYPES.includes(type)) throw new Error("Invalid dump entry type");

  const movementDate = body.movementDate ? new Date(body.movementDate) : new Date();
  if (Number.isNaN(movementDate.getTime())) throw new Error("Valid date is required");

  const movement = {
    type,
    movementDate,
    entryMode: "single",
    grossWeight: 0,
    tareWeight: 0,
    averageWeight: 0,
    trips: 0,
    weight: 0,
    vehicleId: null,
    vehicleNo: String(body.vehicleNo || "").trim().toUpperCase(),
    notes: String(body.notes || "").trim(),
  };

  if (body.vehicleId && mongoose.Types.ObjectId.isValid(body.vehicleId)) {
    const vehicle = await Vehicle.findOne({ _id: body.vehicleId, userId }).select("vehicleNo");
    if (vehicle) {
      movement.vehicleId = vehicle._id;
      movement.vehicleNo = vehicle.vehicleNo;
    }
  }

  if (type === "to_dump" && body.entryMode === "bulk") {
    const trips = Math.floor(toNumber(body.trips));
    const averageWeight = roundKg(body.averageWeight);
    if (trips < 1) throw new Error("Number of trips must be at least 1");
    if (averageWeight <= 0) throw new Error("Average weight per trip must be more than 0");
    Object.assign(movement, { entryMode: "bulk", trips, averageWeight, weight: roundKg(trips * averageWeight) });
  } else if (type === "to_dump") {
    const grossWeight = roundKg(body.grossWeight);
    const tareWeight = roundKg(body.tareWeight);
    if (grossWeight <= tareWeight) throw new Error("Gross weight must be more than tare weight");
    Object.assign(movement, { grossWeight, tareWeight, trips: 1, weight: roundKg(grossWeight - tareWeight) });
  } else {
    movement.weight = roundKg(body.weight);
    movement.trips = Math.max(0, Math.floor(toNumber(body.trips)));
  }

  if (movement.weight < 1) throw new Error("Weight must be more than 0");
  return movement;
};

// The dump may never show less than nothing
const assertBalance = (balanceAfter, available) => {
  if (balanceAfter < -0.5) {
    throw new Error(`Only ${formatTons(Math.max(0, available))} ton boulder is on the dump`);
  }
};

const createDumpMovement = async (req, res) => {
  try {
    const movement = await readMovement(req.body, req.userId);
    if (movement.type === "to_hopper") {
      const balance = await getDumpBalance(req.userId);
      assertBalance(balance - movement.weight, balance);
    }

    const saved = await DumpMovement.create({
      ...movement,
      userId: req.userId,
      voucherNumber: await createVoucherNumber(req.userId, movement.type, movement.movementDate),
    });
    return res.status(201).json(saved);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const editDumpMovement = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid entry id" });

  try {
    const existing = await DumpMovement.findOne(scopedIdFilter(req, id));
    if (!existing) return res.status(404).json({ message: "Dump entry not found" });

    const movement = await readMovement({ ...req.body, type: existing.type }, req.userId);
    const balanceWithout = await getDumpBalance(req.userId, { excludeId: existing._id });
    if (existing.type === "to_hopper") {
      assertBalance(balanceWithout - movement.weight, balanceWithout);
    } else if (balanceWithout + movement.weight < -0.5) {
      const fed = Math.min(existing.weight, -balanceWithout);
      throw new Error(`${formatTons(fed)} ton of this boulder has already gone to the hopper. Reduce the Dump Boulder to Hopper entries first.`);
    }

    Object.assign(existing, movement);
    await existing.save();
    return res.json(existing);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const deleteDumpMovement = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid entry id" });

  try {
    const existing = await DumpMovement.findOne(scopedIdFilter(req, id));
    if (!existing) return res.status(404).json({ message: "Dump entry not found" });

    if (existing.type === "to_dump") {
      const balanceWithout = await getDumpBalance(req.userId, { excludeId: existing._id });
      if (balanceWithout < -0.5) {
        const fed = Math.min(existing.weight, -balanceWithout);
        return res.status(400).json({ message: `${formatTons(fed)} ton of this boulder has already gone to the hopper. Reduce the Dump Boulder to Hopper entries first.` });
      }
    }

    await DumpMovement.deleteOne({ _id: existing._id });
    return res.json({ message: "Dump entry deleted" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getDumpBalanceSummary = async (req, res) => {
  try {
    return res.json({ balance: await getDumpBalance(req.userId) });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const parseDay = (value, endOfDay) => {
  if (!value) return null;
  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`);
  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * Dump stock ledger: every Dump Boulder Entry (in) and Dump Boulder to Hopper (out), oldest first with a running balance.
 * With a period, earlier entries make the opening balance. Boulder entries (straight to the hopper) are totalled
 * too, so the hopper feed for the period is complete.
 */
const getDumpLedger = async (req, res) => {
  try {
    const from = parseDay(req.query.from, false);
    const to = parseDay(req.query.to, true);
    const inPeriod = (date) => (!from || date >= from) && (!to || date <= to);

    const [movements, boulders] = await Promise.all([
      DumpMovement.find(scopedFilter(req)).sort({ movementDate: 1, createdAt: 1 }).lean(),
      Boulder.find(scopedFilter(req)).select("boulderDate createdAt netWeight entryMode tripCount").lean(),
    ]);

    let directToHopper = 0;
    let directTrips = 0;
    for (const boulder of boulders) {
      if (!inPeriod(new Date(boulder.boulderDate || boulder.createdAt))) continue;
      directToHopper += toNumber(boulder.netWeight);
      directTrips += boulder.entryMode === "bulk" ? toNumber(boulder.tripCount) : 1;
    }

    let balance = 0;
    let openingBalance = 0;
    const totals = { dumped: 0, dumpedTrips: 0, toHopper: 0, toHopperTrips: 0 };
    const rows = [];

    for (const movement of movements) {
      const date = new Date(movement.movementDate || movement.createdAt);
      const weight = toNumber(movement.weight);
      const isIn = movement.type === "to_dump";
      balance += isIn ? weight : -weight;

      if (from && date < from) {
        openingBalance = balance;
        continue;
      }
      if (to && date > to) continue;

      if (isIn) {
        totals.dumped += weight;
        totals.dumpedTrips += toNumber(movement.trips);
      } else {
        totals.toHopper += weight;
        totals.toHopperTrips += toNumber(movement.trips);
      }
      rows.push({
        ...movement,
        date,
        inWeight: isIn ? weight : 0,
        outWeight: isIn ? 0 : weight,
        balance,
      });
    }

    return res.json({
      openingBalance,
      closingBalance: rows.length ? rows[rows.length - 1].balance : openingBalance,
      currentBalance: balance,
      totals: {
        ...totals,
        directToHopper,
        directTrips,
        hopperFeed: directToHopper + totals.toHopper,
      },
      rows,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load dump ledger", error: error.message });
  }
};

module.exports = {
  getDumpLedger,
  getDumpBalanceSummary,
  createDumpMovement,
  editDumpMovement,
  deleteDumpMovement,
};
