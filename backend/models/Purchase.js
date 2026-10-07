const mongoose = require("mongoose");

const purchaseItemSchema = new mongoose.Schema(
  {
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
      min: 1,
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

const purchaseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    supplierInvoice: {
      type: String,
      trim: true,
      default: "",
    },
    purchaseNumber: {
      type: Number,
      min: 1,
      required: true,
    },
    party: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Party",
      default: null,
    },
    items: {
      type: [purchaseItemSchema],
      default: [],
    },
    purchaseDate: {
      type: Date,
      default: Date.now,
    },
    invoiceLink: {
      type: String,
      trim: true,
      default: "",
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paidAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    // Cash / bank account the money moved through. Empty on older entries, which count under Cash Account.
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bank",
      default: null,
    },
    type: {
      type: String,
      enum: ["purchase", "cash purchase", "credit purchase"],
      default: "credit purchase",
      trim: true,
      lowercase: true,
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

purchaseSchema.index({ userId: 1, purchaseNumber: 1 }, { unique: true });
purchaseSchema.index({ userId: 1, purchaseDate: -1, createdAt: -1 });

module.exports = mongoose.models.Purchase || mongoose.model("Purchase", purchaseSchema);
