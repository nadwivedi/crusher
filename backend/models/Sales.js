const mongoose = require("mongoose");

const salesSchema = new mongoose.Schema(
  {
    partyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Party",
      required: true,
    },
    vehicleNo: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    stoneSize: {
      type: String,
      required: true,
      enum: ["10mm", "20mm", "40mm", "dust", "wmm", "gsb"],
      lowercase: true,
      trim: true,
    },
    quanity: {
      type: Number,
      required: true,
      min: 0,
    },
    slipImg: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.Sales || mongoose.model("Sales", salesSchema);
