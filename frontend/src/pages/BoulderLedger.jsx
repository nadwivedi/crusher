import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Eye, Pencil, RefreshCw, Search, Trash2, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../utils/api';
import { useAuth } from '../context/AuthContext';
import BoulderEntry from './BoulderEntry/BoulderEntry';

const formatNumber = (value) => Number(value || 0).toLocaleString('en-IN', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});

const formatCurrency = (value) => `Rs ${Number(value || 0).toLocaleString('en-IN', {
  minimumFractionDigits: 2,
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

const toInputDate = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
};

const resolvePresetRange = (preset) => {
  const now = new Date();
  const today = toInputDate(now);

  if (preset === 'last7') {
    const start = new Date(now);
    start.setDate(start.getDate() - 6);
    return { fromDate: toInputDate(start), toDate: today };
  }

  if (preset === 'last30') {
    const start = new Date(now);
    start.setDate(start.getDate() - 29);
    return { fromDate: toInputDate(start), toDate: today };
  }

  if (preset === 'monthWise') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { fromDate: toInputDate(start), toDate: toInputDate(end) };
  }

  if (preset === 'last1Year') {
    const start = new Date(now);
    start.setFullYear(start.getFullYear() - 1);
    start.setDate(start.getDate() + 1);
    return { fromDate: toInputDate(start), toDate: today };
  }

  if (preset === 'yearWise') {
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear(), 11, 31);
    return { fromDate: toInputDate(start), toDate: toInputDate(end) };
  }

  return { fromDate: '', toDate: '' };
};

export default function BoulderLedger() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canDeleteBoulders = user?.role !== 'employee' && (user?.role === 'owner' || user?.permissions?.edit);
  const [boulders, setBoulders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [datePreset, setDatePreset] = useState('');
  const [{ fromDate, toDate }, setDateRange] = useState({ fromDate: '', toDate: '' });
  const [editingEntry, setEditingEntry] = useState(null);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        navigate('/');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

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

  const filteredBoulders = useMemo(() => {
    const normalizedSearch = String(searchTerm || '').trim().toLowerCase();

    return boulders.filter((entry) => {
      const vehicleText = String(entry.vehicleNo || '').toLowerCase();
      const partyText = String(entry.partyName || '').toLowerCase();
      const matchesSearch = !normalizedSearch || vehicleText.includes(normalizedSearch) || partyText.includes(normalizedSearch);
      if (!matchesSearch) return false;

      const entryDate = new Date(entry.boulderDate || entry.createdAt);
      if (Number.isNaN(entryDate.getTime())) return false;
      const entryDateText = toInputDate(entryDate);

      if (fromDate && entryDateText < fromDate) return false;
      if (toDate && entryDateText > toDate) return false;

      return true;
    });
  }, [boulders, searchTerm, fromDate, toDate]);

  const summary = useMemo(() => {
    return filteredBoulders.reduce((acc, entry) => ({
      count: acc.count + 1,
      grossWeight: acc.grossWeight + Number(entry.grossWeight || 0),
      tareWeight: acc.tareWeight + Number(entry.tareWeight || 0),
      netWeight: acc.netWeight + Number(entry.netWeight || 0),
      amount: acc.amount + Number(entry.amount || 0)
    }), {
      count: 0,
      grossWeight: 0,
      tareWeight: 0,
      netWeight: 0,
      amount: 0
    });
  }, [filteredBoulders]);

  const StatCard = ({ title, value, subtitle }) => (
    <div className="rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-lg">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{title}</p>
      <p className="mt-2 text-2xl font-black text-slate-800">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
    </div>
  );

  const handlePresetChange = (value) => {
    setDatePreset(value);
    const resolvedRange = resolvePresetRange(value);
    setDateRange(resolvedRange);
  };

  const handleEdit = (entry) => {
    setEditingEntry(entry);
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

  const getPartyDisplayName = (entry) => String(entry?.partyName || '').trim() || '-';

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-stone-100">
        <div className="text-center">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-sky-500" />
          <p className="mt-4 font-semibold text-slate-600">Loading boulder ledger...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-stone-100">
      <div className="mx-auto max-w-[95%] px-4 py-6">
        {editingEntry ? (
          <BoulderEntry
            editingEntry={editingEntry}
            onModalFinish={handleCloseEdit}
          />
        ) : null}

        {error && (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm font-semibold text-rose-700 shadow-lg">
            {error}
          </div>
        )}

        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-5">
          <StatCard title="Entries" value={formatNumber(summary.count)} subtitle="filtered boulder entries" />
          <StatCard title="Gross Weight" value={formatNumber(summary.grossWeight)} subtitle="total gross kg" />
          <StatCard title="Tare Weight" value={formatNumber(summary.tareWeight)} subtitle="total tare kg" />
          <StatCard title="Net Weight" value={formatNumber(summary.netWeight)} subtitle="total net kg" />
          <StatCard title="Total Amount" value={formatCurrency(summary.amount)} subtitle="total payable amount" />
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-xl">
          <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-800">Boulder Ledger</h2>
                <p className="text-sm text-slate-500">All boulder entries in one report</p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search vehicle or party..."
                    className="w-full rounded-xl border-2 border-slate-400 bg-white py-2.5 pl-10 pr-4 text-sm font-medium text-slate-700 transition-all focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-100 sm:w-64"
                  />
                </div>

                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <select
                    value={datePreset}
                    onChange={(e) => handlePresetChange(e.target.value)}
                    className="w-full rounded-xl border-2 border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm font-medium text-slate-700 transition-all focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-100 sm:w-52"
                  >
                    <option value="">All Dates</option>
                    <option value="last7">Last 7 Days</option>
                    <option value="last30">Last 30 Days</option>
                    <option value="monthWise">Month Wise</option>
                    <option value="last1Year">Last 1 Year</option>
                    <option value="yearWise">Year Wise</option>
                    <option value="custom">Custom Range</option>
                  </select>
                </div>

                {datePreset === 'custom' && (
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={fromDate}
                      max={toDate || undefined}
                      onChange={(e) => setDateRange((prev) => ({ ...prev, fromDate: e.target.value }))}
                      aria-label="From date"
                      className="rounded-xl border-2 border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 transition-all focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-100"
                    />
                    <span className="text-sm font-semibold text-slate-500">to</span>
                    <input
                      type="date"
                      value={toDate}
                      min={fromDate || undefined}
                      onChange={(e) => setDateRange((prev) => ({ ...prev, toDate: e.target.value }))}
                      aria-label="To date"
                      className="rounded-xl border-2 border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 transition-all focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-100"
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={loadBoulders}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-900"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          <div className="md:hidden">
            {filteredBoulders.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 p-4">
                {filteredBoulders.map((entry) => (
                  <div key={entry._id} className="group relative overflow-hidden rounded-[24px] border border-slate-100 bg-white p-5 shadow-md transition-all hover:shadow-xl">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-lg shadow-sky-500/20">
                          <Truck className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{formatDate(entry.boulderDate || entry.createdAt)}</p>
                          <h3 className="text-base font-black text-slate-800">{entry.vehicleNo || '-'}</h3>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(entry)}
                          className="p-2 rounded-xl border border-slate-100 bg-slate-50 text-blue-600 hover:bg-blue-50"
                        >
                          <Pencil size={16} />
                        </button>
                        {canDeleteBoulders && (
                          <button
                            type="button"
                            onClick={() => handleDelete(entry._id)}
                            className="p-2 rounded-xl border border-slate-100 bg-slate-50 text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center rounded-xl bg-slate-50 px-4 py-2.5">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Supplier</span>
                        <span className="text-xs font-black text-slate-700 truncate max-w-[150px]">{getPartyDisplayName(entry)}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-600 mb-1">Net Weight</p>
                          <p className="text-sm font-black text-emerald-700">{formatNumber(entry.netWeight)} <span className="text-[10px]">KG</span></p>
                        </div>
                        <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2.5">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-rose-600 mb-1">Total Amount</p>
                          <p className="text-sm font-black text-rose-700">{formatCurrency(entry.amount)}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                        <div className="flex gap-4">
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Time In</p>
                            <p className="text-[11px] font-black text-slate-600">{entry.entryTime || '-'}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Time Out</p>
                            <p className="text-[11px] font-black text-slate-600">{entry.exitTime || '-'}</p>
                          </div>
                        </div>
                        {entry.slipImg && (
                          <a
                            href={entry.slipImg}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 rounded-lg bg-sky-500 px-3 py-1.5 text-[10px] font-bold text-white shadow-sm shadow-sky-500/20"
                          >
                            <Eye size={12} />
                            SLIP
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-6 py-16 text-center">
                <p className="text-sm font-bold text-slate-500">No entries found for the selected filters.</p>
              </div>
            )}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[1120px]">
              <thead>
                <tr className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white">
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider lg:px-4 lg:py-3 lg:text-[10px] xl:px-6 xl:py-4 xl:text-xs">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider lg:px-4 lg:py-3 lg:text-[10px] xl:px-6 xl:py-4 xl:text-xs">Vehicle/Party</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider lg:px-4 lg:py-3 lg:text-[10px] xl:px-6 xl:py-4 xl:text-xs">Entry Time</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider lg:px-4 lg:py-3 lg:text-[10px] xl:px-6 xl:py-4 xl:text-xs">Exit Time</th>
                  <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider lg:px-4 lg:py-3 lg:text-[10px] xl:px-6 xl:py-4 xl:text-xs">Gross Wt</th>
                  <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider lg:px-4 lg:py-3 lg:text-[10px] xl:px-6 xl:py-4 xl:text-xs">Tare Wt</th>
                  <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider lg:px-4 lg:py-3 lg:text-[10px] xl:px-6 xl:py-4 xl:text-xs">Net Wt</th>
                  <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider lg:px-4 lg:py-3 lg:text-[10px] xl:px-6 xl:py-4 xl:text-xs">Rate (Rs/Ton)</th>
                  <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider lg:px-4 lg:py-3 lg:text-[10px] xl:px-6 xl:py-4 xl:text-xs">Amount</th>
                  <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider lg:px-4 lg:py-3 lg:text-[10px] xl:px-6 xl:py-4 xl:text-xs">Slip</th>
                  <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider lg:px-4 lg:py-3 lg:text-[10px] xl:px-6 xl:py-4 xl:text-xs">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBoulders.length > 0 ? (
                  filteredBoulders.map((entry) => (
                    <tr key={entry._id} className="transition-colors hover:bg-sky-50/50">
                      <td className="px-6 py-4 text-sm font-medium text-slate-700 lg:px-4 lg:py-3 lg:text-[12px] xl:px-6 xl:py-4 xl:text-sm">{formatDate(entry.boulderDate || entry.createdAt)}</td>
                      <td className="px-6 py-4 lg:px-4 lg:py-3 xl:px-6 xl:py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-cyan-500 text-white">
                            <Truck className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-800 lg:text-[12px] xl:text-sm">{entry.vehicleNo || '-'}</p>
                            <p className="mt-0.5 truncate text-xs font-medium text-slate-500">{getPartyDisplayName(entry)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-700 lg:px-4 lg:py-3 lg:text-[12px] xl:px-6 xl:py-4 xl:text-sm">{entry.entryTime || ''}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-700 lg:px-4 lg:py-3 lg:text-[12px] xl:px-6 xl:py-4 xl:text-sm">{entry.exitTime || ''}</td>
                      <td className="px-6 py-4 text-right text-sm font-semibold text-slate-700 lg:px-4 lg:py-3 lg:text-[12px] xl:px-6 xl:py-4 xl:text-sm">{formatNumber(entry.grossWeight)}</td>
                      <td className="px-6 py-4 text-right text-sm font-semibold text-slate-700 lg:px-4 lg:py-3 lg:text-[12px] xl:px-6 xl:py-4 xl:text-sm">{formatNumber(entry.tareWeight)}</td>
                      <td className="px-6 py-4 text-right text-sm font-black text-emerald-600 lg:px-4 lg:py-3 lg:text-[12px] xl:px-6 xl:py-4 xl:text-sm">{formatNumber(entry.netWeight)}</td>
                      <td className="px-6 py-4 text-right text-sm font-semibold text-blue-700 lg:px-4 lg:py-3 lg:text-[12px] xl:px-6 xl:py-4 xl:text-sm">{formatNumber(entry.boulderRatePerTon)}</td>
                      <td className="px-6 py-4 text-right text-sm font-black text-rose-700 lg:px-4 lg:py-3 lg:text-[12px] xl:px-6 xl:py-4 xl:text-sm">{formatCurrency(entry.amount)}</td>
                      <td className="px-6 py-4 text-center lg:px-4 lg:py-3 xl:px-6 xl:py-4">
                        {entry.slipImg ? (
                          <a
                            href={entry.slipImg}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 lg:px-2.5 lg:py-1 lg:text-[11px] xl:px-3 xl:py-1.5 xl:text-xs"
                          >
                            View Slip
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400 lg:text-[11px] xl:text-xs">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 lg:px-4 lg:py-3 xl:px-6 xl:py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(entry)}
                            className="inline-flex items-center justify-center rounded-md border border-blue-200 bg-white px-3 py-1.5 text-[11px] font-medium text-blue-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 lg:px-2.5 lg:py-1 lg:text-[10px] xl:px-3 xl:py-1.5 xl:text-[11px]"
                          >
                            Edit
                          </button>
                          {canDeleteBoulders && (
                            <button
                              type="button"
                              onClick={() => handleDelete(entry._id)}
                              className="inline-flex items-center justify-center rounded-md border border-rose-200 bg-white px-3 py-1.5 text-[11px] font-medium text-rose-700 shadow-sm transition hover:border-rose-300 hover:bg-rose-50 lg:px-2.5 lg:py-1 lg:text-[10px] xl:px-3 xl:py-1.5 xl:text-[11px]"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={11} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center">
                        <div className="mb-4 rounded-full bg-slate-100 p-4">
                          <Truck className="h-8 w-8 text-slate-400" />
                        </div>
                        <p className="text-lg font-semibold text-slate-600">No boulder entries found</p>
                        <p className="mt-1 text-sm text-slate-400">Try changing the search or date filter</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
