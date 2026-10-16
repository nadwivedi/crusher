const mongoose = require("mongoose");

const normalizeNonNegativeNumber = (value) => {
  if (value === "" || value === null || value === undefined) return 0;
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : 0;
};

const stockSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
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
    // The account's default Diesel item, created at signup. The diesel report follows this item.
    isDiesel: {
      type: Boolean,
      default: false,
    },
    // Given to vehicles and the DG set (diesel, engine oil, filters). Off for plant items like a motor or a
    // conveyor belt: Material Used then records them at the plant without asking for a vehicle.
    usedInVehicle: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

stockSchema.index({ userId: 1, name: 1 });

// Who added and last changed each entry
stockSchema.plugin(require("./plugins/audit"));

module.exports = mongoose.models.Stock || mongoose.model("Stock", stockSchema);
