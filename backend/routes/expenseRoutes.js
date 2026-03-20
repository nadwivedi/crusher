const express = require("express");
const auth = require("../middleware/auth");
const {
  createExpense,
  getAllExpenses,
} = require("../controllers/expenseController");

const router = express.Router();

router.use(auth);

router.post("/", createExpense);
router.get("/", getAllExpenses);

module.exports = router;
