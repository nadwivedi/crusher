const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
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
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    paymentNumber: {
      type: Number,
      min: 1,
      required: true,
      unique: true,
    },
    method: {
      type: String,
      trim: true,
      default: "Cash Account",
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
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.Payment || mongoose.model("Payment", paymentSchema);
