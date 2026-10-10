const mongoose = require("mongoose");
const { TRANSPORT_BASES, TRIP_RATES_FIELD } = require("../utils/transportBasis");

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
    // What kind of vehicle it is. Empty on vehicles saved before this was asked.
    category: {
      type: String,
      enum: ["", "truck", "hyva", "jcb", "loader", "tractor", "pc", "other"],
      default: "",
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
    // How a hired vehicle is paid; empty when no rate is set
    hireBasis: {
      type: String,
      enum: ["", ...TRANSPORT_BASES],
      default: "",
    },
    hireRate: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Per-trip hire: what one trip to each location costs
    tripRates: TRIP_RATES_FIELD,
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
