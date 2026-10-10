const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const connectDB = require("./config/mongodb");
const syncOwnershipIndexes = require("./config/syncIndexes");
const authRoutes = require("./routes/authRoutes");
const adminAuthRoutes = require("./routes/adminAuthRoutes");
const adminUserRoutes = require("./routes/adminUserRoutes");
const bankRoutes = require("./routes/bankRoutes");
const boulderRoutes = require("./routes/boulderRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const expenseTypeRoutes = require("./routes/expenseTypeRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const materialUsedRoutes = require("./routes/materialUsedRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const partyRoutes = require("./routes/partyRoutes");
const purchaseRoutes = require("./routes/purchaseRoutes");
const purchaseReturnRoutes = require("./routes/purchaseReturnRoutes");
const receiptRoutes = require("./routes/receiptRoutes");
const reportRoutes = require("./routes/reportRoutes");
const salesRoutes = require("./routes/salesRoutes");
const saleReturnRoutes = require("./routes/saleReturnRoutes");
const stockAdjustmentRoutes = require("./routes/stockAdjustmentRoutes");
const stockRoutes = require("./routes/stockRoutes");
const transportRoutes = require("./routes/transportRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const vehicleRoutes = require("./routes/vehicleRoutes");
const ocrRoutes = require("./routes/ocrRoutes");

dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT || 5000;

const corsOptions = {
  origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "https://app.crusherbook.com", "https://crusherbook.com"],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res) => {
  res.json({ message: "Backend is running" });
});

app.use("/api/users", authRoutes);
app.use("/api/admin/auth", adminAuthRoutes);
app.use("/api/admin/users", adminUserRoutes);
app.use("/api/banks", bankRoutes);
app.use("/api/boulders", boulderRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/expense-types", expenseTypeRoutes);
app.use("/api/expense-groups", expenseTypeRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/material-used", materialUsedRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/parties", partyRoutes);
app.use("/api/purchases", purchaseRoutes);
app.use("/api/purchase-returns", purchaseReturnRoutes);
app.use("/api/receipts", receiptRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/products", stockRoutes);
app.use("/api/stock-adjustments", stockAdjustmentRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/sale-returns", saleReturnRoutes);
app.use("/api/transport", transportRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/ocr", ocrRoutes);

const startServer = async () => {
  try {
    await connectDB();
    await syncOwnershipIndexes();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
