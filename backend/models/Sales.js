const mongoose = require("mongoose");

const salesSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
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
      required: true,
      trim: true,
      uppercase: true,
    },
    invoiceNumber: {
      type: String,
      sparse: true,
      trim: true,
      uppercase: true,
    },
    saleDate: {
      type: Date,
      default: Date.now,
    },
    entryTime: {
      type: String,
      trim: true,
      default: "",
    },
    exitTime: {
      type: String,
      trim: true,
      default: "",
    },
    stoneSize: {
      type: String,
      required: true,
      enum: ["60mm", "40mm", "20mm", "10mm", "6mm", "4mm", "dust", "wmm", "gsb"],
      lowercase: true,
      trim: true,
    },

    grossWeight: {
      type: Number,
      default: 0,
      min: 0,
    },

    tareWeight: {
      type: Number,
      default: 0,
      min: 0,
    },

    netWeight: {
      type: Number,
      default: 0,
      min: 0,
    },
    pricingMode: {
      type: String,
      enum: ["per_ton", "per_cubic_meter"],
      default: "per_ton",
      trim: true,
    },
    cubicMeterQty: {
      type: Number,
      default: 0,
      min: 0,
    },
    rate: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Cash / bank account the money moved through. Empty on older entries, which count under Cash Account.
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bank",
      default: null,
    },
    type: {
      type: String,
      enum: ["cash", "credit", "partial"],
      default: "credit",
      trim: true,
    },
    slipImg: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

salesSchema.index({ userId: 1, invoiceNumber: 1 }, { unique: true, sparse: true });
salesSchema.index({ userId: 1, saleDate: -1, createdAt: -1 });

module.exports = mongoose.models.Sales || mongoose.model("Sales", salesSchema);
