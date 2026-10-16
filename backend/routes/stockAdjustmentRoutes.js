const express = require("express");
const {
  createStockAdjustment,
  getAllStockAdjustments,
} = require("../controllers/stockAdjustmentController");
const auth = require("../middleware/auth");
const { requireSection } = require("../middleware/staffAccess");
const checkPermission = require("../middleware/role");

const router = express.Router();

router.use(auth);
// Staff need this part switched on for their login
router.use(requireSection("materialUsed"));

router.get("/", getAllStockAdjustments);
router.post("/", checkPermission("add"), createStockAdjustment);

module.exports = router;
