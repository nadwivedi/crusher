const Stock = require("../models/Stock");
const User = require("../models/User");

const DIESEL_NAME = "Diesel";
const DIESEL_UNIT = "ltr";

// Vehicles whose meter counts hours (JCB, loader, PC, tractor); the rest count KM. The DG set always counts hours.
const HOUR_METER_CATEGORIES = ["jcb", "loader", "pc", "tractor"];
const meterUnitFor = (usedFor, category) => (
  usedFor === "dg" || HOUR_METER_CATEGORIES.includes(category) ? "hr" : "km"
);

// Where a material used entry went; older entries have no usedFor and went to their vehicle, if any
const usedForOf = (entry) => entry.usedFor || (entry.vehicle ? "vehicle" : "other");

// Names that are diesel itself; "Diesel Filter" or "Diesel Engine Oil" are not
const DIESEL_NAME_PATTERN = /^\s*(diesel|hsd|high speed diesel|diesel fuel)\s*(\(.*\))?\s*$/i;
const DIESEL_PART_PATTERN = /diesel|\bhsd\b/i;
const NOT_FUEL_PATTERN = /filter|oil|pump|engine|tank|pipe|part|nozzle|meter/i;

// The account's Diesel item. An item the owner made before this existed is adopted
// (a plain "Diesel" / "HSD" first, then another diesel name that is not a part); otherwise a new one is created.
const ensureDieselStock = async (userId) => {
  const flagged = await Stock.findOne({ userId, isDiesel: true });
  if (flagged) return flagged;

  const candidates = await Stock.find({ userId, name: { $regex: DIESEL_PART_PATTERN } }).sort({ createdAt: 1 });
  const existing = candidates.find((stock) => DIESEL_NAME_PATTERN.test(stock.name))
    || candidates.find((stock) => !NOT_FUEL_PATTERN.test(stock.name));
  if (existing) {
    existing.isDiesel = true;
    existing.usedInVehicle = true;
    await existing.save();
    return existing;
  }

  return Stock.create({ userId, name: DIESEL_NAME, unit: DIESEL_UNIT, isDiesel: true, usedInVehicle: true });
};

// Gives every account made before signup created Diesel its Diesel item. Runs at server start.
const backfillDieselStock = async () => {
  const withDiesel = await Stock.distinct("userId", { isDiesel: true });
  const users = await User.find({ _id: { $nin: withDiesel } }).select("_id").lean();
  for (const user of users) {
    await ensureDieselStock(user._id);
  }
  return users.length;
};

// Items saved before "used in vehicle" existed get it once: Diesel and anything ever given to a vehicle
// or the DG set keep showing the vehicle picker; the rest are plant items. Runs at server start.
const backfillUsedInVehicle = async () => {
  const MaterialUsed = require("../models/MaterialUsed");
  const unset = await Stock.find({ usedInVehicle: { $exists: false } }).select("_id isDiesel").lean();
  if (!unset.length) return 0;
  const usedOnMachines = new Set((await MaterialUsed.distinct("materialType", {
    materialType: { $in: unset.map((item) => item._id) },
    $or: [{ usedFor: { $in: ["vehicle", "dg"] } }, { usedFor: { $exists: false }, vehicle: { $ne: null } }],
  })).map(String));
  const yes = unset.filter((item) => item.isDiesel || usedOnMachines.has(String(item._id))).map((item) => item._id);
  const no = unset.filter((item) => !yes.some((id) => String(id) === String(item._id))).map((item) => item._id);
  if (yes.length) await Stock.updateMany({ _id: { $in: yes } }, { $set: { usedInVehicle: true } });
  if (no.length) await Stock.updateMany({ _id: { $in: no } }, { $set: { usedInVehicle: false } });
  return unset.length;
};

module.exports = {
  ensureDieselStock,
  backfillDieselStock,
  backfillUsedInVehicle,
  meterUnitFor,
  usedForOf,
};
