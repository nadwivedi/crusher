const mongoose = require("mongoose");
const Bank = require("../models/Bank");
const AccountTransfer = require("../models/AccountTransfer");
const Expense = require("../models/Expense");
const Payment = require("../models/Payment");
const Purchase = require("../models/Purchase");
const Receipt = require("../models/Receipt");
const Sales = require("../models/Sales");

const CASH_ACCOUNT_NAME = "Cash Account";

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeName = (value) => String(value || "").trim().toLowerCase();
const isCashAccountName = (value) => normalizeName(value) === normalizeName(CASH_ACCOUNT_NAME);
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Older accounts have no type saved; Cash Account is the only one that must be cash.
const getAccountType = (account) => (
  isCashAccountName(account?.name) ? "cash" : (account?.type === "cash" ? "cash" : "bank")
);

const ensureCashAccount = async (userId) => {
  const existingCashAccount = await Bank.findOne({
    userId,
    name: { $regex: `^${CASH_ACCOUNT_NAME}$`, $options: "i" },
  });

  if (existingCashAccount) return existingCashAccount;

  return Bank.create({
    userId,
    name: CASH_ACCOUNT_NAME,
    type: "cash",
    totalBalance: 0,
    notes: "",
  });
};

/** The user's own account for an id sent by the client, or null when the id is missing or not theirs. */
const resolveAccountId = async (userId, accountId) => {
  if (!accountId || !mongoose.Types.ObjectId.isValid(accountId)) return null;
  const account = await Bank.findOne({ _id: accountId, userId }).select("_id");
  return account ? account._id : null;
};

/** Receipts and payments send the account's name as `method`; find the account by id first, then by that name. */
const resolveAccountByIdOrName = async (userId, accountId, name) => {
  if (accountId && mongoose.Types.ObjectId.isValid(accountId)) {
    const account = await Bank.findOne({ _id: accountId, userId });
    if (account) return account;
  }

  const normalized = String(name || "").trim();
  if (!normalized) return null;
  return Bank.findOne({ userId, name: { $regex: `^${escapeRegex(normalized)}$`, $options: "i" } });
};

const formatNumber = (prefix, value) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return "";
  return `${prefix}-${String(parsed).padStart(2, "0")}`;
};

const formatPaymentNumber = (value) => {
  const normalized = String(value || "").trim();
  if (/^PAY-\d{4}-\d{2,}$/i.test(normalized)) return normalized.toUpperCase();
  return formatNumber("PAY", value);
};

/**
 * Every movement of money through the user's accounts, oldest first.
 * Money moves when a sale / purchase / expense is paid at entry, on receipts and payments, and on transfers.
 * Entries saved before accounts existed have no account and are counted under Cash Account,
 * except receipts / payments whose saved account name still matches an account.
 */
