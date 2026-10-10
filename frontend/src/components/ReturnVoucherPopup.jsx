import { useMemo, useRef, useState } from 'react';
import { ChevronDown, RotateCcw, Search } from 'lucide-react';
import { handlePopupFormKeyDown } from '../utils/popupFormKeyboard';
import { useFloatingDropdownPosition } from '../utils/useFloatingDropdownPosition';
import FormPopup from './FormPopup';
import FormSection from './FormSection';
import OptionList from './OptionList';

const formatAmount = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatQty = (value) => Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

const TH = 'px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500';
const TD = 'px-3 py-2 text-sm text-slate-700';
const MAX_OPTIONS = 50;

/**
 * Shared popup for sale return and purchase return vouchers.
 * sources: the original bills (sales or purchases) to pick from. items: the picked bill's lines,
 * each { id, productName, unit, originalQty, returnedQty, remainingQty, unitPrice }.
 */
export default function ReturnVoucherPopup({
  title,
  subtitle,
  sourceLabel,
  sourcePlaceholder,
  originalQtyLabel,
  notesPlaceholder,
  submitLabel,
  sources,
  sourceId,
  getSourceLabel,
  getSourceHint,
  onSelectSource,
  summary = [],
  items,
  returnQuantities,
  onQuantityChange,
  onReturnAll,
  voucherDate,
  notes,
  onFieldChange,
  totalAmount,
  selectedCount,
  error,
  saving,
  onSubmit,
  onClose
}) {
  const pickerRef = useRef(null);
  const pickerInputRef = useRef(null);
  const [query, setQuery] = useState(null); // null: show the picked bill's label instead of a search
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const selectedSource = sources.find((source) => String(source._id) === String(sourceId)) || null;
  const filteredSources = useMemo(() => {
    const needle = String(query || '').trim().toLowerCase();
    const matches = needle
      ? sources.filter((source) => `${getSourceLabel(source)} ${getSourceHint(source)}`.toLowerCase().includes(needle))
      : sources;
    return matches.slice(0, MAX_OPTIONS);
  }, [sources, query, getSourceLabel, getSourceHint]);
  const dropdownStyle = useFloatingDropdownPosition(pickerRef, isPickerOpen, [filteredSources.length, activeIndex]);
  const hasReturnable = items.some((item) => item.remainingQty > 0);

  const pickSource = (source) => {
    onSelectSource(source._id);
    setQuery(null);
    setIsPickerOpen(false);
    // Jump to the first return quantity box once the items have rendered
    requestAnimationFrame(() => {
      pickerRef.current?.closest('form')?.querySelector('input[data-return-qty]:not([disabled])')?.focus();
    });
  };

  const handlePickerKeyDown = (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      event.stopPropagation();
      setIsPickerOpen(true);
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((current) => Math.max(0, Math.min(filteredSources.length - 1, current + step)));
      return;
    }
    if (event.key === 'Enter' && isPickerOpen && filteredSources[activeIndex]) {
      event.preventDefault();
      event.stopPropagation();
      pickSource(filteredSources[activeIndex]);
    }
  };

  return (
    <FormPopup
      title={title}
      subtitle={subtitle}
      submitLabel={saving ? 'Saving...' : submitLabel}
      submitDisabled={saving}
      maxWidth="max-w-4xl"
      onSubmit={onSubmit}
      onClose={onClose}
      onKeyDown={(event) => handlePopupFormKeyDown(event, onClose)}
    >
      {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}

      <FormSection number={1} title="Original Bill" tone="blue">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="return-source-input">{sourceLabel} <span className="text-rose-500">*</span></label>
            <div
              ref={pickerRef}
              className="relative"
              onBlurCapture={(event) => {
                if (pickerRef.current?.contains(event.relatedTarget)) return;
                setIsPickerOpen(false);
                setQuery(null);
              }}
            >
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="return-source-input"
                ref={pickerInputRef}
                className="input pl-9 pr-10 font-semibold"
                type="text"
                value={query ?? (selectedSource ? getSourceLabel(selectedSource) : '')}
                onChange={(event) => { setQuery(event.target.value); setIsPickerOpen(true); setActiveIndex(0); }}
                onFocus={(event) => { setIsPickerOpen(true); setActiveIndex(0); event.target.select(); }}
                onClick={() => setIsPickerOpen(true)}
                onKeyDown={handlePickerKeyDown}
                placeholder={sourcePlaceholder}
                autoComplete="off"
                autoFocus
              />
              <ChevronDown className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-transform ${isPickerOpen ? 'rotate-180' : ''}`} />

              {isPickerOpen && dropdownStyle && (
                <OptionList
                  style={dropdownStyle}
                  options={filteredSources}
                  activeIndex={activeIndex}
                  emptyText="No matching bill found."
                  getKey={(source) => source._id}
                  getLabel={getSourceLabel}
                  getHint={getSourceHint}
                  isSelected={(source) => String(source._id) === String(sourceId)}
                  onHover={setActiveIndex}
                  onPick={pickSource}
                />
              )}
            </div>
          </div>

          <div>
            <label className="label" htmlFor="return-date-input">Return Date</label>
            <input
              id="return-date-input"
              className="input"
              type="date"
              value={voucherDate}
              onChange={(event) => onFieldChange('voucherDate', event.target.value)}
            />
          </div>
        </div>

        {selectedSource && summary.length > 0 && (
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-white/70 p-2 ring-1 ring-inset ring-blue-200 md:grid-cols-4">
            {summary.map(({ label, value }) => (
              <div key={label} className="min-w-0 px-1.5 py-0.5">
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
                <p className="truncate text-sm font-semibold text-slate-800" title={String(value)}>{value}</p>
              </div>
            ))}
          </div>
        )}
      </FormSection>

      <FormSection
        number={2}
        title="Items to Return"
        tone="emerald"
        action={selectedSource && hasReturnable && (
          <button
            type="button"
            tabIndex={-1}
            onClick={onReturnAll}
            className="inline-flex shrink-0 items-center gap-1 rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 transition hover:bg-emerald-100"
          >
            <RotateCcw size={13} /> Return all
          </button>
        )}
      >
        {!selectedSource ? (
          <p className="rounded-lg border border-dashed border-emerald-300 bg-white/70 px-4 py-8 text-center text-sm text-slate-500">
            Pick the {sourceLabel.toLowerCase()} above to load its items.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg bg-white ring-1 ring-slate-200">
            <table className="w-full min-w-[680px] table-fixed text-left">
              <colgroup>
                <col />
                <col className="w-[6.5rem]" />
                <col className="w-[6.5rem]" />
                <col className="w-[7.5rem]" />
                <col className="w-[8.5rem]" />
                <col className="w-[8.5rem]" />
              </colgroup>
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className={TH}>Product</th>
                  <th className={`${TH} text-right`}>{originalQtyLabel}</th>
                  <th className={`${TH} text-right`}>Can Return</th>
                  <th className={`${TH} text-right`}>Rate</th>
                  <th className={`${TH} text-right`}>Return Qty</th>
                  <th className={`${TH} text-right`}>Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => {
                  const qty = Number(returnQuantities[item.id] || 0);
                  const fullyReturned = item.remainingQty <= 0;
                  return (
                    <tr key={item.id} className={fullyReturned ? 'bg-slate-50/70 text-slate-400' : qty > 0 ? 'bg-emerald-50/60' : ''}>
                      <td className={TD}>
                        <p className={`truncate font-semibold ${fullyReturned ? 'text-slate-400' : 'text-slate-800'}`} title={item.productName}>{item.productName}</p>
                        {item.returnedQty > 0 && (
                          <p className="text-[11px] text-amber-600">{formatQty(item.returnedQty)} already returned</p>
                        )}
                      </td>
                      <td className={`${TD} text-right`}>
                        {formatQty(item.originalQty)}
                        {item.unit && <span className="ml-1 text-xs text-slate-400">{item.unit}</span>}
                      </td>
                      <td className={`${TD} text-right font-semibold`}>
                        {fullyReturned
                          ? <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-500">Done</span>
                          : formatQty(item.remainingQty)}
                      </td>
                      <td className={`${TD} text-right`}>{formatAmount(item.unitPrice)}</td>
                      <td className="px-2 py-1.5">
                        <input
                          data-return-qty
                          className="input text-right font-semibold"
                          type="number"
                          min="0"
                          max={item.remainingQty}
                          step="0.01"
                          value={returnQuantities[item.id] || ''}
                          onChange={(event) => onQuantityChange(item.id, event.target.value, item.remainingQty)}
                          disabled={fullyReturned}
                          placeholder={fullyReturned ? '-' : '0'}
                          aria-label={`Return quantity for ${item.productName}`}
                        />
                      </td>
                      <td className={`${TD} text-right font-semibold ${qty > 0 ? 'text-slate-900' : 'text-slate-400'}`}>{formatAmount(qty * item.unitPrice)}</td>
                    </tr>
                  );
                })}
                {!items.length && (
                  <tr><td colSpan={6} className="px-3 py-6 text-center text-sm text-slate-500">This bill has no items.</td></tr>
                )}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50">
                  <td className={`${TD} text-xs text-slate-500`} colSpan={4}>
                    {selectedCount > 0 ? `${selectedCount} item${selectedCount === 1 ? '' : 's'} selected for return` : 'Enter how much of each item came back'}
                  </td>
                  <td className={`${TD} text-right text-xs font-semibold uppercase tracking-wide text-slate-500`}>Return Total</td>
                  <td className={`${TD} text-right text-base font-bold text-emerald-700`}>{formatAmount(totalAmount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </FormSection>

      <FormSection number={3} title="Reason / Notes" tone="slate">
        <textarea
          className="input resize-none"
          rows={2}
          value={notes}
          onChange={(event) => onFieldChange('notes', event.target.value)}
          placeholder={notesPlaceholder}
        />
      </FormSection>
    </FormPopup>
  );
}
