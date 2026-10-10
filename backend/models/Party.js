const mongoose = require("mongoose");
const { TRANSPORT_BASES, TRIP_RATES_FIELD } = require("../utils/transportBasis");

const normalizeRate = (value) => {
  if (value === "" || value === null || value === undefined) return 0;
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : 0;
};

// Parties I normally owe money to, so their opening balance defaults to payable
const PAYABLE_PARTY_TYPES = ["supplier", "transporter"];

const partySchema = new mongoose.Schema(
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
    mobile: {
      type: String,
      default: "",
      trim: true,
    },
    email: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },
    address: {
      type: String,
      default: "",
      trim: true,
    },
    state: {
      type: String,
      default: "",
      trim: true,
    },
    pincode: {
      type: String,
      default: "",
      trim: true,
    },
    openingBalance: {
      type: Number,
      default: 0,
    },
    openingBalanceType: {
      type: String,
      enum: ["receivable", "payable"],
      default: "receivable",
      lowercase: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["customer", "supplier", "transporter", "cash-in-hand"],
      lowercase: true,
      trim: true,
    },
    tenMmRate: {
      type: Number,
      default: 0,
      min: 0,
      set: normalizeRate,
    },
    twentyMmRate: {
      type: Number,
      default: 0,
      min: 0,
      set: normalizeRate,
    },
    fortyMmRate: {
      type: Number,
      default: 0,
      min: 0,
      set: normalizeRate,
    },
    wmmRate: {
      type: Number,
      default: 0,
      min: 0,
      set: normalizeRate,
    },
    gsbRate: {
      type: Number,
      default: 0,
      min: 0,
      set: normalizeRate,
    },
    dustRate: {
      type: Number,
      default: 0,
      min: 0,
      set: normalizeRate,
    },
    boulderRatePerTon: {
      type: Number,
      default: 0,
      min: 0,
      set: normalizeRate,
    },
    boulderRatePerTrip: {
      type: Number,
      default: 0,
      min: 0,
      set: normalizeRate,
    },
    // What the supplier charges to bring the boulder, per ton or per trip
    transportRate: {
      type: Number,
      default: 0,
      min: 0,
      set: normalizeRate,
    },
    transportRateBasis: {
      type: String,
      enum: ["per_ton", "per_trip"],
      default: "per_ton",
    },
    // Transporter: what its vehicles are hired at. Copied onto a hired vehicle when it is added.
    hireBasis: {
      type: String,
      enum: TRANSPORT_BASES,
      default: "per_ton",
    },
    hireRate: {
      type: Number,
      default: 0,
      min: 0,
      set: normalizeRate,
    },
    tripRates: TRIP_RATES_FIELD,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

partySchema.index({ userId: 1, name: 1 });
partySchema.index({ userId: 1, type: 1, createdAt: -1 });

partySchema.virtual("partyName")
  .get(function partyNameGetter() {
    return this.name;
  })
  .set(function partyNameSetter(value) {
    this.name = value;
  });

partySchema.virtual("mobileNo")
  .get(function mobileNoGetter() {
    return this.mobile;
  })
  .set(function mobileNoSetter(value) {
    this.mobile = value;
  });

partySchema.virtual("balance")
  .get(function balanceGetter() {
    const openingBalance = Number(this.openingBalance || 0);
    return this.openingBalanceType === "payable" ? -Math.abs(openingBalance) : Math.abs(openingBalance);
  })
  .set(function balanceSetter(value) {
    const numericValue = Number(value || 0);
    if (!Number.isFinite(numericValue)) {
      this.openingBalance = 0;
      this.openingBalanceType = PAYABLE_PARTY_TYPES.includes(this.type) ? "payable" : "receivable";
      return;
    }

    this.openingBalance = Math.abs(numericValue);
    this.openingBalanceType = numericValue < 0 ? "payable" : "receivable";
  });

partySchema.pre("validate", function syncLegacyFields() {
  if (!this.name && this.partyName) {
    this.name = this.partyName;
  }

  if (!this.mobile && this.mobileNo) {
    this.mobile = this.mobileNo;
  }

  if ((this.openingBalance === undefined || this.openingBalance === null) && this.balance !== undefined) {
    const numericBalance = Number(this.balance || 0);
    this.openingBalance = Math.abs(numericBalance);
    this.openingBalanceType = numericBalance < 0 ? "payable" : "receivable";
  }

  if (!this.openingBalanceType) {
    this.openingBalanceType = PAYABLE_PARTY_TYPES.includes(this.type) ? "payable" : "receivable";
  }
});

module.exports = mongoose.models.Party || mongoose.model("Party", partySchema);
