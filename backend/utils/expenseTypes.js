const ExpenseType = require("../models/ExpenseType");
const User = require("../models/User");

// What a crusher spends on most, so a new account can enter expenses straight away
const DEFAULT_EXPENSE_TYPES = [
  "Electricity",
  "Food",
  "Tea & Snacks",
  "Labour",
  "Repair & Maintenance",
  "Rent",
  "Travel",
  "Mobile & Internet",
  "Office Expense",
  "Other",
];

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Adds the default expense types the account does not have yet (by name, any case), once per account:
// a type the owner deletes later is not brought back.
const ensureDefaultExpenseTypes = async (userId) => {
  const user = await User.findById(userId).select("defaultExpenseTypesAddedAt");
  if (!user || user.defaultExpenseTypesAddedAt) return 0;

  let added = 0;
  for (const name of DEFAULT_EXPENSE_TYPES) {
    const exists = await ExpenseType.exists({ userId, name: { $regex: `^${escapeRegex(name)}$`, $options: "i" } });
    if (exists) continue;
    await ExpenseType.create({ userId, name, type: "services" }).then(() => { added += 1; }).catch((error) => {
      if (error?.code !== 11000) throw error;
    });
  }

  await User.updateOne({ _id: userId }, { $set: { defaultExpenseTypesAddedAt: new Date() } });
  return added;
};

// Accounts made before default expense types existed get them once. Runs at server start.
const backfillDefaultExpenseTypes = async () => {
  const users = await User.find({ defaultExpenseTypesAddedAt: { $exists: false } }).select("_id").lean();
  for (const user of users) {
    await ensureDefaultExpenseTypes(user._id);
  }
  return users.length;
};

module.exports = {
  DEFAULT_EXPENSE_TYPES,
  ensureDefaultExpenseTypes,
  backfillDefaultExpenseTypes,
};
