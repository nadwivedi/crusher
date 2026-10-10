const mongoose = require("mongoose");

const getCurrentTime = () => {
  const now = new Date();
  const hours = `${now.getHours()}`.padStart(2, "0");
  const minutes = `${now.getMinutes()}`.padStart(2, "0");
  return `${hours}:${minutes}`;
};

const boulderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    partyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Party",
      default: null,
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
    },
    vehicleNo: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    partyName: {
      type: String,
      trim: true,
      default: "",
    },
    boulderNumber: {
      type: String,
      trim: true,
      uppercase: true,
      sparse: true,
    },
    entryMode: {
      type: String,
      enum: ["single", "bulk"],
      default: "single",
    },
    tripCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    averageWeight: {
      type: Number,
      default: 0,
      min: 0,
    },
    grossWeight: {
      type: Number,
      required: true,
      min: 0,
    },
    tareWeight: {
      type: Number,
      required: true,
      min: 0,
    },
    netWeight: {
      type: Number,
      required: true,
      min: 0,
    },
    // Rates copied from the supplier when the entry is saved
    boulderRateBasis: {
      type: String,
      enum: ["per_ton", "per_trip"],
      default: "per_ton",
    },
    boulderRatePerTon: {
      type: Number,
      default: 0,
      min: 0,
    },
    boulderRatePerTrip: {
      type: Number,
      default: 0,
      min: 0,
    },
    boulderAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    transportRateBasis: {
      type: String,
      enum: ["per_ton", "per_trip"],
      default: "per_ton",
    },
    transportRate: {
      type: Number,
      default: 0,
      min: 0,
    },
    transportAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    // What I owe the supplier: boulder plus transport
    amount: {
      type: Number,
      default: 0,
      min: 0,
    },
    boulderDate: {
      type: Date,
      default: Date.now,
    },
    entryTime: {
      type: String,
      trim: true,
      default: getCurrentTime,
    },
    exitTime: {
      type: String,
      trim: true,
      default: getCurrentTime,
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

boulderSchema.index({ userId: 1, boulderNumber: 1 }, { unique: true, sparse: true });
boulderSchema.index({ userId: 1, boulderDate: -1, createdAt: -1 });

module.exports = mongoose.models.Boulder || mongoose.model("Boulder", boulderSchema);