const loadAccountBook = async (userId) => {
  await ensureCashAccount(userId);

  const [accounts, sales, purchases, expenses, receipts, payments, transfers] = await Promise.all([
    Bank.find({ userId }).lean(),
    Sales.find({ userId, paidAmount: { $gt: 0 } })
      .select("account paidAmount saleDate createdAt invoiceNumber partyId vehicleNo")
      .populate("partyId", "name")
      .lean(),
    Purchase.find({ userId, paidAmount: { $gt: 0 } })
      .select("account paidAmount purchaseDate createdAt purchaseNumber party notes")
      .populate("party", "name")
      .lean(),
    Expense.find({ userId })
      .select("account amount paidAmount expenseDate createdAt expenseNumber party expenseGroup notes")
      .populate("party", "name type")
      .populate("expenseGroup", "name")
      .lean(),
    Receipt.find({ userId })
      .select("account method amount receiptDate createdAt receiptNumber party notes")
      .populate("party", "name")
      .lean(),
    Payment.find({ userId })
      .select("account method amount paymentDate createdAt paymentNumber party notes")
      .populate("party", "name")
      .lean(),
    AccountTransfer.find({ userId }).lean(),
  ]);

  // Cash Account first, then by name
  accounts.sort((a, b) => (
    Number(isCashAccountName(b.name)) - Number(isCashAccountName(a.name))
    || String(a.name).localeCompare(String(b.name))
  ));

  const cashAccountId = String(accounts.find((account) => isCashAccountName(account.name))._id);
  const accountIds = new Set(accounts.map((account) => String(account._id)));
  const accountIdByName = new Map(accounts.map((account) => [normalizeName(account.name), String(account._id)]));
  const accountNameById = new Map(accounts.map((account) => [String(account._id), account.name]));

  const resolve = (accountId, methodName) => {
    const id = accountId ? String(accountId) : "";
    if (id && accountIds.has(id)) return id;
    if (methodName) {
      const byName = accountIdByName.get(normalizeName(methodName));
      if (byName) return byName;
    }
    return cashAccountId;
  };

  const movements = [];
  const add = (movement) => {
    if (movement.amount > 0) movements.push(movement);
  };

  for (const sale of sales) {
    add({
      accountId: resolve(sale.account),
      type: "sale",
      direction: "in",
      amount: toNumber(sale.paidAmount),
      date: sale.saleDate || sale.createdAt,
      createdAt: sale.createdAt,
      refId: sale._id,
      number: sale.invoiceNumber || "",
      partyName: sale.partyId?.name || "",
      notes: sale.vehicleNo ? `Vehicle ${sale.vehicleNo}` : "",
    });
  }

  for (const receipt of receipts) {
    add({
      accountId: resolve(receipt.account, receipt.method),
      type: "receipt",
      direction: "in",
      amount: toNumber(receipt.amount),
      date: receipt.receiptDate || receipt.createdAt,
      createdAt: receipt.createdAt,
      refId: receipt._id,
      number: formatNumber("REC", receipt.receiptNumber),
      partyName: receipt.party?.name || "",
      notes: receipt.notes || "",
    });
  }

  for (const purchase of purchases) {
    add({
      accountId: resolve(purchase.account),
      type: "purchase",
      direction: "out",
      amount: toNumber(purchase.paidAmount),
      date: purchase.purchaseDate || purchase.createdAt,
      createdAt: purchase.createdAt,
      refId: purchase._id,
      number: formatNumber("PUR", purchase.purchaseNumber),
      partyName: purchase.party?.name || "",
      notes: purchase.notes || "",
    });
  }

  for (const payment of payments) {
    add({
      accountId: resolve(payment.account, payment.method),
      type: "payment",
      direction: "out",
      amount: toNumber(payment.amount),
      date: payment.paymentDate || payment.createdAt,
      createdAt: payment.createdAt,
      refId: payment._id,
      number: formatPaymentNumber(payment.paymentNumber),
      partyName: payment.party?.name || "",
      notes: payment.notes || "",
    });
  }

  for (const expense of expenses) {
    // What the money was spent on, plus who it was paid to unless that is just the cash party
    const paidTo = expense.party && expense.party.type !== "cash-in-hand" ? expense.party.name : "";
    add({
      accountId: resolve(expense.account),
      type: "expense",
      direction: "out",
      // Older expenses have no paidAmount and were fully paid
      amount: expense.paidAmount == null ? toNumber(expense.amount) : toNumber(expense.paidAmount),
      date: expense.expenseDate || expense.createdAt,
      createdAt: expense.createdAt,
      refId: expense._id,
      number: expense.expenseNumber || "",
      partyName: [expense.expenseGroup?.name, paidTo].filter(Boolean).join(" · "),
      notes: expense.notes || "",
    });
  }

  for (const transfer of transfers) {
    const fromId = resolve(transfer.fromAccount);
    const toId = resolve(transfer.toAccount);
    const base = {
      type: "transfer",
      amount: toNumber(transfer.amount),
      date: transfer.transferDate || transfer.createdAt,
      createdAt: transfer.createdAt,
      refId: transfer._id,
      number: "",
      notes: transfer.notes || "",
    };
    add({ ...base, accountId: fromId, direction: "out", partyName: `To ${accountNameById.get(toId)}` });
    add({ ...base, accountId: toId, direction: "in", partyName: `From ${accountNameById.get(fromId)}` });
  }

  movements.sort((a, b) => (
    new Date(a.date) - new Date(b.date) || new Date(a.createdAt) - new Date(b.createdAt)
  ));

  return { accounts, movements };
};

module.exports = {
  CASH_ACCOUNT_NAME,
  isCashAccountName,
  escapeRegex,
  getAccountType,
  ensureCashAccount,
  resolveAccountId,
  resolveAccountByIdOrName,
  loadAccountBook,
};
