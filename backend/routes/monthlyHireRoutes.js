const express = require("express");
const {
  getMonthlyHires,
  getMonthlyHireById,
  createMonthlyHire,
  editMonthlyHire,
  cancelMonthlyHire,
  resumeMonthlyHire,
  addAdjustment,
  removeAdjustment,
  deleteMonthlyHire,
} = require("../controllers/monthlyHireController");
const auth = require("../middleware/auth");
const { sectionForChanges, ownerOnly, ownEntryOnly } = require("../middleware/staffAccess");
const MonthlyHire = require("../models/MonthlyHire");
const checkPermission = require("../middleware/role");
const { syncMonthlyHiresMiddleware } = require("../utils/monthlyHire");

const router = express.Router();

router.use(auth);
// Every staff login can read these lists; changing them needs the "masters" part
router.use(sectionForChanges("masters"));
router.use(syncMonthlyHiresMiddleware);

router.get("/", getMonthlyHires);
router.get("/:id", getMonthlyHireById);
router.post("/", checkPermission("add"), createMonthlyHire);
router.put("/:id", checkPermission("edit"), ownEntryOnly(MonthlyHire), editMonthlyHire);
router.post("/:id/cancel", checkPermission("edit"), ownEntryOnly(MonthlyHire), cancelMonthlyHire);
router.post("/:id/resume", checkPermission("edit"), ownEntryOnly(MonthlyHire), resumeMonthlyHire);
router.post("/:id/adjustments", checkPermission("edit"), ownEntryOnly(MonthlyHire), addAdjustment);
router.delete("/:id/adjustments/:adjustmentId", checkPermission("edit"), ownEntryOnly(MonthlyHire), removeAdjustment);
router.delete("/:id", ownerOnly, deleteMonthlyHire);

module.exports = router;
