const express = require("express");
const {
  createBoulder,
  getAllBoulders,
  getBoulderById,
  editBoulder,
  deleteBoulder,
} = require("../controllers/boulderController");

const router = express.Router();

router.get("/", getAllBoulders);
router.get("/:id", getBoulderById);
router.post("/", createBoulder);
router.put("/:id", editBoulder);
router.delete("/:id", deleteBoulder);

module.exports = router;
