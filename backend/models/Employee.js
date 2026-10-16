const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    mobile: {
      type: String,
      required: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      trim: true,
      select: false,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    permissions: {
      view: { type: Boolean, default: true },
      add: { type: Boolean, default: false },
      edit: { type: Boolean, default: false },
    },
    // Parts of the app this login can use; a missing key means allowed (staff made before this existed)
    sections: {
      boulder: { type: Boolean, default: true },
      sales: { type: Boolean, default: true },
      purchases: { type: Boolean, default: true },
      receipts: { type: Boolean, default: true },
      payments: { type: Boolean, default: true },
      expenses: { type: Boolean, default: true },
      materialUsed: { type: Boolean, default: true },
      meterReadings: { type: Boolean, default: true },
      masters: { type: Boolean, default: true },
    },
    // Language the app shows for this login: "en" (default) or "hi"; kept here so it follows them to any device
    language: {
      type: String,
      enum: ["en", "hi"],
      default: "en",
    },
    historyLimitDays: {
      type: mongoose.Mixed, // Can be a Number (7, 28, 90, 365) or "all"
      default: 7, 
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure mobile numbers are unique only within the scope of one owner's employees,
// wait actually, login happens via mobile, so mobile should probably be globally unique for employees 
// to quickly know who they are when they login on the staff tab without entering the owner ID.
employeeSchema.index({ mobile: 1 }, { unique: true });
employeeSchema.index({ ownerId: 1 });

module.exports = mongoose.models.Employee || mongoose.model("Employee", employeeSchema);
