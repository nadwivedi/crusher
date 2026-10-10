const mongoose = require("mongoose");

const purchaseReturnItemSchema = new mongoose.Schema(
  {
    // Purchase items have no _id, so a returned line points at its position in purchase.items
    purchaseItemId: {
      type: String,
      required: true,
      trim: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Stock",
      required: true,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    unit: {
      type: String,
      default: "",
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

const purchaseReturnSchema = new mongoose.Schema(
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
    purchase: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Purchase",
      required: true,
    },
    party: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Party",
      default: null,
    },
    items: {
      type: [purchaseReturnItemSchema],
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

purchaseReturnSchema.index({ userId: 1, voucherDate: -1, createdAt: -1 });
purchaseReturnSchema.index({ userId: 1, purchase: 1 });

module.exports = mongoose.models.PurchaseReturn || mongoose.model("PurchaseReturn", purchaseReturnSchema);
