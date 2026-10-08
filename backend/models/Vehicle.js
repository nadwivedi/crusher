const mongoose = require("mongoose");
const { TRANSPORT_BASES } = require("../utils/transportBasis");

const vehicleSchema = new mongoose.Schema(
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
    vehicleNo: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    // Empty weight in kg. 0 when not known.
    unladenWeight: {
      type: Number,
      default: 0,
      min: 0,
    },
    capacityCubicMeter: {
      type: Number,
      default: 0,
      min: 0,
    },
    vehicleType: {
      type: String,
      enum: ["boulder", "sales"],
      default: "sales",
    },
    // party: the party's own vehicle. own: my vehicle (no party). hired: partyId is the transporter it is hired from.
    ownership: {
      type: String,
      enum: ["party", "own", "hired"],
      default: "party",
    },
    // What I pay the transporter for a hired vehicle
    hireBasis: {
      type: String,
      enum: TRANSPORT_BASES,
      default: "per_ton",
    },
    hireRate: {
      type: Number,
      default: 0,
      min: 0,
    },
    rcImg: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

vehicleSchema.index({ userId: 1, vehicleNo: 1 }, { unique: true });
vehicleSchema.index({ userId: 1, vehicleType: 1, createdAt: -1 });

module.exports = mongoose.models.Vehicle || mongoose.model("Vehicle", vehicleSchema);
