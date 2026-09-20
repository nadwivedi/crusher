import { useEffect, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { toLocalDateInput } from './CustomRangePopup';

export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// month is '' for the whole year, otherwise '0'..'11'.
export const formatMonthLabel = (month, year) => (
  month === '' ? `Full Year ${year}` : `${MONTH_NAMES[Number(month)]} ${year}`
);

// Local yyyy-mm-dd bounds of the chosen month (or whole year).
export const getMonthRange = (month, year) => {
  const y = Number(year);
  if (month === '') return { from: toLocalDateInput(new Date(y, 0, 1)), to: toLocalDateInput(new Date(y, 11, 31)) };
  const m = Number(month);
  return { from: toLocalDateInput(new Date(y, m, 1)), to: toLocalDateInput(new Date(y, m + 1, 0)) };
};

const optionClass = (active) => `border-2 text-sm font-bold transition ${
  active
    ? 'border-sky-500 bg-sky-500 text-white shadow-md'
    : 'border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50'
}`;

// Button that shows the applied month and reopens the popup when clicked.
export function MonthRangeButton({ month, year, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl border-2 border-sky-300 bg-sky-50 px-4 py-2.5 text-sm font-bold text-sky-700 transition hover:bg-sky-100"
    >
      <CalendarDays className="h-4 w-4" />
      {formatMonthLabel(month, year)}
    </button>
  );
}

// Render only while open: the drafts start from the applied month each time it opens.
export default function MonthPickerPopup({ month = '', year, onApply, onClose, title = 'Select Month', subtitle = 'Choose the year, then the month' }) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const [draftMonth, setDraftMonth] = useState(month);
  const [draftYear, setDraftYear] = useState(Number(year) || currentYear);

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
        aria-label="Select month and year"
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-lg font-black text-slate-800">{title}</h3>
            <p className="text-sm text-slate-500">{subtitle}</p>
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
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Year</p>
          <div className="mb-5 flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-2 py-1.5">
            <button
              type="button"
              onClick={() => setDraftYear((y) => y - 1)}
              aria-label="Previous year"
              className="rounded-xl p-2 text-slate-600 transition hover:bg-white hover:shadow-sm"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-xl font-black text-slate-800">{draftYear}</span>
            <button
              type="button"
              onClick={() => setDraftYear((y) => y + 1)}
              disabled={draftYear >= currentYear}
              aria-label="Next year"
              className="rounded-xl p-2 text-slate-600 transition hover:bg-white hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Month</p>
          <div className="grid grid-cols-3 gap-2">
            {MONTH_NAMES.map((name, index) => {
              const isFuture = draftYear === currentYear && index > now.getMonth();
              return (
                <button
                  key={name}
                  type="button"
                  disabled={isFuture}
                  onClick={() => setDraftMonth(String(index))}
                  className={`${optionClass(draftMonth === String(index))} rounded-xl px-2 py-3 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-slate-200 disabled:hover:bg-white`}
                >
                  {name.slice(0, 3)}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setDraftMonth('')}
            className={`${optionClass(draftMonth === '')} mt-3 w-full rounded-xl px-3 py-2.5`}
          >
            Whole Year {draftYear}
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <p className="text-sm font-semibold text-slate-600">{formatMonthLabel(draftMonth, draftYear)}</p>
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
              onClick={() => onApply(draftMonth, String(draftYear))}
              className="rounded-xl bg-slate-800 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-900"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
