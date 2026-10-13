import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import AdminAccess from './pages/AdminAccess';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products/Products';
import StockDetail from './pages/StockDetail';
import StockGroups from './pages/StockGroups';
import Vehicle from './pages/Vehicle';
import VehicleLedger from './pages/VehicleLedger';
import Sales from './pages/Sales/Sales';
import Purchases from './pages/Purchases/Purchases';
import Payments from './pages/Payments/Payments';
import Receipts from './pages/Receipts/Receipts';
import MaterialUsed from './pages/MaterialUsed';
import Party from './pages/Party/Party';
import PartyDetail from './pages/PartyDetail';
import Expenses from './pages/Expenses/Expenses';
import ExpenseTypes from './pages/ExpenseGroups';
import BoulderEntry from './pages/BoulderEntry/BoulderEntry';
import DumpSiteEntry from './pages/BoulderEntry/DumpSiteEntry';
import DumpToHopper from './pages/BoulderEntry/DumpToHopper';
import StockAdjustment from './pages/StockAdjustment';
import SaleReturn from './pages/SaleReturn/SaleReturn';
import PurchaseReturn from './pages/PurchaseReturn/PurchaseReturn';
import ReportsHub from './pages/ReportsHub';
import StockLedger from './pages/StockLedger';
import WhatsApp from './pages/WhatsApp';
import PartyLedger from './pages/PartyLedger';
import BoulderLedger from './pages/BoulderLedger';
import DumpBoulder from './pages/DumpBoulder';
import MaterialUsedLedger from './pages/MaterialUsedLedger';
import ItemUsageReport from './pages/Reports/ItemUsageReport';
import Inventory from './pages/Inventory';
import ActivityCenter from './pages/ActivityCenter';
import MeterReadings from './pages/MeterReadings';
import MeterReadingPopup from './components/MeterReadingPopup';
import ProfitLossReport from './pages/Reports/ProfitLossReport';
import Analytics from './pages/Analytics';
import Setting from './pages/Setting';
import Payroll from './pages/Payroll/Payroll';
import Accounts from './pages/Accounts/Accounts';
import AccountLedger from './pages/Accounts/AccountLedger';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';
import { hasFeatureAccess } from './utils/featureAccess';

