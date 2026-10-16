const express = require("express");
const { getAdminActivity } = require("../controllers/adminAuditController");
const adminAuth = require("../middleware/adminAuth");

const router = express.Router();

router.use(adminAuth);
// Everything an admin added, edited or deleted
router.get("/activity", getAdminActivity);

module.exports = router;
