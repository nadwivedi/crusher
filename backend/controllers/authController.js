const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

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
});

const generateToken = (id) => (
  jwt.sign({ id }, process.env.JWT_SECRET || "your_jwt_secret", {
    expiresIn: "7d",
  })
);

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

module.exports = {
  signupUser,
  loginUser,
  getCurrentUser: async (req, res) => {
    try {
      const user = await User.findById(req.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      return res.json({
        success: true,
        data: sanitizeUser(user),
      });
    } catch (error) {
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
};
