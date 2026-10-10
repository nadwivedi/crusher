const express = require("express");
const { loginUser, signupUser, getCurrentUser, logoutUser, updateCurrentUserSettings, employeeLogin, adminAccessLogin } = require("../controllers/authController");
const auth = require("../middleware/auth");

const router = express.Router();

router.post("/register", signupUser);
router.post("/login", loginUser);
router.post("/employee-login", employeeLogin);
router.post("/admin-access", adminAccessLogin);
router.get("/current", auth, getCurrentUser);
router.post("/logout", logoutUser);
router.patch("/current/settings", auth, updateCurrentUserSettings);

module.exports = router;
