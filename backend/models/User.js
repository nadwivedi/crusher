const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    mobile: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      trim: true,
      select: false,
    },
    state: {
      type: String,
      trim: true,
      default: "",
    },
    district: {
      type: String,
      trim: true,
      default: "",
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    // Last time the account (owner or any of its staff) used the app; kept to within a few minutes
    lastActivityAt: {
      type: Date,
      default: null,
    },
    // Subscription: yearly (price per year) or lifetime (one-time price). Set by the admin.
    planType: {
      type: String,
      enum: ["yearly", "lifetime"],
      default: "yearly",
    },
    planPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    featureAccess: {
      saleReturn: {
        type: Boolean,
        default: false,
      },
      stockAdjustment: {
        type: Boolean,
        default: false,
      },
    },
    materialRates: {
      tenMmRate: {
        type: Number,
        default: 0,
        min: 0,
      },
      tenMmRatePerCubicMeter: {
        type: Number,
        default: 0,
        min: 0,
      },
      twentyMmRate: {
        type: Number,
        default: 0,
        min: 0,
      },
      twentyMmRatePerCubicMeter: {
        type: Number,
        default: 0,
        min: 0,
      },
      fortyMmRate: {
        type: Number,
        default: 0,
        min: 0,
      },
      fortyMmRatePerCubicMeter: {
        type: Number,
        default: 0,
        min: 0,
      },
      sixtyMmRate: {
        type: Number,
        default: 0,
        min: 0,
      },
      sixtyMmRatePerCubicMeter: {
        type: Number,
        default: 0,
        min: 0,
      },
      sixMmRate: {
        type: Number,
        default: 0,
        min: 0,
      },
      sixMmRatePerCubicMeter: {
        type: Number,
        default: 0,
        min: 0,
      },
      fourMmRate: {
        type: Number,
        default: 0,
        min: 0,
      },
      fourMmRatePerCubicMeter: {
        type: Number,
        default: 0,
        min: 0,
      },
      wmmRate: {
        type: Number,
        default: 0,
        min: 0,
      },
      wmmRatePerCubicMeter: {
        type: Number,
        default: 0,
        min: 0,
      },
      gsbRate: {
        type: Number,
        default: 0,
        min: 0,
      },
      gsbRatePerCubicMeter: {
        type: Number,
        default: 0,
        min: 0,
      },
      dustRate: {
        type: Number,
        default: 0,
        min: 0,
      },
      dustRatePerCubicMeter: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ email: 1 }, { unique: true, sparse: true });

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
