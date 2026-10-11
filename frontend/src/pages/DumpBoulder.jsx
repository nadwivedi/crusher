import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDownToLine, ArrowUpFromLine, CalendarClock, Filter, Inbox, Pencil, RefreshCw, Search, Trash2, TrendingDown,
  TrendingUp, Warehouse, X
} from 'lucide-react';
import { toast } from 'react-toastify';
import apiClient from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { handlePopupFormKeyDown } from '../utils/popupFormKeyboard';
import StatCard from '../components/StatCard';
import FormPopup from '../components/FormPopup';
import FormSection from '../components/FormSection';
import { toLocalDateInput } from '../components/CustomRangePopup';
import MonthPickerPopup, { getMonthRange, formatMonthLabel } from '../components/MonthPickerPopup';
import DumpSiteEntry from './BoulderEntry/DumpSiteEntry';
import DumpToHopper from './BoulderEntry/DumpToHopper';
import { formatKg, formatTon } from './BoulderEntry/dumpUtils';

const TH = 'tbl-head whitespace-nowrap px-3 py-2.5 first:pl-5 last:pr-5';
const TD = 'tbl-cell px-3 py-2.5 first:pl-5 last:pr-5';

const TYPE_FILTERS = [
  { key: '', label: 'All Entries' },
  { key: 'to_dump', label: 'Stock In' },
  { key: 'to_hopper', label: 'Stock Out' }
];

const PRESETS = [
  { key: '', label: 'All Time' },
  { key: 'today', label: 'Today' },
  { key: 'last7', label: 'Last 7 Days' },
  { key: 'last30', label: 'Last 30 Days' },
  { key: 'thisMonth', label: 'This Month' },
  { key: 'monthWise', label: 'Pick Month' },
  { key: 'yearWise', label: 'This Year' },
  { key: 'custom', label: 'Custom Dates' }
];

const formatDate = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Local calendar day (toISOString would shift early-morning IST times to the previous day)
const toDayKey = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : toLocalDateInput(date);
};

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
  if (preset === 'thisMonth') return { fromDate: toDayKey(new Date(now.getFullYear(), now.getMonth(), 1)), toDate: today };
  if (preset === 'yearWise') return { fromDate: toDayKey(new Date(now.getFullYear(), 0, 1)), toDate: toDayKey(new Date(now.getFullYear(), 11, 31)) };
  return { fromDate: '', toDate: '' };
};

const DEFAULT_FILTERS = {
  preset: 'thisMonth',
  ...resolvePresetRange('thisMonth'),
  month: String(new Date().getMonth()),
  year: String(new Date().getFullYear()),
  type: '',
  search: ''
};

const getPeriodLabel = ({ preset, fromDate, toDate, month, year }) => {
  if (preset === 'monthWise') return formatMonthLabel(month, year);
  if (!fromDate && !toDate) return 'All time';
  if (fromDate === toDate) return formatDate(fromDate);
  if (!fromDate) return `Up to ${formatDate(toDate)}`;
  if (!toDate) return `From ${formatDate(fromDate)}`;
  return `${formatDate(fromDate)} – ${formatDate(toDate)}`;
};

const isStockIn = (row) => row.type === 'to_dump';

// How the weight was taken: slip, trips × average, or trips fed
const describeWeight = (row) => {
  if (isStockIn(row) && row.entryMode === 'bulk') return `${row.trips} trips × ${formatTon(row.averageWeight)} T`;
  if (isStockIn(row)) return `Slip ${formatKg(row.grossWeight)} − ${formatKg(row.tareWeight)} kg`;
  return row.trips ? `${row.trips} trips` : '';
};

const ton = (kg) => `${formatTon(kg)} T`;

function TypeBadge({ row }) {
  return isStockIn(row)
    ? <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200"><ArrowUpFromLine size={12} />Stock In</span>
    : <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 ring-1 ring-inset ring-blue-200"><ArrowDownToLine size={12} />Stock Out</span>;
}

