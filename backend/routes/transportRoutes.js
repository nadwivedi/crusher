const express = require("express");
const {
  getTransportEntries,
  createTransportEntry,
  editTransportEntry,
  deleteTransportEntry,
} = require("../controllers/transportController");
const auth = require("../middleware/auth");
const checkPermission = require("../middleware/role");

const router = express.Router();

router.use(auth);

router.get("/", getTransportEntries);
router.post("/", checkPermission("add"), createTransportEntry);
router.put("/:id", checkPermission("edit"), editTransportEntry);
router.delete("/:id", checkPermission("edit"), deleteTransportEntry);

module.exports = router;
