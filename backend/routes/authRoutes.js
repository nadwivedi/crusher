const express = require("express");
const { loginUser, signupUser, getCurrentUser, logoutUser } = require("../controllers/authController");
const auth = require("../middleware/auth");

const router = express.Router();

router.post("/register", signupUser);
router.post("/login", loginUser);
router.get("/current", auth, getCurrentUser);
router.post("/logout", logoutUser);

module.exports = router;
