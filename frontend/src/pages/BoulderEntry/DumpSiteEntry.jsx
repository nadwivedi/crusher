import { useState } from 'react';
import { Scale } from 'lucide-react';
import { toast } from 'react-toastify';
import apiClient from '../../utils/api';
import { handlePopupFormKeyDown } from '../../utils/popupFormKeyboard';
import FormPopup from '../../components/FormPopup';
import FormSection from '../../components/FormSection';
import Segmented from '../../components/Segmented';
import { findVehicle, formatKg, formatTon, toDateInput, useDumpBalance, useVehicles } from './dumpUtils';

const fromEntry = (entry) => ({
  entryMode: entry?.entryMode === 'bulk' ? 'bulk' : 'single',
  movementDate: toDateInput(entry?.movementDate || new Date()),
  vehicleNo: entry?.vehicleNo || '',
  grossWeight: entry?.entryMode !== 'bulk' && entry?.grossWeight ? String(entry.grossWeight) : '',
  tareWeight: entry?.entryMode !== 'bulk' && entry ? String(entry.tareWeight ?? '') : '',
  trips: entry?.entryMode === 'bulk' ? String(entry.trips || '') : '',
  averageWeightTon: entry?.entryMode === 'bulk' ? String(Number(entry.averageWeight || 0) / 1000) : '',
  notes: entry?.notes || ''
});

/**
 * Boulder → Dump Site: boulder unloaded on the dump at site instead of the hopper (e.g. hopper down).
 * It adds to dump stock; a Dump → Hopper entry takes it out when it is fed. No party bill: that is the Boulder Entry.
 */
