const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET || "your_jwt_secret";
const LINK_LIFETIME = "2m";
const SESSION_LIFETIME = "8h";

// Where the crusher app lives; the link opens there
const getAppUrl = () => (process.env.APP_URL
  || (process.env.NODE_ENV === "production" ? "https://app.crusherbook.com" : "http://localhost:5173")).replace(/\/$/, "");

// Each link works once: its id is remembered until it would have expired anyway
const usedLinkIds = new Map();
const forgetExpiredLinks = () => {
  const now = Date.now();
  for (const [id, expiresAt] of usedLinkIds) {
    if (expiresAt < now) usedLinkIds.delete(id);
  }
};

/** A link that signs the admin into the app as this user. It expires in 2 minutes and works once. */
const createAccessLink = (userId, adminId) => {
  const token = jwt.sign(
    { purpose: "admin_access", userId: String(userId), adminId: String(adminId), jti: crypto.randomUUID() },
    SECRET,
    { expiresIn: LINK_LIFETIME }
  );
  return `${getAppUrl()}/admin-access?token=${encodeURIComponent(token)}`;
};

/** Checks a link's token and uses it up. Returns { userId, adminId } or throws. */
const redeemAccessToken = (token) => {
  const decoded = jwt.verify(String(token || ""), SECRET);
  if (decoded.purpose !== "admin_access" || !decoded.userId || !decoded.jti) {
    throw new Error("Invalid access link");
  }
  forgetExpiredLinks();
  if (usedLinkIds.has(decoded.jti)) {
    throw new Error("This access link was already used");
  }
  usedLinkIds.set(decoded.jti, decoded.exp * 1000);
  return { userId: decoded.userId, adminId: decoded.adminId };
};

// The app session an admin gets: an ordinary user session, marked as admin access and shorter
const createAdminSessionToken = (userId, adminId) => jwt.sign(
  { id: String(userId), adminAccess: true, adminId: String(adminId || "") },
  SECRET,
  { expiresIn: SESSION_LIFETIME }
);

module.exports = { createAccessLink, redeemAccessToken, createAdminSessionToken };
