/**
 * Pill-in-a-track switcher used for tabs and quick filters.
 * options: [{ key, label, icon? }]
 */
export default function Segmented({ options, value, onChange, className = '' }) {
  return (
    <div className={`scrollbar-hide inline-flex max-w-full self-start overflow-x-auto rounded-lg bg-slate-100 p-1 ${className}`}>
      {options.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition ${
            value === key ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {Icon && <Icon size={15} />}
          {label}
        </button>
      ))}
    </div>
  );
}
