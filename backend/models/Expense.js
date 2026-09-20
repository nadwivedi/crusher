const mongoose = require("mongoose");

const expenseItemSchema = new mongoose.Schema(
  {
    expenseGroup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExpenseType",
      required: true,
      alias: "expenseType",
    },
    expenseGroupName: {
      type: String,
      trim: true,
      default: "",
      alias: "expenseTypeName",
    },
    quantity: {
      type: Number,
      default: null,
    },
    unit: {
      type: String,
      trim: true,
      default: "",
    },
    unitPrice: {
      type: Number,
      default: null,
    },
    total: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const expenseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    expenseGroup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExpenseType",
      required: true,
      alias: "expenseType",
    },
    expenseNumber: {
      type: String,
      trim: true,
      default: "",
    },
    party: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Party",
      default: null,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    // Amount actually paid now. Missing on older records, which were fully paid.
    paidAmount: {
      type: Number,
      min: 0,
      default: null,
    },
    items: {
      type: [expenseItemSchema],
      default: [],
    },
    method: {
      type: String,
      enum: ["cash", "bank", "upi", "card", "credit", "other"],
      default: "cash",
      trim: true,
      lowercase: true,
    },
    expenseDate: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Expense || mongoose.model("Expense", expenseSchema);
