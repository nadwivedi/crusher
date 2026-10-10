import { useState } from 'react';
import { toast } from 'react-toastify';
import apiClient from '../../../utils/api';
import FormPopup from '../../../components/FormPopup';
import { handlePopupFormKeyDown } from '../../../utils/popupFormKeyboard';
import { calcTransportAmount, getBasisUnit, getTripRate } from '../../../utils/transport';
import { formatRupees, toDayInput, todayInput } from '../../../utils/monthlyHire';

const BASIS_OPTIONS = [
  { value: 'per_trip', label: 'Per Trip', quantityLabel: 'Trips' },
  { value: 'per_ton', label: 'Per Ton', quantityLabel: 'Weight (ton)' },
  { value: 'per_km', label: 'Per KM', quantityLabel: 'Distance (km)' },
  { value: 'fixed', label: 'Fixed Amount', quantityLabel: '' }
];

// The vehicle's own rate for a basis, when it has one
const getVehicleRate = (vehicle, basis, location = '') => {
  if (basis === 'per_trip') return getTripRate(vehicle, location)?.rate ?? '';
  return vehicle?.hireBasis === basis && Number(vehicle?.hireRate || 0) > 0 ? vehicle.hireRate : '';
};

const buildForm = (vehicle, entry) => {
  if (entry) {
    return {
      entryDate: toDayInput(entry.entryDate) || todayInput(),
      basis: BASIS_OPTIONS.some((option) => option.value === entry.basis) ? entry.basis : 'fixed',
      location: entry.location || '',
      quantity: entry.quantity ? String(entry.quantity) : '',
      rate: entry.rate ? String(entry.rate) : '',
      notes: entry.notes || ''
    };
  }
  // A new entry starts on the vehicle's own terms; a monthly vehicle's extra charge starts as a fixed amount
  const basis = BASIS_OPTIONS.some((option) => option.value === vehicle?.hireBasis) ? vehicle.hireBasis : 'fixed';
  const onlyTrip = basis === 'per_trip' && vehicle?.tripRates?.length === 1 ? vehicle.tripRates[0] : null;
  return {
    entryDate: todayInput(),
    basis,
    location: onlyTrip?.location || '',
    quantity: basis === 'per_trip' ? '1' : '',
    rate: String(onlyTrip ? onlyTrip.rate : getVehicleRate(vehicle, basis)),
    notes: ''
  };
};

/**
 * An extra hire charge for one hired vehicle, owed to its owner: a trip that was not on a sale or boulder entry,
 * a waiting charge, a one-off amount. entry: an existing manual entry to edit.
 */
