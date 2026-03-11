const express = require("express");
const {
  createParty,
  getAllParties,
  getPartyById,
  editParty,
  deleteParty,
} = require("../controllers/partyController");

const router = express.Router();

router.get("/", getAllParties);
router.get("/:id", getPartyById);
router.post("/", createParty);
router.put("/:id", editParty);
router.delete("/:id", deleteParty);

module.exports = router;
