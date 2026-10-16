const express = require("express");
const {
  createBoulder,
  getAllBoulders,
  getBoulderById,
  editBoulder,
  deleteBoulder,
} = require("../controllers/boulderController");
const auth = require("../middleware/auth");
const { requireSection, ownerOnly, ownEntryOnly } = require("../middleware/staffAccess");
const Boulder = require("../models/Boulder");
const checkPermission = require("../middleware/role");

const router = express.Router();

router.use(auth);
// Staff need this part switched on for their login
router.use(requireSection("boulder"));

router.get("/", getAllBoulders);
router.get("/:id", getBoulderById);
router.post("/", checkPermission("add"), createBoulder);
router.put("/:id", checkPermission("edit"), ownEntryOnly(Boulder, "boulderDate"), editBoulder);
router.delete("/:id", ownerOnly, deleteBoulder);

module.exports = router;
