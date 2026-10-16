import { useCallback, useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { AlertTriangle, CheckCircle2, GitCommit, Globe, LayoutDashboard, Loader2, Package, RefreshCw, Rocket, Server, Smartphone, XCircle } from 'lucide-react'

const POLL_MS = 2000

// What each button updates and how
const TARGET_CARDS = [
  { key: 'all', icon: Rocket, title: 'Everything', hint: 'Pull, build app + admin + website, restart backend' },
  { key: 'frontend', icon: Smartphone, title: 'App (frontend)', hint: 'Pull and build app.crusherbook.com' },
  { key: 'admin', icon: LayoutDashboard, title: 'Admin panel', hint: 'Pull and build this admin panel' },
  { key: 'webpage', icon: Globe, title: 'Website', hint: 'Pull and build crusherbook.com' },
  { key: 'backend', icon: Server, title: 'Backend', hint: 'Pull and pm2 restart the API' },
]

const STATUS = {
  running: { label: 'Running', icon: Loader2, spin: true, badge: 'bg-blue-50 text-blue-700 ring-blue-200' },
  success: { label: 'Success', icon: CheckCircle2, badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  failed: { label: 'Failed', icon: XCircle, badge: 'bg-rose-50 text-rose-700 ring-rose-200' },
  stopped: { label: 'Stopped', icon: AlertTriangle, badge: 'bg-amber-50 text-amber-700 ring-amber-200' },
}

const formatDateTime = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

// "1m 12s"
const formatDuration = (from, to) => {
  if (!from) return ''
  const seconds = Math.max(0, Math.round(((to ? new Date(to) : new Date()) - new Date(from)) / 1000))
  return seconds >= 60 ? `${Math.floor(seconds / 60)}m ${seconds % 60}s` : `${seconds}s`
}

const StatusBadge = ({ status }) => {
  const s = STATUS[status] || STATUS.stopped
  const StatusIcon = s.icon
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${s.badge}`}>
      <StatusIcon className={`h-3 w-3 ${s.spin ? 'animate-spin' : ''}`} />
      {s.label}
    </span>
  )
}

/**
 * Deploy: pull the latest code on the server and update the app, admin panel, website or backend
 * without signing in to the server. Builds run on the server; the log streams in here.
 */
function DeployView({ endpoint, onSessionEnd }) {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [confirm, setConfirm] = useState(null)
  const [isStarting, setIsStarting] = useState(false)
  // Kept polling after a start until the deploy is over, also while the backend restarts and can't answer
  const [watching, setWatching] = useState(false)
  const [unreachable, setUnreachable] = useState(false)
  const logRef = useRef(null)
  const watchedId = useRef(null)

  const load = useCallback(async () => {
    try {
      const response = await axios.get(endpoint, { params: watchedId.current ? { id: watchedId.current } : {}, withCredentials: true })
      const next = response.data?.data || null
      setData(next)
      setUnreachable(false)
      return next
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        onSessionEnd()
        return null
      }
      // No answer: the backend is restarting
      setUnreachable(true)
      return undefined
    } finally {
      setIsLoading(false)
    }
  }, [endpoint, onSessionEnd])

  useEffect(() => {
    load().then((next) => {
      if (next?.state?.status === 'running') {
        watchedId.current = next.state.id
        setWatching(true)
      }
    })
  }, [load])

  useEffect(() => {
    if (!watching) return undefined
    const timer = setInterval(async () => {
      const next = await load()
      const state = next?.state
      if (state && state.id === watchedId.current && state.status !== 'running') {
        setWatching(false)
        if (state.status === 'success') toast.success('Deploy finished')
        else toast.error('Deploy failed — see the log')
      }
    }, POLL_MS)
    return () => clearInterval(timer)
  }, [watching, load])

  // Follow the end of the log while it grows
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [data?.log])

  const startDeploy = async () => {
    if (!confirm) return
    try {
      setIsStarting(true)
      const response = await axios.post(endpoint, confirm, { withCredentials: true })
      watchedId.current = response.data?.data?.id || null
      setConfirm(null)
      setWatching(true)
      await load()
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || 'Could not start the deploy')
    } finally {
      setIsStarting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-stone-500">
        <Loader2 className="h-6 w-6 animate-spin text-stone-700" />
        <p className="text-sm">Loading deploy status…</p>
      </div>
    )
  }

  const state = data?.state
  const running = state?.status === 'running'
  const targets = data?.config?.targets || {}
  const busy = running || watching || isStarting
  const updatedAdmin = state?.status === 'success' && ['all', 'admin'].includes(state.target)

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-stone-900">Deploy</h1>
          <p className="mt-0.5 text-sm text-stone-500">Pull the latest code from GitHub and update the live server</p>
        </div>
        <button type="button" onClick={load} className="flex items-center justify-center gap-1.5 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-100">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {data?.commit && (
        <div className="flex items-start gap-3 rounded-xl border border-stone-200 bg-[#fbfaf7] px-4 py-3 text-sm">
          <GitCommit className="mt-0.5 h-4 w-4 shrink-0 text-stone-500" />
          <p className="min-w-0 text-stone-600">
            <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">Live code · </span>
            <span className="font-mono text-xs font-semibold text-stone-800">{data.commit.hash}</span>{' '}
            <span className="font-medium text-stone-800">{data.commit.subject}</span>
            <span className="text-stone-400"> · {data.commit.author} · {formatDateTime(data.commit.date)} · {data.config?.branch} · pm2 “{data.config?.pm2Name}”</span>
          </p>
        </div>
      )}

      {data && !data.supported && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          Deploy works only on the live server (Linux with deploy/deploy.sh). The buttons are turned off here.
        </div>
      )}

      <section className="grid gap-2 sm:grid-cols-2 md:gap-3 xl:grid-cols-5">
        {TARGET_CARDS.map((card) => {
          const CardIcon = card.icon
          const disabled = busy || !data?.supported
          return (
            <div key={card.key} className={`flex flex-col rounded-2xl border bg-[#fbfaf7] p-4 shadow-xs ${card.key === 'all' ? 'border-stone-400' : 'border-stone-200'}`}>
              <div className="flex items-center gap-2.5">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${card.key === 'all' ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-700'}`}>
                  <CardIcon className="h-4 w-4" />
                </span>
                <p className="text-sm font-bold text-stone-900">{card.title}</p>
              </div>
              <p className="mt-2 flex-1 text-xs text-stone-500">{card.hint}</p>
              <div className="mt-3 grid gap-1.5">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => setConfirm({ target: card.key, install: false })}
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-stone-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-stone-800 disabled:opacity-40"
                >
                  <Rocket className="h-3.5 w-3.5" />
                  Deploy
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => setConfirm({ target: card.key, install: true })}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-700 transition hover:bg-stone-100 disabled:opacity-40"
                  title="Use when package.json changed (new or updated npm packages)"
                >
                  <Package className="h-3.5 w-3.5" />
                  Deploy + npm install
                </button>
              </div>
            </div>
          )
        })}
      </section>

      <section className="overflow-hidden rounded-2xl border border-stone-200 bg-[#fbfaf7] shadow-xs">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-stone-200 px-4 py-3 md:px-5">
          <h2 className="text-sm font-bold text-stone-800">{running || watching ? 'Current Deploy' : 'Last Deploy'}</h2>
          {state && (
            <>
              <StatusBadge status={state.status} />
              <span className="text-xs text-stone-500">
                {targets[state.target] || state.target}{state.install ? ' + npm install' : ''} · {formatDateTime(state.startedAt)} · {formatDuration(state.startedAt, state.finishedAt)}
              </span>
            </>
          )}
          {unreachable && watching && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
              <Loader2 className="h-3 w-3 animate-spin" />
              Backend restarting…
            </span>
          )}
          {updatedAdmin && !watching && (
            <button type="button" onClick={() => window.location.reload()} className="ml-auto rounded-lg border border-stone-300 bg-white px-3 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-100">
              Reload to see the new admin panel
            </button>
          )}
        </div>
        {state ? (
          <pre ref={logRef} className="max-h-[28rem] min-h-40 overflow-auto whitespace-pre-wrap break-words bg-stone-950 px-4 py-3 font-mono text-[12px] leading-relaxed text-stone-200 md:px-5">
            {data?.log || (running ? 'Starting…' : 'No log for this deploy.')}
          </pre>
        ) : (
          <p className="px-5 py-10 text-center text-sm text-stone-500">No deploys yet. Push your code to GitHub, then press Deploy.</p>
        )}
      </section>

      {data?.history?.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-stone-200 bg-[#fbfaf7] shadow-xs">
          <h2 className="border-b border-stone-200 px-4 py-3 text-sm font-bold text-stone-800 md:px-5">Recent Deploys</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead>
                <tr className="bg-stone-100/70 text-xs font-semibold uppercase tracking-wide text-stone-500">
                  <th className="px-4 py-2.5 md:px-5">When</th>
                  <th className="px-3 py-2.5">What</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Time</th>
                  <th className="px-4 py-2.5 md:px-5">Commit</th>
                </tr>
              </thead>
              <tbody>
                {data.history.map((row) => (
                  <tr key={row.id} className="border-t border-stone-200 text-stone-700">
                    <td className="whitespace-nowrap px-4 py-2 md:px-5">{formatDateTime(row.startedAt)}</td>
                    <td className="whitespace-nowrap px-3 py-2 font-medium text-stone-800">{targets[row.target] || row.target}{row.install ? <span className="ml-1.5 text-[11px] font-semibold text-violet-700">+ npm install</span> : null}</td>
                    <td className="px-3 py-2"><StatusBadge status={row.status} /></td>
                    <td className="whitespace-nowrap px-3 py-2 tabular-nums">{formatDuration(row.startedAt, row.finishedAt)}</td>
                    <td className="max-w-xs truncate px-4 py-2 font-mono text-xs md:px-5" title={row.commit}>{row.commit || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {confirm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => !isStarting && setConfirm(null)}>
          <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-[#fbfaf7] p-6 text-center shadow-2xl" onClick={(event) => event.stopPropagation()} role="alertdialog" aria-modal="true">
            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-stone-900">
              <Rocket className="h-5 w-5 text-white" />
            </span>
            <h3 className="mt-3 text-base font-bold text-stone-900">Deploy {(targets[confirm.target] || confirm.target).toLowerCase()}?</h3>
            <p className="mt-1 text-sm text-stone-500">
              The server pulls the latest code from <span className="font-semibold text-stone-800">{data?.config?.branch}</span>
              {confirm.install ? ', runs npm install' : ''}
              {confirm.target !== 'backend' ? ' and builds' : ''}
              {['all', 'backend'].includes(confirm.target) ? ', then restarts the backend (a few seconds offline)' : ''}.
            </p>
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={() => setConfirm(null)} disabled={isStarting} className="flex flex-1 items-center justify-center rounded-lg border border-stone-300 bg-white py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-100 disabled:opacity-60">
                Cancel
              </button>
              <button type="button" onClick={startDeploy} disabled={isStarting} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-stone-900 py-2 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:opacity-60">
                {isStarting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isStarting ? 'Starting…' : 'Deploy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default DeployView
