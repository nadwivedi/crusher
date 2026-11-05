import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CalendarDays, Fuel, Gauge, IndianRupee, Info, RefreshCw, X } from 'lucide-react';
import apiClient from '../../utils/api';
import StatCard from '../../components/StatCard';
import Segmented from '../../components/Segmented';
import CustomRangePopup, { formatRangeLabel } from '../../components/CustomRangePopup';
import { meterUnitFor, sortVehiclesForFuel, describeVehicle } from '../../utils/diesel';
import { formatDayKey, formatNumber, toDateKey } from '../../utils/meterReading';

const formatMoney = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const fixed = (value, digits = 2) => Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits });

// A period this much worse than the machine's own lifetime average is flagged
const LOW_AVERAGE_MARGIN = 0.15;

const PERIODS = [
  { key: 'month', label: 'This Month', shortLabel: 'Month' },
  { key: 'lastMonth', label: 'Last Month', shortLabel: 'Last Mo.' },
  { key: 'last3', label: 'Last 3 Months', shortLabel: '3 Months' },
  { key: 'all', label: 'Lifetime' },
  { key: 'custom', label: 'Custom', icon: CalendarDays }
];

const periodRange = (key, custom) => {
  const now = new Date();
  const today = toDateKey(now);
  if (key === 'month') return { from: toDateKey(new Date(now.getFullYear(), now.getMonth(), 1)), to: today };
  if (key === 'lastMonth') {
    return {
      from: toDateKey(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
      to: toDateKey(new Date(now.getFullYear(), now.getMonth(), 0))
    };
  }
  if (key === 'last3') return { from: toDateKey(new Date(now.getFullYear(), now.getMonth() - 2, 1)), to: today };
  if (key === 'custom' && custom.from && custom.to) return custom;
  return { from: '', to: '' };
};

const inRange = (dateKey, range) => (!range.from || dateKey >= range.from) && (!range.to || dateKey <= range.to);

const monthLabel = (monthKey) => {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
};

const byOldest = (a, b) => a.dateKey.localeCompare(b.dateKey) || new Date(a.createdAt) - new Date(b.createdAt);

const keyOf = (row) => (row.machine === 'dg' ? 'dg' : String(row.vehicleId || row.vehicleNo));

/**
 * Diesel and running of one machine over some readings and issues.
 * Run is the meter covered: last reading less the first opening, so days without an entry still count.
 * When the meter went back (changed or reset) only the day-wise runs are added up.
 */
const measure = (readings, issues, unit) => {
  const sorted = [...readings].sort(byOldest);
  const litres = issues.reduce((sum, issue) => sum + issue.qty, 0);
  let recorded = 0;
  let steady = true;
  let lastEnd = null;
  sorted.forEach((reading) => {
    if (reading.closing !== null) recorded += reading.closing - reading.opening;
    if (lastEnd !== null && reading.opening < lastEnd - 0.001) steady = false;
    lastEnd = reading.closing ?? reading.opening;
  });
  const span = sorted.length && steady ? lastEnd - sorted[0].opening : recorded;
  const run = Math.max(0, span);
  let average = null;
  if (run > 0 && litres > 0) average = unit === 'hr' ? litres / run : run / litres;
  return {
    litres,
    run,
    unrecorded: Math.max(0, run - recorded),
    readingDays: new Set(sorted.map((reading) => reading.dateKey)).size,
    meterFrom: sorted.length ? sorted[0].opening : null,
    meterTo: lastEnd,
    meterReset: !steady,
    average
  };
};

// KM machines: more KM per litre is better. Hour machines: fewer litres per hour is better.
const isWorse = (average, usual, unit) => (
  average !== null && usual !== null && (unit === 'hr' ? average > usual * (1 + LOW_AVERAGE_MARGIN) : average < usual * (1 - LOW_AVERAGE_MARGIN))
);

const averageUnit = (unit) => (unit === 'hr' ? 'ltr/hr' : 'km/ltr');
const runUnit = (unit) => (unit === 'hr' ? 'hr' : 'km');

const STATUS = {
  low: { label: 'Low average', className: 'bg-rose-50 text-rose-700 ring-rose-200' },
  good: { label: 'Normal', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  first: { label: 'Average', className: 'bg-sky-50 text-sky-700 ring-sky-200' },
  noMeter: { label: 'No meter reading', className: 'bg-amber-50 text-amber-700 ring-amber-200' },
  noDiesel: { label: 'No diesel issued', className: 'bg-slate-100 text-slate-600 ring-slate-200' }
};

const statusOf = (row, compare) => {
  if (row.litres > 0 && row.run <= 0) return 'noMeter';
  if (row.run > 0 && row.litres <= 0) return 'noDiesel';
  if (!compare) return 'first';
  return isWorse(row.average, row.usual, row.unit) ? 'low' : 'good';
};

const StatusBadge = ({ status }) => (
  <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${STATUS[status].className}`}>{STATUS[status].label}</span>
);

const AverageText = ({ value, unit, className = '' }) => (value === null
  ? <span className="text-slate-300">-</span>
  : <span className={className}>{fixed(value)} <span className="text-xs font-medium text-slate-500">{averageUnit(unit)}</span></span>);

/** One machine: its months and its days, diesel against the meter. */
function MachineDetail({ machine, range, rangeLabel, avgRate, onClose }) {
  const { unit } = machine;

  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const months = useMemo(() => {
    const keys = [...new Set([...machine.readings, ...machine.issues].map((row) => row.dateKey.slice(0, 7)))].sort().reverse().slice(0, 12);
    return keys.map((monthKey) => ({
      monthKey,
      ...measure(
        machine.readings.filter((row) => row.dateKey.startsWith(monthKey)),
        machine.issues.filter((row) => row.dateKey.startsWith(monthKey)),
        unit
      )
    }));
  }, [machine, unit]);

  const days = useMemo(() => {
    const map = new Map();
    const dayOf = (dateKey) => {
      if (!map.has(dateKey)) map.set(dateKey, { dateKey, readings: [], litres: 0, pump: false });
      return map.get(dateKey);
    };
    machine.readings.filter((row) => inRange(row.dateKey, range)).forEach((row) => dayOf(row.dateKey).readings.push(row));
    machine.issues.filter((row) => inRange(row.dateKey, range)).forEach((row) => {
      const day = dayOf(row.dateKey);
      day.litres += row.qty;
      if (row.source === 'pump') day.pump = true;
    });
    return [...map.values()].sort((a, b) => b.dateKey.localeCompare(a.dateKey)).map((day) => {
      const sorted = [...day.readings].sort(byOldest);
      const run = sorted.reduce((sum, row) => sum + (row.closing !== null ? row.closing - row.opening : 0), 0);
      return {
        ...day,
        opening: sorted.length ? sorted[0].opening : null,
        closing: sorted.length ? sorted[sorted.length - 1].closing : null,
        running: sorted.some((row) => row.closing === null),
        run
      };
    });
  }, [machine, range]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 md:p-4" onClick={onClose}>
      <div className="flex max-h-[95vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl md:rounded-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 bg-gradient-to-r from-[#1f2a3c] via-[#27374f] to-[#314866] px-4 py-3 text-white md:px-5">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold">{machine.name} · Diesel Average</h2>
            <p className="text-xs text-slate-300">{[machine.subtitle, rangeLabel].filter(Boolean).join(' · ')}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 hover:bg-white/20"><X size={18} /></button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-3 md:p-5">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
            <StatCard compact tone="indigo" icon={Gauge} label="Average" value={machine.average !== null ? `${fixed(machine.average)} ${averageUnit(unit)}` : '-'} hint={machine.usual !== null ? `Usual ${fixed(machine.usual)}` : ''} />
            <StatCard compact tone="amber" icon={Fuel} label="Diesel" value={`${formatNumber(machine.litres)} ltr`} />
            <StatCard compact tone="emerald" icon={Gauge} label={unit === 'hr' ? 'Hours Run' : 'KM Run'} value={`${formatNumber(machine.run)} ${runUnit(unit)}`} hint={machine.meterFrom !== null ? `Meter ${formatNumber(machine.meterFrom)} → ${formatNumber(machine.meterTo)}` : ''} />
            <StatCard compact tone="rose" icon={IndianRupee} label={`Cost per ${runUnit(unit)}`} value={avgRate > 0 && machine.run > 0 ? `₹${fixed((machine.litres * avgRate) / machine.run)}` : '-'} hint={avgRate > 0 ? `${formatMoney(machine.litres * avgRate)} diesel` : ''} />
          </div>

          {machine.meterReset && (
            <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              The meter went back in this period (changed or reset), so only the day-wise runs are added up.
            </p>
          )}

          <section>
            <h3 className="mb-2 text-sm font-bold text-slate-800">Month-wise</h3>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr>
                    <th className="tbl-head">Month</th>
                    <th className="tbl-head text-right">Diesel</th>
                    <th className="tbl-head text-right">{unit === 'hr' ? 'Hours' : 'KM'}</th>
                    <th className="tbl-head text-right">Average</th>
                    <th className="tbl-head text-right">Meter Days</th>
                  </tr>
                </thead>
                <tbody>
                  {months.map((month) => (
                    <tr key={month.monthKey} className="tbl-row">
                      <td className="tbl-cell whitespace-nowrap font-semibold text-slate-800">{monthLabel(month.monthKey)}</td>
                      <td className="tbl-cell whitespace-nowrap text-right">{formatNumber(month.litres)} ltr</td>
                      <td className="tbl-cell whitespace-nowrap text-right">{formatNumber(month.run)} {runUnit(unit)}</td>
                      <td className="tbl-cell whitespace-nowrap text-right font-bold">
                        <AverageText value={month.average} unit={unit} className={isWorse(month.average, machine.usual, unit) ? 'text-rose-700' : 'text-slate-900'} />
                      </td>
                      <td className="tbl-cell text-right text-slate-500">{month.readingDays}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-bold text-slate-800">Day-wise · {rangeLabel}</h3>
            {days.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">Nothing in this period.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead>
                    <tr>
                      <th className="tbl-head">Date</th>
                      <th className="tbl-head text-right">Opening</th>
                      <th className="tbl-head text-right">Closing</th>
                      <th className="tbl-head text-right">Run</th>
                      <th className="tbl-head text-right">Diesel</th>
                    </tr>
                  </thead>
                  <tbody>
                    {days.map((day) => (
                      <tr key={day.dateKey} className="tbl-row">
                        <td className="tbl-cell whitespace-nowrap font-semibold text-slate-800">{formatDayKey(day.dateKey)}</td>
                        <td className="tbl-cell whitespace-nowrap text-right">{day.opening !== null ? formatNumber(day.opening) : <span className="text-slate-300">-</span>}</td>
                        <td className="tbl-cell whitespace-nowrap text-right">
                          {day.closing !== null ? formatNumber(day.closing) : day.running ? <span className="text-xs font-semibold text-amber-600">Running</span> : <span className="text-slate-300">-</span>}
                        </td>
                        <td className="tbl-cell whitespace-nowrap text-right">{day.run > 0 ? `${formatNumber(day.run)} ${runUnit(unit)}` : <span className="text-slate-300">-</span>}</td>
                        <td className="tbl-cell whitespace-nowrap text-right font-semibold">
                          {day.litres > 0 ? (
                            <span className="text-amber-700">{formatNumber(day.litres)} ltr{day.pump && <span className="ml-1 text-[11px] font-medium text-slate-500">pump</span>}</span>
                          ) : <span className="text-slate-300">-</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

/** Average of every vehicle and the DG set: diesel issued against its KM / hour meter. */
export default function DieselAverage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('month');
  const [custom, setCustom] = useState({ from: '', to: '' });
  const [showCustom, setShowCustom] = useState(false);
  const [openKey, setOpenKey] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await apiClient.get('/reports/diesel-average'));
    } catch (err) {
      setError(err?.message || 'Failed to load the diesel average');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const range = useMemo(() => periodRange(period, custom), [period, custom]);
  const rangeLabel = period === 'all' ? 'Lifetime' : period === 'custom' ? formatRangeLabel(range.from, range.to) : PERIODS.find((item) => item.key === period)?.label;
  const avgRate = data?.avgRate || 0;

  // Every machine with its readings and issues, lifetime
  const machines = useMemo(() => {
    if (!data) return [];
    const list = new Map();
    const add = (key, fields) => {
      if (!list.has(key)) list.set(key, { key, readings: [], issues: [], ...fields });
      return list.get(key);
    };
    sortVehiclesForFuel(data.vehicles).forEach((vehicle) => {
      add(String(vehicle._id), {
        name: vehicle.vehicleNo,
        subtitle: describeVehicle(vehicle),
        unit: meterUnitFor('vehicle', vehicle.category, vehicle.meterUnit),
        ownership: vehicle.ownership
      });
    });
    const machineFor = (row) => {
      if (row.machine === 'dg') return add('dg', { name: 'DG Set', subtitle: 'Plant generator', unit: 'hr', ownership: 'dg' });
      return add(keyOf(row), { name: row.vehicleNo || '-', subtitle: '', unit: row.unit || 'km', ownership: 'other' });
    };
    data.readings.forEach((row) => machineFor(row).readings.push({ ...row, dateKey: toDateKey(row.date) }));
    data.issues.forEach((row) => machineFor(row).issues.push({ ...row, dateKey: toDateKey(row.date) }));
    // A machine's meter unit follows its readings when they say otherwise
    list.forEach((machine) => { if (machine.readings[0]?.unit) machine.unit = machine.readings[0].unit; });
    return [...list.values()].sort((a, b) => (a.key === 'dg' ? -1 : b.key === 'dg' ? 1 : 0));
  }, [data]);

  const compare = period !== 'all';
  const rows = useMemo(() => machines.map((machine) => {
    const periodReadings = machine.readings.filter((row) => inRange(row.dateKey, range));
    const periodIssues = machine.issues.filter((row) => inRange(row.dateKey, range));
    const lifetime = measure(machine.readings, machine.issues, machine.unit);
    const row = { ...machine, ...measure(periodReadings, periodIssues, machine.unit), usual: lifetime.average };
    return { ...row, status: statusOf(row, compare) };
  }).filter((row) => row.litres > 0 || row.run > 0), [machines, range, compare]);

  const totals = useMemo(() => ({
    litres: rows.reduce((sum, row) => sum + row.litres, 0),
    low: rows.filter((row) => row.status === 'low').length,
    noMeter: rows.filter((row) => row.status === 'noMeter').length
  }), [rows]);

  const idle = machines.filter((machine) => machine.ownership !== 'party' && !rows.some((row) => row.key === machine.key)).length;
  const openRow = rows.find((row) => row.key === openKey) || null;

  const pickPeriod = (key) => {
    if (key === 'custom') {
      setShowCustom(true);
      return;
    }
    setPeriod(key);
  };

  return (
    <div className="page-fade-in space-y-4 px-3 pb-8 pt-4 md:space-y-5 lg:px-6 lg:pt-5">
      {showCustom && (
        <CustomRangePopup
          from={custom.from || range.from || toDateKey(new Date())}
          to={custom.to || range.to || toDateKey(new Date())}
          title="Diesel Average Period"
          subtitle="Diesel and meter readings between these dates"
          onApply={(from, to) => {
            setCustom({ from, to });
            setPeriod('custom');
            setShowCustom(false);
          }}
          onClose={() => setShowCustom(false)}
        />
      )}
      {openRow && <MachineDetail machine={openRow} range={range} rangeLabel={rangeLabel} avgRate={avgRate} onClose={() => setOpenKey('')} />}

      <div className="page-header">
        <div className="min-w-0">
          <h1 className="page-title">Diesel Average</h1>
          <p className="page-subtitle">Diesel issued against the KM / hour meter of every vehicle and the DG set</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="icon-btn" title="Refresh" aria-label="Refresh" onClick={loadData}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <Link to="/meter-readings" className="btn-secondary"><Gauge size={16} /> Meter Reading</Link>
          <Link to="/reports/diesel-consumption" className="btn-secondary"><Fuel size={16} /> Diesel Report</Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Segmented options={PERIODS} value={period} onChange={pickPeriod} />
        {period === 'custom' && <span className="text-xs font-semibold text-slate-600">{rangeLabel}</span>}
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div>}

      {loading && !data ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-primary-600 border-r-transparent" />
          <p className="text-sm text-slate-400">Loading report…</p>
        </div>
      ) : data && (
        <>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
            <StatCard tone="amber" icon={Fuel} label="Diesel Issued" value={`${formatNumber(totals.litres)} ltr`} hint={`To vehicles and DG · ${rangeLabel}`} />
            <StatCard tone="indigo" icon={IndianRupee} label="Diesel Cost" value={avgRate > 0 ? formatMoney(totals.litres * avgRate) : '-'} hint={avgRate > 0 ? `At avg ₹${fixed(avgRate)}/ltr bought` : 'No diesel purchase yet'} />
            <StatCard tone="rose" icon={AlertTriangle} label="Low Average" value={compare ? totals.low : '-'} hint={compare ? `${Math.round(LOW_AVERAGE_MARGIN * 100)}% worse than their usual` : 'Pick a period to compare'} />
            <StatCard tone="slate" icon={Gauge} label="No Meter Reading" value={totals.noMeter} hint="Diesel given, meter not entered" />
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {rows.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <p className="font-semibold text-slate-800">No diesel or meter reading in this period</p>
                <p className="text-sm text-slate-500">Issue diesel in Material Used and enter meter readings to see each vehicle&apos;s average.</p>
              </div>
            ) : (
              <>
                {/* Phones: one card per machine */}
                <ul className="divide-y divide-slate-100 md:hidden">
                  {rows.map((row) => (
                    <li key={row.key}>
                      <button type="button" onClick={() => setOpenKey(row.key)} className="w-full px-4 py-3 text-left hover:bg-slate-50">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate font-bold text-slate-900">{row.name}</p>
                            <p className="truncate text-xs text-slate-500">{row.subtitle || '-'}</p>
                          </div>
                          <StatusBadge status={row.status} />
                        </div>
                        <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                          <div><p className="text-slate-500">Diesel</p><p className="font-semibold text-slate-800">{formatNumber(row.litres)} ltr</p></div>
                          <div><p className="text-slate-500">Run</p><p className="font-semibold text-slate-800">{formatNumber(row.run)} {runUnit(row.unit)}</p></div>
                          <div><p className="text-slate-500">Average</p><p className="font-bold"><AverageText value={row.average} unit={row.unit} className={row.status === 'low' ? 'text-rose-700' : 'text-slate-900'} /></p></div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>

                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr>
                        <th className="tbl-head">Vehicle</th>
                        <th className="tbl-head text-right">Diesel</th>
                        <th className="tbl-head text-right">Run</th>
                        <th className="tbl-head text-right">Average</th>
                        <th className="tbl-head text-right">Usual</th>
                        <th className="tbl-head text-right">Cost / km or hr</th>
                        <th className="tbl-head">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.key} className="tbl-row cursor-pointer" onClick={() => setOpenKey(row.key)}>
                          <td className="tbl-cell">
                            <p className="font-bold text-slate-900">{row.name}</p>
                            <p className="text-xs text-slate-500">{[row.subtitle, row.readingDays ? `${row.readingDays} meter day${row.readingDays === 1 ? '' : 's'}` : ''].filter(Boolean).join(' · ') || '-'}</p>
                          </td>
                          <td className="tbl-cell whitespace-nowrap text-right font-semibold text-amber-700">{formatNumber(row.litres)} ltr</td>
                          <td className="tbl-cell whitespace-nowrap text-right">
                            {formatNumber(row.run)} {runUnit(row.unit)}
                            {row.unrecorded > 0 && <p className="text-[11px] text-slate-500">{formatNumber(row.unrecorded)} between entries</p>}
                          </td>
                          <td className="tbl-cell whitespace-nowrap text-right font-bold">
                            <AverageText value={row.average} unit={row.unit} className={row.status === 'low' ? 'text-rose-700' : 'text-slate-900'} />
                          </td>
                          <td className="tbl-cell whitespace-nowrap text-right text-slate-600">{compare ? <AverageText value={row.usual} unit={row.unit} /> : <span className="text-slate-300">-</span>}</td>
                          <td className="tbl-cell whitespace-nowrap text-right">
                            {avgRate > 0 && row.run > 0 ? `₹${fixed((row.litres * avgRate) / row.run)}/${runUnit(row.unit)}` : <span className="text-slate-300">-</span>}
                          </td>
                          <td className="tbl-cell"><StatusBadge status={row.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
            <Info size={14} className="mt-0.5 shrink-0 text-slate-400" />
            <div className="space-y-1">
              <p>
                <b>How it is worked out:</b> diesel is every issue to the vehicle in the period, from stock or a pump fill. Run is the meter covered:
                the last reading less the first opening, so days with no entry still count. Trucks and cars show <b>km per litre</b>; JCB, loader, PC, tractor and the DG set show <b>litres per hour</b>.
              </p>
              <p>
                <b>Usual</b> is the vehicle&apos;s own lifetime average; a period {Math.round(LOW_AVERAGE_MARGIN * 100)}% worse is marked <b>Low average</b>. Longer periods give a truer average, since diesel filled near the end is burnt in the next one.
                Tap a vehicle for its month-wise and day-wise detail.
              </p>
              {idle > 0 && <p>{idle} of your vehicles had no diesel or meter reading in this period.</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
