import { useEffect, useMemo, useState } from 'react';
import { Boxes, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../utils/api';

const formatNumber = (value) => Number(value || 0).toLocaleString('en-IN');
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

export default function StockLedger() {
  const navigate = useNavigate();
  const [stockLedger, setStockLedger] = useState({ ledger: [], currentStock: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [productId, setProductId] = useState('');
  const [dateRange, setDateRange] = useState('all');

  const stockLedgerRows = stockLedger?.ledger || [];
  const currentStockRows = stockLedger?.currentStock || [];

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
    loadData();
  }, [productId, dateRange]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (productId) params.append('productId', productId);
      
      if (dateRange !== 'all') {
        const now = new Date();
        let fromDate;
        if (dateRange === '1') {
          fromDate = new Date(now.setDate(now.getDate() - 1));
        } else if (dateRange === '7') {
          fromDate = new Date(now.setDate(now.getDate() - 7));
        } else if (dateRange === '30') {
          fromDate = new Date(now.setDate(now.getDate() - 30));
        } else if (dateRange === '90') {
          fromDate = new Date(now.setDate(now.getDate() - 90));
        }
        if (fromDate) params.append('fromDate', fromDate.toISOString());
      }

      const stockRes = await apiClient.get(`/reports/stock-ledger?${params.toString()}`);
      setStockLedger(stockRes || { ledger: [], currentStock: [] });
    } catch (err) {
      setError(err.message || 'Error loading data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-stone-100">
      <div className="max-w-[98%] pl-2 pr-4 py-6">
        {error && (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm font-semibold text-rose-700 shadow-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[14rem_minmax(0,1fr)] gap-4 items-stretch">
          <div className="flex h-full flex-col rounded-3xl bg-white shadow-xl border border-slate-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-white">
              <h2 className="text-lg font-black text-slate-800">Current Stock</h2>
              <p className="text-sm text-slate-500">Available inventory by product</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {currentStockRows.length > 0 ? (
                <div className="space-y-3">
                  {currentStockRows.slice(0, 10).map((row, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-slate-50 to-white border border-slate-100 hover:border-emerald-200 hover:shadow-md transition-all">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{row.productName || 'Unknown'}</p>
                        <p className="text-xs text-slate-500">ID: {String(row.productId).slice(-6)}</p>
                      </div>
                      <div className="text-right ml-3">
                        <p className={`text-lg font-black ${Number(row.currentStock || 0) > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {formatNumber(row.currentStock)}
                        </p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider">units</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400">No stock data</div>
              )}
            </div>
          </div>

          <div className="rounded-3xl bg-white shadow-xl border border-slate-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-800">Detailed Ledger</h2>
                <p className="text-sm text-slate-500">Complete transaction history</p>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <select
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold py-2 pl-3 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer uppercase tracking-wider"
                  >
                    <option value="">All Products</option>
                    {currentStockRows.map(p => (
                      <option key={p.productId} value={p.productId}>{p.productName}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 7.929 8.707 6.515 10.141z"/></svg>
                  </div>
                </div>

                <div className="relative">
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold py-2 pl-3 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer uppercase tracking-wider"
                  >
                    <option value="all">All Time</option>
                    <option value="1">Last 1 Day</option>
                    <option value="7">Last 7 Days</option>
                    <option value="30">Last 30 Days</option>
                    <option value="90">Last 90 Days</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 7.929 8.707 6.515 10.141z"/></svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white">
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Date / Ref</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Product</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Type</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Vehicle No</th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">Rate</th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">Stock In</th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">Stock Out</th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stockLedgerRows.length > 0 ? (
                    [...stockLedgerRows].reverse().map((row, index) => (
                      <tr key={`${row.refId || 'row'}-${index}`} className="hover:bg-emerald-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{formatDate(row.date)}</p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">{row.refNumber || '-'}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-semibold text-slate-800 max-w-[180px] truncate">{row.productName || '-'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${row.type === 'sale' ? 'bg-rose-100 text-rose-700' :
                              row.type === 'purchase' ? 'bg-emerald-100 text-emerald-700' :
                                row.type === 'materialUsed' ? 'bg-amber-100 text-amber-700' :
                                  'bg-slate-100 text-slate-700'
                            }`}>
                            {row.displayType || row.type || 'N/A'}
                          </span>
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
                          <p className="text-sm font-semibold text-slate-700">
                            {Number(row.rate || 0) > 0 ? formatCurrency(row.rate) : '-'}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {Number(row.inQty || 0) > 0 ? (
                            <p className="text-sm font-bold text-emerald-600">+{formatNumber(row.inQty)}</p>
                          ) : <span className="text-slate-300">-</span>}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {Number(row.outQty || 0) > 0 ? (
                            <p className="text-sm font-bold text-rose-600">-{formatNumber(row.outQty)}</p>
                          ) : <span className="text-slate-300">-</span>}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className="text-sm font-black text-slate-800">{formatNumber(row.runningQty)}</p>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center">
                          <div className="p-4 rounded-full bg-slate-100 mb-4">
                            <Boxes className="w-8 h-8 text-slate-400" />
                          </div>
                          <p className="text-lg font-semibold text-slate-600">No stock movements found</p>
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
    </div>
  );
}
