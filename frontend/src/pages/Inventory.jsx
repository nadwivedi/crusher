import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Boxes, ChevronRight, Fuel, Inbox, PackageMinus, Plus, RefreshCw, Search } from 'lucide-react';
import apiClient from '../utils/api';
import StatCard from '../components/StatCard';
import MaterialUsed from './MaterialUsed';

const formatNumber = (value) => Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

const formatDate = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Local calendar date as YYYY-MM-DD, the same day keys the inventory API sends
const toDateKey = (date) => {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

const daysAgoKey = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return toDateKey(date);
};

// Sum of a { 'YYYY-MM-DD': qty } map from a day up to today
const sumSince = (byDay, fromKey, todayKey) => Object.entries(byDay || {})
  .reduce((sum, [day, qty]) => (day >= fromKey && day <= todayKey ? sum + Number(qty || 0) : sum), 0);

function QtyCell({ qty, unit, strong = false }) {
  if (!(qty > 0)) return <span className="text-slate-300">-</span>;
  return (
    <span className={strong ? 'font-bold text-slate-900' : ''}>
      {formatNumber(qty)}
      {unit && <span className="ml-1 text-xs font-medium text-slate-400">{unit}</span>}
    </span>
  );
}

function StockBadge({ item }) {
  if (item.currentStock > 0) return null;
  return <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">Out of stock</span>;
}

