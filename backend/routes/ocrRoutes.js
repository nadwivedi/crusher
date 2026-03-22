const express = require("express");
const { extractSaleFromImage, upload } = require("../controllers/ocrController");

const router = express.Router();

// POST /api/ocr/extract-sale
// Expects multipart/form-data with field name "image"
router.post("/extract-sale", upload.single("image"), extractSaleFromImage);

module.exports = router;
