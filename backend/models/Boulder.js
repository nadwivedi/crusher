const mongoose = require("mongoose");

const boulderSchema = new mongoose.Schema(
  {
    vehicleNo: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    weight: {
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

module.exports = mongoose.models.Boulder || mongoose.model("Boulder", boulderSchema);
