const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    party: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Party",
      default: null,
    },
    refType: {
      type: String,
      enum: ["purchase", "none"],
      default: "none",
      trim: true,
      lowercase: true,
    },
    refId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Purchase",
      default: null,
    },
    originPurchaseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Purchase",
      default: null,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    paymentNumber: {
      type: String,
      trim: true,
      required: true,
    },
    // Name of the account, kept for display. `account` below is what the account ledger uses.
    method: {
      type: String,
      trim: true,
      default: "Cash Account",
    },
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bank",
      default: null,
    },
    paymentDate: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    paymentSource: {
      type: String,
      enum: ["manual", "purchase-payment", "purchase-excess-payment"],
      default: "manual",
      trim: true,
      lowercase: true,
    },
  },
  {
    timestamps: true,
  }
);

paymentSchema.index({ userId: 1, paymentNumber: 1 }, { unique: true });
paymentSchema.index({ userId: 1, paymentDate: -1, createdAt: -1 });

module.exports = mongoose.models.Payment || mongoose.model("Payment", paymentSchema);
