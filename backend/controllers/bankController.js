const mongoose = require("mongoose");
const Bank = require("../models/Bank");
const AccountTransfer = require("../models/AccountTransfer");
const Payment = require("../models/Payment");
const Receipt = require("../models/Receipt");
const { scopedFilter, scopedIdFilter } = require("../utils/ownership");
const {
  isCashAccountName,
  escapeRegex,
  getAccountType,
  ensureCashAccount,
  loadAccountBook,
} = require("../utils/accounts");

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeBankName = (value) => String(value || "").trim();
const normalizeAccountType = (value) => (String(value || "").trim().toLowerCase() === "cash" ? "cash" : "bank");

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

const isDuplicateNameError = (error) => error?.code === 11000;
const DUPLICATE_NAME_MESSAGE = "An account with this name already exists";

// Names are matched without case elsewhere (receipts / payments), so "hdfc" and "HDFC" must not both exist
const hasNameConflict = async (userId, name, excludeId = null) => {
  const filter = { userId, name: { $regex: `^${escapeRegex(name)}$`, $options: "i" } };
  if (excludeId) filter._id = { $ne: excludeId };
  return Boolean(await Bank.exists(filter));
};

const createBank = async (req, res) => {
  try {
    const name = normalizeBankName(req.body.name);
    if (!name) {
      return res.status(400).json({ message: "Account name is required" });
    }
    if (await hasNameConflict(req.userId, name)) {
      return res.status(409).json({ message: DUPLICATE_NAME_MESSAGE });
    }

    const bank = await Bank.create({
      userId: req.userId,
      name,
      type: isCashAccountName(name) ? "cash" : normalizeAccountType(req.body.type),
      totalBalance: toNumber(req.body.totalBalance),
      notes: String(req.body.notes || "").trim(),
    });

    return res.status(201).json({ data: bank });
  } catch (error) {
    if (isDuplicateNameError(error)) {
      return res.status(409).json({ message: DUPLICATE_NAME_MESSAGE });
    }
    return res.status(400).json({
      message: "Failed to create account",
      error: error.message,
    });
  }
};

const getAllBanks = async (req, res) => {
  try {
    await ensureCashAccount(req.userId);

    const normalizedSearch = String(req.query.search || "").trim();
    const filter = scopedFilter(req, normalizedSearch
      ? {
          name: { $regex: normalizedSearch, $options: "i" },
        }
      : {});

    const banks = await Bank.find(filter).sort({ name: 1, createdAt: -1 }).lean();
    return res.json({ data: banks.map((bank) => ({ ...bank, type: getAccountType(bank) })) });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch banks",
      error: error.message,
    });
  }
};

// Every account with its opening balance, money in / out and current balance
const getAccountsSummary = async (req, res) => {
  try {
    const { accounts, movements } = await loadAccountBook(req.userId);

    const totals = new Map(accounts.map((account) => [String(account._id), { moneyIn: 0, moneyOut: 0, entryCount: 0 }]));
    for (const movement of movements) {
      const row = totals.get(movement.accountId);
      if (movement.direction === "in") row.moneyIn += movement.amount;
      else row.moneyOut += movement.amount;
      row.entryCount += 1;
    }

    const rows = accounts.map((account) => {
      const { moneyIn, moneyOut, entryCount } = totals.get(String(account._id));
      const openingBalance = toNumber(account.totalBalance);
      return {
        _id: account._id,
        name: account.name,
        type: getAccountType(account),
        notes: account.notes || "",
        isDefault: isCashAccountName(account.name),
        openingBalance,
        moneyIn,
        moneyOut,
        entryCount,
        currentBalance: openingBalance + moneyIn - moneyOut,
      };
    });

    const sumBalance = (type) => rows
      .filter((row) => !type || row.type === type)
      .reduce((total, row) => total + row.currentBalance, 0);

    return res.json({
      accounts: rows,
      totalBalance: sumBalance(),
      cashBalance: sumBalance("cash"),
      bankBalance: sumBalance("bank"),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to load accounts",
      error: error.message,
    });
  }
};

// One account's entries for a period, each with the running balance
const getAccountLedger = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid account id" });
  }

  try {
    const fromDate = toDateBoundary(req.query.fromDate);
    const toDate = toDateBoundary(req.query.toDate, true);

    const { accounts, movements } = await loadAccountBook(req.userId);
    const account = accounts.find((item) => String(item._id) === String(id));
    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    let balance = toNumber(account.totalBalance);
    let openingBalance = balance;
    let moneyIn = 0;
    let moneyOut = 0;
    const entries = [];

    for (const movement of movements) {
      if (movement.accountId !== String(id)) continue;

      const date = new Date(movement.date);
      if (toDate && date > toDate) break;

      balance += movement.direction === "in" ? movement.amount : -movement.amount;
      if (fromDate && date < fromDate) {
        openingBalance = balance;
        continue;
      }

      if (movement.direction === "in") moneyIn += movement.amount;
      else moneyOut += movement.amount;

      entries.push({
        type: movement.type,
        refId: movement.refId,
        date: movement.date,
        number: movement.number,
        partyName: movement.partyName,
        notes: movement.notes,
        inAmount: movement.direction === "in" ? movement.amount : 0,
        outAmount: movement.direction === "out" ? movement.amount : 0,
        balance,
      });
    }

    return res.json({
      account: {
        _id: account._id,
        name: account.name,
        type: getAccountType(account),
        notes: account.notes || "",
        isDefault: isCashAccountName(account.name),
      },
      fromDate,
      toDate,
      openingBalance,
      moneyIn,
      moneyOut,
      closingBalance: openingBalance + moneyIn - moneyOut,
      entries,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to load account ledger",
      error: error.message,
    });
  }
};

