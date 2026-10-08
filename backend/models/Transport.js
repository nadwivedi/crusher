const mongoose = require("mongoose");
const { TRANSPORT_BASES } = require("../utils/transportBasis");

const transportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    entryNumber: {
      type: String,
      trim: true,
      uppercase: true,
      required: true,
    },
    entryDate: {
      type: Date,
      default: Date.now,
    },
    // payable: I owe this party for their vehicle. receivable: this party owes me for my vehicle.
    direction: {
      type: String,
      enum: ["payable", "receivable"],
      required: true,
    },
    // "sale" entries are kept in step with their sale and cannot be edited on their own
    source: {
      type: String,
      enum: ["manual", "sale"],
      default: "manual",
    },
    saleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sales",
      default: null,
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
    basis: {
      type: String,
      enum: TRANSPORT_BASES,
      default: "fixed",
    },
    quantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    rate: {
      type: Number,
      default: 0,
      min: 0,
    },
    amount: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Period the rent covers, for daily / weekly / monthly entries
    fromDate: {
      type: Date,
      default: null,
    },
    toDate: {
      type: Date,
      default: null,
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

transportSchema.index({ userId: 1, entryNumber: 1 }, { unique: true });
transportSchema.index({ userId: 1, entryDate: -1, createdAt: -1 });
transportSchema.index({ userId: 1, saleId: 1 });

module.exports = mongoose.models.Transport || mongoose.model("Transport", transportSchema);
