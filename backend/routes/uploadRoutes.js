const express = require("express");
const upload = require("../config/multer");
const { uploadInvoice, uploadSlip } = require("../controllers/uploadController");

const router = express.Router();

router.post("/invoice", upload.single("invoice"), uploadInvoice);
router.post("/slip", upload.single("slip"), uploadSlip);

module.exports = router;
