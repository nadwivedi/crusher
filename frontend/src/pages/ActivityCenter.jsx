import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, FileText, Gauge, HandCoins, Mountain,
  PackageMinus, RefreshCw, RotateCcw, Search, Send, ShoppingCart, SlidersHorizontal, Truck, Undo2, Wallet
} from 'lucide-react';
import apiClient from '../utils/api';
import StatCard from '../components/StatCard';
import Segmented from '../components/Segmented';

const fmtMoney = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const fmtNum = (n) => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const fmtTons = (kg) => `${fmtNum(Number(kg || 0) / 1000)} ton`;

// Local calendar date as YYYY-MM-DD
const toDateKey = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};
const daysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};
const formatDayKey = (key, options = { day: 'numeric', month: 'short', year: 'numeric' }) => {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-GB', options);
};
const formatTime = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
};

const RANGES = [
  { key: 'today', label: 'Today', get: () => [new Date(), new Date()] },
  { key: 'yesterday', label: 'Yesterday', get: () => [daysAgo(1), daysAgo(1)] },
  { key: 'last7', label: 'Last 7 Days', shortLabel: '7 Days', get: () => [daysAgo(6), new Date()] },
  { key: 'last30', label: 'Last 30 Days', shortLabel: '30 Days', get: () => [daysAgo(29), new Date()] },
  { key: 'custom', label: 'Custom' }
];

// How each kind of entry is shown in the list. sign: '+' money in, '-' money out, '' neither.
const TYPES = {
  sale: { label: 'Sale', icon: FileText, tile: 'bg-emerald-50 text-emerald-700 ring-emerald-100', value: 'text-slate-800', sign: '' },
  boulder: { label: 'Boulder', icon: Mountain, tile: 'bg-blue-50 text-blue-700 ring-blue-100', value: 'text-slate-800', sign: '' },
  purchase: { label: 'Purchase', icon: ShoppingCart, tile: 'bg-violet-50 text-violet-700 ring-violet-100', value: 'text-slate-800', sign: '' },
  receipt: { label: 'Money Received', icon: HandCoins, tile: 'bg-teal-50 text-teal-700 ring-teal-100', value: 'text-emerald-700', sign: '+' },
  payment: { label: 'Money Paid', icon: Send, tile: 'bg-rose-50 text-rose-700 ring-rose-100', value: 'text-rose-600', sign: '-' },
  expense: { label: 'Expense', icon: Wallet, tile: 'bg-amber-50 text-amber-700 ring-amber-100', value: 'text-rose-600', sign: '-' },
  materialUsed: { label: 'Material Used', icon: PackageMinus, tile: 'bg-indigo-50 text-indigo-700 ring-indigo-100', value: 'text-indigo-700', sign: '' },
  meterReading: { label: 'Meter Reading', icon: Gauge, tile: 'bg-slate-100 text-slate-700 ring-slate-200', value: 'text-slate-800', sign: '' },
  dumpIn: { label: 'To Dump', icon: ArrowUpFromLine, tile: 'bg-orange-50 text-orange-700 ring-orange-100', value: 'text-slate-800', sign: '' },
  dumpOut: { label: 'Dump to Hopper', icon: ArrowDownToLine, tile: 'bg-sky-50 text-sky-700 ring-sky-100', value: 'text-slate-800', sign: '' },
  saleReturn: { label: 'Sale Return', icon: RotateCcw, tile: 'bg-emerald-50 text-emerald-700 ring-emerald-100', value: 'text-rose-600', sign: '-' },
  purchaseReturn: { label: 'Purchase Return', icon: Undo2, tile: 'bg-pink-50 text-pink-700 ring-pink-100', value: 'text-emerald-700', sign: '+' },
  stockAdjustment: { label: 'Stock Adjustment', icon: SlidersHorizontal, tile: 'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-100', value: 'text-slate-800', sign: '' },
  transfer: { label: 'Cash / Bank Transfer', icon: ArrowLeftRight, tile: 'bg-cyan-50 text-cyan-700 ring-cyan-100', value: 'text-slate-800', sign: '' },
  transport: { label: 'Transport', icon: Truck, tile: 'bg-lime-50 text-lime-700 ring-lime-100', value: 'text-slate-800', sign: '' }
};

