const express = require("express");
const auth = require("../middleware/auth");
const {
  createExpenseGroup,
  getAllExpenseGroups,
  updateExpenseGroup,
  deleteExpenseGroup,
} = require("../controllers/expenseGroupController");

const router = express.Router();

router.use(auth);

router.post("/", createExpenseGroup);
router.get("/", getAllExpenseGroups);
router.put("/:id", updateExpenseGroup);
router.delete("/:id", deleteExpenseGroup);

module.exports = router;
