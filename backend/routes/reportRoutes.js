const express = require("express");
const {
  getDayBook,
  getOutstanding,
  getPartyLedger,
  getPartyLedgerEntryDetail,
  getStockLedger,
  getDashboardAnalytics,
  getDashboardSummary,
  getDieselConsumptionReport,
  getItemConsumptionReport,
  getInventorySummary,
  getPaymentReport,
  getProfitLossReport,
} = require("../controllers/reportsController");
const { getActivity } = require("../controllers/activityController");
const auth = require("../middleware/auth");
const { syncMonthlyHiresMiddleware } = require("../utils/monthlyHire");

const router = express.Router();

router.use(auth);
router.use(syncMonthlyHiresMiddleware);

router.get("/day-book", getDayBook);
router.get("/outstanding", getOutstanding);
router.get("/party-ledger", getPartyLedger);
router.get("/party-ledger-entry-detail", getPartyLedgerEntryDetail);
router.get("/stock-ledger", getStockLedger);
router.get("/dashboard-analytics", getDashboardAnalytics);
router.get("/dashboard-summary", getDashboardSummary);
router.get("/diesel-consumption", getDieselConsumptionReport);
router.get("/inventory", getInventorySummary);
router.get("/activity", getActivity);
router.get("/item-consumption/:id", getItemConsumptionReport);
router.get("/payment-report", getPaymentReport);
router.get("/profit-loss", getProfitLossReport);

module.exports = router;
