const express = require("express");
const { getDeployStatus, startDeploy } = require("../controllers/adminDeployController");
const adminAuth = require("../middleware/adminAuth");

const router = express.Router();

router.use(adminAuth);
router.get("/", getDeployStatus);
// Pull the latest code and update the server
router.post("/", startDeploy);

module.exports = router;
