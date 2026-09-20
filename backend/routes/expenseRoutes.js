const express = require("express");
const auth = require("../middleware/auth");
const {
  createExpense,
  getAllExpenses,
  editExpense,
  deleteExpense,
} = require("../controllers/expenseController");
const checkPermission = require("../middleware/role");

const router = express.Router();

router.use(auth);

router.post("/", createExpense);
router.get("/", getAllExpenses);
router.put("/:id", checkPermission("edit"), editExpense);
router.delete("/:id", checkPermission("edit"), deleteExpense);

module.exports = router;
