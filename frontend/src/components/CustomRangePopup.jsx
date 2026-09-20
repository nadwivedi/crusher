import { useEffect, useState } from 'react';
import { CalendarDays, X } from 'lucide-react';

const pad = (value) => String(value).padStart(2, '0');

// Local-time yyyy-mm-dd (toISOString would shift the date back by a day in IST).
export const toLocalDateInput = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const formatDisplayDate = (value) => {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return '';
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatRangeLabel = (from, to) => {
  if (!from || !to) return 'Select dates';
  return from === to ? formatDisplayDate(from) : `${formatDisplayDate(from)} - ${formatDisplayDate(to)}`;
};

const getPresets = () => {
  const today = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  return [
    { label: 'Today', from: toLocalDateInput(today), to: toLocalDateInput(today) },
    { label: 'Yesterday', from: toLocalDateInput(yesterday), to: toLocalDateInput(yesterday) },
    {
      label: 'This Month',
      from: toLocalDateInput(new Date(today.getFullYear(), today.getMonth(), 1)),
      to: toLocalDateInput(today)
    },
    {
      label: 'Last Month',
      from: toLocalDateInput(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
      to: toLocalDateInput(new Date(today.getFullYear(), today.getMonth(), 0))
    }
  ];
};

const optionClass = (active) => `rounded-xl border-2 px-3 py-2 text-sm font-bold transition ${
  active
    ? 'border-sky-500 bg-sky-500 text-white shadow-md'
    : 'border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50'
}`;

const dateInputClass = 'w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 transition-all focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-100';

// Button that shows the applied range and reopens the popup when clicked.
export function CustomRangeButton({ from, to, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl border-2 border-sky-300 bg-sky-50 px-4 py-2.5 text-sm font-bold text-sky-700 transition hover:bg-sky-100"
    >
      <CalendarDays className="h-4 w-4" />
      {formatRangeLabel(from, to)}
    </button>
  );
}

// Render only while open: the drafts start from the applied range each time it opens.
export default function CustomRangePopup({ from = '', to = '', onApply, onClose }) {
  const [draftFrom, setDraftFrom] = useState(from);
  const [draftTo, setDraftTo] = useState(to);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopImmediatePropagation();
        onClose();
      }
    };
    // Capture phase so the page's own Escape handler (e.g. "go Home") does not also fire.
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [onClose]);

  const canApply = Boolean(draftFrom && draftTo);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Select custom date range"
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-lg font-black text-slate-800">Custom Range</h3>
            <p className="text-sm text-slate-500">Pick the start and end date</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Quick Select</p>
          <div className="mb-5 grid grid-cols-2 gap-2">
            {getPresets().map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setDraftFrom(preset.from);
                  setDraftTo(preset.to);
                }}
                className={optionClass(draftFrom === preset.from && draftTo === preset.to)}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">From</span>
              <input
                type="date"
                value={draftFrom}
                max={draftTo || undefined}
                onChange={(e) => setDraftFrom(e.target.value)}
                className={dateInputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">To</span>
              <input
                type="date"
                value={draftTo}
                min={draftFrom || undefined}
                onChange={(e) => setDraftTo(e.target.value)}
                className={dateInputClass}
              />
            </label>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <p className="text-sm font-semibold text-slate-600">
            {canApply ? formatRangeLabel(draftFrom, draftTo) : 'Select both dates'}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => canApply && onApply(draftFrom, draftTo)}
              disabled={!canApply}
              className="rounded-xl bg-slate-800 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
