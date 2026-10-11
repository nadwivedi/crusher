import { useState } from 'react';
import { toast } from 'react-toastify';
import apiClient from '../../utils/api';
import { handlePopupFormKeyDown } from '../../utils/popupFormKeyboard';
import FormPopup from '../../components/FormPopup';
import FormSection from '../../components/FormSection';
import { findVehicle, formatTon, toDateInput, useDumpBalance, useVehicles } from './dumpUtils';

/**
 * Dump Site → Hopper: boulder taken from the dump at site and fed to the hopper. It reduces dump stock.
 * Weight is typed in ton, or worked out from trips × average ton per trip.
 */
export default function DumpToHopper({ onModalFinish, editingEntry = null }) {
  const isEditing = Boolean(editingEntry?._id);
  const [form, setForm] = useState(() => ({
    movementDate: toDateInput(editingEntry?.movementDate || new Date()),
    trips: editingEntry?.trips ? String(editingEntry.trips) : '',
    averageWeightTon: '',
    weightTon: editingEntry ? String(Number(editingEntry.weight || 0) / 1000) : '',
    vehicleNo: editingEntry?.vehicleNo || '',
    notes: editingEntry?.notes || ''
  }));
  const [saving, setSaving] = useState(false);
  const vehicles = useVehicles();
  const balance = useDumpBalance();

  // Editing gives back what this entry already took out
  const available = balance === null ? null : balance + (isEditing ? Number(editingEntry.weight || 0) : 0);
  const weightKg = Number(form.weightTon || 0) * 1000;
  const afterSave = available === null ? null : available - weightKg;
  const overStock = afterSave !== null && afterSave < -0.5;

  const set = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  // Trips × average fills the total; the total can still be typed directly
  const setTripsOrAverage = (name, value) => {
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      const trips = Math.floor(Number(next.trips || 0));
      const average = Number(next.averageWeightTon || 0);
      if (trips > 0 && average > 0) next.weightTon = String(Math.round(trips * average * 1000) / 1000);
      return next;
    });
  };

  const close = () => onModalFinish?.();

  const takeAll = () => {
    if (available > 0) set('weightTon', String(Math.round(available) / 1000));
  };

  const handleSubmit = async () => {
    if (!(weightKg > 0)) {
      toast.error('Enter the weight fed to the hopper');
      return;
    }
    if (overStock) {
      toast.error(`Only ${formatTon(Math.max(0, available))} ton boulder is on the dump`);
      return;
    }

    setSaving(true);
    try {
      const vehicle = findVehicle(vehicles, form.vehicleNo);
      const payload = {
        type: 'to_hopper',
        movementDate: form.movementDate,
        weight: weightKg,
        trips: Math.floor(Number(form.trips || 0)),
        vehicleId: vehicle?._id || '',
        vehicleNo: form.vehicleNo,
        notes: form.notes
      };
      if (isEditing) await apiClient.put(`/dump-stock/${editingEntry._id}`, payload);
      else await apiClient.post('/dump-stock', payload);
      toast.success(isEditing ? 'Dump → Hopper updated' : 'Boulder fed from dump to hopper');
      close();
    } catch (error) {
      toast.error(error?.message || 'Error saving dump → hopper entry');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormPopup
      title={isEditing ? 'Edit Dump Site → Hopper' : 'Dump Site → Hopper'}
      subtitle="Boulder taken from the dump at site into the hopper"
      submitLabel={saving ? 'Saving...' : isEditing ? 'Update Entry' : 'Save Entry'}
      submitDisabled={saving || overStock}
      maxWidth="max-w-xl"
      onSubmit={handleSubmit}
      onClose={close}
      onKeyDown={(event) => handlePopupFormKeyDown(event, close)}
    >
      <div className="flex items-center justify-between rounded-xl border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-slate-700">Boulder on dump</p>
          {available > 0 && (
            <button type="button" onClick={takeAll} className="text-xs font-semibold text-primary-700 hover:underline">Feed all of it</button>
          )}
        </div>
        <span className="text-xl font-bold text-amber-700">{available === null ? '…' : `${formatTon(available)} T`}</span>
      </div>

      <FormSection number={1} title="Boulder Fed" tone="blue">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="dump-out-date">Date</label>
            <input id="dump-out-date" className="input" type="date" value={form.movementDate} onChange={(e) => set('movementDate', e.target.value)} autoFocus />
          </div>
          <div>
            <label className="label" htmlFor="dump-out-vehicle">Loader / Vehicle</label>
            <input
              id="dump-out-vehicle"
              className="input uppercase"
              list="dump-out-vehicle-list"
              value={form.vehicleNo}
              onChange={(e) => set('vehicleNo', e.target.value.toUpperCase())}
              placeholder="Optional"
              autoComplete="off"
            />
            <datalist id="dump-out-vehicle-list">
              {vehicles.map((vehicle) => <option key={vehicle._id} value={vehicle.vehicleNo} />)}
            </datalist>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="dump-out-trips">Trips / Buckets</label>
            <input id="dump-out-trips" className="input text-right" type="number" value={form.trips} onChange={(e) => setTripsOrAverage('trips', e.target.value)} placeholder="Optional" step="1" min="0" />
          </div>
          <div>
            <label className="label" htmlFor="dump-out-avg">Avg. ton / Trip</label>
            <input id="dump-out-avg" className="input text-right" type="number" value={form.averageWeightTon} onChange={(e) => setTripsOrAverage('averageWeightTon', e.target.value)} placeholder="Optional" step="0.01" min="0" />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="label" htmlFor="dump-out-weight">Total Weight (ton) <span className="text-rose-500">*</span></label>
            <input id="dump-out-weight" className={`input text-right font-semibold ${overStock ? 'border-rose-400 text-rose-600' : ''}`} type="number" value={form.weightTon} onChange={(e) => set('weightTon', e.target.value)} placeholder="0" step="0.001" min="0" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="dump-out-notes">Notes</label>
          <input id="dump-out-notes" className="input" value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Optional" />
        </div>
      </FormSection>

      {weightKg > 0 && afterSave !== null && (
        <p className={`text-right text-sm ${overStock ? 'font-semibold text-rose-600' : 'text-slate-600'}`}>
          {overStock ? `More than the ${formatTon(Math.max(0, available))} T on the dump` : <>Left on dump after this: <b className="text-slate-800">{formatTon(afterSave)} T</b></>}
        </p>
      )}
    </FormPopup>
  );
}
