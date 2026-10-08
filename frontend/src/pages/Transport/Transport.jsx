import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, ChevronRight, ClipboardList, HandCoins, Inbox, Pencil, Plus, RefreshCw, Scale, Search, Trash2, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import apiClient from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import StatCard from '../../components/StatCard';
import Segmented from '../../components/Segmented';
import CustomRangePopup, { toLocalDateInput, formatRangeLabel } from '../../components/CustomRangePopup';
import MonthPickerPopup, { getMonthRange, formatMonthLabel } from '../../components/MonthPickerPopup';
import { describeTransportBasis } from '../../utils/transport';
import TransportEntryPopup from './component/TransportEntryPopup';

// The two views of the data panel
const TABS = [
  { key: 'entries', label: 'Entries', icon: ClipboardList },
  { key: 'parties', label: 'Transporter Ledger', shortLabel: 'Ledger', icon: Users }
];

const KIND_FILTERS = [
  { key: '', label: 'All' },
  { key: 'receivable', label: 'Income' },
  { key: 'payable', label: 'Hire Cost', shortLabel: 'Cost' }
];

const PRESETS = [
  { key: '', label: 'All' },
  { key: 'today', label: 'Today' },
  { key: 'last7', label: '7 Days' },
  { key: 'last30', label: '30 Days' },
  { key: 'monthWise', label: 'Month' },
  { key: 'yearWise', label: 'This Year', shortLabel: 'Year' },
  { key: 'custom', label: 'Custom' }
];

const TH = 'tbl-head px-3 py-2 first:pl-5 last:pr-5';
const TD = 'tbl-cell px-3 py-2 first:pl-5 last:pr-5';

