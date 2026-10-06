import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Boxes, ChevronRight, FileBarChart, FileText, Fuel, Mountain, Package, ReceiptText, RefreshCw, Users, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { filterRestrictedItems } from '../utils/featureAccess';

const REPORT_ITEMS = [
  { name: 'Party Ledger', path: '/reports/party-ledger', Icon: Users },
  { name: 'Boulder Ledger', path: '/reports/boulder-ledger', Icon: Mountain },
  { name: 'Sales Report', path: '/reports/sales-report', Icon: FileText },
  { name: 'Stock Ledger', path: '/reports/stock-ledger', Icon: Boxes },
  { name: 'Material Used Ledger', path: '/reports/material-used-ledger', Icon: Package },
  { name: 'Sale Return Report', path: '/reports/sale-return-report', Icon: RefreshCw },
  { name: 'Stock Adjustment Report', path: '/reports/stock-adjustment-report', Icon: Boxes },
  { name: 'Receipt Report', path: '/reports/receipt-report', Icon: ReceiptText },
  { name: 'Payment Report', path: '/reports/payment-report', Icon: Wallet },
  { name: 'Diesel Consumption Report', path: '/reports/diesel-consumption', Icon: Fuel },
  { name: 'Expense Report', path: '/reports/expense-report', Icon: ReceiptText },
  { name: 'Profit And Loss Report', path: '/reports/profit-loss-report', Icon: FileBarChart }
];

export default function ReportsHub() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const items = useMemo(() => filterRestrictedItems(REPORT_ITEMS, user), [user]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const activePath = location.state?.activePath;
    if (!activePath || items.length === 0) {
      setActiveIndex(0);
      return;
    }

    const nextIndex = items.findIndex((item) => item.path === activePath);
    setActiveIndex(nextIndex >= 0 ? nextIndex : 0);
  }, [items, location.state]);

  useEffect(() => {
    const isTypingTarget = (target) => {
      const tagName = target?.tagName?.toLowerCase();
      return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target?.isContentEditable;
    };

    const isPopupOpen = () => Boolean(document.querySelector('.fixed.inset-0.z-50'));

    const handleKeyDown = (event) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target) || isPopupOpen() || items.length === 0) return;

      const key = event.key?.toLowerCase();

      if (key === 'arrowdown') {
        event.preventDefault();
        setActiveIndex((prev) => (prev + 1) % items.length);
        return;
      }

      if (key === 'arrowup') {
        event.preventDefault();
        setActiveIndex((prev) => (prev - 1 + items.length) % items.length);
        return;
      }

      if (key === 'enter') {
        event.preventDefault();
        const activeItem = items[activeIndex];
        if (activeItem?.path) {
          navigate(activeItem.path);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, items, navigate]);

  useEffect(() => {
    const isTypingTarget = (target) => {
      const tagName = target?.tagName?.toLowerCase();
      return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target?.isContentEditable;
    };

    const handleKeyDown = (event) => {
      if (event.key !== 'Escape' || event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      if (isTypingTarget(event.target)) {
        return;
      }

      event.preventDefault();
      navigate('/', { replace: true });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  return (
    <div className="page-fade-in space-y-4 px-3 pb-8 pt-4 md:space-y-5 lg:px-6 lg:pt-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Ledgers and reports for your crusher</p>
        </div>
      </div>

      <nav className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:gap-3 xl:grid-cols-3">
        {items.map((item, index) => {
          const ItemIcon = item.Icon;
          const isActive = index === activeIndex;

          return (
            <Link
              key={item.path}
              to={item.path}
              onMouseEnter={() => setActiveIndex(index)}
              onFocus={() => setActiveIndex(index)}
              className={`group flex items-center gap-3 rounded-2xl bg-white p-3.5 shadow-xs ring-1 transition ${
                isActive ? 'ring-2 ring-primary-500' : 'ring-slate-200'
              }`}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                  isActive ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                <ItemIcon size={20} />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">{item.name}</span>
              <ChevronRight size={18} className={`shrink-0 ${isActive ? 'text-primary-600' : 'text-slate-300'}`} />
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
