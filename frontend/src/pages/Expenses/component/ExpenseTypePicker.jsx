import { useEffect, useRef, useState } from 'react';

export default function ExpenseTypePicker({ open, onClose, onChooseType }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const normalButtonRef = useRef(null);
  const purchaseButtonRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setActiveIndex(0);
      return;
    }

    const focusButton = () => {
      if (activeIndex === 0) {
        normalButtonRef.current?.focus();
        return;
      }
      purchaseButtonRef.current?.focus();
    };

    const timer = setTimeout(focusButton, 0);
    return () => clearTimeout(timer);
  }, [activeIndex, open]);

  if (!open) return null;

  const options = ['normal', 'purchase'];

  const handleKeyDown = (event) => {
    const key = event.key?.toLowerCase();

    if (key === 'escape') {
      event.preventDefault();
      onClose();
      return;
    }

    if (key === 'arrowdown') {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % options.length);
      return;
    }

    if (key === 'arrowup') {
      event.preventDefault();
      setActiveIndex((current) => (current - 1 + options.length) % options.length);
      return;
    }

    if (key === 'enter') {
      event.preventDefault();
      onChooseType(options[activeIndex]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 backdrop-blur-[1.5px] md:p-4" onClick={onClose}>
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200/80"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="border-b border-white/15 bg-gradient-to-r from-cyan-700 via-blue-700 to-indigo-700 px-4 py-3 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Choose Expense Type</h2>
              <p className="mt-1 text-xs text-cyan-100">Select what kind of expense you want to enter.</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-white transition hover:bg-white/15"
              aria-label="Close popup"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="space-y-3 p-4">
          <button
            ref={normalButtonRef}
            type="button"
            onClick={() => onChooseType('normal')}
            onFocus={() => setActiveIndex(0)}
            className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
              activeIndex === 0
                ? 'border-sky-300 bg-sky-50 ring-2 ring-sky-200'
                : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
            }`}
          >
            <div>
              <p className="font-semibold text-slate-900">Normal Expense</p>
              <p className="text-xs text-slate-500">Services and regular expense types.</p>
            </div>
            <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-sky-700">Services</span>
          </button>
          <button
            ref={purchaseButtonRef}
            type="button"
            onClick={() => onChooseType('purchase')}
            onFocus={() => setActiveIndex(1)}
            className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
              activeIndex === 1
                ? 'border-emerald-300 bg-emerald-50 ring-2 ring-emerald-200'
                : 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100'
            }`}
          >
            <div>
              <p className="font-semibold text-slate-900">Purchase Expense</p>
              <p className="text-xs text-slate-500">Goods expense with multiple stock items.</p>
            </div>
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700">Goods</span>
          </button>
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
            <p className="text-[11px] text-slate-500">Use up/down arrows to move and Enter to select.</p>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
