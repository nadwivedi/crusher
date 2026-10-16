const mongoose = require("mongoose");

const expenseTypeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    type: {
      type: String,
      trim: true,
      default: "services",
    },
    unit: {
      type: String,
      trim: true,
      default: "",
    },
    currentStock: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

expenseTypeSchema.index({ userId: 1, name: 1 }, { unique: true });

// Who added and last changed each entry
expenseTypeSchema.plugin(require("./plugins/audit"));

module.exports = mongoose.models.ExpenseType || mongoose.model("ExpenseType", expenseTypeSchema, "expensegroups");
