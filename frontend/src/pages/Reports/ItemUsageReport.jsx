import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Factory, Fuel, Inbox, Plus, RefreshCw, Search, Truck } from 'lucide-react';
import apiClient from '../../utils/api';
import StatCard from '../../components/StatCard';
import Segmented from '../../components/Segmented';
import MaterialUsed from '../MaterialUsed';
import { describeVehicle } from '../../utils/diesel';

const formatNumber = (value) => Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const formatMoney = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const formatDate = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Local calendar date as YYYY-MM-DD ('' when the value is not a date)
const toDateKey = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

const daysAgoKey = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return toDateKey(date);
};

// "Mon, 07 Oct" for a YYYY-MM-DD key
const formatDayKey = (key) => {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });
};

const PERIODS = [
  { key: 'last7', label: 'Last 7 Days', shortLabel: '7 Days' },
  { key: 'last30', label: 'Last 30 Days', shortLabel: '30 Days' },
  { key: 'month', label: 'This Month', shortLabel: 'Month' },
  { key: 'all', label: 'Lifetime' }
];

const periodRange = (key) => {
  const today = toDateKey(new Date());
  if (key === 'last7') return { from: daysAgoKey(6), to: today };
  if (key === 'last30') return { from: daysAgoKey(29), to: today };
  if (key === 'month') {
    const now = new Date();
    return { from: toDateKey(new Date(now.getFullYear(), now.getMonth(), 1)), to: today };
  }
  return { from: '', to: '' };
};

const inRange = (dateKey, range) => (!range.from || dateKey >= range.from) && (!range.to || dateKey <= range.to);

// Every day from..to, newest first
const daysBetween = (from, to) => {
  const days = [];
  const [y, m, d] = to.split('-').map(Number);
  const cursor = new Date(y, m - 1, d);
  for (let key = to; key >= from; key = toDateKey(cursor)) {
    days.push(key);
    cursor.setDate(cursor.getDate() - 1);
  }
  return days;
};

const TABS = [
  { key: 'daily', label: 'Day-wise', icon: CalendarDays },
  { key: 'dg', label: 'DG Set', icon: Factory },
  { key: 'vehicle', label: 'Vehicles', icon: Truck },
  { key: 'entries', label: 'All Entries', icon: Fuel }
];

const USED_FOR_TEXT = { dg: 'DG Set', vehicle: 'Vehicle', other: 'Plant / Other' };

// A plant has one DG set: its report needs no picking
const DG_TARGET = { kind: 'dg', key: 'dg', name: 'DG Set', subtitle: 'Plant generator' };

const sumQty = (rows) => rows.reduce((sum, row) => sum + row.qty, 0);

// Oldest first; fills on the same date in the order they were entered
const byOldest = (a, b) => new Date(a.date) - new Date(b.date) || new Date(a.createdAt) - new Date(b.createdAt);

const isTargetRow = (row, target) => row.usedFor === target.kind && (target.kind === 'dg' || (row.vehicleId || row.vehicleNo) === target.key);

const qtyCell = (qty, unit) => (qty > 0 ? <>{formatNumber(qty)}<span className="ml-1 text-xs font-medium text-slate-400">{unit}</span></> : <span className="text-slate-300">-</span>);

// Today / 7 / 30 days / lifetime of a list of fills
const periodTotals = (rows, keys) => {
  const totals = { today: 0, d7: 0, d30: 0, life: 0, fills: rows.length, lastDate: null };
  rows.forEach((row) => {
    totals.life += row.qty;
    if (row.dateKey <= keys.today) {
      if (row.dateKey === keys.today) totals.today += row.qty;
      if (row.dateKey >= keys.from7) totals.d7 += row.qty;
      if (row.dateKey >= keys.from30) totals.d30 += row.qty;
    }
    if (!totals.lastDate || new Date(row.date) > new Date(totals.lastDate)) totals.lastDate = row.date;
  });
  return totals;
};

