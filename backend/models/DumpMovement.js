const mongoose = require("mongoose");

// Boulder stock on the dump at site. to_dump: boulder unloaded on the dump instead of the hopper (e.g. hopper down);
// to_hopper: boulder taken from the dump into the hopper. Boulder entries themselves always go to the hopper.
const DUMP_MOVEMENT_TYPES = ["to_dump", "to_hopper"];

const dumpMovementSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    voucherNumber: {
      type: String,
      required: true,
      trim: true,
    },
    movementDate: {
      type: Date,
      default: Date.now,
    },
    type: {
      type: String,
      enum: DUMP_MOVEMENT_TYPES,
      required: true,
    },
    // single: one weighbridge slip (gross − tare); bulk: trips × average weight
    entryMode: {
      type: String,
      enum: ["single", "bulk"],
      default: "single",
    },
    grossWeight: {
      type: Number,
      default: 0,
      min: 0,
    },
    tareWeight: {
      type: Number,
      default: 0,
      min: 0,
    },
    averageWeight: {
      type: Number,
      default: 0,
      min: 0,
    },
    trips: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Net weight in kg, like boulder entries
    weight: {
      type: Number,
      required: true,
      min: 1,
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      default: null,
    },
    // The truck that brought it, or the loader / dumper that fed the hopper
    vehicleNo: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
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

dumpMovementSchema.index({ userId: 1, movementDate: -1, createdAt: -1 });

// Who added and last changed each entry
dumpMovementSchema.plugin(require("./plugins/audit"));

module.exports = mongoose.models.DumpMovement || mongoose.model("DumpMovement", dumpMovementSchema);
module.exports.DUMP_MOVEMENT_TYPES = DUMP_MOVEMENT_TYPES;
