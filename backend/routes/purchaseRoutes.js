const express = require("express");
const {
  createPurchase,
  getAllPurchases,
  updatePurchase,
  deletePurchase,
} = require("../controllers/purchaseController");
const auth = require("../middleware/auth");
const { requireSection, ownerOnly, ownEntryOnly } = require("../middleware/staffAccess");
const Purchase = require("../models/Purchase");
const checkPermission = require("../middleware/role");

const router = express.Router();

router.use(auth);
// Staff need this part switched on for their login
router.use(requireSection("purchases"));

router.get("/", getAllPurchases);
router.post("/", checkPermission("add"), createPurchase);
router.put("/:id", checkPermission("edit"), ownEntryOnly(Purchase, "purchaseDate"), updatePurchase);
router.delete("/:id", ownerOnly, deletePurchase);

module.exports = router;
