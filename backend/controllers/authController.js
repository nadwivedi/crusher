const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Employee = require("../models/Employee");

const saltRounds = 10;
const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "auth_token";

const hashPassword = async (password) => {
  return await bcrypt.hash(password, saltRounds);
};

const verifyPassword = async (password, storedPassword) => {
  return await bcrypt.compare(password, storedPassword);
};

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  mobile: user.mobile,
  state: user.state,
  district: user.district,
  lastLoginAt: user.lastLoginAt,
  featureAccess: {
    saleReturn: Boolean(user.featureAccess?.saleReturn),
    stockAdjustment: Boolean(user.featureAccess?.stockAdjustment),
  },
  materialRates: {
    tenMmRate: Number(user.materialRates?.tenMmRate || 0),
    tenMmRatePerCubicMeter: Number(user.materialRates?.tenMmRatePerCubicMeter || 0),
    twentyMmRate: Number(user.materialRates?.twentyMmRate || 0),
    twentyMmRatePerCubicMeter: Number(user.materialRates?.twentyMmRatePerCubicMeter || 0),
    fortyMmRate: Number(user.materialRates?.fortyMmRate || 0),
    fortyMmRatePerCubicMeter: Number(user.materialRates?.fortyMmRatePerCubicMeter || 0),
    sixtyMmRate: Number(user.materialRates?.sixtyMmRate || 0),
    sixtyMmRatePerCubicMeter: Number(user.materialRates?.sixtyMmRatePerCubicMeter || 0),
    sixMmRate: Number(user.materialRates?.sixMmRate || 0),
    sixMmRatePerCubicMeter: Number(user.materialRates?.sixMmRatePerCubicMeter || 0),
    fourMmRate: Number(user.materialRates?.fourMmRate || 0),
    fourMmRatePerCubicMeter: Number(user.materialRates?.fourMmRatePerCubicMeter || 0),
    wmmRate: Number(user.materialRates?.wmmRate || 0),
    wmmRatePerCubicMeter: Number(user.materialRates?.wmmRatePerCubicMeter || 0),
    gsbRate: Number(user.materialRates?.gsbRate || 0),
    gsbRatePerCubicMeter: Number(user.materialRates?.gsbRatePerCubicMeter || 0),
    dustRate: Number(user.materialRates?.dustRate || 0),
    dustRatePerCubicMeter: Number(user.materialRates?.dustRatePerCubicMeter || 0),
  },
});

const generateToken = (id) => (
  jwt.sign({ id }, process.env.JWT_SECRET || "your_jwt_secret", {
    expiresIn: "7d",
  })
);

const { redeemAccessToken, createAdminSessionToken } = require("../utils/adminAccess");

const getCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  };
};

const setAuthCookie = (res, token) => {
  res.cookie(AUTH_COOKIE_NAME, token, getCookieOptions());
};

const clearAuthCookie = (res) => {
  res.clearCookie(AUTH_COOKIE_NAME, {
    ...getCookieOptions(),
    maxAge: undefined,
  });
};

const normalizeRateValue = (value) => {
  const numericValue = Number(value || 0);
  if (!Number.isFinite(numericValue) || numericValue < 0) return 0;
  return numericValue;
};

const signupUser = async (req, res) => {
  try {
    const { companyName, phone, password } = req.body;
    const name = companyName;
    const mobile = phone;

    if (!name || !mobile || !password) {
      return res.status(400).json({ message: "Company name, mobile number, and password are required", field: "required" });
    }

    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(mobile)) {
      return res.status(400).json({ message: "Mobile number must be exactly 10 digits", field: "phone" });
    }

    if (password && password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters", field: "password" });
    }

    const existingUser = await User.findOne({ mobile: mobile.trim() });
    if (existingUser) {
      return res.status(409).json({ message: "User with this mobile number already exists", field: "phone" });
    }

    const hashedPassword = await hashPassword(password);

    const user = await User.create({
      name: name.trim(),
      mobile: mobile.trim(),
      password: hashedPassword,
      lastLoginAt: new Date(),
    });

    const token = generateToken(user._id);
    setAuthCookie(res, token);

    return res.status(201).json({
      success: true,
      message: "Signup successful",
      user: sanitizeUser(user),
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      if (field === 'mobile') {
        return res.status(409).json({ message: "User with this mobile number already exists", field: "phone" });
      }
      return res.status(409).json({ message: "User already exists" });
    }

    return res.status(500).json({ message: "Failed to signup user" });
  }
};

