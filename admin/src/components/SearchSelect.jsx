import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search, X } from 'lucide-react'

/**
 * Dropdown with a search box, drawn by us instead of the browser's <select>.
 * options: [{ value, label, count? }]. With `allowCustom`, a typed name that is not in the list can be used too.
 * With `clearable`, a small × empties the value (used by filters: empty means "all").
 */
function SearchSelect({
  value,
  onChange,
  options,
  placeholder = 'Select',
  searchPlaceholder = 'Search…',
  icon: Icon,
  clearable = false,
  allowCustom = false,
  emptyText = 'Nothing found',
  className = '',
  ariaLabel,
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const rootRef = useRef(null)
  const searchRef = useRef(null)
  const listRef = useRef(null)

  const selected = options.find((option) => option.value === value)
  const q = query.trim().toLowerCase()
  const shown = useMemo(
    () => (q ? options.filter((option) => option.label.toLowerCase().includes(q)) : options),
    [options, q]
  )
  const canUseTyped = allowCustom && q && !options.some((option) => option.label.toLowerCase() === q)
  const rows = canUseTyped ? [...shown, { value: query.trim(), label: query.trim(), custom: true }] : shown

  const close = () => {
    setOpen(false)
    setQuery('')
  }

  const choose = (option) => {
    onChange(option.value)
    close()
  }

  // Open at the chosen row so it is in view
  const openList = () => {
    setOpen(true)
    setActive(Math.max(0, options.findIndex((option) => option.value === value)))
  }

  useEffect(() => {
    if (!open) return undefined
    searchRef.current?.focus()
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) close()
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active, open])

  const onSearchKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((i) => Math.min(rows.length - 1, i + 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((i) => Math.max(0, i - 1))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (rows[active]) choose(rows[active])
    } else if (event.key === 'Escape') {
      event.preventDefault()
      close()
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => (open ? close() : openList())}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={`flex h-[38px] w-full items-center gap-2 rounded-lg border bg-white px-3 text-left text-sm outline-none transition ${open ? 'border-stone-500 ring-4 ring-stone-200' : 'border-stone-300 hover:border-stone-400'}`}
      >
        {Icon && <Icon className="h-4 w-4 shrink-0 text-stone-400" />}
        <span className={`min-w-0 flex-1 truncate ${selected || value ? 'font-medium text-stone-900' : 'text-stone-400'}`}>
          {selected?.label || value || placeholder}
        </span>
        {clearable && value ? (
          <span
            role="button"
            tabIndex={-1}
            onClick={(event) => {
              event.stopPropagation()
              onChange('')
              close()
            }}
            className="-mr-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-stone-400 hover:bg-stone-100 hover:text-stone-700"
            aria-label="Clear"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        ) : (
          <ChevronDown className={`h-4 w-4 shrink-0 text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        )}
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-30 mt-1.5 min-w-60 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xl shadow-stone-900/10">
          <div className="relative border-b border-stone-100 p-2">
            <Search className="pointer-events-none absolute left-4.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setActive(0)
              }}
              onKeyDown={onSearchKeyDown}
              placeholder={searchPlaceholder}
              className="w-full rounded-lg bg-stone-100/80 py-2 pl-8 pr-3 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:bg-stone-100"
            />
          </div>
          <ul ref={listRef} role="listbox" className="max-h-64 overflow-y-auto p-1">
            {rows.length === 0 && <li className="px-3 py-6 text-center text-sm text-stone-400">{emptyText}</li>}
            {rows.map((option, index) => {
              const isSelected = option.value === value
              return (
                <li
                  key={`${option.custom ? 'custom-' : ''}${option.value || 'all'}`}
                  data-index={index}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActive(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(option)}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm ${index === active ? 'bg-stone-100' : ''} ${isSelected ? 'font-semibold text-stone-900' : 'text-stone-700'}`}
                >
                  <Check className={`h-4 w-4 shrink-0 ${isSelected ? 'text-stone-900' : 'invisible'}`} />
                  <span className="min-w-0 flex-1 truncate">
                    {option.custom ? <>Use “<span className="font-semibold">{option.label}</span>”</> : option.label}
                  </span>
                  {option.count !== undefined && (
                    <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-stone-500">{option.count}</span>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

export default SearchSelect
