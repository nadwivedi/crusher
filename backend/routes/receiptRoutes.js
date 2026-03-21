const express = require("express");
const {
  createReceipt,
  getAllReceipts,
} = require("../controllers/receiptController");

const router = express.Router();

router.get("/", getAllReceipts);
router.post("/", createReceipt);

module.exports = router;
