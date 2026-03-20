const express = require("express");
const {
  createPurchase,
  getAllPurchases,
  updatePurchase,
  deletePurchase,
} = require("../controllers/purchaseController");

const router = express.Router();

router.get("/", getAllPurchases);
router.post("/", createPurchase);
router.put("/:id", updatePurchase);
router.delete("/:id", deletePurchase);

module.exports = router;
