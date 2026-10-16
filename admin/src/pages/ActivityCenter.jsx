import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { Activity, Ban, CheckCircle2, Eye, Loader2, LogIn, Pencil, Plus, RefreshCw, Search, Trash2 } from 'lucide-react'

// Dates are pinned to India time so the admin's device timezone can't shift a day.
const IST = 'Asia/Kolkata'

const todayIST = () => new Date().toLocaleDateString('en-CA', { timeZone: IST })

// 'YYYY-MM-DD' moved by a number of days
const shiftDate = (iso, days) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

const dayKeyIST = (value) => new Date(value).toLocaleDateString('en-CA', { timeZone: IST })

const formatDay = (key) => {
  const today = todayIST()
  if (key === today) return 'Today'
  if (key === shiftDate(today, -1)) return 'Yesterday'
  const [y, m, d] = key.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-IN', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })
}

const formatShortDate = (key) => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-IN', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' })
}

const formatTime = (value) =>
  new Date(value).toLocaleTimeString('en-IN', { timeZone: IST, hour: '2-digit', minute: '2-digit', hour12: true })

const formatValue = (value) => {
  if (value === null || value === undefined || value === '') return '—'
  if (value === true) return 'Yes'
  if (value === false) return 'No'
  return String(value)
}

const RANGES = [
  { key: 'today', label: 'Today', days: [0, 0] },
  { key: 'yesterday', label: 'Yesterday', days: [-1, -1] },
  { key: 'last7', label: 'Last 7 Days', days: [-6, 0] },
  { key: 'last30', label: 'Last 30 Days', days: [-29, 0] },
  { key: 'custom', label: 'Custom' },
]

const rangeFor = (key) => {
  const preset = RANGES.find((r) => r.key === key)
  const today = todayIST()
  return { from: shiftDate(today, preset.days[0]), to: shiftDate(today, preset.days[1]) }
}

const ENTITIES = { user: 'Users', admin: 'Admin Logins' }
const ENTITY_SINGULAR = { user: 'User', admin: 'Admin' }

