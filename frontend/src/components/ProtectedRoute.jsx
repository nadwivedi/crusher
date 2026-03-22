import { useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const homeNavigationEntries = [
  { section: 'Masters', path: '/party' },
  { section: 'Masters', path: '/stock' },
  { section: 'Masters', path: '/vehicle' },
  { section: 'Masters', path: '/banks' },
  { section: 'Vouchers', path: '/sales' },
  { section: 'Vouchers', path: '/purchases' },
  { section: 'Vouchers', path: '/material-used' },
  { section: 'Vouchers', path: '/sale-return' },
  { section: 'Vouchers', path: '/stock-adjustment' },
  { section: 'Vouchers', path: '/payments' },
  { section: 'Vouchers', path: '/receipts' },
  { section: 'Expense', path: '/expense-hub' },
  { section: 'Expense', path: '/expenses' },
  { section: 'Expense', path: '/expense-groups' },
  { section: 'Reports', path: '/reports' },
  { section: 'Reports', path: '/settings' }
];

const homeNavigationAliases = {
  '/leadger': { section: 'Masters', path: '/party' },
  '/stock-adjustments': { section: 'Vouchers', path: '/stock-adjustment' }
};

const voucherShortcutRoutes = {
  '1': { path: '/sales', openShortcut: 'sale' },
  '2': { path: '/purchases', openShortcut: 'purchase' },
  '3': { path: '/payments', openShortcut: 'payment' },
  '4': { path: '/receipts', openShortcut: 'receipt' }
};

const sectionHubPaths = {
  Masters: '/masters',
  Vouchers: '/',
  Expense: '/expense-hub',
  Reports: '/reports'
};

const getHomeNavigationState = (pathname) => {
  if (!pathname) return null;

  const aliasMatch = homeNavigationAliases[pathname];
  if (aliasMatch) return aliasMatch;

  return homeNavigationEntries.find(
    (entry) => pathname === entry.path || pathname.startsWith(`${entry.path}/`)
  ) || null;
};

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || !isAuthenticated) return;

    const isPopupOpen = () => Boolean(document.querySelector('.fixed.inset-0.z-50'));
    const isTypingTarget = (target) => {
      const tagName = target?.tagName?.toLowerCase();
      return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target?.isContentEditable;
    };

    const closeActivePopup = () => {
      const closeButton = document.querySelector('.fixed.inset-0.z-50 button[aria-label="Close popup"]');
      if (closeButton instanceof HTMLButtonElement) {
        closeButton.click();
        return true;
      }
      return false;
    };

    const handleKeyDown = (event) => {
      const key = event.key?.toLowerCase();
      const shortcutTarget = voucherShortcutRoutes[key];

      if (shortcutTarget && event.altKey && !event.ctrlKey && !event.metaKey) {
        if (event.defaultPrevented || isTypingTarget(event.target) || isPopupOpen()) return;

        event.preventDefault();
        if (location.pathname === '/') {
          navigate('/', {
            replace: true,
            state: {
              ...(location.state || {}),
              homeQuickSale: key === '1',
              homeQuickPurchase: key === '2',
              homeQuickPayment: key === '3',
              homeQuickReceipt: key === '4'
            }
          });
          return;
        }

        navigate(shortcutTarget.path, {
          state: { openShortcut: shortcutTarget.openShortcut }
        });
        return;
      }

      if (key !== 'escape' || event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      if (isPopupOpen()) {
        event.preventDefault();
        closeActivePopup();
        return;
      }

      if (location.pathname === '/') {
        return;
      }

      const homeNavigationState = getHomeNavigationState(location.pathname);
      const sectionHubPath = homeNavigationState ? sectionHubPaths[homeNavigationState.section] : null;

      event.preventDefault();
      if (sectionHubPath && location.pathname !== sectionHubPath) {
        navigate(sectionHubPath, {
          replace: true,
          state: {
            activePath: homeNavigationState.path
          }
        });
        return;
      }

      navigate('/', {
        replace: true,
        state: homeNavigationState
          ? {
              homeSection: homeNavigationState.section,
              homePath: homeNavigationState.path
            }
          : undefined
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthenticated, loading, location.pathname, location.state, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500 text-lg">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return (
    children
  );
}
