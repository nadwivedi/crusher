const express = require("express");
const auth = require("../middleware/auth");
const checkPermission = require("../middleware/role");
const { sectionForChanges, ownerOnly, ownEntryOnly } = require("../middleware/staffAccess");
const VehicleDocument = require("../models/VehicleDocument");
const {
  getAllDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
} = require("../controllers/vehicleDocumentController");

const router = express.Router();

router.use(auth);
// Vehicle papers sit with the vehicles: changing them needs the "masters" part
router.use(sectionForChanges("masters"));

router.get("/", getAllDocuments);
router.post("/", checkPermission("add"), createDocument);
router.put("/:id", checkPermission("edit"), ownEntryOnly(VehicleDocument), updateDocument);
router.delete("/:id", ownerOnly, deleteDocument);

module.exports = router;
