const mongoose = require("mongoose");
const Expense = require("../models/Expense");
const ExpenseType = require("../models/ExpenseType");
const Purchase = require("../models/Purchase");
const Party = require("../models/Party");
const Counter = require("../models/Counter");

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeGoodsItems = (items = []) => (
  Array.isArray(items)
    ? items.map((item) => {
      const quantity = toNumber(item.quantity);
      const unitPrice = toNumber(item.unitPrice);
      return {
        expenseGroup: item.expenseGroup,
        quantity,
        unitPrice,
        total: toNumber(item.total, quantity * unitPrice),
      };
    }).filter((item) => item.expenseGroup)
    : []
);

const getExpenseYear = (expenseDateValue) => {
  const expenseDate = expenseDateValue ? new Date(expenseDateValue) : new Date();
  if (Number.isNaN(expenseDate.getTime())) {
    return new Date().getFullYear();
  }
  return expenseDate.getFullYear();
};

const createExpenseNumber = async (expenseDateValue) => {
  const expenseYear = getExpenseYear(expenseDateValue);
  const counterKey = `expenses:${expenseYear}`;
  const counter = await Counter.findOneAndUpdate(
    { key: counterKey },
    { $inc: { seq: 1 } },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );

  return `EXP-${expenseYear}-${String(counter.seq).padStart(2, "0")}`;
};

