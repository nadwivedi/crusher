const mongoose = require("mongoose");
const PayrollEmployee = require("../models/PayrollEmployee");
const PayrollAttendance = require("../models/PayrollAttendance");
const PayrollEntry = require("../models/PayrollEntry");
const Expense = require("../models/Expense");
const ExpenseType = require("../models/ExpenseType");
const Bank = require("../models/Bank");
const Counter = require("../models/Counter");
const { ensureDefaultAccount } = require("../utils/accounts");

const { ATTENDANCE_WEIGHTS } = PayrollAttendance;
const { PAYROLL_ENTRY_TYPES, MONEY_TYPES } = PayrollEntry;
const SALARY_EXPENSE_TYPE = "Salary";

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/;

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const round2 = (value) => Math.round(toNumber(value) * 100) / 100;
const pad = (value) => String(value).padStart(2, "0");

// Business days: the server runs in the business's time zone (config/timezone.js)
const todayKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};
const currentMonthKey = () => todayKey().slice(0, 7);
const daysInMonth = (monthKey) => {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month, 0).getDate();
};
const keyToDate = (dateKey) => new Date(`${dateKey}T00:00:00`);
const dateToKey = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};
const shiftMonth = (monthKey, delta) => {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
};
const isValidDateKey = (value) => DATE_KEY.test(String(value || "")) && dateToKey(keyToDate(value)) === value;

const fail = (res, status, message) => res.status(status).json({ success: false, message });
const isId = (value) => mongoose.Types.ObjectId.isValid(String(value || ""));

// Pay for one full day of this worker in this month
const dayPayFor = (employee, monthKey) => (
  employee.salaryType === "daily" ? toNumber(employee.rate) : toNumber(employee.rate) / daysInMonth(monthKey)
);

// ---------------------------------------------------------------- employees

const readEmployee = (body = {}) => {
  const name = String(body.name || "").trim();
  if (!name) return { error: "Enter the employee name" };

  const mobile = String(body.mobile || "").replace(/\D/g, "");
  if (mobile && mobile.length !== 10) return { error: "Mobile number must be 10 digits" };

  const salaryType = body.salaryType === "daily" ? "daily" : "monthly";
  const rate = toNumber(body.rate, NaN);
  if (!Number.isFinite(rate) || rate <= 0) {
    return { error: salaryType === "daily" ? "Enter the wage per day" : "Enter the salary per month" };
  }
  const overtimeRate = toNumber(body.overtimeRate, 0);
  if (overtimeRate < 0) return { error: "Overtime rate cannot be negative" };

  const openingBalance = toNumber(body.openingBalance, 0);

  let joiningDate = null;
  if (body.joiningDate) {
    if (!isValidDateKey(body.joiningDate)) return { error: "Enter a valid joining date" };
    joiningDate = keyToDate(body.joiningDate);
  }

  return {
    data: {
      name,
      mobile,
      role: String(body.role || "").trim(),
      salaryType,
      rate: round2(rate),
      overtimeRate: round2(overtimeRate),
      openingBalance: round2(openingBalance),
      joiningDate,
      bankDetails: String(body.bankDetails || "").trim(),
      address: String(body.address || "").trim(),
      notes: String(body.notes || "").trim(),
    },
  };
};

const employeeResponse = (employee) => {
  const plain = employee.toObject ? employee.toObject() : employee;
  return {
    ...plain,
    joiningDate: dateToKey(plain.joiningDate),
    leftDate: dateToKey(plain.leftDate),
  };
};

const getEmployees = async (req, res) => {
  try {
    const employees = await PayrollEmployee.find({ userId: req.userId }).sort({ isActive: -1, name: 1 }).lean();
    return res.json({ success: true, data: employees.map(employeeResponse) });
  } catch (error) {
    return fail(res, 500, error.message || "Failed to load employees");
  }
};

const createEmployee = async (req, res) => {
  try {
    const { data, error } = readEmployee(req.body);
    if (error) return fail(res, 400, error);
    const employee = await PayrollEmployee.create({ ...data, userId: req.userId });
    return res.status(201).json({ success: true, data: employeeResponse(employee) });
  } catch (error) {
    return fail(res, 400, error.message || "Failed to add employee");
  }
};

