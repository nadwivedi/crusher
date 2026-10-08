import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, Inbox, Package, Plus, RefreshCw, Search, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../utils/api';
import StatCard from '../components/StatCard';
import Segmented from '../components/Segmented';
import MaterialUsed from './MaterialUsed';

// How many materials the usage panel shows before "Show all"
const TOP_MATERIALS = 6;

const formatNumber = (value) => Number(value || 0).toLocaleString('en-IN', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});

const formatDate = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Local calendar date as YYYY-MM-DD ('' when the value is not a date)
const toDateKey = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

const entryCount = (count) => `${formatNumber(count)} entr${count === 1 ? 'y' : 'ies'}`;

const daysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

// `get` returns [from, to]; no `get` means every date
const RANGES = [
  { key: 'all', label: 'All' },
  { key: 'last7', label: 'Last 7 Days', shortLabel: '7 Days', get: () => [daysAgo(6), new Date()] },
  { key: 'last30', label: 'Last 30 Days', shortLabel: '30 Days', get: () => [daysAgo(29), new Date()] },
  {
    key: 'month',
    label: 'This Month',
    shortLabel: 'Month',
    get: () => {
      const now = new Date();
      return [new Date(now.getFullYear(), now.getMonth(), 1), new Date(now.getFullYear(), now.getMonth() + 1, 0)];
    }
  },
  {
    key: 'year',
    label: 'This Year',
    shortLabel: 'Year',
    get: () => {
      const year = new Date().getFullYear();
      return [new Date(year, 0, 1), new Date(year, 11, 31)];
    }
  },
  {
    key: 'last1Year',
    label: 'Last 1 Year',
    shortLabel: '1 Year',
    get: () => {
      const start = new Date();
      start.setFullYear(start.getFullYear() - 1);
      start.setDate(start.getDate() + 1);
      return [start, new Date()];
    }
  }
];

const rangeFor = (key) => {
  const preset = RANGES.find((range) => range.key === key);
  if (!preset?.get) return { from: '', to: '' };
  const [from, to] = preset.get();
  return { from: toDateKey(from), to: toDateKey(to) };
};

