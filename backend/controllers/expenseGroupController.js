const mongoose = require("mongoose");
const ExpenseGroup = require("../models/ExpenseGroup");
const Expense = require("../models/Expense");

const isDuplicateExpenseGroupNameError = (error) => (
  error?.code === 11000 && (
    Object.prototype.hasOwnProperty.call(error?.keyPattern || {}, "userId") ||
    Object.prototype.hasOwnProperty.call(error?.keyValue || {}, "name")
  )
);

const createExpenseGroup = async (req, res) => {
  try {
    const { name, description } = req.body;
    const userId = req.userId;

    if (!String(name || "").trim()) {
      return res.status(400).json({
        success: false,
        message: "Expense group name is required",
      });
    }

    const expenseGroup = await ExpenseGroup.create({
      userId,
      name: String(name || "").trim(),
      description: String(description || "").trim(),
    });

    return res.status(201).json({
      success: true,
      message: "Expense group created successfully",
      data: expenseGroup,
    });
  } catch (error) {
    if (isDuplicateExpenseGroupNameError(error)) {
      return res.status(400).json({
        success: false,
        message: "Expense group name already exists for this user",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Error creating expense group",
    });
  }
};

const getAllExpenseGroups = async (req, res) => {
  try {
    const { search } = req.query;
    const userId = req.userId;
    const filter = { userId };

    if (search) {
      const searchRegex = { $regex: search, $options: "i" };
      filter.$or = [
        { name: searchRegex },
        { description: searchRegex },
      ];
    }

    const expenseGroups = await ExpenseGroup.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: expenseGroups.length,
      data: expenseGroups,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Error fetching expense groups",
    });
  }
};

const updateExpenseGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const { name, description } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid expense group id is required",
      });
    }

    if (!String(name || "").trim()) {
      return res.status(400).json({
        success: false,
        message: "Expense group name is required",
      });
    }

    const expenseGroup = await ExpenseGroup.findOneAndUpdate(
      { _id: id, userId },
      {
        name: String(name || "").trim(),
        description: String(description || "").trim(),
      },
      { new: true, runValidators: true }
    );

    if (!expenseGroup) {
      return res.status(404).json({
        success: false,
        message: "Expense group not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Expense group updated successfully",
      data: expenseGroup,
    });
  } catch (error) {
    if (isDuplicateExpenseGroupNameError(error)) {
      return res.status(400).json({
        success: false,
        message: "Expense group name already exists for this user",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Error updating expense group",
    });
  }
};

const deleteExpenseGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid expense group id is required",
      });
    }

    const expenseGroup = await ExpenseGroup.findOne({ _id: id, userId });
    if (!expenseGroup) {
      return res.status(404).json({
        success: false,
        message: "Expense group not found",
      });
    }

    const linkedExpenses = await Expense.countDocuments({ userId, expenseGroup: id });
    if (linkedExpenses > 0) {
      return res.status(400).json({
        success: false,
        message: "This expense group is used in expenses. Cannot delete.",
      });
    }

    await ExpenseGroup.deleteOne({ _id: id, userId });

    return res.status(200).json({
      success: true,
      message: "Expense group deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Error deleting expense group",
    });
  }
};

module.exports = {
  createExpenseGroup,
  getAllExpenseGroups,
  updateExpenseGroup,
  deleteExpenseGroup,
};
