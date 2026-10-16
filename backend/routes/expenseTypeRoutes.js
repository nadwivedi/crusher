const express = require("express");
const auth = require("../middleware/auth");
const checkPermission = require("../middleware/role");
const { sectionForChanges, ownerOnly, ownEntryOnly } = require("../middleware/staffAccess");
const ExpenseType = require("../models/ExpenseType");
const {
  createExpenseType,
  getAllExpenseTypes,
  updateExpenseType,
  deleteExpenseType,
} = require("../controllers/expenseTypeController");

const router = express.Router();

router.use(auth);
// Every staff login can read these lists; changing them needs the "masters" part
router.use(sectionForChanges("masters"));

router.post("/", checkPermission("add"), createExpenseType);
router.get("/", getAllExpenseTypes);
router.put("/:id", checkPermission("edit"), ownEntryOnly(ExpenseType), updateExpenseType);
router.delete("/:id", ownerOnly, deleteExpenseType);

module.exports = router;
