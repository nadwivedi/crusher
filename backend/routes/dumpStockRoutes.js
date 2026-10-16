const express = require("express");
const {
  getDumpLedger,
  getDumpBalanceSummary,
  createDumpMovement,
  editDumpMovement,
  deleteDumpMovement,
} = require("../controllers/dumpStockController");
const auth = require("../middleware/auth");
const { requireSection, ownerOnly, ownEntryOnly } = require("../middleware/staffAccess");
const DumpMovement = require("../models/DumpMovement");
const checkPermission = require("../middleware/role");

const router = express.Router();

router.use(auth);
// Staff need this part switched on for their login
router.use(requireSection("boulder"));

router.get("/ledger", getDumpLedger);
router.get("/balance", getDumpBalanceSummary);
router.post("/", checkPermission("add"), createDumpMovement);
router.put("/:id", checkPermission("edit"), ownEntryOnly(DumpMovement, "movementDate"), editDumpMovement);
router.delete("/:id", ownerOnly, deleteDumpMovement);

module.exports = router;
