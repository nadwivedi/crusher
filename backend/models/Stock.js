const mongoose = require("mongoose");

const normalizeNonNegativeNumber = (value) => {
  if (value === "" || value === null || value === undefined) return 0;
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : 0;
};

const stockSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    unit: {
      type: String,
      default: "pcs",
      trim: true,
    },
    currentStock: {
      type: Number,
      default: 0,
      min: 0,
      set: normalizeNonNegativeNumber,
    },
    taxRate: {
      type: Number,
      default: 0,
      min: 0,
      set: normalizeNonNegativeNumber,
    },
    typeOfSupply: {
      type: String,
      enum: ["goods", "services"],
      default: "goods",
      lowercase: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

stockSchema.index({ name: 1 });

module.exports = mongoose.models.Stock || mongoose.model("Stock", stockSchema);
