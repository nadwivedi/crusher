import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Boxes, 
  Calendar, 
  Filter, 
  TrendingUp, 
  TrendingDown, 
  Truck,
  ArrowUpRight,
  ArrowDownLeft,
  Info
} from 'lucide-react';
import apiClient from '../utils/api';

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatQuantity = (value) => Number(value || 0).toLocaleString('en-IN', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});

const formatNumber = (value) => Number(value || 0).toLocaleString('en-IN');

const formatCurrency = (value) => (
  `Rs ${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`
);

const getTypeMeta = (row) => {
  if (row.type === 'purchase') {
    return {
      label: 'Purchase',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      icon: <ArrowDownLeft className="h-3 w-3" />
    };
  }

  if (row.type === 'sale') {
    return {
      label: 'Sale',
      className: 'border-rose-200 bg-rose-50 text-rose-700',
      icon: <ArrowUpRight className="h-3 w-3" />
    };
  }

  if (row.type === 'materialUsed') {
    return {
      label: 'Used',
      className: 'border-amber-200 bg-amber-50 text-amber-700',
      icon: <TrendingDown className="h-3 w-3" />
    };
  }

  if (row.type === 'adjustment') {
    return {
      label: row.inQty > 0 ? 'Adj (+)' : 'Adj (-)',
      className: 'border-blue-200 bg-blue-50 text-blue-700',
      icon: <Info className="h-3 w-3" />
    };
  }

  return {
    label: row.type || '-',
    className: 'border-slate-200 bg-slate-50 text-slate-700',
    icon: null
  };
};

