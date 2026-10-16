const express = require("express");
const {
  createStock,
  getAllStocks,
  getStockById,
  editStock,
  deleteStock,
} = require("../controllers/stockController");
const auth = require("../middleware/auth");
const { sectionForChanges, ownerOnly, ownEntryOnly } = require("../middleware/staffAccess");
const Stock = require("../models/Stock");
const checkPermission = require("../middleware/role");

const router = express.Router();

router.use(auth);
// Every staff login can read these lists; changing them needs the "masters" part
router.use(sectionForChanges("masters"));

router.get("/", getAllStocks);
router.get("/:id", getStockById);
router.post("/", checkPermission("add"), createStock);
router.put("/:id", checkPermission("edit"), ownEntryOnly(Stock), editStock);
router.delete("/:id", ownerOnly, deleteStock);

module.exports = router;
