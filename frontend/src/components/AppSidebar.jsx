import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, BookOpenText, ChartNoAxesCombined, Mountain, FileText, HandCoins, Send, Wallet,
  PackageMinus, IdCard, ChartColumn, Users, Layers, Scale, Boxes, Truck, Landmark, Tags,
  Settings, LogOut, X
} from 'lucide-react';
import Logo from './Logo';

const navGroups = [
  {
    label: 'Overview',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/day-book', icon: BookOpenText, label: 'Day Book' },
      { to: '/analytics', icon: ChartNoAxesCombined, label: 'Analytics' },
    ]
  },
  {
    label: 'Operations',
    items: [
      { to: '/reports/boulder-ledger', icon: Mountain, label: 'Boulder' },
      { to: '/reports/sales-report', icon: FileText, label: 'Sales' },
      { to: '/reports/receipt-report', icon: HandCoins, label: 'Money Received' },
      { to: '/reports/payment-report', icon: Send, label: 'Money Paid' },
      { to: '/accounts', icon: Landmark, label: 'Cash & Bank' },
      { to: '/reports/expense-report', icon: Wallet, label: 'Expenses' },
      { to: '/reports/material-used-ledger', icon: PackageMinus, label: 'Material Used' },
      { to: '/payroll', icon: IdCard, label: 'Payroll' },
    ]
  },
  {
    label: 'Reports',
    items: [
      { to: '/reports', icon: ChartColumn, label: 'Reports' },
      { to: '/reports/party-ledger', icon: Users, label: 'Party Ledger' },
      { to: '/reports/stock-ledger', icon: Layers, label: 'Stock Ledger' },
      { to: '/reports/profit-loss-report', icon: Scale, label: 'Profit & Loss' },
    ]
  },
  {
    label: 'Masters',
    items: [
      { to: '/party', icon: Users, label: 'Party' },
      { to: '/stock', icon: Boxes, label: 'Stock Items' },
      { to: '/vehicle', icon: Truck, label: 'Vehicles' },
      { to: '/expense-types', icon: Tags, label: 'Expense Types' },
    ]
  }
];

const SETTINGS_PATH = '/settings';
const NAV_PATHS = [...navGroups.flatMap((group) => group.items.map((item) => item.to)), SETTINGS_PATH];

const matchesPath = (pathname, path) => (
  path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(`${path}/`)
);

// Several entries share a prefix (/reports and /reports/sales-report), so only the longest match is active.
const getActivePath = (pathname) => NAV_PATHS
  .filter((path) => matchesPath(pathname, path))
  .sort((a, b) => b.length - a.length)[0];

const NavItem = ({ to, icon: Icon, label, isActive }) => (
  <Link
    to={to}
    className={`group flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-200 ${
      isActive
        ? 'bg-primary-600 text-white shadow-md shadow-primary-600/25'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`}
  >
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
        isActive
          ? 'bg-white/20 text-white'
          : 'bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-primary-600'
      }`}
    >
      <Icon size={18} />
    </span>
    <span className="truncate">{label}</span>
  </Link>
);

export default function AppSidebar({ mobileOpen = false, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const activePath = getActivePath(location.pathname);
  const displayName = String(user?.companyName || `${user?.firstName || ''} ${user?.lastName || ''}`).trim() || 'User';

  // Close the mobile drawer after navigating
  useEffect(() => {
    onClose?.();
  }, [location.pathname, onClose]);

  // While the mobile drawer is open: Esc closes it and the page behind stops scrolling
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      // Pages listen for Esc on window to leave the page; keep this press for the drawer only.
      e.preventDefault();
      e.stopPropagation();
      onClose?.();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [mobileOpen, onClose]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const content = (
    <div className="relative flex h-full flex-col">
      {/* Logo */}
      <div className="flex-none px-4 pb-4 pt-5">
        <div className="flex items-center justify-center">
          <Link to="/" className="flex items-center justify-center">
            <Logo subtitle={user?.companyName || 'Crusher Management'} />
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-4 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 lg:hidden"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="mx-5 h-px bg-slate-200" />

      {/* Nav */}
      <div className="scrollbar-hide flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">{group.label}</p>
            <nav className="space-y-1">
              {group.items.map((item) => (
                <NavItem key={item.to} {...item} isActive={item.to === activePath} />
              ))}
            </nav>
          </div>
        ))}
      </div>

      {/* Settings / User / Logout */}
      <div className="flex-none space-y-2 border-t border-slate-200 p-3">
        <NavItem to={SETTINGS_PATH} icon={Settings} label="Settings" isActive={activePath === SETTINGS_PATH} />
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-inset ring-slate-100">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-600 text-sm font-bold text-white">
            {displayName[0].toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-slate-800">{displayName}</p>
            <p className="truncate text-[11px] capitalize text-slate-400">{user?.role}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title="Logout"
            aria-label="Logout"
            className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop: fixed sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] flex-col border-r border-slate-200 bg-white lg:flex">
        {content}
      </aside>

      {/* Mobile: slide-in drawer. z-[60] (not z-50) so the popup shortcut checks don't mistake it for an open popup. */}
      <div className={`fixed inset-0 z-[60] lg:hidden ${mobileOpen ? '' : 'pointer-events-none'}`} aria-hidden={!mobileOpen}>
        <div
          className={`absolute inset-0 bg-slate-900/50 transition-opacity duration-200 ${mobileOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={onClose}
        />
        <aside
          className={`absolute inset-y-0 left-0 flex w-[280px] max-w-[85vw] flex-col bg-white shadow-2xl transition-transform duration-200 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
        >
          {content}
        </aside>
      </div>
    </>
  );
}
