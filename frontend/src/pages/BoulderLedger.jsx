import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Eye, Pencil, RefreshCw, Search, Trash2, Truck, Inbox, X, Mountain } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../utils/api';
import { useAuth } from '../context/AuthContext';
import BoulderEntry from './BoulderEntry/BoulderEntry';
import CustomRangePopup, { toLocalDateInput, formatRangeLabel } from '../components/CustomRangePopup';
import MonthPickerPopup, { getMonthRange, formatMonthLabel } from '../components/MonthPickerPopup';

const formatNumber = (value) => Number(value || 0).toLocaleString('en-IN', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});

const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString('en-IN', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
})}`;

const formatDate = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const parseWeightFromMethod = (method, label) => {
  const match = String(method || '').match(new RegExp(`${label}\\s+(\\d+(?:\\.\\d+)?)`, 'i'));
  return match ? Number(match[1]) : 0;
};

const normalizeFallbackEntry = (entry) => ({
  _id: entry.refId || `${entry.voucherNumber}-${entry.date}`,
  boulderDate: entry.date || entry.entryCreatedAt,
  createdAt: entry.entryCreatedAt || entry.date,
  vehicleNo: entry.voucherNumber || entry.partyName || '-',
  partyName: entry.partyName || '',
  entryTime: entry.entryTime || '',
  exitTime: entry.exitTime || '',
  grossWeight: parseWeightFromMethod(entry.method, 'Gross'),
  tareWeight: parseWeightFromMethod(entry.method, 'Tare'),
  netWeight: parseWeightFromMethod(entry.method, 'Net'),
  boulderRatePerTon: Number(entry.boulderRatePerTon || 0),
  amount: Number(entry.amount || 0),
  slipImg: ''
});

const isBulkEntry = (entry) => entry?.entryMode === 'bulk';

const getEntryTrips = (entry) => (isBulkEntry(entry) ? Number(entry.tripCount || 0) : 1);

const formatTon = (kg) => formatNumber(Number(kg || 0) / 1000);

const getBulkSummary = (entry) => (
  `${formatNumber(entry.tripCount)} trips × ${formatTon(entry.averageWeight)} T`
);

// Local calendar day (toISOString would shift early-morning IST times to the previous day)
const toDayKey = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return toLocalDateInput(date);
};

const getEntryDayKey = (entry) => toDayKey(entry.boulderDate || entry.createdAt);

const daysAgoKey = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return toDayKey(date);
};

const resolvePresetRange = (preset) => {
  const now = new Date();
  const today = toDayKey(now);

  if (preset === 'today') return { fromDate: today, toDate: today };
  if (preset === 'last7') return { fromDate: daysAgoKey(6), toDate: today };
  if (preset === 'last30') return { fromDate: daysAgoKey(29), toDate: today };
  if (preset === 'last1Year') {
    const start = new Date(now);
    start.setFullYear(start.getFullYear() - 1);
    start.setDate(start.getDate() + 1);
    return { fromDate: toDayKey(start), toDate: today };
  }
  if (preset === 'yearWise') {
    return { fromDate: toDayKey(new Date(now.getFullYear(), 0, 1)), toDate: toDayKey(new Date(now.getFullYear(), 11, 31)) };
  }
  return { fromDate: '', toDate: '' };
};

const PRESETS = [
  { key: '', label: 'All' },
  { key: 'today', label: 'Today' },
  { key: 'last7', label: '7 Days' },
  { key: 'last30', label: '30 Days' },
  { key: 'monthWise', label: 'Month' },
  { key: 'last1Year', label: '12 Months' },
  { key: 'yearWise', label: 'This Year' },
  { key: 'custom', label: 'Custom' }
];

const emptyTotals = () => ({ count: 0, trips: 0, grossWeight: 0, tareWeight: 0, netWeight: 0, amount: 0 });

const addToTotals = (acc, entry) => {
  acc.count += 1;
  acc.trips += getEntryTrips(entry);
  acc.grossWeight += Number(entry.grossWeight || 0);
  acc.tareWeight += Number(entry.tareWeight || 0);
  acc.netWeight += Number(entry.netWeight || 0);
  acc.amount += Number(entry.amount || 0);
  return acc;
};

// Gross on top, tare below, net (the result) last — all in one cell
function WeightStack({ entry, align = 'right' }) {
  const bulk = isBulkEntry(entry);
  return (
    <div className={`flex ${align === 'left' ? 'justify-start' : 'justify-end'}`}>
      <div className="inline-grid min-w-[170px] grid-cols-[auto_1fr] gap-x-3 text-sm tabular-nums">
        <span className="text-xs text-slate-400">Gross</span>
        <span className="text-right text-slate-600">{bulk ? '—' : `${formatNumber(entry.grossWeight)} kg`}</span>
        <span className="text-xs text-slate-400">Tare</span>
        <span className="text-right text-slate-600">{bulk ? '—' : `${formatNumber(entry.tareWeight)} kg`}</span>
        <span className="mt-0.5 border-t border-slate-200 pt-0.5 text-xs font-semibold text-emerald-700">Net</span>
        <span className="mt-0.5 border-t border-slate-200 pt-0.5 text-right font-bold text-emerald-700">
          {formatNumber(entry.netWeight)} kg
          <span className="ml-1.5 text-xs font-semibold text-emerald-600">({formatTon(entry.netWeight)} T)</span>
        </span>
      </div>
    </div>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Inbox className="h-6 w-6" />
      </span>
      <p className="font-semibold text-slate-800">{title}</p>
      <p className="text-sm text-slate-500">{text}</p>
    </div>
  );
}

export default function BoulderLedger() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canDeleteBoulders = user?.role !== 'employee' && (user?.role === 'owner' || user?.permissions?.edit);
  const [boulders, setBoulders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [datePreset, setDatePreset] = useState('');
  const [{ fromDate, toDate }, setDateRange] = useState({ fromDate: '', toDate: '' });
  const [editingEntry, setEditingEntry] = useState(null);
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth()));
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const rangeBeforeCustomRef = useRef({ preset: '', range: { fromDate: '', toDate: '' } });

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !showCustomPicker && !showMonthPicker) {
        navigate('/');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, showCustomPicker, showMonthPicker]);

  useEffect(() => {
    loadBoulders();
  }, []);

  const loadBoulders = async () => {
    setLoading(true);
    setError('');
    try {
      try {
        const response = await apiClient.get('/boulders');
        setBoulders(Array.isArray(response) ? response : []);
      } catch (routeError) {
        if (routeError?.message !== 'Cannot GET /api/boulders' && routeError?.status !== 404) {
          throw routeError;
        }

        const fallbackResponse = await apiClient.get('/reports/day-book');
        const fallbackEntries = Array.isArray(fallbackResponse?.entries)
          ? fallbackResponse.entries
              .filter((item) => item.type === 'boulder')
              .map(normalizeFallbackEntry)
          : [];

        setBoulders(fallbackEntries);
      }
    } catch (err) {
      setError(err.message || 'Error loading boulder ledger');
    } finally {
      setLoading(false);
    }
  };

  // ─── "Boulder crushed" snapshot, independent of the filters below ───────────
  const snapshot = useMemo(() => {
    const now = new Date();
    const today = toDayKey(now);
    const periods = [
      { key: 'today', label: 'Today', from: today },
      { key: 'last7', label: 'Last 7 Days', from: daysAgoKey(6) },
      { key: 'last30', label: 'Last 30 Days', from: daysAgoKey(29) },
      { key: 'thisMonth', label: 'This Month', from: toDayKey(new Date(now.getFullYear(), now.getMonth(), 1)) },
      { key: 'yearWise', label: 'This Year', from: toDayKey(new Date(now.getFullYear(), 0, 1)) }
    ].map((period) => ({ ...period, totals: emptyTotals() }));

    for (const entry of boulders) {
      const day = getEntryDayKey(entry);
      if (!day || day > today) continue;
      for (const period of periods) {
        if (day >= period.from) addToTotals(period.totals, entry);
      }
    }
    return periods;
  }, [boulders]);

  // ─── Entries in the selected period (search / vehicle applied after) ────────
  const periodBoulders = useMemo(() => boulders.filter((entry) => {
    const day = getEntryDayKey(entry);
    if (!day) return false;
    if (fromDate && day < fromDate) return false;
    if (toDate && day > toDate) return false;
    return true;
  }), [boulders, fromDate, toDate]);

  const vehicleSummary = useMemo(() => {
    const map = new Map();
    for (const entry of periodBoulders) {
      const vehicleNo = String(entry.vehicleNo || '-').toUpperCase();
      const row = map.get(vehicleNo) || { vehicleNo, parties: new Set(), lastDate: null, ...emptyTotals() };
      addToTotals(row, entry);
      const party = String(entry.partyName || '').trim();
      if (party) row.parties.add(party);
      const date = new Date(entry.boulderDate || entry.createdAt);
      if (!row.lastDate || date > row.lastDate) row.lastDate = date;
      map.set(vehicleNo, row);
    }
    return [...map.values()]
      .map((row) => ({ ...row, parties: [...row.parties] }))
      .sort((a, b) => b.netWeight - a.netWeight);
  }, [periodBoulders]);

  const filteredBoulders = useMemo(() => {
    const normalizedSearch = String(searchTerm || '').trim().toLowerCase();
    return periodBoulders.filter((entry) => {
      if (vehicleFilter && String(entry.vehicleNo || '').toUpperCase() !== vehicleFilter) return false;
      if (!normalizedSearch) return true;
      return String(entry.vehicleNo || '').toLowerCase().includes(normalizedSearch)
        || String(entry.partyName || '').toLowerCase().includes(normalizedSearch);
    });
  }, [periodBoulders, searchTerm, vehicleFilter]);

  const periodTotals = useMemo(() => periodBoulders.reduce(addToTotals, emptyTotals()), [periodBoulders]);
  const listTotals = useMemo(() => filteredBoulders.reduce(addToTotals, emptyTotals()), [filteredBoulders]);

  // Drop the vehicle filter if that vehicle has no entries in the new period
  useEffect(() => {
    if (vehicleFilter && !vehicleSummary.some((row) => row.vehicleNo === vehicleFilter)) setVehicleFilter('');
  }, [vehicleSummary, vehicleFilter]);

  const periodLabel = (() => {
    if (datePreset === 'monthWise') return formatMonthLabel(selectedMonth, selectedYear);
    if (datePreset === 'custom') return formatRangeLabel(fromDate, toDate);
    if (!fromDate && !toDate) return 'All time';
    if (fromDate === toDate) return formatDate(fromDate);
    return `${formatDate(fromDate)} – ${formatDate(toDate)}`;
  })();

  const handlePresetChange = (value) => {
    if (value === 'monthWise') {
      if (datePreset !== 'monthWise') rangeBeforeCustomRef.current = { preset: datePreset, range: { fromDate, toDate } };
      setDatePreset('monthWise');
      setShowMonthPicker(true);
      return;
    }

    if (value === 'custom') {
      if (datePreset !== 'custom') rangeBeforeCustomRef.current = { preset: datePreset, range: { fromDate, toDate } };
      setDatePreset('custom');
      setShowCustomPicker(true);
      return;
    }

    const resolvedRange = resolvePresetRange(value);
    rangeBeforeCustomRef.current = { preset: value, range: resolvedRange };
    setDatePreset(value);
    setDateRange(resolvedRange);
  };

  const closeMonthPicker = () => {
    setShowMonthPicker(false);
    // Cancelled straight after choosing "Month": go back to the previous filter.
    if (rangeBeforeCustomRef.current.preset !== 'monthWise') {
      setDatePreset(rangeBeforeCustomRef.current.preset);
      setDateRange(rangeBeforeCustomRef.current.range);
    }
  };

  const applyMonth = (month, year) => {
    const bounds = getMonthRange(month, year);
    const range = { fromDate: bounds.from, toDate: bounds.to };
    setSelectedMonth(month);
    setSelectedYear(year);
    setDatePreset('monthWise');
    setDateRange(range);
    rangeBeforeCustomRef.current = { preset: 'monthWise', range };
    setShowMonthPicker(false);
  };

  const closeCustomPicker = () => {
    setShowCustomPicker(false);
    // Cancelled straight after choosing "Custom": go back to the previous filter.
    if (rangeBeforeCustomRef.current.preset !== 'custom') {
      setDatePreset(rangeBeforeCustomRef.current.preset);
      setDateRange(rangeBeforeCustomRef.current.range);
    }
  };

  const applyCustomRange = (from, to) => {
    setDatePreset('custom');
    setDateRange({ fromDate: from, toDate: to });
    rangeBeforeCustomRef.current = { preset: 'custom', range: { fromDate: from, toDate: to } };
    setShowCustomPicker(false);
  };

  // Snapshot cards double as quick filters
  const selectSnapshot = (key) => {
    if (key === 'thisMonth') {
      const now = new Date();
      applyMonth(String(now.getMonth()), String(now.getFullYear()));
      return;
    }
    handlePresetChange(key);
  };

  const isSnapshotActive = (key) => {
    if (key !== 'thisMonth') return datePreset === key;
    const now = new Date();
    return datePreset === 'monthWise' && selectedMonth === String(now.getMonth()) && selectedYear === String(now.getFullYear());
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this boulder entry?')) return;

    try {
      await apiClient.delete(`/boulders/${id}`);
      await loadBoulders();
    } catch (err) {
      setError(err.message || 'Error deleting boulder entry');
    }
  };

  const handleCloseEdit = () => {
    setEditingEntry(null);
    loadBoulders();
  };

  const getPartyDisplayName = (entry) => String(entry?.partyName || '').trim() || '—';

  const maxVehicleWeight = vehicleSummary[0]?.netWeight || 0;

  return (
    <div className="min-h-screen bg-slate-100" style={{ fontFamily: "'Poppins', 'Inter', sans-serif" }}>
      {showMonthPicker && (
        <MonthPickerPopup
          month={selectedMonth}
          year={selectedYear}
          subtitle="Choose the year, then the month to view boulder entries"
          onApply={applyMonth}
          onClose={closeMonthPicker}
        />
      )}
      {showCustomPicker && (
        <CustomRangePopup from={fromDate} to={toDate} onApply={applyCustomRange} onClose={closeCustomPicker} />
      )}
      {editingEntry && <BoulderEntry editingEntry={editingEntry} onModalFinish={handleCloseEdit} />}

      <main className="mx-auto max-w-[95%] space-y-4 px-4 pt-4 pb-10 md:space-y-5">
        {/* Header */}
        <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">Boulder Ledger</h1>
            <p className="mt-0.5 text-sm text-slate-500">Boulder received for crushing, by period and by vehicle</p>
          </div>
          <button
            type="button"
            onClick={loadBoulders}
            className="inline-flex items-center gap-2 self-start rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 md:self-auto"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </header>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>
        )}

        {/* Boulder crushed snapshot */}
        <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:gap-3 lg:grid-cols-5">
          {snapshot.map((period, index) => {
            const active = isSnapshotActive(period.key);
            const highlight = index === 0;
            return (
              <button
                key={period.key}
                type="button"
                onClick={() => selectSnapshot(period.key)}
                className={`rounded-xl border-2 p-3 text-left transition hover:shadow-md md:px-4 md:py-3.5 ${
                  highlight ? 'border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50' : 'border-slate-200 bg-white'
                } ${active ? 'ring-2 ring-slate-400 ring-offset-2' : ''} ${index === 0 ? 'col-span-2 sm:col-span-1' : ''}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-600 md:text-sm">{period.label}</p>
                  {highlight && (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white">
                      <Mountain className="h-4 w-4" />
                    </span>
                  )}
                </div>
                <p className={`mt-1.5 text-xl font-bold leading-none tabular-nums md:text-2xl ${highlight ? 'text-emerald-700' : 'text-slate-900'}`}>
                  {loading ? '…' : formatTon(period.totals.netWeight)}
                  <span className="ml-1 text-sm font-semibold text-slate-400">T</span>
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {formatNumber(period.totals.trips)} trips · {formatNumber(period.totals.count)} entries
                </p>
              </button>
            );
          })}
        </section>

        {/* Filters */}
        <section className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200 md:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1 [&::-webkit-scrollbar]:hidden">
              {PRESETS.map((p) => (
                <button
                  key={p.key || 'all'}
                  type="button"
                  onClick={() => handlePresetChange(p.key)}
                  className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-semibold transition ${datePreset === p.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <p className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
              <CalendarDays className="h-4 w-4 text-slate-400" />
              {periodLabel}
            </p>
          </div>

          {/* Period totals */}
          <dl className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-slate-200 ring-1 ring-slate-200 sm:grid-cols-4">
            {[
              { label: 'Net Boulder', value: `${formatTon(periodTotals.netWeight)} T`, tone: 'text-emerald-700' },
              { label: 'Trips', value: formatNumber(periodTotals.trips), tone: 'text-slate-900' },
              { label: 'Vehicles', value: formatNumber(vehicleSummary.length), tone: 'text-slate-900' },
              { label: 'Amount', value: formatCurrency(periodTotals.amount), tone: 'text-rose-700' }
            ].map((stat) => (
              <div key={stat.label} className="bg-white px-3 py-2.5 md:px-4">
                <dt className="text-xs font-medium text-slate-500">{stat.label}</dt>
                <dd className={`mt-0.5 text-base font-bold tabular-nums md:text-lg ${stat.tone}`}>{loading ? '…' : stat.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Vehicle-wise */}
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="border-b border-slate-100 px-4 py-3.5 md:px-5">
            <h2 className="text-base font-bold text-slate-900">Vehicle-wise Boulder</h2>
            <p className="text-xs text-slate-500">How much boulder each vehicle brought in {periodLabel.toLowerCase() === 'all time' ? 'overall' : 'this period'} · tap a vehicle to see its entries</p>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-r-transparent" />
            </div>
          ) : vehicleSummary.length === 0 ? (
            <EmptyState title="No vehicles" text="No boulder came in during this period." />
          ) : (
            <>
              <table className="hidden w-full text-left md:table">
                <thead>
                  <tr className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="w-12 px-5 py-2.5">#</th>
                    <th className="px-5 py-2.5">Vehicle</th>
                    <th className="px-5 py-2.5 text-right">Trips</th>
                    <th className="px-5 py-2.5">Net Boulder</th>
                    <th className="px-5 py-2.5 text-right">Amount</th>
                    <th className="px-5 py-2.5 text-right">Last Trip</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vehicleSummary.map((row, index) => {
                    const selected = vehicleFilter === row.vehicleNo;
                    const share = periodTotals.netWeight > 0 ? (row.netWeight / periodTotals.netWeight) * 100 : 0;
                    return (
                      <tr
                        key={row.vehicleNo}
                        onClick={() => setVehicleFilter(selected ? '' : row.vehicleNo)}
                        className={`cursor-pointer transition ${selected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                      >
                        <td className="px-5 py-3 text-sm font-semibold text-slate-400">{index + 1}</td>
                        <td className="px-5 py-3">
                          <span className="inline-block rounded-md border-2 border-slate-800 bg-amber-300 px-2 py-0.5 font-mono text-xs font-bold tracking-widest text-slate-900">
                            {row.vehicleNo}
                          </span>
                          <p className="mt-1 max-w-[260px] truncate text-xs text-slate-500" title={row.parties.join(', ')}>
                            {row.parties.join(', ') || '—'}
                          </p>
                        </td>
                        <td className="px-5 py-3 text-right text-sm font-semibold tabular-nums text-slate-700">{formatNumber(row.trips)}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <span className="w-24 shrink-0 text-sm font-bold tabular-nums text-emerald-700">{formatTon(row.netWeight)} T</span>
                            <div className="h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-slate-100">
                              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${maxVehicleWeight > 0 ? Math.max((row.netWeight / maxVehicleWeight) * 100, 2) : 0}%` }} />
                            </div>
                            <span className="w-12 shrink-0 text-right text-xs text-slate-400">{share.toFixed(0)}%</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-right text-sm font-semibold tabular-nums text-slate-700">{formatCurrency(row.amount)}</td>
                        <td className="px-5 py-3 text-right text-sm text-slate-500">{formatDate(row.lastDate)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <ul className="divide-y divide-slate-100 md:hidden">
                {vehicleSummary.map((row) => {
                  const selected = vehicleFilter === row.vehicleNo;
                  return (
                    <li key={row.vehicleNo}>
                      <button
                        type="button"
                        onClick={() => setVehicleFilter(selected ? '' : row.vehicleNo)}
                        className={`w-full px-4 py-3 text-left ${selected ? 'bg-blue-50' : 'active:bg-slate-50'}`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="inline-block rounded border-2 border-slate-800 bg-amber-300 px-1.5 font-mono text-[11px] font-bold tracking-wider text-slate-900">
                            {row.vehicleNo}
                          </span>
                          <span className="text-sm font-bold tabular-nums text-emerald-700">{formatTon(row.netWeight)} T</span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${maxVehicleWeight > 0 ? Math.max((row.netWeight / maxVehicleWeight) * 100, 2) : 0}%` }} />
                        </div>
                        <p className="mt-1 truncate text-xs text-slate-500">
                          {formatNumber(row.trips)} trips · {formatCurrency(row.amount)}{row.parties.length ? ` · ${row.parties.join(', ')}` : ''}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>

        {/* Entries */}
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="border-b border-slate-100 px-4 py-3.5 md:px-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Entries</h2>
                <p className="text-xs text-slate-500">Every boulder slip in this period</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                {vehicleFilter && (
                  <button
                    type="button"
                    onClick={() => setVehicleFilter('')}
                    className="inline-flex items-center gap-1.5 self-start rounded-full border border-slate-800 bg-slate-800 px-3 py-1 text-xs font-semibold text-white"
                  >
                    {vehicleFilter}
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                <label className="relative block md:w-72">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                    <Search className="h-4 w-4" />
                  </span>
                  <input
                    type="search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search vehicle or party"
                    className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                  />
                </label>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center gap-3 py-16">
              <div className="h-9 w-9 animate-spin rounded-full border-4 border-blue-600 border-r-transparent" />
              <p className="text-sm text-slate-400">Loading boulder ledger…</p>
            </div>
          ) : filteredBoulders.length === 0 ? (
            <EmptyState title="No boulder entries found" text="Try changing the search or date filter." />
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[960px] text-left">
                  <thead>
                    <tr className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-2.5">Date</th>
                      <th className="px-5 py-2.5">Vehicle &amp; Party</th>
                      <th className="px-5 py-2.5 text-right">Weight</th>
                      <th className="px-5 py-2.5 text-right">Rate / T</th>
                      <th className="px-5 py-2.5 text-right">Amount</th>
                      <th className="px-5 py-2.5 text-right" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredBoulders.map((entry) => (
                      <tr key={entry._id} className="transition hover:bg-slate-50">
                        <td className="px-5 py-3">
                          <p className="text-sm font-semibold text-slate-800">{formatDate(entry.boulderDate || entry.createdAt)}</p>
                          {(entry.entryTime || entry.exitTime) && (
                            <p className="text-xs text-slate-400">{entry.entryTime || '--'} → {entry.exitTime || '--'}</p>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <span className="inline-block rounded-md border-2 border-slate-800 bg-amber-300 px-2 py-0.5 font-mono text-xs font-bold tracking-widest text-slate-900">
                              {entry.vehicleNo || '-'}
                            </span>
                            {isBulkEntry(entry) && (
                              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200">
                                Bulk · {getBulkSummary(entry)}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 max-w-[280px] truncate text-xs text-slate-500">{getPartyDisplayName(entry)}</p>
                        </td>
                        <td className="px-5 py-3">
                          <WeightStack entry={entry} />
                        </td>
                        <td className="px-5 py-3 text-right text-sm tabular-nums text-slate-600">{formatCurrency(entry.boulderRatePerTon)}</td>
                        <td className="px-5 py-3 text-right text-sm font-bold tabular-nums text-slate-900">{formatCurrency(entry.amount)}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            {entry.slipImg && (
                              <a
                                href={entry.slipImg}
                                target="_blank"
                                rel="noreferrer"
                                title="View slip"
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-blue-300 hover:text-blue-700"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                Slip
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => setEditingEntry(entry)}
                              title="Edit"
                              className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 shadow-sm transition hover:border-blue-300 hover:text-blue-700"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            {canDeleteBoulders && (
                              <button
                                type="button"
                                onClick={() => handleDelete(entry._id)}
                                title="Delete"
                                className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 shadow-sm transition hover:border-rose-300 hover:text-rose-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile list */}
              <ul className="divide-y divide-slate-100 md:hidden">
                {filteredBoulders.map((entry) => (
                  <li key={entry._id} className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-200">
                        <Truck className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="inline-block rounded border-2 border-slate-800 bg-amber-300 px-1.5 font-mono text-[11px] font-bold tracking-wider text-slate-900">
                          {entry.vehicleNo || '-'}
                        </span>
                        <p className="mt-0.5 truncate text-xs text-slate-500">{getPartyDisplayName(entry)}</p>
                        {isBulkEntry(entry) && (
                          <p className="text-[11px] font-semibold text-indigo-700">Bulk · {getBulkSummary(entry)}</p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-bold tabular-nums text-slate-900">{formatCurrency(entry.amount)}</p>
                        <p className="text-[11px] text-slate-400">{formatDate(entry.boulderDate || entry.createdAt)}</p>
                      </div>
                    </div>
                    <div className="mt-2 ml-12">
                      <WeightStack entry={entry} align="left" />
                    </div>
                    <div className="mt-2 flex items-center justify-end gap-1.5">
                      {entry.slipImg && (
                        <a href={entry.slipImg} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          <Eye className="h-3.5 w-3.5" /> Slip
                        </a>
                      )}
                      <button type="button" onClick={() => setEditingEntry(entry)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </button>
                      {canDeleteBoulders && (
                        <button type="button" onClick={() => handleDelete(entry._id)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-rose-600">
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>

              <div className="flex flex-col gap-1 border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between md:px-5">
                <span>Showing {filteredBoulders.length} of {periodBoulders.length} entries</span>
                <span className="font-semibold text-slate-700">
                  {formatNumber(listTotals.trips)} trips · {formatTon(listTotals.netWeight)} T · {formatCurrency(listTotals.amount)}
                </span>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
