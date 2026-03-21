import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, Boxes, FileBarChart, Package, ReceiptText, RefreshCw, ShoppingCart, Truck, Users } from 'lucide-react';
import { getSectionConfig } from '../navigation/sectionMenu';

const REPORT_ITEMS = [
  { name: 'Day Book', path: '/day-book', Icon: BookOpen },
  { name: 'Party Ledger', path: '/reports/party-ledger', Icon: Users },
  { name: 'Stock Ledger', path: '/reports/stock-ledger', Icon: Boxes },
  { name: 'Boulder Ledger', path: '/reports/boulder-ledger', Icon: Truck },
  { name: 'Material Used Ledger', path: '/reports/material-used-ledger', Icon: Package },
  { name: 'Sales Report', path: '/reports/sales-report', Icon: ShoppingCart },
  { name: 'Sale Return Report', path: '/reports/sale-return-report', Icon: RefreshCw },
  { name: 'Stock Adjustment Report', path: '/reports/stock-adjustment-report', Icon: Boxes },
  { name: 'Receipt Report', path: '/reports/receipt-report', Icon: ReceiptText },
  { name: 'Expense Report', path: '/reports/expense-report', Icon: ReceiptText },
  { name: 'Profit And Loss Report', path: '/reports/profit-loss-report', Icon: FileBarChart }
];

export default function ReportsHub() {
  const location = useLocation();
  const navigate = useNavigate();
  const config = getSectionConfig('Reports');
  const items = useMemo(() => REPORT_ITEMS, []);
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

  if (!config) return null;

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0f172a] to-[#020617] px-4 py-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl items-center justify-center">
        <div className="relative flex w-full max-w-[23rem] flex-col overflow-hidden rounded-[30px] border border-white/20 bg-gradient-to-br from-white/95 via-white/90 to-white/80 shadow-[0_32px_80px_rgba(0,0,0,0.5),0_0_60px_rgba(99,102,241,0.15),inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-sm">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.12),transparent_40%),radial-gradient(circle_at_80%_20%,rgba(167,139,250,0.1),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.08),transparent_30%)]" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-white/40 to-transparent" />

          <div className="relative z-10 border-b border-slate-200/60 bg-gradient-to-r from-white/60 to-transparent px-5 py-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-rose-600 text-white shadow-lg shadow-amber-500/30">
                  <config.Icon />
                </div>
                <div>
                  <p className="text-[15px] font-bold tracking-[0.18em] text-slate-800">List of Reports</p>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Choose An Option</p>
                </div>
              </div>

              <Link
                to="/"
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700 transition hover:bg-slate-50"
              >
                Home
              </Link>
            </div>
          </div>

          <div className="sidebar-scrollbar relative z-10 flex-1 overflow-y-auto pb-8">
            <nav className="flex flex-col">
              {items.map((item, index) => {
                const ItemIcon = item.Icon;
                const isActive = index === activeIndex;

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onMouseEnter={() => setActiveIndex(index)}
                    onFocus={() => setActiveIndex(index)}
                    className={`group relative flex items-center gap-3 border-b border-slate-200/90 px-5 py-2.5 text-[12px] transition-colors duration-200 last:border-b-0 ${
                      isActive
                        ? 'bg-[linear-gradient(90deg,rgba(255,237,213,0.96),rgba(255,247,237,0.94))] text-slate-800'
                        : 'text-slate-700 hover:bg-amber-50/90'
                    }`}
                  >
                    {isActive && <div className="absolute inset-y-0 left-0 w-1 bg-amber-500" />}

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center">
                      <ItemIcon />
                    </div>

                    <span className={isActive ? 'font-semibold text-slate-800' : 'font-medium text-slate-700 group-hover:text-slate-900'}>
                      {item.name}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}
