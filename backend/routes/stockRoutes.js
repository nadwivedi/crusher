const express = require("express");
const {
  createStock,
  getAllStocks,
  getStockById,
  editStock,
  deleteStock,
} = require("../controllers/stockController");

const router = express.Router();

router.get("/", getAllStocks);
router.get("/:id", getStockById);
router.post("/", createStock);
router.put("/:id", editStock);
router.delete("/:id", deleteStock);

module.exports = router;