const valueText = (item) => {
  const type = TYPES[item.type];
  if (item.amount !== undefined) {
    const sign = item.type === 'transport' ? (item.direction === 'payable' ? '-' : '+') : type.sign;
    return `${sign === '+' ? '+ ' : sign === '-' ? '− ' : ''}${fmtMoney(item.amount)}`;
  }
  if (item.qty === null || item.qty === undefined) return item.type === 'meterReading' ? 'Running' : '';
  const prefix = item.type === 'stockAdjustment' && item.qty > 0 ? '+ ' : '';
  return `${prefix}${fmtNum(item.qty)}${item.unit ? ` ${item.unit}` : ''}`;
};

const dayHeading = (key) => {
  if (key === toDateKey(new Date())) return 'Today';
  if (key === toDateKey(daysAgo(1))) return 'Yesterday';
  return formatDayKey(key, { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
};

export default function ActivityCenter() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rangeKey, setRangeKey] = useState('last7');
  const [range, setRange] = useState(() => ({ from: toDateKey(daysAgo(6)), to: toDateKey(new Date()) }));
  const [custom, setCustom] = useState(range);
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let live = true;
    apiClient.get('/reports/activity', { params: range })
      .then((response) => {
        if (!live) return;
        setData(response);
        setError('');
      })
      .catch((err) => live && setError(err.message || 'Failed to load activity'))
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [range, reloadKey]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.defaultPrevented || event.key !== 'Escape') return;
      navigate('/');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  const reload = () => {
    setLoading(true);
    setReloadKey((key) => key + 1);
  };

  const selectRange = (key) => {
    setRangeKey(key);
    const preset = RANGES.find((item) => item.key === key);
    if (preset?.get) {
      const [from, to] = preset.get();
      setLoading(true);
      setRange({ from: toDateKey(from), to: toDateKey(to) });
    } else {
      setCustom(range);
    }
  };

  const customValid = custom.from && custom.to && custom.from <= custom.to;
  const applyCustom = () => {
    if (!customValid) return;
    setLoading(true);
    setRange({ ...custom });
  };

  const items = data?.items || [];
  const q = search.trim().toLowerCase();
  const searched = items.filter((item) => !q || `${item.title} ${item.detail} ${TYPES[item.type]?.label}`.toLowerCase().includes(q));
  const visible = searched.filter((item) => !typeFilter || item.type === typeFilter);
  const typeCounts = searched.reduce((acc, item) => ({ ...acc, [item.type]: (acc[item.type] || 0) + 1 }), {});
  // Only the kinds that happened in this period get a filter chip (and the picked one, so it can be cleared)
  const presentTypes = Object.keys(TYPES).filter((type) => typeCounts[type] || type === typeFilter);

  // Group by calendar day, keeping the newest-first order
  const days = [];
  visible.forEach((item) => {
    const key = toDateKey(item.date);
    const last = days[days.length - 1];
    if (last?.key === key) last.items.push(item);
    else days.push({ key, items: [item] });
  });

  const totals = data?.totals || {};
  const periodText = range.from === range.to
    ? formatDayKey(range.from)
    : `${formatDayKey(range.from)} – ${formatDayKey(range.to)}`;

  return (
    <div className="page-fade-in space-y-4 px-3 pb-8 pt-4 md:space-y-5 lg:px-6 lg:pt-5">
      <div className="page-header">
        <div className="min-w-0">
          <h1 className="page-title">Activity Center</h1>
          <p className="page-subtitle">Every entry of the crusher in one place · {periodText}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented options={RANGES} value={rangeKey} onChange={selectRange} />
          <button type="button" className="icon-btn" title="Refresh" aria-label="Refresh" onClick={reload}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {rangeKey === 'custom' && (
        <div className="panel flex flex-wrap items-end gap-3 p-3 md:p-4">
          <div>
            <label className="label">From</label>
            <input type="date" className="input" value={custom.from} max={custom.to || undefined}
              onChange={(event) => setCustom({ ...custom, from: event.target.value })} />
          </div>
          <div>
            <label className="label">To</label>
            <input type="date" className="input" value={custom.to} min={custom.from || undefined}
              onChange={(event) => setCustom({ ...custom, to: event.target.value })} />
          </div>
          <button type="button" className="btn-primary" onClick={applyCustom} disabled={!customValid}>Apply</button>
          {!customValid && <p className="pb-2 text-xs font-medium text-rose-600">"From" date must be on or before "To" date</p>}
        </div>
      )}

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div>}

      <section className="grid grid-cols-2 gap-2.5 md:gap-4 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard icon={FileText} tone="emerald" label="Sales" value={fmtMoney(totals.sales)} hint={totals.salesKg ? fmtTons(totals.salesKg) : undefined} />
        <StatCard icon={Mountain} tone="blue" label="Boulder In" value={fmtTons(totals.boulderKg)} />
        <StatCard icon={HandCoins} tone="teal" label="Money Received" value={fmtMoney(totals.received)} />
        <StatCard icon={Send} tone="rose" label="Money Paid" value={fmtMoney(totals.paid)} hint={totals.purchases ? `Purchases ${fmtMoney(totals.purchases)}` : undefined} />
        <StatCard icon={Wallet} tone="amber" label="Expenses" value={fmtMoney(totals.expenses)} />
      </section>

      <section className="panel">
        <div className="panel-header">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="scrollbar-hide flex gap-2 overflow-x-auto">
              {['', ...presentTypes].map((type) => {
                const active = typeFilter === type;
                const count = type ? typeCounts[type] || 0 : searched.length;
                return (
                  <button
                    key={type || 'all'}
                    type="button"
                    onClick={() => setTypeFilter(type)}
                    className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition ${active ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
                  >
                    {type ? TYPES[type].label : 'All'}{' '}
                    <span className={active ? 'text-slate-300' : 'text-slate-400'}>{count}</span>
                  </button>
                );
              })}
            </div>
            <div className="relative lg:w-64 lg:shrink-0">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="input pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search party, vehicle, item..." />
            </div>
          </div>
        </div>

        {loading && !data ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="h-9 w-9 animate-spin rounded-full border-4 border-primary-600 border-r-transparent" />
            <p className="text-sm text-slate-400">Loading activity…</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Activity size={22} />
            </span>
            <p className="text-sm font-semibold text-slate-800">No activity found</p>
            <p className="max-w-md text-xs text-slate-500">{q || typeFilter ? 'Try a different search or filter.' : 'Nothing was recorded in this period.'}</p>
          </div>
        ) : (
          <div className={`transition-opacity ${loading ? 'pointer-events-none opacity-50' : ''}`}>
            {days.map((day) => (
              <div key={day.key}>
                <p className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 md:px-5">
                  {dayHeading(day.key)}
                  <span className="ml-2 font-medium normal-case tracking-normal text-slate-400">{day.items.length} {day.items.length === 1 ? 'entry' : 'entries'}</span>
                </p>
                <ul className="divide-y divide-slate-100">
                  {day.items.map((item) => {
                    const type = TYPES[item.type];
                    const TypeIcon = type.icon;
                    return (
                      <li key={`${item.type}-${item.id}`} className="flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50 md:px-5">
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${type.tile}`}>
                          <TypeIcon size={18} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-800">
                            {item.title}
                            <span className="ml-2 text-xs font-medium text-slate-400">{type.label}</span>
                          </p>
                          <p className="truncate text-xs text-slate-500" title={item.detail}>{item.detail || '—'}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className={`whitespace-nowrap text-sm font-bold ${type.value}`}>{valueText(item)}</p>
                          <p className="text-[11px] text-slate-400">{formatTime(item.createdAt)}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
        {items.length > 0 && <p className="border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500 md:px-5">Showing {visible.length} of {items.length} entries</p>}
      </section>
    </div>
  );
}
