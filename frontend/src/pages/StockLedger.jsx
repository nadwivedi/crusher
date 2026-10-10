import { useEffect, useState } from 'react';
import { Inbox, RefreshCw } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../utils/api';
import Segmented from '../components/Segmented';

const formatNumber = (value) => Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 3 });
const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const PERIODS = [
  { key: 'all', label: 'All Time', shortLabel: 'All' },
  { key: '1', label: 'Today' },
  { key: '7', label: '7 Days' },
  { key: '30', label: '30 Days' },
  { key: '90', label: '90 Days' }
];

const TYPE_BADGES = {
  sale: 'badge-red',
  purchase: 'badge-green',
  materialUsed: 'badge-orange'
};

const TH = 'tbl-head px-3 py-2 first:pl-5 last:pr-5';
const TD = 'tbl-cell px-3 py-2 first:pl-5 last:pr-5';

/** Stock in and out for each product, with what is in stock now. */
export default function StockLedger() {
  const navigate = useNavigate();
  const [stockLedger, setStockLedger] = useState({ ledger: [], currentStock: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [productId, setProductId] = useState('');
  const [dateRange, setDateRange] = useState('all');
  const [reloadKey, setReloadKey] = useState(0);

  const stockLedgerRows = [...(stockLedger?.ledger || [])].reverse();
  const currentStockRows = stockLedger?.currentStock || [];

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') navigate('/');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams();
    if (productId) params.append('productId', productId);
    if (dateRange !== 'all') {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - Number(dateRange));
      params.append('fromDate', fromDate.toISOString());
    }

    apiClient.get(`/reports/stock-ledger?${params.toString()}`)
      .then((response) => {
        if (!active) return;
        setStockLedger(response || { ledger: [], currentStock: [] });
        setError('');
      })
      .catch((loadError) => {
        if (active) setError(loadError?.message || 'Error loading stock ledger');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [productId, dateRange, reloadKey]);

  const refresh = () => {
    setLoading(true);
    setReloadKey((key) => key + 1);
  };

  // Picking a product filters the ledger; picking it again shows every product
  const toggleProduct = (id) => {
    setLoading(true);
    setProductId((current) => (current === String(id) ? '' : String(id)));
  };

  const changePeriod = (value) => {
    setLoading(true);
    setDateRange(value);
  };

  const selectedProduct = currentStockRows.find((row) => String(row.productId) === productId);

  return (
    <div className="page-fade-in space-y-3.5 px-3 pb-6 pt-3.5 md:space-y-4 lg:px-6 lg:pt-4">
      <div className="page-header gap-2.5">
        <div className="min-w-0">
          <h1 className="page-title">Stock Ledger</h1>
          <p className="page-subtitle">Stock in and out for each product{selectedProduct ? ` · ${selectedProduct.productName}` : ''}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented options={PERIODS} value={dateRange} onChange={changePeriod} />
          <select
            value={productId}
            onChange={(event) => toggleProduct(event.target.value || productId)}
            className="input w-auto min-w-[10rem] py-1.5"
            aria-label="Product"
          >
            <option value="">All products</option>
            {currentStockRows.map((row) => (
              <option key={row.productId} value={row.productId}>{row.productName}</option>
            ))}
          </select>
          <button type="button" className="icon-btn" title="Refresh" aria-label="Refresh" onClick={refresh}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700">{error}</div>}

      {/* Current stock: one chip per product; tap to see only its movements */}
      {currentStockRows.length > 0 && (
        <section className="panel px-3 py-2.5 md:px-4">
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-bold text-slate-800">Current Stock</h2>
            <span className="text-[11px] text-slate-400">Tap a product to filter</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {currentStockRows.map((row) => {
              const active = productId === String(row.productId);
              const qty = Number(row.currentStock || 0);
              return (
                <button
                  key={row.productId}
                  type="button"
                  onClick={() => toggleProduct(row.productId)}
                  aria-pressed={active}
                  className={`shrink-0 rounded-lg border px-3 py-1.5 text-left transition ${active ? 'border-primary-600 bg-primary-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                >
                  <span className="block max-w-[10rem] truncate text-xs font-semibold text-slate-700">{row.productName || 'Unknown'}</span>
                  <span className={`block text-sm font-bold ${qty > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{formatNumber(qty)}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section className={`panel transition-opacity ${loading && stockLedgerRows.length > 0 ? 'opacity-60' : ''}`}>
        <div className="panel-header flex items-baseline justify-between gap-2 py-2.5">
          <h2 className="text-sm font-bold text-slate-800">Movements</h2>
          <span className="text-xs text-slate-500">{stockLedgerRows.length} entr{stockLedgerRows.length === 1 ? 'y' : 'ies'} · newest first</span>
        </div>

        {loading && stockLedgerRows.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-400">Loading stock…</p>
        ) : stockLedgerRows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400"><Inbox size={20} /></span>
            <p className="text-sm font-semibold text-slate-800">No stock movements</p>
            <p className="text-xs text-slate-500">Try another product or period.</p>
          </div>
        ) : (
          <>
            {/* Phone: two short lines per movement */}
            <ul className="divide-y divide-slate-100 md:hidden">
              {stockLedgerRows.map((row, index) => (
                <li key={`${row.refId || 'row'}-${index}`} className="px-4 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="min-w-0 truncate text-sm font-semibold text-slate-800">{row.productName || '-'}</p>
                    <span className={`shrink-0 text-sm font-bold ${Number(row.inQty || 0) > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {Number(row.inQty || 0) > 0 ? `+${formatNumber(row.inQty)}` : `−${formatNumber(row.outQty)}`}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-3 text-[11px] text-slate-500">
                    <span className="min-w-0 truncate">
                      <span className={`${TYPE_BADGES[row.type] || 'badge-gray'} mr-1.5`}>{row.displayType || row.type}</span>
                      {formatDate(row.date)}{row.vehicleNo ? ` · ${row.vehicleNo}` : ''}
                    </span>
                    <span className="shrink-0 font-semibold text-slate-700">Bal {formatNumber(row.runningQty)}</span>
                  </div>
                </li>
              ))}
            </ul>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[820px] text-left">
                <thead>
                  <tr>
                    <th className={TH}>Date</th>
                    <th className={TH}>Product</th>
                    <th className={TH}>Type</th>
                    <th className={TH}>Vehicle</th>
                    <th className={`${TH} text-right`}>Rate</th>
                    <th className={`${TH} text-right`}>In</th>
                    <th className={`${TH} text-right`}>Out</th>
                    <th className={`${TH} text-right`}>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {stockLedgerRows.map((row, index) => (
                    <tr key={`${row.refId || 'row'}-${index}`} className="tbl-row">
                      <td className={`${TD} whitespace-nowrap`}>
                        {formatDate(row.date)}
                        <span className="block text-[11px] leading-tight text-slate-400">{row.refNumber || '-'}</span>
                      </td>
                      <td className={TD}>
                        {row.productId ? (
                          <Link to={`/stock/${row.productId}`} className="block max-w-[14rem] truncate font-medium text-slate-800 hover:text-primary-600 hover:underline">
                            {row.productName || '-'}
                          </Link>
                        ) : <span className="font-medium text-slate-800">{row.productName || '-'}</span>}
                      </td>
                      <td className={TD}><span className={TYPE_BADGES[row.type] || 'badge-gray'}>{row.displayType || row.type || '-'}</span></td>
                      <td className={`${TD} whitespace-nowrap font-mono text-xs text-slate-600`}>{row.vehicleNo || '—'}</td>
                      <td className={`${TD} whitespace-nowrap text-right text-slate-600`}>{Number(row.rate || 0) > 0 ? formatCurrency(row.rate) : '—'}</td>
                      <td className={`${TD} whitespace-nowrap text-right font-semibold text-emerald-700`}>{Number(row.inQty || 0) > 0 ? `+${formatNumber(row.inQty)}` : ''}</td>
                      <td className={`${TD} whitespace-nowrap text-right font-semibold text-rose-700`}>{Number(row.outQty || 0) > 0 ? `−${formatNumber(row.outQty)}` : ''}</td>
                      <td className={`${TD} whitespace-nowrap text-right font-bold text-slate-900`}>{formatNumber(row.runningQty)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
