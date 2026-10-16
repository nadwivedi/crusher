import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowDownToLine, ArrowUpFromLine, CalendarClock, ChevronRight, FileText, Gauge, HandCoins, Mountain,
  PackageMinus, RotateCcw, Send, ShoppingCart, SlidersHorizontal, Undo2, Wallet, Warehouse, Package
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { canAddEntries, canUseSection } from '../utils/staffAccess';
import { hasFeatureAccess } from '../utils/featureAccess';

// Home screen for staff logins: entry buttons and their lists, no totals or analytics
const ENTRIES = [
  { label: 'Boulder Entry', stateKey: 'homeQuickBoulder', section: 'boulder', icon: Mountain, tone: 'bg-blue-50 text-blue-700 ring-blue-100' },
  { label: 'Dump Boulder Entry', stateKey: 'homeQuickDumpIn', section: 'boulder', icon: ArrowUpFromLine, tone: 'bg-amber-50 text-amber-700 ring-amber-100' },
  { label: 'Dump to Hopper', stateKey: 'homeQuickDumpOut', section: 'boulder', icon: ArrowDownToLine, tone: 'bg-sky-50 text-sky-700 ring-sky-100' },
  { label: 'New Sale', stateKey: 'homeQuickSale', section: 'sales', icon: FileText, tone: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
  { label: 'Sale Return', stateKey: 'homeQuickSaleReturn', section: 'sales', feature: 'saleReturn', icon: RotateCcw, tone: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
  { label: 'New Purchase', stateKey: 'homeQuickPurchase', section: 'purchases', icon: ShoppingCart, tone: 'bg-violet-50 text-violet-700 ring-violet-100' },
  { label: 'Purchase Return', stateKey: 'homeQuickPurchaseReturn', section: 'purchases', icon: Undo2, tone: 'bg-rose-50 text-rose-700 ring-rose-100' },
  { label: 'Money Received', stateKey: 'homeQuickReceipt', section: 'receipts', icon: HandCoins, tone: 'bg-teal-50 text-teal-700 ring-teal-100' },
  { label: 'Money Paid', stateKey: 'homeQuickPayment', section: 'payments', icon: Send, tone: 'bg-rose-50 text-rose-700 ring-rose-100' },
  { label: 'New Expense', stateKey: 'homeQuickExpense', section: 'expenses', icon: Wallet, tone: 'bg-amber-50 text-amber-700 ring-amber-100' },
  { label: 'Material Used', stateKey: 'homeQuickMaterialUsed', section: 'materialUsed', icon: PackageMinus, tone: 'bg-indigo-50 text-indigo-700 ring-indigo-100' },
  { label: 'Stock Adjustment', stateKey: 'homeQuickStockAdjustment', section: 'materialUsed', feature: 'stockAdjustment', icon: SlidersHorizontal, tone: 'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-100' },
  { label: 'Meter Reading', stateKey: 'homeQuickMeterReading', section: 'meterReadings', icon: Gauge, tone: 'bg-slate-100 text-slate-700 ring-slate-200' }
];

const LISTS = [
  { label: 'Boulder', to: '/reports/boulder-ledger', section: 'boulder', icon: Mountain },
  { label: 'Dump Boulder', to: '/dump-boulder', section: 'boulder', icon: Warehouse },
  { label: 'Sales', to: '/reports/sales-report', section: 'sales', icon: FileText },
  { label: 'Purchases', to: '/reports/purchase-report', section: 'purchases', icon: ShoppingCart },
  { label: 'Money Received', to: '/reports/receipt-report', section: 'receipts', icon: HandCoins },
  { label: 'Money Paid', to: '/reports/payment-report', section: 'payments', icon: Send },
  { label: 'Expenses', to: '/reports/expense-report', section: 'expenses', icon: Wallet },
  { label: 'Material Used', to: '/reports/material-used-ledger', section: 'materialUsed', icon: PackageMinus },
  { label: 'Inventory', to: '/inventory', section: 'materialUsed', icon: Package },
  { label: 'Meter Reading', to: '/meter-readings', section: 'meterReadings', icon: Gauge }
];

const historyText = (value) => {
  if (value === 'all' || value === undefined || value === null) return 'all entries';
  const days = Number(value);
  if (days === 30 || days === 28) return 'the last 1 month';
  if (days === 365) return 'the last 1 year';
  if (days === 90) return 'the last 3 months';
  return `the last ${days} days`;
};

export default function StaffHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const allowed = (item) => canUseSection(user, item.section) && (!item.feature || hasFeatureAccess(user, item.feature));
  const entries = canAddEntries(user) ? ENTRIES.filter(allowed) : [];
  const lists = LISTS.filter(allowed);

  const openEntry = (stateKey) => {
    navigate('/', { replace: true, state: { ...(location.state || {}), [stateKey]: true } });
  };

  return (
    <div className="page-fade-in max-w-5xl space-y-4 px-3 pb-8 pt-4 md:space-y-5 lg:px-6 lg:pt-5">
      <div>
        <h1 className="page-title">Hello, {user?.name || 'Staff'}</h1>
        <p className="page-subtitle">
          {user?.ownerName ? `${user.ownerName} · ` : ''}You can see {historyText(user?.historyLimitDays)}
        </p>
      </div>

      {entries.length > 0 && (
        <section className="panel overflow-hidden">
          <div className="panel-header">
            <h2 className="text-sm font-bold text-slate-900">New Entry</h2>
            <p className="text-xs text-slate-500">Every entry you add is saved with your name</p>
          </div>
          <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 lg:grid-cols-4">
            {entries.map((entry) => {
              const EntryIcon = entry.icon;
              return (
                <button
                  key={entry.stateKey}
                  type="button"
                  onClick={() => openEntry(entry.stateKey)}
                  className="group flex items-center gap-2 rounded-xl bg-white p-2.5 text-left shadow-sm ring-1 ring-slate-100 transition hover:bg-primary-50 hover:shadow-md"
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${entry.tone}`}>
                    <EntryIcon size={18} />
                  </span>
                  <span className="min-w-0 text-sm font-semibold leading-tight text-slate-700 group-hover:text-slate-900">{entry.label}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {lists.length > 0 ? (
        <section className="panel">
          <div className="panel-header">
            <h2 className="text-sm font-bold text-slate-900">Entries</h2>
            <p className="text-xs text-slate-500">See and edit the entries you made</p>
          </div>
          <ul className="divide-y divide-slate-100">
            {lists.map((list) => {
              const ListIcon = list.icon;
              return (
                <li key={list.to}>
                  <button type="button" onClick={() => navigate(list.to)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50 md:px-5">
                    <ListIcon size={18} className="shrink-0 text-slate-400" />
                    <span className="flex-1 text-sm font-semibold text-slate-800">{list.label}</span>
                    <ChevronRight size={16} className="shrink-0 text-slate-300" />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        <section className="card flex items-center gap-3">
          <CalendarClock size={20} className="shrink-0 text-slate-400" />
          <p className="text-sm text-slate-600">Nothing has been given to your login yet. Ask the owner to switch on the parts you work on.</p>
        </section>
      )}
    </div>
  );
}
