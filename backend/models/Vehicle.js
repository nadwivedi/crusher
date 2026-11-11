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
    // Last tare read on the weighbridge, for single weighing and tare checks
    lastTareKg: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastTareAt: {
      type: Date,
      default: null,
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
    // Its meter counts KM or hours. Empty on vehicles saved before this was asked: those go by their type (utils/diesel).
    meterUnit: {
      type: String,
      enum: ["", "km", "hr"],
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
    // RC details fetched from the RTO (RTO Sarthi) for my own vehicle: owner, model, chassis, validity dates...
    // Keys are the RTO's field names (OWNER_NAME, MAKER_MODEL, INSURANCE_UPTO...). rcFetchedFor is the number looked up.
    rcDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: undefined,
    },
    rcFetchedAt: {
      type: Date,
      default: null,
    },
    rcFetchedFor: {
      type: String,
      default: "",
    },
    // pending: a new own vehicle's background RTO lookup has not finished; failed: it did not work (rcFetchError says why)
    rcFetchStatus: {
      type: String,
      enum: ["", "pending", "failed"],
      default: "",
    },
    rcFetchError: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

vehicleSchema.index({ userId: 1, vehicleNo: 1 }, { unique: true });
vehicleSchema.index({ userId: 1, vehicleType: 1, createdAt: -1 });

// Who added and last changed each entry
vehicleSchema.plugin(require("./plugins/audit"));

module.exports = mongoose.models.Vehicle || mongoose.model("Vehicle", vehicleSchema);
