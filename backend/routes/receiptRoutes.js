const express = require("express");
const {
  createReceipt,
  getAllReceipts,
  deleteReceipt,
} = require("../controllers/receiptController");
const auth = require("../middleware/auth");
const { requireSection, ownerOnly } = require("../middleware/staffAccess");
const checkPermission = require("../middleware/role");

const router = express.Router();

router.use(auth);
// Staff need this part switched on for their login
router.use(requireSection("receipts"));

router.get("/", getAllReceipts);
router.post("/", checkPermission("add"), createReceipt);
router.delete("/:id", ownerOnly, deleteReceipt);

module.exports = router;
