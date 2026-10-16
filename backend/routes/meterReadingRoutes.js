const express = require("express");
const {
  getMeterReadings,
  createMeterReading,
  updateMeterReading,
  deleteMeterReading,
} = require("../controllers/meterReadingController");
const auth = require("../middleware/auth");
const { requireSection, ownerOnly, ownEntryOnly } = require("../middleware/staffAccess");
const MeterReading = require("../models/MeterReading");
const checkPermission = require("../middleware/role");

const router = express.Router();

router.use(auth);
// Staff need this part switched on for their login
router.use(requireSection("meterReadings"));

router.get("/", getMeterReadings);
router.post("/", checkPermission("add"), createMeterReading);
router.put("/:id", checkPermission("edit"), ownEntryOnly(MeterReading, "readingDate"), updateMeterReading);
router.delete("/:id", ownerOnly, deleteMeterReading);

module.exports = router;
