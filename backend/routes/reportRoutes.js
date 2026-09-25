const express = require("express");
const {
  getDayBook,
  getOutstanding,
  getPartyLedger,
  getPartyLedgerEntryDetail,
  getStockLedger,
  getDashboardAnalytics,
  getDieselConsumptionReport,
  getPaymentReport,
  getProfitLossReport,
} = require("../controllers/reportsController");
const auth = require("../middleware/auth");

const router = express.Router();

router.use(auth);

router.get("/day-book", getDayBook);
router.get("/outstanding", getOutstanding);
router.get("/party-ledger", getPartyLedger);
router.get("/party-ledger-entry-detail", getPartyLedgerEntryDetail);
router.get("/stock-ledger", getStockLedger);
router.get("/dashboard-analytics", getDashboardAnalytics);
router.get("/diesel-consumption", getDieselConsumptionReport);
router.get("/payment-report", getPaymentReport);
router.get("/profit-loss", getProfitLossReport);

module.exports = router;
