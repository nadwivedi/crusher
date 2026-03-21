import { useEffect, useMemo, useState } from 'react';
import { BookText, Banknote, Package, Search, ArrowDownCircle, ArrowUpCircle, TrendingUp } from 'lucide-react';
import apiClient from '../utils/api';

const DEFAULT_SUMMARY = {
  entryCount: 0,
  totalInward: 0,
  totalOutward: 0,
  sales: 0,
  purchases: 0,
  receipts: 0,
  payments: 0,
  expenses: 0,
  boulder: 0,
  materialUsed: 0,
  purchaseReturns: 0,
  saleReturns: 0
};

const getTodayInput = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toInputDate = (dateValue) => {
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';
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

const formatNumber = (value) => Number(value || 0).toLocaleString('en-IN');

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
  if (entry.type === 'boulder') acc.boulder += 1;
  if (entry.type === 'materialUsed') acc.materialUsed += 1;
  if (entry.type === 'purchaseReturn') acc.purchaseReturns += amount;
  if (entry.type === 'saleReturn') acc.saleReturns += amount;

  return acc;
}, { ...DEFAULT_SUMMARY });

const StatCard = ({ title, value, subtitle, icon: Icon, color, trend }) => (
  <div className="relative overflow-hidden rounded-2xl bg-white px-4 py-3 shadow-lg border border-slate-100 hover:shadow-xl transition-all duration-300">
    <div className={`absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 -translate-y-1/2 translate-x-1/2 bg-gradient-to-br ${color}`} />
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{title}</span>
        <div className={`p-1.5 rounded-lg bg-gradient-to-br ${color}`}>
          <Icon className="w-3.5 h-3.5 text-white" />
        </div>
      </div>
      <div className="text-xl font-black leading-tight text-slate-800 tracking-tight">{value}</div>
      <div className="flex items-center gap-1.5 mt-1">
        {trend !== undefined && (
          <span className={`text-[10px] font-semibold ${trend > 0 ? 'text-emerald-600' : trend < 0 ? 'text-rose-600' : 'text-slate-500'}`}>
            {trend > 0 ? '+' : ''}{typeof trend === 'number' ? formatCurrency(trend) : trend}
          </span>
        )}
        <span className="text-[10px] text-slate-500">{subtitle}</span>
      </div>
    </div>
  </div>
);

