const mongoose = require("mongoose");

// Papers kept for a vehicle (RC, tax, fitness, permit, insurance, PUC...), with the days they are valid
const DOCUMENT_TYPES = ["rc", "tax", "fitness", "permit", "insurance", "puc", "other"];

const fileSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true },
    name: { type: String, trim: true, default: "" },
    mimeType: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const vehicleDocumentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
    },
    // Kept so a document still reads right if its vehicle is deleted
    vehicleNo: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },
    docType: {
      type: String,
      enum: DOCUMENT_TYPES,
      required: true,
    },
    // The name of an "other" document, or an extra label (e.g. "National permit")
    title: {
      type: String,
      trim: true,
      default: "",
    },
    documentNumber: {
      type: String,
      trim: true,
      default: "",
    },
    // Whole days (UTC midnight), the way date inputs send them. validTo empty: does not expire (e.g. an RC).
    validFrom: {
      type: Date,
      default: null,
    },
    validTo: {
      type: Date,
      default: null,
    },
    files: {
      type: [fileSchema],
      default: [],
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

vehicleDocumentSchema.index({ userId: 1, vehicleId: 1, docType: 1 });
vehicleDocumentSchema.index({ userId: 1, validTo: 1 });

// Who added and last changed each entry
vehicleDocumentSchema.plugin(require("./plugins/audit"));

const VehicleDocument = mongoose.models.VehicleDocument || mongoose.model("VehicleDocument", vehicleDocumentSchema);

module.exports = VehicleDocument;
module.exports.DOCUMENT_TYPES = DOCUMENT_TYPES;
