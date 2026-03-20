import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Home from './pages/Home';
import Masters from './pages/Masters';
import Vouchers from './pages/Vouchers';
import Products from './pages/Products';
import StockDetail from './pages/StockDetail';
import StockGroups from './pages/StockGroups';
import Unit from './pages/Unit';
import Banks from './pages/Banks';
import Vehicle from './pages/Vehicle';
import Sales from './pages/Sales/Sales';
import Purchases from './pages/Purchases/Purchases';
import Payments from './pages/Payments/Payments';
import Receipts from './pages/Receipts/Receipts';
import Party from './pages/Party/Party';
import PartyDetail from './pages/PartyDetail';
import Expenses from './pages/Expenses';
import ExpenseGroups from './pages/ExpenseGroups';
import ExpenseHub from './pages/ExpenseHub';
import Contra from './pages/Contra';
import BoulderEntry from './pages/BoulderEntry/BoulderEntry';
import StockAdjustment from './pages/StockAdjustment';
import SaleReturn from './pages/SaleReturn/SaleReturn';
import PurchaseReturn from './pages/PurchaseReturn/PurchaseReturn';
import ReportsHub from './pages/ReportsHub';
import ReportsDashboard from './pages/ReportsDashboard';
import StockLedger from './pages/StockLedger';
import PartyLedger from './pages/PartyLedger';
import ReportsPlaceholder from './pages/ReportsPlaceholder';
import DayBook from './pages/DayBook';
import Settings from './pages/Settings';
import ProtectedRoute from './components/ProtectedRoute';
import SectionHubPage from './components/SectionHubPage';

function App() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const closeVoucherRouteToHub = (activePath) => {
    navigate('/vouchers', {
      replace: true,
      state: activePath ? { activePath } : undefined
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

        {/* Legacy dashboard route */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Navigate to="/" replace />
            </ProtectedRoute>
          }
        />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />

        <Route
          path="/masters"
          element={
            <ProtectedRoute>
              <Masters />
            </ProtectedRoute>
          }
        />

        <Route
          path="/vouchers"
          element={
            <ProtectedRoute>
              <Vouchers />
            </ProtectedRoute>
          }
        />

        <Route
          path="/expense-hub"
          element={
            <ProtectedRoute>
              <ExpenseHub />
            </ProtectedRoute>
          }
        />

        <Route
          path="/stock-groups"
          element={
            <ProtectedRoute>
              <StockGroups />
            </ProtectedRoute>
          }
        />

        <Route
          path="/units"
          element={
            <ProtectedRoute>
              <Unit />
            </ProtectedRoute>
          }
        />

        <Route
          path="/banks"
          element={
            <ProtectedRoute>
              <Banks />
            </ProtectedRoute>
          }
        />

        <Route
          path="/vehicle"
          element={
            <ProtectedRoute>
              <Vehicle />
            </ProtectedRoute>
          }
        />

        <Route
          path="/stock"
          element={
            <ProtectedRoute>
              <Products />
            </ProtectedRoute>
          }
        />

        <Route path="/stock-adjustments" element={<Navigate to="/stock-adjustment" replace />} />

        <Route
          path="/stock/:id"
          element={
            <ProtectedRoute>
              <StockDetail />
            </ProtectedRoute>
          }
        />

        <Route path="/products" element={<Navigate to="/stock" replace />} />

        <Route
          path="/purchases"
          element={
            <ProtectedRoute>
              <Purchases modalOnly onModalFinish={() => closeVoucherRouteToHub('/purchases')} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/sales"
          element={
            <ProtectedRoute>
              <Sales modalOnly onModalFinish={() => closeVoucherRouteToHub('/sales')} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/day-book"
          element={
            <ProtectedRoute>
              <DayBook />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <ReportsHub />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/party-ledger"
          element={
            <ProtectedRoute>
              <PartyLedger />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/stock-ledger"
          element={
            <ProtectedRoute>
              <StockLedger />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/sales-report"
          element={
            <ProtectedRoute>
              <Sales />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/sale-return-report"
          element={
            <ProtectedRoute>
              <SaleReturn />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/stock-adjustment-report"
          element={
            <ProtectedRoute>
              <StockAdjustment />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/receipt-report"
          element={
            <ProtectedRoute>
              <Receipts />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/expense-report"
          element={
            <ProtectedRoute>
              <Expenses />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/profit-loss-report"
          element={
            <ProtectedRoute>
              <ReportsPlaceholder
                title="Profit And Loss Report"
                description="Profit and loss statement will be shown here after the report is implemented."
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports-hub"
          element={
            <ProtectedRoute>
              <Navigate to="/reports" replace />
            </ProtectedRoute>
          }
        />

        <Route
          path="/payments"
          element={
            <ProtectedRoute>
              <Payments modalOnly onModalFinish={() => closeVoucherRouteToHub('/payments')} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/receipts"
          element={
            <ProtectedRoute>
              <Receipts modalOnly onModalFinish={() => closeVoucherRouteToHub('/receipts')} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/expenses"
          element={
            <ProtectedRoute>
              <Expenses modalOnly onModalFinish={() => closeVoucherRouteToHub('/expenses')} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/expense-groups"
          element={
            <ProtectedRoute>
              <ExpenseGroups />
            </ProtectedRoute>
          }
        />

        <Route
          path="/party"
          element={
            <ProtectedRoute>
              <Party />
            </ProtectedRoute>
          }
        />

        <Route
          path="/party/:id"
          element={
            <ProtectedRoute>
              <PartyDetail />
            </ProtectedRoute>
          }
        />

        <Route
          path="/leadger"
          element={
            <ProtectedRoute>
              <Navigate to="/party" replace />
            </ProtectedRoute>
          }
        />

        <Route
          path="/contra"
          element={
            <ProtectedRoute>
              <Contra />
            </ProtectedRoute>
          }
        />

        <Route
          path="/stock-adjustment"
          element={
            <ProtectedRoute>
              <StockAdjustment modalOnly onModalFinish={() => closeVoucherRouteToHub('/stock-adjustment')} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/sale-return"
          element={
            <ProtectedRoute>
              <SaleReturn modalOnly onModalFinish={() => closeVoucherRouteToHub('/sale-return')} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/purchase-return"
          element={
            <ProtectedRoute>
              <PurchaseReturn modalOnly onModalFinish={() => closeVoucherRouteToHub('/purchase-return')} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />

        {/* Redirect to stock */}
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

      {location.pathname === '/' && location.state?.homeQuickExpense && (
        <ProtectedRoute>
          <Expenses modalOnly onModalFinish={clearHomeQuickShortcutState} />
        </ProtectedRoute>
      )}

      <ToastContainer position="top-right" newestOnTop closeOnClick pauseOnHover />
    </>
  );
}

export default App;
