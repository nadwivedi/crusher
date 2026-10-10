const express = require("express");
const {
  createVehicle,
  getAllVehicles,
  getVehicleById,
  getVehicleLedger,
  editVehicle,
  deleteVehicle,
} = require("../controllers/vehicleController");
const auth = require("../middleware/auth");
const checkPermission = require("../middleware/role");
const { syncMonthlyHiresMiddleware } = require("../utils/monthlyHire");

const router = express.Router();

router.use(auth);
router.use(syncMonthlyHiresMiddleware);

router.get("/", getAllVehicles);
router.get("/:id/ledger", getVehicleLedger);
router.get("/:id", getVehicleById);
router.post("/", checkPermission("add"), createVehicle);
router.put("/:id", checkPermission("edit"), editVehicle);
router.delete("/:id", checkPermission("edit"), deleteVehicle);

module.exports = router;
