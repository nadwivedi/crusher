const mongoose = require("mongoose");

// One day's (or shift's) run of the DG set or a vehicle: opening and closing of its KM / hour meter.
const meterReadingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // "dg": the plant's DG set (one per plant). "vehicle": the vehicle below.
    machine: {
      type: String,
      enum: ["dg", "vehicle"],
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
    // "hr" for the DG set, JCB, loader, PC and tractor; "km" for other vehicles
    meterUnit: {
      type: String,
      enum: ["km", "hr"],
      required: true,
    },
    readingDate: {
      type: Date,
      required: true,
    },
    openingReading: {
      type: Number,
      required: true,
      min: 0,
    },
    // null while the machine is still running: the closing is filled in at the end of the day
    closingReading: {
      type: Number,
      default: null,
      min: 0,
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

meterReadingSchema.index({ userId: 1, readingDate: -1, createdAt: -1 });
meterReadingSchema.index({ userId: 1, machine: 1, vehicle: 1, readingDate: -1 });

// Who added and last changed each entry
meterReadingSchema.plugin(require("./plugins/audit"));

module.exports = mongoose.models.MeterReading || mongoose.model("MeterReading", meterReadingSchema);
