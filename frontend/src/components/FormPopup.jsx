import { X } from 'lucide-react';

/**
 * Popup shell for simple forms: gradient header, scrollable body, footer with Cancel + submit.
 * Uses the app's popup conventions ("fixed inset-0 z-50" + a "Close popup" button) so Esc closes it.
 */
export default function FormPopup({ title, subtitle, submitLabel = 'Save', onSubmit, onClose, onKeyDown, maxWidth = 'max-w-md', children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 md:p-4" onClick={onClose}>
      <form
        className={`flex max-h-[95vh] w-full ${maxWidth} flex-col overflow-hidden rounded-xl bg-white shadow-2xl md:rounded-2xl`}
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => { event.preventDefault(); onSubmit(); }}
        onKeyDown={onKeyDown}
      >
        <div className="flex-shrink-0 bg-gradient-to-r from-primary-700 to-primary-500 p-3 text-white md:px-5 md:py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold md:text-xl">{title}</h2>
              {subtitle && <p className="mt-0.5 text-xs text-primary-100 md:text-sm">{subtitle}</p>}
            </div>
            <button type="button" onClick={onClose} aria-label="Close popup" className="shrink-0 rounded-lg p-1.5 text-white transition hover:bg-white/20 md:p-2">
              <X size={22} />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-3 md:space-y-4 md:p-6">{children}</div>

        <div className="flex flex-shrink-0 justify-end gap-2 border-t border-slate-200 bg-slate-50 p-3 md:gap-3 md:p-4 [&>button]:flex-1 md:[&>button]:flex-none">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary px-8">{submitLabel}</button>
        </div>
      </form>
    </div>
  );
}
