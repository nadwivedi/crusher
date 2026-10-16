const express = require("express");
const {
  createSaleReturn,
  getAllSaleReturns,
  deleteSaleReturn,
} = require("../controllers/saleReturnController");
const auth = require("../middleware/auth");
const { requireSection, ownerOnly } = require("../middleware/staffAccess");
const checkPermission = require("../middleware/role");

const router = express.Router();

router.use(auth);
// Staff need this part switched on for their login
router.use(requireSection("sales"));

router.get("/", getAllSaleReturns);
router.post("/", checkPermission("add"), createSaleReturn);
router.delete("/:id", ownerOnly, deleteSaleReturn);

module.exports = router;
