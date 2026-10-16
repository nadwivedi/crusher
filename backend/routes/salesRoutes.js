const express = require("express");
const {
  createSales,
  getAllSales,
  getSalesById,
  editSales,
  deleteSales,
} = require("../controllers/salesController");

const auth = require("../middleware/auth");
const { requireSection, ownerOnly, ownEntryOnly } = require("../middleware/staffAccess");
const Sales = require("../models/Sales");
const checkPermission = require("../middleware/role");

const router = express.Router();

// Apply authentication middleware to all sales routes
router.use(auth);
// Staff need this part switched on for their login
router.use(requireSection("sales"));

router.get("/", getAllSales);
router.get("/:id", getSalesById);
router.post("/", checkPermission('add'), createSales);
router.put("/:id", checkPermission('edit'), ownEntryOnly(Sales, "saleDate"), editSales);
router.delete("/:id", ownerOnly, deleteSales);

module.exports = router;
