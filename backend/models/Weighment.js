const mongoose = require("mongoose");

// One weighbridge ticket (RST): the first and second weighing of a vehicle.
// Weights come from the device's last stable reading on the server; a typed weight is an owner override and is flagged.
const captureSchema = new mongoose.Schema(
  {
    weightKg: { type: Number, required: true, min: 0 },
    at: { type: Date, required: true },
    // device: read from the weighbridge; manual: typed by the owner; stored: the vehicle's saved tare
    source: { type: String, enum: ["device", "manual", "stored"], required: true },
    // The reading's own time, so a stale reading can be spotted later
    readingAt: { type: Date, default: null },
    by: {
      kind: { type: String, default: "" },
      id: { type: String, default: "" },
      name: { type: String, default: "" },
    },
    reason: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const weighmentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WeighbridgeDevice",
      default: null,
    },
    rstNo: {
      type: Number,
      required: true,
    },
    vehicleNo: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      default: null,
    },
    // sale: empty in, loaded out (first = tare). boulder: loaded in, empty out (first = gross).
    direction: {
      type: String,
      enum: ["sale", "boulder", "other"],
      default: "sale",
    },
    first: { type: captureSchema, required: true },
    second: { type: captureSchema, default: null },
    grossKg: { type: Number, default: 0, min: 0 },
    tareKg: { type: Number, default: 0, min: 0 },
    netKg: { type: Number, default: 0, min: 0 },
    // open: waiting for the second weight; closed: net known; used: turned into a sale or boulder entry
    status: {
      type: String,
      enum: ["open", "closed", "used", "cancelled"],
      default: "open",
    },
    closedAt: { type: Date, default: null },
    linkedSaleId: { type: mongoose.Schema.Types.ObjectId, ref: "Sales", default: null },
    linkedBoulderId: { type: mongoose.Schema.Types.ObjectId, ref: "Boulder", default: null },
    // Things the owner should look at: manual, stored_tare, tare_mismatch, short_stay
    flags: { type: [String], default: [] },
    note: { type: String, trim: true, default: "" },
    cancelReason: { type: String, trim: true, default: "" },
    // Tamper-evident chain over closed tickets of this account
    hash: { type: String, default: "" },
    prevHash: { type: String, default: "" },
  },
  {
    timestamps: true,
  }
);

weighmentSchema.index({ userId: 1, rstNo: 1 }, { unique: true });
weighmentSchema.index({ userId: 1, status: 1, createdAt: -1 });
weighmentSchema.index({ userId: 1, closedAt: -1 });

weighmentSchema.plugin(require("./plugins/audit"));

module.exports = mongoose.models.Weighment || mongoose.model("Weighment", weighmentSchema);