// Days already marked keep the pay they were marked with, except in the months from applyFrom on
// (default this month), which take the new salary
const repriceAttendance = async (userId, employee, fromMonthKey) => {
  const marks = await PayrollAttendance.find({ userId, employee: employee._id, monthKey: { $gte: fromMonthKey } })
    .select("_id monthKey")
    .lean();
  if (marks.length === 0) return;
  await PayrollAttendance.bulkWrite(marks.map((mark) => ({
    updateOne: {
      filter: { _id: mark._id },
      update: { $set: { dayPay: dayPayFor(employee, mark.monthKey), otRate: toNumber(employee.overtimeRate) } },
    },
  })));
};

const updateEmployee = async (req, res) => {
  try {
    if (!isId(req.params.id)) return fail(res, 400, "Invalid employee");
    const employee = await PayrollEmployee.findOne({ _id: req.params.id, userId: req.userId });
    if (!employee) return fail(res, 404, "Employee not found");

    const { data, error } = readEmployee({ ...employeeResponse(employee), ...req.body });
    if (error) return fail(res, 400, error);

    const payChanged = data.rate !== employee.rate
      || data.salaryType !== employee.salaryType
      || data.overtimeRate !== employee.overtimeRate;

    employee.set(data);
    await employee.save();

    if (payChanged) {
      const applyFrom = MONTH_KEY.test(String(req.body.applyFromMonth || "")) ? req.body.applyFromMonth : currentMonthKey();
      await repriceAttendance(req.userId, employee, applyFrom);
    }

    return res.json({ success: true, data: employeeResponse(employee) });
  } catch (error) {
    return fail(res, 400, error.message || "Failed to update employee");
  }
};

// Mark as left (with the last day) or back to working
const setEmployeeStatus = async (req, res) => {
  try {
    if (!isId(req.params.id)) return fail(res, 400, "Invalid employee");
    if (typeof req.body?.isActive !== "boolean") return fail(res, 400, "Say whether the employee is working");
    const employee = await PayrollEmployee.findOne({ _id: req.params.id, userId: req.userId });
    if (!employee) return fail(res, 404, "Employee not found");

    employee.isActive = req.body.isActive;
    if (req.body.isActive) {
      employee.leftDate = null;
    } else {
      const leftKey = isValidDateKey(req.body.leftDate) ? req.body.leftDate : todayKey();
      employee.leftDate = keyToDate(leftKey);
    }
    await employee.save();
    return res.json({ success: true, data: employeeResponse(employee) });
  } catch (error) {
    return fail(res, 400, error.message || "Failed to change status");
  }
};

// Only an employee with no attendance and no payments can be removed; others are marked as left
const deleteEmployee = async (req, res) => {
  try {
    if (!isId(req.params.id)) return fail(res, 400, "Invalid employee");
    const filter = { userId: req.userId, employee: req.params.id };
    const [marks, entries] = await Promise.all([PayrollAttendance.exists(filter), PayrollEntry.exists(filter)]);
    if (marks || entries) {
      return fail(res, 409, "This employee has attendance or payments. Mark them as left instead.");
    }
    const deleted = await PayrollEmployee.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!deleted) return fail(res, 404, "Employee not found");
    return res.json({ success: true, message: "Employee deleted" });
  } catch (error) {
    return fail(res, 500, error.message || "Failed to delete employee");
  }
};

// ---------------------------------------------------------------- attendance

const attendanceResponse = (mark) => ({
  _id: mark._id,
  employee: String(mark.employee),
  dateKey: mark.dateKey,
  status: mark.status,
  overtimeHours: toNumber(mark.overtimeHours),
});

// Every mark of a month: ?month=YYYY-MM
const getAttendance = async (req, res) => {
  try {
    const monthKey = String(req.query.month || currentMonthKey());
    if (!MONTH_KEY.test(monthKey)) return fail(res, 400, "Invalid month");
    const marks = await PayrollAttendance.find({ userId: req.userId, monthKey }).lean();
    return res.json({ success: true, data: marks.map(attendanceResponse) });
  } catch (error) {
    return fail(res, 500, error.message || "Failed to load attendance");
  }
};

/**
 * Save marks for one day: { dateKey, marks: [{ employee, status, overtimeHours }] }.
 * status null / "" clears that worker's mark for the day.
 */
