import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import apiClient from '../../../utils/api';
import FormPopup from '../../../components/FormPopup';
import { handlePopupFormKeyDown } from '../../../utils/popupFormKeyboard';
import { isTransportProvider } from '../../../utils/transport';
import { toDayInput, todayInput } from '../../../utils/monthlyHire';

// payable: a vehicle I hired, so I pay. receivable: my vehicle given to a party, so I receive.
const DIRECTIONS = [
  { key: 'payable', label: 'Hired Vehicle', hint: 'I pay the party every month', Icon: ArrowUpRight, activeClass: 'border-rose-600 bg-rose-600 text-white' },
  { key: 'receivable', label: 'My Vehicle Given', hint: 'The party pays me every month', Icon: ArrowDownLeft, activeClass: 'border-emerald-600 bg-emerald-600 text-white' }
];

const normalizeVehicleNo = (value) => String(value || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();

const getVehiclePartyId = (vehicle) => (
  typeof vehicle?.partyId === 'object' ? vehicle?.partyId?._id || '' : vehicle?.partyId || ''
);

// A transport provider's agreed monthly rate, when it has one
const getPartyMonthlyRate = (party) => (
  party?.hireBasis === 'per_month' && Number(party?.hireRate || 0) > 0 ? String(party.hireRate) : ''
);

const buildForm = (hire, defaultPartyId, preset) => ({
  direction: hire?.direction || preset?.direction || 'payable',
  partyId: hire?.partyId || preset?.partyId || defaultPartyId || '',
  vehicleNo: hire?.vehicleNo || preset?.vehicleNo || '',
  monthlyRate: hire?.monthlyRate ? String(hire.monthlyRate) : preset?.monthlyRate ? String(preset.monthlyRate) : '',
  startDate: toDayInput(hire?.startDate) || todayInput(),
  endDate: toDayInput(hire?.endDate),
  notes: hire?.notes || ''
});

/**
 * Start or change a monthly hire: who, which vehicle, how much a month, and from when to when.
 * preset: party, vehicle and amount already picked elsewhere (the transport entry form).
 */
export default function MonthlyHireForm({ hire = null, defaultPartyId = '', preset = null, onClose, onSaved }) {
  const [formData, setFormData] = useState(() => buildForm(hire, defaultPartyId, preset));
  const [parties, setParties] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isEditing = Boolean(hire?._id);
  const isPayable = formData.direction === 'payable';

  useEffect(() => {
    Promise.all([apiClient.get('/parties'), apiClient.get('/vehicles')])
      .then(([partyResponse, vehicleResponse]) => {
        setParties(Array.isArray(partyResponse) ? partyResponse : []);
        setVehicles(Array.isArray(vehicleResponse) ? vehicleResponse : []);
      })
      .catch((loadError) => setError(loadError?.message || 'Error loading parties'));
  }, []);

  // Transport providers first when I hire; anyone but the cash party can take my vehicle
  const partyOptions = useMemo(() => parties
    .filter((party) => party.type !== 'cash-in-hand')
    .sort((a, b) => (
      (isPayable ? Number(isTransportProvider(b)) - Number(isTransportProvider(a)) : 0)
      || String(a.name || '').localeCompare(String(b.name || ''))
    )), [parties, isPayable]);

  // Hired vehicles when I pay, my own vehicles when I receive
  const vehicleOptions = useMemo(
    () => vehicles.filter((vehicle) => vehicle.ownership === (isPayable ? 'hired' : 'own')),
    [vehicles, isPayable]
  );

  const matchedVehicle = useMemo(() => {
    const typed = normalizeVehicleNo(formData.vehicleNo);
    return typed ? vehicles.find((vehicle) => normalizeVehicleNo(vehicle.vehicleNo) === typed) || null : null;
  }, [vehicles, formData.vehicleNo]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      // A transport provider's monthly rate comes with it
      if (name === 'partyId' && !prev.monthlyRate) {
        next.monthlyRate = getPartyMonthlyRate(parties.find((party) => party._id === value));
      }
      return next;
    });
    setError('');
  };

  // Typing a hired vehicle's number brings its transporter and monthly rate
  const handleVehicleChange = (event) => {
    const vehicleNo = String(event.target.value || '').toUpperCase();
    const typed = normalizeVehicleNo(vehicleNo);
    const vehicle = typed ? vehicles.find((item) => normalizeVehicleNo(item.vehicleNo) === typed) : null;

    setFormData((prev) => {
      const next = { ...prev, vehicleNo };
      if (vehicle?.ownership === 'hired' && prev.direction === 'payable') {
        const partyId = getVehiclePartyId(vehicle);
        if (partyId) {
          next.partyId = partyId;
          if (!prev.monthlyRate) next.monthlyRate = getPartyMonthlyRate(parties.find((party) => party._id === partyId));
        }
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (saving) return;
    if (!formData.partyId) {
      setError(isPayable ? 'Select the party you hired the vehicle from' : 'Select the party you gave the vehicle to');
      return;
    }
    if (Number(formData.monthlyRate || 0) <= 0) {
      setError('Monthly amount must be greater than 0');
      return;
    }
    if (!formData.startDate) {
      setError('From date is required');
      return;
    }
    if (formData.endDate && formData.endDate < formData.startDate) {
      setError('To date cannot be before the from date');
      return;
    }

    const payload = {
      direction: formData.direction,
      partyId: formData.partyId,
      vehicleId: matchedVehicle?._id || undefined,
      vehicleNo: formData.vehicleNo.trim(),
      monthlyRate: Number(formData.monthlyRate),
      startDate: formData.startDate,
      endDate: formData.endDate || null,
      notes: formData.notes.trim()
    };

    try {
      setSaving(true);
      setError('');
      const saved = isEditing
        ? await apiClient.put(`/monthly-hires/${hire._id}`, payload)
        : await apiClient.post('/monthly-hires', payload);
      toast.success(isEditing ? 'Monthly hire updated' : 'Monthly hire started');
      onSaved(saved);
    } catch (submitError) {
      setError(submitError?.message || 'Error saving monthly hire');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormPopup
      title={isEditing ? 'Edit Monthly Hire' : 'Start Monthly Hire'}
      subtitle="Each month is added to the party's ledger when it ends"
      submitLabel={saving ? 'Saving...' : isEditing ? 'Update Hire' : 'Start Hire'}
      submitDisabled={saving}
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
            onClick={() => setFormData((prev) => ({ ...prev, direction: direction.key }))}
            aria-pressed={formData.direction === direction.key}
            className={`rounded-lg border px-3 py-2 text-left transition ${formData.direction === direction.key ? direction.activeClass : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'}`}
          >
            <span className="flex items-center gap-1.5 text-sm font-semibold">
              <direction.Icon size={16} />
              {direction.label}
            </span>
            <span className={`block text-[11px] ${formData.direction === direction.key ? 'text-white/80' : 'text-slate-400'}`}>{direction.hint}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="hire-party">{isPayable ? 'Hired From *' : 'Given To *'}</label>
          <select id="hire-party" className="input" name="partyId" value={formData.partyId} onChange={handleChange}>
            <option value="">Select party</option>
            {partyOptions.map((party) => (
              <option key={party._id} value={party._id}>{party.name}{isPayable && isTransportProvider(party) ? ' · transport' : ''}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="hire-vehicle">Vehicle No</label>
          <input
            id="hire-vehicle"
            className="input uppercase"
            type="text"
            name="vehicleNo"
            list="hire-vehicle-options"
            value={formData.vehicleNo}
            onChange={handleVehicleChange}
            placeholder={isPayable ? 'Hired vehicle' : 'My vehicle'}
            autoComplete="off"
          />
          <datalist id="hire-vehicle-options">
            {vehicleOptions.map((vehicle) => <option key={vehicle._id} value={vehicle.vehicleNo} />)}
          </datalist>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="hire-rate">Monthly Amount *</label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-semibold text-slate-400">₹</span>
            <input id="hire-rate" className="input pl-7" type="number" name="monthlyRate" value={formData.monthlyRate} onChange={handleChange} min="0" step="0.01" placeholder="0" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="hire-start">From Date *</label>
          <input id="hire-start" className="input" type="date" name="startDate" value={formData.startDate} onChange={handleChange} />
        </div>
        <div>
          <label className="label" htmlFor="hire-end">To Date</label>
          <input id="hire-end" className="input" type="date" name="endDate" value={formData.endDate} min={formData.startDate || undefined} onChange={handleChange} />
        </div>
      </div>
      <p className="-mt-1 text-xs text-slate-500">
        Leave To Date blank to keep it running until you cancel it. A month is counted from the From Date (1 Jul to 31 Jul, then 1 Aug to 31 Aug).
        {isEditing && ' Changing the amount or dates re-works every month already in the ledger.'}
      </p>

      <div>
        <label className="label" htmlFor="hire-notes">Notes</label>
        <input id="hire-notes" className="input" type="text" name="notes" value={formData.notes} onChange={handleChange} placeholder="Optional, shown on each month in the ledger" />
      </div>
    </FormPopup>
  );
}
