import { useEffect, useMemo, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ReceiptText,
  Search,
  CalendarDays,
  Scale,
  ShoppingCart,
  RefreshCw,
  Inbox
} from 'lucide-react';
import apiClient from '../../utils/api';

// ─── Formatting helpers ──────────────────────────────────────────────────────

const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString('en-IN', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
})}`;

const formatTons = (kg) => `${(Number(kg || 0) / 1000).toLocaleString('en-IN', { maximumFractionDigits: 2 })} T`;

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Local YYYY-MM-DD (toISOString would shift the day in IST)
const toInputDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// ─── Date presets ────────────────────────────────────────────────────────────

const PRESETS = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: '7 Days' },
  { key: 'thisMonth', label: 'This Month' },
  { key: 'lastMonth', label: 'Last Month' },
  { key: 'fy', label: 'This FY' },
  { key: 'all', label: 'All Time' }
];

const getPresetRange = (key) => {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();
  switch (key) {
    case 'today':
      return { from: toInputDate(today), to: toInputDate(today) };
    case '7d': {
      const from = new Date(today);
      from.setDate(from.getDate() - 6);
      return { from: toInputDate(from), to: toInputDate(today) };
    }
    case 'thisMonth':
      return { from: toInputDate(new Date(y, m, 1)), to: toInputDate(today) };
    case 'lastMonth':
      return { from: toInputDate(new Date(y, m - 1, 1)), to: toInputDate(new Date(y, m, 0)) };
    case 'fy': {
      // Indian financial year runs April → March
      const fyStartYear = m >= 3 ? y : y - 1;
      return { from: toInputDate(new Date(fyStartYear, 3, 1)), to: toInputDate(today) };
    }
    default:
      return { from: '', to: '' };
  }
};

const METHOD_LABELS = { cash: 'Cash', bank: 'Bank', upi: 'UPI', card: 'Card', credit: 'Credit', other: 'Other' };

const STAT_TONES = {
  emerald: { card: 'from-emerald-50 to-teal-50 border-emerald-200', icon: 'bg-emerald-600', value: 'text-emerald-700' },
  rose: { card: 'from-rose-50 to-pink-50 border-rose-200', icon: 'bg-rose-600', value: 'text-rose-700' },
  blue: { card: 'from-blue-50 to-indigo-50 border-blue-200', icon: 'bg-blue-600', value: 'text-blue-700' }
};

// ─── Small building blocks ───────────────────────────────────────────────────

function StatCard({ label, value, hint, icon: Icon, tone, loading }) {
  const t = STAT_TONES[tone];
  return (
    <div className={`rounded-xl border-2 bg-gradient-to-r p-3 md:px-4 md:py-4 ${t.card}`}>
      <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white md:h-11 md:w-11 ${t.icon}`}>
          <Icon className="h-5 w-5 md:h-6 md:w-6" />
        </span>
        <div className="min-w-0">
          <p className={`truncate text-lg font-bold leading-none md:text-2xl ${t.value}`}>{loading ? '…' : value}</p>
          <p className="mt-1 text-xs font-semibold text-slate-700 md:text-sm">{label}</p>
          <p className="hidden truncate text-xs text-slate-500 md:block">{hint}</p>
        </div>
      </div>
    </div>
  );
}