// How each kind of action is shown in the list
const ACTIONS = {
  create: { label: 'Added', icon: Plus, tile: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  update: { label: 'Edited', icon: Pencil, tile: 'bg-blue-50 text-blue-700 ring-blue-200' },
  delete: { label: 'Deleted', icon: Trash2, tile: 'bg-rose-50 text-rose-700 ring-rose-200' },
  activate: { label: 'Activated', icon: CheckCircle2, tile: 'bg-teal-50 text-teal-700 ring-teal-200' },
  deactivate: { label: 'Deactivated', icon: Ban, tile: 'bg-amber-50 text-amber-700 ring-amber-200' },
  access: { label: 'Opened as user', icon: Eye, tile: 'bg-violet-50 text-violet-700 ring-violet-200' },
  login: { label: 'Login', icon: LogIn, tile: 'bg-stone-100 text-stone-600 ring-stone-200' },
}

const Tile = ({ label, value, accent = 'text-stone-900' }) => (
  <div className="rounded-xl border border-stone-200 bg-[#fbfaf7] p-2.5 shadow-xs sm:p-4">
    <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500 sm:text-xs">{label}</p>
    <p className={`mt-0.5 text-lg font-bold tabular-nums sm:mt-1 sm:text-2xl ${accent}`}>{Number(value || 0).toLocaleString('en-IN')}</p>
  </div>
)

const ChangesTable = ({ changes }) => (
  <div className="mt-2 overflow-x-auto rounded-lg border border-stone-200 bg-white">
    <table className="w-full text-xs">
      <thead className="bg-stone-100/70 text-stone-500">
        <tr>
          <th className="px-3 py-1.5 text-left font-semibold">Field</th>
          <th className="px-3 py-1.5 text-left font-semibold">Before</th>
          <th className="px-3 py-1.5 text-left font-semibold">After</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-stone-100">
        {changes.map((c, i) => (
          <tr key={`${c.field}-${i}`}>
            <td className="whitespace-nowrap px-3 py-1.5 font-medium text-stone-700">{c.field}</td>
            <td className="break-all px-3 py-1.5 text-rose-600">{formatValue(c.from)}</td>
            <td className="break-all px-3 py-1.5 text-emerald-700">{formatValue(c.to)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

/**
 * Activity Center: every change made in the admin panel. Opened only with Ctrl+Alt+Space;
 * nothing on screen links here, and moving to another section closes it again.
 */
function ActivityCenter({ endpoint, onLock, onSessionEnd }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rangeKey, setRangeKey] = useState('last7')
  const [range, setRange] = useState(() => rangeFor('last7'))
  const [custom, setCustom] = useState(range)
  const [entityFilter, setEntityFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(() => new Set())
  // Bumped by the Refresh button to fetch the same period again
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const response = await axios.get(endpoint, { params: range, withCredentials: true })
        if (!cancelled) setData(response.data?.data || null)
      } catch (requestError) {
        if (requestError.response?.status === 401) {
          // Admin session ended: back to the sign-in screen
          onSessionEnd()
          return
        }
        if (!cancelled) {
          setError(requestError.response?.status === 404
            ? 'The server is running an older backend. Restart it with the latest code and reload this page.'
            : requestError.response?.data?.message || 'Failed to load activity')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [endpoint, range, reloadKey, onSessionEnd])

  const selectRange = (key) => {
    setRangeKey(key)
    if (key === 'custom') setCustom(range)
    else setRange(rangeFor(key))
  }

  const customValid = custom.from && custom.to && custom.from <= custom.to

  const items = useMemo(() => data?.items || [], [data])
  const q = search.trim().toLowerCase()

  const searched = useMemo(
    () => items.filter((i) => (!actionFilter || i.action === actionFilter) && (!q
      || `${i.summary} ${i.entityName || ''} ${i.adminEmail || ''} ${(i.changes || []).map((c) => `${c.field} ${c.from ?? ''} ${c.to ?? ''}`).join(' ')}`
        .toLowerCase()
        .includes(q))),
    [items, actionFilter, q]
  )
  const visible = searched.filter((i) => !entityFilter || i.entity === entityFilter)
  const entityCounts = searched.reduce((acc, i) => ({ ...acc, [i.entity]: (acc[i.entity] || 0) + 1 }), {})

  // Group the list by day (India time), keeping the newest-first order
  const days = []
  visible.forEach((item) => {
    const key = dayKeyIST(item.createdAt)
    const last = days[days.length - 1]
    if (last?.key === key) last.items.push(item)
    else days.push({ key, items: [item] })
  })

  const toggle = (id) => setExpanded((prev) => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })

  // Pull the latest entries; a preset like "Today" is re-read so it follows the current date
  const handleRefresh = () => {
    if (rangeKey !== 'custom') setRange(rangeFor(rangeKey))
    setReloadKey((k) => k + 1)
  }

  const totals = data?.totals || {}
  const periodText = range.from === range.to ? formatShortDate(range.from) : `${formatShortDate(range.from)} – ${formatShortDate(range.to)}`

  return (
    <>
      {/* Header + period */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-stone-900">Activity Center</h1>
          <p className="mt-0.5 text-sm text-stone-500">Every change made in the admin panel · {periodText}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex min-w-0 overflow-x-auto rounded-lg border border-stone-300 bg-white p-0.5">
            {RANGES.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => selectRange(r.key)}
                className={`shrink-0 rounded-md px-2 py-1.5 text-xs font-semibold transition sm:px-3 ${rangeKey === r.key ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'}`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-stone-300 bg-white p-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-100 disabled:opacity-60 sm:px-3"
            title="Refresh"
            aria-label="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button type="button" onClick={onLock} className="shrink-0 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-100">
            Lock
          </button>
        </div>
      </div>

      {rangeKey === 'custom' && (
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-stone-200 bg-[#fbfaf7] p-4 shadow-xs">
          <label>
            <span className="mb-1 block text-xs font-semibold text-stone-500">From</span>
            <input type="date" className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm" value={custom.from} max={custom.to || undefined} onChange={(e) => setCustom({ ...custom, from: e.target.value })} />
          </label>
          <label>
            <span className="mb-1 block text-xs font-semibold text-stone-500">To</span>
            <input type="date" className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm" value={custom.to} min={custom.from || undefined} onChange={(e) => setCustom({ ...custom, to: e.target.value })} />
          </label>
          <button
            type="button"
            onClick={() => customValid && setRange({ ...custom })}
            disabled={!customValid}
            className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-50"
          >
            Apply
          </button>
          {!customValid && <p className="pb-2 text-xs font-medium text-rose-600">"From" date must be on or before "To" date</p>}
        </div>
      )}

      {/* Period totals */}
      <section className="grid grid-cols-3 gap-2 md:gap-3 lg:grid-cols-5">
        <Tile label="All Activity" value={totals.total} />
        <Tile label="Added" value={totals.create} accent="text-emerald-700" />
        <Tile label="Edited" value={totals.update} accent="text-blue-700" />
        <Tile label="Deleted" value={totals.delete} accent="text-rose-600" />
        <Tile label="Status" value={(totals.activate || 0) + (totals.deactivate || 0)} accent="text-amber-700" />
      </section>

      {/* Activity list */}
      <section className="overflow-hidden rounded-2xl border border-stone-200 bg-[#fbfaf7] shadow-xs">
        <div className="flex flex-col gap-2 border-b border-stone-200 p-2.5 md:flex-row md:items-center md:justify-between md:p-3 md:px-5">
          <div className="flex gap-2 overflow-x-auto">
            {['', ...Object.keys(ENTITIES)].map((entity) => {
              const active = entityFilter === entity
              const count = entity ? entityCounts[entity] || 0 : searched.length
              return (
                <button
                  key={entity || 'all'}
                  type="button"
                  onClick={() => setEntityFilter(entity)}
                  className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition ${active ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300 bg-white text-stone-600 hover:border-stone-400'}`}
                >
                  {entity ? ENTITIES[entity] : 'All'} <span className={active ? 'text-stone-300' : 'text-stone-400'}>{count}</span>
                </button>
              )
            })}
          </div>
          <div className="flex gap-2 md:shrink-0">
            <select className="w-36 shrink-0 rounded-lg border border-stone-300 bg-white px-2 py-2 text-sm" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} aria-label="Action">
              <option value="">All Actions</option>
              {Object.entries(ACTIONS).map(([key, a]) => <option key={key} value={key}>{a.label}</option>)}
            </select>
            <div className="relative min-w-0 flex-1 md:w-64 md:flex-none">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search activity…"
                className="w-full rounded-lg border border-stone-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-stone-500 focus:ring-4 focus:ring-stone-200"
              />
            </div>
          </div>
        </div>

        {error ? (
          <p className="px-5 py-10 text-center text-sm text-rose-600">{error}</p>
        ) : loading && !data ? (
          <div className="flex flex-col items-center gap-3 py-14 text-stone-500">
            <Loader2 className="h-6 w-6 animate-spin text-stone-700" />
            <p className="text-sm">Loading activity…</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Activity className="mx-auto h-8 w-8 text-stone-300" />
            <p className="mt-2 text-sm font-semibold text-stone-700">No activity found</p>
            <p className="text-xs text-stone-400">{q || entityFilter || actionFilter ? 'Try a different search or filter.' : 'Nothing was changed in this period.'}</p>
          </div>
        ) : (
          <div className={`transition-opacity ${loading ? 'pointer-events-none opacity-50' : ''}`}>
            {days.map((day) => (
              <div key={day.key}>
                <p className="border-b border-stone-200 bg-stone-100/70 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-stone-500 md:px-5">
                  {formatDay(day.key)}
                  <span className="ml-2 font-medium normal-case tracking-normal text-stone-400">{day.items.length} {day.items.length === 1 ? 'entry' : 'entries'}</span>
                </p>
                <ul className="divide-y divide-stone-200">
                  {day.items.map((item) => {
                    const a = ACTIONS[item.action] || ACTIONS.update
                    const ActionIcon = a.icon
                    const hasChanges = item.changes?.length > 0
                    const isOpen = expanded.has(item._id)
                    return (
                      <li key={item._id} className="px-2.5 py-2.5 md:px-5 md:py-3">
                        <button
                          type="button"
                          onClick={() => hasChanges && toggle(item._id)}
                          className={`flex w-full items-center gap-2.5 text-left md:gap-3 ${hasChanges ? 'cursor-pointer' : 'cursor-default'}`}
                        >
                          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset md:h-9 md:w-9 ${a.tile}`}>
                            <ActionIcon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="break-words text-[13px] font-semibold text-stone-800 md:text-sm">{item.summary}</p>
                            <p className="truncate text-xs text-stone-500">
                              <span className="font-medium text-stone-600">{a.label}</span>
                              {' · '}
                              {ENTITY_SINGULAR[item.entity] || item.entity}
                              {item.adminEmail ? ` · by ${item.adminEmail}` : ''}
                              {item.ip ? ` · ${item.ip}` : ''}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="whitespace-nowrap text-xs font-semibold text-stone-600">{formatTime(item.createdAt)}</p>
                            {hasChanges && (
                              <p className="whitespace-nowrap text-[11px] text-blue-700">
                                {isOpen ? 'Hide' : `${item.changes.length} ${item.changes.length === 1 ? 'change' : 'changes'}`}
                              </p>
                            )}
                          </div>
                        </button>
                        {isOpen && <ChangesTable changes={item.changes} />}
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
        <p className="border-t border-stone-200 px-4 py-2.5 text-xs text-stone-500 md:px-5">
          Showing {visible.length} of {items.length} entries
          {data?.truncated ? ` (latest ${items.length} of ${totals.total} — choose a shorter period to see older ones)` : ''}
        </p>
      </section>
    </>
  )
}

export default ActivityCenter
