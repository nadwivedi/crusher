const mongoose = require("mongoose");

const stockAdjustmentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    voucherNumber: {
      type: String,
      required: true,
      trim: true,
    },
    voucherDate: {
      type: Date,
      default: Date.now,
    },
    stockItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Stock",
      required: true,
    },
    stockItemName: {
      type: String,
      required: true,
      trim: true,
    },
    unit: {
      type: String,
      trim: true,
      default: "",
    },
    adjustmentType: {
      type: String,
      enum: ["add", "subtract"],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0.000001,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
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

stockAdjustmentSchema.index({ userId: 1, voucherDate: -1, createdAt: -1 });

module.exports = mongoose.models.StockAdjustment || mongoose.model("StockAdjustment", stockAdjustmentSchema);
