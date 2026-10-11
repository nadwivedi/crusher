const express = require("express");
const {
  getDumpLedger,
  getDumpBalanceSummary,
  createDumpMovement,
  editDumpMovement,
  deleteDumpMovement,
} = require("../controllers/dumpStockController");
const auth = require("../middleware/auth");
const checkPermission = require("../middleware/role");

const router = express.Router();

router.use(auth);

router.get("/ledger", getDumpLedger);
router.get("/balance", getDumpBalanceSummary);
router.post("/", checkPermission("add"), createDumpMovement);
router.put("/:id", checkPermission("edit"), editDumpMovement);
router.delete("/:id", checkPermission("edit"), deleteDumpMovement);

module.exports = router;
