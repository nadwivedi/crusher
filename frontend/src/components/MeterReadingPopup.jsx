import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Factory, Truck } from 'lucide-react';
import apiClient from '../utils/api';
import FormPopup from './FormPopup';
import { describeVehicle, meterUnitFor, sortVehiclesForFuel } from '../utils/diesel';
import { handlePopupFormKeyDown } from '../utils/popupFormKeyboard';
import {
  DG_KEY, byOldest, formatDayKey, formatNumber, hasValue, machineKeyOf, runLabel, toDateKey, unitText, withDateKeys
} from '../utils/meterReading';

const TOAST_OPTIONS = { position: 'top-right', autoClose: 2200 };

const MACHINE_OPTIONS = [
  { key: 'vehicle', label: 'Vehicle', icon: Truck },
  { key: 'dg', label: 'DG Set', icon: Factory }
];

// A new entry starts on the machine being viewed, otherwise on Vehicle (the DG set is one tap away)
const emptyForm = (machineKey) => ({
  machine: machineKey === DG_KEY ? 'dg' : 'vehicle',
  vehicle: machineKey && machineKey !== DG_KEY ? machineKey : '',
  readingDate: toDateKey(new Date()),
  openingReading: '',
  closingReading: '',
  notes: ''
});

/**
 * Add / edit one meter reading. The Meter Reading page passes its readings and vehicles;
 * opened from the dashboard without them, the popup loads them itself.
 */
export default function MeterReadingPopup({ readings: givenReadings, vehicles: givenVehicles, editing = null, presetMachine, onClose, onSaved }) {
  const standalone = !givenReadings || !givenVehicles;
  const [loaded, setLoaded] = useState({ readings: [], vehicles: [] });
  useEffect(() => {
    if (!standalone) return undefined;
    let live = true;
    Promise.all([apiClient.get('/meter-readings'), apiClient.get('/vehicles')])
      .then(([readingResponse, vehicleResponse]) => {
        if (!live) return;
        setLoaded({
          readings: withDateKeys(Array.isArray(readingResponse?.data) ? readingResponse.data : []),
          vehicles: sortVehiclesForFuel(Array.isArray(vehicleResponse) ? vehicleResponse : [])
        });
      })
      .catch((err) => toast.error(err.message || 'Could not load vehicles', TOAST_OPTIONS));
    return () => { live = false; };
  }, [standalone]);
  const readings = givenReadings || loaded.readings;
  const vehicles = givenVehicles || loaded.vehicles;

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

