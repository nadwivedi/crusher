import { useState } from 'react';
import { Scale } from 'lucide-react';
import { toast } from 'react-toastify';
import apiClient from '../../utils/api';
import { handlePopupFormKeyDown } from '../../utils/popupFormKeyboard';
import FormPopup from '../../components/FormPopup';
import FormSection from '../../components/FormSection';
import Segmented from '../../components/Segmented';
import { findVehicle, formatKg, formatTon, toDateInput, useDumpBalance, useVehicles } from './dumpUtils';

// An older entry saved with only a weight opens as a slip of that weight
const fromEntry = (entry) => {
  const bulk = entry?.entryMode === 'bulk';
  const hasSlip = Number(entry?.grossWeight || 0) > 0;
  return {
    entryMode: bulk ? 'bulk' : 'single',
    movementDate: toDateInput(entry?.movementDate || new Date()),
    vehicleNo: entry?.vehicleNo || '',
    grossWeight: !entry || bulk ? '' : String(hasSlip ? entry.grossWeight : entry.weight || ''),
    tareWeight: !entry || bulk ? '' : String(hasSlip ? entry.tareWeight ?? '' : 0),
    trips: bulk ? String(entry.trips || '') : '',
    averageWeightTon: bulk ? String(Number(entry.averageWeight || 0) / 1000) : '',
    notes: entry?.notes || ''
  };
};

/**
 * Dump Boulder to Hopper: boulder taken from the dump at site and fed to the hopper. It reduces dump stock.
 * Like the Dump Boulder Entry: one weighbridge slip (gross − tare), or bulk trips × average weight.
 */
