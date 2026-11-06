import { useEffect, useRef } from 'react';
import { Eye, FileText, Pencil, Trash2 } from 'lucide-react';

/**
 * Phones: the "⋮" menu of a sale, as a sheet from the bottom of the screen.
 * onEdit / onDelete are left out when the person may not edit or delete that sale.
 */
export default function SaleActionSheet({ title, subtitle, onClose, onView, onEdit, onInvoice, onDelete }) {
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

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

  const actions = [
    { key: 'view', label: 'View full details', icon: <Eye size={18} className="text-slate-400" />, onClick: onView, className: 'text-slate-800' },
    onEdit && { key: 'edit', label: 'Edit sale', icon: <Pencil size={18} className="text-slate-400" />, onClick: onEdit, className: 'text-slate-800' },
    { key: 'invoice', label: 'Invoice PDF', icon: <FileText size={18} className="text-slate-400" />, onClick: onInvoice, className: 'text-slate-800' },
    onDelete && { key: 'delete', label: 'Delete sale', icon: <Trash2 size={18} className="text-rose-500" />, onClick: onDelete, className: 'text-rose-600' }
  ].filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-end overscroll-contain bg-black/50" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Sale actions"
        className="w-full rounded-t-2xl bg-white pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-slate-200" />
        <div className="border-b border-slate-100 px-5 pb-3 pt-2.5">
          <p className="truncate text-sm font-semibold text-slate-900">{title}</p>
          {subtitle && <p className="mt-0.5 truncate text-xs text-slate-500">{subtitle}</p>}
        </div>
        <ul className="py-1">
          {actions.map(({ key, label, icon, onClick, className }) => (
            <li key={key}>
              <button
                type="button"
                onClick={onClick}
                className={`flex w-full items-center gap-3.5 px-5 py-3.5 text-left text-sm font-medium active:bg-slate-50 ${className}`}
              >
                {icon}
                {label}
              </button>
            </li>
          ))}
        </ul>
        <div className="px-4 pt-1">
          <button type="button" onClick={onClose} className="w-full rounded-xl bg-slate-100 py-3 text-sm font-semibold text-slate-700 active:bg-slate-200">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