const saveAttendance = async (req, res) => {
  try {
    const { dateKey } = req.body || {};
    const marks = Array.isArray(req.body?.marks) ? req.body.marks : [];
    if (!isValidDateKey(dateKey)) return fail(res, 400, "Choose a valid date");
    if (dateKey > todayKey()) return fail(res, 400, "Attendance cannot be marked for a future day");
    if (marks.length === 0) return fail(res, 400, "Nothing to save");
    if (marks.length > 500) return fail(res, 400, "Too many marks at once");

    const ids = [...new Set(marks.map((mark) => String(mark.employee || "")))];
    if (ids.some((id) => !isId(id))) return fail(res, 400, "Invalid employee");
    const employees = await PayrollEmployee.find({ userId: req.userId, _id: { $in: ids } }).lean();
    const byId = new Map(employees.map((employee) => [String(employee._id), employee]));
    if (byId.size !== ids.length) return fail(res, 404, "Employee not found");

    const monthKey = dateKey.slice(0, 7);
    const operations = [];
    for (const mark of marks) {
      const employee = byId.get(String(mark.employee));
      const filter = { userId: req.userId, employee: employee._id, dateKey };
      if (!mark.status) {
        operations.push({ deleteOne: { filter } });
        continue;
      }
      if (!Object.prototype.hasOwnProperty.call(ATTENDANCE_WEIGHTS, mark.status)) return fail(res, 400, "Invalid attendance");
      const overtimeHours = round2(mark.overtimeHours);
      if (overtimeHours < 0 || overtimeHours > 24) return fail(res, 400, "Overtime must be between 0 and 24 hours");
      operations.push({
        updateOne: {
          filter,
          update: {
            $set: {
              monthKey,
              status: mark.status,
              // Overtime only on a day worked
              overtimeHours: mark.status === "absent" || mark.status === "leave" ? 0 : overtimeHours,
              dayPay: dayPayFor(employee, monthKey),
              otRate: toNumber(employee.overtimeRate),
            },
          },
          upsert: true,
        },
      });
    }

    await PayrollAttendance.bulkWrite(operations, { ordered: false });
    const saved = await PayrollAttendance.find({ userId: req.userId, dateKey, employee: { $in: ids } }).lean();
    return res.json({ success: true, data: saved.map(attendanceResponse) });
  } catch (error) {
    return fail(res, 400, error.message || "Failed to save attendance");
  }
};

// ---------------------------------------------------------------- month sheet

const EARNED_EXPR = {
  $add: [
    {
      $multiply: [
        "$dayPay",
        {
          $switch: {
            branches: Object.entries(ATTENDANCE_WEIGHTS).map(([status, weight]) => ({ case: { $eq: ["$status", status] }, then: weight })),
            default: 0,
          },
        },
      ],
    },
    { $multiply: [{ $ifNull: ["$overtimeHours", 0] }, { $ifNull: ["$otRate", 0] }] },
  ],
};

/**
 * Per worker and month: days by mark, overtime hours, pay earned, and bonus / deduction / advance / salary paid.
 * monthFilter limits the months (e.g. { $lte: "2026-11" }).
 */
