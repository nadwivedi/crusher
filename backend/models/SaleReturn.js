const mongoose = require("mongoose");

// A sale is one material at one rate, so a return has a single line. It is kept as an
// items array to match purchase returns and the return screens.
const saleReturnItemSchema = new mongoose.Schema(
  {
    saleItemId: {
      type: String,
      required: true,
      trim: true,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    // "ton" or "m3", following the sale's pricing mode
    unit: {
      type: String,
      default: "ton",
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0.000001,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const saleReturnSchema = new mongoose.Schema(
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
    sale: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sales",
      required: true,
    },
    party: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Party",
      default: null,
    },
    pricingMode: {
      type: String,
      enum: ["per_ton", "per_cubic_meter"],
      default: "per_ton",
    },
    items: {
      type: [saleReturnItemSchema],
      default: [],
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
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

saleReturnSchema.index({ userId: 1, voucherDate: -1, createdAt: -1 });
saleReturnSchema.index({ userId: 1, sale: 1 });

module.exports = mongoose.models.SaleReturn || mongoose.model("SaleReturn", saleReturnSchema);
