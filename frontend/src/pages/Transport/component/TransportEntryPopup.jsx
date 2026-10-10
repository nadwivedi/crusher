import { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import apiClient from '../../../utils/api';
import FormPopup from '../../../components/FormPopup';
import { handlePopupFormKeyDown } from '../../../utils/popupFormKeyboard';
import { toLocalDateInput } from '../../../components/CustomRangePopup';
import { PERIOD_BASES, TRANSPORT_BASIS_OPTIONS, calcTransportAmount, getBasisUnit, getTripRate, getVehicleHireRates } from '../../../utils/transport';

// payable: a vehicle I hired, so I pay. receivable: my vehicle given to a party, so I receive.
const DIRECTIONS = [
  { key: 'payable', label: 'Hired Vehicle', hint: 'I pay the transporter', Icon: ArrowUpRight, activeClass: 'border-rose-600 bg-rose-600 text-white' },
  { key: 'receivable', label: 'My Vehicle Given', hint: 'The party pays me', Icon: ArrowDownLeft, activeClass: 'border-emerald-600 bg-emerald-600 text-white' }
];

const QUANTITY_LABELS = {
  per_km: 'Distance (km)',
  per_ton: 'Weight (ton)',
  per_trip: 'Trips',
  per_day: 'Days',
  per_week: 'Weeks',
  per_month: 'Months'
};

const toDateInput = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? toLocalDateInput(date) : '';
};

