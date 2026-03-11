const express = require("express");
const {
  createVehicle,
  getAllVehicles,
  getVehicleById,
  editVehicle,
  deleteVehicle,
} = require("../controllers/vehicleController");

const router = express.Router();

router.get("/", getAllVehicles);
router.get("/:id", getVehicleById);
router.post("/", createVehicle);
router.put("/:id", editVehicle);
router.delete("/:id", deleteVehicle);

module.exports = router;
