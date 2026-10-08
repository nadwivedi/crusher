const express = require("express");
const {
  createStockAdjustment,
  getAllStockAdjustments,
} = require("../controllers/stockAdjustmentController");
const auth = require("../middleware/auth");
const checkPermission = require("../middleware/role");

const router = express.Router();

router.use(auth);

router.get("/", getAllStockAdjustments);
router.post("/", checkPermission("add"), createStockAdjustment);

module.exports = router;