export default function DayBook() {
  const today = useMemo(() => getTodayInput(), []);
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [dayBook, setDayBook] = useState({ summary: DEFAULT_SUMMARY, entries: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const entries = dayBook?.entries || [];

  const loadDayBook = async (nextFromDate = fromDate, nextToDate = toDate) => {
    try {
      setLoading(true);
      const response = await apiClient.get('/reports/day-book', {
        params: {
          fromDate: nextFromDate || undefined,
          toDate: nextToDate || undefined
        }
      });
      setDayBook(response || { summary: DEFAULT_SUMMARY, entries: [] });
      setError('');
    } catch (err) {
      setError(err.message || 'Error loading day book');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDayBook(today, today);
  }, [today]);

  const filteredEntries = useMemo(() => {
    let filtered = [...entries];
    if (typeFilter !== 'all') {
      filtered = filtered.filter((entry) => entry.type === typeFilter);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(entry =>
        (entry.partyName || '').toLowerCase().includes(term) ||
        (entry.type || '').toLowerCase().includes(term) ||
        (entry.voucherNumber || '').toLowerCase().includes(term) ||
        (entry.method || '').toLowerCase().includes(term)
      );
    }
    return filtered.sort((a, b) => {
      const aTime = new Date(a.entryCreatedAt || a.date).getTime() || 0;
      const bTime = new Date(b.entryCreatedAt || b.date).getTime() || 0;
      return bTime - aTime;
    });
  }, [entries, typeFilter, searchTerm]);

  const visibleSummary = useMemo(() => buildSummary(filteredEntries), [filteredEntries]);

  const typeCounts = useMemo(() => entries.reduce((acc, entry) => {
    acc[entry.type] = (acc[entry.type] || 0) + 1;
    return acc;
  }, {}), [entries]);

  const applyRangeAndLoad = (nextFromDate, nextToDate) => {
    setFromDate(nextFromDate);
    setToDate(nextToDate);
    loadDayBook(nextFromDate, nextToDate);
  };

  const handleToday = () => applyRangeAndLoad(today, today);
  const handleLast7Days = () => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 6);
    applyRangeAndLoad(toInputDate(startDate), today);
  };
  const handleThisMonth = () => {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    applyRangeAndLoad(toInputDate(startDate), today);
  };
  const handleLastMonth = () => {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endDate = new Date(now.getFullYear(), now.getMonth(), 0);
    applyRangeAndLoad(toInputDate(startDate), toInputDate(endDate));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-stone-100">
      <div className="mx-auto max-w-[95%] px-4 py-6">
        {error && (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm font-semibold text-rose-700 shadow-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 mb-8">
          <StatCard title="Total Sales" value={formatCurrency(visibleSummary.sales)} subtitle="from invoices" icon={TrendingUp} color="from-emerald-500 to-teal-500" />
          <StatCard title="Total Purchases" value={formatCurrency(visibleSummary.purchases)} subtitle="from bills" icon={Package} color="from-rose-500 to-pink-500" />
          <StatCard title="Receipts" value={formatCurrency(visibleSummary.receipts)} subtitle="money received" icon={ArrowDownCircle} color="from-sky-500 to-cyan-500" trend={visibleSummary.receipts} />
          <StatCard title="Payments" value={formatCurrency(visibleSummary.payments)} subtitle="money paid" icon={ArrowUpCircle} color="from-amber-500 to-orange-500" trend={-visibleSummary.payments} />
          <StatCard title="Expenses" value={formatCurrency(visibleSummary.expenses)} subtitle="vouchers" icon={Banknote} color="from-fuchsia-500 to-purple-500" trend={-visibleSummary.expenses} />
        </div>

        <div className="rounded-3xl bg-white shadow-xl border border-slate-100 overflow-hidden mb-8">
          <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-800">Quick Filters</h2>
              <p className="text-sm text-slate-500">Filter transactions by type and date</p>
            </div>
            <div className="flex rounded-xl border-2 border-slate-200 bg-white overflow-hidden">
              <button type="button" onClick={handleToday} className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition">Today</button>
              <button type="button" onClick={handleLast7Days} className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition border-l border-slate-200">7 Days</button>
              <button type="button" onClick={handleThisMonth} className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition border-l border-slate-200">This Month</button>
              <button type="button" onClick={handleLastMonth} className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition border-l border-slate-200">Last Month</button>
            </div>
          </div>
          <div className="px-6 py-5">
            <div className="flex flex-wrap gap-2">
                {[
                  { value: 'all', label: 'All', count: entries.length },
                  { value: 'boulder', label: 'Boulder', count: typeCounts.boulder || 0 },
                  { value: 'sale', label: 'Sales', count: typeCounts.sale || 0 },
                  { value: 'purchase', label: 'Purchases', count: typeCounts.purchase || 0 },
                  { value: 'materialUsed', label: 'Material Used', count: typeCounts.materialUsed || 0 },
                  { value: 'receipt', label: 'Receipts', count: typeCounts.receipt || 0 },
                  { value: 'payment', label: 'Payments', count: typeCounts.payment || 0 },
                  { value: 'expense', label: 'Expenses', count: typeCounts.expense || 0 },
                  { value: 'purchaseReturn', label: 'Purchase Return', count: typeCounts.purchaseReturn || 0 },
                  { value: 'saleReturn', label: 'Sale Return', count: typeCounts.saleReturn || 0 },
                  { value: 'stockAdjustment', label: 'Stock Adjustment', count: typeCounts.stockAdjustment || 0 }
              ].map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setTypeFilter(filter.value)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                    typeFilter === filter.value
                      ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {filter.label} ({filter.count})
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-white shadow-xl border border-slate-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-800">Transaction Details</h2>
              <p className="text-sm text-slate-500">All entries for selected period</p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2.5 rounded-xl border-2 border-slate-200 bg-white text-sm font-medium text-slate-700 focus:border-violet-500 focus:outline-none focus:ring-4 focus:ring-violet-100 transition-all w-full sm:w-64"
              />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white">
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Date/Time</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Type</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Voucher No.</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Party Name</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Method</th>
                  <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">Money In</th>
                  <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">Money Out</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEntries.length > 0 ? (
                  filteredEntries.map((entry, index) => {
                    const inAmount = Number(entry.inAmount || 0);
                    const outAmount = Number(entry.outAmount || 0);
                    const typeColors = {
                      sale: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
                      purchase: { bg: 'bg-rose-100', text: 'text-rose-700' },
                      receipt: { bg: 'bg-sky-100', text: 'text-sky-700' },
                      payment: { bg: 'bg-amber-100', text: 'text-amber-700' },
                      expense: { bg: 'bg-fuchsia-100', text: 'text-fuchsia-700' },
                      boulder: { bg: 'bg-cyan-100', text: 'text-cyan-700' },
                      materialUsed: { bg: 'bg-lime-100', text: 'text-lime-700' },
                      purchaseReturn: { bg: 'bg-teal-100', text: 'text-teal-700' },
                      saleReturn: { bg: 'bg-orange-100', text: 'text-orange-700' },
                      stockAdjustment: { bg: 'bg-violet-100', text: 'text-violet-700' }
                    };
                    const colors = typeColors[entry.type] || typeColors.sale;
                    
                    return (
                      <tr key={`${entry.refId || entry.voucherNumber || entry.type}-${index}`} className="hover:bg-violet-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{formatDate(entry.entryCreatedAt || entry.date)}</p>
                            <p className="text-xs text-slate-400">{formatTime(entry.entryCreatedAt || entry.date)}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${colors.bg} ${colors.text}`}>
                            {entry.type || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-slate-600 font-mono">{entry.voucherNumber || '-'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-semibold text-slate-800 max-w-[180px] truncate">{entry.partyName || '-'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-slate-500 capitalize">{entry.method || '-'}</p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {inAmount > 0 ? (
                            <p className="text-sm font-bold text-emerald-600">+{formatCurrency(inAmount)}</p>
                          ) : <span className="text-slate-300">-</span>}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {outAmount > 0 ? (
                            <p className="text-sm font-bold text-rose-600">-{formatCurrency(outAmount)}</p>
                          ) : <span className="text-slate-300">-</span>}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center">
                        <div className="p-4 rounded-full bg-slate-100 mb-4">
                          <BookText className="w-8 h-8 text-slate-400" />
                        </div>
                        <p className="text-lg font-semibold text-slate-600">No transactions found</p>
                        <p className="text-sm text-slate-400 mt-1">Try adjusting your filters or date range</p>
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
