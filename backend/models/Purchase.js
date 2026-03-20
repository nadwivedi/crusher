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
    supplierInvoice: {
      type: String,
      trim: true,
      default: "",
    },
    purchaseNumber: {
      type: Number,
      min: 1,
      required: true,
      unique: true,
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
    dueDate: {
      type: Date,
      default: null,
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

module.exports = mongoose.models.Purchase || mongoose.model("Purchase", purchaseSchema);
