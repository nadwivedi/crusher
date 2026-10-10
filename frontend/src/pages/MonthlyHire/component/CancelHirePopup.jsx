import { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import apiClient from '../../../utils/api';
import FormPopup from '../../../components/FormPopup';
import { handlePopupFormKeyDown } from '../../../utils/popupFormKeyboard';
import { CANCEL_CHARGE_OPTIONS, formatDayInput, formatRupees, toDayInput, todayInput } from '../../../utils/monthlyHire';

const DAY_MS = 24 * 60 * 60 * 1000;

const parseDay = (day) => new Date(`${day}T00:00:00Z`).getTime();

// The same day n months later; the 31st becomes the month's last day when the month is shorter
const addMonths = (day, months) => {
  const date = new Date(day);
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(date.getUTCDate(), lastDay));
  return target.getTime();
};

const toInput = (time) => new Date(time).toISOString().slice(0, 10);

// The part month a cancel on this day leaves: its first day, how many days were used, and how long the month is
const getPartMonth = (startDay, lastDay) => {
  if (!startDay || !lastDay || lastDay < startDay) return null;
  const start = parseDay(startDay);
  const last = parseDay(lastDay);
  for (let index = 0; index < 1200; index += 1) {
    const from = addMonths(start, index);
    const monthEnd = addMonths(start, index + 1) - DAY_MS;
    if (last <= monthEnd) {
      const usedDays = Math.round((last - from) / DAY_MS) + 1;
      const monthDays = Math.round((monthEnd - from) / DAY_MS) + 1;
      return { from: toInput(from), usedDays, monthDays, fullMonths: index, isFull: last === monthEnd };
    }
  }
  return null;
};

/** Stops a hire on a chosen day and says how the last part month is paid. */
export default function CancelHirePopup({ hire, onClose, onDone }) {
  const [cancelDate, setCancelDate] = useState(() => {
    const today = todayInput();
    const start = toDayInput(hire.startDate);
    return today < start ? start : today;
  });
  const [cancelCharge, setCancelCharge] = useState('prorata');
  const [cancelAmount, setCancelAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const start = toDayInput(hire.startDate);
  const rate = Number(hire.monthlyRate || 0);

  const part = useMemo(() => getPartMonth(start, cancelDate), [start, cancelDate]);
  const lastPartAmount = !part || part.isFull
    ? rate
    : cancelCharge === 'full' ? rate
      : cancelCharge === 'none' ? 0
        : cancelCharge === 'custom' ? Number(cancelAmount || 0)
          : Math.round((rate * part.usedDays * 100) / part.monthDays) / 100;

  const handleSubmit = async () => {
    if (saving) return;
    if (!cancelDate || cancelDate < start) {
      setError('Pick a day on or after the hire started');
      return;
    }
    if (part && !part.isFull && cancelCharge === 'custom' && (cancelAmount === '' || Number(cancelAmount) < 0)) {
      setError('Enter the amount for the last part month');
      return;
    }
    try {
      setSaving(true);
      const saved = await apiClient.post(`/monthly-hires/${hire._id}/cancel`, {
        cancelDate,
        cancelCharge: part && !part.isFull ? cancelCharge : 'prorata',
        cancelAmount: Number(cancelAmount || 0),
        note: note.trim()
      });
      toast.success('Monthly hire cancelled');
      onDone(saved);
    } catch (submitError) {
      setError(submitError?.message || 'Error cancelling monthly hire');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormPopup
      title="Cancel Monthly Hire"
      subtitle={`${hire.partyName || 'Party'}${hire.vehicleNo ? ` · ${hire.vehicleNo}` : ''} · ${formatRupees(rate)} a month`}
      submitLabel={saving ? 'Cancelling...' : 'Cancel Hire'}
      submitDisabled={saving}
      maxWidth="max-w-lg"
      onSubmit={handleSubmit}
      onClose={onClose}
      onKeyDown={(event) => handlePopupFormKeyDown(event, onClose)}
    >
      {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}

      <div>
        <label className="label" htmlFor="hire-cancel-date">Last Day The Vehicle Worked</label>
        <input id="hire-cancel-date" className="input" type="date" value={cancelDate} min={start} onChange={(event) => setCancelDate(event.target.value)} autoFocus />
        {part && (
          <p className="mt-1 text-xs text-slate-500">
            {part.fullMonths > 0 ? `${part.fullMonths} full month${part.fullMonths === 1 ? '' : 's'} before this` : 'Cancelled in the first month'}
            {part.isFull
              ? `, and this day ends a full month, so it is charged in full.`
              : `, then ${part.usedDays} of ${part.monthDays} days from ${formatDayInput(part.from)}.`}
          </p>
        )}
      </div>

      {part && !part.isFull && (
        <div>
          <span className="label">Last {part.usedDays} Days</span>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {CANCEL_CHARGE_OPTIONS.map((option) => {
              const active = cancelCharge === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setCancelCharge(option.value)}
                  aria-pressed={active}
                  className={`rounded-lg border px-3 py-2 text-left transition ${active ? 'border-primary-600 bg-primary-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'}`}
                >
                  <span className="block text-sm font-semibold">{option.label}</span>
                  <span className={`block text-[11px] ${active ? 'text-primary-100' : 'text-slate-400'}`}>{option.hint}</span>
                </button>
              );
            })}
          </div>
          {cancelCharge === 'custom' && (
            <div className="relative mt-2">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-semibold text-slate-400">₹</span>
              <input className="input pl-7" type="number" value={cancelAmount} onChange={(event) => setCancelAmount(event.target.value)} min="0" step="0.01" placeholder="Amount for the last part month" />
            </div>
          )}
        </div>
      )}

      <div>
        <label className="label" htmlFor="hire-cancel-note">Reason</label>
        <input id="hire-cancel-note" className="input" type="text" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional, e.g. breakdown, work finished" />
      </div>

      {part && (
        <div className="flex items-center justify-between rounded-xl bg-amber-50 px-3 py-2 ring-1 ring-amber-200">
          <span className="text-xs font-semibold text-slate-600">Last month in the ledger</span>
          <span className="text-base font-bold text-slate-900">{formatRupees(lastPartAmount)}</span>
        </div>
      )}
      <p className="text-xs text-slate-500">You can resume the hire later; the ledger is worked out again either way.</p>
    </FormPopup>
  );
}
