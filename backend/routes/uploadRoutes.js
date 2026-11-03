const express = require("express");
const upload = require("../config/multer");
const { uploadDocument, uploadInvoice, uploadSlip } = require("../controllers/uploadController");
const auth = require("../middleware/auth");

const router = express.Router();

router.use(auth);

router.post("/invoice", upload.single("invoice"), uploadInvoice);
router.post("/slip", upload.single("slip"), uploadSlip);
router.post("/document", upload.single("document"), uploadDocument);

module.exports = router;
