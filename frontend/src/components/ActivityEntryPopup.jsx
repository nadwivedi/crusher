import { useEffect, useRef, useState } from 'react';
import { Lock, Pencil, X } from 'lucide-react';
import apiClient from '../utils/api';
import { describePerson } from '../utils/staffAccess';

const formatMoney = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const formatDay = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};
const formatStamp = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};
const showValue = (row) => (row.kind === 'money' ? formatMoney(row.value) : row.kind === 'date' ? formatDay(row.value) : String(row.value));

// Rows that read better a little stronger
const STRONG = new Set(['Total', 'Total amount', 'Amount', 'Balance']);

/**
 * Activity Center: everything saved on one entry, read from /reports/activity/:type/:id.
 * item: the row of the activity list (type, id, who added / changed it).
 * label / icon (an element) / tile: how that kind of entry looks in the list.
 * onEdit(entry) is called with the loaded entry when it can be edited.
 */
export default function ActivityEntryPopup({ item, label, icon, tile, onClose, onEdit }) {
  const [entry, setEntry] = useState(null);
  const [error, setError] = useState('');
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    let live = true;
    apiClient.get(`/reports/activity/${item.type}/${item.id}`)
      .then((response) => live && setEntry(response))
      .catch((err) => live && setError(err.message || 'Could not load this entry'));
    return () => { live = false; };
  }, [item.type, item.id]);

  // Esc closes it before the page's own Esc handler sees the key; the page behind does not scroll
  useEffect(() => {
    const handleKey = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      onCloseRef.current();
    };
    document.addEventListener('keydown', handleKey, true);
    const { body, documentElement } = document;
    const prevBody = body.style.overflow;
    const prevHtml = documentElement.style.overflow;
    body.style.overflow = 'hidden';
    documentElement.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey, true);
      body.style.overflow = prevBody;
      documentElement.style.overflow = prevHtml;
    };
  }, []);

  const added = item.by ? `${describePerson(item.by)}${item.createdAt ? ` · ${formatStamp(item.createdAt)}` : ''}` : formatStamp(item.createdAt);
  const changed = item.editedBy ? `${describePerson(item.editedBy)}${item.editedAt ? ` · ${formatStamp(item.editedAt)}` : ''}` : '';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overscroll-contain bg-black/60 md:items-center md:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${label} details`}
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl md:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex flex-shrink-0 items-start gap-3 border-b border-slate-100 px-4 py-3.5 md:px-5">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ${tile}`}>
            {icon}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
            <h2 className="truncate text-base font-bold text-slate-900">{entry?.title || item.title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close popup" className="icon-btn -mr-1 p-1.5">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain">
          {error ? (
            <p className="m-4 rounded-lg bg-rose-50 px-3 py-2.5 text-sm font-semibold text-rose-700">{error}</p>
          ) : !entry ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-r-transparent" />
            </div>
          ) : (
            <dl className="divide-y divide-slate-100">
              {entry.fields.map((row) => (
                <div key={row.label} className={`flex items-start justify-between gap-4 px-4 py-2.5 text-[13px] md:px-5 ${STRONG.has(row.label) ? 'bg-slate-50' : ''}`}>
                  <dt className="shrink-0 text-slate-500">{row.label}</dt>
                  <dd className={`min-w-0 whitespace-pre-line break-words text-right tabular-nums ${STRONG.has(row.label) ? 'font-bold text-slate-900' : 'font-medium text-slate-800'}`}>
                    {showValue(row)}
                  </dd>
                </div>
              ))}
              {added && (
                <div className="flex items-start justify-between gap-4 px-4 py-2.5 text-[13px] md:px-5">
                  <dt className="shrink-0 text-slate-500">Added by</dt>
                  <dd className="text-right font-medium text-slate-800">{added}</dd>
                </div>
              )}
              {changed && (
                <div className="flex items-start justify-between gap-4 px-4 py-2.5 text-[13px] md:px-5">
                  <dt className="shrink-0 text-slate-500">Last changed by</dt>
                  <dd className="text-right font-medium text-amber-700">{changed}</dd>
                </div>
              )}
            </dl>
          )}
        </div>

        <div className="flex flex-shrink-0 items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-5">
          {entry && !entry.editable && entry.lockedHint && (
            <p className="mr-auto flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
              <Lock size={13} className="shrink-0" /> {entry.lockedHint}
            </p>
          )}
          <button type="button" className="btn-secondary" onClick={onClose}>Close</button>
          {entry?.editable && (
            <button type="button" className="btn-primary" onClick={() => onEdit(entry)}>
              <Pencil size={16} /> Edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
