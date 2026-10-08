import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mountain, FileText, Wallet, TrendingUp, TrendingDown, Layers, HandCoins, Send } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import apiClient from '../utils/api';
import StatCard from '../components/StatCard';
import Segmented from '../components/Segmented';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
const fmtNum = (n) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n || 0);
const fmtSigned = (n) => `${n < 0 ? '− ' : ''}${fmt(Math.abs(n))}`;
const toTons = (kg) => Number(kg || 0) / 1000;
// Sizes read as "20mm"; named materials (dust, wmm, gsb) read better in capitals
const formatMaterial = (name) => (/^\d/.test(name) ? name : String(name || '-').toUpperCase());
const fmtShortAmount = (v) => {
  if (v >= 100000) return `₹${fmtNum(v / 100000)}L`;
  if (v >= 1000) return `₹${fmtNum(v / 1000)}K`;
  return `₹${v}`;
};
const percentOf = (part, total) => (total > 0 ? (part / total) * 100 : 0);

// key = the API's trend / breakdown key, stat = the API's totals key
const PERIODS = [
  { key: '7d', stat: 'last7Days', label: 'Last 7 Days', shortLabel: '7 Days' },
  { key: '30d', stat: 'last30Days', label: 'Last 30 Days', shortLabel: '30 Days' },
  { key: '90d', stat: 'last90Days', label: 'Last 90 Days', shortLabel: '90 Days' },
  { key: 'thisYear', stat: 'thisYear', label: 'This Year', shortLabel: 'Year' },
  { key: 'lifetime', stat: 'lifetime', label: 'All Time', shortLabel: 'All' },
];
const COMPARE_COLUMNS = [{ stat: 'today', label: 'Today' }, ...PERIODS];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// "2026 Jan" -> a running month number, so all-time points can be put in order
const monthIndex = (label) => {
  const [year, month] = label.split(' ');
  return Number(year) * 12 + MONTHS.indexOf(month);
};

/** Joins the boulder, sales and expense trends of one period into chart rows keyed by date label. */
const buildTrend = (data, periodKey) => {
  const series = {
    boulderTons: (data?.boulders?.trends?.[periodKey] || []).map((point) => ({ ...point, amount: toTons(point.amount) })),
    sales: data?.sales?.revenue?.trends?.[periodKey] || [],
    expenses: data?.expenses?.trends?.[periodKey] || [],
  };
  const rows = new Map();
  const rowFor = (date) => {
    if (!rows.has(date)) rows.set(date, { date, boulderTons: 0, sales: 0, expenses: 0 });
    return rows.get(date);
  };

  // All-time trends only list months that have entries, and differ per series: lay out every month in between first
  if (periodKey === 'lifetime') {
    const indexes = Object.values(series).flat().map((point) => monthIndex(point.date));
    if (indexes.length > 0) {
      for (let i = Math.min(...indexes); i <= Math.max(...indexes); i += 1) rowFor(`${Math.floor(i / 12)} ${MONTHS[i % 12]}`);
    }
  }

  Object.entries(series).forEach(([field, points]) => points.forEach((point) => { rowFor(point.date)[field] = point.amount; }));
  return [...rows.values()];
};

