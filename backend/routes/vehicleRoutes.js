const express = require("express");
const {
  createVehicle,
  getAllVehicles,
  getVehicleById,
  getVehicleLedger,
  editVehicle,
  deleteVehicle,
  fetchRtoDetails,
} = require("../controllers/vehicleController");
const auth = require("../middleware/auth");
const { sectionForChanges, ownerOnly, ownEntryOnly } = require("../middleware/staffAccess");
const Vehicle = require("../models/Vehicle");
const checkPermission = require("../middleware/role");
const { syncMonthlyHiresMiddleware } = require("../utils/monthlyHire");

const router = express.Router();

router.use(auth);
// Every staff login can read these lists; changing them needs the "masters" part
router.use(sectionForChanges("masters"));
router.use(syncMonthlyHiresMiddleware);

router.get("/", getAllVehicles);
router.get("/:id/ledger", getVehicleLedger);
router.get("/:id", getVehicleById);
router.post("/", checkPermission("add"), createVehicle);
router.put("/:id", checkPermission("edit"), ownEntryOnly(Vehicle), editVehicle);
// Fetch my own vehicle's RC (insurance, PUC, fitness, tax, permit) from the RTO; uses one RTO Sarthi call
router.post("/:id/rto-details", checkPermission("edit"), fetchRtoDetails);
router.delete("/:id", ownerOnly, deleteVehicle);

module.exports = router;
