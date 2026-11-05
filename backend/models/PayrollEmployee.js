const mongoose = require("mongoose");

// A worker on the crusher's payroll (supervisor, operator, driver, loader...). Not an app login: those are Employee.
const payrollEmployeeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    mobile: {
      type: String,
      trim: true,
      default: "",
    },
    // Work they do, e.g. Supervisor, Driver, Loader
    role: {
      type: String,
      trim: true,
      default: "",
    },
    // monthly: rate is the salary for a month (earned per day worked: rate / days in that month)
    // daily: rate is the wage for one day worked
    salaryType: {
      type: String,
      enum: ["monthly", "daily"],
      default: "monthly",
    },
    rate: {
      type: Number,
      required: true,
      min: 0,
    },
    // Pay for one hour of overtime; 0 means no overtime pay
    overtimeRate: {
      type: Number,
      default: 0,
      min: 0,
    },
    joiningDate: {
      type: Date,
      default: null,
    },
    // Salary still owed to them when they were added (negative: advance they still had to work off)
    openingBalance: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    leftDate: {
      type: Date,
      default: null,
    },
    // Bank account / UPI for paying salary, Aadhaar no. or anything else to remember
    bankDetails: {
      type: String,
      trim: true,
      default: "",
    },
    address: {
      type: String,
      trim: true,
      default: "",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

payrollEmployeeSchema.index({ userId: 1, isActive: -1, name: 1 });

payrollEmployeeSchema.plugin(require("./plugins/audit"));

module.exports = mongoose.models.PayrollEmployee || mongoose.model("PayrollEmployee", payrollEmployeeSchema);