// Shared chart styling
const AXIS_TICK = { fontSize: 11, fill: '#64748b' };
const TOOLTIP_STYLE = { borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -12px rgba(15,23,42,0.25)', fontSize: 12 };
const CHART_BLUE = '#2563eb';
const CHART_GREEN = '#10b981';
const CHART_AMBER = '#f59e0b';

const VISIBLE_ROWS = 6;
const BREAKDOWN_ROW = 'block px-4 py-3 md:px-5';

/**
 * Ranked list panel: each row is a name, an amount and a bar for its share of the total.
 * rows: [{ key, label, value, hint, share (0-100), to? }] — rows with `to` are links.
 */
function BreakdownPanel({ title, subtitle, total, rows, barClass, icon: Icon, emptyTitle, emptyText }) {
  const [showAll, setShowAll] = useState(false);
  const visibleRows = showAll ? rows : rows.slice(0, VISIBLE_ROWS);

  return (
    <section className="panel">
      <div className="panel-header flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
        <p className="shrink-0 whitespace-nowrap text-base font-bold text-slate-900">{total}</p>
      </div>

      {rows.length > 0 ? (
        <>
          <ul className="divide-y divide-slate-100">
            {visibleRows.map((row) => {
              const body = (
                <>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="truncate text-sm font-semibold text-slate-800">{row.label}</p>
                    <p className="shrink-0 whitespace-nowrap text-sm font-semibold text-slate-900">{row.value}</p>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${barClass}`} style={{ width: `${Math.min(100, Math.max(0, row.share))}%` }} />
                  </div>
                  <p className="mt-1 truncate text-[11px] text-slate-500">{row.hint}</p>
                </>
              );
              return (
                <li key={row.key}>
                  {row.to
                    ? <Link to={row.to} className={`${BREAKDOWN_ROW} transition hover:bg-slate-50`}>{body}</Link>
                    : <div className={BREAKDOWN_ROW}>{body}</div>}
                </li>
              );
            })}
          </ul>
          {rows.length > VISIBLE_ROWS && (
            <button
              type="button"
              onClick={() => setShowAll(!showAll)}
              className="w-full border-t border-slate-100 px-4 py-2.5 text-xs font-semibold text-primary-700 transition hover:bg-slate-50"
            >
              {showAll ? 'Show less' : `Show all ${rows.length}`}
            </button>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <Icon size={22} />
          </span>
          <p className="text-sm font-semibold text-slate-800">{emptyTitle}</p>
          <p className="text-xs text-slate-500">{emptyText}</p>
        </div>
      )}
    </section>
  );
}

export default function Analytics() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [periodKey, setPeriodKey] = useState('30d');

  useEffect(() => {
    apiClient.get('/reports/dashboard-analytics')
      .then((response) => {
        setData(response || {});
        setError('');
      })
      .catch((err) => setError(err?.message || 'Unable to load analytics'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        navigate(-1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  const period = PERIODS.find((p) => p.key === periodKey);
  const byMonth = periodKey === 'thisYear' || periodKey === 'lifetime';
  const trendText = byMonth ? 'by month' : 'by day';
  const trend = buildTrend(data, periodKey);
  // All-time labels arrive as "2026 Jan"
  const dateLabel = (label) => (periodKey === 'lifetime' ? String(label).split(' ').reverse().join(' ') : label);
  const lineDot = trend.length <= 31 ? { r: 3 } : false;

  const salesAmountFor = (stat) => data?.sales?.revenue?.[stat] || 0;
  const expensesFor = (stat) => data?.expenses?.[stat] || 0;
  const netFor = (stat) => salesAmountFor(stat) - expensesFor(stat);

  const salesAmount = salesAmountFor(period.stat);
  const expenseAmount = expensesFor(period.stat);
  const net = netFor(period.stat);
  const outstanding = data?.outstanding || {};

  const kpis = [
    {
      icon: Mountain, label: 'Boulder Crushed', tone: 'blue',
      value: `${fmtNum(toTons(data?.boulders?.[period.stat]))} tons`,
      hint: period.label
    },
    {
      icon: FileText, label: 'Sales', tone: 'emerald',
      value: fmt(salesAmount),
      hint: `${fmtNum(toTons(data?.sales?.totals?.[period.stat]))} tons sold · ${period.label}`
    },
    {
      icon: Wallet, label: 'Expenses', tone: 'amber',
      value: fmt(expenseAmount),
      hint: period.label
    },
    {
      icon: net >= 0 ? TrendingUp : TrendingDown, label: 'Sales − Expenses', tone: net >= 0 ? 'teal' : 'rose',
      value: fmtSigned(net),
      hint: salesAmount > 0 ? `${fmtNum(Math.round(percentOf(net, salesAmount)))}% of sales · ${period.label}` : period.label
    },
  ];

  const materialRows = [...(data?.sales?.breakdowns?.[periodKey] || [])]
    .sort((a, b) => b.amount - a.amount)
    .map((row) => {
      const share = percentOf(row.amount, salesAmount);
      return {
        key: row.size,
        label: formatMaterial(row.size),
        value: fmt(row.amount),
        hint: `${fmtNum(toTons(row.quantity))} tons · ${fmtNum(Math.round(share))}% of sales`,
        share
      };
    });

  const expenseRows = (data?.expenses?.breakdowns?.[periodKey] || []).map((row) => {
    const share = percentOf(row.amount, expenseAmount);
    return {
      key: row.name,
      label: row.name,
      value: fmt(row.amount),
      hint: `${fmtNum(Math.round(share))}% of expenses`,
      share
    };
  });

  const partyRows = (parties, total, totalName) => (parties || []).map((party) => {
    const share = percentOf(party.balance, total);
    return {
      key: party.id,
      label: party.name,
      value: fmt(party.balance),
      hint: `${fmtNum(Math.round(share))}% of ${totalName}`,
      share,
      to: `/party/${party.id}`
    };
  });

  const comparisonRows = [
    { label: 'Boulder crushed', value: (stat) => `${fmtNum(toTons(data?.boulders?.[stat]))} tons` },
    { label: 'Material sold', value: (stat) => `${fmtNum(toTons(data?.sales?.totals?.[stat]))} tons` },
    { label: 'Sales', value: (stat) => fmt(salesAmountFor(stat)) },
    { label: 'Expenses', value: (stat) => fmt(expensesFor(stat)) },
    {
      label: 'Sales − Expenses', strong: true,
      value: (stat) => fmtSigned(netFor(stat)),
      tone: (stat) => (netFor(stat) >= 0 ? 'text-emerald-700' : 'text-rose-700')
    },
  ];

  return (
    <div className="page-fade-in space-y-4 px-3 pb-8 pt-4 md:space-y-5 lg:px-6 lg:pt-5">
      {/* Header + period filter: one period drives every section below */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Production, sales and expenses · {period.label}</p>
        </div>
        <Segmented options={PERIODS} value={periodKey} onChange={setPeriodKey} />
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-primary-600 border-r-transparent" />
          <p className="text-sm text-slate-400">Loading analytics…</p>
        </div>
      ) : data && (
        <>
          {/* KPI cards */}
          <section className="grid grid-cols-2 gap-2.5 md:gap-4 xl:grid-cols-4">
            {kpis.map((kpi) => <StatCard key={kpi.label} {...kpi} />)}
          </section>

          {/* Trends */}
          <div className="grid grid-cols-1 gap-4 md:gap-5 lg:grid-cols-2">
            <section className="panel">
              <div className="panel-header">
                <h3 className="text-sm font-bold text-slate-900">Boulder Crushed</h3>
                <p className="text-xs text-slate-500">Tons {trendText} · {period.label}</p>
              </div>
              <div className="p-3 md:p-4">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="date" tick={AXIS_TICK} tickFormatter={dateLabel} axisLine={false} tickLine={false} minTickGap={16} />
                    <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={44} />
                    <Tooltip
                      cursor={{ fill: '#f1f5f9' }}
                      contentStyle={TOOLTIP_STYLE}
                      formatter={(v) => [`${fmtNum(v)} tons`, 'Boulder']}
                      labelFormatter={dateLabel}
                    />
                    <Bar dataKey="boulderTons" fill={CHART_BLUE} radius={[4, 4, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="panel">
              <div className="panel-header">
                <h3 className="text-sm font-bold text-slate-900">Sales vs Expenses</h3>
                <p className="text-xs text-slate-500">Amount {trendText} · {period.label}</p>
              </div>
              <div className="p-3 md:p-4">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="date" tick={AXIS_TICK} tickFormatter={dateLabel} axisLine={false} tickLine={false} minTickGap={16} />
                    <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={52} tickFormatter={fmtShortAmount} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, n) => [fmt(v), n]} labelFormatter={dateLabel} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="sales" stroke={CHART_GREEN} strokeWidth={2} dot={lineDot} name="Sales" />
                    <Line type="monotone" dataKey="expenses" stroke={CHART_AMBER} strokeWidth={2} dot={lineDot} name="Expenses" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          {/* Where the sales and the expenses come from */}
          <div className="grid grid-cols-1 items-start gap-4 md:gap-5 lg:grid-cols-2">
            <BreakdownPanel
              title="Sales by Material"
              subtitle={`Amount and quantity sold · ${period.label}`}
              total={fmt(salesAmount)}
              rows={materialRows}
              barClass="bg-emerald-500"
              icon={Layers}
              emptyTitle="No sales in this period"
              emptyText="Material-wise totals appear here once a sale is added."
            />
            <BreakdownPanel
              title="Expenses by Type"
              subtitle={`Where the money went · ${period.label}`}
              total={fmt(expenseAmount)}
              rows={expenseRows}
              barClass="bg-amber-500"
              icon={Wallet}
              emptyTitle="No expenses in this period"
              emptyText="Expense types appear here once an expense is added."
            />
          </div>

          {/* Outstanding balances (as of today, not tied to the period) */}
          <div className="grid grid-cols-1 items-start gap-4 md:gap-5 lg:grid-cols-2">
            <BreakdownPanel
              title="To Receive"
              subtitle="Parties that owe you the most · as of today"
              total={fmt(outstanding.totalReceivables)}
              rows={partyRows(outstanding.topDebtors, outstanding.totalReceivables, 'receivables')}
              barClass="bg-teal-500"
              icon={HandCoins}
              emptyTitle="Nothing to receive"
              emptyText="No party owes you money right now."
            />
            <BreakdownPanel
              title="To Pay"
              subtitle="Parties you owe the most · as of today"
              total={fmt(outstanding.totalPayables)}
              rows={partyRows(outstanding.topCreditors, outstanding.totalPayables, 'payables')}
              barClass="bg-rose-500"
              icon={Send}
              emptyTitle="Nothing to pay"
              emptyText="You do not owe any party right now."
            />
          </div>

          {/* Period comparison */}
          <section className="panel">
            <div className="panel-header">
              <h3 className="text-sm font-bold text-slate-900">Period Comparison</h3>
              <p className="text-xs text-slate-500">The same totals side by side for every period</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left">
                <thead>
                  <tr>
                    {/* First column stays put while the periods scroll sideways on phones */}
                    <th className="tbl-head sticky left-0" />
                    {COMPARE_COLUMNS.map((column) => (
                      <th key={column.stat} className={`tbl-head text-right ${column.stat === period.stat ? 'bg-primary-50 text-primary-700' : ''}`}>
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row) => (
                    <tr key={row.label} className={row.strong ? 'border-t border-slate-200 bg-slate-50' : 'tbl-row bg-white'}>
                      <td className={`tbl-cell sticky left-0 whitespace-nowrap bg-inherit ${row.strong ? 'font-bold text-slate-900' : 'font-semibold text-slate-800'}`}>{row.label}</td>
                      {COMPARE_COLUMNS.map((column) => (
                        <td
                          key={column.stat}
                          className={`tbl-cell whitespace-nowrap text-right ${row.strong ? 'font-bold' : ''} ${row.tone ? row.tone(column.stat) : ''} ${column.stat === period.stat ? 'bg-primary-50/60' : ''}`}
                        >
                          {row.value(column.stat)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
