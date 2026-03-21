const mongoose = require("mongoose");
const Sales = require("../models/Sales");
const Counter = require("../models/Counter");

const getInvoiceYear = (saleDateValue) => {
  const saleDate = saleDateValue ? new Date(saleDateValue) : new Date();
  if (Number.isNaN(saleDate.getTime())) {
    return new Date().getFullYear();
  }
  return saleDate.getFullYear();
};

const createInvoiceNumber = async (saleDateValue) => {
  const invoiceYear = getInvoiceYear(saleDateValue);
  const counterKey = `sales:${invoiceYear}`;
  const counter = await Counter.findOneAndUpdate(
    { key: counterKey },
    { $inc: { seq: 1 } },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );

  return `INV-${invoiceYear}-${String(counter.seq).padStart(4, "0")}`;
};

const createSales = async (req, res) => {
  try {
    const payload = {
      ...req.body,
      saleDate: req.body.saleDate || new Date(),
      invoiceNumber: await createInvoiceNumber(req.body.saleDate),
    };

    const sales = await Sales.create(payload);
    return res.status(201).json(sales);
  } catch (error) {
    return res.status(400).json({
      message: "Failed to create sales",
      error: error.message,
    });
  }
};

const getAllSales = async (_req, res) => {
  try {
    const sales = await Sales.find().sort({ createdAt: -1 });
    return res.json(sales);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch sales",
      error: error.message,
    });
  }
};

const getSalesById = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid sales id" });
  }

  try {
    const sales = await Sales.findById(id);

    if (!sales) {
      return res.status(404).json({ message: "Sales not found" });
    }

    return res.json(sales);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch sales",
      error: error.message,
    });
  }
};

const editSales = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid sales id" });
  }

  try {
    const updatePayload = { ...req.body };
    delete updatePayload.invoiceNumber;

    const sales = await Sales.findByIdAndUpdate(id, updatePayload, {
      new: true,
      runValidators: true,
    });

    if (!sales) {
      return res.status(404).json({ message: "Sales not found" });
    }

    return res.json(sales);
  } catch (error) {
    return res.status(400).json({
      message: "Failed to update sales",
      error: error.message,
    });
  }
};

const deleteSales = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid sales id" });
  }

  try {
    const sales = await Sales.findByIdAndDelete(id);

    if (!sales) {
      return res.status(404).json({ message: "Sales not found" });
    }

    return res.json({ message: "Sales deleted successfully" });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to delete sales",
      error: error.message,
    });
  }
};

module.exports = {
  createSales,
  getAllSales,
  getSalesById,
  editSales,
  deleteSales,
};
