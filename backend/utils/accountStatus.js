const User = require("../models/User");

// Whether an account may use the app. Checked on every request, so the answer is kept for a short while;
// the admin panel clears it the moment an account is deactivated or turned back on.
const STATUS_CACHE_MS = 60 * 1000;
const statusCache = new Map();

const DEACTIVATED_MESSAGE = "This account has been deactivated. Please contact CrusherBook support.";

const isAccountActive = async (userId) => {
  const key = String(userId || "");
  if (!key) return false;
  const cached = statusCache.get(key);
  if (cached && Date.now() - cached.checkedAt < STATUS_CACHE_MS) return cached.active;

  const user = await User.findById(key).select("isActive").lean();
  // A missing account is left to the route to report; only an explicit deactivation blocks here
  const active = !user || user.isActive !== false;
  statusCache.set(key, { active, checkedAt: Date.now() });
  return active;
};

const forgetAccountStatus = (userId) => {
  statusCache.delete(String(userId || ""));
};

module.exports = { isAccountActive, forgetAccountStatus, DEACTIVATED_MESSAGE };