export default function Inventory() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showUseEntry, setShowUseEntry] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get('/reports/inventory');
      setItems(Array.isArray(response?.items) ? response.items : []);
    } catch (err) {
      setError(err.message || 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.defaultPrevented || event.key !== 'Escape' || showUseEntry) return;
      navigate('/');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, showUseEntry]);

  const todayKey = toDateKey(new Date());

  // Diesel first, then the most used in 30 days, then by name
  const rows = useMemo(() => items
    .map((item) => ({
      ...item,
      usedToday: sumSince(item.usedByDay, todayKey, todayKey),
      used7: sumSince(item.usedByDay, daysAgoKey(6), todayKey),
      used30: sumSince(item.usedByDay, daysAgoKey(29), todayKey),
      bought30: sumSince(item.boughtByDay, daysAgoKey(29), todayKey)
    }))
    .sort((a, b) => Number(b.isDiesel) - Number(a.isDiesel) || b.used30 - a.used30 || a.name.localeCompare(b.name)),
  [items, todayKey]);

  const searchText = search.trim().toLowerCase();
  const visible = searchText ? rows.filter((item) => item.name.toLowerCase().includes(searchText)) : rows;

  const diesel = rows.find((item) => item.isDiesel);
  const outOfStock = rows.filter((item) => item.currentStock <= 0 && (item.usedQty > 0 || item.boughtQty > 0)).length;
  const usedToday = rows.filter((item) => item.usedToday > 0).length;

  const openItem = (item) => navigate(`/inventory/${item._id}`);

  return (
    <div className="page-fade-in space-y-4 px-3 pb-8 pt-4 md:space-y-5 lg:px-6 lg:pt-5">
      {showUseEntry && <MaterialUsed modalOnly onModalFinish={() => { setShowUseEntry(false); loadData(); }} />}

      <div className="page-header">
        <div className="min-w-0">
          <h1 className="page-title">Inventory</h1>
          <p className="page-subtitle">Stock of every item, how much was bought and how much was used · tap an item for its report</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="icon-btn" title="Refresh" aria-label="Refresh" onClick={loadData}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button type="button" className="btn-primary" onClick={() => setShowUseEntry(true)}>
            <Plus size={18} /> Record Use
          </button>
        </div>
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div>}

      <section className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 md:gap-4">
        <StatCard icon={Boxes} tone="blue" label="Stock Items" value={formatNumber(rows.length)} />
        <StatCard
          icon={Fuel}
          tone="emerald"
          label="Diesel in Stock"
          value={diesel ? `${formatNumber(diesel.currentStock)} ${diesel.unit}` : '-'}
          hint={diesel && diesel.used30 > 0 ? `Used ${formatNumber(diesel.used30)} ${diesel.unit} in 30 days` : undefined}
        />
        <StatCard icon={PackageMinus} tone="amber" label="Items Used Today" value={formatNumber(usedToday)} />
        <StatCard icon={AlertTriangle} tone="rose" label="Out of Stock" value={formatNumber(outOfStock)} hint="Items in use with no stock left" />
      </section>

      <section className="panel">
        <div className="panel-header flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">All Items</h2>
            <p className="text-xs text-slate-500">Diesel first, then the most used in 30 days</p>
          </div>
          <div className="relative md:w-64">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search item..." />
          </div>
        </div>

        {loading && items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="h-9 w-9 animate-spin rounded-full border-4 border-primary-600 border-r-transparent" />
            <p className="text-sm text-slate-400">Loading inventory…</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Inbox size={22} />
            </span>
            <p className="text-sm font-semibold text-slate-800">{items.length === 0 ? 'No stock items yet' : 'No matching item'}</p>
            <p className="max-w-md text-xs text-slate-500">{items.length === 0 ? 'Add items in Stock Items, then buy them through Purchase.' : 'Try another name.'}</p>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-slate-100 md:hidden">
              {visible.map((item) => (
                <li key={item._id}>
                  <button type="button" className="w-full px-4 py-3 text-left" onClick={() => openItem(item)}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <p className="truncate font-semibold text-slate-800">{item.name}</p>
                        <StockBadge item={item} />
                      </div>
                      <ChevronRight size={16} className="shrink-0 text-slate-300" />
                    </div>
                    <div className="mt-2 grid grid-cols-4 gap-2 text-center">
                      {[['In Stock', item.currentStock], ['Today', item.usedToday], ['30 Days', item.used30], ['Total Used', item.usedQty]].map(([label, qty]) => (
                        <div key={label} className="rounded-lg bg-slate-50 px-1 py-1.5">
                          <p className="text-[10px] font-medium text-slate-500">{label}</p>
                          <p className="text-sm font-bold text-slate-900">{formatNumber(qty)}</p>
                        </div>
                      ))}
                    </div>
                  </button>
                </li>
              ))}
            </ul>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[900px] text-left">
                <thead>
                  <tr>
                    <th className="tbl-head">Item</th>
                    <th className="tbl-head text-right">In Stock</th>
                    <th className="tbl-head text-right">Used Today</th>
                    <th className="tbl-head text-right">Used 7 Days</th>
                    <th className="tbl-head text-right">Used 30 Days</th>
                    <th className="tbl-head text-right">Bought 30 Days</th>
                    <th className="tbl-head text-right">Total Used</th>
                    <th className="tbl-head text-right">Total Bought</th>
                    <th className="tbl-head">Last Used</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((item) => (
                    <tr key={item._id} className="tbl-row cursor-pointer" onClick={() => openItem(item)}>
                      <td className="tbl-cell">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-primary-700">{item.name}</p>
                          <StockBadge item={item} />
                        </div>
                      </td>
                      <td className="tbl-cell whitespace-nowrap text-right font-bold text-slate-900">
                        {formatNumber(item.currentStock)}
                        {item.unit && <span className="ml-1 text-xs font-medium text-slate-400">{item.unit}</span>}
                      </td>
                      <td className="tbl-cell whitespace-nowrap text-right"><QtyCell qty={item.usedToday} unit={item.unit} /></td>
                      <td className="tbl-cell whitespace-nowrap text-right"><QtyCell qty={item.used7} unit={item.unit} /></td>
                      <td className="tbl-cell whitespace-nowrap text-right"><QtyCell qty={item.used30} unit={item.unit} strong /></td>
                      <td className="tbl-cell whitespace-nowrap text-right text-emerald-700"><QtyCell qty={item.bought30} unit={item.unit} /></td>
                      <td className="tbl-cell whitespace-nowrap text-right"><QtyCell qty={item.usedQty} unit={item.unit} /></td>
                      <td className="tbl-cell whitespace-nowrap text-right"><QtyCell qty={item.boughtQty} unit={item.unit} /></td>
                      <td className="tbl-cell whitespace-nowrap">{formatDate(item.lastUsed)}</td>
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