export default function HireEntryPopup({ vehicle, entry = null, onClose, onSaved }) {
  const [formData, setFormData] = useState(() => buildForm(vehicle, entry));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isEditing = Boolean(entry?._id);
  const isFixed = formData.basis === 'fixed';
  const isPerTrip = formData.basis === 'per_trip';
  const basisOption = BASIS_OPTIONS.find((option) => option.value === formData.basis);
  const unit = getBasisUnit(formData.basis);
  const tripLocations = vehicle?.tripRates || [];
  const amount = calcTransportAmount(formData.basis, isFixed ? 1 : formData.quantity, formData.rate);
  const ownerId = typeof vehicle?.partyId === 'object' ? vehicle.partyId?._id : vehicle?.partyId;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      // Picking a basis or a location brings the vehicle's rate for it
      if (name === 'basis') {
        next.location = '';
        next.rate = String(getVehicleRate(vehicle, value));
        if (value === 'per_trip' && !prev.quantity) next.quantity = '1';
      }
      if (name === 'location') {
        const tripRate = getTripRate(vehicle, value);
        if (tripRate) next.rate = String(tripRate.rate || '');
      }
      return next;
    });
    setError('');
  };

  const handleSubmit = async () => {
    if (saving) return;
    if (!ownerId) {
      setError('This vehicle has no owner set. Edit the vehicle first.');
      return;
    }
    if (!formData.entryDate) {
      setError('Date is required');
      return;
    }
    if (!isFixed && Number(formData.quantity || 0) <= 0) {
      setError(`${basisOption.quantityLabel} must be greater than 0`);
      return;
    }
    if (amount <= 0) {
      setError(isFixed ? 'Amount must be greater than 0' : 'Rate must be greater than 0');
      return;
    }

    const payload = {
      direction: 'payable',
      entryDate: formData.entryDate,
      partyId: ownerId,
      vehicleId: vehicle._id,
      vehicleNo: vehicle.vehicleNo,
      basis: formData.basis,
      location: isPerTrip ? formData.location.trim() : '',
      quantity: isFixed ? 1 : Number(formData.quantity),
      rate: Number(formData.rate),
      notes: formData.notes.trim()
    };

    try {
      setSaving(true);
      if (isEditing) {
        await apiClient.put(`/transport/${entry._id}`, payload);
      } else {
        await apiClient.post('/transport', payload);
      }
      toast.success(isEditing ? 'Entry updated' : 'Entry added');
      onSaved();
    } catch (submitError) {
      setError(submitError?.message || 'Error saving entry');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormPopup
      title={isEditing ? 'Edit Hire Entry' : 'Add Hire Entry'}
      subtitle={`${vehicle?.vehicleNo || ''} · owed to ${vehicle?.ownerName || 'the owner'}`}
      submitLabel={saving ? 'Saving...' : isEditing ? 'Update Entry' : 'Save Entry'}
      submitDisabled={saving}
      maxWidth="max-w-lg"
      onSubmit={handleSubmit}
      onClose={onClose}
      onKeyDown={(event) => handlePopupFormKeyDown(event, onClose)}
    >
      {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="hire-entry-date">Date *</label>
          <input id="hire-entry-date" className="input" type="date" name="entryDate" value={formData.entryDate} onChange={handleChange} autoFocus />
        </div>
        <div>
          <label className="label" htmlFor="hire-entry-basis">Charged *</label>
          <select id="hire-entry-basis" className="input" name="basis" value={formData.basis} onChange={handleChange}>
            {BASIS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
      </div>

      {isPerTrip && (
        <div>
          <label className="label" htmlFor="hire-entry-location">Location</label>
          {tripLocations.length > 0 ? (
            <select id="hire-entry-location" className="input" name="location" value={formData.location} onChange={handleChange}>
              <option value="">Select location</option>
              {formData.location && !tripLocations.some((row) => row.location === formData.location) && (
                <option value={formData.location}>{formData.location}</option>
              )}
              {tripLocations.map((row) => (
                <option key={row.location} value={row.location}>{row.location} · ₹{Number(row.rate || 0).toLocaleString('en-IN')}</option>
              ))}
            </select>
          ) : (
            <input id="hire-entry-location" className="input" type="text" name="location" value={formData.location} onChange={handleChange} placeholder="Where it went" autoComplete="off" />
          )}
        </div>
      )}

      <div className={`grid gap-3 ${isFixed ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {!isFixed && (
          <div>
            <label className="label" htmlFor="hire-entry-quantity">{basisOption.quantityLabel} *</label>
            <input id="hire-entry-quantity" className="input" type="number" name="quantity" value={formData.quantity} onChange={handleChange} min="0" step="0.001" placeholder="0" />
          </div>
        )}
        <div>
          <label className="label" htmlFor="hire-entry-rate">{isFixed ? 'Amount *' : `Rate / ${unit} *`}</label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-semibold text-slate-400">₹</span>
            <input id="hire-entry-rate" className="input pl-7" type="number" name="rate" value={formData.rate} onChange={handleChange} min="0" step="0.01" placeholder="0" />
          </div>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="hire-entry-notes">Notes</label>
        <input id="hire-entry-notes" className="input" type="text" name="notes" value={formData.notes} onChange={handleChange} placeholder="e.g. extra trip, waiting charge" />
      </div>

      <div className="flex items-center justify-between rounded-xl bg-rose-50 px-3 py-2 ring-1 ring-rose-200">
        <span className="text-xs font-semibold text-slate-600">You pay {vehicle?.ownerName || 'the owner'}</span>
        <span className="text-base font-bold text-rose-700">{formatRupees(amount)}</span>
      </div>
    </FormPopup>
  );
}
