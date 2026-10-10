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
const checkPermission = require("../middleware/role");
const { syncMonthlyHiresMiddleware } = require("../utils/monthlyHire");

const router = express.Router();

router.use(auth);
router.use(syncMonthlyHiresMiddleware);

router.get("/", getMonthlyHires);
router.get("/:id", getMonthlyHireById);
router.post("/", checkPermission("add"), createMonthlyHire);
router.put("/:id", checkPermission("edit"), editMonthlyHire);
router.post("/:id/cancel", checkPermission("edit"), cancelMonthlyHire);
router.post("/:id/resume", checkPermission("edit"), resumeMonthlyHire);
router.post("/:id/adjustments", checkPermission("edit"), addAdjustment);
router.delete("/:id/adjustments/:adjustmentId", checkPermission("edit"), removeAdjustment);
router.delete("/:id", checkPermission("edit"), deleteMonthlyHire);

module.exports = router;
