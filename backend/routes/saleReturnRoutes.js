const express = require("express");
const {
  createSaleReturn,
  getAllSaleReturns,
  deleteSaleReturn,
} = require("../controllers/saleReturnController");
const auth = require("../middleware/auth");
const checkPermission = require("../middleware/role");

const router = express.Router();

router.use(auth);

router.get("/", getAllSaleReturns);
router.post("/", checkPermission("add"), createSaleReturn);
router.delete("/:id", checkPermission("edit"), deleteSaleReturn);

module.exports = router;