// One line per vehicle that ever got the item, the most used in 30 days first
const buildVehicleTargets = (usage, vehicles, keys) => {
  const vehiclesById = new Map((vehicles || []).map((vehicle) => [String(vehicle._id), vehicle]));
  const rowsByKey = new Map();
  usage.filter((row) => row.usedFor === 'vehicle').forEach((row) => {
    const key = row.vehicleId || row.vehicleNo;
    rowsByKey.set(key, [...(rowsByKey.get(key) || []), row]);
  });

  return [...rowsByKey.entries()]
    .map(([key, rows]) => {
      const vehicle = vehiclesById.get(rows[0].vehicleId);
      return {
        key,
        kind: 'vehicle',
        name: rows[0].vehicleNo || vehicle?.vehicleNo || '-',
        subtitle: vehicle ? describeVehicle(vehicle) : '',
        ...periodTotals(rows, keys)
      };
    })
    .sort((a, b) => b.d30 - a.d30 || b.life - a.life || a.name.localeCompare(b.name));
};

function EmptyState({ title, hint }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Inbox size={22} />
      </span>
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      {hint && <p className="max-w-md text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function QuickTotals({ totals, unit }) {
  return (
    <dl className="grid grid-cols-2 gap-px border-b border-slate-100 bg-slate-100 md:grid-cols-5">
      {[
        { label: 'Today', value: totals.today },
        { label: 'Last 7 Days', value: totals.d7 },
        { label: 'Last 30 Days', value: totals.d30 },
        { label: 'Lifetime', value: totals.life },
        { label: 'Per Day (30 days)', value: totals.d30 / 30 }
      ].map((item) => (
        <div key={item.label} className="bg-white px-4 py-3 last:col-span-2 md:last:col-span-1">
          <dt className="text-xs font-medium text-slate-500">{item.label}</dt>
          <dd className="mt-0.5 text-lg font-bold text-slate-900">{formatNumber(item.value)} <span className="text-xs font-medium text-slate-400">{unit}</span></dd>
        </div>
      ))}
    </dl>
  );
}

// The DG set's or one vehicle's fills, date-wise
function TargetDetail({ target, usage, unit, itemName, addLabel, onBack, children }) {
  const [periodKey, setPeriodKey] = useState('last30');
  const range = useMemo(() => periodRange(periodKey), [periodKey]);

  const { rows, stats } = useMemo(() => {
    const inPeriod = usage
      .filter((row) => isTargetRow(row, target) && inRange(row.dateKey, range))
      .sort(byOldest);
    return {
      rows: inPeriod.reverse(),
      stats: { total: sumQty(inPeriod), fills: inPeriod.length }
    };
  }, [usage, target, range]);

  return (
    <section className="panel">
      <div className="panel-header flex items-center gap-3">
        {onBack && (
          <button type="button" className="icon-btn" onClick={onBack} aria-label="Back to list" title="Back to list">
            <ArrowLeft size={16} />
          </button>
        )}
        <div className="min-w-0">
          <h2 className="truncate text-sm font-bold text-slate-900">{target.name}</h2>
          <p className="text-xs text-slate-500">{target.subtitle || USED_FOR_TEXT[target.kind]} · {itemName} used</p>
        </div>
      </div>

      {children}

      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-5">
        <h3 className="text-sm font-bold text-slate-900">Date-wise Fills</h3>
        <Segmented options={PERIODS} value={periodKey} onChange={setPeriodKey} />
      </div>

      <dl className="grid grid-cols-2 gap-px border-b border-slate-100 bg-slate-100">
        {[
          { label: 'Used', value: `${formatNumber(stats.total)} ${unit}` },
          { label: 'Fills', value: formatNumber(stats.fills) }
        ].map((item) => (
          <div key={item.label} className="bg-white px-4 py-3">
            <dt className="text-xs font-medium text-slate-500">{item.label}</dt>
            <dd className="mt-0.5 text-lg font-bold text-slate-900">{item.value}</dd>
          </div>
        ))}
      </dl>

      {rows.length === 0 ? (
        <EmptyState title="Nothing used in this period" hint={target.kind === 'dg' ? `Use "${addLabel}" and choose DG Set each time it goes to the DG.` : 'Pick a longer period to see older entries.'} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr>
                <th className="tbl-head">Date</th>
                <th className="tbl-head text-right">Qty</th>
                <th className="tbl-head">Notes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row._id} className="tbl-row">
                  <td className="tbl-cell whitespace-nowrap">{formatDate(row.date)}</td>
                  <td className="tbl-cell whitespace-nowrap text-right font-bold text-slate-900">{qtyCell(row.qty, unit)}</td>
                  <td className="tbl-cell text-slate-500"><div className="max-w-[16rem] truncate" title={row.notes || undefined}>{row.notes || '-'}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// Today / 7 / 30 days / lifetime per vehicle
function VehicleSummary({ targets, unit, onOpen }) {
  return (
    <>
      <ul className="divide-y divide-slate-100 md:hidden">
        {targets.map((target) => (
          <li key={target.key}>
            <button type="button" className="w-full px-4 py-3 text-left" onClick={() => onOpen(target)}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 truncate font-semibold text-slate-800">{target.name}</p>
                <p className="shrink-0 text-xs text-slate-500">Last: {target.lastDate ? formatDate(target.lastDate) : '-'}</p>
              </div>
              {target.subtitle && <p className="text-xs text-slate-500">{target.subtitle}</p>}
              <div className="mt-2 grid grid-cols-4 gap-2 text-center">
                {[['Today', target.today], ['7 Days', target.d7], ['30 Days', target.d30], ['Lifetime', target.life]].map(([label, qty]) => (
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
        <table className="w-full min-w-[820px] text-left">
          <thead>
            <tr>
              <th className="tbl-head">Vehicle</th>
              <th className="tbl-head text-right">Today</th>
              <th className="tbl-head text-right">Last 7 Days</th>
              <th className="tbl-head text-right">Last 30 Days</th>
              <th className="tbl-head text-right">Lifetime</th>
              <th className="tbl-head text-right">Fills</th>
              <th className="tbl-head">Last Filled</th>
            </tr>
          </thead>
          <tbody>
            {targets.map((target) => (
              <tr key={target.key} className="tbl-row cursor-pointer" onClick={() => onOpen(target)}>
                <td className="tbl-cell">
                  <p className="font-semibold text-primary-700">{target.name}</p>
                  {target.subtitle && <p className="text-xs text-slate-500">{target.subtitle}</p>}
                </td>
                <td className="tbl-cell whitespace-nowrap text-right">{qtyCell(target.today, unit)}</td>
                <td className="tbl-cell whitespace-nowrap text-right">{qtyCell(target.d7, unit)}</td>
                <td className="tbl-cell whitespace-nowrap text-right font-bold text-slate-900">{qtyCell(target.d30, unit)}</td>
                <td className="tbl-cell whitespace-nowrap text-right">{qtyCell(target.life, unit)}</td>
                <td className="tbl-cell whitespace-nowrap text-right">{formatNumber(target.fills)}</td>
                <td className="tbl-cell whitespace-nowrap">{target.lastDate ? formatDate(target.lastDate) : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/**
 * Report of one stock item: where it went (DG set, vehicles, plant) day by day, and what was bought.
 * /inventory/:id shows any item; /reports/diesel-consumption (no id) shows the account's Diesel item.
 */
export default function ItemUsageReport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('daily');
  const [periodKey, setPeriodKey] = useState('last7');
  const [search, setSearch] = useState('');
  const [selectedKey, setSelectedKey] = useState('');
  const [showAddEntry, setShowAddEntry] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      setData(await apiClient.get(id ? `/reports/item-consumption/${id}` : '/reports/diesel-consumption'));
    } catch (err) {
      setError(err.message || 'Failed to load the report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      // The entry popup handles Esc itself
      if (event.defaultPrevented || event.key !== 'Escape' || showAddEntry) return;
      if (selectedKey) setSelectedKey('');
      else navigate('/inventory');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, showAddEntry, selectedKey]);

  const unit = data?.item?.unit || '';
  const itemName = data?.item?.name || (id ? 'Item' : 'Diesel');
  const isDiesel = !id || Boolean(data?.item?.isDiesel);
  const addLabel = isDiesel ? 'Give Diesel' : 'Record Use';

  const usage = useMemo(() => (data?.usage || []).map((row) => ({ ...row, dateKey: toDateKey(row.date) })), [data]);
  const purchases = useMemo(() => (data?.purchases || []).map((row) => ({ ...row, dateKey: toDateKey(row.date) })), [data]);

  // Recomputed when the date changes, so a page left open overnight moves to the new day
  const todayKey = toDateKey(new Date());
  const keys = useMemo(() => ({ today: todayKey, from7: daysAgoKey(6), from30: daysAgoKey(29) }), [todayKey]);

  const totals = useMemo(() => {
    const between = (from) => usage.filter((row) => row.dateKey >= from && row.dateKey <= keys.today);
    const split = (rows) => ({
      total: sumQty(rows),
      dg: sumQty(rows.filter((row) => row.usedFor === 'dg')),
      vehicle: sumQty(rows.filter((row) => row.usedFor === 'vehicle')),
      other: sumQty(rows.filter((row) => row.usedFor === 'other'))
    });
    return {
      today: split(between(keys.today)),
      d7: split(between(keys.from7)),
      d30: split(between(keys.from30)),
      bought30: sumQty(purchases.filter((row) => row.dateKey >= keys.from30 && row.dateKey <= keys.today))
    };
  }, [usage, purchases, keys]);

  const dgTotals = useMemo(() => periodTotals(usage.filter((row) => row.usedFor === 'dg'), keys), [usage, keys]);
  const vehicleTargets = useMemo(() => buildVehicleTargets(usage, data?.vehicles, keys), [usage, data, keys]);

  const searchText = search.trim().toLowerCase();
  const visibleVehicles = searchText
    ? vehicleTargets.filter((target) => `${target.name} ${target.subtitle}`.toLowerCase().includes(searchText))
    : vehicleTargets;
  const selectedVehicle = selectedKey ? vehicleTargets.find((target) => target.key === selectedKey) : null;

  const range = useMemo(() => periodRange(periodKey), [periodKey]);

  // Day-wise: every day of the period (empty days too, so a missed DG fill shows); lifetime lists only days with entries
  const days = useMemo(() => {
    const byDay = new Map();
    const blank = (key) => ({ key, dg: 0, vehicle: 0, other: 0, total: 0, bought: 0 });
    if (range.from) daysBetween(range.from, range.to).forEach((key) => byDay.set(key, blank(key)));

    usage.forEach((row) => {
      if (!row.dateKey || !inRange(row.dateKey, range)) return;
      const day = byDay.get(row.dateKey) || blank(row.dateKey);
      day[row.usedFor] += row.qty;
      day.total += row.qty;
      byDay.set(row.dateKey, day);
    });
    purchases.forEach((row) => {
      if (!row.dateKey || !inRange(row.dateKey, range)) return;
      const day = byDay.get(row.dateKey) || blank(row.dateKey);
      day.bought += row.qty;
      byDay.set(row.dateKey, day);
    });

    return [...byDay.values()].sort((a, b) => b.key.localeCompare(a.key));
  }, [usage, purchases, range]);

  const dayTotals = useMemo(() => days.reduce((sum, day) => ({
    dg: sum.dg + day.dg,
    vehicle: sum.vehicle + day.vehicle,
    other: sum.other + day.other,
    total: sum.total + day.total,
    bought: sum.bought + day.bought
  }), { dg: 0, vehicle: 0, other: 0, total: 0, bought: 0 }), [days]);

  // In and out together, newest first
  const ledger = useMemo(() => {
    const rows = [
      ...usage.map((row) => ({
        id: `out-${row._id}`,
        date: row.date,
        dateKey: row.dateKey,
        kind: USED_FOR_TEXT[row.usedFor],
        name: row.usedFor === 'vehicle' ? row.vehicleNo || '-' : USED_FOR_TEXT[row.usedFor],
        out: row.qty,
        in: 0,
        detail: row.notes || ''
      })),
      ...purchases.map((row, index) => ({
        id: `in-${row._id}-${index}`,
        date: row.date,
        dateKey: row.dateKey,
        kind: 'Purchase',
        name: row.partyName || '-',
        out: 0,
        in: row.qty,
        detail: [row.refNo, row.rate ? `${formatMoney(row.rate)}/${unit}` : ''].filter(Boolean).join(' · ')
      }))
    ];
    return rows
      .filter((row) => inRange(row.dateKey, range))
      .filter((row) => !searchText || `${row.kind} ${row.name} ${row.detail}`.toLowerCase().includes(searchText))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [usage, purchases, range, searchText, unit]);

  const changeTab = (key) => {
    setTab(key);
    setSelectedKey('');
    setSearch('');
  };

  const splitHint = (split) => (split.total > 0
    ? `DG ${formatNumber(split.dg)} · Vehicles ${formatNumber(split.vehicle)}${split.other ? ` · Other ${formatNumber(split.other)}` : ''}`
    : 'Nothing used');

  const avgRate = Number(data?.avgRate || 0);
  const stats = [
    {
      icon: Fuel,
      label: 'In Stock',
      tone: 'emerald',
      value: `${formatNumber(data?.item?.currentStock)} ${unit}`,
      hint: totals.bought30 > 0 ? `Bought ${formatNumber(totals.bought30)} ${unit} in 30 days` : 'Add stock through Purchase'
    },
    { icon: CalendarDays, label: 'Given Today', tone: 'blue', value: `${formatNumber(totals.today.total)} ${unit}`, hint: splitHint(totals.today) },
    { icon: CalendarDays, label: 'Last 7 Days', tone: 'indigo', value: `${formatNumber(totals.d7.total)} ${unit}`, hint: splitHint(totals.d7) },
    {
      icon: CalendarDays,
      label: 'Last 30 Days',
      tone: 'amber',
      value: `${formatNumber(totals.d30.total)} ${unit}`,
      hint: avgRate > 0 && totals.d30.total > 0
        ? `≈ ${formatMoney(totals.d30.total * avgRate)} at ${formatMoney(avgRate)}/${unit}`
        : splitHint(totals.d30)
    }
  ];

  return (
    <div className="page-fade-in space-y-4 px-3 pb-8 pt-4 md:space-y-5 lg:px-6 lg:pt-5">
      {showAddEntry && <MaterialUsed modalOnly presetMaterialId={data?.item?._id} onModalFinish={() => { setShowAddEntry(false); loadData(); }} />}

      <div className="page-header">
        <div className="min-w-0">
          <h1 className="page-title">{itemName}</h1>
          <p className="page-subtitle">Used by the DG set, vehicles and plant · day-wise, vehicle-wise, lifetime</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="icon-btn" title="Refresh" aria-label="Refresh" onClick={loadData}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button type="button" className="btn-primary" onClick={() => setShowAddEntry(true)}>
            <Plus size={18} /> {addLabel}
          </button>
        </div>
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div>}

      {loading && !data ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-primary-600 border-r-transparent" />
          <p className="text-sm text-slate-400">Loading report…</p>
        </div>
      ) : data && (
        <div className={`space-y-4 transition-opacity md:space-y-5 ${loading ? 'pointer-events-none opacity-50' : ''}`}>
          <section className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 md:gap-4">
            {stats.map((stat) => <StatCard key={stat.label} {...stat} />)}
          </section>

          <Segmented options={TABS} value={tab} onChange={changeTab} />

          {tab === 'daily' ? (
            <section className="panel">
              <div className="panel-header flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Day-wise</h2>
                  <p className="text-xs text-slate-500">Given out and bought each day · newest first</p>
                </div>
                <Segmented options={PERIODS} value={periodKey} onChange={setPeriodKey} />
              </div>
              {days.length === 0 ? (
                <EmptyState title="No entries yet" hint={`Use "${addLabel}" each time ${itemName} goes to the DG set, a vehicle or the plant.`} />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left">
                    <thead>
                      <tr>
                        <th className="tbl-head">Date</th>
                        <th className="tbl-head text-right">DG Set</th>
                        <th className="tbl-head text-right">Vehicles</th>
                        <th className="tbl-head text-right">Plant / Other</th>
                        <th className="tbl-head text-right">Total Given</th>
                        <th className="tbl-head text-right">Bought</th>
                      </tr>
                    </thead>
                    <tbody>
                      {days.map((day) => (
                        <tr key={day.key} className={`tbl-row ${day.total === 0 && day.bought === 0 ? 'text-slate-400' : ''}`}>
                          <td className="tbl-cell whitespace-nowrap">{formatDayKey(day.key)}</td>
                          <td className="tbl-cell whitespace-nowrap text-right">{qtyCell(day.dg, unit)}</td>
                          <td className="tbl-cell whitespace-nowrap text-right">{qtyCell(day.vehicle, unit)}</td>
                          <td className="tbl-cell whitespace-nowrap text-right">{qtyCell(day.other, unit)}</td>
                          <td className="tbl-cell whitespace-nowrap text-right font-bold text-slate-900">{qtyCell(day.total, unit)}</td>
                          <td className="tbl-cell whitespace-nowrap text-right text-emerald-700">{qtyCell(day.bought, unit)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 font-bold text-slate-900">
                        <td className="tbl-cell">Total</td>
                        <td className="tbl-cell whitespace-nowrap text-right">{qtyCell(dayTotals.dg, unit)}</td>
                        <td className="tbl-cell whitespace-nowrap text-right">{qtyCell(dayTotals.vehicle, unit)}</td>
                        <td className="tbl-cell whitespace-nowrap text-right">{qtyCell(dayTotals.other, unit)}</td>
                        <td className="tbl-cell whitespace-nowrap text-right">{qtyCell(dayTotals.total, unit)}</td>
                        <td className="tbl-cell whitespace-nowrap text-right text-emerald-700">{qtyCell(dayTotals.bought, unit)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </section>
          ) : tab === 'dg' ? (
            <TargetDetail target={DG_TARGET} usage={usage} unit={unit} itemName={itemName} addLabel={addLabel}>
              <QuickTotals totals={dgTotals} unit={unit} />
            </TargetDetail>
          ) : tab === 'vehicle' ? (
            selectedVehicle ? (
              <TargetDetail target={selectedVehicle} usage={usage} unit={unit} itemName={itemName} addLabel={addLabel} onBack={() => setSelectedKey('')}>
                <QuickTotals totals={selectedVehicle} unit={unit} />
              </TargetDetail>
            ) : (
              <section className="panel">
                <div className="panel-header flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Vehicle-wise</h2>
                    <p className="text-xs text-slate-500">Most used in 30 days first · tap a vehicle for its date-wise report</p>
                  </div>
                  <div className="relative md:w-64">
                    <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input className="input pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search vehicle..." />
                  </div>
                </div>
                {visibleVehicles.length === 0 ? (
                  <EmptyState
                    title={vehicleTargets.length === 0 ? 'Not used by any vehicle yet' : 'No matching vehicle'}
                    hint={vehicleTargets.length === 0 ? `Use "${addLabel}", choose Vehicle and pick your loader, truck or JCB.` : 'Try another vehicle number.'}
                  />
                ) : (
                  <VehicleSummary targets={visibleVehicles} unit={unit} onOpen={(target) => setSelectedKey(target.key)} />
                )}
              </section>
            )
          ) : (
            <section className="panel">
              <div className="panel-header flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">All Entries</h2>
                  <p className="text-xs text-slate-500">Bought and given out · newest first</p>
                </div>
                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                  <div className="relative md:w-56">
                    <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input className="input pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search..." />
                  </div>
                  <Segmented options={PERIODS} value={periodKey} onChange={setPeriodKey} />
                </div>
              </div>
              {ledger.length === 0 ? (
                <EmptyState title="No entries found" hint="Try another period or search." />
              ) : (
                <>
                  <ul className="divide-y divide-slate-100 md:hidden">
                    {ledger.map((row) => (
                      <li key={row.id} className="flex items-start justify-between gap-3 px-4 py-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-800">{row.name}</p>
                          <p className="text-xs text-slate-500">{formatDate(row.date)} · {row.kind}</p>
                          {row.detail && <p className="mt-0.5 truncate text-xs text-slate-500">{row.detail}</p>}
                        </div>
                        <p className={`shrink-0 font-bold ${row.in ? 'text-emerald-700' : 'text-slate-900'}`}>
                          {row.in ? `+${formatNumber(row.in)}` : `−${formatNumber(row.out)}`} <span className="text-xs font-medium text-slate-400">{unit}</span>
                        </p>
                      </li>
                    ))}
                  </ul>
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[720px] text-left">
                      <thead>
                        <tr>
                          <th className="tbl-head">Date</th>
                          <th className="tbl-head">Type</th>
                          <th className="tbl-head">Given To / Bought From</th>
                          <th className="tbl-head">Details</th>
                          <th className="tbl-head text-right">Bought</th>
                          <th className="tbl-head text-right">Given</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ledger.map((row) => (
                          <tr key={row.id} className="tbl-row">
                            <td className="tbl-cell whitespace-nowrap">{formatDate(row.date)}</td>
                            <td className="tbl-cell whitespace-nowrap"><span className={row.in ? 'badge-green' : 'badge-gray'}>{row.kind}</span></td>
                            <td className="tbl-cell font-semibold text-slate-800">{row.name}</td>
                            <td className="tbl-cell text-slate-500"><div className="max-w-[18rem] truncate" title={row.detail || undefined}>{row.detail || '-'}</div></td>
                            <td className="tbl-cell whitespace-nowrap text-right font-bold text-emerald-700">{qtyCell(row.in, unit)}</td>
                            <td className="tbl-cell whitespace-nowrap text-right font-bold text-slate-900">{qtyCell(row.out, unit)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              <p className="border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500 md:px-5">
                Bought {formatNumber(ledger.reduce((sum, row) => sum + row.in, 0))} {unit} · Given {formatNumber(ledger.reduce((sum, row) => sum + row.out, 0))} {unit}
              </p>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