export default function MaterialUsedLedger() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [rangeKey, setRangeKey] = useState('all');
  const [showAllMaterials, setShowAllMaterials] = useState(false);
  const [showAddEntry, setShowAddEntry] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event) => {
      // With the entry popup open, Esc closes the popup instead of leaving the page.
      // defaultPrevented covers the popup's own Esc handler, which has already closed it by the time this runs.
      if (event.defaultPrevented) return;
      if (event.key === 'Escape' && !showAddEntry) {
        navigate('/');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, showAddEntry]);

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get('/material-used');
      const rows = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response)
        ? response
        : [];
      setEntries(rows);
    } catch (err) {
      setError(err.message || 'Error loading material used ledger');
    } finally {
      setLoading(false);
    }
  };

  const range = useMemo(() => rangeFor(rangeKey), [rangeKey]);

  const rows = useMemo(() => entries.map((entry) => {
    const usedOn = entry.usedDate || entry.createdAt;
    const material = entry.materialTypeName || entry.materialType?.name || '-';
    return {
      id: entry._id,
      dateKey: toDateKey(usedOn),
      date: formatDate(usedOn),
      material,
      materialKey: String(entry.materialType?._id || entry.materialType || material),
      vehicleNo: entry.vehicleNo || '',
      qty: Number(entry.usedQty || 0),
      unit: entry.unit || entry.materialType?.unit || '',
      notes: entry.notes || ''
    };
  }), [entries]);

  const filteredRows = useMemo(() => {
    const normalizedSearch = String(searchTerm || '').trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch = !normalizedSearch || [row.vehicleNo, row.material, row.notes]
        .some((value) => value.toLowerCase().includes(normalizedSearch));
      if (!matchesSearch) return false;

      if (range.from && (!row.dateKey || row.dateKey < range.from)) return false;
      if (range.to && (!row.dateKey || row.dateKey > range.to)) return false;

      return true;
    });
  }, [rows, searchTerm, range]);

  // One line per material, the most used first
  const usage = useMemo(() => {
    const byMaterial = new Map();
    filteredRows.forEach((row) => {
      const item = byMaterial.get(row.materialKey) || { key: row.materialKey, name: row.material, unit: row.unit, qty: 0, count: 0 };
      item.qty += row.qty;
      item.count += 1;
      byMaterial.set(row.materialKey, item);
    });

    const items = [...byMaterial.values()].sort((a, b) => b.qty - a.qty);
    // Litres and pieces cannot share one scale, so a bar is measured against the biggest material of its own unit
    const maxByUnit = {};
    items.forEach((item) => {
      maxByUnit[item.unit] = Math.max(maxByUnit[item.unit] || 0, item.qty);
    });

    return items.map((item) => ({ ...item, barWidth: maxByUnit[item.unit] ? (item.qty / maxByUnit[item.unit]) * 100 : 0 }));
  }, [filteredRows]);

  const handleCloseAdd = () => {
    setShowAddEntry(false);
    loadEntries();
  };

  const topMaterial = usage[0];
  const mixedUnits = new Set(usage.map((item) => item.unit)).size > 1;
  const visibleUsage = showAllMaterials ? usage : usage.slice(0, TOP_MATERIALS);
  const periodLabel = RANGES.find((item) => item.key === rangeKey)?.label;
  const periodText = range.from ? `${formatDate(range.from)} – ${formatDate(range.to)}` : 'All dates';

  const stats = [
    {
      icon: TrendingUp,
      label: 'Most Used',
      tone: 'emerald',
      value: topMaterial?.name || '-',
      hint: topMaterial ? `${formatNumber(topMaterial.qty)} ${topMaterial.unit} · ${entryCount(topMaterial.count)}` : 'No usage in this period'
    },
    { icon: ClipboardList, label: 'Entries', tone: 'blue', value: formatNumber(filteredRows.length), hint: periodLabel },
    { icon: Package, label: 'Materials', tone: 'indigo', value: formatNumber(usage.length), hint: 'Different materials used' }
  ];

  const qtyText = (row) => (
    <>
      {formatNumber(row.qty)}
      {row.unit && <span className="ml-1 text-xs font-medium text-slate-500">{row.unit}</span>}
    </>
  );

  return (
    <div className="page-fade-in space-y-4 px-3 pb-8 pt-4 md:space-y-5 lg:px-6 lg:pt-5">
      {showAddEntry && <MaterialUsed modalOnly onModalFinish={handleCloseAdd} />}

      <div className="page-header">
        <div className="min-w-0">
          <h1 className="page-title">Material Used Ledger</h1>
          <p className="page-subtitle">Consumed material · {periodText}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented options={RANGES} value={rangeKey} onChange={setRangeKey} />
          <button type="button" className="btn-primary" onClick={() => setShowAddEntry(true)}>
            <Plus size={18} /> Add Material Used
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div>
      )}

      {loading && entries.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-primary-600 border-r-transparent" />
          <p className="text-sm text-slate-400">Loading material used ledger…</p>
        </div>
      ) : (
        <div className={`space-y-4 transition-opacity md:space-y-5 ${loading ? 'pointer-events-none opacity-50' : ''}`}>
          {/* Phone: the most used material full width, the two counts side by side below */}
          <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:gap-4 [&>*:first-child]:col-span-2 sm:[&>*:first-child]:col-span-1">
            {stats.map((stat) => <StatCard key={stat.label} {...stat} />)}
          </section>

          {usage.length > 0 && (
            <section className="panel">
              <div className="panel-header flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Usage by Material</h2>
                  <p className="text-xs text-slate-500">
                    Most used first{mixedUnits ? ' · bars compare materials of the same unit' : ''}
                  </p>
                </div>
                <span className="badge-gray">{usage.length} material{usage.length === 1 ? '' : 's'}</span>
              </div>

              <ol className="grid gap-x-8 gap-y-4 p-4 md:grid-cols-2 md:p-5">
                {visibleUsage.map((item, index) => (
                  <li key={item.key} className="min-w-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-800">
                        <span className="w-4 shrink-0 text-xs font-bold text-slate-400">{index + 1}</span>
                        <span className="truncate" title={item.name}>{item.name}</span>
                        {index === 0 && <span className="badge-green shrink-0">Most used</span>}
                      </p>
                      <p className="shrink-0 whitespace-nowrap text-sm font-bold text-slate-900">{qtyText(item)}</p>
                    </div>
                    <div className="mt-1.5 flex items-center gap-3 pl-6">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${index === 0 ? 'bg-emerald-500' : 'bg-primary-600'}`}
                          style={{ width: `${Math.max(item.barWidth, 2)}%` }}
                        />
                      </div>
                      <span className="w-20 shrink-0 text-right text-xs text-slate-500">{entryCount(item.count)}</span>
                    </div>
                  </li>
                ))}
              </ol>

              {usage.length > TOP_MATERIALS && (
                <button
                  type="button"
                  className="w-full border-t border-slate-100 px-4 py-2.5 text-xs font-semibold text-primary-700 transition hover:bg-slate-50"
                  onClick={() => setShowAllMaterials((showAll) => !showAll)}
                >
                  {showAllMaterials ? `Show top ${TOP_MATERIALS} only` : `Show all ${usage.length} materials`}
                </button>
              )}
            </section>
          )}

          <section className="panel">
            <div className="panel-header flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Entries</h2>
                <p className="text-xs text-slate-500">{periodLabel} · newest first</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1 md:w-64 md:flex-none">
                  <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    className="input pl-9"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search material, vehicle, notes..."
                  />
                </div>
                <button type="button" className="icon-btn" title="Refresh" aria-label="Refresh" onClick={loadEntries}>
                  <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {filteredRows.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <Inbox size={22} />
                </span>
                <p className="text-sm font-semibold text-slate-800">No material used entries found</p>
                <p className="text-xs text-slate-500">
                  {entries.length === 0 ? 'Add the first entry with "Add Material Used".' : 'Try changing the search or the period.'}
                </p>
              </div>
            ) : (
              <>
                {/* Phone: one compact block per entry */}
                <ul className="divide-y divide-slate-100 md:hidden">
                  {filteredRows.map((row) => (
                    <li key={row.id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-800">{row.material}</p>
                          <p className="mt-0.5 text-xs text-slate-500">{row.date}{row.vehicleNo ? ` · ${row.vehicleNo}` : ''}</p>
                        </div>
                        <p className="shrink-0 whitespace-nowrap text-base font-bold text-slate-900">{qtyText(row)}</p>
                      </div>
                      {row.notes && <p className="mt-1.5 text-xs text-slate-500">{row.notes}</p>}
                    </li>
                  ))}
                </ul>

                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[720px] text-left">
                    <thead>
                      <tr>
                        <th className="tbl-head">Date</th>
                        <th className="tbl-head">Material</th>
                        <th className="tbl-head">Vehicle</th>
                        <th className="tbl-head">Notes</th>
                        <th className="tbl-head text-right">Used Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.map((row) => (
                        <tr key={row.id} className="tbl-row">
                          <td className="tbl-cell whitespace-nowrap">{row.date}</td>
                          <td className="tbl-cell font-semibold text-slate-800">{row.material}</td>
                          <td className="tbl-cell whitespace-nowrap">
                            {row.vehicleNo ? <span className="badge-gray">{row.vehicleNo}</span> : '-'}
                          </td>
                          <td className="tbl-cell text-slate-500">
                            <div className="max-w-[18rem] truncate" title={row.notes || undefined}>{row.notes || '-'}</div>
                          </td>
                          <td className="tbl-cell whitespace-nowrap text-right font-bold text-slate-900">{qtyText(row)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p className="border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500 md:px-5">
                  Showing {entryCount(filteredRows.length)}
                </p>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
