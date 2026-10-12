import { useEffect, useMemo, useState } from 'react';
import { Package, Search, Truck } from 'lucide-react';
import apiClient from '../utils/api';
import { usedForName } from '../utils/diesel';

const formatNumber = (value) => Number(value || 0).toLocaleString('en-IN', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});

const formatDate = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

function StatCard({ title, value, subtitle, icon: Icon, tone }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/90 px-4 py-3 shadow-[0_16px_30px_rgba(15,23,42,0.08)] lg:px-3 lg:py-2.5 xl:px-4 xl:py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 lg:text-[9px] xl:text-[10px]">{title}</p>
          <p className="mt-1 text-lg font-black text-slate-800 lg:text-base xl:text-lg">{value}</p>
          <p className="mt-0.5 text-xs text-slate-500 lg:text-[11px] xl:text-xs">{subtitle}</p>
        </div>
        <div className={`rounded-xl bg-gradient-to-br p-2 text-white lg:p-1.5 xl:p-2 ${tone}`}>
          <Icon className="h-4 w-4 lg:h-3.5 lg:w-3.5 xl:h-4 xl:w-4" />
        </div>
      </div>
    </div>
  );
}

export default function HomeMaterialUsedLedger() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const loadEntries = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get('/material-used');
        const rows = Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response)
          ? response
          : [];
        setEntries(rows);
        setError('');
      } catch (err) {
        setError(err.message || 'Unable to load material used ledger');
      } finally {
        setLoading(false);
      }
    };

    loadEntries();
  }, []);

  const filteredEntries = useMemo(() => {
    const term = String(searchTerm || '').trim().toLowerCase();
    if (!term) return entries;

    return entries.filter((entry) => (
      [usedForName(entry), entry.materialTypeName, entry.materialType?.name, entry.notes]
        .some((value) => String(value || '').toLowerCase().includes(term))
    ));
  }, [entries, searchTerm]);

  const summary = useMemo(() => filteredEntries.reduce((acc, entry) => ({
    count: acc.count + 1,
    usedQty: acc.usedQty + Number(entry.usedQty || 0)
  }), {
    count: 0,
    usedQty: 0
  }), [filteredEntries]);

  const recentEntries = filteredEntries.slice(0, 8);

  return (
    <div className="space-y-5 p-5 sm:p-6 lg:space-y-4 lg:p-4 xl:space-y-5 xl:p-6">
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-2.5 xl:gap-3">
        <StatCard title="Entries" value={formatNumber(summary.count)} subtitle="usage rows" icon={Package} tone="from-sky-500 to-cyan-500" />
        <StatCard title="Used Qty" value={formatNumber(summary.usedQty)} subtitle="total consumed" icon={Truck} tone="from-emerald-500 to-teal-500" />
        <div className="rounded-2xl border border-white/70 bg-white/90 px-4 py-3 shadow-[0_16px_30px_rgba(15,23,42,0.08)] lg:px-3 lg:py-2.5 xl:px-4 xl:py-3">
          <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 lg:text-[9px] xl:text-[10px]">Search</label>
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Vehicle or material..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white lg:rounded-[20px] xl:rounded-[24px]">
        {loading ? (
          <div className="px-4 py-12 text-center text-sm font-medium text-slate-500">Loading material used ledger...</div>
        ) : recentEntries.length > 0 ? (
          <>
            <div className="space-y-3 p-3 lg:hidden">
              {recentEntries.map((entry) => (
                <div key={entry._id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
                  <div className="bg-gradient-to-r from-sky-50 via-cyan-50 to-blue-50 p-3">
                    <p className="text-sm font-bold text-slate-900">{usedForName(entry) || '-'}</p>
                    <p className="text-xs text-slate-500">{formatDate(entry.usedDate || entry.createdAt)}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 p-3">
                    <div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Material</p><p className="mt-1 text-sm font-semibold text-slate-800">{entry.materialTypeName || entry.materialType?.name || '-'}</p></div>
                    <div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Used Qty</p><p className="mt-1 text-sm font-bold text-rose-600">{formatNumber(entry.usedQty)}</p></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 border-t border-slate-100 p-3">
                    <div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Unit</p><p className="mt-1 text-sm text-slate-800">{entry.unit || entry.materialType?.unit || '-'}</p></div>
                    <div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Notes</p><p className="mt-1 text-sm text-slate-800">{entry.notes || '-'}</p></div>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[860px]">
              <thead>
                <tr className="bg-[linear-gradient(135deg,#0f766e_0%,#0d9488_38%,#0891b2_72%,#0284c7_100%)] text-white">
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.14em]">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.14em]">Given To</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.14em]">Material</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.14em]">Used Qty</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.14em]">Unit</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.14em]">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentEntries.map((entry) => (
                  <tr key={entry._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-semibold text-slate-700">{formatDate(entry.usedDate || entry.createdAt)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-800">{usedForName(entry) || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{entry.materialTypeName || entry.materialType?.name || '-'}</td>
                    <td className="px-4 py-3 text-right text-sm font-black text-rose-600">{formatNumber(entry.usedQty)}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{entry.unit || entry.materialType?.unit || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{entry.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center px-4 py-14 text-center">
            <div className="rounded-full bg-slate-100 p-4">
              <Package className="h-7 w-7 text-slate-400" />
            </div>
            <p className="mt-4 text-base font-semibold text-slate-700">No material used entries found</p>
            <p className="mt-1 text-sm text-slate-500">New usage entries will appear here automatically.</p>
          </div>
        )}
      </div>
    </div>
  );
}
