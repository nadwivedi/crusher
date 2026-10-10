const express = require("express");
const {
  createParty,
  getAllParties,
  getPartyById,
  editParty,
  deleteParty,
} = require("../controllers/partyController");
const auth = require("../middleware/auth");
const { syncMonthlyHiresMiddleware } = require("../utils/monthlyHire");
const checkPermission = require("../middleware/role");

const router = express.Router();

router.use(auth);
router.use(syncMonthlyHiresMiddleware);

router.get("/", getAllParties);
router.get("/:id", getPartyById);
router.post("/", checkPermission("add"), createParty);
router.put("/:id", checkPermission("edit"), editParty);
router.delete("/:id", checkPermission("edit"), deleteParty);

module.exports = router;
