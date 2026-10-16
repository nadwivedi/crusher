const express = require("express");
const {
  getTransportEntries,
  createTransportEntry,
  editTransportEntry,
  deleteTransportEntry,
} = require("../controllers/transportController");
const auth = require("../middleware/auth");
const { sectionForChanges, ownerOnly, ownEntryOnly } = require("../middleware/staffAccess");
const Transport = require("../models/Transport");
const { syncMonthlyHiresMiddleware } = require("../utils/monthlyHire");
const checkPermission = require("../middleware/role");

const router = express.Router();

router.use(auth);
// Every staff login can read these lists; changing them needs the "masters" part
router.use(sectionForChanges("masters"));
router.use(syncMonthlyHiresMiddleware);

router.get("/", getTransportEntries);
router.post("/", checkPermission("add"), createTransportEntry);
router.put("/:id", checkPermission("edit"), ownEntryOnly(Transport, "entryDate"), editTransportEntry);
router.delete("/:id", ownerOnly, deleteTransportEntry);

module.exports = router;
