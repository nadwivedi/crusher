const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const connectDB = require("./config/mongodb");
const upload = require("./config/multer");
const authRoutes = require("./routes/authRoutes");
const boulderRoutes = require("./routes/boulderRoutes");
const expenseGroupRoutes = require("./routes/expenseGroupRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const partyRoutes = require("./routes/partyRoutes");
const purchaseRoutes = require("./routes/purchaseRoutes");
const salesRoutes = require("./routes/salesRoutes");
const stockRoutes = require("./routes/stockRoutes");
const vehicleRoutes = require("./routes/vehicleRoutes");

dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT || 5000;

const corsOptions = {
  origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(cookieParser());
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

app.use("/api/users", authRoutes);
app.use("/api/boulders", boulderRoutes);
app.use("/api/expense-groups", expenseGroupRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/parties", partyRoutes);
app.use("/api/purchases", purchaseRoutes);
app.use("/api/products", stockRoutes);
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
