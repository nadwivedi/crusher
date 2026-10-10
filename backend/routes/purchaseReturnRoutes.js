const express = require("express");
const {
  createPurchaseReturn,
  getAllPurchaseReturns,
  deletePurchaseReturn,
} = require("../controllers/purchaseReturnController");
const auth = require("../middleware/auth");
const checkPermission = require("../middleware/role");

const router = express.Router();

router.use(auth);

router.get("/", getAllPurchaseReturns);
router.post("/", checkPermission("add"), createPurchaseReturn);
router.delete("/:id", checkPermission("edit"), deletePurchaseReturn);

module.exports = router;