const loginUser = async (req, res) => {
  try {
    const { emailOrPhone, password } = req.body;
    const mobile = emailOrPhone;

    if (!mobile || !password) {
      return res
        .status(400)
        .json({ message: "Mobile number and password are required" });
    }

    const user = await User.findOne({ mobile: mobile.trim() }).select("+password");
    if (!user || !(await verifyPassword(password, user.password))) {
      return res.status(401).json({ message: "Invalid mobile number or password" });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = generateToken(user._id);
    setAuthCookie(res, token);

    return res.json({
      success: true,
      message: "Login successful",
      user: sanitizeUser(user),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to login user" });
  }
};

const employeeLogin = async (req, res) => {
  try {
    const { mobile, password } = req.body;

    if (!mobile || !password) {
      return res.status(400).json({ message: "Mobile number and password are required" });
    }

    const emp = await Employee.findOne({ mobile: mobile.trim() }).select("+password");
    if (!emp || !(await verifyPassword(password, emp.password))) {
      return res.status(401).json({ message: "Invalid mobile number or password" });
    }

    if (!emp.isActive) {
      return res.status(403).json({ message: "Your access has been revoked by the owner" });
    }

    const token = jwt.sign(
      { id: emp.ownerId, employeeId: emp._id, role: 'employee' },
      process.env.JWT_SECRET || "your_jwt_secret",
      { expiresIn: "7d" }
    );
    
    setAuthCookie(res, token);

    return res.json({
      success: true,
      message: "Staff login successful",
      user: {
         id: emp.ownerId, 
         employeeId: emp._id,
         name: emp.name,
         mobile: emp.mobile,
         role: 'employee',
         permissions: emp.permissions,
         historyLimitDays: emp.historyLimitDays
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to login staff" });
  }
};

module.exports = {
  signupUser,
  loginUser,
  employeeLogin,
  // An admin's one-time link: becomes an app session for that user, without counting as their sign-in
  adminAccessLogin: async (req, res) => {
    try {
      const { userId, adminId } = redeemAccessToken(req.body?.token);
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      setAuthCookie(res, createAdminSessionToken(user._id, adminId));
      const sanitized = sanitizeUser(user);
      sanitized.role = 'owner';
      sanitized.adminAccess = true;
      return res.json({ success: true, user: sanitized });
    } catch (error) {
      const expired = error.name === "TokenExpiredError";
      return res.status(401).json({
        success: false,
        message: expired ? "This access link has expired. Open it again from the admin panel." : error.message || "Invalid access link",
      });
    }
  },
  getCurrentUser: async (req, res) => {
    try {
      if (req.employee) {
        // Staff user session
        const owner = await User.findById(req.userId);
        if (!owner) return res.status(404).json({ success: false, message: "Owner account not found" });

        return res.json({
          success: true,
          data: {
             id: owner._id,
             employeeId: req.employee._id,
             name: req.employee.name,
             mobile: req.employee.mobile,
             role: 'employee',
             ownerName: owner.name,
             state: owner.state,
             district: owner.district,
             featureAccess: {
               saleReturn: Boolean(owner.featureAccess?.saleReturn),
               stockAdjustment: Boolean(owner.featureAccess?.stockAdjustment),
             },
             materialRates: sanitizeUser(owner).materialRates,
             permissions: req.employee.permissions,
             historyLimitDays: req.employee.historyLimitDays
          }
        });
      }

      // Standard owner session
      const user = await User.findById(req.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const sanitized = sanitizeUser(user);
      sanitized.role = 'owner';
      if (req.adminAccess) sanitized.adminAccess = true;

      return res.json({
        success: true,
        data: sanitized,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Failed to get current user" });
    }
  },
  logoutUser: async (req, res) => {
    try {
      clearAuthCookie(res);
      return res.json({ message: "Logout successful" });
    } catch (error) {
      return res.status(500).json({ message: "Failed to logout" });
    }
  },
  updateCurrentUserSettings: async (req, res) => {
    try {
      const user = await User.findById(req.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      user.featureAccess = {
        saleReturn: Boolean(req.body?.featureAccess?.saleReturn),
        stockAdjustment: Boolean(req.body?.featureAccess?.stockAdjustment),
      };
      user.materialRates = {
        tenMmRate: normalizeRateValue(req.body?.materialRates?.tenMmRate),
        tenMmRatePerCubicMeter: normalizeRateValue(req.body?.materialRates?.tenMmRatePerCubicMeter),
        twentyMmRate: normalizeRateValue(req.body?.materialRates?.twentyMmRate),
        twentyMmRatePerCubicMeter: normalizeRateValue(req.body?.materialRates?.twentyMmRatePerCubicMeter),
        fortyMmRate: normalizeRateValue(req.body?.materialRates?.fortyMmRate),
        fortyMmRatePerCubicMeter: normalizeRateValue(req.body?.materialRates?.fortyMmRatePerCubicMeter),
        sixtyMmRate: normalizeRateValue(req.body?.materialRates?.sixtyMmRate),
        sixtyMmRatePerCubicMeter: normalizeRateValue(req.body?.materialRates?.sixtyMmRatePerCubicMeter),
        sixMmRate: normalizeRateValue(req.body?.materialRates?.sixMmRate),
        sixMmRatePerCubicMeter: normalizeRateValue(req.body?.materialRates?.sixMmRatePerCubicMeter),
        fourMmRate: normalizeRateValue(req.body?.materialRates?.fourMmRate),
        fourMmRatePerCubicMeter: normalizeRateValue(req.body?.materialRates?.fourMmRatePerCubicMeter),
        wmmRate: normalizeRateValue(req.body?.materialRates?.wmmRate),
        wmmRatePerCubicMeter: normalizeRateValue(req.body?.materialRates?.wmmRatePerCubicMeter),
        gsbRate: normalizeRateValue(req.body?.materialRates?.gsbRate),
        gsbRatePerCubicMeter: normalizeRateValue(req.body?.materialRates?.gsbRatePerCubicMeter),
        dustRate: normalizeRateValue(req.body?.materialRates?.dustRate),
        dustRatePerCubicMeter: normalizeRateValue(req.body?.materialRates?.dustRatePerCubicMeter),
      };

      await user.save();

      return res.json({
        success: true,
        message: "Settings updated successfully",
        user: sanitizeUser(user),
      });
    } catch (error) {
      return res.status(500).json({ message: "Failed to update settings" });
    }
  },
};
