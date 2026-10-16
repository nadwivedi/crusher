const Employee = require("../models/Employee");
const bcrypt = require("bcryptjs");
const { readSections } = require("../utils/staffSections");

const saltRounds = 10;

const hashPassword = async (password) => {
  return await bcrypt.hash(password, saltRounds);
};

// Get all employees for the current owner
const getEmployees = async (req, res) => {
  try {
    const employees = await Employee.find({ ownerId: req.userId }).select("-password");
    res.json({ success: true, count: employees.length, data: employees });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to fetch employees" });
  }
};

// Add a new employee
const addEmployee = async (req, res) => {
  try {
    const { name, mobile, password, isActive, permissions, historyLimitDays, sections } = req.body;

    // Check limit
    const employeeCount = await Employee.countDocuments({ ownerId: req.userId });
    if (employeeCount >= 5) {
      return res.status(400).json({ success: false, message: "Maximum limit of 5 employees reached" });
    }

    if (!name || !mobile || !password) {
      return res.status(400).json({ success: false, message: "Name, mobile, and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    }

    // Check if mobile already exists globally for employees
    const existingEmp = await Employee.findOne({ mobile: mobile.trim() });
    if (existingEmp) {
      return res.status(409).json({ success: false, message: "This mobile number is already registered as an employee" });
    }

    const hashedPassword = await hashPassword(password);

    const newEmployee = await Employee.create({
      name: name.trim(),
      mobile: mobile.trim(),
      password: hashedPassword,
      ownerId: req.userId,
      isActive: isActive !== undefined ? isActive : true,
      permissions: permissions || { view: true, add: false, edit: false },
      historyLimitDays: historyLimitDays || 7,
      sections: readSections(sections),
    });

    res.status(201).json({ success: true, message: "Employee added successfully", data: Object.assign({}, newEmployee.toObject(), { password: null }) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to add employee" });
  }
};

// Update an employee
const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, mobile, isActive, permissions, historyLimitDays, sections, password } = req.body;

    const employee = await Employee.findOne({ _id: id, ownerId: req.userId });
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    if (name) employee.name = name.trim();
    if (mobile) {
       // Check if changing to an already taken number
       if (mobile.trim() !== employee.mobile) {
           const existing = await Employee.findOne({ mobile: mobile.trim() });
           if (existing) {
               return res.status(409).json({ success: false, message: "This mobile number is already taken" });
           }
       }
       employee.mobile = mobile.trim();
    }
    if (isActive !== undefined) employee.isActive = isActive;
    if (permissions) employee.permissions = permissions;
    if (historyLimitDays !== undefined) employee.historyLimitDays = historyLimitDays;
    if (sections !== undefined) employee.sections = readSections(sections);
    // A new password typed in the edit form
    if (password) {
      if (String(password).length < 6) {
        return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
      }
      employee.password = await hashPassword(password);
    }

    await employee.save();

    const saved = employee.toObject();
    delete saved.password;
    res.json({ success: true, message: "Employee updated successfully", data: saved });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to update employee" });
  }
};

// Reset password
const resetEmployeePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    }

    const employee = await Employee.findOne({ _id: id, ownerId: req.userId });
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    employee.password = await hashPassword(password);
    await employee.save();

    res.json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to reset password" });
  }
};

// Delete an employee
const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const employee = await Employee.findOneAndDelete({ _id: id, ownerId: req.userId });
    
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    res.json({ success: true, message: "Employee deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to delete employee" });
  }
};

module.exports = {
  getEmployees,
  addEmployee,
  updateEmployee,
  resetEmployeePassword,
  deleteEmployee
};