/** A pill button for one choice in the filter popup. */
function Choice({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
        active ? 'border-primary-600 bg-primary-600 text-white shadow-sm' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
      }`}
    >
      {children}
    </button>
  );
}

/** Every filter of the page in one popup. Changes apply only on "Apply Filters". */
function FilterPopup({ filters, onApply, onClose }) {
  const [draft, setDraft] = useState(filters);
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  const set = (changes) => setDraft((prev) => ({ ...prev, ...changes }));

  const pickPreset = (preset) => {
    if (preset === 'monthWise') {
      setShowMonthPicker(true);
      return;
    }
    if (preset === 'custom') {
      set({ preset });
      return;
    }
    set({ preset, ...resolvePresetRange(preset) });
  };

  const handleDate = (name, value) => {
    setDraft((prev) => {
      const next = { ...prev, preset: 'custom', [name]: value };
      if (next.fromDate && next.toDate && next.fromDate > next.toDate) {
        if (name === 'fromDate') next.toDate = next.fromDate;
        else next.fromDate = next.toDate;
      }
      return next;
    });
  };

  const applyMonth = (month, year) => {
    const bounds = getMonthRange(month, year);
    set({ preset: 'monthWise', month, year, fromDate: bounds.from, toDate: bounds.to });
    setShowMonthPicker(false);
  };

  return (
    <>
      <FormPopup
        title="Filters"
        subtitle="Choose what the ledger shows"
        submitLabel="Apply Filters"
        maxWidth="max-w-lg"
        onSubmit={() => onApply(draft)}
        onClose={onClose}
        onKeyDown={(event) => { if (!showMonthPicker) handlePopupFormKeyDown(event, onClose); }}
        headerActions={(
          <button type="button" onClick={() => setDraft(DEFAULT_FILTERS)} className="rounded-lg bg-white/15 px-2.5 py-1.5 text-xs font-semibold text-white ring-1 ring-white/25 transition hover:bg-white/25">
            Reset
          </button>
        )}
      >
        <FormSection number={1} title="Period" tone="blue" hint={getPeriodLabel(draft)}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PRESETS.map((option) => (
              <Choice key={option.key} active={draft.preset === option.key} onClick={() => pickPreset(option.key)}>
                {option.key === 'monthWise' && draft.preset === 'monthWise' ? formatMonthLabel(draft.month, draft.year) : option.label}
              </Choice>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="dump-filter-from">From</label>
              <input id="dump-filter-from" type="date" className="input" value={draft.fromDate} max={draft.toDate || undefined} onChange={(e) => handleDate('fromDate', e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="dump-filter-to">To</label>
              <input id="dump-filter-to" type="date" className="input" value={draft.toDate} min={draft.fromDate || undefined} onChange={(e) => handleDate('toDate', e.target.value)} />
            </div>
          </div>
        </FormSection>

        <FormSection number={2} title="Entry Type" tone="emerald">
          <div className="grid grid-cols-3 gap-2">
            {TYPE_FILTERS.map((option) => (
              <Choice key={option.key} active={draft.type === option.key} onClick={() => set({ type: option.key })}>{option.label}</Choice>
            ))}
          </div>
        </FormSection>

        <FormSection number={3} title="Search" tone="slate">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="search" className="input pl-9" value={draft.search} onChange={(e) => set({ search: e.target.value })} placeholder="Vehicle, entry no. or notes" />
          </div>
        </FormSection>
      </FormPopup>

      {showMonthPicker && (
        <MonthPickerPopup
          month={draft.month}
          year={draft.year}
          subtitle="Choose the year, then the month to view dump boulder"
          onApply={applyMonth}
          onClose={() => setShowMonthPicker(false)}
        />
      )}
    </>
  );
}

/** A removable chip for one active filter. */
function FilterChip({ label, onClear }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-primary-50 py-1 pl-2.5 pr-1 text-xs font-semibold text-primary-800 ring-1 ring-inset ring-primary-200">
      <span className="truncate">{label}</span>
      {onClear && (
        <button type="button" onClick={onClear} title="Remove this filter" aria-label="Remove this filter" className="rounded-full p-0.5 transition hover:bg-primary-200">
          <X size={12} />
        </button>
      )}
    </span>
  );
}

/**
 * Dump Boulder: a stock ledger of boulder kept on the dump at site.
 * Stock In = Dump Boulder Entry, Stock Out = Dump Boulder to Hopper; every row shows previous stock → current stock.
 */
export default function DumpBoulder() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit = user?.role !== 'employee' && (user?.role === 'owner' || user?.permissions?.edit);
  const [allRows, setAllRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  // { type: 'to_dump' | 'to_hopper', entry? }
  const [popup, setPopup] = useState(null);
  const { fromDate, toDate } = filters;

  // The whole history, oldest first with a running balance; the period is cut from it here
  const loadLedger = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get('/dump-stock/ledger');
      const rows = Array.isArray(response?.rows) ? response.rows : [];
      setAllRows(rows.map((row) => {
        const weight = Number(row.weight || 0);
        const current = Number(row.balance || 0);
        return { ...row, day: toDayKey(row.date), weight, current, previous: isStockIn(row) ? current - weight : current + weight };
      }));
    } catch (err) {
      setError(err?.message || 'Error loading dump boulder');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLedger();
  }, [loadLedger]);

  // Esc leaves the page, unless a popup is open (it closes the popup itself)
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.defaultPrevented || event.key !== 'Escape' || popup || showFilters) return;
      navigate('/');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, popup, showFilters]);

  const currentStock = allRows.length ? allRows[allRows.length - 1].current : 0;
  const lastOut = [...allRows].reverse().find((row) => !isStockIn(row));
  const periodLabel = getPeriodLabel(filters);

  // The period: opening stock, its rows, and stock in / out
  const period = useMemo(() => {
    let opening = 0;
    const rows = [];
    for (const row of allRows) {
      if (fromDate && row.day < fromDate) {
        opening = row.current;
        continue;
      }
      if (toDate && row.day > toDate) continue;
      rows.push(row);
    }
    const stockIn = rows.filter(isStockIn).reduce((sum, row) => sum + row.weight, 0);
    const stockOut = rows.filter((row) => !isStockIn(row)).reduce((sum, row) => sum + row.weight, 0);
    return { rows, opening, stockIn, stockOut, closing: rows.length ? rows[rows.length - 1].current : opening };
  }, [allRows, fromDate, toDate]);

  // Newest entry on top, oldest at the bottom
  const visibleRows = useMemo(() => {
    const needle = filters.search.trim().toLowerCase();
    return period.rows.filter((row) => {
      if (filters.type && row.type !== filters.type) return false;
      if (!needle) return true;
      return [row.voucherNumber, row.vehicleNo, row.notes].some((value) => String(value || '').toLowerCase().includes(needle));
    }).reverse();
  }, [period.rows, filters.type, filters.search]);

  const isFiltered = Boolean(filters.type || filters.search.trim());
  const shownIn = visibleRows.filter(isStockIn).reduce((sum, row) => sum + row.weight, 0);
  const shownOut = visibleRows.filter((row) => !isStockIn(row)).reduce((sum, row) => sum + row.weight, 0);

  // Filters changed from the defaults (This Month, every entry, no search)
  const periodChanged = filters.preset !== DEFAULT_FILTERS.preset
    || filters.fromDate !== DEFAULT_FILTERS.fromDate
    || filters.toDate !== DEFAULT_FILTERS.toDate;
  const activeFilterCount = [
    periodChanged,
    filters.type,
    filters.search.trim()
  ].filter(Boolean).length;

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete ${row.voucherNumber}?`)) return;
    try {
      await apiClient.delete(`/dump-stock/${row._id}`);
      toast.success('Dump entry deleted');
      loadLedger();
    } catch (err) {
      toast.error(err?.message || 'Error deleting dump entry');
    }
  };

  const closePopup = () => {
    setPopup(null);
    loadLedger();
  };

  const stats = [
    { icon: Warehouse, label: 'Current Stock', tone: 'amber', value: ton(currentStock), hint: 'Boulder on the dump now' },
    { icon: TrendingUp, label: 'Stock In', tone: 'emerald', value: ton(period.stockIn), hint: `Dumped · ${periodLabel}` },
    { icon: TrendingDown, label: 'Stock Out', tone: 'blue', value: ton(period.stockOut), hint: `Used to hopper · ${periodLabel}` },
    { icon: CalendarClock, label: 'Last Used', tone: 'indigo', value: lastOut ? formatDate(lastOut.date) : '—', hint: lastOut ? `${ton(lastOut.weight)} to hopper` : 'Not used yet' }
  ];

  const renderActions = (row) => (canEdit ? (
    <div className="flex items-center justify-end">
      <button type="button" title="Edit" aria-label="Edit" className="icon-btn p-1.5 hover:bg-blue-50 hover:text-blue-600" onClick={() => setPopup({ type: row.type, entry: row })}>
        <Pencil size={15} />
      </button>
      <button type="button" title="Delete" aria-label="Delete" className="icon-btn p-1.5 hover:bg-rose-50 hover:text-rose-600" onClick={() => handleDelete(row)}>
        <Trash2 size={15} />
      </button>
    </div>
  ) : null);

  const initialLoading = loading && allRows.length === 0;

  return (
    <div className="page-fade-in space-y-3.5 px-3 pb-6 pt-3.5 md:space-y-4 lg:px-6 lg:pt-4">
      {showFilters && (
        <FilterPopup
          filters={filters}
          onClose={() => setShowFilters(false)}
          onApply={(next) => {
            setFilters(next);
            setShowFilters(false);
          }}
        />
      )}
      {popup?.type === 'to_dump' && <DumpSiteEntry editingEntry={popup.entry} onModalFinish={closePopup} />}
      {popup?.type === 'to_hopper' && <DumpToHopper editingEntry={popup.entry} onModalFinish={closePopup} />}

      <div className="page-header gap-2.5">
        <div className="min-w-0">
          <h1 className="page-title">Dump Boulder</h1>
          <p className="page-subtitle">Site boulder stock ledger · {periodLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFilters(true)}
            title="Filters"
            aria-haspopup="dialog"
            className={`relative inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold ring-1 ring-inset transition ${
              activeFilterCount > 0 ? 'bg-primary-50 text-primary-700 ring-primary-300' : 'bg-white text-slate-600 ring-slate-300 hover:bg-slate-50'
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
          <button type="button" className="icon-btn shrink-0" title="Refresh" aria-label="Refresh" onClick={loadLedger}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button type="button" className="btn-secondary" onClick={() => setPopup({ type: 'to_dump' })}>
            <ArrowUpFromLine size={17} className="text-emerald-600" /> Stock In
          </button>
          <button type="button" className="btn-primary" onClick={() => setPopup({ type: 'to_hopper' })}>
            <ArrowDownToLine size={17} /> Stock Out to Hopper
          </button>
        </div>
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700">{error}</div>}

      {initialLoading ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-primary-600 border-r-transparent" />
          <p className="text-sm text-slate-400">Loading dump boulder…</p>
        </div>
      ) : (
        <div className={`space-y-3.5 transition-opacity md:space-y-4 ${loading ? 'pointer-events-none opacity-50' : ''}`}>
          <section className="grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-4">
            {stats.map((stat) => <StatCard key={stat.label} compact {...stat} />)}
          </section>

          <section className="panel">
            {/* What the table is showing; each filter can be removed here */}
            <div className="panel-header flex flex-wrap items-center gap-2 py-2.5">
              <h3 className="mr-1 text-sm font-bold text-slate-900">Stock Ledger</h3>
              <FilterChip
                label={periodLabel}
                onClear={periodChanged
                  ? () => setFilters((prev) => ({ ...prev, preset: DEFAULT_FILTERS.preset, fromDate: DEFAULT_FILTERS.fromDate, toDate: DEFAULT_FILTERS.toDate }))
                  : undefined}
              />
              {filters.type && <FilterChip label={filters.type === 'to_dump' ? 'Stock In only' : 'Stock Out only'} onClear={() => setFilters((prev) => ({ ...prev, type: '' }))} />}
              {filters.search.trim() && <FilterChip label={`“${filters.search.trim()}”`} onClear={() => setFilters((prev) => ({ ...prev, search: '' }))} />}
              {activeFilterCount > 0 && (
                <button type="button" onClick={() => setFilters(DEFAULT_FILTERS)} className="text-xs font-semibold text-slate-500 transition hover:text-rose-600">Reset</button>
              )}
            </div>

            {/* Phone: one card per row, previous + in/out = current; newest on top */}
            <ul className="divide-y divide-slate-100 md:hidden">
              <li className="flex items-center justify-between bg-amber-50 px-4 py-2.5 text-sm">
                <span className="font-bold text-slate-700">Closing stock</span>
                <span className="font-black text-amber-700">{ton(period.closing)}</span>
              </li>
              {visibleRows.map((row) => (
                <li key={row._id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <TypeBadge row={row} />
                      <span className="truncate text-xs font-semibold text-slate-500">{formatDate(row.date)}</span>
                    </div>
                    {renderActions(row)}
                  </div>
                  <p className="mt-1.5 text-sm">
                    <span className="text-slate-500">{ton(row.previous)}</span>
                    <span className={`mx-1.5 font-bold ${isStockIn(row) ? 'text-emerald-700' : 'text-blue-700'}`}>{isStockIn(row) ? '+' : '−'} {ton(row.weight)}</span>
                    <span className="text-slate-400">=</span>
                    <span className="ml-1.5 font-black text-amber-700">{ton(row.current)}</span>
                  </p>
                  <p className="truncate text-[11px] text-slate-400">{[row.voucherNumber, row.vehicleNo, describeWeight(row), row.notes].filter(Boolean).join(' · ')}</p>
                </li>
              ))}
              {visibleRows.length === 0 && (
                <li className="flex flex-col items-center gap-2 px-6 py-10 text-center text-sm text-slate-500"><Inbox size={22} className="text-slate-300" />No entries in this period</li>
              )}
              <li className="flex items-center justify-between bg-slate-50 px-4 py-2.5 text-sm">
                <span className="font-semibold text-slate-600">Opening stock</span>
                <span className="font-bold text-slate-800">{ton(period.opening)}</span>
              </li>
            </ul>

            {/* Desktop: the ledger table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[980px] text-left">
                <thead>
                  <tr>
                    <th className={`${TH} w-10`}>#</th>
                    <th className={TH}>Date</th>
                    <th className={TH}>Type</th>
                    <th className={TH}>Entry No</th>
                    <th className={TH}>Vehicle / Details</th>
                    <th className={`${TH} text-right`}>Previous Stock</th>
                    <th className={`${TH} bg-emerald-50/60 text-right text-emerald-800`}>Stock In</th>
                    <th className={`${TH} bg-blue-50/60 text-right text-blue-800`}>Stock Out</th>
                    <th className={`${TH} bg-amber-50/70 text-right text-amber-800`}>Current Stock</th>
                    <th className={TH} />
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-amber-200 bg-amber-50">
                    <td className={TD} />
                    <td className={`${TD} whitespace-nowrap font-semibold text-slate-700`}>{toDate ? formatDate(toDate) : 'Now'}</td>
                    <td className={`${TD} font-bold text-slate-900`} colSpan={6}>Closing stock</td>
                    <td className={`${TD} whitespace-nowrap text-right text-base font-black text-amber-700`}>{ton(period.closing)}</td>
                    <td className={TD} />
                  </tr>
                  {visibleRows.map((row, index) => (
                    <tr key={row._id} className="tbl-row">
                      <td className={`${TD} text-xs text-slate-400`}>{index + 1}</td>
                      <td className={`${TD} whitespace-nowrap font-medium text-slate-800`}>{formatDate(row.date)}</td>
                      <td className={TD}><TypeBadge row={row} /></td>
                      <td className={`${TD} whitespace-nowrap text-xs font-semibold text-slate-500`}>{row.voucherNumber}</td>
                      <td className={TD}>
                        {row.vehicleNo ? <span className="font-mono text-xs font-bold text-slate-800">{row.vehicleNo}</span> : <span className="text-xs text-slate-400">—</span>}
                        {(describeWeight(row) || row.notes) && (
                          <p className="max-w-[16rem] truncate text-[11px] text-slate-400" title={row.notes || undefined}>{[describeWeight(row), row.notes].filter(Boolean).join(' · ')}</p>
                        )}
                      </td>
                      <td className={`${TD} whitespace-nowrap text-right text-slate-500`}>{ton(row.previous)}</td>
                      <td className={`${TD} whitespace-nowrap bg-emerald-50/40 text-right font-bold text-emerald-700`}>{isStockIn(row) ? `+ ${ton(row.weight)}` : ''}</td>
                      <td className={`${TD} whitespace-nowrap bg-blue-50/40 text-right font-bold text-blue-700`}>{!isStockIn(row) ? `− ${ton(row.weight)}` : ''}</td>
                      <td className={`${TD} whitespace-nowrap bg-amber-50/60 text-right font-black text-amber-700`}>{ton(row.current)}</td>
                      <td className={`${TD} py-1!`}>{renderActions(row)}</td>
                    </tr>
                  ))}
                  {visibleRows.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-6 py-12 text-center">
                        <Inbox size={24} className="mx-auto text-slate-300" />
                        <p className="mt-2 text-sm font-semibold text-slate-700">No entries in this period</p>
                        <p className="text-xs text-slate-500">Use "Stock In" when boulder is unloaded on the dump, and "Stock Out to Hopper" when it is fed.</p>
                      </td>
                    </tr>
                  )}
                  <tr className="border-t border-slate-200 bg-slate-50">
                    <td className={TD} />
                    <td className={`${TD} whitespace-nowrap font-semibold text-slate-600`}>{fromDate ? formatDate(fromDate) : '—'}</td>
                    <td className={`${TD} font-semibold text-slate-600`} colSpan={6}>Opening stock</td>
                    <td className={`${TD} bg-amber-50/70 text-right font-bold text-slate-800`}>{ton(period.opening)}</td>
                    <td className={TD} />
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-slate-50">
                    <td className={`${TD} font-bold text-slate-900`} colSpan={5}>
                      {isFiltered ? 'Total of rows shown' : 'Total'}
                      <span className="ml-2 text-xs font-medium text-slate-500">{visibleRows.length} entr{visibleRows.length === 1 ? 'y' : 'ies'}</span>
                    </td>
                    <td className={TD} />
                    <td className={`${TD} whitespace-nowrap bg-emerald-50/60 text-right font-black text-emerald-700`}>+ {ton(shownIn)}</td>
                    <td className={`${TD} whitespace-nowrap bg-blue-50/60 text-right font-black text-blue-700`}>− {ton(shownOut)}</td>
                    <td className={`${TD} bg-amber-50/70`} />
                    <td className={TD} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
