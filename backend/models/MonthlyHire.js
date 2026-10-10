const mongoose = require("mongoose");

/**
 * A vehicle on monthly rent: hired from a party (payable) or my vehicle given to a party (receivable).
 * Each finished month is booked as a transport entry, so the party ledger shows what is owed.
 */
const monthlyHireSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    direction: {
      type: String,
      enum: ["payable", "receivable"],
      default: "payable",
    },
    partyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Party",
      required: true,
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      default: null,
    },
    vehicleNo: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },
    monthlyRate: {
      type: Number,
      required: true,
      min: 0,
    },
    startDate: {
      type: Date,
      required: true,
    },
    // Last day of the hire, when agreed up front. Empty: it runs until cancelled.
    endDate: {
      type: Date,
      default: null,
    },
    // Last day the vehicle was used when the hire was stopped early
    cancelledAt: {
      type: Date,
      default: null,
    },
    /**
     * How the days after the last full month are charged on cancel:
     * prorata: the days used. full: a full month. none: nothing (e.g. the vehicle broke down). custom: cancelAmount.
     */
    cancelCharge: {
      type: String,
      enum: ["prorata", "full", "none", "custom"],
      default: "prorata",
    },
    cancelAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Changes to one month's charge: days the vehicle did not work, or an amount off or on top
    adjustments: [
      {
        date: { type: Date, required: true },
        kind: { type: String, enum: ["off_days", "deduct", "extra"], required: true },
        days: { type: Number, default: 0, min: 0 },
        amount: { type: Number, default: 0, min: 0 },
        note: { type: String, trim: true, default: "" },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    // What was done to the hire and when: started, changed, cancelled, resumed, adjusted
    history: [
      {
        _id: false,
        at: { type: Date, default: Date.now },
        action: { type: String, trim: true },
        note: { type: String, trim: true, default: "" },
      },
    ],
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

monthlyHireSchema.index({ userId: 1, startDate: -1 });

module.exports = mongoose.models.MonthlyHire || mongoose.model("MonthlyHire", monthlyHireSchema);
