// What a staff login may reach. The owner (and the admin opening the account) is never limited here.

const deny = (res, message) => res.status(403).json({ success: false, message });

const hasSection = (req, section) => !req.employee || req.employee.sections?.[section] !== false;

// The whole route is one section of the app; staff without it get nothing from it
const requireSection = (section) => (req, res, next) => (
  hasSection(req, section) ? next() : deny(res, "You do not have access to this part of the app.")
);

// Reading is open to every staff login (entry screens need these lists); changing needs the section
const sectionForChanges = (section) => (req, res, next) => (
  req.method === "GET" || hasSection(req, section)
    ? next()
    : deny(res, "You do not have access to change this.")
);

// Owner-only screens: reports, analytics, cash & bank
const ownerOnly = (req, res, next) => (
  req.employee ? deny(res, "Only the owner can see this.") : next()
);

// Staff may change only entries they added themselves, and only inside their visible days
const ownEntryOnly = (Model, dateField) => async (req, res, next) => {
  if (!req.employee) return next();
  try {
    const entry = await Model.findOne({ _id: req.params.id, userId: req.userId }).select(`createdBy ${dateField || ""}`).lean();
    if (!entry) return res.status(404).json({ success: false, message: "Entry not found" });
    const addedByThisStaff = entry.createdBy?.kind === "staff" && entry.createdBy?.id === String(req.employee._id);
    if (!addedByThisStaff) return deny(res, "You can change only the entries you added.");
    if (dateField && req.visibilityBoundary && entry[dateField] && new Date(entry[dateField]) < req.visibilityBoundary) {
      return deny(res, "This entry is older than you are allowed to see.");
    }
    return next();
  } catch {
    return res.status(404).json({ success: false, message: "Entry not found" });
  }
};

// Adds the staff login's oldest visible date to a list query, so older entries are never sent
const applyVisibility = (req, query, dateField) => {
  if (!req.visibilityBoundary) return query;
  const current = query[dateField];
  // An exact date asked for: keep it unless it is too old
  if (current instanceof Date || typeof current === "string") {
    if (new Date(current) < req.visibilityBoundary) query[dateField] = { $gte: req.visibilityBoundary, $lt: req.visibilityBoundary };
    return query;
  }
  const existing = current && typeof current === "object" ? current : null;
  if (existing && existing.$gte && new Date(existing.$gte) > req.visibilityBoundary) return query;
  query[dateField] = { ...(existing || {}), $gte: req.visibilityBoundary };
  return query;
};

module.exports = { requireSection, sectionForChanges, ownerOnly, ownEntryOnly, applyVisibility, hasSection };
