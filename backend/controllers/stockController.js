const mongoose = require("mongoose");
const Stock = require("../models/Stock");

const buildSearchQuery = (search) => {
  const normalizedSearch = String(search || "").trim();
  if (!normalizedSearch) {
    return {};
  }

  return {
    $or: [
      { name: { $regex: normalizedSearch, $options: "i" } },
      { unit: { $regex: normalizedSearch, $options: "i" } },
    ],
  };
};

const createStock = async (req, res) => {
  try {
    const stock = await Stock.create(req.body);
    return res.status(201).json({ data: stock });
  } catch (error) {
    return res.status(400).json({
      message: "Failed to create stock item",
      error: error.message,
    });
  }
};

const getAllStocks = async (req, res) => {
  try {
    const stocks = await Stock.find(buildSearchQuery(req.query.search)).sort({ createdAt: -1 });
    return res.json({ data: stocks });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch stock items",
      error: error.message,
    });
  }
};

const getStockById = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid stock id" });
  }

  try {
    const stock = await Stock.findById(id);

    if (!stock) {
      return res.status(404).json({ message: "Stock item not found" });
    }

    return res.json({ data: stock });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch stock item",
      error: error.message,
    });
  }
};

const editStock = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid stock id" });
  }

  try {
    const stock = await Stock.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!stock) {
      return res.status(404).json({ message: "Stock item not found" });
    }

    return res.json({ data: stock });
  } catch (error) {
    return res.status(400).json({
      message: "Failed to update stock item",
      error: error.message,
    });
  }
};

const deleteStock = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid stock id" });
  }

  try {
    const stock = await Stock.findByIdAndDelete(id);

    if (!stock) {
      return res.status(404).json({ message: "Stock item not found" });
    }

    return res.json({ message: "Stock item deleted successfully" });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to delete stock item",
      error: error.message,
    });
  }
};

module.exports = {
  createStock,
  getAllStocks,
  getStockById,
  editStock,
  deleteStock,
};
