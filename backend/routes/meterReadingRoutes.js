const express = require("express");
const {
  getMeterReadings,
  createMeterReading,
  updateMeterReading,
  deleteMeterReading,
} = require("../controllers/meterReadingController");
const auth = require("../middleware/auth");
const checkPermission = require("../middleware/role");

const router = express.Router();

router.use(auth);

router.get("/", getMeterReadings);
router.post("/", checkPermission("add"), createMeterReading);
router.put("/:id", checkPermission("edit"), updateMeterReading);
router.delete("/:id", checkPermission("edit"), deleteMeterReading);

module.exports = router;
