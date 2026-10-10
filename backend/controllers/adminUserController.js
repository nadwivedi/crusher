const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { createAccessLink } = require("../utils/adminAccess");

const saltRounds = 10;

const hashPassword = async (password) => bcrypt.hash(password, saltRounds);

const sanitizeAdminUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email || "",
  mobile: user.mobile,
  state: user.state || "",
  district: user.district || "",
  lastLoginAt: user.lastLoginAt || null,
  lastActivityAt: user.lastActivityAt || null,
  planType: user.planType || "yearly",
  planPrice: Number(user.planPrice || 0),
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const validateMobile = (mobile = "") => /^\d{10}$/.test(String(mobile).trim());

const PLAN_TYPES = ["yearly", "lifetime"];

// The plan from the request, or an error message for the admin
const readPlan = (body = {}) => {
  const planType = String(body.planType || "").trim();
  if (!PLAN_TYPES.includes(planType)) return { error: "Choose a yearly or lifetime plan" };
  const planPrice = Number(body.planPrice);
  if (!Number.isFinite(planPrice) || planPrice < 0) return { error: "Enter a valid plan price" };
  return { planType, planPrice: Math.round(planPrice * 100) / 100 };
};

const getUsers = async (_req, res) => {
  try {
    const users = await User.find({})
      .sort({ createdAt: -1 })
      .select("name email mobile state district lastLoginAt lastActivityAt planType planPrice createdAt updatedAt");

    return res.json({
      success: true,
      count: users.length,
      data: users.map(sanitizeAdminUser),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Failed to fetch users" });
  }
};

const createUser = async (req, res) => {
  try {
    const { name, email, mobile, password, state, district } = req.body;

    if (!name?.trim() || !mobile?.trim() || !password) {
      return res.status(400).json({ success: false, message: "Name, mobile, and password are required" });
    }

    if (!validateMobile(mobile)) {
      return res.status(400).json({ success: false, message: "Mobile number must be exactly 10 digits" });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    }

    const plan = readPlan(req.body);
    if (plan.error) {
      return res.status(400).json({ success: false, message: plan.error });
    }

    const normalizedMobile = mobile.trim();
    const normalizedEmail = email?.trim() ? email.trim().toLowerCase() : "";

    const existingUser = await User.findOne({
      $or: [
        { mobile: normalizedMobile },
        ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
      ],
    });

    if (existingUser) {
      return res.status(409).json({ success: false, message: "User with this mobile or email already exists" });
    }

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail || undefined,
      mobile: normalizedMobile,
      password: await hashPassword(password),
      state: state?.trim() || "",
      district: district?.trim() || "",
      planType: plan.planType,
      planPrice: plan.planPrice,
    });

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      data: sanitizeAdminUser(user),
    });
  } catch (error) {
    console.error(error);
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "User with this mobile or email already exists" });
    }
    return res.status(500).json({ success: false, message: "Failed to create user" });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, mobile, password, state, district } = req.body;

    const user = await User.findById(id).select("+password");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (mobile !== undefined) {
      if (!validateMobile(mobile)) {
        return res.status(400).json({ success: false, message: "Mobile number must be exactly 10 digits" });
      }

      const normalizedMobile = mobile.trim();
      if (normalizedMobile !== user.mobile) {
        const existingMobile = await User.findOne({ mobile: normalizedMobile, _id: { $ne: id } });
        if (existingMobile) {
          return res.status(409).json({ success: false, message: "This mobile number is already in use" });
        }
        user.mobile = normalizedMobile;
      }
    }

    if (email !== undefined) {
      const normalizedEmail = email?.trim() ? email.trim().toLowerCase() : "";
      if (normalizedEmail) {
        const existingEmail = await User.findOne({ email: normalizedEmail, _id: { $ne: id } });
        if (existingEmail) {
          return res.status(409).json({ success: false, message: "This email is already in use" });
        }
      }
      user.email = normalizedEmail || undefined;
    }

    if (req.body.planType !== undefined || req.body.planPrice !== undefined) {
      const plan = readPlan({ planType: req.body.planType ?? user.planType, planPrice: req.body.planPrice ?? user.planPrice });
      if (plan.error) {
        return res.status(400).json({ success: false, message: plan.error });
      }
      user.planType = plan.planType;
      user.planPrice = plan.planPrice;
    }

    if (name !== undefined) user.name = name.trim();
    if (state !== undefined) user.state = state.trim();
    if (district !== undefined) user.district = district.trim();

    if (password !== undefined && password !== "") {
      if (String(password).length < 6) {
        return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
      }
      user.password = await hashPassword(password);
    }

    await user.save();

    return res.json({
      success: true,
      message: "User updated successfully",
      data: sanitizeAdminUser(user),
    });
  } catch (error) {
    console.error(error);
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "User with this mobile or email already exists" });
    }
    return res.status(500).json({ success: false, message: "Failed to update user" });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Failed to delete user" });
  }
};

// A one-time link that opens the crusher app signed in as this user
const getUserAccessLink = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("_id name");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    return res.json({ success: true, data: { url: createAccessLink(user._id, req.adminId), name: user.name } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Failed to create access link" });
  }
};

module.exports = {
  getUserAccessLink,
  getUsers,
  createUser,
  updateUser,
  deleteUser,
};
