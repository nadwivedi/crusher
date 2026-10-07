const express = require("express");
const {
  createBank,
  getAllBanks,
  getAccountsSummary,
  getAccountLedger,
  updateBank,
  deleteBank,
  createTransfer,
  deleteTransfer,
} = require("../controllers/bankController");
const auth = require("../middleware/auth");
const checkPermission = require("../middleware/role");

const router = express.Router();

router.use(auth);

router.get("/", getAllBanks);
router.get("/summary", getAccountsSummary);
router.post("/transfers", checkPermission("add"), createTransfer);
router.delete("/transfers/:id", checkPermission("edit"), deleteTransfer);
router.get("/:id/ledger", getAccountLedger);
router.post("/", checkPermission("add"), createBank);
router.put("/:id", checkPermission("edit"), updateBank);
router.delete("/:id", checkPermission("edit"), deleteBank);

module.exports = router;
