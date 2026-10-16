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
import StaffRoute from './components/StaffRoute';
import StaffHome from './pages/StaffHome';
import { canUseSection, isStaff } from './utils/staffAccess';

function App() {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const canViewSaleReturn = hasFeatureAccess(user, 'saleReturn');
  const canViewStockAdjustment = hasFeatureAccess(user, 'stockAdjustment');
  const staffLogin = isStaff(user);
  const can = (section) => canUseSection(user, section);

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
          {/* Staff get a simple entry screen instead of the owner's dashboard */}
          <Route path="/" element={staffLogin ? <StaffHome /> : <Dashboard />} />
          <Route path="/dashboard" element={<Navigate to="/" replace />} />

          {/* Masters (listed in the sidebar) */}
          <Route path="/masters" element={<Navigate to="/party" replace />} />
          <Route path="/party" element={<StaffRoute section="masters"><Party /></StaffRoute>} />
          <Route path="/party/:id" element={<StaffRoute section="masters"><PartyDetail /></StaffRoute>} />
          <Route path="/leadger" element={<Navigate to="/party" replace />} />
          <Route path="/stock" element={<StaffRoute section="masters"><Products /></StaffRoute>} />
          <Route path="/stock/:id" element={<StaffRoute section="masters"><StockDetail /></StaffRoute>} />
          <Route path="/products" element={<Navigate to="/stock" replace />} />
          <Route path="/stock-groups" element={<StaffRoute section="masters"><StockGroups /></StaffRoute>} />
          <Route path="/vehicle" element={<StaffRoute section="masters"><Vehicle /></StaffRoute>} />
          <Route path="/vehicle/:id" element={<StaffRoute section="masters"><VehicleLedger /></StaffRoute>} />
          <Route path="/banks" element={<Navigate to="/accounts" replace />} />
          <Route path="/expense-types" element={<StaffRoute section="masters"><ExpenseTypes /></StaffRoute>} />
          <Route path="/expense-groups" element={<Navigate to="/expense-types" replace />} />

          {/* Entry popups opened by URL */}
          <Route path="/sales" element={<StaffRoute section="sales"><Sales modalOnly onModalFinish={closeVoucherRouteToHub} /></StaffRoute>} />
          <Route path="/purchases" element={<StaffRoute section="purchases"><Purchases modalOnly onModalFinish={closeVoucherRouteToHub} /></StaffRoute>} />
          <Route path="/payments" element={<StaffRoute section="payments"><Payments modalOnly onModalFinish={closeVoucherRouteToHub} /></StaffRoute>} />
          <Route path="/receipts" element={<StaffRoute section="receipts"><Receipts modalOnly onModalFinish={closeVoucherRouteToHub} /></StaffRoute>} />
          <Route path="/expenses" element={<StaffRoute section="expenses"><Expenses modalOnly onModalFinish={closeVoucherRouteToHub} /></StaffRoute>} />
          <Route path="/material-used" element={<StaffRoute section="materialUsed"><MaterialUsed modalOnly onModalFinish={closeVoucherRouteToHub} /></StaffRoute>} />
          <Route path="/purchase-return" element={<StaffRoute section="purchases"><PurchaseReturn modalOnly onModalFinish={closeVoucherRouteToHub} /></StaffRoute>} />
          <Route
            path="/sale-return"
            element={canViewSaleReturn && can('sales')
              ? <SaleReturn modalOnly onModalFinish={closeVoucherRouteToHub} />
              : <Navigate to="/" replace />}
          />
          <Route
            path="/stock-adjustment"
            element={canViewStockAdjustment && can('materialUsed')
              ? <StockAdjustment modalOnly onModalFinish={closeVoucherRouteToHub} />
              : <Navigate to="/" replace />}
          />
          <Route path="/stock-adjustments" element={<Navigate to="/stock-adjustment" replace />} />

          {/* Overview + reports */}
          {/* The Activity Center replaced the Day Book */}
          <Route path="/day-book" element={<Navigate to="/activity" replace />} />
          <Route path="/activity" element={<StaffRoute ownerOnly><ActivityCenter /></StaffRoute>} />
          <Route path="/analytics" element={<StaffRoute ownerOnly><Analytics /></StaffRoute>} />
          <Route path="/reports" element={<StaffRoute ownerOnly><ReportsHub /></StaffRoute>} />
          <Route path="/reports-hub" element={<Navigate to="/reports" replace />} />
          <Route path="/reports/party-ledger" element={<StaffRoute ownerOnly><PartyLedger /></StaffRoute>} />
          <Route path="/reports/stock-ledger" element={<StaffRoute section="materialUsed"><StockLedger /></StaffRoute>} />
          <Route path="/reports/boulder-ledger" element={<StaffRoute section="boulder"><BoulderLedger /></StaffRoute>} />
          <Route path="/dump-boulder" element={<StaffRoute section="boulder"><DumpBoulder /></StaffRoute>} />
          <Route path="/reports/material-used-ledger" element={<StaffRoute section="materialUsed"><MaterialUsedLedger /></StaffRoute>} />
          <Route path="/reports/diesel-consumption" element={<StaffRoute section="materialUsed"><ItemUsageReport /></StaffRoute>} />
          <Route path="/inventory" element={<StaffRoute section="materialUsed"><Inventory /></StaffRoute>} />
          <Route path="/inventory/:id" element={<StaffRoute section="materialUsed"><ItemUsageReport /></StaffRoute>} />
          <Route path="/meter-readings" element={<StaffRoute section="meterReadings"><MeterReadings /></StaffRoute>} />
          <Route path="/reports/sales-report" element={<StaffRoute section="sales"><Sales /></StaffRoute>} />
          <Route path="/reports/purchase-report" element={<StaffRoute section="purchases"><Purchases /></StaffRoute>} />
          <Route
            path="/reports/sale-return-report"
            element={canViewSaleReturn && can('sales') ? <SaleReturn /> : <Navigate to="/reports" replace />}
          />
          <Route
            path="/reports/stock-adjustment-report"
            element={canViewStockAdjustment && can('materialUsed') ? <StockAdjustment /> : <Navigate to="/reports" replace />}
          />
          <Route path="/reports/receipt-report" element={<StaffRoute section="receipts"><Receipts /></StaffRoute>} />
          <Route path="/reports/expense-report" element={<StaffRoute section="expenses"><Expenses /></StaffRoute>} />
          <Route path="/reports/payment-report" element={<StaffRoute section="payments"><Payments /></StaffRoute>} />
          <Route path="/reports/profit-loss-report" element={<StaffRoute ownerOnly><ProfitLossReport /></StaffRoute>} />

          <Route path="/accounts" element={<StaffRoute ownerOnly><Accounts /></StaffRoute>} />
          <Route path="/accounts/:id" element={<StaffRoute ownerOnly><AccountLedger /></StaffRoute>} />
          <Route path="/payroll" element={<StaffRoute ownerOnly><Payroll /></StaffRoute>} />

          <Route path="/settings" element={<Setting />} />
          <Route path="/whatsapp" element={<WhatsApp />} />
        </Route>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>

      {location.pathname === '/' && location.state?.homeQuickSale && can('sales') && (
        <ProtectedRoute>
          <Sales modalOnly onModalFinish={clearHomeQuickShortcutState} />
        </ProtectedRoute>
      )}

      {location.pathname === '/' && location.state?.homeQuickPurchase && can('purchases') && (
        <ProtectedRoute>
          <Purchases modalOnly onModalFinish={clearHomeQuickShortcutState} />
        </ProtectedRoute>
      )}

      {location.pathname === '/' && location.state?.homeQuickBoulder && can('boulder') && (
        <ProtectedRoute>
          <BoulderEntry modalOnly onModalFinish={clearHomeQuickShortcutState} />
        </ProtectedRoute>
      )}

      {location.pathname === '/' && location.state?.homeQuickDumpIn && can('boulder') && (
        <ProtectedRoute>
          <DumpSiteEntry onModalFinish={clearHomeQuickShortcutState} />
        </ProtectedRoute>
      )}

      {location.pathname === '/' && location.state?.homeQuickDumpOut && can('boulder') && (
        <ProtectedRoute>
          <DumpToHopper onModalFinish={clearHomeQuickShortcutState} />
        </ProtectedRoute>
      )}

      {location.pathname === '/' && location.state?.homeQuickPayment && can('payments') && (
        <ProtectedRoute>
          <Payments modalOnly onModalFinish={clearHomeQuickShortcutState} />
        </ProtectedRoute>
      )}

      {location.pathname === '/' && location.state?.homeQuickReceipt && can('receipts') && (
        <ProtectedRoute>
          <Receipts modalOnly onModalFinish={clearHomeQuickShortcutState} />
        </ProtectedRoute>
      )}

      {location.pathname === '/' && location.state?.homeQuickMaterialUsed && can('materialUsed') && (
        <ProtectedRoute>
          <MaterialUsed modalOnly onModalFinish={clearHomeQuickShortcutState} />
        </ProtectedRoute>
      )}

      {location.pathname === '/' && location.state?.homeQuickMeterReading && can('meterReadings') && (
        <ProtectedRoute>
          <MeterReadingPopup onClose={clearHomeQuickShortcutState} onSaved={clearHomeQuickShortcutState} />
        </ProtectedRoute>
      )}

      {location.pathname === '/' && location.state?.homeQuickPurchaseReturn && can('purchases') && (
        <ProtectedRoute>
          <PurchaseReturn modalOnly onModalFinish={clearHomeQuickShortcutState} />
        </ProtectedRoute>
      )}

      {location.pathname === '/' && location.state?.homeQuickExpense && can('expenses') && (
        <ProtectedRoute>
          <Expenses modalOnly onModalFinish={clearHomeQuickShortcutState} />
        </ProtectedRoute>
      )}

      {location.pathname === '/' && location.state?.homeQuickSaleReturn && can('sales') && canViewSaleReturn && (
        <ProtectedRoute>
          <SaleReturn modalOnly onModalFinish={clearHomeQuickShortcutState} />
        </ProtectedRoute>
      )}

      {location.pathname === '/' && location.state?.homeQuickStockAdjustment && can('materialUsed') && canViewStockAdjustment && (
        <ProtectedRoute>
          <StockAdjustment modalOnly onModalFinish={clearHomeQuickShortcutState} />
        </ProtectedRoute>
      )}
    </>
  );
}

export default App;
