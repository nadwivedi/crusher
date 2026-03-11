const mongoose = require("mongoose");
const Sales = require("../models/Sales");

const createSales = async (req, res) => {
  try {
    const sales = await Sales.create(req.body);
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
    const sales = await Sales.findByIdAndUpdate(id, req.body, {
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
