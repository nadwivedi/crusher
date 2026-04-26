import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Boxes,
  RefreshCw,
  ShoppingCart,
  Users
} from 'lucide-react';
import apiClient from '../utils/api';

const REPORT_OPTIONS = [
  {
    id: 'partyLedger',
    label: 'Party Ledger',
    description: 'Track receivable and payable movement for each party.',
    Icon: Users,
    activeClass: 'from-sky-500 to-indigo-500',
    badgeClass: 'border-sky-200 bg-sky-50 text-sky-700'
  },
  {
    id: 'stockLedger',
    label: 'Stock Ledger',
    description: 'See stock in, stock out, and running quantity by item.',
    Icon: Boxes,
    activeClass: 'from-emerald-500 to-teal-500',
    badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700'
  },
  {
    id: 'saleReport',
    label: 'Sale Report',
    description: 'Review invoices, parties, item count, and total sales value.',
    Icon: ShoppingCart,
    activeClass: 'from-amber-500 to-orange-500',
    badgeClass: 'border-amber-200 bg-amber-50 text-amber-700'
  }
];

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

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const getSaleQtyValue = (sale) => {
  if (sale?.pricingMode === 'per_cubic_meter') {
    return Number(sale?.cubicMeterQty || 0);
  }

  return Number(sale?.netWeight || sale?.materialWeight || 0) / 1000;
};

const getSaleQtyLabel = (sale) => {
  const qtyValue = getSaleQtyValue(sale);
  if (sale?.pricingMode === 'per_cubic_meter') {
    return `${Number(qtyValue || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3
    })} m³`;
  }

  const netWeight = Number(sale?.netWeight || sale?.materialWeight || 0);
  const tonQty = Number(qtyValue || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3
  });

  return `${netWeight.toLocaleString('en-IN')} kg (${tonQty} ton)`;
};

const getErrorMessage = (error, fallback) => {
  if (typeof error === 'string') return error;
  return error?.message || fallback;
};

function SummaryCard({ label, value, hint, tone = 'slate' }) {
  const toneClasses = {
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    rose: 'border-rose-200 bg-rose-50 text-rose-900',
    violet: 'border-violet-200 bg-violet-50 text-violet-900',
    sky: 'border-sky-200 bg-sky-50 text-sky-900',
    pink: 'border-pink-200 bg-pink-50 text-pink-900',
    slate: 'border-slate-200 bg-slate-50 text-slate-900'
  };

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${toneClasses[tone] || toneClasses.slate}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black tracking-tight">{value}</p>
      {hint ? <p className="mt-1 text-sm text-slate-600">{hint}</p> : null}
    </div>
  );
}

