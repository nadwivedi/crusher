import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { CalendarDays, Factory, Gauge, Inbox, Pencil, Plus, RefreshCw, Trash2, Truck } from 'lucide-react';
import apiClient from '../utils/api';
import FormPopup from '../components/FormPopup';
import StatCard from '../components/StatCard';
import Segmented from '../components/Segmented';
import { describeVehicle, meterUnitFor, sortVehiclesForFuel } from '../utils/diesel';
import { getVehicleCategoryLabel } from '../utils/transport';
import { handlePopupFormKeyDown } from '../utils/popupFormKeyboard';

const TOAST_OPTIONS = { position: 'top-right', autoClose: 2200 };

const formatNumber = (value) => Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

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

const formatDayKey = (key) => {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const PERIODS = [
  { key: 'today', label: 'Today' },
  { key: 'last7', label: 'Last 7 Days', shortLabel: '7 Days' },
  { key: 'last30', label: 'Last 30 Days', shortLabel: '30 Days' },
  { key: 'all', label: 'Lifetime' }
];

const PERIOD_FROM = { today: 0, last7: 6, last30: 29 };

const MACHINE_OPTIONS = [
  { key: 'dg', label: 'DG Set', icon: Factory },
  { key: 'vehicle', label: 'Vehicle', icon: Truck }
];

const DG_KEY = 'dg';
const machineKeyOf = (reading) => (reading.machine === 'dg' ? DG_KEY : String(reading.vehicle || reading.vehicleNo));

const hasValue = (value) => value !== null && value !== undefined && value !== '';
const runOf = (reading) => (hasValue(reading.closingReading) ? Number(reading.closingReading) - Number(reading.openingReading) : null);

// Oldest first; same-day entries in the order they were made
const byOldest = (a, b) => a.dateKey.localeCompare(b.dateKey) || new Date(a.createdAt) - new Date(b.createdAt);

const unitText = (unit) => (unit === 'hr' ? 'hr' : 'km');
const runLabel = (unit) => (unit === 'hr' ? 'Hours Run' : 'KM Run');

// A new entry starts on the machine being viewed
const emptyForm = (machineKey) => ({
  machine: !machineKey || machineKey === DG_KEY ? 'dg' : 'vehicle',
  vehicle: machineKey && machineKey !== DG_KEY ? machineKey : '',
  readingDate: toDateKey(new Date()),
  openingReading: '',
  closingReading: '',
  notes: ''
});

function MeterReadingPopup({ readings, vehicles, editing, presetMachine, onClose, onSaved }) {
  const [form, setForm] = useState(() => (editing
    ? {
        machine: editing.machine,
        vehicle: editing.machine === 'vehicle' ? String(editing.vehicle || '') : '',
        readingDate: editing.dateKey,
        openingReading: String(editing.openingReading ?? ''),
        closingReading: hasValue(editing.closingReading) ? String(editing.closingReading) : '',
        notes: editing.notes || ''
      }
    : emptyForm(presetMachine)));
  // Opening is filled from the last closing until the user types their own
  const [openingTouched, setOpeningTouched] = useState(Boolean(editing));
  const [saving, setSaving] = useState(false);

  const selectedVehicle = vehicles.find((vehicle) => String(vehicle._id) === form.vehicle);
  const unit = meterUnitFor(form.machine, selectedVehicle?.category);
  const machineKey = form.machine === 'dg' ? DG_KEY : form.vehicle;

  // The last entry of this machine on or before the chosen date (this entry itself left out)
  const previous = useMemo(() => {
    if (!machineKey) return null;
    return readings
      .filter((reading) => reading._id !== editing?._id && machineKeyOf(reading) === machineKey && reading.dateKey <= form.readingDate)
      .sort(byOldest)
      .at(-1) || null;
  }, [readings, editing, machineKey, form.readingDate]);

  const suggestedOpening = previous && hasValue(previous.closingReading) ? String(previous.closingReading) : '';
  const opening = openingTouched ? form.openingReading : suggestedOpening;

  const openingNum = opening === '' ? null : Number(opening);
  const closingNum = form.closingReading === '' ? null : Number(form.closingReading);
  const run = openingNum !== null && closingNum !== null ? closingNum - openingNum : null;
  const gap = previous && hasValue(previous.closingReading) && openingNum !== null ? openingNum - Number(previous.closingReading) : 0;

  const set = (field) => (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const changeMachine = (machine) => {
    setForm((prev) => ({ ...prev, machine, vehicle: machine === 'dg' ? '' : prev.vehicle }));
    if (!editing) setOpeningTouched(false);
  };

  const changeVehicle = (event) => {
    setForm((prev) => ({ ...prev, vehicle: event.target.value }));
    if (!editing) setOpeningTouched(false);
  };

  const handleSubmit = async () => {
    if (form.machine === 'vehicle' && !form.vehicle) return toast.error('Select the vehicle', TOAST_OPTIONS);
    if (!form.readingDate) return toast.error('Enter the date', TOAST_OPTIONS);
    if (openingNum === null || !(openingNum >= 0)) return toast.error('Enter the opening reading', TOAST_OPTIONS);
    if (closingNum !== null && closingNum < openingNum) return toast.error('Closing cannot be less than opening', TOAST_OPTIONS);

    const payload = {
      machine: form.machine,
      vehicle: form.machine === 'vehicle' ? form.vehicle : null,
      readingDate: form.readingDate,
      openingReading: openingNum,
      closingReading: closingNum,
      notes: form.notes
    };

    try {
      setSaving(true);
      if (editing) await apiClient.put(`/meter-readings/${editing._id}`, payload);
      else await apiClient.post('/meter-readings', payload);
      toast.success(editing ? 'Reading updated' : 'Reading saved', TOAST_OPTIONS);
      onSaved();
    } catch (err) {
      toast.error(err.message || 'Could not save the reading', TOAST_OPTIONS);
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormPopup
      title={editing ? 'Edit Meter Reading' : 'Add Meter Reading'}
      subtitle="Opening and closing of the KM / hour meter"
      submitLabel={saving ? 'Saving...' : editing ? 'Update' : 'Save'}
      submitDisabled={saving}
      onSubmit={handleSubmit}
      onClose={onClose}
      onKeyDown={(event) => handlePopupFormKeyDown(event, onClose)}
    >
      <div>
        <label className="label">Machine</label>
        <div className="grid grid-cols-2 gap-2">
          {MACHINE_OPTIONS.map((option) => {
            const { key, label } = option;
            const MachineIcon = option.icon;
            return (
            <button
              key={key}
              type="button"
              onClick={() => changeMachine(key)}
              aria-pressed={form.machine === key}
              className={`flex items-center justify-center gap-2 rounded-lg border px-2 py-2 text-sm font-semibold transition ${
                form.machine === key
                  ? 'border-primary-600 bg-primary-50 text-primary-700 ring-1 ring-primary-600'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <MachineIcon size={16} /> {label}
            </button>
            );
          })}
        </div>
      </div>

      {form.machine === 'vehicle' && (
        <div>
          <label className="label">Vehicle *</label>
          <select className="input" value={form.vehicle} onChange={changeVehicle} autoFocus={!editing}>
            <option value="">Select vehicle</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle._id} value={vehicle._id}>
                {vehicle.vehicleNo}{describeVehicle(vehicle) ? ` · ${describeVehicle(vehicle)}` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="label">Date *</label>
        <input type="date" className="input" value={form.readingDate} onChange={set('readingDate')} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Opening *</label>
          <div className="relative">
            <input
              type="number"
              min="0"
              step="any"
              className="input pr-10"
              placeholder="Meter at start"
              value={opening}
              onChange={(event) => {
                setOpeningTouched(true);
                setForm((prev) => ({ ...prev, openingReading: event.target.value }));
              }}
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-slate-400">{unitText(unit)}</span>
          </div>
        </div>
        <div>
          <label className="label">Closing</label>
          <div className="relative">
            <input
              type="number"
              min="0"
              step="any"
              className="input pr-10"
              placeholder="At day end"
              value={form.closingReading}
              onChange={set('closingReading')}
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-slate-400">{unitText(unit)}</span>
          </div>
        </div>
      </div>

      <div className="space-y-1 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 ring-1 ring-slate-200">
        {previous ? (
          <p>
            Last entry {formatDayKey(previous.dateKey)}:{' '}
            {hasValue(previous.closingReading)
              ? <>closed at <span className="font-semibold text-slate-800">{formatNumber(previous.closingReading)} {unitText(unit)}</span></>
              : <span className="font-semibold text-amber-700">no closing entered yet</span>}
          </p>
        ) : machineKey ? (
          <p>First reading for this machine.</p>
        ) : (
          <p>Pick the vehicle to see its last closing.</p>
        )}
        {gap !== 0 && (
          <p className={`font-medium ${gap > 0 ? 'text-amber-700' : 'text-rose-700'}`}>
            {gap > 0
              ? `Opening is ${formatNumber(gap)} ${unitText(unit)} more than the last closing`
              : `Opening is ${formatNumber(-gap)} ${unitText(unit)} less than the last closing`}
          </p>
        )}
        <p>
          {runLabel(unit)}:{' '}
          <span className={`font-bold ${run !== null && run < 0 ? 'text-rose-700' : 'text-slate-900'}`}>
            {run === null ? 'after closing is entered' : `${formatNumber(run)} ${unitText(unit)}`}
          </span>
        </p>
      </div>

      <div>
        <label className="label">Notes</label>
        <input className="input" placeholder="Optional" value={form.notes} onChange={set('notes')} />
      </div>
    </FormPopup>
  );
}

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
  const navigate = useNavigate();
  const [readings, setReadings] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [periodKey, setPeriodKey] = useState('last30');
  const [machineKey, setMachineKey] = useState(DG_KEY);
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
    const withKeys = readings.map((reading) => ({ ...reading, dateKey: toDateKey(reading.readingDate), run: runOf(reading) }));
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

  const machine = machines.find((item) => item.key === machineKey) || machines[0];
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
      <button type="button" className="icon-btn" title="Edit" aria-label="Edit" onClick={() => setPopup({ editing: reading })}>
        <Pencil size={15} />
      </button>
      <button type="button" className="icon-btn text-rose-600" title="Delete" aria-label="Delete" onClick={() => handleDelete(reading)}>
        <Trash2 size={15} />
      </button>
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
