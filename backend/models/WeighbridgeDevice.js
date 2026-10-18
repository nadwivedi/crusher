const mongoose = require("mongoose");

// One weighbridge (kanta) at the plant and how its indicator is read.
// Phase 1 reads it in Chrome / Edge on the cabin computer (Web Serial); the same device later takes an agent or a Wi-Fi box.
const weighbridgeDeviceSchema = new mongoose.Schema(
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
      default: "Kanta 1",
    },
    sourceType: {
      type: String,
      enum: ["browser", "agent", "iot"],
      default: "browser",
    },
    // Serial port settings, chosen in the indicator's menu
    baudRate: { type: Number, default: 9600 },
    dataBits: { type: Number, enum: [7, 8], default: 8 },
    parity: { type: String, enum: ["none", "even", "odd"], default: "none" },
    stopBits: { type: Number, enum: [1, 2], default: 1 },
    // How the indicator's text is read (see frontend/src/utils/weighbridgeParser.js)
    profile: {
      type: String,
      enum: ["avery", "stx", "xk3190", "plain", "custom"],
      default: "avery",
    },
    unit: { type: String, enum: ["kg", "quintal", "ton"], default: "kg" },
    multiplier: { type: Number, default: 1 },
    customRegex: { type: String, trim: true, default: "(\\d+)" },
    // Stable when readings stay within toleranceKg for stableMs; below minWeightKg the bridge counts as empty
    stableMs: { type: Number, default: 2000, min: 500 },
    toleranceKg: { type: Number, default: 20, min: 0 },
    minWeightKg: { type: Number, default: 500, min: 0 },
    // Warn when a vehicle's tare differs from its last tare by more than this
    tareAlertKg: { type: Number, default: 300, min: 0 },
    lastSeenAt: { type: Date, default: null },
    lastReading: {
      weightKg: { type: Number, default: null },
      stable: { type: Boolean, default: false },
      at: { type: Date, default: null },
    },
    active: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

weighbridgeDeviceSchema.index({ userId: 1, active: 1, createdAt: 1 });

weighbridgeDeviceSchema.plugin(require("./plugins/audit"));

module.exports = mongoose.models.WeighbridgeDevice || mongoose.model("WeighbridgeDevice", weighbridgeDeviceSchema);
