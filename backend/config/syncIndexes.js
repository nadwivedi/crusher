const Bank = require("../models/Bank");
const Boulder = require("../models/Boulder");
const Counter = require("../models/Counter");
const MaterialUsed = require("../models/MaterialUsed");
const Party = require("../models/Party");
const Payment = require("../models/Payment");
const Purchase = require("../models/Purchase");
const Receipt = require("../models/Receipt");
const Sales = require("../models/Sales");
const Stock = require("../models/Stock");
const Transport = require("../models/Transport");
const Vehicle = require("../models/Vehicle");

const MODELS = [
  Counter,
  Bank,
  Party,
  Vehicle,
  Stock,
  Boulder,
  Sales,
  Purchase,
  Payment,
  Receipt,
  MaterialUsed,
  Transport,
];

const syncOwnershipIndexes = async () => {
  for (const model of MODELS) {
    await model.syncIndexes();
  }
};

module.exports = syncOwnershipIndexes;
