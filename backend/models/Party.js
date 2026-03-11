const mongoose = require("mongoose");

const partySchema = new mongoose.Schema(
  {
    partyName: {
      type: String,
      required: true,
      trim: true,
    },
    mobileNo: {
      type: String,
      required: true,
      trim: true,
    },
    balance: {
      type: Number,
      required: true,
      default: 0,
    },
    type: {
      type: String,
      required: true,
      enum: ["customer", "supplier"],
      lowercase: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.Party || mongoose.model("Party", partySchema);