export default function StockDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [stockLedger, setStockLedger] = useState({ ledger: [], currentStock: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState('all');

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        navigate('/reports/stock-ledger');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  const loadStockDetails = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      params.append('productId', id);
      
      if (dateRange !== 'all') {
        const now = new Date();
        let fromDate;
        if (dateRange === '1') fromDate = new Date(now.setDate(now.getDate() - 1));
        else if (dateRange === '7') fromDate = new Date(now.setDate(now.getDate() - 7));
        else if (dateRange === '30') fromDate = new Date(now.setDate(now.getDate() - 30));
        else if (dateRange === '90') fromDate = new Date(now.setDate(now.getDate() - 90));
        
        if (fromDate) params.append('fromDate', fromDate.toISOString());
      }

      const [productResponse, ledgerResponse] = await Promise.all([
        apiClient.get(`/products/${id}`),
        apiClient.get(`/reports/stock-ledger?${params.toString()}`)
      ]);

      setProduct(productResponse.data?.data || productResponse.data || null);
      setStockLedger(ledgerResponse || { ledger: [], currentStock: [] });
      setError('');
    } catch (err) {
      setError(err.message || 'Error loading stock details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    loadStockDetails();
  }, [id, dateRange]);

  const totals = useMemo(() => {
    return (stockLedger.ledger || []).reduce((acc, row) => {
      acc.totalIn += Number(row.inQty || 0);
      acc.totalOut += Number(row.outQty || 0);
      return acc;
    }, { totalIn: 0, totalOut: 0 });
  }, [stockLedger]);

  const displayedCurrentStock = useMemo(() => {
    const found = (stockLedger.currentStock || []).find((row) => String(row.productId) === String(id));
    return Number(found?.currentStock || product?.currentStock || 0);
  }, [product, stockLedger, id]);

  const ledgerRows = useMemo(() => {
    return [...(stockLedger.ledger || [])].reverse();
  }, [stockLedger]);

  if (loading && !product) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
          <p className="text-sm font-medium text-slate-500 italic tracking-widest">Loading details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-stone-100">
      <div className="mx-auto max-w-[98%] px-4 py-6 md:px-6">
        {/* Header Section */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/reports/stock-ledger"
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-600 shadow-sm border border-slate-100 hover:bg-slate-50 hover:text-slate-900 transition-all"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <Boxes className="h-5 w-5 text-emerald-600" />
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">{product?.name || 'Stock Item'}</h1>
              </div>
              <p className="text-sm font-medium text-slate-500">
                Detailed movement history and inventory analysis
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="appearance-none bg-white border border-slate-200 text-slate-700 text-xs font-bold py-2.5 pl-4 pr-10 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer uppercase tracking-wider"
              >
                <option value="all">All Time</option>
                <option value="1">Last 1 Day</option>
                <option value="7">Last 7 Days</option>
                <option value="30">Last 30 Days</option>
                <option value="90">Last 90 Days</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 border-l border-slate-100 my-2">
                <Filter className="h-3.5 w-3.5" />
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm font-semibold text-rose-700 shadow-lg animate-in fade-in slide-in-from-top-4">
            {error}
          </div>
        )}

        {/* Stats Grid */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-6 shadow-xl transition-all hover:shadow-2xl hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <Boxes className="h-6 w-6" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Inventory</span>
            </div>
            <p className="text-3xl font-black text-slate-800">{formatQuantity(displayedCurrentStock)}</p>
            <p className="mt-1 text-sm font-bold text-slate-500 uppercase tracking-tighter">Current Stock Units</p>
            <div className="absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-emerald-50/50 opacity-50 blur-2xl"></div>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-6 shadow-xl transition-all hover:shadow-2xl hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <TrendingUp className="h-6 w-6" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Inbound</span>
            </div>
            <p className="text-3xl font-black text-slate-800">{formatQuantity(totals.totalIn)}</p>
            <p className="mt-1 text-sm font-bold text-slate-500 uppercase tracking-tighter text-blue-600">Total Stock In</p>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-6 shadow-xl transition-all hover:shadow-2xl hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                <TrendingDown className="h-6 w-6" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Outbound</span>
            </div>
            <p className="text-3xl font-black text-slate-800">{formatQuantity(totals.totalOut)}</p>
            <p className="mt-1 text-sm font-bold text-slate-500 uppercase tracking-tighter text-rose-600">Total Stock Out</p>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-slate-100 bg-gradient-to-br from-slate-800 to-slate-900 p-6 shadow-xl transition-all hover:shadow-2xl hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4 text-white">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white">
                <Calendar className="h-6 w-6" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Net</span>
            </div>
            <p className="text-3xl font-black text-white">{formatQuantity(totals.totalIn - totals.totalOut)}</p>
            <p className="mt-1 text-sm font-bold text-slate-400 uppercase tracking-tighter">Net Movement</p>
          </div>
        </div>

        {/* Ledger Table Section */}
        <div className="rounded-3xl bg-white shadow-xl border border-slate-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-800">Movement Ledger</h2>
              <p className="text-sm text-slate-500">Complete transaction history for this item</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white">
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Date / Ref</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Type</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Party / Source</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Vehicle No</th>
                  <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">In Qty</th>
                  <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">Out Qty</th>
                  <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ledgerRows.length > 0 ? (
                  ledgerRows.map((row, index) => {
                    const typeMeta = getTypeMeta(row);
                    return (
                      <tr key={`${row.refId || 'row'}-${index}`} className="hover:bg-emerald-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{formatDate(row.date)}</p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">{row.refNumber || '-'}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border shadow-sm ${typeMeta.className}`}>
                            {typeMeta.icon}
                            {typeMeta.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-slate-700">{row.partyName || '-'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                              <Truck className="h-3.5 w-3.5" />
                            </div>
                            <span className="text-sm font-bold text-slate-700">{row.vehicleNo || '-'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {Number(row.inQty || 0) > 0 ? (
                            <p className="text-sm font-black text-emerald-600">+{formatNumber(row.inQty)}</p>
                          ) : <span className="text-slate-300">-</span>}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {Number(row.outQty || 0) > 0 ? (
                            <p className="text-sm font-black text-rose-600">-{formatNumber(row.outQty)}</p>
                          ) : <span className="text-slate-300">-</span>}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="inline-flex flex-col items-end">
                            <p className="text-sm font-black text-slate-800">{formatNumber(row.runningQty)}</p>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">units</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="7" className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-slate-300">
                          <Boxes className="h-8 w-8" />
                        </div>
                        <p className="text-sm font-bold text-slate-400">No stock movement found for this item</p>
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
