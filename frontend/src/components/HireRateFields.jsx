import { Plus, Trash2 } from 'lucide-react';
import { getBasisUnit } from '../utils/transport';

// A hired vehicle is paid a fixed rate (per trip, per ton or per km) or a monthly rent
const HIRE_BASES = ['per_trip', 'per_ton', 'per_km', 'per_month'];

const BASIS_LABELS = {
  per_trip: 'Per Trip',
  per_ton: 'Per Ton',
  per_km: 'Per KM',
  per_month: 'Monthly Rent'
};

const EMPTY_TRIP_RATE = { location: '', rate: '' };

const toTitleCase = (value) => String(value || '')
  .toLowerCase()
  .replace(/\b[a-z]/g, (char) => char.toUpperCase());

/**
 * How a hired vehicle is paid: the basis, then one rate, a rate per location for per-trip hire, or the monthly amount.
 * onChange gets the changed fields: { hireBasis }, { hireRate } or { tripRates }.
 */
export default function HireRateFields({ idPrefix, label = 'Pay Transporter', hireBasis, hireRate, tripRates, onChange }) {
  // Nothing picked means the vehicle has no rate set
  const basis = HIRE_BASES.includes(hireBasis) ? hireBasis : '';
  const isPerTrip = basis === 'per_trip';
  const unit = getBasisUnit(basis);
  const rows = tripRates?.length ? tripRates : [EMPTY_TRIP_RATE];
  const isMonthly = basis === 'per_month';
  const basisOptions = HIRE_BASES.map((value) => ({ value, label: BASIS_LABELS[value] }));

  const updateRow = (index, field, value) => {
    onChange({ tripRates: rows.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row)) });
  };

  const addRow = () => {
    onChange({ tripRates: [...rows, EMPTY_TRIP_RATE] });
    // Focus the new row's location once it has rendered
    requestAnimationFrame(() => document.getElementById(`${idPrefix}-trip-location-${rows.length}`)?.focus());
  };

  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor={`${idPrefix}-hire-basis-input`}>{label}</label>
          <select id={`${idPrefix}-hire-basis-input`} className="input" value={basis} onChange={(event) => onChange({ hireBasis: event.target.value })}>
            <option value="">No rate set</option>
            {basisOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        {basis && !isPerTrip && (
          <div>
            <label className="label" htmlFor={`${idPrefix}-hire-rate-input`}>{isMonthly ? 'Monthly Amount' : 'Rate'}</label>
            <div className="relative">
              <input
                id={`${idPrefix}-hire-rate-input`}
                className="input pr-16"
                type="number"
                value={hireRate || ''}
                onChange={(event) => onChange({ hireRate: event.target.value })}
                min="0"
                step="0.01"
                placeholder="0"
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-slate-400">₹/{unit}</span>
            </div>
          </div>
        )}
      </div>

      {isPerTrip && (
        <div className="mt-3">
          <div className="mb-1 grid grid-cols-[1fr_8rem_2rem] gap-2">
            <span className="label mb-0">Location</span>
            <span className="label mb-0">Rate / Trip</span>
          </div>
          <div className="space-y-2">
            {rows.map((row, index) => (
              <div key={index} className="grid grid-cols-[1fr_8rem_2rem] items-center gap-2">
                <input
                  id={`${idPrefix}-trip-location-${index}`}
                  className="input"
                  type="text"
                  value={row.location}
                  onChange={(event) => updateRow(index, 'location', toTitleCase(event.target.value))}
                  placeholder="e.g. Raipur"
                  autoComplete="off"
                />
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-semibold text-slate-400">₹</span>
                  <input
                    className="input pl-7"
                    type="number"
                    value={row.rate}
                    onChange={(event) => updateRow(index, 'rate', event.target.value)}
                    min="0"
                    step="0.01"
                    placeholder="0"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => onChange({ tripRates: rows.filter((_, rowIndex) => rowIndex !== index) })}
                  disabled={rows.length === 1}
                  aria-label="Remove location"
                  className="flex h-9 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:pointer-events-none disabled:opacity-30"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addRow} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:underline">
            <Plus size={14} /> Add Location
          </button>
        </div>
      )}
    </div>
  );
}
