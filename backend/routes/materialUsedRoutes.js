const express = require("express");
const {
  createMaterialUsed,
  getAllMaterialUsed,
  updateMaterialUsed,
  deleteMaterialUsed,
} = require("../controllers/materialUsedController");
const auth = require("../middleware/auth");
const { requireSection, ownerOnly, ownEntryOnly } = require("../middleware/staffAccess");
const MaterialUsed = require("../models/MaterialUsed");
const checkPermission = require("../middleware/role");

const router = express.Router();

router.use(auth);
// Staff need this part switched on for their login
router.use(requireSection("materialUsed"));

router.get("/", getAllMaterialUsed);
router.post("/", checkPermission("add"), createMaterialUsed);
router.put("/:id", checkPermission("edit"), ownEntryOnly(MaterialUsed, "usedDate"), updateMaterialUsed);
router.delete("/:id", ownerOnly, deleteMaterialUsed);

module.exports = router;