export default function DumpToHopper({ onModalFinish, editingEntry = null }) {
  const isEditing = Boolean(editingEntry?._id);
  const [form, setForm] = useState(() => fromEntry(editingEntry));
  const [saving, setSaving] = useState(false);
  const vehicles = useVehicles();
  const balance = useDumpBalance();

  const isBulk = form.entryMode === 'bulk';
  const netWeight = isBulk
    ? Math.floor(Number(form.trips || 0)) * Number(form.averageWeightTon || 0) * 1000
    : Number(form.grossWeight || 0) - Number(form.tareWeight || 0);

  // Editing gives back what this entry already took out
  const available = balance === null ? null : balance + (isEditing ? Number(editingEntry.weight || 0) : 0);
  const afterSave = available === null ? null : available - Math.max(0, netWeight);
  const overStock = afterSave !== null && afterSave < -0.5;

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

  // Everything on the dump in one slip: gross = what is on the dump + tare
  const takeAll = () => {
    if (!(available > 0)) return;
    setForm((prev) => ({
      ...prev,
      entryMode: 'single',
      grossWeight: String(Math.round(available + Number(prev.tareWeight || 0))),
      tareWeight: prev.tareWeight || '0'
    }));
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
    if (overStock) {
      toast.error(`Only ${formatTon(Math.max(0, available))} ton boulder is on the dump`);
      return;
    }

    setSaving(true);
    try {
      const vehicle = findVehicle(vehicles, form.vehicleNo);
      const payload = {
        type: 'to_hopper',
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
      toast.success(isEditing ? 'Dump boulder to hopper updated' : 'Dump boulder to hopper saved');
      close();
    } catch (error) {
      toast.error(error?.message || 'Error saving dump boulder to hopper entry');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormPopup
      title={isEditing ? 'Edit Dump Boulder to Hopper' : 'Dump Boulder to Hopper'}
      subtitle="Boulder taken from the dump at site into the hopper"
      submitLabel={saving ? 'Saving...' : isEditing ? 'Update Entry' : 'Save Entry'}
      submitDisabled={saving || overStock}
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

      <FormSection number={1} title="Vehicle" tone="blue">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="dump-out-date">Date</label>
            <input id="dump-out-date" className="input" type="date" value={form.movementDate} onChange={(e) => set('movementDate', e.target.value)} autoFocus />
          </div>
          <div>
            <label className="label" htmlFor="dump-out-vehicle">Loader / Vehicle No</label>
            <input
              id="dump-out-vehicle"
              className="input uppercase"
              list="dump-out-vehicle-list"
              value={form.vehicleNo}
              onChange={(e) => handleVehicleChange(e.target.value)}
              placeholder="Loader or dumper that fed it"
              autoComplete="off"
            />
            <datalist id="dump-out-vehicle-list">
              {vehicles.map((vehicle) => <option key={vehicle._id} value={vehicle.vehicleNo} />)}
            </datalist>
          </div>
        </div>
      </FormSection>

      {isBulk ? (
        <FormSection number={2} title="Trips" tone="emerald">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="dump-out-avg">Avg. Weight / Trip (ton) <span className="text-rose-500">*</span></label>
              <input id="dump-out-avg" className="input text-right font-semibold" type="number" value={form.averageWeightTon} onChange={(e) => set('averageWeightTon', e.target.value)} placeholder="10" step="0.01" min="0" />
            </div>
            <div>
              <label className="label" htmlFor="dump-out-trips">No. of Trips <span className="text-rose-500">*</span></label>
              <input id="dump-out-trips" className="input text-right font-semibold" type="number" value={form.trips} onChange={(e) => set('trips', e.target.value)} placeholder="5" step="1" min="1" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <p className="label">Total Weight</p>
              <p className={`flex min-h-[2.5rem] items-center justify-end rounded-lg bg-white px-3 text-sm font-bold ring-1 ring-inset ${overStock ? 'text-rose-600 ring-rose-300' : 'text-emerald-700 ring-emerald-200'}`}>
                {netWeight > 0 ? `${formatTon(netWeight)} ton` : '-'}
              </p>
            </div>
          </div>
        </FormSection>
      ) : (
        <FormSection number={2} title="Weight" tone="emerald">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="dump-out-gross">Gross (kg) <span className="text-rose-500">*</span></label>
              <input id="dump-out-gross" className="input text-right font-semibold" type="number" value={form.grossWeight} onChange={(e) => set('grossWeight', e.target.value)} placeholder="0" step="0.01" />
            </div>
            <div>
              <label className="label" htmlFor="dump-out-tare">Tare (kg) <span className="text-rose-500">*</span></label>
              <input id="dump-out-tare" className="input text-right font-semibold" type="number" value={form.tareWeight} onChange={(e) => set('tareWeight', e.target.value)} placeholder="0" step="0.01" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <p className="label">Net Weight</p>
              <p className={`flex min-h-[2.5rem] items-center justify-between gap-2 rounded-lg bg-white px-3 text-sm ring-1 ring-inset ${overStock ? 'ring-rose-300' : 'ring-emerald-200'}`}>
                <Scale className="h-4 w-4 shrink-0 text-emerald-500" />
                {netWeight > 0 ? (
                  <span className="text-right">
                    <span className={`font-bold ${overStock ? 'text-rose-600' : 'text-emerald-700'}`}>{formatKg(netWeight)} kg</span>
                    <span className="ml-1.5 text-xs text-slate-500">{formatTon(netWeight)} ton</span>
                  </span>
                ) : <span className="text-slate-400">Gross − Tare</span>}
              </p>
            </div>
          </div>
        </FormSection>
      )}

      <div>
        <label className="label" htmlFor="dump-out-notes">Notes</label>
        <input id="dump-out-notes" className="input" value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Optional" />
      </div>

      <div className={`flex items-center justify-between rounded-xl border-2 px-4 py-2.5 text-sm ${overStock ? 'border-rose-200 bg-rose-50' : 'border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50'}`}>
        <span className="text-slate-600">
          On dump now <b className="text-slate-800">{available === null ? '…' : `${formatTon(available)} T`}</b>
          {available > 0 && (
            <button type="button" onClick={takeAll} className="ml-2 text-xs font-semibold text-primary-700 hover:underline">Feed all of it</button>
          )}
        </span>
        <span className="text-slate-600">
          {overStock
            ? <b className="text-rose-600">More than the {formatTon(Math.max(0, available))} T on the dump</b>
            : <>After this <b className="text-amber-700">{afterSave === null ? '…' : `${formatTon(afterSave)} T`}</b></>}
        </span>
      </div>
    </FormPopup>
  );
}
