import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays, ClipboardList, Eye, FileSpreadsheet, FileText, Filter, Gauge, Inbox, IndianRupee, Mountain, Pencil, Plus, RefreshCw, Repeat,
  Search, Trash2, Truck, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import apiClient from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { canDeleteEntries, canEditEntry } from '../utils/staffAccess';
import StatCard from '../components/StatCard';
import Segmented from '../components/Segmented';
import BoulderEntry from './BoulderEntry/BoulderEntry';
import CustomRangePopup, { formatRangeLabel, toLocalDateInput } from '../components/CustomRangePopup';
import MonthPickerPopup, { getMonthRange, formatMonthLabel } from '../components/MonthPickerPopup';
import { downloadExcel, getExportFileName } from '../utils/excelExport';
import { downloadPdf } from '../utils/pdfExport';

// The views of the data panel
const TABS = [
  { key: 'entries', label: 'Entries', icon: ClipboardList },
  { key: 'days', label: 'Day-wise', icon: CalendarDays },
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

const formatDay = (dayKey) => {
  const date = new Date(`${dayKey}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dayKey;
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
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

// The boulder rate the entry was charged at: per ton (T) or per trip
const isPerTripEntry = (entry) => entry?.boulderRateBasis === 'per_trip';

const getEntryTrips = (entry) => (isBulkEntry(entry) ? Number(entry.tripCount || 0) : 1);

const formatTon = (kg) => formatNumber(Number(kg || 0) / 1000);

const entryCount = (count) => `${formatNumber(count)} entr${count === 1 ? 'y' : 'ies'}`;

const getBulkSummary = (entry) => (
  `${formatNumber(entry.tripCount)} trips × ${formatTon(entry.averageWeight)} T`
);

const getVehicleKey = (entry) => String(entry.vehicleNo || '-').toUpperCase();
const getPartyKey = (entry) => String(entry.partyName || '').trim();

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
  if (preset === 'yesterday') return { fromDate: daysAgoKey(1), toDate: daysAgoKey(1) };
  if (preset === 'last7') return { fromDate: daysAgoKey(6), toDate: today };
  if (preset === 'last30') return { fromDate: daysAgoKey(29), toDate: today };
  if (preset === 'thisMonth') return { fromDate: toDayKey(new Date(now.getFullYear(), now.getMonth(), 1)), toDate: today };
  if (preset === 'yearWise') {
    return { fromDate: toDayKey(new Date(now.getFullYear(), 0, 1)), toDate: toDayKey(new Date(now.getFullYear(), 11, 31)) };
  }
  return { fromDate: '', toDate: '' };
};

const PRESETS = [
  { key: '', label: 'All' },
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'last7', label: '7 Days' },
  { key: 'last30', label: '30 Days' },
  { key: 'thisMonth', label: 'This Month', shortLabel: 'Month' },
  { key: 'monthWise', label: 'Pick Month', shortLabel: 'Pick' },
  { key: 'yearWise', label: 'This Year', shortLabel: 'Year' }
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

/** A removable chip for one active filter. */
function FilterChip({ label, onClear }) {
  return (
    <button
      type="button"
      onClick={onClear}
      title="Remove this filter"
      className="inline-flex max-w-full items-center gap-1 rounded-full bg-primary-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-primary-700"
    >
      <span className="truncate">{label}</span>
      <X size={13} className="shrink-0" />
    </button>
  );
}

export default function BoulderLedger() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canDeleteBoulders = canDeleteEntries(user);
  const [boulders, setBoulders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [partyFilter, setPartyFilter] = useState('');
  const [datePreset, setDatePreset] = useState('');
  const [{ fromDate, toDate }, setDateRange] = useState({ fromDate: '', toDate: '' });
  const [editingEntry, setEditingEntry] = useState(null);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [tab, setTab] = useState('entries');
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  // The filter panel opens from the Filters button in the header
  const [showFilters, setShowFilters] = useState(false);
  // 'excel' or 'pdf' while the export period popup is open
  const [exportFormat, setExportFormat] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth()));
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));

  useEffect(() => {
    const handleKeyDown = (event) => {
      // With an entry popup open, Esc closes the popup instead of leaving the page.
      // defaultPrevented covers the popup's own Esc handler, which has already closed it by the time this runs.
      if (event.defaultPrevented) return;
      if (event.key === 'Escape' && !showMonthPicker && !exportFormat && !showAddEntry && !editingEntry) {
        navigate('/');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, showMonthPicker, exportFormat, showAddEntry, editingEntry]);

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

  // ─── Filters: period → supplier + search → vehicle ─────────────────────────
  const periodBoulders = useMemo(() => boulders.filter((entry) => {
    const day = getEntryDayKey(entry);
    if (!day) return false;
    if (fromDate && day < fromDate) return false;
    if (toDate && day > toDate) return false;
    return true;
  }), [boulders, fromDate, toDate]);

  // Everything but the vehicle filter: the vehicle-wise list compares vehicles within it
  const baseBoulders = useMemo(() => {
    const normalizedSearch = String(searchTerm || '').trim().toLowerCase();
    return periodBoulders.filter((entry) => {
      if (partyFilter && getPartyKey(entry) !== partyFilter) return false;
      if (!normalizedSearch) return true;
      return String(entry.vehicleNo || '').toLowerCase().includes(normalizedSearch)
        || String(entry.partyName || '').toLowerCase().includes(normalizedSearch)
        || String(entry.boulderNumber || '').toLowerCase().includes(normalizedSearch)
        || String(entry.slipNo || '').toLowerCase().includes(normalizedSearch)
        || String(entry.rstNo || '').toLowerCase().includes(normalizedSearch);
    });
  }, [periodBoulders, partyFilter, searchTerm]);

  const filteredBoulders = useMemo(() => (
    vehicleFilter ? baseBoulders.filter((entry) => getVehicleKey(entry) === vehicleFilter) : baseBoulders
  ), [baseBoulders, vehicleFilter]);

  const totals = useMemo(() => filteredBoulders.reduce(addToTotals, emptyTotals()), [filteredBoulders]);

  // Every vehicle and supplier ever used, so a filter stays put when the period changes
  const vehicleOptions = useMemo(() => {
    const counts = new Map();
    for (const entry of boulders) counts.set(getVehicleKey(entry), 0);
    for (const entry of periodBoulders) counts.set(getVehicleKey(entry), (counts.get(getVehicleKey(entry)) || 0) + getEntryTrips(entry));
    return [...counts.entries()]
      .map(([vehicleNo, trips]) => ({ vehicleNo, trips }))
      .sort((a, b) => b.trips - a.trips || a.vehicleNo.localeCompare(b.vehicleNo));
  }, [boulders, periodBoulders]);

  const partyOptions = useMemo(() => (
    [...new Set(boulders.map(getPartyKey).filter(Boolean))].sort((a, b) => a.localeCompare(b))
  ), [boulders]);

  const vehicleSummary = useMemo(() => {
    const map = new Map();
    for (const entry of baseBoulders) {
      const vehicleNo = getVehicleKey(entry);
      const row = map.get(vehicleNo) || { vehicleNo, parties: new Set(), days: new Set(), lastDate: null, ...emptyTotals() };
      addToTotals(row, entry);
      const party = getPartyKey(entry);
      if (party) row.parties.add(party);
      row.days.add(getEntryDayKey(entry));
      const date = new Date(entry.boulderDate || entry.createdAt);
      if (!row.lastDate || date > row.lastDate) row.lastDate = date;
      map.set(vehicleNo, row);
    }
    return [...map.values()]
      .map((row) => ({ ...row, parties: [...row.parties], dayCount: row.days.size }))
      .sort((a, b) => b.netWeight - a.netWeight);
  }, [baseBoulders]);

  const daySummary = useMemo(() => {
    const map = new Map();
    for (const entry of filteredBoulders) {
      const day = getEntryDayKey(entry);
      const row = map.get(day) || { day, vehicles: new Set(), ...emptyTotals() };
      addToTotals(row, entry);
      row.vehicles.add(getVehicleKey(entry));
      map.set(day, row);
    }
    return [...map.values()]
      .map((row) => ({ ...row, vehicleCount: row.vehicles.size }))
      .sort((a, b) => b.day.localeCompare(a.day));
  }, [filteredBoulders]);

  const baseTotals = useMemo(() => baseBoulders.reduce(addToTotals, emptyTotals()), [baseBoulders]);

  const periodLabel = (() => {
    if (datePreset === 'monthWise') return formatMonthLabel(selectedMonth, selectedYear);
    if (!fromDate && !toDate) return 'All time';
    if (fromDate === toDate) return formatDate(fromDate);
    if (!fromDate) return `Up to ${formatDate(toDate)}`;
    if (!toDate) return `From ${formatDate(fromDate)}`;
    return `${formatDate(fromDate)} – ${formatDate(toDate)}`;
  })();

  const handlePresetChange = (value) => {
    if (value === 'monthWise') {
      setShowMonthPicker(true);
      return;
    }
    setDatePreset(value);
    setDateRange(resolvePresetRange(value));
  };

  // Typing a date makes it a custom range
  const handleDateInput = (name, value) => {
    setDatePreset('custom');
    setDateRange((prev) => {
      const next = { ...prev, [name]: value };
      // Keep From before To
      if (next.fromDate && next.toDate && next.fromDate > next.toDate) {
        if (name === 'fromDate') next.toDate = next.fromDate;
        else next.fromDate = next.toDate;
      }
      return next;
    });
  };

  const applyMonth = (month, year) => {
    const bounds = getMonthRange(month, year);
    setSelectedMonth(month);
    setSelectedYear(year);
    setDatePreset('monthWise');
    setDateRange({ fromDate: bounds.from, toDate: bounds.to });
    setShowMonthPicker(false);
  };

  const activeFilterCount = [fromDate || toDate, vehicleFilter, partyFilter, searchTerm.trim()].filter(Boolean).length;

  const clearFilters = () => {
    setDatePreset('');
    setDateRange({ fromDate: '', toDate: '' });
    setVehicleFilter('');
    setPartyFilter('');
    setSearchTerm('');
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

  const getPartyDisplayName = (entry) => getPartyKey(entry) || '—';

  const maxVehicleWeight = vehicleSummary[0]?.netWeight || 0;
  const maxDayWeight = daySummary.reduce((max, row) => Math.max(max, row.netWeight), 0);
  const tons = totals.netWeight / 1000;
  const dayCount = daySummary.length;
  const initialLoading = loading && boulders.length === 0;

  // Picking a vehicle in the vehicle-wise list filters everything to it
  const openVehicle = (vehicleNo) => {
    setVehicleFilter(vehicleNo);
    setTab('entries');
  };

  const lastTrip = filteredBoulders.reduce((latest, entry) => {
    const date = new Date(entry.boulderDate || entry.createdAt);
    return !latest || date > latest ? date : latest;
  }, null);

  const stats = [
    { icon: Mountain, label: 'Boulder Crushed', tone: 'emerald', value: `${formatTon(totals.netWeight)} T`, hint: `${formatNumber(totals.netWeight)} kg` },
    { icon: Repeat, label: 'Trips', tone: 'blue', value: formatNumber(totals.trips), hint: entryCount(totals.count) },
    { icon: Gauge, label: 'Avg per Trip', tone: 'teal', value: `${totals.trips > 0 ? formatNumber(tons / totals.trips) : 0} T`, hint: 'Net weight ÷ trips' },
    { icon: CalendarDays, label: 'Working Days', tone: 'amber', value: formatNumber(dayCount), hint: dayCount > 0 ? `${formatNumber(tons / dayCount)} T per day` : 'No boulder' },
    vehicleFilter
      ? { icon: Truck, label: 'Last Trip', tone: 'indigo', value: lastTrip ? formatDate(lastTrip) : '—', hint: vehicleFilter }
      : {
          icon: Truck, label: 'Vehicles', tone: 'indigo',
          value: formatNumber(vehicleSummary.length),
          hint: vehicleSummary[0] ? `Most: ${vehicleSummary[0].vehicleNo}` : 'No vehicles'
        },
    {
      icon: IndianRupee, label: 'Amount', tone: 'rose',
      value: formatCurrency(totals.amount),
      hint: tons > 0 ? `${formatCurrency(totals.amount / tons)} per ton` : 'No boulder'
    }
  ];

  // Every boulder entry of the chosen days (the vehicle, supplier and search filters are not applied), oldest first
  // The crusher's name heads a PDF export; staff export under their owner's name
  const companyName = String((user?.role === 'employee' ? user?.ownerName : user?.name) || '').trim();

  // The PDF leaves out the times, gross / tare and transport rate / place so the table fits an A4 page
  const handleExport = async (fromDay, toDay) => {
    const rows = boulders
      .filter((entry) => {
        const day = getEntryDayKey(entry);
        return day && day >= fromDay && day <= toDay;
      })
      .sort((a, b) => (
        new Date(a.boulderDate || a.createdAt) - new Date(b.boulderDate || b.createdAt)
        || new Date(a.createdAt) - new Date(b.createdAt)
      ));
    if (rows.length === 0) {
      toast.info('No boulder entries in this period');
      return;
    }

    const sum = (getValue) => rows.reduce((total, entry) => total + Number(getValue(entry) || 0), 0);
    const weighed = (value) => (entry) => (isBulkEntry(entry) ? '' : value(entry) || '');
    const columns = [
      { key: 'date', header: 'Date', type: 'date', width: 12, value: (entry) => entry.boulderDate || entry.createdAt },
      { key: 'number', header: 'Boulder No', width: 11, value: (entry) => entry.boulderNumber },
      { key: 'slip', header: 'Slip No', width: 10, value: (entry) => entry.slipNo },
      { key: 'rst', header: 'RST No', width: 10, value: (entry) => entry.rstNo },
      { key: 'party', header: 'Supplier', width: 26, value: (entry) => getPartyKey(entry) },
      { key: 'vehicle', header: 'Vehicle No', width: 14, value: (entry) => entry.vehicleNo },
      { key: 'mode', header: 'Entry', width: 8, value: (entry) => (isBulkEntry(entry) ? 'Bulk' : 'Single') },
      { key: 'trips', header: 'Trips', type: 'number', format: '#,##0', width: 8, value: getEntryTrips },
      { key: 'entryTime', header: 'In Time', width: 9, pdf: false, value: (entry) => entry.entryTime },
      { key: 'exitTime', header: 'Out Time', width: 9, pdf: false, value: (entry) => entry.exitTime },
      { key: 'gross', header: 'Gross (kg)', type: 'number', format: '#,##0', width: 12, pdf: false, value: weighed((entry) => entry.grossWeight) },
      { key: 'tare', header: 'Tare (kg)', type: 'number', format: '#,##0', width: 12, pdf: false, value: weighed((entry) => entry.tareWeight) },
      { key: 'net', header: 'Net (kg)', type: 'number', format: '#,##0', width: 12, value: (entry) => entry.netWeight },
      { key: 'tons', header: 'Net (Ton)', type: 'number', format: '#,##0.000', width: 11, value: (entry) => Number(entry.netWeight || 0) / 1000 },
      { key: 'rateBasis', header: 'Rate By', width: 9, value: (entry) => (isPerTripEntry(entry) ? 'Trip' : 'Ton') },
      { key: 'rate', header: 'Rate', type: 'number', width: 10, value: (entry) => (isPerTripEntry(entry) ? entry.boulderRatePerTrip : entry.boulderRatePerTon) },
      { key: 'amount', header: 'Amount', type: 'number', width: 14, value: (entry) => entry.amount },
      { key: 'transportRate', header: 'Transport Rate', type: 'number', width: 14, pdf: false, value: (entry) => entry.transportRate || '' },
      { key: 'transportAmount', header: 'Transport Amount', type: 'number', width: 16, value: (entry) => entry.transportAmount || '' },
      { key: 'transportLocation', header: 'Transport Location', width: 18, pdf: false, value: (entry) => entry.transportLocation }
    ];

    setExporting(true);
    try {
      const totals = {
        date: `Total (${entryCount(rows.length)})`,
        trips: sum(getEntryTrips),
        gross: sum(weighed((entry) => entry.grossWeight)),
        tare: sum(weighed((entry) => entry.tareWeight)),
        net: sum((entry) => entry.netWeight),
        tons: sum((entry) => entry.netWeight) / 1000,
        amount: sum((entry) => entry.amount),
        transportAmount: sum((entry) => entry.transportAmount)
      };
      if (exportFormat === 'pdf') {
        await downloadPdf({
          fileName: getExportFileName('Boulder', fromDay, toDay, 'pdf'),
          title: `${companyName ? `${companyName} - ` : ''}Boulder Ledger`,
          subtitle: `${formatRangeLabel(fromDay, toDay)} · ${entryCount(rows.length)}`,
          columns,
          rows,
          totals
        });
      } else {
        await downloadExcel({ fileName: getExportFileName('Boulder', fromDay, toDay), sheet: 'Boulder', columns, rows, totals });
      }
      setExportFormat(null);
      toast.success(`Exported ${entryCount(rows.length)}`, { autoClose: 1200 });
    } catch (err) {
      toast.error(err.message || 'Could not export boulder entries');
    } finally {
      setExporting(false);
    }
  };

  const renderActions = (entry) => (
    <div className="flex items-center justify-end">
      {entry.slipImg && (
        <a href={entry.slipImg} target="_blank" rel="noreferrer" title="View slip" aria-label="View slip" className="icon-btn inline-flex p-1.5 hover:bg-blue-50 hover:text-blue-600">
          <Eye size={16} />
        </a>
      )}
      {/* Staff edit only the entries they added */}
      {canEditEntry(user, entry) && (
        <button type="button" title="Edit" aria-label="Edit" className="icon-btn p-1.5 hover:bg-blue-50 hover:text-blue-600" onClick={() => setEditingEntry(entry)}>
          <Pencil size={16} />
        </button>
      )}
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
      {activeFilterCount > 0 && (
        <button type="button" className="btn-secondary mt-1 text-xs" onClick={clearFilters}>Clear filters</button>
      )}
    </div>
  );

  const bar = (value, max, color = 'bg-emerald-500') => (
    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${max > 0 ? Math.max((value / max) * 100, 2) : 0}%` }} />
    </div>
  );

  // One chip per active filter, shown in the open panel and under the header when it is closed
  const filterChips = (
    <>
      {(fromDate || toDate) && <FilterChip label={periodLabel} onClear={() => handlePresetChange('')} />}
      {vehicleFilter && <FilterChip label={`Vehicle ${vehicleFilter}`} onClear={() => setVehicleFilter('')} />}
      {partyFilter && <FilterChip label={partyFilter} onClear={() => setPartyFilter('')} />}
      {searchTerm.trim() && <FilterChip label={`“${searchTerm.trim()}”`} onClear={() => setSearchTerm('')} />}
    </>
  );

  // What the stats are about, in words
  const scopeLabel = [vehicleFilter, partyFilter, periodLabel].filter(Boolean).join(' · ');

  return (
    <div className="page-fade-in space-y-3.5 px-3 pb-24 pt-3.5 md:space-y-4 md:pb-6 lg:px-6 lg:pt-4">
      {showMonthPicker && (
        <MonthPickerPopup
          month={selectedMonth}
          year={selectedYear}
          subtitle="Choose the year, then the month to view boulder entries"
          onApply={applyMonth}
          onClose={() => setShowMonthPicker(false)}
        />
      )}
      {/* The export period starts as the period on screen; "All" starts at this month */}
      {exportFormat && (
        <CustomRangePopup
          from={fromDate || toLocalDateInput(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}
          to={toDate || toLocalDateInput(new Date())}
          title={exportFormat === 'pdf' ? 'Export Boulder to PDF' : 'Export Boulder to Excel'}
          subtitle="Every boulder entry between these dates goes in the file"
          applyLabel={exporting ? 'Exporting...' : exportFormat === 'pdf' ? 'Export PDF' : 'Export Excel'}
          busy={exporting}
          onApply={handleExport}
          onClose={() => !exporting && setExportFormat(null)}
        />
      )}
      {editingEntry && <BoulderEntry editingEntry={editingEntry} onModalFinish={handleCloseEdit} />}
      {showAddEntry && <BoulderEntry onModalFinish={handleCloseAdd} />}

      <div className="page-header gap-2.5">
        <div className="min-w-0">
          <h1 className="page-title">Boulder Ledger</h1>
          <p className="page-subtitle">Boulder received for crushing · {periodLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFilters((open) => !open)}
            aria-expanded={showFilters}
            aria-controls="boulder-filters"
            title={showFilters ? 'Hide filters' : 'Show filters'}
            className={`relative inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold ring-1 ring-inset transition ${
              showFilters || activeFilterCount > 0
                ? 'bg-primary-50 text-primary-700 ring-primary-300'
                : 'bg-white text-slate-600 ring-slate-300 hover:bg-slate-50'
            }`}
          >
            <Filter size={18} />
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-600 px-1 text-[11px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
          <button type="button" className="icon-btn shrink-0" title="Refresh" aria-label="Refresh" onClick={loadBoulders}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            type="button"
            onClick={() => setExportFormat('excel')}
            title="Export boulder entries of a period to Excel"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-white px-3 py-2.5 text-sm font-semibold text-slate-600 ring-1 ring-inset ring-slate-300 transition hover:bg-slate-50"
          >
            <FileSpreadsheet size={18} />
            <span className="hidden sm:inline">Excel</span>
          </button>
          <button
            type="button"
            onClick={() => setExportFormat('pdf')}
            title="Export boulder entries of a period to PDF, ready to print"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-white px-3 py-2.5 text-sm font-semibold text-slate-600 ring-1 ring-inset ring-slate-300 transition hover:bg-slate-50"
          >
            <FileText size={18} />
            <span className="hidden sm:inline">PDF</span>
          </button>
          <button type="button" className="btn-primary px-5 py-2.5 text-[15px] shadow-md shadow-primary-600/25" onClick={() => setShowAddEntry(true)}>
            <Plus size={20} /> Add Boulder
          </button>
        </div>
      </div>

      {/* Filters: period, dates, vehicle, supplier, search. Hidden until the Filters button is pressed */}
      {showFilters && (
      <section id="boulder-filters" className="panel space-y-3 p-3 md:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Segmented options={PRESETS} value={datePreset} onChange={handlePresetChange} />
          {activeFilterCount > 0 && (
            <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 transition hover:text-rose-600">
              <X size={14} /> Clear all filters
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-5">
          <div>
            <label className="label" htmlFor="boulder-filter-from">From</label>
            <input id="boulder-filter-from" type="date" className="input" value={fromDate} max={toDate || undefined} onChange={(e) => handleDateInput('fromDate', e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="boulder-filter-to">To</label>
            <input id="boulder-filter-to" type="date" className="input" value={toDate} min={fromDate || undefined} onChange={(e) => handleDateInput('toDate', e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="boulder-filter-vehicle">Vehicle No</label>
            <select id="boulder-filter-vehicle" className={`input font-mono ${vehicleFilter ? 'ring-2 ring-primary-500' : ''}`} value={vehicleFilter} onChange={(e) => setVehicleFilter(e.target.value)}>
              <option value="">All vehicles</option>
              {vehicleOptions.map((option) => (
                <option key={option.vehicleNo} value={option.vehicleNo}>
                  {option.vehicleNo}{option.trips ? ` · ${formatNumber(option.trips)} trips` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="boulder-filter-party">Supplier</label>
            <select id="boulder-filter-party" className={`input ${partyFilter ? 'ring-2 ring-primary-500' : ''}`} value={partyFilter} onChange={(e) => setPartyFilter(e.target.value)}>
              <option value="">All suppliers</option>
              {partyOptions.map((party) => <option key={party} value={party}>{party}</option>)}
            </select>
          </div>
          <div className="col-span-2 md:col-span-2 xl:col-span-1">
            <label className="label" htmlFor="boulder-filter-search">Search</label>
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="boulder-filter-search"
                type="search"
                className="input pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Vehicle, party or BOL no."
              />
            </div>
          </div>
        </div>
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2.5">
            <Filter size={14} className="text-slate-400" />
            {filterChips}
          </div>
        )}
        <div className="flex justify-end border-t border-slate-100 pt-2.5">
          <button type="button" className="btn-secondary text-xs" onClick={() => setShowFilters(false)}>Done</button>
        </div>
      </section>
      )}

      {/* Filters closed: the active ones stay visible as chips */}
      {!showFilters && activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <Filter size={14} className="text-slate-400" />
          {filterChips}
          <button type="button" onClick={clearFilters} className="ml-1 text-xs font-semibold text-slate-500 transition hover:text-rose-600">Clear all</button>
        </div>
      )}

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
          <section>
            <p className="mb-1.5 truncate px-0.5 text-xs font-semibold text-slate-500">
              Totals for <span className="text-slate-800">{scopeLabel}</span>
            </p>
            <div className="grid grid-cols-3 gap-2 md:gap-3 xl:grid-cols-6">
              {stats.map((stat) => <StatCard key={stat.label} compact {...stat} />)}
            </div>
          </section>

          <section className="panel">
            <div className="panel-header flex flex-wrap items-center justify-between gap-2.5 py-2.5">
              <Segmented options={TABS} value={tab} onChange={setTab} />
              {tab === 'vehicles' && vehicleFilter && (
                <span className="text-xs text-slate-500">Showing every vehicle · <b className="text-primary-700">{vehicleFilter}</b> highlighted</span>
              )}
            </div>

            {tab === 'entries' && (filteredBoulders.length === 0
              ? renderEmpty('No boulder entries found', boulders.length === 0 ? 'Add the first entry with "Add Boulder".' : 'Nothing matches these filters.')
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
                            {' · '}{isPerTripEntry(entry) ? `${formatCurrency(entry.boulderRatePerTrip)}/Trip` : `${formatCurrency(entry.boulderRatePerTon)}/T`}
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
                              <button type="button" onClick={() => setVehicleFilter(getVehicleKey(entry))} title="Show only this vehicle">
                                <Plate>{entry.vehicleNo || '-'}</Plate>
                              </button>
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
                            <td className={`${TD} whitespace-nowrap text-right`}>{isPerTripEntry(entry) ? `${formatCurrency(entry.boulderRatePerTrip)}/Trip` : formatCurrency(entry.boulderRatePerTon)}</td>
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
                              {formatNumber(totals.trips)} trips · {formatTon(totals.netWeight)} T
                            </span>
                          </td>
                          <td className={`${TD} text-right font-semibold text-slate-800`}>{formatNumber(totals.grossWeight)}</td>
                          <td className={`${TD} text-right font-semibold text-slate-800`}>{formatNumber(totals.tareWeight)}</td>
                          <td className={`${TD} text-right font-bold text-emerald-700`}>{formatNumber(totals.netWeight)}</td>
                          <td className={TD} />
                          <td className={`${TD} whitespace-nowrap text-right font-bold text-slate-900`}>{formatCurrency(totals.amount)}</td>
                          <td className={TD} />
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-0.5 border-t border-slate-100 px-4 py-2 text-xs text-slate-500 md:px-5">
                    <span>{entryCount(filteredBoulders.length)} · tap a vehicle number to see only that vehicle</span>
                    {/* The table has its own total row; phones get the totals here */}
                    <span className="font-semibold text-slate-700 md:hidden">
                      {formatNumber(totals.trips)} trips · {formatTon(totals.netWeight)} T · {formatCurrency(totals.amount)}
                    </span>
                  </div>
                </>
              ))}

            {tab === 'days' && (daySummary.length === 0
              ? renderEmpty('No boulder on any day', 'Nothing matches these filters.')
              : (
                <>
                  <ul className="divide-y divide-slate-100 md:hidden">
                    {daySummary.map((row) => (
                      <li key={row.day} className="px-4 py-2.5">
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="text-sm font-semibold text-slate-800">{formatDay(row.day)}</p>
                          <span className="shrink-0 text-sm font-bold text-emerald-700">{formatTon(row.netWeight)} T</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-3 text-xs text-slate-500">
                          <span>{formatNumber(row.trips)} trips · {row.vehicleCount} vehicle{row.vehicleCount === 1 ? '' : 's'}</span>
                          <span>{formatCurrency(row.amount)}</span>
                        </div>
                        <div className="mt-1.5 flex">{bar(row.netWeight, maxDayWeight)}</div>
                      </li>
                    ))}
                  </ul>

                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[760px] text-left">
                      <thead>
                        <tr>
                          <th className={TH}>Date</th>
                          <th className={`${TH} text-right`}>Trips</th>
                          <th className={`${TH} text-right`}>Vehicles</th>
                          <th className={TH}>Boulder</th>
                          <th className={`${TH} text-right`}>Avg / Trip</th>
                          <th className={`${TH} text-right`}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {daySummary.map((row) => (
                          <tr key={row.day} className="tbl-row">
                            <td className={`${TD} whitespace-nowrap font-semibold text-slate-800`}>{formatDay(row.day)}</td>
                            <td className={`${TD} text-right`}>{formatNumber(row.trips)}</td>
                            <td className={`${TD} text-right text-slate-600`}>{row.vehicleCount}</td>
                            <td className={TD}>
                              <div className="flex items-center gap-3">
                                <span className="w-20 shrink-0 whitespace-nowrap font-bold text-emerald-700">{formatTon(row.netWeight)} T</span>
                                <div className="flex max-w-[220px] flex-1">{bar(row.netWeight, maxDayWeight)}</div>
                              </div>
                            </td>
                            <td className={`${TD} text-right text-slate-600`}>{row.trips > 0 ? `${formatNumber(row.netWeight / 1000 / row.trips)} T` : '—'}</td>
                            <td className={`${TD} whitespace-nowrap text-right font-semibold text-slate-800`}>{formatCurrency(row.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-slate-200 bg-slate-50">
                          <td className={`${TD} font-bold text-slate-900`}>Total · {dayCount} day{dayCount === 1 ? '' : 's'}</td>
                          <td className={`${TD} text-right font-semibold text-slate-800`}>{formatNumber(totals.trips)}</td>
                          <td className={TD} />
                          <td className={`${TD} whitespace-nowrap font-bold text-emerald-700`}>{formatTon(totals.netWeight)} T</td>
                          <td className={`${TD} text-right text-slate-600`}>{totals.trips > 0 ? `${formatNumber(tons / totals.trips)} T` : '—'}</td>
                          <td className={`${TD} whitespace-nowrap text-right font-bold text-slate-900`}>{formatCurrency(totals.amount)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500 md:px-5">
                    One row per day, newest first{vehicleFilter ? ` · only ${vehicleFilter}` : ''}
                  </p>
                </>
              ))}

            {tab === 'vehicles' && (vehicleSummary.length === 0
              ? renderEmpty('No vehicles', 'No boulder came in for these filters.')
              : (
                <>
                  <ul className="divide-y divide-slate-100 md:hidden">
                    {vehicleSummary.map((row) => (
                      <li key={row.vehicleNo}>
                        <button type="button" onClick={() => openVehicle(row.vehicleNo)} className={`w-full px-4 py-2.5 text-left active:bg-slate-50 ${vehicleFilter === row.vehicleNo ? 'bg-primary-50' : ''}`}>
                          <div className="flex items-baseline justify-between gap-3">
                            <p className="min-w-0 truncate text-sm font-semibold text-slate-800">{row.parties.join(', ') || '—'}</p>
                            <span className="shrink-0 text-sm font-bold text-emerald-700">{formatTon(row.netWeight)} T</span>
                          </div>
                          <div className="mt-1 flex items-center justify-between gap-3">
                            <Plate>{row.vehicleNo}</Plate>
                            <span className="shrink-0 text-xs text-slate-500">{formatNumber(row.trips)} trips · {row.dayCount} days · {formatCurrency(row.amount)}</span>
                          </div>
                          <div className="mt-1.5 flex">{bar(row.netWeight, maxVehicleWeight)}</div>
                        </button>
                      </li>
                    ))}
                  </ul>

                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[820px] text-left">
                      <thead>
                        <tr>
                          <th className={`${TH} w-10`}>#</th>
                          <th className={TH}>Party / Vehicle</th>
                          <th className={`${TH} text-right`}>Trips</th>
                          <th className={`${TH} text-right`}>Days</th>
                          <th className={TH}>Boulder</th>
                          <th className={`${TH} text-right`}>Avg / Trip</th>
                          <th className={`${TH} text-right`}>Amount</th>
                          <th className={`${TH} text-right`}>Last Trip</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vehicleSummary.map((row, index) => {
                          const share = baseTotals.netWeight > 0 ? (row.netWeight / baseTotals.netWeight) * 100 : 0;
                          return (
                            <tr
                              key={row.vehicleNo}
                              onClick={() => openVehicle(row.vehicleNo)}
                              className={`tbl-row cursor-pointer ${vehicleFilter === row.vehicleNo ? 'bg-primary-50' : ''}`}
                            >
                              <td className={`${TD} text-slate-400`}>{index + 1}</td>
                              <td className={TD}>
                                <p className="max-w-[18rem] truncate font-semibold text-slate-800" title={row.parties.join(', ') || undefined}>{row.parties.join(', ') || '—'}</p>
                                <Plate>{row.vehicleNo}</Plate>
                              </td>
                              <td className={`${TD} text-right`}>{formatNumber(row.trips)}</td>
                              <td className={`${TD} text-right text-slate-600`}>{row.dayCount}</td>
                              <td className={TD}>
                                <div className="flex items-center gap-3">
                                  <span className="w-20 shrink-0 whitespace-nowrap font-bold text-emerald-700">{formatTon(row.netWeight)} T</span>
                                  <div className="flex max-w-[180px] flex-1">{bar(row.netWeight, maxVehicleWeight)}</div>
                                  <span className="w-9 shrink-0 text-right text-xs text-slate-400">{share.toFixed(0)}%</span>
                                </div>
                              </td>
                              <td className={`${TD} text-right text-slate-600`}>{row.trips > 0 ? `${formatNumber(row.netWeight / 1000 / row.trips)} T` : '—'}</td>
                              <td className={`${TD} whitespace-nowrap text-right font-semibold text-slate-800`}>{formatCurrency(row.amount)}</td>
                              <td className={`${TD} whitespace-nowrap text-right text-slate-500`}>{formatDate(row.lastDate)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-slate-200 bg-slate-50">
                          <td className={`${TD} font-bold text-slate-900`} colSpan={2}>Total · {vehicleSummary.length} vehicles</td>
                          <td className={`${TD} text-right font-semibold text-slate-800`}>{formatNumber(baseTotals.trips)}</td>
                          <td className={TD} />
                          <td className={`${TD} whitespace-nowrap font-bold text-emerald-700`}>{formatTon(baseTotals.netWeight)} T</td>
                          <td className={TD} />
                          <td className={`${TD} whitespace-nowrap text-right font-bold text-slate-900`}>{formatCurrency(baseTotals.amount)}</td>
                          <td className={TD} />
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500 md:px-5">
                    Most boulder first · tap a vehicle to see its entries and totals
                  </p>
                </>
              ))}

          </section>
        </div>
      )}

      {/* Phones: Add Boulder always in reach */}
      <button
        type="button"
        onClick={() => setShowAddEntry(true)}
        className="fixed bottom-5 right-4 z-40 flex items-center gap-2 rounded-full bg-primary-600 px-5 py-3.5 text-sm font-bold text-white shadow-xl shadow-primary-600/30 transition hover:bg-primary-700 md:hidden"
      >
        <Plus size={20} /> Add Boulder
      </button>
    </div>
  );
}