const updateBank = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid bank id" });
  }

  try {
    const name = normalizeBankName(req.body.name);
    if (!name) {
      return res.status(400).json({ message: "Account name is required" });
    }

    const bank = await Bank.findOne(scopedIdFilter(req, id));
    if (!bank) {
      return res.status(404).json({ message: "Bank not found" });
    }

    const previousName = bank.name;
    const isCashAccount = isCashAccountName(previousName);
    const isRenamed = name !== previousName;
    if (isCashAccount && !isCashAccountName(name)) {
      return res.status(400).json({ message: "Cash Account cannot be renamed" });
    }
    if (isRenamed && await hasNameConflict(req.userId, name, bank._id)) {
      return res.status(409).json({ message: DUPLICATE_NAME_MESSAGE });
    }

    bank.name = name;
    bank.type = isCashAccount ? "cash" : normalizeAccountType(req.body.type || bank.type);
    bank.totalBalance = toNumber(req.body.totalBalance);
    bank.notes = String(req.body.notes || "").trim();
    await bank.save();

    // Receipts and payments keep the account name for display; carry a rename over to them
    if (isRenamed) {
      const linkedEntries = {
        userId: req.userId,
        $or: [
          { account: bank._id },
          { account: null, method: { $regex: `^${escapeRegex(previousName)}$`, $options: "i" } },
        ],
      };
      const update = { $set: { method: name, account: bank._id } };
      await Promise.all([
        Receipt.updateMany(linkedEntries, update),
        Payment.updateMany(linkedEntries, update),
      ]);
    }

    return res.json({ data: bank });
  } catch (error) {
    if (isDuplicateNameError(error)) {
      return res.status(409).json({ message: DUPLICATE_NAME_MESSAGE });
    }
    return res.status(400).json({
      message: "Failed to update account",
      error: error.message,
    });
  }
};

const deleteBank = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid bank id" });
  }

  try {
    const bank = await Bank.findOne(scopedIdFilter(req, id));

    if (!bank) {
      return res.status(404).json({ message: "Bank not found" });
    }

    if (isCashAccountName(bank.name)) {
      return res.status(400).json({ message: "Cash Account cannot be deleted" });
    }

    const { movements } = await loadAccountBook(req.userId);
    if (movements.some((movement) => movement.accountId === String(bank._id))) {
      return res.status(400).json({ message: "This account has entries, so it cannot be deleted" });
    }

    await Bank.deleteOne(scopedIdFilter(req, id));
    return res.json({ message: "Account deleted successfully" });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to delete account",
      error: error.message,
    });
  }
};

const createTransfer = async (req, res) => {
  try {
    const amount = toNumber(req.body.amount, NaN);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: "Valid amount is required" });
    }

    const { fromAccount, toAccount } = req.body;
    if (!mongoose.Types.ObjectId.isValid(fromAccount) || !mongoose.Types.ObjectId.isValid(toAccount)) {
      return res.status(400).json({ message: "Choose both accounts" });
    }
    if (String(fromAccount) === String(toAccount)) {
      return res.status(400).json({ message: "Choose two different accounts" });
    }

    const ownedAccounts = await Bank.countDocuments(scopedFilter(req, { _id: { $in: [fromAccount, toAccount] } }));
    if (ownedAccounts !== 2) {
      return res.status(404).json({ message: "Account not found" });
    }

    const transferDate = req.body.transferDate ? new Date(req.body.transferDate) : new Date();
    if (Number.isNaN(transferDate.getTime())) {
      return res.status(400).json({ message: "Valid date is required" });
    }

    const transfer = await AccountTransfer.create({
      userId: req.userId,
      fromAccount,
      toAccount,
      amount,
      transferDate,
      notes: String(req.body.notes || "").trim(),
    });

    return res.status(201).json({ data: transfer });
  } catch (error) {
    return res.status(400).json({
      message: "Failed to save transfer",
      error: error.message,
    });
  }
};

const deleteTransfer = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid transfer id" });
  }

  try {
    const transfer = await AccountTransfer.findOneAndDelete(scopedIdFilter(req, id));
    if (!transfer) {
      return res.status(404).json({ message: "Transfer not found" });
    }

    return res.json({ message: "Transfer deleted successfully" });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to delete transfer",
      error: error.message,
    });
  }
};

module.exports = {
  createBank,
  getAllBanks,
  getAccountsSummary,
  getAccountLedger,
  updateBank,
  deleteBank,
  createTransfer,
  deleteTransfer,
};
