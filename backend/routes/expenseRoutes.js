const express = require("express");
const auth = require("../middleware/auth");
const { requireSection, ownerOnly, ownEntryOnly } = require("../middleware/staffAccess");
const Expense = require("../models/Expense");
const {
  createExpense,
  getAllExpenses,
  editExpense,
  deleteExpense,
} = require("../controllers/expenseController");
const checkPermission = require("../middleware/role");

const router = express.Router();

router.use(auth);
// Staff need this part switched on for their login
router.use(requireSection("expenses"));

router.post("/", checkPermission("add"), createExpense);
router.get("/", getAllExpenses);
router.put("/:id", checkPermission("edit"), ownEntryOnly(Expense, "expenseDate"), editExpense);
router.delete("/:id", ownerOnly, deleteExpense);

module.exports = router;
