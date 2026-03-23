import { useEffect, useMemo, useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Banknote, BookText, Package, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import apiClient from '../utils/api';

const DEFAULT_SUMMARY = {
  entryCount: 0,
  totalInward: 0,
  totalOutward: 0,
  sales: 0,
  purchases: 0,
  receipts: 0,
  payments: 0,
  expenses: 0
};

const getTodayInput = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatCurrency = (value) => (
  `Rs ${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`
);

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

const buildSummary = (entries) => entries.reduce((acc, entry) => {
  const amount = Number(entry.amount || 0);
  const inward = Number(entry.inAmount || 0);
  const outward = Number(entry.outAmount || 0);

  acc.entryCount += 1;
  acc.totalInward += inward;
  acc.totalOutward += outward;

  if (entry.type === 'sale') acc.sales += amount;
  if (entry.type === 'purchase') acc.purchases += amount;
  if (entry.type === 'receipt') acc.receipts += amount;
  if (entry.type === 'payment') acc.payments += amount;
  if (entry.type === 'expense') acc.expenses += amount;

  return acc;
}, { ...DEFAULT_SUMMARY });

const TYPE_BADGE_STYLES = {
  sale: 'bg-blue-100 text-blue-700',
  payment: 'bg-rose-100 text-rose-700',
  receipt: 'bg-emerald-100 text-emerald-700',
  purchase: 'bg-amber-100 text-amber-700',
  expense: 'bg-fuchsia-100 text-fuchsia-700',
};

function StatCard({ title, value, icon: Icon, tone }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/90 px-4 py-3 shadow-[0_16px_30px_rgba(15,23,42,0.08)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{title}</p>
          <p className="mt-1 text-lg font-black text-slate-800">{value}</p>
        </div>
        <div className={`rounded-xl bg-gradient-to-br p-2 text-white ${tone}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

export default function HomeDayBookPanel() {
  const today = useMemo(() => getTodayInput(), []);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadDayBook = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get('/reports/day-book', {
          params: {
            fromDate: today,
            toDate: today
          }
        });
        setEntries(response?.entries || []);
        setError('');
      } catch (err) {
        setError(err.message || 'Unable to load day book');
      } finally {
        setLoading(false);
      }
    };

    loadDayBook();
  }, [today]);

  const sortedEntries = useMemo(() => (
    [...entries].sort((a, b) => {
      const aTime = new Date(a.entryCreatedAt || a.date).getTime() || 0;
      const bTime = new Date(b.entryCreatedAt || b.date).getTime() || 0;
      return bTime - aTime;
    })
  ), [entries]);

  const summary = useMemo(() => buildSummary(sortedEntries), [sortedEntries]);
  const recentEntries = sortedEntries.slice(0, 8);

  return (
    <section className="w-full rounded-[28px] border border-slate-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,245,249,0.96))] shadow-[0_28px_70px_rgba(15,23,42,0.18)]">
      <div className="border-b border-slate-200/80 px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-center justify-start gap-2">
          <Link
            to="/reports/party-ledger"
            className="inline-flex items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
          >
            Party Ledger
          </Link>
          <Link
            to="/reports/boulder-ledger"
            className="inline-flex items-center justify-center rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
          >
            Boulder Ledger
          </Link>
          <Link
            to="/reports/sales-report"
            className="inline-flex items-center justify-center rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 transition hover:bg-violet-100"
          >
            Sales Ledger
          </Link>
        </div>
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard title="Sales" value={formatCurrency(summary.sales)} icon={TrendingUp} tone="from-emerald-500 to-teal-500" />
          <StatCard title="Purchases" value={formatCurrency(summary.purchases)} icon={Package} tone="from-rose-500 to-pink-500" />
          <StatCard title="Receipts" value={formatCurrency(summary.receipts)} icon={ArrowDownCircle} tone="from-sky-500 to-cyan-500" />
          <StatCard title="Payments" value={formatCurrency(summary.payments)} icon={ArrowUpCircle} tone="from-amber-500 to-orange-500" />
          <StatCard title="Expenses" value={formatCurrency(summary.expenses)} icon={Banknote} tone="from-fuchsia-500 to-violet-500" />
        </div>

        <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-700">Recent Entries</h3>
              <p className="text-xs text-slate-500">{summary.entryCount} entries today</p>
            </div>
          </div>

          {loading ? (
            <div className="px-4 py-12 text-center text-sm font-medium text-slate-500">Loading day book...</div>
          ) : recentEntries.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[940px]">
                <thead>
                  <tr className="bg-[linear-gradient(135deg,#0f766e_0%,#0d9488_38%,#0891b2_72%,#0284c7_100%)] text-white">
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.14em]">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.14em]">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.14em]">Ref</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.14em]">Party</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.14em]">Material</th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.14em]">In</th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.14em]">Out</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentEntries.map((entry, index) => {
                    const typeBadgeClass = TYPE_BADGE_STYLES[entry.type] || 'bg-slate-100 text-slate-700';

                    return (
                    <tr key={`${entry.refId || entry.voucherNumber || entry.type}-${index}`} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-700">{formatDate(entry.entryCreatedAt || entry.date)}</p>
                          <p className="text-xs text-slate-500">{formatTime(entry.entryCreatedAt || entry.date)}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${typeBadgeClass}`}>
                          {entry.type || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-slate-700">{entry.voucherNumber || '-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{entry.partyName || '-'}</td>
                      <td className="px-4 py-3">
                        {entry.materialSummary && entry.materialSummary !== '-' ? (
                          <div>
                            <p className="text-sm text-slate-700">{String(entry.materialSummary).split('/')[0]?.trim() || '-'}</p>
                            <p className="text-xs text-slate-500">{String(entry.materialSummary).split('/')[1]?.trim() || '-'}</p>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-700">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-emerald-600">
                        {Number(entry.inAmount || 0) > 0 ? formatCurrency(entry.inAmount) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-rose-600">
                        {Number(entry.outAmount || 0) > 0 ? formatCurrency(entry.outAmount) : '-'}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center px-4 py-14 text-center">
              <div className="rounded-full bg-slate-100 p-4">
                <BookText className="h-7 w-7 text-slate-400" />
              </div>
              <p className="mt-4 text-base font-semibold text-slate-700">No day book entries for today</p>
              <p className="mt-1 text-sm text-slate-500">New vouchers created today will appear here automatically.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
