import { useEffect, useRef } from 'react';

export default function AddExpenseTypePopup({
  open,
  name,
  description,
  loading,
  error,
  onNameChange,
  onDescriptionChange,
  onClose,
  onSubmit,
}) {
  const nameInputRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const timer = setTimeout(() => {
      nameInputRef.current?.focus();
      nameInputRef.current?.select?.();
    }, 0);
    return () => clearTimeout(timer);
  }, [open]);

  if (!open) return null;

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onClose();
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onSubmit();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-2 backdrop-blur-[1.5px] md:p-4"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200/80"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-white/15 bg-gradient-to-r from-cyan-700 via-blue-700 to-indigo-700 px-4 py-3 text-white">
          <h2 className="text-lg font-bold">Add Expense Type</h2>
          <p className="mt-1 text-xs text-cyan-100">Create a new service expense type.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 p-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-700">Expense Type Name</label>
            <input
              ref={nameInputRef}
              type="text"
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-bold text-gray-900 transition-all placeholder:font-normal placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="e.g. Diesel, Electricity, Repair"
              autoComplete="off"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-700">Description (optional)</label>
            <input
              type="text"
              value={description}
              onChange={(event) => onDescriptionChange(event.target.value)}
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-bold text-gray-900 transition-all placeholder:font-normal placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              autoComplete="off"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{error}</p>
          )}

          <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 bg-white px-4 py-1.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-1.5 text-sm font-semibold text-white transition hover:shadow-lg disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Type'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
