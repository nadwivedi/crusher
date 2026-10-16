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
const { ownerOnly } = require("../middleware/staffAccess");
const checkPermission = require("../middleware/role");

const router = express.Router();

router.use(auth);

router.get("/", getAllBanks);
router.get("/summary", ownerOnly, getAccountsSummary);
router.post("/transfers", ownerOnly, createTransfer);
router.delete("/transfers/:id", ownerOnly, deleteTransfer);
router.get("/:id/ledger", ownerOnly, getAccountLedger);
router.post("/", ownerOnly, createBank);
router.put("/:id", ownerOnly, updateBank);
router.delete("/:id", ownerOnly, deleteBank);

module.exports = router;
