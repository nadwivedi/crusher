import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { CalendarDays, Factory, Gauge, Inbox, Pencil, Plus, RefreshCw, Trash2, Truck } from 'lucide-react';
import apiClient from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { canDeleteEntries, canEditEntry } from '../utils/staffAccess';
import MeterReadingPopup from '../components/MeterReadingPopup';
import StatCard from '../components/StatCard';
import Segmented from '../components/Segmented';
import { meterUnitFor, sortVehiclesForFuel } from '../utils/diesel';
import { getVehicleCategoryLabel } from '../utils/transport';
import {
  DG_KEY, byOldest, daysAgoKey, formatDayKey, formatNumber, hasValue, machineKeyOf, runLabel, toDateKey, unitText, withDateKeys
} from '../utils/meterReading';

const TOAST_OPTIONS = { position: 'top-right', autoClose: 2200 };

const PERIODS = [
  { key: 'today', label: 'Today' },
  { key: 'last7', label: 'Last 7 Days', shortLabel: '7 Days' },
  { key: 'last30', label: 'Last 30 Days', shortLabel: '30 Days' },
  { key: 'all', label: 'Lifetime' }
];

const PERIOD_FROM = { today: 0, last7: 6, last30: 29 };

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

// Opening that does not follow on from the machine's last closing
function GapBadge({ gap, unit }) {
  if (!gap) return null;
  return (
    <span
      className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${gap > 0 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-700'}`}
      title={gap > 0 ? 'Opening is more than the last closing' : 'Opening is less than the last closing'}
    >
      {gap > 0 ? '+' : '−'}{formatNumber(Math.abs(gap))} {unitText(unit)} gap
    </span>
  );
}

// "AB11HG1234 (Loader)", or just the number when the vehicle has no type
const vehicleLabel = (vehicleNo, category) => {
  const type = getVehicleCategoryLabel(category);
  return type ? `${vehicleNo} (${type})` : vehicleNo;
};

export default function MeterReadings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [readings, setReadings] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [periodKey, setPeriodKey] = useState('last30');
  // Empty until picked: the page opens on the first vehicle, or the DG set when there is none
  const [machineKey, setMachineKey] = useState('');
  const [popup, setPopup] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [readingResponse, vehicleResponse] = await Promise.all([
        apiClient.get('/meter-readings'),
        apiClient.get('/vehicles')
      ]);
      setReadings(Array.isArray(readingResponse?.data) ? readingResponse.data : []);
      setVehicles(sortVehiclesForFuel(Array.isArray(vehicleResponse) ? vehicleResponse : []));
    } catch (err) {
      setError(err.message || 'Failed to load meter readings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.defaultPrevented || event.key !== 'Escape' || popup) return;
      navigate('/');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, popup]);

  // Each reading with its date key, run, and the gap from the same machine's previous closing
  const rows = useMemo(() => {
    const withKeys = withDateKeys(readings);
    const lastClosing = new Map();
    const gaps = new Map();
    [...withKeys].sort(byOldest).forEach((reading) => {
      const key = machineKeyOf(reading);
      const previous = lastClosing.get(key);
      if (hasValue(previous)) gaps.set(reading._id, Number(reading.openingReading) - Number(previous));
      lastClosing.set(key, hasValue(reading.closingReading) ? reading.closingReading : null);
    });
    return withKeys.map((reading) => ({ ...reading, gap: gaps.get(reading._id) || 0 }));
  }, [readings]);

  // DG set first, then my and hired vehicles, then any other vehicle that already has readings
  const machines = useMemo(() => {
    const list = [{ key: DG_KEY, name: 'DG Set', unit: 'hr' }];
    const listed = new Set([DG_KEY]);
    const withReadings = new Set(rows.map(machineKeyOf));
    vehicles.forEach((vehicle) => {
      const key = String(vehicle._id);
      if (vehicle.ownership === 'party' && !withReadings.has(key)) return;
      list.push({ key, name: vehicleLabel(vehicle.vehicleNo, vehicle.category), unit: meterUnitFor('vehicle', vehicle.category) });
      listed.add(key);
    });
    // Readings of a vehicle that was deleted since
    rows.forEach((reading) => {
      const key = machineKeyOf(reading);
      if (listed.has(key)) return;
      list.push({ key, name: reading.vehicleNo || '-', unit: reading.meterUnit });
      listed.add(key);
    });
    return list.map((machine) => ({ ...machine, running: rows.some((reading) => machineKeyOf(reading) === machine.key && !hasValue(reading.closingReading)) }));
  }, [rows, vehicles]);

  const machine = machines.find((item) => item.key === machineKey) || machines[1] || machines[0];
  const unit = machine.unit;

  const todayKey = toDateKey(new Date());
  const machineRows = useMemo(() => rows.filter((reading) => machineKeyOf(reading) === machine.key), [rows, machine.key]);

  const stats = useMemo(() => {
    const runFrom = (from) => machineRows
      .filter((reading) => reading.dateKey >= from && reading.dateKey <= todayKey)
      .reduce((sum, reading) => sum + (reading.run || 0), 0);
    const last = [...machineRows].sort(byOldest).at(-1);
    const yesterdayKey = daysAgoKey(1);
    const yesterdayRows = machineRows.filter((reading) => reading.dateKey === yesterdayKey);
    return {
      yesterday: yesterdayRows.reduce((sum, reading) => sum + (reading.run || 0), 0),
      // Yesterday has an entry still waiting for its closing
      yesterdayOpen: yesterdayRows.some((reading) => !hasValue(reading.closingReading)),
      yesterdayCount: yesterdayRows.length,
      today: runFrom(todayKey),
      d7: runFrom(daysAgoKey(6)),
      d30: runFrom(daysAgoKey(29)),
      meterNow: last ? (hasValue(last.closingReading) ? last.closingReading : last.openingReading) : null,
      lastDate: last?.dateKey || ''
    };
  }, [machineRows, todayKey]);

  const fromKey = periodKey === 'all' ? '' : daysAgoKey(PERIOD_FROM[periodKey]);
  const visible = machineRows
    .filter((reading) => (!fromKey || reading.dateKey >= fromKey) && reading.dateKey <= todayKey)
    .sort((a, b) => byOldest(b, a));
  const periodRun = visible.reduce((sum, reading) => sum + (reading.run || 0), 0);

  const handleDelete = async (reading) => {
    if (!window.confirm(`Delete the ${machine.name} reading of ${formatDayKey(reading.dateKey)}?`)) return;
    try {
      await apiClient.delete(`/meter-readings/${reading._id}`);
      toast.success('Reading deleted', TOAST_OPTIONS);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Could not delete the reading', TOAST_OPTIONS);
    }
  };

  const closeCell = (reading) => (hasValue(reading.closingReading)
    ? formatNumber(reading.closingReading)
    : <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-700">Running</span>);

  const actions = (reading) => (
    <div className="flex justify-end gap-1">
      {/* Staff edit only the readings they added; deleting is for the owner */}
      {canEditEntry(user, reading) && (
        <button type="button" className="icon-btn" title="Edit" aria-label="Edit" onClick={() => setPopup({ editing: reading })}>
          <Pencil size={15} />
        </button>
      )}
      {canDeleteEntries(user) && (
        <button type="button" className="icon-btn text-rose-600" title="Delete" aria-label="Delete" onClick={() => handleDelete(reading)}>
          <Trash2 size={15} />
        </button>
      )}
    </div>
  );

  return (
    <div className="page-fade-in space-y-4 px-3 pb-8 pt-4 md:space-y-5 lg:px-6 lg:pt-5">
      {popup && (
        <MeterReadingPopup
          readings={rows}
          vehicles={vehicles}
          editing={popup.editing || null}
          presetMachine={machine.key}
          onClose={() => setPopup(null)}
          onSaved={() => { setPopup(null); loadData(); }}
        />
      )}

      <div className="page-header">
        <div className="min-w-0">
          <h1 className="page-title">Meter Reading</h1>
          <p className="page-subtitle">Opening and closing KM / hour meter of the DG set and every vehicle</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="icon-btn" title="Refresh" aria-label="Refresh" onClick={loadData}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button type="button" className="btn-primary" onClick={() => setPopup({})}>
            <Plus size={18} /> Add Reading
          </button>
        </div>
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div>}

      <section className="panel p-3 md:p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Choose DG or vehicle</p>
        <div className="flex flex-wrap gap-2">
          {machines.map((item) => {
            const active = item.key === machine.key;
            const MachineIcon = item.key === DG_KEY ? Factory : Truck;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setMachineKey(item.key)}
                aria-pressed={active}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${
                  active
                    ? 'border-primary-600 bg-primary-600 text-white shadow-sm'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-primary-300 hover:bg-primary-50'
                }`}
              >
                <MachineIcon size={15} />
                {item.name}
                {item.running && <span className={`h-2 w-2 rounded-full ${active ? 'bg-white' : 'bg-sky-500'}`} title="Has an entry with no closing yet" />}
              </button>
            );
          })}
        </div>
        {machines.length === 1 && (
          <p className="mt-2 text-xs text-slate-500">Add your own or hired vehicles in Vehicles to record their meters here.</p>
        )}
      </section>

      <section className="grid grid-cols-2 gap-2.5 lg:grid-cols-5 md:gap-4">
        <div className="col-span-2 lg:col-span-1">
          <StatCard
            icon={CalendarDays}
            tone="rose"
            label={`${runLabel(unit)} Yesterday`}
            value={stats.yesterdayCount > 0 ? `${formatNumber(stats.yesterday)} ${unitText(unit)}` : '-'}
            hint={stats.yesterdayCount === 0 ? 'No reading for yesterday' : stats.yesterdayOpen ? 'Closing not entered yet' : formatDayKey(daysAgoKey(1))}
          />
        </div>
        <StatCard icon={CalendarDays} tone="amber" label={`${runLabel(unit)} Today`} value={`${formatNumber(stats.today)} ${unitText(unit)}`} hint="Closing at night" />
        <StatCard icon={CalendarDays} tone="indigo" label="Last 7 Days" value={`${formatNumber(stats.d7)} ${unitText(unit)}`} />
        <StatCard icon={CalendarDays} tone="blue" label="Last 30 Days" value={`${formatNumber(stats.d30)} ${unitText(unit)}`} />
        <StatCard icon={Gauge} tone="emerald" label="Meter Now" value={stats.meterNow !== null ? `${formatNumber(stats.meterNow)} ${unitText(unit)}` : '-'} hint={stats.lastDate ? `Last entry ${formatDayKey(stats.lastDate)}` : 'No reading yet'} />
      </section>

      <section className="panel">
        <div className="panel-header flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">{machine.name}</h2>
            <p className="text-xs text-slate-500">
              {visible.length > 0 ? `${formatNumber(periodRun)} ${unitText(unit)} run in ${visible.length} ${visible.length === 1 ? 'entry' : 'entries'} · newest first` : 'Newest first'}
            </p>
          </div>
          <Segmented options={PERIODS} value={periodKey} onChange={setPeriodKey} />
        </div>

        {loading && readings.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="h-9 w-9 animate-spin rounded-full border-4 border-primary-600 border-r-transparent" />
            <p className="text-sm text-slate-400">Loading meter readings…</p>
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            title={machineRows.length === 0 ? `No readings for ${machine.name} yet` : 'No readings in this period'}
            hint={machineRows.length === 0 ? 'Use "Add Reading": the opening when it starts, the closing at day end.' : 'Pick a longer period.'}
          />
        ) : (
          <>
            <ul className="divide-y divide-slate-100 md:hidden">
              {visible.map((reading) => (
                <li key={reading._id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800">{formatDayKey(reading.dateKey)}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
                        <span>{formatNumber(reading.openingReading)} → {closeCell(reading)}</span>
                        {reading.run !== null && <span className="font-bold text-slate-900">{formatNumber(reading.run)} {unitText(reading.meterUnit)}</span>}
                        <GapBadge gap={reading.gap} unit={reading.meterUnit} />
                      </div>
                    </div>
                    {actions(reading)}
                  </div>
                  {reading.notes && <p className="mt-1 text-xs text-slate-500">{reading.notes}</p>}
                </li>
              ))}
            </ul>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[640px] text-left">
                <thead>
                  <tr>
                    <th className="tbl-head">Date</th>
                    <th className="tbl-head text-right">Opening</th>
                    <th className="tbl-head text-right">Closing</th>
                    <th className="tbl-head text-right">{runLabel(unit)}</th>
                    <th className="tbl-head">Notes</th>
                    <th className="tbl-head text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((reading) => (
                    <tr key={reading._id} className="tbl-row">
                      <td className="tbl-cell whitespace-nowrap">{formatDayKey(reading.dateKey)}</td>
                      <td className="tbl-cell whitespace-nowrap text-right">
                        {formatNumber(reading.openingReading)}
                        <GapBadge gap={reading.gap} unit={reading.meterUnit} />
                      </td>
                      <td className="tbl-cell whitespace-nowrap text-right">{closeCell(reading)}</td>
                      <td className="tbl-cell whitespace-nowrap text-right font-bold text-slate-900">
                        {reading.run !== null ? `${formatNumber(reading.run)} ${unitText(reading.meterUnit)}` : '-'}
                      </td>
                      <td className="tbl-cell text-slate-500"><div className="max-w-[16rem] truncate" title={reading.notes || undefined}>{reading.notes || '-'}</div></td>
                      <td className="tbl-cell">{actions(reading)}</td>
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
