const mongoose = require("mongoose");

// Money moved from one of the user's cash / bank accounts to another (e.g. cash deposited in the bank).
const accountTransferSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fromAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bank",
      required: true,
    },
    toAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bank",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    transferDate: {
      type: Date,
      default: Date.now,
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

accountTransferSchema.index({ userId: 1, transferDate: -1 });

module.exports = mongoose.models.AccountTransfer || mongoose.model("AccountTransfer", accountTransferSchema);
