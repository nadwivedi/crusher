const express = require("express");
const auth = require("../middleware/auth");
const { ownerOnly } = require("../middleware/staffAccess");
const {
  getEmployees,
  createEmployee,
  updateEmployee,
  setEmployeeStatus,
  deleteEmployee,
  getAttendance,
  saveAttendance,
  getSheet,
  getEmployeeLedger,
  getEntries,
  createEntry,
  updateEntry,
  deleteEntry,
} = require("../controllers/payrollController");

const router = express.Router();

router.use(auth);
// Salaries are the owner's business only
router.use(ownerOnly);

router.get("/employees", getEmployees);
router.post("/employees", createEmployee);
router.put("/employees/:id", updateEmployee);
router.patch("/employees/:id/status", setEmployeeStatus);
router.delete("/employees/:id", deleteEmployee);
router.get("/employees/:id/ledger", getEmployeeLedger);

router.get("/attendance", getAttendance);
router.put("/attendance", saveAttendance);

router.get("/sheet", getSheet);

router.get("/entries", getEntries);
router.post("/entries", createEntry);
router.put("/entries/:id", updateEntry);
router.delete("/entries/:id", deleteEntry);

module.exports = router;
