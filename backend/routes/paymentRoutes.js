const express = require("express");
const {
  createPayment,
  getAllPayments,
} = require("../controllers/paymentController");

const router = express.Router();

router.get("/", getAllPayments);
router.post("/", createPayment);

module.exports = router;
