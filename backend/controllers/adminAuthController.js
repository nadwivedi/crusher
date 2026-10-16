const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const { recordAdminActivity } = require("../utils/adminActivityLog");

const ADMIN_COOKIE_NAME = process.env.ADMIN_AUTH_COOKIE_NAME || "admin_auth_token";

const verifyPassword = async (password, storedPassword) => bcrypt.compare(password, storedPassword);

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

const setAdminCookie = (res, token) => {
  res.cookie(ADMIN_COOKIE_NAME, token, getCookieOptions());
};

const clearAdminCookie = (res) => {
  res.clearCookie(ADMIN_COOKIE_NAME, {
    ...getCookieOptions(),
    maxAge: undefined,
  });
};

const sanitizeAdmin = (admin) => ({
  id: admin._id,
  email: admin.email,
  lastLoginAt: admin.lastLoginAt || null,
  createdAt: admin.createdAt,
  updatedAt: admin.updatedAt,
});

const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const admin = await Admin.findOne({ email: email.trim().toLowerCase() }).select("+password");
    if (!admin || !(await verifyPassword(password, admin.password))) {
      return res.status(401).json({ success: false, message: "Invalid admin email or password" });
    }

    admin.lastLoginAt = new Date();
    await admin.save();

    const token = jwt.sign(
      { adminId: admin._id, role: "admin" },
      process.env.JWT_SECRET || "your_jwt_secret",
      { expiresIn: "7d" }
    );

    setAdminCookie(res, token);

    recordAdminActivity(req, {
      action: "login",
      entity: "admin",
      entityId: admin._id,
      entityName: admin.email,
      summary: `${admin.email} signed in to the admin panel`,
      admin,
    });

    return res.json({
      success: true,
      message: "Admin login successful",
      data: sanitizeAdmin(admin),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Failed to login admin" });
  }
};

const getCurrentAdmin = async (req, res) => {
  return res.json({
    success: true,
    data: sanitizeAdmin(req.admin),
  });
};

const logoutAdmin = async (_req, res) => {
  clearAdminCookie(res);
  return res.json({ success: true, message: "Admin logout successful" });
};

module.exports = {
  loginAdmin,
  getCurrentAdmin,
  logoutAdmin,
};