const createExpense = async (req, res) => {
  try {
    const {
      expenseGroup,
      party,
      amount,
      quantity,
      unit,
      unitPrice,
      method,
      expenseDate,
      notes,
    } = req.body;
    const userId = req.userId;
    const normalizedItems = normalizeGoodsItems(req.body.items);
    const hasGoodsItems = normalizedItems.length > 0;

    const amountNumber = toNumber(
      amount,
      hasGoodsItems
        ? normalizedItems.reduce((sum, item) => sum + toNumber(item.total), 0)
        : NaN
    );
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid amount is required",
      });
    }

    if (!expenseGroup && !hasGoodsItems) {
      return res.status(400).json({
        success: false,
        message: "Valid expense type is required",
      });
    }

    let existingExpenseType = null;
    if (expenseGroup && mongoose.isValidObjectId(expenseGroup)) {
      existingExpenseType = await ExpenseType.findOne({ _id: expenseGroup, userId });
    }

    if (expenseGroup && !existingExpenseType && !hasGoodsItems) {
      return res.status(404).json({
        success: false,
        message: "Expense type not found",
      });
    }

    const isGoodsExpense = hasGoodsItems || String(existingExpenseType?.type || "").toLowerCase() === "goods";
    const quantityNumber = quantity === undefined ? null : toNumber(quantity, NaN);
    const unitPriceNumber = unitPrice === undefined ? null : toNumber(unitPrice, NaN);
    let resolvedExpenseType = existingExpenseType;
    let goodsItems = [];

    if (hasGoodsItems) {
      const goodsItemIds = [...new Set(normalizedItems.map((item) => String(item.expenseGroup || "")))];
      if (goodsItemIds.some((id) => !mongoose.isValidObjectId(id))) {
        return res.status(400).json({
          success: false,
          message: "Valid expense type is required for each goods item",
        });
      }

      const goodsGroups = await ExpenseType.find({
        _id: { $in: goodsItemIds },
        userId,
      });
      const goodsGroupMap = new Map(goodsGroups.map((group) => [String(group._id), group]));

      if (goodsGroups.length !== goodsItemIds.length) {
        return res.status(400).json({
          success: false,
          message: "One or more expense types were not found",
        });
      }

      goodsItems = normalizedItems.map((item) => {
        const goodsGroup = goodsGroupMap.get(String(item.expenseGroup));
        if (!goodsGroup || String(goodsGroup.type || "").toLowerCase() !== "goods") {
          throw new Error(`Invalid goods expense type for item`);
        }

        if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
          throw new Error(`Valid quantity is required for ${goodsGroup.name}`);
        }

        if (!Number.isFinite(item.unitPrice) || item.unitPrice < 0) {
          throw new Error(`Valid unit price is required for ${goodsGroup.name}`);
        }

        if (toNumber(goodsGroup.currentStock) < item.quantity) {
          throw new Error(`Insufficient stock for ${goodsGroup.name}`);
        }

        return {
          expenseGroup: goodsGroup._id,
          expenseGroupName: goodsGroup.name,
          quantity: item.quantity,
          unit: String(goodsGroup.unit || "").trim(),
          unitPrice: item.unitPrice,
          total: toNumber(item.total, item.quantity * item.unitPrice),
          currentStock: toNumber(goodsGroup.currentStock),
        };
      });

      resolvedExpenseType = goodsGroupMap.get(String(goodsItems[0].expenseGroup));
    } else if (isGoodsExpense) {
      if (!Number.isFinite(quantityNumber) || quantityNumber <= 0) {
        return res.status(400).json({
          success: false,
          message: "Valid quantity is required for goods expense",
        });
      }

      if (!Number.isFinite(unitPriceNumber) || unitPriceNumber < 0) {
        return res.status(400).json({
          success: false,
          message: "Valid unit price is required for goods expense",
        });
      }

      if (!existingExpenseType) {
        return res.status(404).json({
          success: false,
          message: "Expense type not found",
        });
      }

      if (toNumber(existingExpenseType.currentStock) < quantityNumber) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${existingExpenseType.name}`,
        });
      }

      goodsItems = [{
        expenseGroup: existingExpenseType._id,
        expenseGroupName: existingExpenseType.name,
        quantity: quantityNumber,
        unit: String(unit || existingExpenseType.unit || "").trim(),
        unitPrice: unitPriceNumber,
        total: toNumber(amountNumber, quantityNumber * unitPriceNumber),
        currentStock: toNumber(existingExpenseType.currentStock),
      }];
    }

    let resolvedParty = null;
    if (party) {
      if (!mongoose.isValidObjectId(party)) {
        return res.status(400).json({
          success: false,
          message: "Invalid party id",
        });
      }

      const existingParty = await Party.findById(party);
      if (!existingParty) {
        return res.status(404).json({
          success: false,
          message: "Party not found",
        });
      }

      resolvedParty = existingParty._id;
    }

    if (!resolvedExpenseType) {
      return res.status(400).json({
        success: false,
        message: "Valid expense type is required",
      });
    }

    for (const item of goodsItems) {
      const nextStock = toNumber(item.currentStock) - toNumber(item.quantity);
      await ExpenseType.findByIdAndUpdate(item.expenseGroup, {
        $set: { currentStock: nextStock },
      });
    }

    const expense = await Expense.create({
      userId,
      expenseGroup: resolvedExpenseType._id,
      expenseNumber: await createExpenseNumber(expenseDate),
      party: resolvedParty,
      amount: amountNumber,
      quantity: goodsItems.length === 1 ? goodsItems[0].quantity : null,
      unit: goodsItems.length === 1 ? goodsItems[0].unit : "",
      unitPrice: goodsItems.length === 1 ? goodsItems[0].unitPrice : null,
      items: goodsItems.map(({ currentStock, ...item }) => item),
      method: method || "cash",
      expenseDate: expenseDate || new Date(),
      notes: String(notes || "").trim(),
    });

    const savedExpense = await Expense.findById(expense._id)
      .populate("expenseGroup", "name")
      .populate("items.expenseGroup", "name unit")
      .populate("party", "name type");

    return res.status(201).json({
      success: true,
      message: "Expense created successfully",
      data: savedExpense,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Error creating expense",
    });
  }
};

const getAllExpenses = async (req, res) => {
  try {
    const { search, fromDate, expenseGroup, expenseType, party } = req.query;
    const userId = req.userId;
    const filter = { userId };

    const resolvedExpenseTypeId = expenseType || expenseGroup;
    if (resolvedExpenseTypeId && mongoose.isValidObjectId(resolvedExpenseTypeId)) {
      filter.expenseGroup = resolvedExpenseTypeId;
    }

    if (party && mongoose.isValidObjectId(party)) {
      filter.party = party;
    }

    if (fromDate) {
      const parsedFromDate = new Date(fromDate);
      if (!Number.isNaN(parsedFromDate.getTime())) {
        filter.expenseDate = { $gte: parsedFromDate };
      }
    }

    let expenses = await Expense.find(filter)
      .populate("expenseGroup", "name")
      .populate("items.expenseGroup", "name unit")
      .populate("party", "name type")
      .sort({ expenseDate: -1, createdAt: -1 });

    if (!resolvedExpenseTypeId) {
      const purchaseFilter = { userId };
      if (party && mongoose.isValidObjectId(party)) {
        purchaseFilter.party = party;
      }
      if (fromDate) {
        const parsedFromDate = new Date(fromDate);
        if (!Number.isNaN(parsedFromDate.getTime())) {
          purchaseFilter.purchaseDate = { $gte: parsedFromDate };
        }
      }

      const purchases = await Purchase.find(purchaseFilter)
        .populate("party", "name")
        .sort({ purchaseDate: -1, createdAt: -1 });

      const normalizedPurchases = purchases.map((p) => ({
        _id: p._id,
        expenseNumber: `PUR-${p.purchaseNumber}`,
        expenseGroup: {
          name: p.items.length > 0
            ? `Purchase: ${p.items.map((i) => i.productName).join(", ")}`
            : "Purchase",
        },
        party: p.party,
        amount: p.totalAmount,
        method: p.type?.includes("cash") ? "cash" : "credit",
        expenseDate: p.purchaseDate,
        notes: p.notes,
        isPurchase: true,
      }));

      expenses = [...expenses, ...normalizedPurchases];
      expenses.sort((a, b) => new Date(b.expenseDate) - new Date(a.expenseDate));
    }

    if (search) {
      const normalizedSearch = String(search || "").trim().toLowerCase();
      expenses = expenses.filter((expense) => {
        const values = [
          expense.expenseNumber,
          expense.expenseGroup?.name,
          ...(Array.isArray(expense.items) ? expense.items.map((item) => item.expenseGroupName) : []),
          expense.party?.name,
          expense.method,
          expense.notes,
        ];

        return values.some((value) => String(value || "").toLowerCase().includes(normalizedSearch));
      });
    }

    return res.status(200).json({
      success: true,
      count: expenses.length,
      data: expenses,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Error fetching expenses",
    });
  }
};

module.exports = {
  createExpense,
  getAllExpenses,
};
