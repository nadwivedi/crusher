import { useState } from 'react';
import { toast } from 'react-toastify';
import apiClient from '../../../utils/api';
import FormPopup from '../../../components/FormPopup';
import { handlePopupFormKeyDown } from '../../../utils/popupFormKeyboard';
import { ADJUSTMENT_KIND_OPTIONS, formatRupees, toDayInput, todayInput } from '../../../utils/monthlyHire';

/** Off days, or an amount off or on top, for the month the date falls in. */
export default function AdjustmentPopup({ hire, onClose, onDone }) {
  const start = toDayInput(hire.startDate);
  const [kind, setKind] = useState('off_days');
  const [date, setDate] = useState(() => (todayInput() < start ? start : todayInput()));
  const [days, setDays] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isOffDays = kind === 'off_days';

  const handleSubmit = async () => {
    if (saving) return;
    if (!date || date < start) {
      setError('Pick a date on or after the hire started');
      return;
    }
    if (isOffDays && !(Number(days) >= 1 && Number(days) <= 31)) {
      setError('Off days must be between 1 and 31');
      return;
    }
    if (!isOffDays && !(Number(amount) > 0)) {
      setError('Amount must be greater than 0');
      return;
    }
    try {
      setSaving(true);
      const saved = await apiClient.post(`/monthly-hires/${hire._id}/adjustments`, {
        kind,
        date,
        days: isOffDays ? Number(days) : undefined,
        amount: isOffDays ? undefined : Number(amount),
        note: note.trim()
      });
      toast.success('Adjustment added');
      onDone(saved);
    } catch (submitError) {
      setError(submitError?.message || 'Error adding adjustment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormPopup
      title="Adjust A Month"
      subtitle={`${hire.partyName || 'Party'}${hire.vehicleNo ? ` · ${hire.vehicleNo}` : ''} · ${formatRupees(hire.monthlyRate)} a month`}
      submitLabel={saving ? 'Saving...' : 'Add Adjustment'}
      submitDisabled={saving}
      maxWidth="max-w-lg"
      onSubmit={handleSubmit}
      onClose={onClose}
      onKeyDown={(event) => handlePopupFormKeyDown(event, onClose)}
    >
      {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {ADJUSTMENT_KIND_OPTIONS.map((option) => {
          const active = kind === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setKind(option.value)}
              aria-pressed={active}
              className={`rounded-lg border px-3 py-2 text-left transition ${active ? 'border-primary-600 bg-primary-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'}`}
            >
              <span className="block text-sm font-semibold">{option.label}</span>
              <span className={`block text-[11px] ${active ? 'text-primary-100' : 'text-slate-400'}`}>{option.hint}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="adjust-date">Date *</label>
          <input id="adjust-date" className="input" type="date" value={date} min={start} onChange={(event) => setDate(event.target.value)} />
        </div>
        {isOffDays ? (
          <div>
            <label className="label" htmlFor="adjust-days">Days Not Worked *</label>
            <input id="adjust-days" className="input" type="number" value={days} onChange={(event) => setDays(event.target.value)} min="1" max="31" step="1" placeholder="e.g. 5" autoFocus />
          </div>
        ) : (
          <div>
            <label className="label" htmlFor="adjust-amount">Amount *</label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-semibold text-slate-400">₹</span>
              <input id="adjust-amount" className="input pl-7" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} min="0" step="0.01" placeholder="0" autoFocus />
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="label" htmlFor="adjust-note">Reason</label>
        <input id="adjust-note" className="input" type="text" value={note} onChange={(event) => setNote(event.target.value)} placeholder="e.g. breakdown, driver bata" />
      </div>

      <p className="text-xs text-slate-500">
        {isOffDays
          ? 'Off days are taken off at the month\'s day rate (monthly amount ÷ days in that month).'
          : 'The amount goes on the month the date falls in.'}
        {' '}It shows on that month&apos;s line in the ledger straight away.
      </p>
    </FormPopup>
  );
}
