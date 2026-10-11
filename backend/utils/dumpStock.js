const mongoose = require("mongoose");
const DumpMovement = require("../models/DumpMovement");

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toObjectId = (value) => (value instanceof mongoose.Types.ObjectId ? value : new mongoose.Types.ObjectId(String(value)));

/**
 * Boulder lying on the dump right now, in kg: everything unloaded on the dump less everything fed to the hopper.
 * One entry can be left out, to check what the balance would be after editing or deleting it.
 */
const getDumpBalance = async (userId, { excludeId = null } = {}) => {
  const match = { userId: toObjectId(userId) };
  if (excludeId) match._id = { $ne: toObjectId(excludeId) };

  const rows = await DumpMovement.aggregate([{ $match: match }, { $group: { _id: "$type", weight: { $sum: "$weight" } } }]);
  const byType = Object.fromEntries(rows.map((row) => [row._id, toNumber(row.weight)]));
  return toNumber(byType.to_dump) - toNumber(byType.to_hopper);
};

const formatTons = (kg) => (toNumber(kg) / 1000).toLocaleString("en-IN", { maximumFractionDigits: 3 });

module.exports = {
  getDumpBalance,
  formatTons,
};
