import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products/Products';
import StockDetail from './pages/StockDetail';
import StockGroups from './pages/StockGroups';
import Banks from './pages/Banks';
import Vehicle from './pages/Vehicle';
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
import StockAdjustment from './pages/StockAdjustment';
import SaleReturn from './pages/SaleReturn/SaleReturn';
import PurchaseReturn from './pages/PurchaseReturn/PurchaseReturn';
import ReportsHub from './pages/ReportsHub';
import StockLedger from './pages/StockLedger';
import PartyLedger from './pages/PartyLedger';
import BoulderLedger from './pages/BoulderLedger';
import MaterialUsedLedger from './pages/MaterialUsedLedger';
import DieselConsumptionReport from './pages/Reports/DieselConsumptionReport';
import ProfitLossReport from './pages/Reports/ProfitLossReport';
import DayBook from './pages/DayBook';
import Analytics from './pages/Analytics';
import Setting from './pages/Setting';
import Payroll from './pages/Payroll/Payroll';
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
          <Route path="/banks" element={<Banks />} />
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
          <Route path="/day-book" element={<DayBook />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/reports" element={<ReportsHub />} />
          <Route path="/reports-hub" element={<Navigate to="/reports" replace />} />
          <Route path="/reports/party-ledger" element={<PartyLedger />} />
          <Route path="/reports/stock-ledger" element={<StockLedger />} />
          <Route path="/reports/boulder-ledger" element={<BoulderLedger />} />
          <Route path="/reports/material-used-ledger" element={<MaterialUsedLedger />} />
          <Route path="/reports/diesel-consumption" element={<DieselConsumptionReport />} />
          <Route path="/reports/sales-report" element={<Sales />} />
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

          <Route path="/payroll" element={<Payroll />} />

          <Route path="/settings" element={<Setting />} />
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
    </>
  );
}

export default App;
