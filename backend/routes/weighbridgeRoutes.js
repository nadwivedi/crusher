const express = require("express");
const {
  listDevices,
  createDevice,
  updateDevice,
  removeDevice,
  postReading,
  streamLive,
  createWeighment,
  captureSecond,
  cancelWeighment,
  listWeighments,
  getWeighment,
  getVehicleTare,
} = require("../controllers/weighbridgeController");
const auth = require("../middleware/auth");
const { ownerOnly, hasSection } = require("../middleware/staffAccess");
const checkPermission = require("../middleware/role");
const User = require("../models/User");

const router = express.Router();

// The admin switches the weighbridge on per account (Enterprise plan). Cached briefly,
// because the kanta computer posts readings a few times a second.
const FEATURE_CACHE_MS = 60 * 1000;
const featureCache = new Map();

const requireWeighbridgeFeature = async (req, res, next) => {
  try {
    const key = String(req.userId);
    const cached = featureCache.get(key);
    let enabled = cached && Date.now() - cached.at < FEATURE_CACHE_MS ? cached.enabled : null;
    if (enabled === null) {
      const user = await User.findById(key).select("featureAccess").lean();
      enabled = Boolean(user?.featureAccess?.weighbridge);
      featureCache.set(key, { enabled, at: Date.now() });
    }
    if (!enabled) {
      return res.status(403).json({ success: false, code: "FEATURE_OFF", message: "Weighbridge integration is not switched on for this account. Talk to CrusherBook to add it." });
    }
    return next();
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not check weighbridge access" });
  }
};

// Staff who make sales or boulder entries work the kanta
const requireKantaStaff = (req, res, next) => (
  hasSection(req, "sales") || hasSection(req, "boulder")
    ? next()
    : res.status(403).json({ success: false, message: "You do not have access to the weighbridge." })
);

router.use(auth);
router.use(requireWeighbridgeFeature);
router.use(requireKantaStaff);

router.get("/devices", listDevices);
router.post("/devices", ownerOnly, createDevice);
router.put("/devices/:id", ownerOnly, updateDevice);
router.delete("/devices/:id", ownerOnly, removeDevice);

router.post("/readings", postReading);
router.get("/live", streamLive);

router.get("/vehicle-tare", getVehicleTare);
router.get("/weighments", listWeighments);
router.get("/weighments/:id", getWeighment);
router.post("/weighments", checkPermission("add"), createWeighment);
router.post("/weighments/:id/second", checkPermission("add"), captureSecond);
router.post("/weighments/:id/cancel", cancelWeighment);

module.exports = router;
