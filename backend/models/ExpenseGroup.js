const mongoose = require("mongoose");

const expenseGroupSchema = new mongoose.Schema(
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
      enum: ["goods", "services"],
      default: "services",
      trim: true,
    },
    unit: {
      type: String,
      trim: true,
      default: "",
    },
    currentStock: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

expenseGroupSchema.index({ userId: 1, name: 1 }, { unique: true });

module.exports = mongoose.models.ExpenseGroup || mongoose.model("ExpenseGroup", expenseGroupSchema);
