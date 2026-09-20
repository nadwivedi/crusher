export default function AddExpensePopup({
  open,
  onClose,
  onSubmit,
  loading,
  isEditing = false,
  children,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 backdrop-blur-[1.5px] md:p-4" onClick={onClose}>
      <div
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200/80"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex-shrink-0 border-b border-white/15 bg-gradient-to-r from-cyan-700 via-blue-700 to-indigo-700 px-4 py-3 text-white md:px-5 md:py-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div>
                <h2 className="text-base font-bold md:text-xl">{isEditing ? 'Edit Expense' : 'Add Expense'}</h2>
                <p className="mt-0.5 text-[11px] text-cyan-100 md:text-xs">Create normal expense entries in a clean accounting format.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-white transition hover:bg-white/25 md:p-2"
              aria-label="Close popup"
            >
              <svg className="h-5 w-5 md:h-6 md:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={onSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto bg-slate-50 p-3 md:p-4">
            {children}
          </div>

          <div className="flex shrink-0 flex-col items-center justify-between gap-2 border-t border-gray-200 bg-white px-4 py-3 md:flex-row md:px-5">
            <div className="text-[11px] text-gray-600 md:text-xs">
              <kbd className="rounded bg-gray-200 px-2 py-1 font-mono text-xs">Esc</kbd> to close
            </div>

            <div className="flex w-full gap-2 md:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 md:flex-none md:px-5"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2 text-sm font-semibold text-white transition hover:shadow-lg disabled:opacity-50 md:flex-none md:px-6"
              >
                {loading ? 'Saving...' : isEditing ? 'Update Expense' : 'Save Expense'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