function BreakdownRow({ name, sub, amount, share, barClass }) {
  return (
    <li className="px-4 py-2.5 md:px-5">
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-800">{name}</p>
          {sub && <p className="text-xs text-slate-500">{sub}</p>}
        </div>
        <p className="shrink-0 text-sm font-semibold tabular-nums text-slate-800">{formatCurrency(amount)}</p>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${barClass}`} style={{ width: `${Math.max(share, 1)}%` }} />
      </div>
    </li>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Inbox className="h-6 w-6" />
      </span>
      <p className="font-semibold text-slate-800">{title}</p>
      <p className="text-sm text-slate-500">{text}</p>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ProfitLossReport() {
  const [preset, setPreset] = useState('thisMonth');
  const [range, setRange] = useState(() => getPresetRange('thisMonth'));
  const [includePurchases, setIncludePurchases] = useState(true);
  const [data, setData] = useState({ sales: { total: 0, count: 0, quantity: 0, byMaterial: [] }, expenses: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (range.from) params.append('fromDate', range.from);
        if (range.to) params.append('toDate', range.to);
        const response = await apiClient.get(`/reports/profit-loss?${params.toString()}`);
        if (cancelled) return;
        setData({
          sales: response?.sales || { total: 0, count: 0, quantity: 0, byMaterial: [] },
          expenses: Array.isArray(response?.expenses) ? response.expenses : []
        });
        setError('');
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Failed to load profit and loss report');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [range.from, range.to, reloadKey]);

  const selectPreset = (key) => {
    setPreset(key);
    setRange(getPresetRange(key));
  };

  const updateRange = (field, value) => {
    setPreset('custom');
    setRange((prev) => ({ ...prev, [field]: value }));
  };

  // Expenses that count toward the P&L, honouring the purchases toggle
  const costEntries = useMemo(
    () => data.expenses.filter((entry) => includePurchases || entry.kind !== 'purchase'),
    [data.expenses, includePurchases]
  );

  const totalSales = Number(data.sales.total || 0);
  const totalExpenses = costEntries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const netProfit = totalSales - totalExpenses;
  const isLoss = netProfit < 0;
  const margin = totalSales > 0 ? (netProfit / totalSales) * 100 : null;

  const expenseByCategory = useMemo(() => {
    const map = new Map();
    for (const entry of costEntries) {
      const parts = entry.splits?.length ? entry.splits : [{ category: entry.category, amount: entry.amount }];
      for (const part of parts) {
        const row = map.get(part.category) || { name: part.category, count: 0, amount: 0 };
        row.count += 1;
        row.amount += Number(part.amount || 0);
        map.set(part.category, row);
      }
    }
    return [...map.values()].sort((a, b) => b.amount - a.amount);
  }, [costEntries]);

  const categoryCounts = useMemo(() => costEntries.reduce((acc, entry) => {
    acc[entry.category] = (acc[entry.category] || 0) + 1;
    return acc;
  }, {}), [costEntries]);

  const q = searchQuery.trim().toLowerCase();
  const visibleExpenses = costEntries.filter((entry) => (
    (categoryFilter === 'All' || entry.category === categoryFilter) &&
    (!q || [entry.number, entry.category, entry.detail, entry.partyName, entry.notes, entry.method]
      .some((value) => String(value || '').toLowerCase().includes(q)))
  ));
  const visibleTotal = visibleExpenses.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);

  // Drop a stale category chip after the toggle or date range changes
  useEffect(() => {
    if (categoryFilter !== 'All' && !categoryCounts[categoryFilter]) setCategoryFilter('All');
  }, [categoryCounts, categoryFilter]);

  const periodLabel = range.from || range.to
    ? `${range.from ? formatDate(range.from) : 'Beginning'} – ${range.to ? formatDate(range.to) : 'Today'}`
    : 'All time';

  const purchaseCount = data.expenses.filter((entry) => entry.kind === 'purchase').length;

  return (
    <div className="min-h-screen bg-slate-100" style={{ fontFamily: "'Poppins', 'Inter', sans-serif" }}>
      <main className="mx-auto max-w-[95%] space-y-4 px-4 pt-4 pb-10 md:space-y-5">
        {/* Header */}
        <header className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">Profit &amp; Loss</h1>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500">
              <CalendarDays className="h-4 w-4" />
              {periodLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="inline-flex items-center gap-2 self-start rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 md:self-auto"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </header>

        {/* Filters */}
        <section className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200 md:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1 [&::-webkit-scrollbar]:hidden">
              {PRESETS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => selectPreset(p.key)}
                  className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-semibold transition ${preset === p.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                From
                <input
                  type="date"
                  value={range.from}
                  max={range.to || undefined}
                  onChange={(e) => updateRange('from', e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                />
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                To
                <input
                  type="date"
                  value={range.to}
                  min={range.from || undefined}
                  onChange={(e) => updateRange('to', e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                />
              </label>
            </div>
          </div>

          <label className="mt-3 inline-flex cursor-pointer items-center gap-2.5 text-sm text-slate-600">
            <button
              type="button"
              role="switch"
              aria-checked={includePurchases}
              onClick={() => setIncludePurchases((v) => !v)}
              className={`relative h-5 w-9 rounded-full transition ${includePurchases ? 'bg-blue-600' : 'bg-slate-300'}`}
            >
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${includePurchases ? 'left-[18px]' : 'left-0.5'}`} />
            </button>
            Count purchases as expenses
            {purchaseCount > 0 && <span className="text-xs text-slate-400">({purchaseCount} in this period)</span>}
          </label>
        </section>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>
        )}

        {/* Stats */}
        <section className="grid grid-cols-3 gap-2.5 md:gap-4">
          <StatCard
            label="Total Sales"
            value={formatCurrency(totalSales)}
            hint={`${data.sales.count} sales · ${formatTons(data.sales.quantity)}`}
            icon={TrendingUp}
            tone="emerald"
            loading={loading}
          />
          <StatCard
            label="Total Expenses"
            value={formatCurrency(totalExpenses)}
            hint={`${costEntries.length} entries`}
            icon={Wallet}
            tone="rose"
            loading={loading}
          />
          <StatCard
            label={isLoss ? 'Net Loss' : 'Net Profit'}
            value={formatCurrency(Math.abs(netProfit))}
            hint={margin === null ? 'Sales − Expenses' : `${margin.toFixed(1)}% margin`}
            icon={isLoss ? TrendingDown : Scale}
            tone={isLoss ? 'rose' : 'blue'}
            loading={loading}
          />
        </section>

        {/* Statement */}
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="border-b border-slate-100 px-4 py-3.5 md:px-5">
            <h2 className="text-base font-bold text-slate-900">Statement</h2>
            <p className="text-xs text-slate-500">Total sales − total expenses = net profit</p>
          </div>

          <div className="grid divide-y divide-slate-100 md:grid-cols-2 md:divide-x md:divide-y-0">
            {/* Income */}
            <div>
              <div className="flex items-center justify-between bg-slate-50 px-4 py-2.5 md:px-5">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Income · Sales by material</span>
              </div>
              {data.sales.byMaterial.length === 0 ? (
                <EmptyState title="No sales" text="No sales recorded in this period." />
              ) : (
                <ul className="divide-y divide-slate-50">
                  {data.sales.byMaterial.map((row) => (
                    <BreakdownRow
                      key={row.name}
                      name={row.name}
                      sub={`${row.count} sales · ${formatTons(row.quantity)}`}
                      amount={row.amount}
                      share={totalSales > 0 ? (row.amount / totalSales) * 100 : 0}
                      barClass="bg-emerald-500"
                    />
                  ))}
                </ul>
              )}
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 md:px-5">
                <span className="text-sm font-semibold text-slate-600">Total Sales</span>
                <span className="text-base font-bold tabular-nums text-emerald-700">{formatCurrency(totalSales)}</span>
              </div>
            </div>

            {/* Expenses */}
            <div>
              <div className="flex items-center justify-between bg-slate-50 px-4 py-2.5 md:px-5">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Expenses · By category</span>
              </div>
              {expenseByCategory.length === 0 ? (
                <EmptyState title="No expenses" text="No expenses recorded in this period." />
              ) : (
                <ul className="divide-y divide-slate-50">
                  {expenseByCategory.map((row) => (
                    <BreakdownRow
                      key={row.name}
                      name={row.name}
                      sub={`${row.count} ${row.count === 1 ? 'entry' : 'entries'}`}
                      amount={row.amount}
                      share={totalExpenses > 0 ? (row.amount / totalExpenses) * 100 : 0}
                      barClass="bg-rose-500"
                    />
                  ))}
                </ul>
              )}
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 md:px-5">
                <span className="text-sm font-semibold text-slate-600">Total Expenses</span>
                <span className="text-base font-bold tabular-nums text-rose-700">{formatCurrency(totalExpenses)}</span>
              </div>
            </div>
          </div>

          {/* Result line */}
          <div className={`flex flex-col gap-2 border-t-2 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-5 ${isLoss ? 'border-rose-200 bg-rose-50' : 'border-blue-200 bg-blue-50'}`}>
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-emerald-700">{formatCurrency(totalSales)}</span>
              <span className="mx-2 text-slate-400">−</span>
              <span className="font-semibold text-rose-700">{formatCurrency(totalExpenses)}</span>
              <span className="mx-2 text-slate-400">=</span>
            </p>
            <p className={`text-xl font-bold tabular-nums md:text-2xl ${isLoss ? 'text-rose-700' : 'text-blue-700'}`}>
              {isLoss ? 'Net Loss ' : 'Net Profit '}
              {formatCurrency(Math.abs(netProfit))}
            </p>
          </div>
        </section>

        {/* Expense list */}
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="border-b border-slate-100 px-4 py-3.5 md:px-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Expenses</h2>
                <p className="text-xs text-slate-500">Every expense counted in this report</p>
              </div>
              <label className="relative block md:w-72">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                  <Search className="h-4 w-4" />
                </span>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search party, category or note"
                  className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                />
              </label>
            </div>

            {costEntries.length > 0 && (
              <div className="mt-2.5 flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden">
                {['All', ...Object.keys(categoryCounts).sort()].map((category) => {
                  const active = categoryFilter === category;
                  const count = category === 'All' ? costEntries.length : categoryCounts[category];
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setCategoryFilter(category)}
                      className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition ${active ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
                    >
                      {category} <span className={active ? 'text-slate-300' : 'text-slate-400'}>{count}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex flex-col items-center gap-3 py-16">
              <div className="h-9 w-9 animate-spin rounded-full border-4 border-blue-600 border-r-transparent" />
              <p className="text-sm text-slate-400">Loading report…</p>
            </div>
          ) : visibleExpenses.length === 0 ? (
            <EmptyState
              title={q || categoryFilter !== 'All' ? 'No matching expenses' : 'No expenses in this period'}
              text={q || categoryFilter !== 'All' ? 'Try a different search or category.' : 'Pick another date range to see expenses.'}
            />
          ) : (
            <>
              {/* Desktop table */}
              <table className="hidden w-full text-left md:table">
                <thead>
                  <tr className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-2.5">Date</th>
                    <th className="px-5 py-2.5">Category</th>
                    <th className="px-5 py-2.5">Party</th>
                    <th className="px-5 py-2.5">Method</th>
                    <th className="px-5 py-2.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleExpenses.map((entry) => (
                    <tr key={`${entry.kind}-${entry._id}`} className="transition hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <p className="text-sm font-semibold text-slate-800">{formatDate(entry.date)}</p>
                        <p className="text-xs text-slate-400">{entry.number}</p>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${entry.kind === 'purchase' ? 'bg-amber-50 text-amber-600 ring-amber-200' : 'bg-rose-50 text-rose-600 ring-rose-200'}`}>
                            {entry.kind === 'purchase' ? <ShoppingCart className="h-4 w-4" /> : <ReceiptText className="h-4 w-4" />}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800">{entry.category}</p>
                            {(entry.detail || entry.notes) && (
                              <p className="max-w-[320px] truncate text-xs text-slate-500" title={entry.detail || entry.notes}>
                                {entry.detail || entry.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-700">{entry.partyName || '—'}</td>
                      <td className="px-5 py-3">
                        {entry.method ? (
                          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${entry.method === 'credit' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                            {METHOD_LABELS[entry.method] || entry.method}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-5 py-3 text-right text-sm font-bold tabular-nums text-slate-900">{formatCurrency(entry.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile list */}
              <ul className="divide-y divide-slate-100 md:hidden">
                {visibleExpenses.map((entry) => (
                  <li key={`${entry.kind}-${entry._id}`} className="flex items-center gap-3 px-4 py-3">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${entry.kind === 'purchase' ? 'bg-amber-50 text-amber-600 ring-amber-200' : 'bg-rose-50 text-rose-600 ring-rose-200'}`}>
                      {entry.kind === 'purchase' ? <ShoppingCart className="h-4 w-4" /> : <ReceiptText className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-800">{entry.category}</span>
                      <span className="block truncate text-xs text-slate-500">
                        {[entry.partyName, entry.detail || entry.notes].filter(Boolean).join(' · ') || entry.number}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-sm font-bold tabular-nums text-slate-900">{formatCurrency(entry.amount)}</span>
                      <span className="block text-[11px] text-slate-500">{formatDate(entry.date)}</span>
                    </span>
                  </li>
                ))}
              </ul>

              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500 md:px-5">
                <span>Showing {visibleExpenses.length} of {costEntries.length} expenses</span>
                <span className="font-semibold text-slate-700">Total {formatCurrency(visibleTotal)}</span>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
