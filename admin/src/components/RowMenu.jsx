import { useEffect, useRef, useState } from 'react'
import { MoreHorizontal } from 'lucide-react'

const MENU_WIDTH = 176

/**
 * "⋯" button with a small list of actions for one row.
 * The list is fixed to the window, so a scrolling table can't cut it off; it opens upwards near the bottom.
 * items: [{ label, icon, onClick, tone: 'danger' | 'success' | undefined, disabled }]
 */
function RowMenu({ items, label = 'More actions' }) {
  const [position, setPosition] = useState(null)
  const buttonRef = useRef(null)
  const menuRef = useRef(null)

  const close = () => setPosition(null)

  const toggle = () => {
    if (position) return close()
    const rect = buttonRef.current.getBoundingClientRect()
    const menuHeight = items.length * 36 + 8
    const openUp = rect.bottom + menuHeight + 8 > window.innerHeight
    setPosition({
      top: openUp ? rect.top - menuHeight - 4 : rect.bottom + 4,
      left: Math.max(8, rect.right - MENU_WIDTH),
    })
  }

  useEffect(() => {
    if (!position) return undefined
    const onPointerDown = (event) => {
      if (!menuRef.current?.contains(event.target) && !buttonRef.current?.contains(event.target)) close()
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [position])

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={Boolean(position)}
        className={`flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 transition hover:bg-stone-100 hover:text-stone-800 ${position ? 'bg-stone-100 text-stone-800' : ''}`}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {position && (
        <div
          ref={menuRef}
          role="menu"
          className="fixed z-50 rounded-xl border border-stone-200 bg-white p-1 shadow-lg"
          style={{ top: position.top, left: position.left, width: MENU_WIDTH }}
        >
          {items.map((item) => {
            const ItemIcon = item.icon
            const tone = item.tone === 'danger'
              ? 'text-rose-700 hover:bg-rose-50'
              : item.tone === 'success' ? 'text-emerald-700 hover:bg-emerald-50' : 'text-stone-700 hover:bg-stone-100'
            return (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  close()
                  item.onClick()
                }}
                className={`flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm font-medium transition disabled:opacity-50 ${tone}`}
              >
                {ItemIcon && <ItemIcon className="h-4 w-4" />}
                {item.label}
              </button>
            )
          })}
        </div>
      )}
    </>
  )
}

export default RowMenu
