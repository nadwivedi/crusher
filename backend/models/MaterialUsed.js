const mongoose = require("mongoose");

const materialUsedSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    vehicle: {
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
    // Where it went: a vehicle, the plant's DG set, or the plant / other.
    // Entries saved before this was asked have none: read them with usedForOf (utils/diesel).
    usedFor: {
      type: String,
      enum: ["vehicle", "dg", "other"],
    },
    materialType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Stock",
      required: true,
    },
    materialTypeName: {
      type: String,
      required: true,
      trim: true,
    },
    unit: {
      type: String,
      trim: true,
      default: "",
    },
    usedQty: {
      type: Number,
      required: true,
      min: 0.01,
    },
    usedDate: {
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

materialUsedSchema.index({ userId: 1, usedDate: -1, createdAt: -1 });

module.exports = mongoose.models.MaterialUsed || mongoose.model("MaterialUsed", materialUsedSchema);
