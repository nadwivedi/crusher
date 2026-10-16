const mongoose = require("mongoose");
const Stock = require("../models/Stock");
const { scopedFilter, scopedIdFilter } = require("../utils/ownership");

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
    const { isDiesel, ...body } = req.body;
    const stock = await Stock.create({
      ...body,
      usedInVehicle: Boolean(body.usedInVehicle),
      userId: req.userId,
    });
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
    const stocks = await Stock.find(scopedFilter(req, buildSearchQuery(req.query.search))).sort({ createdAt: -1 });
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
    const stock = await Stock.findOne(scopedIdFilter(req, id));

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
    const { isDiesel, userId, ...body } = req.body;
    if (body.usedInVehicle !== undefined) body.usedInVehicle = Boolean(body.usedInVehicle);
    // Diesel always goes to vehicles and the DG set
    const current = await Stock.findOne(scopedIdFilter(req, id)).select("isDiesel");
    if (current?.isDiesel) body.usedInVehicle = true;
    const stock = await Stock.findOneAndUpdate(scopedIdFilter(req, id), body, {
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
    const dieselItem = await Stock.findOne(scopedIdFilter(req, id, { isDiesel: true })).select("_id");
    if (dieselItem) {
      return res.status(400).json({ message: "Diesel is a default item used by the diesel report and cannot be deleted" });
    }

    const stock = await Stock.findOneAndDelete(scopedIdFilter(req, id));

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