const loadMonthTotals = async (userId, monthFilter, employeeId = null) => {
  const match = { userId: new mongoose.Types.ObjectId(String(userId)), monthKey: monthFilter };
  if (employeeId) match.employee = new mongoose.Types.ObjectId(String(employeeId));

  const [attendance, entries] = await Promise.all([
    PayrollAttendance.aggregate([
      { $match: match },
      {
        $group: {
          _id: { employee: "$employee", monthKey: "$monthKey" },
          earned: { $sum: EARNED_EXPR },
          overtimeHours: { $sum: { $ifNull: ["$overtimeHours", 0] } },
          overtimePay: { $sum: { $multiply: [{ $ifNull: ["$overtimeHours", 0] }, { $ifNull: ["$otRate", 0] }] } },
          present: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
          half: { $sum: { $cond: [{ $eq: ["$status", "half"] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] } },
          leave: { $sum: { $cond: [{ $eq: ["$status", "leave"] }, 1, 0] } },
        },
      },
    ]),
    PayrollEntry.aggregate([
      { $match: match },
      { $group: { _id: { employee: "$employee", monthKey: "$monthKey", type: "$type" }, amount: { $sum: "$amount" } } },
    ]),
  ]);

  // "employeeId|YYYY-MM" -> totals
  const totals = new Map();
  const slot = (employee, monthKey) => {
    const key = `${employee}|${monthKey}`;
    if (!totals.has(key)) {
      totals.set(key, {
        employee: String(employee), monthKey,
        present: 0, half: 0, absent: 0, leave: 0, overtimeHours: 0, overtimePay: 0, earned: 0,
        bonus: 0, deduction: 0, advance: 0, salary: 0,
      });
    }
    return totals.get(key);
  };
  attendance.forEach((row) => {
    Object.assign(slot(row._id.employee, row._id.monthKey), {
      present: row.present, half: row.half, absent: row.absent, leave: row.leave,
      overtimeHours: row.overtimeHours, overtimePay: row.overtimePay, earned: row.earned,
    });
  });
  entries.forEach((row) => {
    slot(row._id.employee, row._id.monthKey)[row._id.type] += row.amount;
  });
  return [...totals.values()];
};

// What a month adds to the balance owed to the worker
const monthNet = (row) => row.earned + row.bonus - row.deduction - row.advance - row.salary;

const sheetRow = (employee, opening, month) => {
  const daysWorked = month.present + month.half * 0.5;
  const netPay = month.earned + month.bonus - month.deduction;
  const closing = opening + netPay - month.advance - month.salary;
  return {
    employee: employeeResponse(employee),
    present: month.present,
    half: month.half,
    absent: month.absent,
    leave: month.leave,
    daysWorked,
    paidDays: daysWorked + month.leave,
    overtimeHours: round2(month.overtimeHours),
    overtimePay: round2(month.overtimePay),
    earned: round2(month.earned),
    bonus: round2(month.bonus),
    deduction: round2(month.deduction),
    netPay: round2(netPay),
    opening: round2(opening),
    advance: round2(month.advance),
    paid: round2(month.salary),
    balance: round2(closing),
  };
};

const emptyMonth = (employee, monthKey) => ({
  employee: String(employee), monthKey,
  present: 0, half: 0, absent: 0, leave: 0, overtimeHours: 0, overtimePay: 0, earned: 0,
  bonus: 0, deduction: 0, advance: 0, salary: 0,
});

/**
 * Salary sheet for ?month=YYYY-MM: each worker's balance brought forward, what they earned that month
 * (attendance + overtime + bonus − deduction), the advance and salary paid, and the balance still owed.
 */
const getSheet = async (req, res) => {
  try {
    const monthKey = String(req.query.month || currentMonthKey());
    if (!MONTH_KEY.test(monthKey)) return fail(res, 400, "Invalid month");

    const [employees, totals] = await Promise.all([
      PayrollEmployee.find({ userId: req.userId }).sort({ isActive: -1, name: 1 }).lean(),
      loadMonthTotals(req.userId, { $lte: monthKey }),
    ]);

    const before = new Map();
    const current = new Map();
    totals.forEach((row) => {
      if (row.monthKey === monthKey) current.set(row.employee, row);
      else before.set(row.employee, (before.get(row.employee) || 0) + monthNet(row));
    });

    const monthStart = keyToDate(`${monthKey}-01`);
    const rows = employees
      .map((employee) => {
        const id = String(employee._id);
        const opening = toNumber(employee.openingBalance) + (before.get(id) || 0);
        return sheetRow(employee, opening, current.get(id) || emptyMonth(id, monthKey));
      })
      // Workers who joined after this month are left out; those who left are kept while anything is due
      .filter((row) => {
        const { employee } = row;
        const joinedLater = employee.joiningDate && employee.joiningDate > `${monthKey}-31`;
        const hasActivity = row.paidDays > 0 || row.absent > 0 || row.advance || row.paid || row.bonus || row.deduction;
        if (hasActivity) return true;
        if (joinedLater) return false;
        if (employee.isActive) return true;
        const leftBefore = employee.leftDate && keyToDate(employee.leftDate) < monthStart;
        return !leftBefore || Math.abs(row.balance) >= 1;
      });

    const sum = (key) => round2(rows.reduce((total, row) => total + toNumber(row[key]), 0));
    return res.json({
      success: true,
      monthKey,
      daysInMonth: daysInMonth(monthKey),
      totals: {
        opening: sum("opening"),
        earned: sum("earned"),
        overtimePay: sum("overtimePay"),
        bonus: sum("bonus"),
        deduction: sum("deduction"),
        netPay: sum("netPay"),
        advance: sum("advance"),
        paid: sum("paid"),
        balance: sum("balance"),
      },
      rows,
    });
  } catch (error) {
    return fail(res, 500, error.message || "Failed to load salary sheet");
  }
};

/** One worker's month-by-month statement, from joining (or their first entry) to this month. */
const getEmployeeLedger = async (req, res) => {
  try {
    if (!isId(req.params.id)) return fail(res, 400, "Invalid employee");
    const employee = await PayrollEmployee.findOne({ _id: req.params.id, userId: req.userId }).lean();
    if (!employee) return fail(res, 404, "Employee not found");

    const lastMonth = currentMonthKey();
    const totals = await loadMonthTotals(req.userId, { $lte: "9999-12" }, employee._id);
    const byMonth = new Map(totals.map((row) => [row.monthKey, row]));

    const months = [...byMonth.keys()].sort();
    const joinMonth = dateToKey(employee.joiningDate).slice(0, 7);
    let firstMonth = [joinMonth, months[0]].filter(Boolean).sort()[0] || lastMonth;
    const endMonth = [lastMonth, months[months.length - 1]].filter(Boolean).sort().pop();
    // Never more than 10 years of rows
    if (firstMonth < shiftMonth(endMonth, -119)) firstMonth = shiftMonth(endMonth, -119);

    const rows = [];
    let balance = toNumber(employee.openingBalance);
    for (let month = firstMonth; month <= endMonth; month = shiftMonth(month, 1)) {
      const data = byMonth.get(month) || emptyMonth(employee._id, month);
      const row = sheetRow(employee, balance, data);
      balance = row.balance;
      rows.push({ monthKey: month, ...row, employee: undefined });
    }

    const entries = await PayrollEntry.find({ userId: req.userId, employee: employee._id })
      .populate("account", "name")
      .sort({ date: -1, createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      employee: employeeResponse(employee),
      openingBalance: toNumber(employee.openingBalance),
      balance: round2(balance),
      months: rows.reverse(),
      entries: entries.map(entryResponse),
    });
  } catch (error) {
    return fail(res, 500, error.message || "Failed to load employee ledger");
  }
};

// ---------------------------------------------------------------- payments, advances, bonus, deduction

const entryResponse = (entry) => ({
  _id: entry._id,
  employee: String(entry.employee?._id || entry.employee),
  employeeName: entry.employee?.name,
  type: entry.type,
  amount: toNumber(entry.amount),
  dateKey: dateToKey(entry.date),
  monthKey: entry.monthKey,
  account: entry.account?._id ? String(entry.account._id) : entry.account ? String(entry.account) : "",
  accountName: entry.account?.name || "",
  notes: entry.notes || "",
  createdBy: entry.createdBy,
  createdAt: entry.createdAt,
});

const monthName = (monthKey) => new Date(`${monthKey}-01T00:00:00`).toLocaleDateString("en-GB", { month: "short", year: "numeric" });

// The account's "Salary" expense type, made the first time it is needed
const ensureSalaryExpenseType = async (userId) => {
  const existing = await ExpenseType.findOne({ userId, name: { $regex: `^${SALARY_EXPENSE_TYPE}$`, $options: "i" } });
  if (existing) return existing;
  try {
    return await ExpenseType.create({ userId, name: SALARY_EXPENSE_TYPE, type: "services" });
  } catch (error) {
    if (error?.code === 11000) return ExpenseType.findOne({ userId, name: { $regex: `^${SALARY_EXPENSE_TYPE}$`, $options: "i" } });
    throw error;
  }
};

const createExpenseNumber = async (date) => {
  const year = date.getFullYear();
  const counter = await Counter.findOneAndUpdate(
    { key: `expenses:${year}` },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return `EXP-${year}-${pad(counter.seq)}`;
};

const readEntry = async (req, body = {}) => {
  if (!PAYROLL_ENTRY_TYPES.includes(body.type)) return { error: "Choose salary, advance, bonus or deduction" };
  if (!isId(body.employee)) return { error: "Choose the employee" };
  const employee = await PayrollEmployee.findOne({ _id: body.employee, userId: req.userId }).lean();
  if (!employee) return { error: "Employee not found" };

  const amount = round2(body.amount);
  if (!(amount > 0)) return { error: "Enter the amount" };

  const dateKey = String(body.dateKey || todayKey());
  if (!isValidDateKey(dateKey)) return { error: "Enter a valid date" };
  if (dateKey > todayKey()) return { error: "Date cannot be in the future" };

  const monthKey = String(body.monthKey || dateKey.slice(0, 7));
  if (!MONTH_KEY.test(monthKey)) return { error: "Choose the salary month" };
  if (monthKey > currentMonthKey()) return { error: "Salary month cannot be in the future" };

  let account = null;
  if (MONEY_TYPES.includes(body.type)) {
    if (body.account && isId(body.account)) account = await Bank.findOne({ _id: body.account, userId: req.userId });
    if (!account) account = await ensureDefaultAccount(req.userId);
  }

  return {
    employee,
    data: {
      employee: employee._id,
      type: body.type,
      amount,
      date: keyToDate(dateKey),
      monthKey,
      account: account ? account._id : null,
      notes: String(body.notes || "").trim(),
    },
    account,
  };
};

// Keeps the linked expense in step with a salary / advance entry (made, changed, or removed for other types)
const syncExpense = async (userId, entry, employee, account) => {
  if (!MONEY_TYPES.includes(entry.type)) {
    if (entry.expense) {
      await Expense.deleteOne({ _id: entry.expense, userId });
      entry.expense = null;
    }
    return;
  }

  const salaryType = await ensureSalaryExpenseType(userId);
  const label = entry.type === "advance" ? "Advance" : "Salary";
  const notes = [
    `${label} · ${employee.name}${employee.role ? ` (${employee.role})` : ""} · ${monthName(entry.monthKey)}`,
    entry.notes,
  ].filter(Boolean).join(" · ");
  const fields = {
    expenseGroup: salaryType._id,
    amount: entry.amount,
    paidAmount: entry.amount,
    account: account?._id || null,
    method: account?.type === "cash" ? "cash" : "bank",
    expenseDate: entry.date,
    notes,
    payrollEntry: entry._id,
  };

  const existing = entry.expense ? await Expense.findOne({ _id: entry.expense, userId }) : null;
  if (existing) {
    existing.set(fields);
    await existing.save();
    return;
  }
  const expense = await Expense.create({ ...fields, userId, expenseNumber: await createExpenseNumber(entry.date) });
  entry.expense = expense._id;
};

// ?month=YYYY-MM (salary month), optional &employee=
const getEntries = async (req, res) => {
  try {
    const filter = { userId: req.userId };
    if (req.query.month) {
      if (!MONTH_KEY.test(String(req.query.month))) return fail(res, 400, "Invalid month");
      filter.monthKey = req.query.month;
    }
    if (req.query.employee && isId(req.query.employee)) filter.employee = req.query.employee;
    const entries = await PayrollEntry.find(filter)
      .populate("employee", "name role")
      .populate("account", "name")
      .sort({ date: -1, createdAt: -1 })
      .lean();
    return res.json({ success: true, data: entries.map(entryResponse) });
  } catch (error) {
    return fail(res, 500, error.message || "Failed to load payments");
  }
};

const createEntry = async (req, res) => {
  let entry = null;
  try {
    const { data, employee, account, error } = await readEntry(req, req.body);
    if (error) return fail(res, 400, error);
    entry = new PayrollEntry({ ...data, userId: req.userId });
    await syncExpense(req.userId, entry, employee, account);
    await entry.save();
    return res.status(201).json({ success: true, data: entryResponse(entry) });
  } catch (error) {
    // Do not leave an expense behind for an entry that was not saved
    if (entry?.expense && entry.isNew) await Expense.deleteOne({ _id: entry.expense, userId: req.userId }).catch(() => {});
    return fail(res, 400, error.message || "Failed to save payment");
  }
};

const updateEntry = async (req, res) => {
  try {
    if (!isId(req.params.id)) return fail(res, 400, "Invalid entry");
    const entry = await PayrollEntry.findOne({ _id: req.params.id, userId: req.userId });
    if (!entry) return fail(res, 404, "Entry not found");

    const { data, employee, account, error } = await readEntry(req, { ...entryResponse(entry), ...req.body });
    if (error) return fail(res, 400, error);
    entry.set(data);
    await syncExpense(req.userId, entry, employee, account);
    await entry.save();
    return res.json({ success: true, data: entryResponse(entry) });
  } catch (error) {
    return fail(res, 400, error.message || "Failed to update payment");
  }
};

const deleteEntry = async (req, res) => {
  try {
    if (!isId(req.params.id)) return fail(res, 400, "Invalid entry");
    const entry = await PayrollEntry.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!entry) return fail(res, 404, "Entry not found");
    if (entry.expense) await Expense.deleteOne({ _id: entry.expense, userId: req.userId });
    return res.json({ success: true, message: "Deleted" });
  } catch (error) {
    return fail(res, 500, error.message || "Failed to delete payment");
  }
};

module.exports = {
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
};