function ReportOptionCard({ option, active, onClick }) {
  const { Icon } = option;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative overflow-hidden rounded-[24px] border p-5 text-left transition duration-200 ${
        active
          ? 'border-slate-900/10 bg-slate-900 text-white shadow-[0_24px_60px_rgba(15,23,42,0.22)]'
          : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_18px_40px_rgba(15,23,42,0.10)]'
      }`}
    >
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${option.activeClass}`} />
      <div className="flex items-start justify-between gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${active ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-700'}`}>
          <Icon className="h-6 w-6" />
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${active ? 'border-white/15 bg-white/10 text-white/85' : option.badgeClass}`}>
          Report
        </span>
      </div>

      <h2 className={`mt-5 text-lg font-black tracking-tight ${active ? 'text-white' : 'text-slate-900'}`}>
        {option.label}
      </h2>
      <p className={`mt-2 text-sm ${active ? 'text-white/80' : 'text-slate-500'}`}>
        {option.description}
      </p>
    </button>
  );
}

function SectionShell({ title, description, actions, children }) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      <div className="border-b border-slate-200 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98))] px-5 py-5 md:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-2xl font-black tracking-tight text-slate-900">{title}</h3>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          </div>
          {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
        </div>
      </div>
      <div className="px-5 py-5 md:px-6 md:py-6">{children}</div>
    </section>
  );
}

function ItemPreview({ items }) {
  if (!Array.isArray(items) || items.length === 0) {
    return <span className="text-slate-400">-</span>;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {items.slice(0, 2).map((item, index) => (
        <span
          key={`${item.productName || item.product || 'item'}-${index}`}
          className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700"
        >
          {item.productName || item.product?.name || 'Item'}
        </span>
      ))}
      {items.length > 2 ? <span className="text-xs font-semibold text-slate-500">+{items.length - 2} more</span> : null}
    </div>
  );
}

export default function ReportsDashboard({ initialReport = 'partyLedger', showPicker = true }) {
  const navigate = useNavigate();
  const [activeReport, setActiveReport] = useState(initialReport);
  const [outstanding, setOutstanding] = useState(null);
  const [partyLedger, setPartyLedger] = useState([]);
  const [stockLedger, setStockLedger] = useState({ ledger: [], currentStock: [] });
  const [sales, setSales] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [parties, setParties] = useState([]);
  const [products, setProducts] = useState([]);
  const [partyId, setPartyId] = useState('');
  const [productId, setProductId] = useState('');
  const [pageLoading, setPageLoading] = useState(true);
  const [sectionLoading, setSectionLoading] = useState('');
  const [error, setError] = useState('');

  const partyNameMap = useMemo(
    () => new Map((parties || []).map((party) => [String(party._id), String(party.name || party.partyName || 'Party').trim() || 'Party'])),
    [parties]
  );

  const sortedSales = useMemo(
    () => [...(sales || [])].sort((a, b) => new Date(b.saleDate || 0) - new Date(a.saleDate || 0)),
    [sales]
  );

  const sortedPurchases = useMemo(
    () => [...(purchases || [])].sort((a, b) => new Date(b.purchaseDate || 0) - new Date(a.purchaseDate || 0)),
    [purchases]
  );

  const outstandingTotals = outstanding?.totals || {};
  const partyOutstandingRows = outstanding?.partyOutstanding || [];
  const stockLedgerRows = stockLedger?.ledger || [];
  const currentStockRows = stockLedger?.currentStock || [];
  const activeOption = useMemo(
    () => REPORT_OPTIONS.find((option) => option.id === activeReport) || null,
    [activeReport]
  );

  const getPartyName = (value, fallback = '-') => {
    if (!value) return fallback;
    if (typeof value === 'object') {
      return String(value.name || value.partyName || value.customerName || fallback).trim() || fallback;
    }
    return partyNameMap.get(String(value)) || fallback;
  };

  const partyLedgerSummary = useMemo(() => {
    const closingBalance = partyLedger.length > 0 ? Number(partyLedger[partyLedger.length - 1].runningBalance || 0) : 0;

    return {
      entries: partyLedger.length,
      closingBalance,
      selectedParty: partyId ? getPartyName(partyId, 'Selected party') : 'All Parties'
    };
  }, [partyId, partyLedger]);

  const stockLedgerSummary = useMemo(() => {
    const totals = stockLedgerRows.reduce((acc, row) => {
      acc.inQty += Number(row.inQty || 0);
      acc.outQty += Number(row.outQty || 0);
      return acc;
    }, { inQty: 0, outQty: 0 });

    return {
      movementCount: stockLedgerRows.length,
      totalIn: totals.inQty,
      totalOut: totals.outQty,
      trackedItems: currentStockRows.length
    };
  }, [currentStockRows.length, stockLedgerRows]);

  const salesSummary = useMemo(() => {
    const totals = sortedSales.reduce((acc, sale) => {
      acc.amount += Number(sale.totalAmount || 0);
      if (sale?.pricingMode === 'per_cubic_meter') {
        acc.totalCubicMeterQty += Number(sale.cubicMeterQty || 0);
      } else {
        acc.totalTonQty += Number(sale.netWeight || sale.materialWeight || 0) / 1000;
      }
      return acc;
    }, { amount: 0, totalTonQty: 0, totalCubicMeterQty: 0 });

    return {
      count: sortedSales.length,
      totalAmount: totals.amount,
      totalTonQty: totals.totalTonQty,
      totalCubicMeterQty: totals.totalCubicMeterQty,
      averageValue: sortedSales.length > 0 ? totals.amount / sortedSales.length : 0
    };
  }, [sortedSales]);

  const purchaseSummary = useMemo(() => {
    const totals = sortedPurchases.reduce((acc, purchase) => {
      acc.amount += Number(purchase.totalAmount || 0);
      acc.items += Array.isArray(purchase.items) ? purchase.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0) : 0;
      return acc;
    }, { amount: 0, items: 0 });

    return {
      count: sortedPurchases.length,
      totalAmount: totals.amount,
      totalItems: totals.items,
      averageValue: sortedPurchases.length > 0 ? totals.amount / sortedPurchases.length : 0
    };
  }, [sortedPurchases]);

  useEffect(() => {
    loadAllReports();
  }, []);

  useEffect(() => {
    setActiveReport(initialReport);
  }, [initialReport]);

  useEffect(() => {
    const isTypingTarget = (target) => {
      const tagName = target?.tagName?.toLowerCase();
      return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target?.isContentEditable;
    };

    const handleKeyDown = (event) => {
      if (event.key !== 'Escape' || event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      if (isTypingTarget(event.target)) {
        return;
      }

      event.preventDefault();
      navigate('/', { replace: true });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  const loadAllReports = async () => {
    setPageLoading(true);
    setError('');

    const results = await Promise.allSettled([
      apiClient.get('/parties'),
      apiClient.get('/products'),
      apiClient.get('/reports/outstanding'),
      apiClient.get('/reports/party-ledger'),
      apiClient.get('/reports/stock-ledger'),
      apiClient.get('/sales'),
      apiClient.get('/purchases')
    ]);

    const failures = [];

    if (results[0].status === 'fulfilled') setParties(results[0].value.data || []);
    else failures.push('party list');

    if (results[1].status === 'fulfilled') setProducts(results[1].value.data || []);
    else failures.push('product list');

    if (results[2].status === 'fulfilled') setOutstanding(results[2].value || null);
    else failures.push('outstanding summary');

    if (results[3].status === 'fulfilled') setPartyLedger(results[3].value || []);
    else failures.push('party ledger');

    if (results[4].status === 'fulfilled') setStockLedger(results[4].value || { ledger: [], currentStock: [] });
    else failures.push('stock ledger');

    if (results[5].status === 'fulfilled') setSales(results[5].value.data || []);
    else failures.push('sale report');

    if (results[6].status === 'fulfilled') setPurchases(results[6].value.data || []);
    else failures.push('purchase report');

    if (failures.length > 0) {
      setError(`Some report data could not be loaded: ${failures.join(', ')}.`);
    }

    setPageLoading(false);
  };

  const refreshPartyLedger = async (selectedPartyId = partyId) => {
    try {
      setSectionLoading('partyLedger');
      const response = await apiClient.get('/reports/party-ledger', {
        params: { partyId: selectedPartyId || undefined }
      });
      setPartyLedger(response || []);
      setError('');
    } catch (err) {
      setError(getErrorMessage(err, 'Error loading party ledger'));
    } finally {
      setSectionLoading('');
    }
  };

  const refreshStockLedger = async (selectedProductId = productId) => {
    try {
      setSectionLoading('stockLedger');
      const response = await apiClient.get('/reports/stock-ledger', {
        params: { productId: selectedProductId || undefined }
      });
      setStockLedger(response || { ledger: [], currentStock: [] });
      setError('');
    } catch (err) {
      setError(getErrorMessage(err, 'Error loading stock ledger'));
    } finally {
      setSectionLoading('');
    }
  };

  const refreshSales = async () => {
    try {
      setSectionLoading('saleReport');
      const response = await apiClient.get('/sales');
      setSales(response.data || []);
      setError('');
    } catch (err) {
      setError(getErrorMessage(err, 'Error loading sale report'));
    } finally {
      setSectionLoading('');
    }
  };

  const refreshPurchases = async () => {
    try {
      setSectionLoading('purchaseReport');
      const response = await apiClient.get('/purchases');
      setPurchases(response.data || []);
      setError('');
    } catch (err) {
      setError(getErrorMessage(err, 'Error loading purchase report'));
    } finally {
      setSectionLoading('');
    }
  };

  const renderActiveReport = () => {
    if (activeReport === 'partyLedger') {
      return (
        <SectionShell
          title="Party Ledger"
          description="Filter by party and review every ledger movement with running balance."
          actions={(
            <>
              <select
                value={partyId}
                onChange={(event) => setPartyId(event.target.value)}
                className="min-w-[220px] rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              >
                <option value="">All Parties</option>
                {parties.map((party) => (
                  <option key={party._id} value={party._id}>
                    {party.name || party.partyName || 'Party'}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => refreshPartyLedger(partyId)}
                disabled={sectionLoading === 'partyLedger'}
                className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sectionLoading === 'partyLedger' ? 'Loading...' : 'Load Ledger'}
              </button>
            </>
          )}
        >
          <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            <SummaryCard label="Entries" value={formatNumber(partyLedgerSummary.entries)} hint="Ledger rows found" tone="sky" />
            <SummaryCard label="Closing Balance" value={formatCurrency(partyLedgerSummary.closingBalance)} hint={partyLedgerSummary.closingBalance >= 0 ? 'Receivable side' : 'Payable side'} tone="violet" />
            <SummaryCard label="Selection" value={partyLedgerSummary.selectedParty} hint="Current filter" tone="slate" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-separate border-spacing-0 text-left text-sm">
              <thead className="bg-[linear-gradient(135deg,#0f766e_0%,#0d9488_38%,#0891b2_72%,#0284c7_100%)] text-white">
                <tr>
                  <th className="border-y-2 border-l-2 border-r border-black px-4 py-3 text-center font-semibold">Date</th>
                  <th className="border-y-2 border-r border-black px-4 py-3 text-center font-semibold">Type</th>
                  <th className="border-y-2 border-r border-black px-4 py-3 text-center font-semibold">Ref No</th>
                  <th className="border-y-2 border-r border-black px-4 py-3 text-center font-semibold">Party</th>
                  <th className="border-y-2 border-r border-black px-4 py-3 text-center font-semibold">Amount</th>
                  <th className="border-y-2 border-r-2 border-black px-4 py-3 text-center font-semibold">Running Balance</th>
                </tr>
              </thead>
              <tbody className="bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(248,250,252,0.98)_100%)] text-slate-700">
                {partyLedger.map((row, index) => (
                  <tr key={`${row.refId || 'ledger'}-${index}`} className="transition-colors hover:bg-slate-200/45">
                    <td className="border border-slate-300 px-4 py-3 text-center">{formatDate(row.date)}</td>
                    <td className="border border-slate-300 px-4 py-3 text-center font-semibold">{row.displayType || row.type || '-'}</td>
                    <td className="border border-slate-300 px-4 py-3 text-center">{row.refNumber || '-'}</td>
                    <td className="border border-slate-300 px-4 py-3 text-center">{row.partyName || '-'}</td>
                    <td className="border border-slate-300 px-4 py-3 text-center font-semibold">{formatCurrency(row.amount)}</td>
                    <td className={`border border-slate-300 px-4 py-3 text-center font-semibold ${Number(row.runningBalance || 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {formatCurrency(row.runningBalance)}
                    </td>
                  </tr>
                ))}
                {partyLedger.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="border border-slate-300 px-4 py-10 text-center text-slate-500">
                      No party ledger data found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </SectionShell>
      );
    }

    if (activeReport === 'stockLedger') {
      return (
        <SectionShell
          title="Stock Ledger"
          description="Track movement of stock items with in quantity, out quantity, and running quantity."
          actions={(
            <>
              <select
                value={productId}
                onChange={(event) => setProductId(event.target.value)}
                className="min-w-[220px] rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="">All Stock Items</option>
                {products.map((product) => (
                  <option key={product._id} value={product._id}>
                    {product.name || 'Product'}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => refreshStockLedger(productId)}
                disabled={sectionLoading === 'stockLedger'}
                className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sectionLoading === 'stockLedger' ? 'Loading...' : 'Load Stock Ledger'}
              </button>
            </>
          )}
        >
          <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-4">
            <SummaryCard label="Movements" value={formatNumber(stockLedgerSummary.movementCount)} hint="Ledger rows" tone="emerald" />
            <SummaryCard label="Stock In" value={formatNumber(stockLedgerSummary.totalIn)} hint="Total incoming qty" tone="sky" />
            <SummaryCard label="Stock Out" value={formatNumber(stockLedgerSummary.totalOut)} hint="Total outgoing qty" tone="rose" />
            <SummaryCard label="Tracked Items" value={formatNumber(stockLedgerSummary.trackedItems)} hint="Current stock snapshot" tone="slate" />
          </div>

          {currentStockRows.length > 0 ? (
            <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Current Stock Snapshot</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {currentStockRows.slice(0, 8).map((row) => (
                  <span key={String(row.productId)} className="rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700">
                    {row.productName}: {formatNumber(row.currentStock)}
                  </span>
                ))}
                {currentStockRows.length > 8 ? (
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500">
                    +{currentStockRows.length - 8} more
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-separate border-spacing-0 text-left text-sm">
              <thead className="bg-[linear-gradient(135deg,#065f46_0%,#059669_38%,#0d9488_72%,#14b8a6_100%)] text-white">
                <tr>
                  <th className="border-y-2 border-l-2 border-r border-black px-4 py-3 text-center font-semibold">Date</th>
                  <th className="border-y-2 border-r border-black px-4 py-3 text-center font-semibold">Product</th>
                  <th className="border-y-2 border-r border-black px-4 py-3 text-center font-semibold">Type</th>
                  <th className="border-y-2 border-r border-black px-4 py-3 text-center font-semibold">Ref No</th>
                  <th className="border-y-2 border-r border-black px-4 py-3 text-center font-semibold">In Qty</th>
                  <th className="border-y-2 border-r border-black px-4 py-3 text-center font-semibold">Out Qty</th>
                  <th className="border-y-2 border-r-2 border-black px-4 py-3 text-center font-semibold">Running Qty</th>
                </tr>
              </thead>
              <tbody className="bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(248,250,252,0.98)_100%)] text-slate-700">
                {stockLedgerRows.map((row, index) => (
                  <tr key={`${row.refId || 'stock'}-${index}`} className="transition-colors hover:bg-slate-200/45">
                    <td className="border border-slate-300 px-4 py-3 text-center">{formatDate(row.date)}</td>
                    <td className="border border-slate-300 px-4 py-3 text-center">{row.productName || '-'}</td>
                    <td className="border border-slate-300 px-4 py-3 text-center font-semibold">{row.displayType || row.type || '-'}</td>
                    <td className="border border-slate-300 px-4 py-3 text-center">{row.refNumber || '-'}</td>
                    <td className="border border-slate-300 px-4 py-3 text-center font-semibold text-emerald-700">{formatNumber(row.inQty)}</td>
                    <td className="border border-slate-300 px-4 py-3 text-center font-semibold text-rose-700">{formatNumber(row.outQty)}</td>
                    <td className="border border-slate-300 px-4 py-3 text-center font-semibold">{formatNumber(row.runningQty)}</td>
                  </tr>
                ))}
                {stockLedgerRows.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="border border-slate-300 px-4 py-10 text-center text-slate-500">
                      No stock movement found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </SectionShell>
      );
    }

    if (activeReport === 'saleReport') {
      return (
        <SectionShell
          title="Sale Report"
          description="Review sales invoice history with party details, qty basis, and invoice value."
          actions={(
            <button
              type="button"
              onClick={refreshSales}
              disabled={sectionLoading === 'saleReport'}
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sectionLoading === 'saleReport' ? 'Loading...' : 'Refresh Sale Report'}
            </button>
          )}
        >
          <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-5">
            <SummaryCard label="Invoices" value={formatNumber(salesSummary.count)} hint="Total sales entries" tone="amber" />
            <SummaryCard label="Sale Value" value={formatCurrency(salesSummary.totalAmount)} hint="Combined invoice amount" tone="emerald" />
            <SummaryCard label="Ton Qty" value={`${formatNumber(salesSummary.totalTonQty)} ton`} hint="Per ton sales quantity" tone="sky" />
            <SummaryCard label="M³ Qty" value={`${formatNumber(salesSummary.totalCubicMeterQty)} m³`} hint="Per cubic meter sales quantity" tone="violet" />
            <SummaryCard label="Average Invoice" value={formatCurrency(salesSummary.averageValue)} hint="Average sale value" tone="slate" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] border-separate border-spacing-0 text-left text-sm">
              <thead className="bg-[linear-gradient(135deg,#c2410c_0%,#ea580c_42%,#f59e0b_78%,#fbbf24_100%)] text-white">
                <tr>
                  <th className="border-y-2 border-l-2 border-r border-black px-4 py-3 text-center font-semibold">Invoice</th>
                  <th className="border-y-2 border-r border-black px-4 py-3 text-center font-semibold">Date</th>
                  <th className="border-y-2 border-r border-black px-4 py-3 text-center font-semibold">Party</th>
                  <th className="border-y-2 border-r border-black px-4 py-3 font-semibold">Items</th>
                  <th className="border-y-2 border-r border-black px-4 py-3 text-center font-semibold">Qty</th>
                  <th className="border-y-2 border-r-2 border-black px-4 py-3 text-center font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(248,250,252,0.98)_100%)] text-slate-700">
                {sortedSales.map((sale) => (
                  <tr key={sale._id} className="transition-colors hover:bg-slate-200/45">
                    <td className="border border-slate-300 px-4 py-3 text-center font-semibold text-slate-900">{sale.invoiceNumber || '-'}</td>
                    <td className="border border-slate-300 px-4 py-3 text-center">{formatDate(sale.saleDate)}</td>
                    <td className="border border-slate-300 px-4 py-3 text-center">{sale.customerName || getPartyName(sale.party, 'Walk-in')}</td>
                    <td className="border border-slate-300 px-4 py-3">
                      <ItemPreview items={sale.items} />
                    </td>
                    <td className="border border-slate-300 px-4 py-3 text-center">
                      {getSaleQtyLabel(sale)}
                    </td>
                    <td className="border border-slate-300 px-4 py-3 text-center font-semibold text-emerald-700">{formatCurrency(sale.totalAmount)}</td>
                  </tr>
                ))}
                {sortedSales.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="border border-slate-300 px-4 py-10 text-center text-slate-500">
                      No sale report data found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </SectionShell>
      );
    }

    return (
      <SectionShell
        title="Purchase Report"
        description="Review purchase bill history with party details, item count, invoice file, and total value."
        actions={(
          <button
            type="button"
            onClick={refreshPurchases}
            disabled={sectionLoading === 'purchaseReport'}
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sectionLoading === 'purchaseReport' ? 'Loading...' : 'Refresh Purchase Report'}
          </button>
        )}
      >
        <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-4">
          <SummaryCard label="Bills" value={formatNumber(purchaseSummary.count)} hint="Total purchase entries" tone="pink" />
          <SummaryCard label="Purchase Value" value={formatCurrency(purchaseSummary.totalAmount)} hint="Combined purchase amount" tone="emerald" />
          <SummaryCard label="Items Bought" value={formatNumber(purchaseSummary.totalItems)} hint="Quantity across bills" tone="sky" />
          <SummaryCard label="Average Bill" value={formatCurrency(purchaseSummary.averageValue)} hint="Average purchase value" tone="slate" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] border-separate border-spacing-0 text-left text-sm">
            <thead className="bg-[linear-gradient(135deg,#86198f_0%,#c026d3_42%,#ec4899_78%,#fb7185_100%)] text-white">
              <tr>
                <th className="border-y-2 border-l-2 border-r border-black px-4 py-3 text-center font-semibold">Invoice No</th>
                <th className="border-y-2 border-r border-black px-4 py-3 text-center font-semibold">Date</th>
                <th className="border-y-2 border-r border-black px-4 py-3 text-center font-semibold">Party</th>
                <th className="border-y-2 border-r border-black px-4 py-3 font-semibold">Items</th>
                <th className="border-y-2 border-r border-black px-4 py-3 text-center font-semibold">Qty</th>
                <th className="border-y-2 border-r border-black px-4 py-3 text-center font-semibold">Invoice File</th>
                <th className="border-y-2 border-r-2 border-black px-4 py-3 text-center font-semibold">Total</th>
              </tr>
            </thead>
            <tbody className="bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(248,250,252,0.97)_100%)] text-slate-700">
              {sortedPurchases.map((purchase) => (
                <tr key={purchase._id} className="transition-colors hover:bg-slate-200/45">
                  <td className="border border-slate-300 px-4 py-3 text-center font-semibold text-slate-900">{purchase.supplierInvoice || purchase.invoiceNo || purchase.invoiceNumber || '-'}</td>
                  <td className="border border-slate-300 px-4 py-3 text-center">{formatDate(purchase.purchaseDate)}</td>
                  <td className="border border-slate-300 px-4 py-3 text-center">{getPartyName(purchase.party, 'Party')}</td>
                  <td className="border border-slate-300 px-4 py-3">
                    <ItemPreview items={purchase.items} />
                  </td>
                  <td className="border border-slate-300 px-4 py-3 text-center">
                    {formatNumber((purchase.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0))}
                  </td>
                  <td className="border border-slate-300 px-4 py-3 text-center">
                    {purchase.invoiceLink ? (
                      <a
                        href={purchase.invoiceLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                      >
                        View File
                      </a>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="border border-slate-300 px-4 py-3 text-center font-semibold text-emerald-700">{formatCurrency(purchase.totalAmount)}</td>
                </tr>
              ))}
              {sortedPurchases.length === 0 ? (
                <tr>
                  <td colSpan="7" className="border border-slate-300 px-4 py-10 text-center text-slate-500">
                    No purchase report data found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </SectionShell>
    );
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.14),transparent_24%),radial-gradient(circle_at_85%_15%,rgba(56,189,248,0.12),transparent_20%),linear-gradient(180deg,#0f172a_0%,#111827_48%,#020617_100%)] px-4 py-6">
      <div className="mx-auto max-w-7xl">
        <div className="overflow-hidden rounded-[36px] border border-white/15 bg-white/10 shadow-[0_36px_90px_rgba(0,0,0,0.35)] backdrop-blur-sm">
          <div className="border-b border-white/10 bg-white/10 px-6 py-6 md:px-8 md:py-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-slate-300">BillHub Reports</p>
                <h1 className="mt-3 text-2xl font-black tracking-tight text-white md:text-4xl">
                  {showPicker ? 'Reports Dashboard' : (activeOption?.label || 'Report')}
                </h1>
                {!showPicker && activeOption?.description ? (
                  <p className="mt-2 text-sm text-slate-300">{activeOption.description}</p>
                ) : null}
              </div>

              {showPicker ? (
                <button
                  type="button"
                  onClick={loadAllReports}
                  disabled={pageLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw className={`h-4 w-4 ${pageLoading ? 'animate-spin' : ''}`} />
                  {pageLoading ? 'Refreshing Reports...' : 'Refresh All Reports'}
                </button>
              ) : null}
            </div>

            {showPicker ? (
              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <SummaryCard label="Sale Pending" value={formatCurrency(outstandingTotals.totalSalePending)} hint="Unreceived sale balance" tone="amber" />
                <SummaryCard label="Purchase Pending" value={formatCurrency(outstandingTotals.totalPurchasePending)} hint="Unpaid purchase balance" tone="rose" />
                <SummaryCard label="Receivable" value={formatCurrency(outstandingTotals.totalReceivable)} hint="Expected to collect" tone="emerald" />
                <SummaryCard label="Payable" value={formatCurrency(outstandingTotals.totalPayable)} hint="Expected to pay" tone="violet" />
              </div>
            ) : null}
          </div>

          <div className="bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(248,250,252,0.97)_100%)] px-5 py-5 md:px-8 md:py-8">
            {error ? (
              <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                {error}
              </div>
            ) : null}

            {showPicker ? (
              <div className="mb-8 grid grid-cols-1 gap-4 xl:grid-cols-4">
                {REPORT_OPTIONS.map((option) => (
                  <ReportOptionCard
                    key={option.id}
                    option={option}
                    active={activeReport === option.id}
                    onClick={() => setActiveReport(option.id)}
                  />
                ))}
              </div>
            ) : null}

            {pageLoading ? (
              <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-16 text-center shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                <p className="text-lg font-semibold text-slate-700">Loading reports...</p>
                <p className="mt-2 text-sm text-slate-500">Pulling ledger, sales, purchases, and outstanding data.</p>
              </div>
            ) : (
              renderActiveReport()
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
