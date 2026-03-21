const mongoose = require("mongoose");

const receiptSchema = new mongoose.Schema(
  {
    party: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Party",
      default: null,
    },
    refType: {
      type: String,
      enum: ["sale", "none"],
      default: "none",
      trim: true,
      lowercase: true,
    },
    refId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sales",
      default: null,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    receiptNumber: {
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
    receiptDate: {
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

module.exports = mongoose.models.Receipt || mongoose.model("Receipt", receiptSchema);
