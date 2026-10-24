import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, FileSpreadsheet, FileText, X } from 'lucide-react';
import { formatRangeLabel, toLocalDateInput } from './CustomRangePopup';
import { MONTH_NAMES, getMonthRange } from './MonthPickerPopup';

const optionClass = (active) => `border-2 text-sm font-bold transition ${
  active
    ? 'border-sky-500 bg-sky-500 text-white shadow-md'
    : 'border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50'
}`;

const dateInputClass = 'w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 transition-all focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-100';

// The days of a month, up to today for the running month
const monthDays = (month, year) => {
  const range = getMonthRange(String(month), year);
  const today = toLocalDateInput(new Date());
  return { from: range.from, to: range.to > today ? today : range.to };
};

// Pick a month (or your own dates) and download the party's statement for it as Excel or PDF.
// onExport(format, from, to) gets 'excel' or 'pdf' and yyyy-mm-dd days.
export default function PartyStatementPopup({ partyName, busy = false, onExport, onClose }) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(now.getMonth());
  const [custom, setCustom] = useState(false);
  const [customFrom, setCustomFrom] = useState(() => monthDays(now.getMonth(), currentYear).from);
  const [customTo, setCustomTo] = useState(() => toLocalDateInput(now));

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopImmediatePropagation();
        if (!busy) onClose();
      }
    };
    // Capture phase so the page's own Escape handler does not also fire
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [busy, onClose]);

  const range = custom ? { from: customFrom, to: customTo } : monthDays(month, year);
  const canExport = Boolean(range.from && range.to && range.from <= range.to) && !busy;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={() => !busy && onClose()}>
      <div
        className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Party statement"
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
          <div className="min-w-0">
            <h3 className="text-lg font-black text-slate-800">Party Statement</h3>
            <p className="truncate text-sm text-slate-500">{partyName ? `${partyName} · ` : ''}opening balance, entries and closing balance</p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close" className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5">
          <div className="mb-4 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setCustom(false)} className={`${optionClass(!custom)} rounded-xl px-3 py-2`}>Month</button>
            <button type="button" onClick={() => setCustom(true)} className={`${optionClass(custom)} rounded-xl px-3 py-2`}>Custom Dates</button>
          </div>

          {custom ? (
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">From</span>
                <input type="date" value={customFrom} max={customTo || undefined} onChange={(e) => setCustomFrom(e.target.value)} className={dateInputClass} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">To</span>
                <input type="date" value={customTo} min={customFrom || undefined} onChange={(e) => setCustomTo(e.target.value)} className={dateInputClass} />
              </label>
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-2 py-1.5">
                <button type="button" onClick={() => setYear((y) => y - 1)} aria-label="Previous year" className="rounded-xl p-2 text-slate-600 transition hover:bg-white hover:shadow-sm">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <span className="text-xl font-black text-slate-800">{year}</span>
                <button
                  type="button"
                  onClick={() => setYear((y) => y + 1)}
                  disabled={year >= currentYear}
                  aria-label="Next year"
                  className="rounded-xl p-2 text-slate-600 transition hover:bg-white hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {MONTH_NAMES.map((name, index) => {
                  const isFuture = year === currentYear && index > now.getMonth();
                  return (
                    <button
                      key={name}
                      type="button"
                      disabled={isFuture}
                      onClick={() => setMonth(index)}
                      className={`${optionClass(month === index)} rounded-xl px-2 py-2.5 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-slate-200 disabled:hover:bg-white`}
                    >
                      {name.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="border-t border-slate-100 bg-slate-50 px-6 py-4">
          <p className="mb-3 text-sm font-semibold text-slate-600">
            {range.from && range.to && range.from <= range.to ? formatRangeLabel(range.from, range.to) : 'Select both dates'}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={!canExport}
              onClick={() => onExport('excel', range.from, range.to)}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <FileSpreadsheet size={16} /> {busy ? 'Exporting...' : 'Excel'}
            </button>
            <button
              type="button"
              disabled={!canExport}
              onClick={() => onExport('pdf', range.from, range.to)}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <FileText size={16} /> {busy ? 'Exporting...' : 'PDF'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
