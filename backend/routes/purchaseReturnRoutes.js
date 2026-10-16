const express = require("express");
const {
  createPurchaseReturn,
  getAllPurchaseReturns,
  deletePurchaseReturn,
} = require("../controllers/purchaseReturnController");
const auth = require("../middleware/auth");
const { requireSection, ownerOnly } = require("../middleware/staffAccess");
const checkPermission = require("../middleware/role");

const router = express.Router();

router.use(auth);
// Staff need this part switched on for their login
router.use(requireSection("purchases"));

router.get("/", getAllPurchaseReturns);
router.post("/", checkPermission("add"), createPurchaseReturn);
router.delete("/:id", ownerOnly, deletePurchaseReturn);

module.exports = router;
