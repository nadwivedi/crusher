const express = require("express");
const { getDayBook } = require("../controllers/reportsController");

const router = express.Router();

router.get("/day-book", getDayBook);

module.exports = router;
