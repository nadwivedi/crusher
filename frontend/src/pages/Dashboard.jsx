import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Mountain, FileText, Wallet, HandCoins, Send, ShoppingCart, PackageMinus, Layers,
  ArrowDownLeft, ArrowUpRight
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import apiClient from '../utils/api';
import StatCard from '../components/StatCard';
import Segmented from '../components/Segmented';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
const fmtNum = (n) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n || 0);
const toTons = (kg) => Number(kg || 0) / 1000;
// Sizes read as "20mm"; named materials (dust, wmm, gsb) read better in capitals
const formatMaterial = (name) => (/^\d/.test(name) ? name : String(name || '-').toUpperCase());
const fmtShortAmount = (v) => {
  if (v >= 100000) return `₹${fmtNum(v / 100000)}L`;
  if (v >= 1000) return `₹${fmtNum(v / 1000)}K`;
  return `₹${v}`;
};

const toInputDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const daysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};
const formatDate = (value, options) => new Date(`${value}T00:00:00`).toLocaleDateString('en-GB', options);
const FULL_DATE = { day: 'numeric', month: 'short', year: 'numeric' };

const RANGES = [
  { key: 'today', label: 'Today', get: () => [new Date(), new Date()] },
  { key: 'yesterday', label: 'Yesterday', get: () => [daysAgo(1), daysAgo(1)] },
  { key: 'last7', label: 'Last 7 Days', shortLabel: '7 Days', get: () => [daysAgo(6), new Date()] },
  { key: 'last30', label: 'Last 30 Days', shortLabel: '30 Days', get: () => [daysAgo(29), new Date()] },
  { key: 'year', label: 'This Year', shortLabel: 'Year', get: () => [new Date(new Date().getFullYear(), 0, 1), new Date()] },
  { key: 'lifetime', label: 'Lifetime' },
  { key: 'custom', label: 'Custom' },
];

const rangeLabel = (from, to) => from === to
  ? formatDate(from, FULL_DATE)
  : `${formatDate(from, FULL_DATE)} – ${formatDate(to, FULL_DATE)}`;

