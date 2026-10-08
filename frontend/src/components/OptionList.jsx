import { Check } from 'lucide-react';

/**
 * Search list under a type-to-search box. The highlighted row follows the arrow keys; the picked one gets a tick.
 * style comes from useFloatingDropdownPosition. getHint adds a small second line; footer sits under the list (e.g. an "add new" button).
 */
export default function OptionList({ style, options, activeIndex, emptyText, getKey, getLabel, getHint, isSelected, onHover, onPick, footer }) {
  return (
    <div className="fixed z-[80] overflow-hidden rounded-lg bg-white shadow-xl ring-1 ring-slate-200" style={style} onClick={(event) => event.stopPropagation()}>
      <div className="overflow-y-auto py-1" style={{ maxHeight: style.maxHeight }}>
        {options.length === 0 ? (
          <p className="px-3 py-2.5 text-sm text-slate-500">{emptyText}</p>
        ) : options.map((option, index) => {
          const hint = getHint?.(option);
          return (
            <button
              key={getKey(option)}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => onHover(index)}
              onClick={() => onPick(option)}
              className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition ${index === activeIndex ? 'bg-primary-50 text-primary-900' : 'text-slate-700'}`}
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">{getLabel(option)}</span>
                {hint && <span className="block truncate text-[11px] text-slate-400">{hint}</span>}
              </span>
              {isSelected(option) && <Check size={16} className="shrink-0 text-primary-600" />}
            </button>
          );
        })}
      </div>
      {footer}
    </div>
  );
}