const normalizeVehicleNo = (value) => String(value || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();

const getVehiclePartyId = (vehicle) => (
  typeof vehicle?.partyId === 'object' ? vehicle?.partyId?._id || '' : vehicle?.partyId || ''
);

// Both days count: 1st to 30th is 30 days
const countDays = (from, to) => {
  if (!from || !to) return 0;
  const days = Math.round((new Date(to) - new Date(from)) / (24 * 60 * 60 * 1000)) + 1;
  return days > 0 ? days : 0;
};

const buildInitialForm = (entry) => ({
  direction: entry?.direction || 'payable',
  entryDate: toDateInput(entry?.entryDate) || toLocalDateInput(new Date()),
  partyId: entry?.partyId || '',
  vehicleNo: entry?.vehicleNo || '',
  basis: entry?.basis || 'per_month',
  location: entry?.location || '',
  quantity: entry?.quantity || '',
  rate: entry?.rate || '',
  fromDate: toDateInput(entry?.fromDate),
  toDate: toDateInput(entry?.toDate),
  notes: entry?.notes || ''
});

/** Add or edit a transport entry that is not part of a sale: rent paid for a hired vehicle, or my vehicle given to a party. */
export default function TransportEntryPopup({ entry = null, parties = [], vehicles = [], onClose, onSaved }) {
  const [formData, setFormData] = useState(() => buildInitialForm(entry));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isEditing = Boolean(entry?._id);
  const isPayable = formData.direction === 'payable';
  const isFixed = formData.basis === 'fixed';
  const isPeriod = PERIOD_BASES.includes(formData.basis);
  const isPerTrip = formData.basis === 'per_trip';
  const unit = getBasisUnit(formData.basis);
  const amount = calcTransportAmount(formData.basis, formData.quantity, formData.rate);

  // Hired vehicles when I pay, my own vehicles when I receive
  const vehicleOptions = useMemo(
    () => vehicles.filter((vehicle) => vehicle.ownership === (isPayable ? 'hired' : 'own')),
    [vehicles, isPayable]
  );

  const matchedVehicle = useMemo(() => {
    const typed = normalizeVehicleNo(formData.vehicleNo);
    return typed ? vehicles.find((vehicle) => normalizeVehicleNo(vehicle.vehicleNo) === typed) || null : null;
  }, [vehicles, formData.vehicleNo]);

  // A hired vehicle's rates come from its transporter
  const matchedHire = useMemo(() => getVehicleHireRates(matchedVehicle, parties), [matchedVehicle, parties]);
  const tripLocations = matchedVehicle ? matchedHire.tripRates : [];

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      // Picking a location fills in the vehicle's trip rate for it
      if (name === 'location') {
        const tripRate = getTripRate(matchedHire, value);
        if (tripRate) next.rate = String(tripRate.rate || '');
      }
      // A day-wise rent takes its days from the period
      if ((name === 'fromDate' || name === 'toDate' || name === 'basis') && next.basis === 'per_day') {
        const days = countDays(next.fromDate, next.toDate);
        if (days > 0) next.quantity = String(days);
      }
      return next;
    });
  };

  // Typing a hired vehicle's number brings its transporter and agreed rate with it
  const handleVehicleChange = (event) => {
    const vehicleNo = String(event.target.value || '').toUpperCase();
    const typed = normalizeVehicleNo(vehicleNo);
    const vehicle = typed ? vehicles.find((item) => normalizeVehicleNo(item.vehicleNo) === typed) : null;

    setFormData((prev) => {
      const next = { ...prev, vehicleNo };
      if (vehicle?.ownership === 'hired' && prev.direction === 'payable') {
        next.partyId = getVehiclePartyId(vehicle) || prev.partyId;
        const hire = getVehicleHireRates(vehicle, parties);
        next.basis = hire.hireBasis || prev.basis;
        if (hire.hireBasis === 'per_trip') {
          // A single location needs no picking
          const onlyTrip = hire.tripRates.length === 1 ? hire.tripRates[0] : null;
          next.location = onlyTrip?.location || '';
          next.rate = onlyTrip ? String(onlyTrip.rate || '') : '';
          if (!prev.quantity) next.quantity = '1';
        } else if (hire.hireRate > 0) {
          next.rate = String(hire.hireRate);
        }
      }
      return next;
    });
  };

  const selectDirection = (direction) => {
    if (direction === formData.direction) return;
    setFormData((prev) => ({ ...prev, direction }));
    setError('');
  };

  const handleSubmit = async () => {
    if (saving) return;

    if (!formData.partyId) {
      setError(isPayable ? 'Select the transporter you hired the vehicle from' : 'Select the party you gave the vehicle to');
      return;
    }
    if (!formData.entryDate) {
      setError('Valid date is required');
      return;
    }
    if (!isFixed && Number(formData.quantity || 0) <= 0) {
      setError(`${QUANTITY_LABELS[formData.basis]} must be greater than 0`);
      return;
    }
    if (amount <= 0) {
      setError(isFixed ? 'Amount must be greater than 0' : 'Rate must be greater than 0');
      return;
    }

    const payload = {
      direction: formData.direction,
      entryDate: formData.entryDate,
      partyId: formData.partyId,
      vehicleId: matchedVehicle?._id || undefined,
      vehicleNo: formData.vehicleNo.trim(),
      basis: formData.basis,
      location: isPerTrip ? formData.location.trim() : '',
      quantity: isFixed ? 1 : Number(formData.quantity),
      rate: Number(formData.rate),
      fromDate: isPeriod ? formData.fromDate || undefined : undefined,
      toDate: isPeriod ? formData.toDate || undefined : undefined,
      notes: formData.notes.trim()
    };

    try {
      setSaving(true);
      setError('');
      if (isEditing) {
        await apiClient.put(`/transport/${entry._id}`, payload);
      } else {
        await apiClient.post('/transport', payload);
      }
      toast.success(isEditing ? 'Transport entry updated' : 'Transport entry added');
      onSaved();
    } catch (submitError) {
      setError(submitError?.message || 'Error saving transport entry');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormPopup
      title={isEditing ? 'Edit Transport Entry' : 'Add Transport Entry'}
      subtitle="Vehicle rent or trips that are not part of a sale"
      submitLabel={saving ? 'Saving...' : isEditing ? 'Update Entry' : 'Save Entry'}
      maxWidth="max-w-lg"
      onSubmit={handleSubmit}
      onClose={onClose}
      onKeyDown={(event) => handlePopupFormKeyDown(event, onClose)}
    >
      {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}

      <div className="grid grid-cols-2 gap-2">
        {DIRECTIONS.map((direction) => (
          <button
            key={direction.key}
            type="button"
            onClick={() => selectDirection(direction.key)}
            aria-pressed={formData.direction === direction.key}
            className={`rounded-lg border px-3 py-2 text-left transition ${
              formData.direction === direction.key ? direction.activeClass : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            <span className="flex items-center gap-1.5 text-sm font-semibold">
              <direction.Icon size={16} />
              {direction.label}
            </span>
            <span className={`block text-[11px] ${formData.direction === direction.key ? 'text-white/80' : 'text-slate-400'}`}>{direction.hint}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Date *</label>
          <input className="input" type="date" name="entryDate" value={formData.entryDate} onChange={handleChange} autoFocus />
        </div>
        <div>
          <label className="label">Vehicle No</label>
          <input
            className="input uppercase"
            type="text"
            name="vehicleNo"
            list="transport-vehicle-options"
            value={formData.vehicleNo}
            onChange={handleVehicleChange}
            placeholder={isPayable ? 'Hired vehicle' : 'My vehicle'}
            autoComplete="off"
          />
          <datalist id="transport-vehicle-options">
            {vehicleOptions.map((vehicle) => <option key={vehicle._id} value={vehicle.vehicleNo} />)}
          </datalist>
        </div>
      </div>

      <div>
        <label className="label">{isPayable ? 'Transporter *' : 'Given To (Party) *'}</label>
        <select className="input" name="partyId" value={formData.partyId} onChange={handleChange}>
          <option value="">{isPayable ? 'Select transporter' : 'Select party'}</option>
          {parties.map((party) => (
            <option key={party._id} value={party._id}>{party.name}</option>
          ))}
        </select>
        {parties.length === 0 && <p className="mt-1 text-xs text-slate-500">Add the transporter under Masters → Party first.</p>}
      </div>

      <div className={`grid gap-3 ${isFixed ? 'grid-cols-2' : 'grid-cols-3'}`}>
        <div>
          <label className="label">Charged *</label>
          <select className="input" name="basis" value={formData.basis} onChange={handleChange}>
            {TRANSPORT_BASIS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        {!isFixed && (
          <div>
            <label className="label">{QUANTITY_LABELS[formData.basis]} *</label>
            <input className="input" type="number" name="quantity" value={formData.quantity} onChange={handleChange} min="0" step="0.001" placeholder="0" />
          </div>
        )}
        <div>
          <label className="label">{isFixed ? 'Amount (Rs) *' : `Rate / ${unit} *`}</label>
          <input className="input" type="number" name="rate" value={formData.rate} onChange={handleChange} min="0" step="0.01" placeholder="0.00" />
        </div>
      </div>

      {isPerTrip && (
        <div>
          <label className="label">Location</label>
          {tripLocations.length > 0 ? (
            <select className="input" name="location" value={formData.location} onChange={handleChange}>
              <option value="">Select location</option>
              {/* A location since removed from the vehicle stays pickable on an older entry */}
              {formData.location && !tripLocations.some((row) => row.location === formData.location) && (
                <option value={formData.location}>{formData.location}</option>
              )}
              {tripLocations.map((row) => (
                <option key={row.location} value={row.location}>{row.location} · ₹{Number(row.rate || 0).toLocaleString('en-IN')}</option>
              ))}
            </select>
          ) : (
            <input className="input" type="text" name="location" value={formData.location} onChange={handleChange} placeholder="Where it went" autoComplete="off" />
          )}
        </div>
      )}

      {isPeriod && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Period From</label>
            <input className="input" type="date" name="fromDate" value={formData.fromDate} onChange={handleChange} />
          </div>
          <div>
            <label className="label">Period To</label>
            <input className="input" type="date" name="toDate" value={formData.toDate} onChange={handleChange} />
          </div>
        </div>
      )}

      <div className={`flex items-center justify-between rounded-xl px-3 py-2 ring-1 ${isPayable ? 'bg-rose-50 ring-rose-200' : 'bg-emerald-50 ring-emerald-200'}`}>
        <span className="text-xs font-semibold text-slate-600">{isPayable ? 'You pay the transporter' : 'The party pays you'}</span>
        <span className={`text-base font-bold ${isPayable ? 'text-rose-700' : 'text-emerald-700'}`}>
          ₹{amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
        </span>
      </div>

      <div>
        <label className="label">Notes</label>
        <input className="input" type="text" name="notes" value={formData.notes} onChange={handleChange} placeholder="Optional" />
      </div>
    </FormPopup>
  );
}
