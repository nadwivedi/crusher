const express = require("express");
const {
  createSales,
  getAllSales,
  getSalesById,
  editSales,
  deleteSales,
} = require("../controllers/salesController");

const router = express.Router();

router.get("/", getAllSales);
router.get("/:id", getSalesById);
router.post("/", createSales);
router.put("/:id", editSales);
router.delete("/:id", deleteSales);

module.exports = router;