function App() {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const canViewSaleReturn = hasFeatureAccess(user, 'saleReturn');
  const canViewStockAdjustment = hasFeatureAccess(user, 'stockAdjustment');

  const closeVoucherRouteToHub = () => {
    navigate('/', {
      replace: true,
      state: undefined
    });
  };

  const clearHomeQuickShortcutState = () => {
    const currentState = location.state || {};
    const {
      homeQuickSale,
      homeQuickPurchase,
      homeQuickBoulder,
      homeQuickPayment,
      homeQuickReceipt,
      homeQuickMaterialUsed,
      homeQuickPurchaseReturn,
      homeQuickExpense,
      homeQuickSaleReturn,
      homeQuickStockAdjustment,
      homeQuickDumpIn,
      homeQuickDumpOut,
      homeQuickMeterReading,
      backgroundLocation,
      ...restState
    } = currentState;

    navigate('/', {
      replace: true,
      state: Object.keys(restState).length > 0 ? restState : undefined
    });
  };

  return (
    <>
      <Routes location={location}>
        {/* Public Routes */}
        <Route path="/admin-access" element={<AdminAccess />} />
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/" /> : <Login />}
        />

        {/* Everything else sits inside the sidebar layout */}
        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Navigate to="/" replace />} />

          {/* Masters (listed in the sidebar) */}
          <Route path="/masters" element={<Navigate to="/party" replace />} />
          <Route path="/party" element={<Party />} />
          <Route path="/party/:id" element={<PartyDetail />} />
          <Route path="/leadger" element={<Navigate to="/party" replace />} />
          <Route path="/stock" element={<Products />} />
          <Route path="/stock/:id" element={<StockDetail />} />
          <Route path="/products" element={<Navigate to="/stock" replace />} />
          <Route path="/stock-groups" element={<StockGroups />} />
          <Route path="/vehicle" element={<Vehicle />} />
          <Route path="/vehicle/:id" element={<VehicleLedger />} />
          <Route path="/banks" element={<Navigate to="/accounts" replace />} />
          <Route path="/expense-types" element={<ExpenseTypes />} />
          <Route path="/expense-groups" element={<Navigate to="/expense-types" replace />} />

          {/* Entry popups opened by URL */}
          <Route path="/sales" element={<Sales modalOnly onModalFinish={closeVoucherRouteToHub} />} />
          <Route path="/purchases" element={<Purchases modalOnly onModalFinish={closeVoucherRouteToHub} />} />
          <Route path="/payments" element={<Payments modalOnly onModalFinish={closeVoucherRouteToHub} />} />
          <Route path="/receipts" element={<Receipts modalOnly onModalFinish={closeVoucherRouteToHub} />} />
          <Route path="/expenses" element={<Expenses modalOnly onModalFinish={closeVoucherRouteToHub} />} />
          <Route path="/material-used" element={<MaterialUsed modalOnly onModalFinish={closeVoucherRouteToHub} />} />
          <Route path="/purchase-return" element={<PurchaseReturn modalOnly onModalFinish={closeVoucherRouteToHub} />} />
          <Route
            path="/sale-return"
            element={canViewSaleReturn
              ? <SaleReturn modalOnly onModalFinish={closeVoucherRouteToHub} />
              : <Navigate to="/" replace />}
          />
          <Route
            path="/stock-adjustment"
            element={canViewStockAdjustment
              ? <StockAdjustment modalOnly onModalFinish={closeVoucherRouteToHub} />
              : <Navigate to="/" replace />}
          />
          <Route path="/stock-adjustments" element={<Navigate to="/stock-adjustment" replace />} />

          {/* Overview + reports */}
          {/* The Activity Center replaced the Day Book */}
          <Route path="/day-book" element={<Navigate to="/activity" replace />} />
          <Route path="/activity" element={<ActivityCenter />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/reports" element={<ReportsHub />} />
          <Route path="/reports-hub" element={<Navigate to="/reports" replace />} />
          <Route path="/reports/party-ledger" element={<PartyLedger />} />
          <Route path="/reports/stock-ledger" element={<StockLedger />} />
          <Route path="/reports/boulder-ledger" element={<BoulderLedger />} />
          <Route path="/dump-boulder" element={<DumpBoulder />} />
          <Route path="/reports/material-used-ledger" element={<MaterialUsedLedger />} />
          <Route path="/reports/diesel-consumption" element={<ItemUsageReport />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/inventory/:id" element={<ItemUsageReport />} />
          <Route path="/meter-readings" element={<MeterReadings />} />
          <Route path="/reports/sales-report" element={<Sales />} />
          <Route path="/reports/purchase-report" element={<Purchases />} />
          <Route
            path="/reports/sale-return-report"
            element={canViewSaleReturn ? <SaleReturn /> : <Navigate to="/reports" replace />}
          />
          <Route
            path="/reports/stock-adjustment-report"
            element={canViewStockAdjustment ? <StockAdjustment /> : <Navigate to="/reports" replace />}
          />
          <Route path="/reports/receipt-report" element={<Receipts />} />
          <Route path="/reports/expense-report" element={<Expenses />} />
          <Route path="/reports/payment-report" element={<Payments />} />
          <Route path="/reports/profit-loss-report" element={<ProfitLossReport />} />

          <Route path="/accounts" element={<Accounts />} />
          <Route path="/accounts/:id" element={<AccountLedger />} />
          <Route path="/payroll" element={<Payroll />} />

          <Route path="/settings" element={<Setting />} />
          <Route path="/whatsapp" element={<WhatsApp />} />
        </Route>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>

      {location.pathname === '/' && location.state?.homeQuickSale && (
        <ProtectedRoute>
          <Sales modalOnly onModalFinish={clearHomeQuickShortcutState} />
        </ProtectedRoute>
      )}

      {location.pathname === '/' && location.state?.homeQuickPurchase && (
        <ProtectedRoute>
          <Purchases modalOnly onModalFinish={clearHomeQuickShortcutState} />
        </ProtectedRoute>
      )}

      {location.pathname === '/' && location.state?.homeQuickBoulder && (
        <ProtectedRoute>
          <BoulderEntry modalOnly onModalFinish={clearHomeQuickShortcutState} />
        </ProtectedRoute>
      )}

      {location.pathname === '/' && location.state?.homeQuickDumpIn && (
        <ProtectedRoute>
          <DumpSiteEntry onModalFinish={clearHomeQuickShortcutState} />
        </ProtectedRoute>
      )}

      {location.pathname === '/' && location.state?.homeQuickDumpOut && (
        <ProtectedRoute>
          <DumpToHopper onModalFinish={clearHomeQuickShortcutState} />
        </ProtectedRoute>
      )}

      {location.pathname === '/' && location.state?.homeQuickPayment && (
        <ProtectedRoute>
          <Payments modalOnly onModalFinish={clearHomeQuickShortcutState} />
        </ProtectedRoute>
      )}

      {location.pathname === '/' && location.state?.homeQuickReceipt && (
        <ProtectedRoute>
          <Receipts modalOnly onModalFinish={clearHomeQuickShortcutState} />
        </ProtectedRoute>
      )}

      {location.pathname === '/' && location.state?.homeQuickMaterialUsed && (
        <ProtectedRoute>
          <MaterialUsed modalOnly onModalFinish={clearHomeQuickShortcutState} />
        </ProtectedRoute>
      )}

      {location.pathname === '/' && location.state?.homeQuickMeterReading && (
        <ProtectedRoute>
          <MeterReadingPopup onClose={clearHomeQuickShortcutState} onSaved={clearHomeQuickShortcutState} />
        </ProtectedRoute>
      )}

      {location.pathname === '/' && location.state?.homeQuickPurchaseReturn && (
        <ProtectedRoute>
          <PurchaseReturn modalOnly onModalFinish={clearHomeQuickShortcutState} />
        </ProtectedRoute>
      )}

      {location.pathname === '/' && location.state?.homeQuickExpense && (
        <ProtectedRoute>
          <Expenses modalOnly onModalFinish={clearHomeQuickShortcutState} />
        </ProtectedRoute>
      )}

      {location.pathname === '/' && location.state?.homeQuickSaleReturn && canViewSaleReturn && (
        <ProtectedRoute>
          <SaleReturn modalOnly onModalFinish={clearHomeQuickShortcutState} />
        </ProtectedRoute>
      )}

      {location.pathname === '/' && location.state?.homeQuickStockAdjustment && canViewStockAdjustment && (
        <ProtectedRoute>
          <StockAdjustment modalOnly onModalFinish={clearHomeQuickShortcutState} />
        </ProtectedRoute>
      )}
    </>
  );
}

export default App;
