const express = require("express");
const {
  createPayment,
  getAllPayments,
  deletePayment,
} = require("../controllers/paymentController");
const auth = require("../middleware/auth");
const { requireSection, ownerOnly } = require("../middleware/staffAccess");
const checkPermission = require("../middleware/role");

const router = express.Router();

router.use(auth);
// Staff need this part switched on for their login
router.use(requireSection("payments"));

router.get("/", getAllPayments);
router.post("/", checkPermission("add"), createPayment);
router.delete("/:id", ownerOnly, deletePayment);

module.exports = router;
