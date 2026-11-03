const mongoose = require("mongoose");
const VehicleDocument = require("../models/VehicleDocument");
const Vehicle = require("../models/Vehicle");
const { scopedFilter, scopedIdFilter } = require("../utils/ownership");

const { DOCUMENT_TYPES } = VehicleDocument;

// A date input's "YYYY-MM-DD" as that day (UTC midnight); empty means no date
const toDay = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid date");
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
};

const cleanFiles = (files) => (Array.isArray(files) ? files : [])
  .filter((file) => file && typeof file.url === "string" && file.url.trim())
  .slice(0, 10)
  .map((file) => ({
    url: file.url.trim(),
    name: String(file.name || "").trim(),
    mimeType: String(file.mimeType || "").trim(),
  }));

// The fields a document may be saved with, checked; the vehicle must be one of this account's
const buildFields = async (req) => {
  const body = req.body || {};

  if (!DOCUMENT_TYPES.includes(body.docType)) {
    throw new Error("Choose the document type");
  }
  if (!body.vehicleId || !mongoose.Types.ObjectId.isValid(body.vehicleId)) {
    throw new Error("Choose the vehicle");
  }

  const vehicle = await Vehicle.findOne({ _id: body.vehicleId, userId: req.userId }).select("_id vehicleNo");
  if (!vehicle) throw new Error("Vehicle not found");

  const validFrom = toDay(body.validFrom);
  const validTo = toDay(body.validTo);
  if (validFrom && validTo && validTo < validFrom) {
    throw new Error("Valid to cannot be before valid from");
  }

  const title = String(body.title || "").trim();
  if (body.docType === "other" && !title) {
    throw new Error("Enter the document name");
  }

  return {
    vehicleId: vehicle._id,
    vehicleNo: vehicle.vehicleNo,
    docType: body.docType,
    title,
    documentNumber: String(body.documentNumber || "").trim(),
    validFrom,
    validTo,
    files: cleanFiles(body.files),
    notes: String(body.notes || "").trim(),
  };
};

// The vehicle's current number when it still exists, else the number saved with the document
const toResponse = (doc) => {
  const plain = doc.toObject ? doc.toObject() : doc;
  const vehicle = plain.vehicleId && typeof plain.vehicleId === "object" ? plain.vehicleId : null;
  return {
    ...plain,
    vehicleId: vehicle ? vehicle._id : plain.vehicleId,
    vehicleNo: vehicle?.vehicleNo || plain.vehicleNo,
    vehicleCategory: vehicle?.category || "",
    vehicleMissing: !vehicle,
  };
};

const getAllDocuments = async (req, res) => {
  try {
    const { vehicleId, docType } = req.query;
    const filter = {};
    if (vehicleId && mongoose.Types.ObjectId.isValid(vehicleId)) filter.vehicleId = vehicleId;
    if (docType && DOCUMENT_TYPES.includes(docType)) filter.docType = docType;

    const documents = await VehicleDocument.find(scopedFilter(req, filter))
      .populate("vehicleId", "vehicleNo category")
      .sort({ validTo: 1, createdAt: -1 });

    return res.json(documents.map(toResponse));
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch documents", error: error.message });
  }
};

const createDocument = async (req, res) => {
  try {
    const document = await VehicleDocument.create({ ...(await buildFields(req)), userId: req.userId });
    await document.populate("vehicleId", "vehicleNo category");
    return res.status(201).json(toResponse(document));
  } catch (error) {
    return res.status(400).json({ message: error.message || "Failed to save document", error: error.message });
  }
};

const updateDocument = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid document id" });
  }

  try {
    const document = await VehicleDocument.findOneAndUpdate(scopedIdFilter(req, id), await buildFields(req), {
      new: true,
      runValidators: true,
    }).populate("vehicleId", "vehicleNo category");

    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }
    return res.json(toResponse(document));
  } catch (error) {
    return res.status(400).json({ message: error.message || "Failed to update document", error: error.message });
  }
};

const deleteDocument = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid document id" });
  }

  try {
    const document = await VehicleDocument.findOneAndDelete(scopedIdFilter(req, id));
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }
    return res.json({ message: "Document deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete document", error: error.message });
  }
};

module.exports = {
  getAllDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
};
