import { useEffect, useMemo, useRef, useState } from 'react';
import { ClipboardList, Eye, Inbox, IndianRupee, Mountain, Pencil, Plus, RefreshCw, Repeat, Search, Trash2, Truck, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../utils/api';
import { useAuth } from '../context/AuthContext';
import StatCard from '../components/StatCard';
import Segmented from '../components/Segmented';
import BoulderEntry from './BoulderEntry/BoulderEntry';
import CustomRangePopup, { toLocalDateInput, formatRangeLabel } from '../components/CustomRangePopup';
import MonthPickerPopup, { getMonthRange, formatMonthLabel } from '../components/MonthPickerPopup';

// The two views of the data panel
const TABS = [
  { key: 'entries', label: 'Entries', icon: ClipboardList },
  { key: 'vehicles', label: 'Vehicle-wise', icon: Truck }
];

// Table cells a little tighter than the app default, so every column fits without scrolling
const TH = 'tbl-head px-3 py-2 first:pl-5 last:pr-5';
const TD = 'tbl-cell px-3 py-2 first:pl-5 last:pr-5';

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

const entryCount = (count) => `${formatNumber(count)} entr${count === 1 ? 'y' : 'ies'}`;

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
  { key: 'last1Year', label: '12 Months', shortLabel: '12 Mo' },
  { key: 'yearWise', label: 'This Year', shortLabel: 'Year' },
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

/** Vehicle number as a small monospace chip. */
function Plate({ children }) {
  return (
    <span className="inline-block max-w-full truncate rounded-md bg-slate-100 px-2 py-0.5 align-middle font-mono text-xs font-semibold tracking-wide text-slate-800 ring-1 ring-inset ring-slate-200">
      {children}
    </span>
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
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [tab, setTab] = useState('entries');
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth()));
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const rangeBeforeCustomRef = useRef({ preset: '', range: { fromDate: '', toDate: '' } });

  useEffect(() => {
    const handleKeyDown = (event) => {
      // With an entry popup open, Esc closes the popup instead of leaving the page.
      // defaultPrevented covers the popup's own Esc handler, which has already closed it by the time this runs.
      if (event.defaultPrevented) return;
      if (event.key === 'Escape' && !showCustomPicker && !showMonthPicker && !showAddEntry && !editingEntry) {
        navigate('/');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, showCustomPicker, showMonthPicker, showAddEntry, editingEntry]);

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

  const handleCloseAdd = () => {
    setShowAddEntry(false);
    loadBoulders();
  };

  const getPartyDisplayName = (entry) => String(entry?.partyName || '').trim() || '—';

  const maxVehicleWeight = vehicleSummary[0]?.netWeight || 0;
  const periodTons = periodTotals.netWeight / 1000;
  const initialLoading = loading && boulders.length === 0;

  // Picking a vehicle in the vehicle-wise list opens its entries
  const openVehicle = (vehicleNo) => {
    setVehicleFilter(vehicleNo);
    setTab('entries');
  };

  const stats = [
    { icon: Mountain, label: 'Net Boulder', tone: 'emerald', value: `${formatTon(periodTotals.netWeight)} tons`, hint: `${formatNumber(periodTotals.netWeight)} kg` },
    { icon: Repeat, label: 'Trips', tone: 'blue', value: formatNumber(periodTotals.trips), hint: entryCount(periodTotals.count) },
    {
      icon: Truck, label: 'Vehicles', tone: 'indigo',
      value: formatNumber(vehicleSummary.length),
      hint: vehicleSummary[0] ? `Most: ${vehicleSummary[0].vehicleNo}` : 'No vehicles'
    },
    {
      icon: IndianRupee, label: 'Amount', tone: 'rose',
      value: formatCurrency(periodTotals.amount),
      hint: periodTons > 0 ? `${formatCurrency(periodTotals.amount / periodTons)} per ton` : 'No boulder'
    }
  ];

  const renderActions = (entry) => (
    <div className="flex items-center justify-end">
      {entry.slipImg && (
        <a href={entry.slipImg} target="_blank" rel="noreferrer" title="View slip" aria-label="View slip" className="icon-btn inline-flex p-1.5 hover:bg-blue-50 hover:text-blue-600">
          <Eye size={16} />
        </a>
      )}
      <button type="button" title="Edit" aria-label="Edit" className="icon-btn p-1.5 hover:bg-blue-50 hover:text-blue-600" onClick={() => setEditingEntry(entry)}>
        <Pencil size={16} />
      </button>
      {canDeleteBoulders && (
        <button type="button" title="Delete" aria-label="Delete" className="icon-btn p-1.5 hover:bg-rose-50 hover:text-rose-600" onClick={() => handleDelete(entry._id)}>
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );

  const renderEmpty = (title, text) => (
    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Inbox size={20} />
      </span>
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <p className="text-xs text-slate-500">{text}</p>
    </div>
  );

  const vehicleBar = (row) => (
    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${maxVehicleWeight > 0 ? Math.max((row.netWeight / maxVehicleWeight) * 100, 2) : 0}%` }} />
    </div>
  );

  return (
    <div className="page-fade-in space-y-3.5 px-3 pb-6 pt-3.5 md:space-y-4 lg:px-6 lg:pt-4">
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
      {showAddEntry && <BoulderEntry onModalFinish={handleCloseAdd} />}

      {/* The page is three blocks: period filter, the period's totals, then one panel with the data */}
      <div className="page-header gap-2.5">
        <div className="min-w-0">
          <h1 className="page-title">Boulder Ledger</h1>
          <p className="page-subtitle">Boulder received for crushing · {periodLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented options={PRESETS} value={datePreset} onChange={handlePresetChange} />
          <button type="button" className="btn-primary" onClick={() => setShowAddEntry(true)}>
            <Plus size={18} /> Add Boulder
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700">{error}</div>
      )}

      {initialLoading ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-primary-600 border-r-transparent" />
          <p className="text-sm text-slate-400">Loading boulder ledger…</p>
        </div>
      ) : (
        <div className={`space-y-3.5 transition-opacity md:space-y-4 ${loading ? 'pointer-events-none opacity-50' : ''}`}>
          <section className="grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-4">
            {stats.map((stat) => <StatCard key={stat.label} compact {...stat} />)}
          </section>

          <section className="panel">
            <div className="panel-header py-2.5 flex flex-wrap items-center justify-between gap-2.5">
              <Segmented options={TABS} value={tab} onChange={setTab} />
              <div className="flex min-w-0 flex-1 basis-56 items-center justify-end gap-2">
                {tab === 'entries' && vehicleFilter && (
                  <button
                    type="button"
                    onClick={() => setVehicleFilter('')}
                    title="Show all vehicles"
                    className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-primary-700"
                  >
                    {vehicleFilter}
                    <X size={14} />
                  </button>
                )}
                {tab === 'entries' && (
                  <div className="relative min-w-0 flex-1 md:max-w-64">
                    <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="search"
                      className="input pl-9"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search vehicle or party"
                    />
                  </div>
                )}
                <button type="button" className="icon-btn shrink-0" title="Refresh" aria-label="Refresh" onClick={loadBoulders}>
                  <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {tab === 'entries' && (filteredBoulders.length === 0
              ? renderEmpty('No boulder entries found', boulders.length === 0 ? 'Add the first entry with "Add Boulder".' : 'Try changing the search or the period.')
              : (
                <>
                  {/* Phone: three short lines per entry */}
                  <ul className="divide-y divide-slate-100 md:hidden">
                    {filteredBoulders.map((entry) => (
                      <li key={entry._id} className="px-4 py-2.5">
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="min-w-0 truncate text-sm font-semibold text-slate-800">{getPartyDisplayName(entry)}</p>
                          <p className="shrink-0 text-sm font-bold text-slate-900">{formatCurrency(entry.amount)}</p>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-2">
                            <Plate>{entry.vehicleNo || '-'}</Plate>
                            {isBulkEntry(entry) && <span className="badge-blue shrink-0">Bulk</span>}
                            <span className="shrink-0 text-xs text-slate-500">{formatDate(entry.boulderDate || entry.createdAt)}</span>
                          </div>
                          <p className="shrink-0 text-sm font-bold text-emerald-700">{formatTon(entry.netWeight)} T</p>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="min-w-0 truncate text-[11px] text-slate-400">
                            {isBulkEntry(entry)
                              ? getBulkSummary(entry)
                              : `Gross ${formatNumber(entry.grossWeight)} · Tare ${formatNumber(entry.tareWeight)} kg`}
                            {' · '}{formatCurrency(entry.boulderRatePerTon)}/T
                          </p>
                          {renderActions(entry)}
                        </div>
                      </li>
                    ))}
                  </ul>

                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[800px] text-left">
                      <thead>
                        <tr>
                          <th className={TH}>Date</th>
                          <th className={TH}>Party / Vehicle</th>
                          <th className={`${TH} text-right`}>Gross (kg)</th>
                          <th className={`${TH} text-right`}>Tare (kg)</th>
                          <th className={`${TH} text-right`}>Net (kg)</th>
                          <th className={`${TH} text-right`}>Rate / T</th>
                          <th className={`${TH} text-right`}>Amount</th>
                          <th className={TH} />
                        </tr>
                      </thead>
                      <tbody>
                        {filteredBoulders.map((entry) => (
                          <tr key={entry._id} className="tbl-row">
                            <td className={`${TD} whitespace-nowrap`}>
                              {formatDate(entry.boulderDate || entry.createdAt)}
                              {(entry.entryTime || entry.exitTime) && (
                                <span className="block text-[11px] leading-tight text-slate-400">{entry.entryTime || '--'} → {entry.exitTime || '--'}</span>
                              )}
                            </td>
                            <td className={TD}>
                              <p className="max-w-[18rem] truncate font-semibold text-slate-800" title={entry.partyName || undefined}>{getPartyDisplayName(entry)}</p>
                              <Plate>{entry.vehicleNo || '-'}</Plate>
                            </td>
                            {isBulkEntry(entry) ? (
                              // A bulk entry has no weighbridge slip: its trips fill the gross / tare columns
                              <td className={`${TD} whitespace-nowrap text-right text-xs text-slate-500`} colSpan={2}>
                                <span className="badge-blue mr-1.5">Bulk</span>
                                {getBulkSummary(entry)}
                              </td>
                            ) : (
                              <>
                                <td className={`${TD} text-right`}>{formatNumber(entry.grossWeight)}</td>
                                <td className={`${TD} text-right`}>{formatNumber(entry.tareWeight)}</td>
                              </>
                            )}
                            <td className={`${TD} text-right font-bold text-emerald-700`}>{formatNumber(entry.netWeight)}</td>
                            <td className={`${TD} whitespace-nowrap text-right`}>{formatCurrency(entry.boulderRatePerTon)}</td>
                            <td className={`${TD} whitespace-nowrap text-right font-bold text-slate-900`}>{formatCurrency(entry.amount)}</td>
                            <td className={`${TD} py-1!`}>{renderActions(entry)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-slate-200 bg-slate-50">
                          <td className={`${TD} font-bold text-slate-900`} colSpan={2}>
                            Total
                            <span className="ml-2 text-xs font-medium text-slate-500">
                              {formatNumber(listTotals.trips)} trips · {formatTon(listTotals.netWeight)} T
                            </span>
                          </td>
                          <td className={`${TD} text-right font-semibold text-slate-800`}>{formatNumber(listTotals.grossWeight)}</td>
                          <td className={`${TD} text-right font-semibold text-slate-800`}>{formatNumber(listTotals.tareWeight)}</td>
                          <td className={`${TD} text-right font-bold text-emerald-700`}>{formatNumber(listTotals.netWeight)}</td>
                          <td className={TD} />
                          <td className={`${TD} whitespace-nowrap text-right font-bold text-slate-900`}>{formatCurrency(listTotals.amount)}</td>
                          <td className={TD} />
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-0.5 border-t border-slate-100 px-4 py-2 text-xs text-slate-500 md:px-5">
                    <span>Showing {filteredBoulders.length} of {entryCount(periodBoulders.length)}</span>
                    {/* The table has its own total row; phones get the totals here */}
                    <span className="font-semibold text-slate-700 md:hidden">
                      {formatNumber(listTotals.trips)} trips · {formatTon(listTotals.netWeight)} T · {formatCurrency(listTotals.amount)}
                    </span>
                  </div>
                </>
              ))}

            {tab === 'vehicles' && (vehicleSummary.length === 0
              ? renderEmpty('No vehicles', 'No boulder came in during this period.')
              : (
                <>
                  <ul className="divide-y divide-slate-100 md:hidden">
                    {vehicleSummary.map((row) => (
                      <li key={row.vehicleNo}>
                        <button type="button" onClick={() => openVehicle(row.vehicleNo)} className="w-full px-4 py-2.5 text-left active:bg-slate-50">
                          <div className="flex items-baseline justify-between gap-3">
                            <p className="min-w-0 truncate text-sm font-semibold text-slate-800">{row.parties.join(', ') || '—'}</p>
                            <span className="shrink-0 text-sm font-bold text-emerald-700">{formatTon(row.netWeight)} T</span>
                          </div>
                          <div className="mt-1 flex items-center justify-between gap-3">
                            <Plate>{row.vehicleNo}</Plate>
                            <span className="shrink-0 text-xs text-slate-500">{formatNumber(row.trips)} trips · {formatCurrency(row.amount)}</span>
                          </div>
                          <div className="mt-1.5 flex">{vehicleBar(row)}</div>
                        </button>
                      </li>
                    ))}
                  </ul>

                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[760px] text-left">
                      <thead>
                        <tr>
                          <th className={`${TH} w-10`}>#</th>
                          <th className={TH}>Party / Vehicle</th>
                          <th className={`${TH} text-right`}>Trips</th>
                          <th className={TH}>Net Boulder</th>
                          <th className={`${TH} text-right`}>Amount</th>
                          <th className={`${TH} text-right`}>Last Trip</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vehicleSummary.map((row, index) => {
                          const share = periodTotals.netWeight > 0 ? (row.netWeight / periodTotals.netWeight) * 100 : 0;
                          return (
                            <tr
                              key={row.vehicleNo}
                              onClick={() => openVehicle(row.vehicleNo)}
                              className={`tbl-row cursor-pointer ${vehicleFilter === row.vehicleNo ? 'bg-primary-50' : ''}`}
                            >
                              <td className={`${TD} text-slate-400`}>{index + 1}</td>
                              <td className={TD}>
                                <p className="max-w-[20rem] truncate font-semibold text-slate-800" title={row.parties.join(', ') || undefined}>{row.parties.join(', ') || '—'}</p>
                                <Plate>{row.vehicleNo}</Plate>
                              </td>
                              <td className={`${TD} text-right`}>{formatNumber(row.trips)}</td>
                              <td className={TD}>
                                <div className="flex items-center gap-3">
                                  <span className="w-20 shrink-0 whitespace-nowrap font-bold text-emerald-700">{formatTon(row.netWeight)} T</span>
                                  <div className="flex max-w-[200px] flex-1">{vehicleBar(row)}</div>
                                  <span className="w-9 shrink-0 text-right text-xs text-slate-400">{share.toFixed(0)}%</span>
                                </div>
                              </td>
                              <td className={`${TD} whitespace-nowrap text-right font-semibold text-slate-800`}>{formatCurrency(row.amount)}</td>
                              <td className={`${TD} whitespace-nowrap text-right text-slate-500`}>{formatDate(row.lastDate)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-slate-200 bg-slate-50">
                          <td className={`${TD} font-bold text-slate-900`} colSpan={2}>Total</td>
                          <td className={`${TD} text-right font-semibold text-slate-800`}>{formatNumber(periodTotals.trips)}</td>
                          <td className={`${TD} whitespace-nowrap font-bold text-emerald-700`}>{formatTon(periodTotals.netWeight)} T</td>
                          <td className={`${TD} whitespace-nowrap text-right font-bold text-slate-900`}>{formatCurrency(periodTotals.amount)}</td>
                          <td className={TD} />
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500 md:px-5">
                    {vehicleSummary.length} vehicle{vehicleSummary.length === 1 ? '' : 's'}, most boulder first · tap one to see its entries
                  </p>
                </>
              ))}
          </section>
        </div>
      )}
    </div>
  );
}
