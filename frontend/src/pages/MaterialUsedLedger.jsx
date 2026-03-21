import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Package, RefreshCw, Search, Truck } from 'lucide-react';
import apiClient from '../utils/api';

const formatNumber = (value) => Number(value || 0).toLocaleString('en-IN', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});

const formatDate = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

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

export default function MaterialUsedLedger() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [datePreset, setDatePreset] = useState('');
  const [{ fromDate, toDate }, setDateRange] = useState({ fromDate: '', toDate: '' });

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

  const filteredEntries = useMemo(() => {
    const normalizedSearch = String(searchTerm || '').trim().toLowerCase();

    return entries.filter((entry) => {
      const matchesSearch = !normalizedSearch || [
        entry.vehicleNo,
        entry.materialTypeName,
        entry.materialType?.name,
        entry.notes
      ].some((value) => String(value || '').toLowerCase().includes(normalizedSearch));

      if (!matchesSearch) return false;

      const entryDate = new Date(entry.usedDate || entry.createdAt);
      if (Number.isNaN(entryDate.getTime())) return false;
      const entryDateText = toInputDate(entryDate);

      if (fromDate && entryDateText < fromDate) return false;
      if (toDate && entryDateText > toDate) return false;

      return true;
    });
  }, [entries, searchTerm, fromDate, toDate]);

  const summary = useMemo(() => {
    return filteredEntries.reduce((acc, entry) => ({
      count: acc.count + 1,
      usedQty: acc.usedQty + Number(entry.usedQty || 0)
    }), {
      count: 0,
      usedQty: 0
    });
  }, [filteredEntries]);

  const handlePresetChange = (value) => {
    setDatePreset(value);
    setDateRange(resolvePresetRange(value));
  };

  const StatCard = ({ title, value, subtitle }) => (
    <div className="rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-lg">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{title}</p>
      <p className="mt-2 text-2xl font-black text-slate-800">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
    </div>
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-stone-100">
        <div className="text-center">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-sky-500" />
          <p className="mt-4 font-semibold text-slate-600">Loading material used ledger...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-stone-100">
      <div className="mx-auto max-w-[95%] px-4 py-6">
        {error && (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm font-semibold text-rose-700 shadow-lg">
            {error}
          </div>
        )}

        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
          <StatCard title="Entries" value={formatNumber(summary.count)} subtitle="filtered usage entries" />
          <StatCard title="Used Qty" value={formatNumber(summary.usedQty)} subtitle="total consumed quantity" />
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-xl">
          <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-800">Material Used Ledger</h2>
                <p className="text-sm text-slate-500">All consumed material details in one report</p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search vehicle, material..."
                    className="w-full rounded-xl border-2 border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm font-medium text-slate-700 transition-all focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-100 sm:w-64"
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
                  </select>
                </div>

                <button
                  type="button"
                  onClick={loadEntries}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-900"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px]">
              <thead>
                <tr className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white">
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Vehicle No</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Material Type</th>
                  <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">Used Qty</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Unit</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEntries.length > 0 ? (
                  filteredEntries.map((entry) => (
                    <tr key={entry._id} className="transition-colors hover:bg-sky-50/50">
                      <td className="px-6 py-4 text-sm font-medium text-slate-700">{formatDate(entry.usedDate || entry.createdAt)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-cyan-500 text-white">
                            <Truck className="h-4 w-4" />
                          </div>
                          <span className="text-sm font-bold text-slate-800">{entry.vehicleNo || '-'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 text-white">
                            <Package className="h-4 w-4" />
                          </div>
                          <span className="text-sm font-bold text-slate-800">{entry.materialTypeName || entry.materialType?.name || '-'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-black text-emerald-600">{formatNumber(entry.usedQty)}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-700">{entry.unit || entry.materialType?.unit || '-'}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{entry.notes || '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center">
                        <div className="mb-4 rounded-full bg-slate-100 p-4">
                          <Package className="h-8 w-8 text-slate-400" />
                        </div>
                        <p className="text-lg font-semibold text-slate-600">No material used entries found</p>
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
