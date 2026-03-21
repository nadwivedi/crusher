import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getSectionConfig } from '../navigation/sectionMenu';
import Sales from './Sales/Sales';
import Purchases from './Purchases/Purchases';
import Payments from './Payments/Payments';
import Receipts from './Receipts/Receipts';
import MaterialUsed from './MaterialUsed';
import SaleReturn from './SaleReturn/SaleReturn';
import PurchaseReturn from './PurchaseReturn/PurchaseReturn';
import StockAdjustment from './StockAdjustment';
import BoulderEntry from './BoulderEntry/BoulderEntry';

const POPUP_VOUCHER_PATHS = new Set([
  '/sales',
  '/purchases',
  '/material-used',
  '/purchase-return',
  '/sale-return',
  '/stock-adjustment',
  '/payments',
  '/receipts',
  '/boulder-entry'
]);

export default function Vouchers() {
  const location = useLocation();
  const navigate = useNavigate();
  const config = getSectionConfig('Vouchers');
  const items = useMemo(() => config?.items || [], [config]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [openVoucherPath, setOpenVoucherPath] = useState('');

  useEffect(() => {
    const activePath = location.state?.activePath;
    if (!activePath || items.length === 0) {
      setActiveIndex(0);
      return;
    }

    const nextIndex = items.findIndex((item) => item.path === activePath);
    setActiveIndex(nextIndex >= 0 ? nextIndex : 0);
  }, [items, location.state]);

  const openVoucherEntry = (path) => {
    if (!path) return;

    if (POPUP_VOUCHER_PATHS.has(path)) {
      setOpenVoucherPath(path);
      return;
    }

    navigate(path);
  };

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
          openVoucherEntry(activeItem.path);
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
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30 text-white">
                  <config.Icon />
                </div>
                <div>
                  <p className="text-[15px] font-bold tracking-[0.18em] text-slate-800">List of Vouchers</p>
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
                    onClick={(event) => {
                      if (!POPUP_VOUCHER_PATHS.has(item.path)) return;
                      event.preventDefault();
                      openVoucherEntry(item.path);
                    }}
                    onMouseEnter={() => setActiveIndex(index)}
                    onFocus={() => setActiveIndex(index)}
                    className={`group relative flex items-center gap-3 border-b border-slate-200/90 px-5 py-2.5 text-[12px] transition-colors duration-200 last:border-b-0 ${
                      isActive
                        ? 'bg-[linear-gradient(90deg,rgba(245,243,255,0.96),rgba(250,245,255,0.94))] text-slate-800'
                        : 'text-slate-700 hover:bg-violet-50/90'
                    }`}
                  >
                    {isActive && <div className="absolute inset-y-0 left-0 w-1 bg-violet-500" />}

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center">
                      <ItemIcon />
                    </div>

                    <div className="min-w-0">
                      <p className={isActive ? 'font-semibold text-slate-800' : 'font-medium text-slate-700 group-hover:text-slate-900'}>
                        {item.name}
                      </p>
                      {item.hint && (
                        <p className={isActive ? 'text-[10px] font-medium text-slate-500' : 'text-[10px] font-medium text-slate-400 group-hover:text-slate-500'}>
                          {item.hint}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {openVoucherPath === '/sales' && (
        <Sales modalOnly onModalFinish={() => setOpenVoucherPath('')} />
      )}

      {openVoucherPath === '/purchases' && (
        <Purchases modalOnly onModalFinish={() => setOpenVoucherPath('')} />
      )}

      {openVoucherPath === '/purchase-return' && (
        <PurchaseReturn modalOnly onModalFinish={() => setOpenVoucherPath('')} />
      )}

      {openVoucherPath === '/material-used' && (
        <MaterialUsed modalOnly onModalFinish={() => setOpenVoucherPath('')} />
      )}

      {openVoucherPath === '/payments' && (
        <Payments modalOnly onModalFinish={() => setOpenVoucherPath('')} />
      )}

      {openVoucherPath === '/receipts' && (
        <Receipts modalOnly onModalFinish={() => setOpenVoucherPath('')} />
      )}

      {openVoucherPath === '/sale-return' && (
        <SaleReturn modalOnly onModalFinish={() => setOpenVoucherPath('')} />
      )}

      {openVoucherPath === '/stock-adjustment' && (
        <StockAdjustment modalOnly onModalFinish={() => setOpenVoucherPath('')} />
      )}

      {openVoucherPath === '/boulder-entry' && (
        <BoulderEntry modalOnly onModalFinish={() => setOpenVoucherPath('')} />
      )}
    </div>
  );
}
