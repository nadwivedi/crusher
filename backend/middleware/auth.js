const jwt = require("jsonwebtoken");
const Employee = require("../models/Employee");
const User = require("../models/User");

// Last activity is written at most once every few minutes per account, so busy pages do not hit the database each time
const ACTIVITY_WRITE_GAP_MS = 5 * 60 * 1000;
const lastActivityWrite = new Map();

const recordActivity = (userId) => {
  const key = String(userId || "");
  if (!key) return;
  const now = Date.now();
  if (now - (lastActivityWrite.get(key) || 0) < ACTIVITY_WRITE_GAP_MS) return;
  lastActivityWrite.set(key, now);
  User.updateOne({ _id: key }, { $set: { lastActivityAt: new Date(now) } }).catch(() => {
    // A missed activity time is not worth failing the request for
    lastActivityWrite.delete(key);
  });
};

const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "auth_token";

const auth = async (req, res, next) => {
  try {
    const token = req.cookies?.[AUTH_COOKIE_NAME] || req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided. Authorization denied",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your_jwt_secret");
    
    // Always assign the Owner's ID so existing data segmentation keeps working perfectly
    req.userId = decoded.id;
    // Opened by an admin from the admin panel
    req.adminAccess = Boolean(decoded.adminAccess);
    
    // Attach employee context if it's a staff login
    if (decoded.role === 'employee' && decoded.employeeId) {
      const emp = await Employee.findById(decoded.employeeId).select('-password');
      if (!emp || !emp.isActive) {
        return res.status(401).json({
           success: false,
           message: "Employee access revoked or account invalid."
        });
      }
      req.employee = emp;
      
      // Calculate data visibility limit
      if (emp.historyLimitDays && emp.historyLimitDays !== 'all') {
        const days = parseInt(emp.historyLimitDays, 10);
        if (!isNaN(days)) {
           const cutoff = new Date();
           cutoff.setHours(0, 0, 0, 0);
           cutoff.setDate(cutoff.getDate() - days);
           req.visibilityBoundary = cutoff;
        }
      }
    }

    if (!req.adminAccess) recordActivity(req.userId);
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token has expired",
      });
    }

    return res.status(401).json({
      success: false,
      message: "Invalid token. Authorization denied",
    });
  }
};

module.exports = auth;
