const mongoose = require("mongoose");

const bankSchema = new mongoose.Schema(
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
    type: {
      type: String,
      enum: ["cash", "bank"],
      default: "bank",
    },
    // Opening balance. The current balance is worked out from the entries made against the account.
    totalBalance: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

bankSchema.index({ userId: 1, name: 1 }, { unique: true });

module.exports = mongoose.models.Bank || mongoose.model("Bank", bankSchema);
