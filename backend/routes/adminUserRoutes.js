const express = require("express");
const {
  getUserAccessLink,
  setUserStatus,
  getUsers,
  createUser,
  updateUser,
  deleteUser,
} = require("../controllers/adminUserController");
const adminAuth = require("../middleware/adminAuth");

const router = express.Router();

router.use(adminAuth);
router.get("/", getUsers);
router.post("/", createUser);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);
router.post("/:id/access", getUserAccessLink);
router.patch("/:id/status", setUserStatus);

module.exports = router;