export default function DumpSiteEntry({ onModalFinish, editingEntry = null }) {
  const isEditing = Boolean(editingEntry?._id);
  const [form, setForm] = useState(() => fromEntry(editingEntry));
  const [saving, setSaving] = useState(false);
  const vehicles = useVehicles();
  const balance = useDumpBalance();

  const isBulk = form.entryMode === 'bulk';
  const netWeight = isBulk
    ? Math.floor(Number(form.trips || 0)) * Number(form.averageWeightTon || 0) * 1000
    : Number(form.grossWeight || 0) - Number(form.tareWeight || 0);
  const ownWeight = isEditing ? Number(editingEntry.weight || 0) : 0;
  const afterSave = balance === null ? null : balance - ownWeight + Math.max(0, netWeight);

  const set = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  // A saved vehicle fills its tare weight, unless one is already typed
  const handleVehicleChange = (value) => {
    setForm((prev) => {
      const vehicle = findVehicle(vehicles, value);
      const next = { ...prev, vehicleNo: value.toUpperCase() };
      if (vehicle && !prev.tareWeight && Number(vehicle.unladenWeight || 0) > 0) next.tareWeight = String(vehicle.unladenWeight);
      return next;
    });
  };

  const close = () => onModalFinish?.();

  const handleSubmit = async () => {
    if (isBulk && (!(Math.floor(Number(form.trips)) >= 1) || !(Number(form.averageWeightTon) > 0))) {
      toast.error('Fill average weight and no. of trips');
      return;
    }
    if (!isBulk && !(netWeight > 0)) {
      toast.error('Gross weight must be more than tare weight');
      return;
    }

    setSaving(true);
    try {
      const vehicle = findVehicle(vehicles, form.vehicleNo);
      const payload = {
        type: 'to_dump',
        entryMode: form.entryMode,
        movementDate: form.movementDate,
        vehicleId: vehicle?._id || '',
        vehicleNo: form.vehicleNo,
        notes: form.notes,
        ...(isBulk
          ? { trips: Math.floor(Number(form.trips)), averageWeight: Number(form.averageWeightTon) * 1000 }
          : { grossWeight: Number(form.grossWeight), tareWeight: Number(form.tareWeight || 0) })
      };
      if (isEditing) await apiClient.put(`/dump-stock/${editingEntry._id}`, payload);
      else await apiClient.post('/dump-stock', payload);
      toast.success(isEditing ? 'Dump site entry updated' : 'Boulder added to dump site');
      close();
    } catch (error) {
      toast.error(error?.message || 'Error saving dump site entry');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormPopup
      title={isEditing ? 'Edit Boulder → Dump Site' : 'Boulder → Dump Site'}
      subtitle="Boulder unloaded on the dump at site instead of the hopper"
      submitLabel={saving ? 'Saving...' : isEditing ? 'Update Entry' : 'Save Entry'}
      submitDisabled={saving}
      maxWidth="max-w-2xl"
      onSubmit={handleSubmit}
      onClose={close}
      onKeyDown={(event) => handlePopupFormKeyDown(event, close)}
    >
      <Segmented
        className="w-full [&>button]:flex-1 [&>button]:justify-center"
        options={[
          { key: 'single', label: 'Single Slip', shortLabel: 'Single' },
          { key: 'bulk', label: 'Bulk Trips', shortLabel: 'Bulk' }
        ]}
        value={form.entryMode}
        onChange={(mode) => set('entryMode', mode)}
      />

      <FormSection number={1} title="Vehicle" tone="amber">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="dump-in-date">Date</label>
            <input id="dump-in-date" className="input" type="date" value={form.movementDate} onChange={(e) => set('movementDate', e.target.value)} autoFocus />
          </div>
          <div>
            <label className="label" htmlFor="dump-in-vehicle">Vehicle No</label>
            <input
              id="dump-in-vehicle"
              className="input uppercase"
              list="dump-in-vehicle-list"
              value={form.vehicleNo}
              onChange={(e) => handleVehicleChange(e.target.value)}
              placeholder="Truck that brought it"
              autoComplete="off"
            />
            <datalist id="dump-in-vehicle-list">
              {vehicles.map((vehicle) => <option key={vehicle._id} value={vehicle.vehicleNo} />)}
            </datalist>
          </div>
        </div>
      </FormSection>

      {isBulk ? (
        <FormSection number={2} title="Trips" tone="emerald">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="dump-in-avg">Avg. Weight / Trip (ton) <span className="text-rose-500">*</span></label>
              <input id="dump-in-avg" className="input text-right font-semibold" type="number" value={form.averageWeightTon} onChange={(e) => set('averageWeightTon', e.target.value)} placeholder="10" step="0.01" min="0" />
            </div>
            <div>
              <label className="label" htmlFor="dump-in-trips">No. of Trips <span className="text-rose-500">*</span></label>
              <input id="dump-in-trips" className="input text-right font-semibold" type="number" value={form.trips} onChange={(e) => set('trips', e.target.value)} placeholder="5" step="1" min="1" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <p className="label">Total Weight</p>
              <p className="flex min-h-[2.5rem] items-center justify-end rounded-lg bg-white px-3 text-sm font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                {netWeight > 0 ? `${formatTon(netWeight)} ton` : '-'}
              </p>
            </div>
          </div>
        </FormSection>
      ) : (
        <FormSection number={2} title="Weight" tone="emerald">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="dump-in-gross">Gross (kg) <span className="text-rose-500">*</span></label>
              <input id="dump-in-gross" className="input text-right font-semibold" type="number" value={form.grossWeight} onChange={(e) => set('grossWeight', e.target.value)} placeholder="0" step="0.01" />
            </div>
            <div>
              <label className="label" htmlFor="dump-in-tare">Tare (kg) <span className="text-rose-500">*</span></label>
              <input id="dump-in-tare" className="input text-right font-semibold" type="number" value={form.tareWeight} onChange={(e) => set('tareWeight', e.target.value)} placeholder="0" step="0.01" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <p className="label">Net Weight</p>
              <p className="flex min-h-[2.5rem] items-center justify-between gap-2 rounded-lg bg-white px-3 text-sm ring-1 ring-inset ring-emerald-200">
                <Scale className="h-4 w-4 shrink-0 text-emerald-500" />
                {netWeight > 0 ? (
                  <span className="text-right">
                    <span className="font-bold text-emerald-700">{formatKg(netWeight)} kg</span>
                    <span className="ml-1.5 text-xs text-slate-500">{formatTon(netWeight)} ton</span>
                  </span>
                ) : <span className="text-slate-400">Gross − Tare</span>}
              </p>
            </div>
          </div>
        </FormSection>
      )}

      <div>
        <label className="label" htmlFor="dump-in-notes">Notes</label>
        <input id="dump-in-notes" className="input" value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Optional, e.g. hopper breakdown" />
      </div>

      <div className="flex items-center justify-between rounded-xl border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-2.5 text-sm">
        <span className="text-slate-600">On dump now <b className="text-slate-800">{balance === null ? '…' : `${formatTon(balance)} T`}</b></span>
        <span className="text-slate-600">After this <b className="text-amber-700">{afterSave === null ? '…' : `${formatTon(afterSave)} T`}</b></span>
      </div>
    </FormPopup>
  );
}
