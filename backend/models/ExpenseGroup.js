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
  },
  { timestamps: true }
);

expenseGroupSchema.index({ userId: 1, name: 1 }, { unique: true });

// Who added and last changed each entry
expenseGroupSchema.plugin(require("./plugins/audit"));

module.exports = mongoose.models.ExpenseGroup || mongoose.model("ExpenseGroup", expenseGroupSchema);
