const express = require("express");
const {
  getDayBook,
  getOutstanding,
  getPartyLedger,
  getPartyStatement,
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
const { requireSection, ownerOnly } = require("../middleware/staffAccess");
const { syncMonthlyHiresMiddleware } = require("../utils/monthlyHire");

const router = express.Router();

router.use(auth);
router.use(syncMonthlyHiresMiddleware);

router.get("/day-book", ownerOnly, getDayBook);
router.get("/outstanding", ownerOnly, getOutstanding);
router.get("/party-ledger", requireSection("masters"), getPartyLedger);
router.get("/party-statement", requireSection("masters"), getPartyStatement);
router.get("/party-ledger-entry-detail", requireSection("masters"), getPartyLedgerEntryDetail);
router.get("/stock-ledger", requireSection("materialUsed"), getStockLedger);
router.get("/dashboard-analytics", ownerOnly, getDashboardAnalytics);
router.get("/dashboard-summary", ownerOnly, getDashboardSummary);
router.get("/diesel-consumption", requireSection("materialUsed"), getDieselConsumptionReport);
router.get("/inventory", requireSection("materialUsed"), getInventorySummary);
router.get("/activity", ownerOnly, getActivity);
router.get("/item-consumption/:id", requireSection("materialUsed"), getItemConsumptionReport);
router.get("/payment-report", ownerOnly, getPaymentReport);
router.get("/profit-loss", ownerOnly, getProfitLossReport);

module.exports = router;