const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString('en-IN', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
})}`;

const formatDate = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Local calendar day (toISOString would shift early-morning IST times to the previous day)
const toDayKey = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return toLocalDateInput(date);
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
  if (preset === 'yearWise') {
    return { fromDate: toDayKey(new Date(now.getFullYear(), 0, 1)), toDate: toDayKey(new Date(now.getFullYear(), 11, 31)) };
  }
  return { fromDate: '', toDate: '' };
};

const entryCount = (count) => `${count} entr${count === 1 ? 'y' : 'ies'}`;

const isIncome = (entry) => entry.direction === 'receivable';

// What the entry is for, in a few words
const getEntryKindLabel = (entry) => {
  if (entry.billedInSale) return 'Charged in sale';
  if (entry.source === 'sale') return 'Hired for sale';
  return isIncome(entry) ? 'My vehicle given' : 'Hired vehicle';
};

const getBalanceLabel = (balance) => {
  if (balance < 0) return `You pay ${formatCurrency(Math.abs(balance))}`;
  if (balance > 0) return `You receive ${formatCurrency(balance)}`;
  return 'Settled';
};

const getBalanceClass = (balance) => {
  if (balance < 0) return 'text-rose-700';
  if (balance > 0) return 'text-emerald-700';
  return 'text-slate-500';
};

/** Vehicle number as a small monospace chip. */
function Plate({ children }) {
  return (
    <span className="inline-block max-w-full truncate rounded-md bg-slate-100 px-2 py-0.5 align-middle font-mono text-xs font-semibold tracking-wide text-slate-800 ring-1 ring-inset ring-slate-200">
      {children}
    </span>
  );
}

export default function Transport() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canAdd = user?.role === 'owner' || user?.permissions?.add;
  const canEdit = user?.role !== 'employee' && (user?.role === 'owner' || user?.permissions?.edit);
  const [entries, setEntries] = useState([]);
  const [parties, setParties] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [kindFilter, setKindFilter] = useState('');
  const [datePreset, setDatePreset] = useState('');
  const [{ fromDate, toDate }, setDateRange] = useState({ fromDate: '', toDate: '' });
  const [tab, setTab] = useState('entries');
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth()));
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const rangeBeforeCustomRef = useRef({ preset: '', range: { fromDate: '', toDate: '' } });

  useEffect(() => {
    const handleKeyDown = (event) => {
      // With a popup open, Esc closes the popup instead of leaving the page
      if (event.defaultPrevented) return;
      if (event.key === 'Escape' && !showCustomPicker && !showMonthPicker && !showForm) {
        navigate('/');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, showCustomPicker, showMonthPicker, showForm]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [entryResponse, partyResponse, vehicleResponse, outstandingResponse] = await Promise.all([
        apiClient.get('/transport'),
        apiClient.get('/parties'),
        apiClient.get('/vehicles'),
        apiClient.get('/reports/outstanding')
      ]);
      setEntries(Array.isArray(entryResponse) ? entryResponse : []);
      setParties(Array.isArray(partyResponse) ? partyResponse : []);
      setVehicles(Array.isArray(vehicleResponse) ? vehicleResponse : []);
      setBalances(Array.isArray(outstandingResponse?.partyOutstanding) ? outstandingResponse.partyOutstanding : []);
    } catch (err) {
      setError(err.message || 'Error loading transport entries');
    } finally {
      setLoading(false);
    }
  };

  // Anyone but the cash party can hire out or hire a vehicle; transporters come first
  const partyOptions = useMemo(() => parties
    .filter((party) => party.type !== 'cash-in-hand')
    .sort((a, b) => (
      Number(b.type === 'transporter') - Number(a.type === 'transporter')
      || String(a.name || '').localeCompare(String(b.name || ''))
    )), [parties]);

  // ─── Entries in the selected period (search / kind applied after) ───────────
  const periodEntries = useMemo(() => entries.filter((entry) => {
    const day = toDayKey(entry.entryDate || entry.createdAt);
    if (!day) return false;
    if (fromDate && day < fromDate) return false;
    if (toDate && day > toDate) return false;
    return true;
  }), [entries, fromDate, toDate]);

  const filteredEntries = useMemo(() => {
    const normalizedSearch = String(searchTerm || '').trim().toLowerCase();
    return periodEntries.filter((entry) => {
      if (kindFilter && entry.direction !== kindFilter) return false;
      if (!normalizedSearch) return true;
      return [entry.vehicleNo, entry.partyName, entry.entryNumber, entry.invoiceNumber, entry.notes]
        .some((value) => String(value || '').toLowerCase().includes(normalizedSearch));
    });
  }, [periodEntries, searchTerm, kindFilter]);

  const periodTotals = useMemo(() => periodEntries.reduce((acc, entry) => {
    const amount = Number(entry.amount || 0);
    if (isIncome(entry)) {
      acc.income += amount;
      acc.incomeCount += 1;
      if (entry.billedInSale) acc.saleIncome += amount;
    } else {
      acc.cost += amount;
      acc.costCount += 1;
    }
    return acc;
  }, { income: 0, incomeCount: 0, saleIncome: 0, cost: 0, costCount: 0 }), [periodEntries]);

  const listTotals = useMemo(() => filteredEntries.reduce((acc, entry) => {
    if (isIncome(entry)) acc.income += Number(entry.amount || 0);
    else acc.cost += Number(entry.amount || 0);
    return acc;
  }, { income: 0, cost: 0 }), [filteredEntries]);

  /**
   * One row per party I hire vehicles from or give vehicles to.
   * Hired / given are this period's transport; the balance is the party's whole ledger as of today,
   * so it also reflects payments, receipts and any sales or purchases with them.
   */
  const partySummary = useMemo(() => {
    const map = new Map();
    const rowFor = (partyId, name, type) => {
      const key = String(partyId);
      if (!map.has(key)) map.set(key, { partyId: key, partyName: name || '-', partyType: type || '', hired: 0, given: 0, count: 0 });
      return map.get(key);
    };

    for (const party of parties) {
      if (party.type === 'transporter') rowFor(party._id, party.name, party.type);
    }

    for (const entry of periodEntries) {
      // A transport charge inside a sale belongs to that customer's sale, not to a transporter account
      if (entry.billedInSale || !entry.partyId) continue;
      const row = rowFor(entry.partyId, entry.partyName, entry.partyType);
      if (isIncome(entry)) row.given += Number(entry.amount || 0);
      else row.hired += Number(entry.amount || 0);
      row.count += 1;
    }

    const balanceByParty = new Map(balances.map((row) => [String(row.partyId), Number(row.netBalance || 0)]));
    return [...map.values()]
      .map((row) => ({ ...row, balance: balanceByParty.get(row.partyId) || 0 }))
      .sort((a, b) => a.balance - b.balance || a.partyName.localeCompare(b.partyName));
  }, [parties, periodEntries, balances]);

  const toPay = partySummary.reduce((sum, row) => sum + (row.balance < 0 ? Math.abs(row.balance) : 0), 0);
  const toReceive = partySummary.reduce((sum, row) => sum + (row.balance > 0 ? row.balance : 0), 0);
  const net = periodTotals.income - periodTotals.cost;

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

  const openForm = (entry = null) => {
    setEditingEntry(entry);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingEntry(null);
  };

  const handleSaved = () => {
    closeForm();
    loadData();
  };

  const handleDelete = async (entry) => {
    if (!window.confirm(`Delete transport entry ${entry.entryNumber}?`)) return;

    try {
      await apiClient.delete(`/transport/${entry._id}`);
      toast.success('Transport entry deleted');
      await loadData();
    } catch (err) {
      setError(err.message || 'Error deleting transport entry');
    }
  };

  const initialLoading = loading && entries.length === 0 && parties.length === 0;

  const stats = [
    {
      icon: ArrowDownLeft, label: 'Transport Income', tone: 'emerald',
      value: formatCurrency(periodTotals.income),
      hint: periodTotals.income > 0 ? `${formatCurrency(periodTotals.saleIncome)} charged in sales` : 'Nothing charged yet'
    },
    { icon: ArrowUpRight, label: 'Hire Cost', tone: 'rose', value: formatCurrency(periodTotals.cost), hint: entryCount(periodTotals.costCount) },
    {
      icon: Scale, label: net < 0 ? 'Transport Loss' : 'Transport Profit', tone: net < 0 ? 'amber' : 'blue',
      value: formatCurrency(Math.abs(net)),
      hint: 'Income − hire cost'
    },
    {
      icon: HandCoins, label: 'To Pay Transporters', tone: 'indigo',
      value: formatCurrency(toPay),
      hint: toReceive > 0 ? `To receive ${formatCurrency(toReceive)}` : 'Balance as of today'
    }
  ];

  const renderAmount = (entry) => (
    <span className={`font-bold ${isIncome(entry) ? 'text-emerald-700' : 'text-rose-700'}`}>
      {isIncome(entry) ? '+' : '−'} {formatCurrency(entry.amount)}
    </span>
  );

  const renderKind = (entry) => (
    <span className={isIncome(entry) ? 'badge-green' : 'badge-red'}>{getEntryKindLabel(entry)}</span>
  );

  // Entries that come from a sale are changed by editing the sale
  const renderActions = (entry) => (entry.source === 'sale' ? (
    <p className="text-right text-[11px] font-medium text-slate-400">{entry.invoiceNumber || 'Sale'}</p>
  ) : (
    <div className="flex items-center justify-end">
      {canEdit && (
        <>
          <button type="button" title="Edit" aria-label="Edit" className="icon-btn p-1.5 hover:bg-blue-50 hover:text-blue-600" onClick={() => openForm(entry)}>
            <Pencil size={16} />
          </button>
          <button type="button" title="Delete" aria-label="Delete" className="icon-btn p-1.5 hover:bg-rose-50 hover:text-rose-600" onClick={() => handleDelete(entry)}>
            <Trash2 size={16} />
          </button>
        </>
      )}
    </div>
  ));

  const renderEmpty = (title, text) => (
    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Inbox size={20} />
      </span>
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <p className="text-xs text-slate-500">{text}</p>
    </div>
  );

  return (
    <div className="page-fade-in space-y-3.5 px-3 pb-6 pt-3.5 md:space-y-4 lg:px-6 lg:pt-4">
      {showMonthPicker && (
        <MonthPickerPopup
          month={selectedMonth}
          year={selectedYear}
          subtitle="Choose the year, then the month to view transport entries"
          onApply={applyMonth}
          onClose={closeMonthPicker}
        />
      )}
      {showCustomPicker && (
        <CustomRangePopup from={fromDate} to={toDate} onApply={applyCustomRange} onClose={closeCustomPicker} />
      )}
      {showForm && (
        <TransportEntryPopup
          entry={editingEntry}
          parties={partyOptions}
          vehicles={vehicles}
          onClose={closeForm}
          onSaved={handleSaved}
        />
      )}

      <div className="page-header gap-2.5">
        <div className="min-w-0">
          <h1 className="page-title">Transport</h1>
          <p className="page-subtitle">Transport charged to parties and vehicles hired from transporters · {periodLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented options={PRESETS} value={datePreset} onChange={handlePresetChange} />
          {canAdd && (
            <button type="button" className="btn-primary" onClick={() => openForm()}>
              <Plus size={18} /> Add Entry
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700">{error}</div>
      )}

      {initialLoading ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-primary-600 border-r-transparent" />
          <p className="text-sm text-slate-400">Loading transport…</p>
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
                {tab === 'entries' && (
                  <>
                    <Segmented options={KIND_FILTERS} value={kindFilter} onChange={setKindFilter} className="shrink-0" />
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
                  </>
                )}
                <button type="button" className="icon-btn shrink-0" title="Refresh" aria-label="Refresh" onClick={loadData}>
                  <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {tab === 'entries' && (filteredEntries.length === 0
              ? renderEmpty(
                'No transport entries found',
                entries.length === 0
                  ? 'Add a transport charge on a sale, or use "Add Entry" for vehicle rent.'
                  : 'Try changing the search or the period.'
              )
              : (
                <>
                  {/* Phone: three short lines per entry */}
                  <ul className="divide-y divide-slate-100 md:hidden">
                    {filteredEntries.map((entry) => (
                      <li key={entry._id} className="px-4 py-2.5">
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="min-w-0 truncate text-sm font-semibold text-slate-800">{entry.partyName || '—'}</p>
                          <p className="shrink-0 text-sm">{renderAmount(entry)}</p>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-2">
                            {entry.vehicleNo && <Plate>{entry.vehicleNo}</Plate>}
                            <span className="shrink-0 text-xs text-slate-500">{formatDate(entry.entryDate)}</span>
                          </div>
                          {renderKind(entry)}
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="min-w-0 truncate text-[11px] text-slate-400">{entry.entryNumber} · {describeTransportBasis(entry)}</p>
                          {renderActions(entry)}
                        </div>
                      </li>
                    ))}
                  </ul>

                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[820px] text-left">
                      <thead>
                        <tr>
                          <th className={TH}>Date</th>
                          <th className={TH}>Party / Vehicle</th>
                          <th className={TH}>Type</th>
                          <th className={TH}>Charged As</th>
                          <th className={`${TH} text-right`}>Amount</th>
                          <th className={TH} />
                        </tr>
                      </thead>
                      <tbody>
                        {filteredEntries.map((entry) => (
                          <tr key={entry._id} className="tbl-row">
                            <td className={`${TD} whitespace-nowrap`}>
                              {formatDate(entry.entryDate)}
                              <span className="block text-[11px] leading-tight text-slate-400">{entry.entryNumber}</span>
                            </td>
                            <td className={TD}>
                              <p className="max-w-[18rem] truncate font-semibold text-slate-800" title={entry.partyName || undefined}>{entry.partyName || '—'}</p>
                              {entry.vehicleNo && <Plate>{entry.vehicleNo}</Plate>}
                            </td>
                            <td className={TD}>{renderKind(entry)}</td>
                            <td className={TD}>
                              {describeTransportBasis(entry)}
                              {(entry.fromDate || entry.toDate || entry.notes) && (
                                <span className="block max-w-[16rem] truncate text-[11px] leading-tight text-slate-400">
                                  {[
                                    entry.fromDate || entry.toDate ? `${formatDate(entry.fromDate)} → ${formatDate(entry.toDate)}` : '',
                                    entry.notes
                                  ].filter(Boolean).join(' · ')}
                                </span>
                              )}
                            </td>
                            <td className={`${TD} whitespace-nowrap text-right`}>{renderAmount(entry)}</td>
                            <td className={`${TD} py-1!`}>{renderActions(entry)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-slate-200 bg-slate-50">
                          <td className={`${TD} font-bold text-slate-900`} colSpan={4}>
                            Total
                            <span className="ml-2 text-xs font-medium text-slate-500">
                              Income {formatCurrency(listTotals.income)} · Hire cost {formatCurrency(listTotals.cost)}
                            </span>
                          </td>
                          <td className={`${TD} whitespace-nowrap text-right font-bold ${listTotals.income - listTotals.cost < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                            {listTotals.income - listTotals.cost < 0 ? '−' : '+'} {formatCurrency(Math.abs(listTotals.income - listTotals.cost))}
                          </td>
                          <td className={TD} />
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-0.5 border-t border-slate-100 px-4 py-2 text-xs text-slate-500 md:px-5">
                    <span>Showing {filteredEntries.length} of {entryCount(periodEntries.length)}</span>
                    {/* The table has its own total row; phones get the totals here */}
                    <span className="font-semibold text-slate-700 md:hidden">
                      Income {formatCurrency(listTotals.income)} · Cost {formatCurrency(listTotals.cost)}
                    </span>
                  </div>
                </>
              ))}

            {tab === 'parties' && (partySummary.length === 0
              ? renderEmpty('No transporters yet', 'Add a party of type Transporter, or enter a transport entry.')
              : (
                <>
                  <ul className="divide-y divide-slate-100 md:hidden">
                    {partySummary.map((row) => (
                      <li key={row.partyId}>
                        <button type="button" onClick={() => navigate(`/party/${row.partyId}`)} className="w-full px-4 py-2.5 text-left active:bg-slate-50">
                          <div className="flex items-baseline justify-between gap-3">
                            <p className="min-w-0 truncate text-sm font-semibold text-slate-800">{row.partyName}</p>
                            <span className={`shrink-0 text-sm font-bold ${getBalanceClass(row.balance)}`}>{getBalanceLabel(row.balance)}</span>
                          </div>
                          <p className="mt-1 text-xs text-slate-500">
                            Hired {formatCurrency(row.hired)} · Given {formatCurrency(row.given)} · {entryCount(row.count)}
                          </p>
                        </button>
                      </li>
                    ))}
                  </ul>

                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[760px] text-left">
                      <thead>
                        <tr>
                          <th className={`${TH} w-10`}>#</th>
                          <th className={TH}>Party</th>
                          <th className={`${TH} text-right`}>Entries</th>
                          <th className={`${TH} text-right`}>Vehicles Hired</th>
                          <th className={`${TH} text-right`}>My Vehicles Given</th>
                          <th className={`${TH} text-right`}>Balance Today</th>
                          <th className={`${TH} w-8`} />
                        </tr>
                      </thead>
                      <tbody>
                        {partySummary.map((row, index) => (
                          <tr key={row.partyId} onClick={() => navigate(`/party/${row.partyId}`)} className="tbl-row cursor-pointer">
                            <td className={`${TD} text-slate-400`}>{index + 1}</td>
                            <td className={TD}>
                              <p className="max-w-[20rem] truncate font-semibold text-slate-800" title={row.partyName}>{row.partyName}</p>
                              <span className="text-[11px] capitalize text-slate-400">{row.partyType || 'party'}</span>
                            </td>
                            <td className={`${TD} text-right`}>{row.count}</td>
                            <td className={`${TD} whitespace-nowrap text-right font-semibold text-rose-700`}>{formatCurrency(row.hired)}</td>
                            <td className={`${TD} whitespace-nowrap text-right font-semibold text-emerald-700`}>{formatCurrency(row.given)}</td>
                            <td className={`${TD} whitespace-nowrap text-right font-bold ${getBalanceClass(row.balance)}`}>{getBalanceLabel(row.balance)}</td>
                            <td className={`${TD} text-slate-300`}><ChevronRight size={16} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500 md:px-5">
                    Hired and given cover the selected period ({periodLabel}). Balance is the party&apos;s full ledger as of today, after payments and receipts · tap a party to open the ledger
                  </p>
                </>
              ))}
          </section>
        </div>
      )}
    </div>
  );
}
