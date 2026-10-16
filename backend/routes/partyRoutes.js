const express = require("express");
const {
  createParty,
  getAllParties,
  getPartyById,
  editParty,
  deleteParty,
} = require("../controllers/partyController");
const auth = require("../middleware/auth");
const { sectionForChanges, ownerOnly, ownEntryOnly } = require("../middleware/staffAccess");
const Party = require("../models/Party");
const { syncMonthlyHiresMiddleware } = require("../utils/monthlyHire");
const checkPermission = require("../middleware/role");

const router = express.Router();

router.use(auth);
// Every staff login can read these lists; changing them needs the "masters" part
router.use(sectionForChanges("masters"));
router.use(syncMonthlyHiresMiddleware);

router.get("/", getAllParties);
router.get("/:id", getPartyById);
router.post("/", checkPermission("add"), createParty);
router.put("/:id", checkPermission("edit"), ownEntryOnly(Party), editParty);
router.delete("/:id", ownerOnly, deleteParty);

module.exports = router;
