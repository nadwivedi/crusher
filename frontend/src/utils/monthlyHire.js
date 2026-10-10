import { toLocalDateInput } from '../components/CustomRangePopup';

export const formatRupees = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

// "2026-10-10" from a date the server sent, in the viewer's day
export const toDayInput = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? toLocalDateInput(date) : '';
};

export const formatDayInput = (day) => (day
  ? new Date(`${day}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  : '');

export const formatHireDate = (value) => formatDayInput(toDayInput(value));

export const todayInput = () => toLocalDateInput(new Date());

// How the days after the last full month are charged when a hire is cancelled
export const CANCEL_CHARGE_OPTIONS = [
  { value: 'prorata', label: 'Pay for days used', hint: 'Only the days the vehicle worked in the last part month' },
  { value: 'none', label: 'Do not pay', hint: 'Breakdown or dispute: nothing for the last part month' },
  { value: 'full', label: 'Pay full month', hint: 'The whole last month, however few days were used' },
  { value: 'custom', label: 'Custom amount', hint: 'Settle the last part month at an agreed amount' }
];

export const ADJUSTMENT_KIND_OPTIONS = [
  { value: 'off_days', label: 'Off Days', hint: 'Vehicle did not work (breakdown, repair, holiday)' },
  { value: 'deduct', label: 'Less Amount', hint: 'Take an amount off that month' },
  { value: 'extra', label: 'Extra Amount', hint: 'Add an amount to that month (driver bata, extra trips)' }
];

// Where a hire stands today, and the last day it is charged for
export const getHireStatus = (hire) => {
  const today = todayInput();
  const start = toDayInput(hire.startDate);
  const end = toDayInput(hire.endDate);
  const cancelled = toDayInput(hire.cancelledAt);
  const stop = [end, cancelled].filter(Boolean).sort()[0] || '';
  const isCancelled = Boolean(cancelled) && stop === cancelled;

  if (start > today) return { key: 'upcoming', label: `Starts ${formatDayInput(start)}`, className: 'badge-blue', stop, isCancelled };
  if (stop && stop < today) {
    return isCancelled
      ? { key: 'cancelled', label: `Cancelled · last day ${formatDayInput(stop)}`, className: 'badge-red', stop, isCancelled }
      : { key: 'ended', label: `Ended ${formatDayInput(stop)}`, className: 'badge-orange', stop, isCancelled };
  }
  return {
    key: 'running',
    label: stop ? `Running till ${formatDayInput(stop)}` : 'Running',
    className: 'badge-green',
    stop,
    isCancelled
  };
};
