const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const connectDB = require("./config/mongodb");
const upload = require("./config/multer");
const boulderRoutes = require("./routes/boulderRoutes");
const partyRoutes = require("./routes/partyRoutes");
const salesRoutes = require("./routes/salesRoutes");
const vehicleRoutes = require("./routes/vehicleRoutes");

dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.json({ message: "Backend is running" });
});

app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  return res.json({
    message: "File uploaded successfully",
    filename: req.file.filename,
  });
});

app.use("/api/boulders", boulderRoutes);
app.use("/api/parties", partyRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/vehicles", vehicleRoutes);

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
