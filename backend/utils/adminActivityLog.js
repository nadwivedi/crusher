const AdminActivityLog = require("../models/AdminActivityLog");

const clientIp = (req) => {
  const forwarded = req.headers?.["x-forwarded-for"];
  if (forwarded) return String(forwarded).split(",")[0].trim();
  return req.ip || req.socket?.remoteAddress;
};

// Save one activity row. Never throws: a failed log must not fail the admin's action.
const recordAdminActivity = (req, { action, entity, entityId, entityName, summary, changes, admin }) => {
  const who = admin || req.admin || {};
  return AdminActivityLog.create({
    action,
    entity,
    entityId: entityId ? String(entityId) : undefined,
    entityName,
    summary,
    changes: changes && changes.length ? changes : undefined,
    adminId: who._id ? String(who._id) : undefined,
    adminEmail: who.email,
    ip: clientIp(req),
    userAgent: req.headers?.["user-agent"],
  }).catch((error) => {
    console.error("Admin activity log error:", error.message);
  });
};

// Make values comparable and readable: empty -> null, dates -> YYYY-MM-DD
const normalize = (value) => {
  if (value === undefined || value === null || value === "") return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  return value;
};

// Snapshot of the listed fields of a record
const snapshot = (doc, fields) => {
  const source = doc && typeof doc.toObject === "function" ? doc.toObject() : doc || {};
  const out = {};
  for (const { key } of fields) out[key] = normalize(source[key]);
  return out;
};

// [{ field, from, to }] for every listed field whose value differs between two snapshots.
// Pass {} as `before` for a new record or as `after` for a deleted one to list its filled fields.
const diffSnapshots = (before, after, fields) =>
  fields
    .map(({ key, label }) => ({ field: label, from: before[key] ?? null, to: after[key] ?? null }))
    .filter(({ from, to }) => JSON.stringify(from) !== JSON.stringify(to));

module.exports = { recordAdminActivity, snapshot, diffSnapshots };
