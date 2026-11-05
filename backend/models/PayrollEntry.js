const mongoose = require("mongoose");

// salary / advance: money paid out (each makes a linked "Salary" expense from a cash / bank account)
// bonus / deduction: added to or cut from what the worker earned that month, no money moves
const PAYROLL_ENTRY_TYPES = ["salary", "advance", "bonus", "deduction"];
const MONEY_TYPES = ["salary", "advance"];

const payrollEntrySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PayrollEmployee",
      required: true,
    },
    type: {
      type: String,
      enum: PAYROLL_ENTRY_TYPES,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    // Day it was paid / given
    date: {
      type: Date,
      required: true,
    },
    // Salary month it belongs to, "YYYY-MM" (salary for October is often paid in November)
    monthKey: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}$/,
    },
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bank",
      default: null,
    },
    // The expense that moves the money out of the account (salary and advance only)
    expense: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Expense",
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

payrollEntrySchema.index({ userId: 1, monthKey: 1 });
payrollEntrySchema.index({ userId: 1, employee: 1, monthKey: 1 });

payrollEntrySchema.plugin(require("./plugins/audit"));

const PayrollEntry = mongoose.models.PayrollEntry || mongoose.model("PayrollEntry", payrollEntrySchema);
PayrollEntry.PAYROLL_ENTRY_TYPES = PAYROLL_ENTRY_TYPES;
PayrollEntry.MONEY_TYPES = MONEY_TYPES;

module.exports = PayrollEntry;
