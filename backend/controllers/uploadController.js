const path = require("path");

const buildFileResponse = (req, file) => {
  if (!file) {
    return null;
  }

  const normalizedFilename = path.basename(file.filename);
  const relativePath = `/uploads/${normalizedFilename}`;
  const baseUrl = `${req.protocol}://${req.get("host")}`;

  return {
    message: "File uploaded successfully",
    filename: normalizedFilename,
    relativePath,
    url: `${baseUrl}${relativePath}`,
    mimeType: file.mimetype,
    originalName: file.originalname,
  };
};

const uploadSlip = (req, res) => {
  const fileResponse = buildFileResponse(req, req.file);

  if (!fileResponse) {
    return res.status(400).json({ message: "No slip uploaded" });
  }

  return res.json(fileResponse);
};

const uploadInvoice = (req, res) => {
  const fileResponse = buildFileResponse(req, req.file);

  if (!fileResponse) {
    return res.status(400).json({ message: "No invoice uploaded" });
  }

  return res.json(fileResponse);
};

module.exports = {
  uploadSlip,
  uploadInvoice,
};
