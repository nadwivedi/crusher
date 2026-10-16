const express = require("express");
const {
  createStockAdjustment,
  getAllStockAdjustments,
  updateStockAdjustment,
  deleteStockAdjustment,
} = require("../controllers/stockAdjustmentController");
const StockAdjustment = require("../models/StockAdjustment");
const auth = require("../middleware/auth");
const { requireSection, ownerOnly, ownEntryOnly } = require("../middleware/staffAccess");
const checkPermission = require("../middleware/role");

const router = express.Router();

router.use(auth);
// Staff need this part switched on for their login
router.use(requireSection("materialUsed"));

router.get("/", getAllStockAdjustments);
router.post("/", checkPermission("add"), createStockAdjustment);
router.put("/:id", checkPermission("edit"), ownEntryOnly(StockAdjustment, "voucherDate"), updateStockAdjustment);
router.delete("/:id", ownerOnly, deleteStockAdjustment);

module.exports = router;