// Entry popups are opened by App.jsx from these router-state flags while on "/".
const QUICK_ENTRIES = [
  { label: 'Boulder Entry', stateKey: 'homeQuickBoulder', icon: Mountain, tone: 'bg-blue-50 text-blue-700 ring-blue-100' },
  { label: 'New Sale', stateKey: 'homeQuickSale', icon: FileText, tone: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
  { label: 'New Purchase', stateKey: 'homeQuickPurchase', icon: ShoppingCart, tone: 'bg-violet-50 text-violet-700 ring-violet-100' },
  { label: 'New Expense', stateKey: 'homeQuickExpense', icon: Wallet, tone: 'bg-amber-50 text-amber-700 ring-amber-100' },
  { label: 'Money Received', stateKey: 'homeQuickReceipt', icon: HandCoins, tone: 'bg-teal-50 text-teal-700 ring-teal-100' },
  { label: 'Money Paid', stateKey: 'homeQuickPayment', icon: Send, tone: 'bg-rose-50 text-rose-700 ring-rose-100' },
  { label: 'Material Used', stateKey: 'homeQuickMaterialUsed', icon: PackageMinus, tone: 'bg-indigo-50 text-indigo-700 ring-indigo-100' },
];
const MORE_ENTRIES = [
  { label: 'Purchase Return', stateKey: 'homeQuickPurchaseReturn' },
  { label: 'Sale Return', stateKey: 'homeQuickSaleReturn' },
  { label: 'Stock Adjustment', stateKey: 'homeQuickStockAdjustment' },
];
const QUICK_STATE_KEYS = [
  'homeQuickBoulder', 'homeQuickSale', 'homeQuickPurchase', 'homeQuickPayment',
  'homeQuickReceipt', 'homeQuickMaterialUsed', 'homeQuickPurchaseReturn', 'homeQuickExpense',
  'homeQuickSaleReturn', 'homeQuickStockAdjustment'
];
const quickEntryState = (currentState, stateKey) => ({
  ...(currentState || {}),
  ...Object.fromEntries(QUICK_STATE_KEYS.map((key) => [key, key === stateKey]))
});

// Shared chart styling
const AXIS_TICK = { fontSize: 11, fill: '#64748b' };
const TOOLTIP_STYLE = { borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -12px rgba(15,23,42,0.25)', fontSize: 12 };
const CHART_BLUE = '#2563eb';
const CHART_GREEN = '#10b981';
const CHART_AMBER = '#f59e0b';

/** Heading of a cash flow column: round icon, small label and the column's total. */
function FlowHead({ icon: Icon, iconClass, label, value, valueClass = 'text-slate-900' }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white ${iconClass}`}>
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <p className={`truncate text-[22px] font-bold leading-tight ${valueClass}`}>{value}</p>
      </div>
    </div>
  );
}

/** One line under a cash flow heading: label (+ small note) on the left, amount on the right. */
function FlowRow({ label, note, value, dot, valueClass = 'text-slate-800' }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <p className="flex min-w-0 items-center gap-2 text-sm text-slate-600">
        {dot && <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />}
        <span className="truncate">{label}</span>
        {note && <span className="shrink-0 text-xs text-slate-400">{note}</span>}
      </p>
      <p className={`shrink-0 whitespace-nowrap text-sm font-semibold ${valueClass}`}>{value}</p>
    </div>
  );
}

export default function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rangeKey, setRangeKey] = useState('today');
  const [range, setRange] = useState(() => ({ from: toInputDate(new Date()), to: toInputDate(new Date()) }));
  const [custom, setCustom] = useState(range);

  const entryPopupOpen = QUICK_STATE_KEYS.some((key) => location.state?.[key]);

  // Reloads when the range changes and again once an entry popup closes, so new entries show up in the totals.
  useEffect(() => {
    if (entryPopupOpen) return undefined;

    let ignore = false;
    setLoading(true);
    apiClient.get('/reports/dashboard-summary', { params: range.lifetime ? { range: 'lifetime' } : { fromDate: range.from, toDate: range.to } })
      .then((response) => {
        if (ignore) return;
        setData(response);
        setError('');
      })
      .catch((err) => {
        if (!ignore) setError(err?.message || 'Unable to load dashboard');
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => { ignore = true; };
  }, [range, entryPopupOpen]);

  const openQuickEntry = (entry) => {
    navigate('/', { replace: true, state: quickEntryState(location.state, entry.stateKey) });
  };

  // Alt + 6 opens a new expense (Alt + 1-4 are handled in ProtectedRoute)
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key !== '6' || !event.altKey || event.ctrlKey || event.metaKey || event.defaultPrevented) return;

      const tagName = event.target?.tagName?.toLowerCase();
      const isTyping = tagName === 'input' || tagName === 'textarea' || tagName === 'select' || event.target?.isContentEditable;
      if (isTyping || document.querySelector('.fixed.inset-0.z-50')) return;

      event.preventDefault();
      navigate('/', { replace: true, state: quickEntryState(location.state, 'homeQuickExpense') });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [location.state, navigate]);

  const selectRange = (key) => {
    setRangeKey(key);
    const preset = RANGES.find((r) => r.key === key);
    if (preset?.get) {
      const [from, to] = preset.get();
      setRange({ from: toInputDate(from), to: toInputDate(to) });
    } else if (key === 'lifetime') {
      setRange({ lifetime: true });
    } else {
      // Custom starts from the dates currently on screen
      setCustom({ from: shownFrom || shownTo, to: shownTo });
    }
  };

  // Lifetime has no dates of its own: the API answers with the date of the first entry
  const lifetimeFrom = data?.lifetime ? toInputDate(new Date(data.fromDate)) : '';
  const shownFrom = range.lifetime ? lifetimeFrom : range.from;
  const shownTo = range.lifetime ? toInputDate(new Date()) : range.to;

  const customValid = custom.from && custom.to && custom.from <= custom.to;
  const applyCustom = () => { if (customValid) setRange({ ...custom }); };

  const periodLabel = RANGES.find((r) => r.key === rangeKey)?.label;
  const periodText = rangeKey === 'custom' ? 'Selected range' : periodLabel;

  const trend = (data?.trend || []).map((row) => ({ ...row, boulderTons: toTons(row.boulder) }));
  const byMonth = data?.groupBy === 'month';
  // Short ranges are padded to a week by the API so the charts are not a single point
  const trendIsPadded = trend.length > 0 && trend[0].date < shownFrom;
  const trendText = byMonth ? 'by month' : trendIsPadded ? 'last 7 days' : 'by day';
  // Months repeat once the trend crosses a year, so the year goes on the axis too
  const trendYears = new Set(trend.map((row) => row.date.slice(0, 4)));
  const monthTick = trendYears.size > 1 ? { month: 'short', year: '2-digit' } : { month: 'short' };
  const tickFormat = (d) => formatDate(d, byMonth ? monthTick : { day: '2-digit', month: 'short' });
  const labelFormat = (d) => formatDate(d, byMonth ? { month: 'long', year: 'numeric' } : FULL_DATE);

  const salesAmount = data?.sales?.amount || 0;
  const cashSales = data?.sales?.cashAmount || 0;
  const creditSales = data?.sales?.creditAmount || 0;
  const cashShare = salesAmount > 0 ? (cashSales / salesAmount) * 100 : 0;
  const creditShare = salesAmount > 0 ? (creditSales / salesAmount) * 100 : 0;
  const moneyIn = data?.cashFlow?.moneyIn || {};
  const moneyOut = data?.cashFlow?.moneyOut || {};
  const netCash = data?.cashFlow?.net || 0;
  const expensesAmount = data?.expenses?.amount || 0;
  const purchasesAmount = data?.purchases?.amount || 0;
  // "of ₹X" is only worth showing while part of the bills is still unpaid
  const expensesUnpaid = expensesAmount > (moneyOut.expenses || 0);
  const purchasesUnpaid = purchasesAmount > (moneyOut.purchases || 0);
  const netTone = netCash >= 0 ? 'text-emerald-700' : 'text-rose-700';
  const netText = `${netCash >= 0 ? '+' : '−'} ${fmt(Math.abs(netCash))}`;

  const materialSales = data?.sales?.byMaterial || [];
  const hasCubicSales = materialSales.some((row) => row.cubicMeterQty > 0);
  const materialTotals = materialSales.reduce((totals, row) => ({
    count: totals.count + row.count,
    netWeight: totals.netWeight + row.netWeight,
    cubicMeterQty: totals.cubicMeterQty + row.cubicMeterQty,
  }), { count: 0, netWeight: 0, cubicMeterQty: 0 });

  const kpis = [
    {
      icon: Mountain, label: 'Boulder Crushed', tone: 'blue',
      value: `${fmtNum(toTons(data?.boulder?.netWeight))} tons`,
      hint: `${fmtNum(data?.boulder?.trips)} trips · ${periodText}`
    },
    {
      icon: FileText, label: 'Sales', tone: 'emerald',
      value: fmt(data?.sales?.amount),
      hint: `${fmtNum(toTons(data?.sales?.netWeight))} tons in ${fmtNum(data?.sales?.count)} sales · ${periodText}`
    },
    {
      icon: Wallet, label: 'Expenses', tone: 'amber',
      value: fmt(data?.expenses?.amount),
      hint: `${fmtNum(data?.expenses?.count)} entries · ${periodText}`
    },
    {
      icon: HandCoins, label: 'Money Received', tone: 'teal',
      value: fmt(data?.receipts?.amount),
      hint: `${fmtNum(data?.receipts?.count)} receipts · ${periodText}`
    },
    {
      icon: Send, label: 'Money Paid', tone: 'rose',
      value: fmt(data?.payments?.amount),
      hint: `${fmtNum(data?.payments?.count)} payments · ${periodText}`
    },
    {
      icon: ShoppingCart, label: 'Purchases', tone: 'indigo',
      value: fmt(data?.purchases?.amount),
      hint: `${fmtNum(data?.purchases?.count)} bills · ${periodText}`
    },
  ];

  return (
    <div className="page-fade-in space-y-3.5 px-3 pb-6 pt-3.5 md:space-y-4 lg:px-6 lg:pt-4">
      {/* Header + date range filter */}
      <div className="page-header gap-2.5">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            {periodLabel} · {shownFrom ? rangeLabel(shownFrom, shownTo) : 'All entries'}
          </p>
        </div>
        <Segmented options={RANGES} value={rangeKey} onChange={selectRange} />
      </div>

      {rangeKey === 'custom' && (
        <div className="card flex flex-wrap items-end gap-3 p-3.5 md:p-4">
          <div>
            <label className="label">From</label>
            <input type="date" className="input" value={custom.from} max={custom.to || undefined}
              onChange={(e) => setCustom({ ...custom, from: e.target.value })} />
          </div>
          <div>
            <label className="label">To</label>
            <input type="date" className="input" value={custom.to} min={custom.from || undefined}
              onChange={(e) => setCustom({ ...custom, to: e.target.value })} />
          </div>
          <button type="button" className="btn-primary" onClick={applyCustom} disabled={!customValid}>Apply</button>
          {!customValid && <p className="pb-2 text-xs font-medium text-rose-600">"From" date must be on or before "To" date</p>}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700">
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-primary-600 border-r-transparent" />
          <p className="text-sm text-slate-400">Loading dashboard…</p>
        </div>
      ) : (
      <div className={`space-y-3.5 transition-opacity md:space-y-4 ${loading ? 'pointer-events-none opacity-50' : ''}`}>

      {/* KPI cards */}
      {/* Three in a row on every screen; the compact tile keeps them readable on phones */}
      <section className="grid grid-cols-3 gap-2 md:gap-3">
        {kpis.map((kpi) => <StatCard key={kpi.label} compact {...kpi} />)}
      </section>

      {/* Quick entry: the app's blue as a band of colour, with white tiles on it */}
      <section className="panel @container bg-gradient-to-r from-primary-700 to-primary-600 ring-primary-700">
        <div className="panel-header py-3 flex flex-wrap items-center justify-between gap-2 border-white/15">
          <div>
            <h3 className="text-sm font-bold text-white">Quick Entry</h3>
            <p className="text-xs text-primary-100">Add today's entries without leaving the dashboard</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {MORE_ENTRIES.map((entry) => (
              <button
                key={entry.label}
                type="button"
                onClick={() => openQuickEntry(entry)}
                className="rounded-lg border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold text-white transition hover:bg-white/20"
              >
                {entry.label}
              </button>
            ))}
          </div>
        </div>
        {/* Columns follow the panel's own width (not the screen's), so a tile is always wide enough for its label */}
        <div className="grid grid-cols-2 gap-2 p-2.5 @xl:grid-cols-3 @3xl:grid-cols-4 @[84rem]:grid-cols-7 md:gap-2.5 md:p-3">
          {QUICK_ENTRIES.map(({ icon: Icon, ...entry }) => (
            <button
              key={entry.stateKey}
              type="button"
              onClick={() => openQuickEntry(entry)}
              className="group flex items-center gap-2 rounded-xl bg-white p-2 text-left shadow-sm transition hover:bg-primary-50 hover:shadow-md"
            >
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${entry.tone}`}>
                <Icon size={17} />
              </span>
              <span className="min-w-0 text-[13px] font-semibold leading-tight text-slate-700 group-hover:text-slate-900">{entry.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Cash flow */}
      <section className="panel">
        <div className="panel-header py-3">
          <h3 className="text-sm font-bold text-slate-900">Cash Flow</h3>
          <p className="text-xs text-slate-500">Money that actually came in and went out · {periodText}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3">
          {/* Money in, money out and what is left of the two */}
          <div className="flex flex-col lg:col-span-2">
            <div className="grid flex-1 grid-cols-1 divide-y divide-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
              <div className="px-4 py-3.5 md:px-5 md:py-4">
                <FlowHead icon={ArrowDownLeft} iconClass="bg-emerald-600" label="Money In" value={fmt(moneyIn.total)} valueClass="text-emerald-700" />
                <div className="mt-2.5 divide-y divide-slate-100 border-t border-slate-100">
                  <FlowRow label="Cash from sales" value={fmt(moneyIn.sales)} />
                  <FlowRow label="Received from parties" value={fmt(moneyIn.receipts)} />
                </div>
              </div>

              <div className="px-4 py-3.5 md:px-5 md:py-4">
                <FlowHead icon={ArrowUpRight} iconClass="bg-rose-600" label="Money Out" value={fmt(moneyOut.total)} valueClass="text-rose-700" />
                <div className="mt-2.5 divide-y divide-slate-100 border-t border-slate-100">
                  <FlowRow label="Expenses paid" note={expensesUnpaid ? `of ${fmt(expensesAmount)}` : undefined} value={fmt(moneyOut.expenses)} />
                  <FlowRow label="Paid to parties" value={fmt(moneyOut.payments)} />
                  <FlowRow label="Purchases paid" note={purchasesUnpaid ? `of ${fmt(purchasesAmount)}` : undefined} value={fmt(moneyOut.purchases)} />
                </div>
              </div>
            </div>

            <div className={`flex items-center justify-between gap-3 border-t px-4 py-2.5 md:px-5 ${netCash >= 0 ? 'border-emerald-100 bg-emerald-50' : 'border-rose-100 bg-rose-50'}`}>
              <div>
                <p className="text-sm font-bold text-slate-900">Net Cash Flow</p>
                <p className="text-[11px] text-slate-500">Money in − money out</p>
              </div>
              <p className={`whitespace-nowrap text-xl font-bold ${netTone}`}>{netText}</p>
            </div>
          </div>

          {/* Sales: how much was cash, how much is still credit */}
          <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-3.5 md:px-5 md:py-4 lg:border-l lg:border-t-0">
            <FlowHead icon={FileText} iconClass="bg-slate-700" label="Total Sales" value={fmt(salesAmount)} />
            <div className="mt-3 flex h-2 gap-0.5 overflow-hidden rounded-full bg-slate-200">
              <div className="rounded-full bg-emerald-500" style={{ width: `${cashShare}%` }} />
              <div className="rounded-full bg-amber-400" style={{ width: `${creditShare}%` }} />
            </div>
            <div className="mt-1.5 divide-y divide-slate-200/70">
              <FlowRow dot="bg-emerald-500" label="Cash sales" note={`${fmtNum(Math.round(cashShare))}%`} value={fmt(cashSales)} valueClass="text-emerald-700" />
              <FlowRow dot="bg-amber-400" label="Credit, to collect" note={`${fmtNum(Math.round(creditShare))}%`} value={fmt(creditSales)} valueClass="text-amber-700" />
            </div>
          </div>
        </div>
      </section>

      {/* Material-wise sales: soft blue title strip, echoing the quick entry band */}
      <section className="panel">
        <div className="panel-header py-3 flex items-center justify-between gap-3 border-primary-100 bg-primary-50">
          <div>
            <h3 className="text-sm font-bold text-primary-900">Material-wise Sales</h3>
            <p className="text-xs text-slate-600">Quantity and amount sold per material · {periodText}</p>
          </div>
          {materialSales.length > 0 && (
            <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
              {materialSales.length} material{materialSales.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
        {materialSales.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left [&_td]:py-2.5 [&_th]:py-2">
              <thead>
                <tr>
                  <th className="tbl-head">Material</th>
                  <th className="tbl-head hidden text-right sm:table-cell">Sales</th>
                  <th className="tbl-head text-right">Quantity</th>
                  {hasCubicSales && <th className="tbl-head text-right">Cubic Meter</th>}
                  <th className="tbl-head text-right">Amount</th>
                  <th className="tbl-head hidden md:table-cell">Share of Sales</th>
                </tr>
              </thead>
              <tbody>
                {materialSales.map((row) => {
                  const share = data.sales.amount > 0 ? (row.amount / data.sales.amount) * 100 : 0;
                  return (
                    <tr key={row.material} className="tbl-row">
                      <td className="tbl-cell">
                        <div className="flex items-center gap-3">
                          <span className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100 sm:flex">
                            <Layers size={17} />
                          </span>
                          <span className="font-semibold text-slate-800">{formatMaterial(row.material)}</span>
                        </div>
                      </td>
                      <td className="tbl-cell hidden text-right sm:table-cell">{fmtNum(row.count)}</td>
                      <td className="tbl-cell whitespace-nowrap text-right font-semibold text-slate-800">{fmtNum(toTons(row.netWeight))} tons</td>
                      {hasCubicSales && (
                        <td className="tbl-cell whitespace-nowrap text-right">{row.cubicMeterQty > 0 ? `${fmtNum(row.cubicMeterQty)} m³` : '-'}</td>
                      )}
                      <td className="tbl-cell whitespace-nowrap text-right font-semibold text-emerald-700">{fmt(row.amount)}</td>
                      <td className="tbl-cell hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${share}%` }} />
                          </div>
                          <span className="text-xs font-medium text-slate-500">{fmtNum(Math.round(share))}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50">
                  <td className="tbl-cell font-bold text-slate-900">Total</td>
                  <td className="tbl-cell hidden text-right font-bold text-slate-900 sm:table-cell">{fmtNum(materialTotals.count)}</td>
                  <td className="tbl-cell whitespace-nowrap text-right font-bold text-slate-900">{fmtNum(toTons(materialTotals.netWeight))} tons</td>
                  {hasCubicSales && (
                    <td className="tbl-cell whitespace-nowrap text-right font-bold text-slate-900">{fmtNum(materialTotals.cubicMeterQty)} m³</td>
                  )}
                  <td className="tbl-cell whitespace-nowrap text-right font-bold text-emerald-700">{fmt(data.sales.amount)}</td>
                  <td className="tbl-cell hidden md:table-cell" />
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 px-6 py-8 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Layers size={20} />
            </span>
            <p className="text-sm font-semibold text-slate-800">No sales in this period</p>
            <p className="text-xs text-slate-500">Material-wise totals appear here once a sale is added.</p>
          </div>
        )}
      </section>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-3.5 md:gap-4 lg:grid-cols-2">
        <section className="panel">
          <div className="panel-header py-3">
            <h3 className="text-sm font-bold text-slate-900">Boulder Crushed</h3>
            <p className="text-xs text-slate-500">Tons {trendText}</p>
          </div>
          <div className="p-2.5 md:p-3">
            <ResponsiveContainer width="100%" height={216}>
              <BarChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="date" tick={AXIS_TICK} tickFormatter={tickFormat} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={44} />
                <Tooltip
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v) => [`${fmtNum(v)} tons`, 'Boulder']}
                  labelFormatter={labelFormat}
                />
                <Bar dataKey="boulderTons" fill={CHART_BLUE} radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header py-3">
            <h3 className="text-sm font-bold text-slate-900">Sales vs Expenses</h3>
            <p className="text-xs text-slate-500">Amount {trendText}</p>
          </div>
          <div className="p-2.5 md:p-3">
            <ResponsiveContainer width="100%" height={216}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="date" tick={AXIS_TICK} tickFormatter={tickFormat} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={52} tickFormatter={fmtShortAmount} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, n) => [fmt(v), n]} labelFormatter={labelFormat} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="sales" stroke={CHART_GREEN} strokeWidth={2} dot={{ r: 3 }} name="Sales" />
                <Line type="monotone" dataKey="expenses" stroke={CHART_AMBER} strokeWidth={2} dot={{ r: 3 }} name="Expenses" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
      </div>
      )}
    </div>
  );
}
