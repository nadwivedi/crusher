import { LogOut, Mountain, Users2 } from 'lucide-react'

/** Left rail of the admin panel: brand, the Users section, and the signed-in admin with logout. */
function Sidebar({ userCount = 0, adminEmail = '', onLogout }) {
  return (
    <aside className="flex w-full flex-col gap-6 border-b border-stone-200 bg-[#fbfaf7] p-4 lg:sticky lg:top-0 lg:h-screen lg:w-60 lg:border-b-0 lg:border-r lg:p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-stone-900">
          <Mountain className="h-5 w-5 text-white" strokeWidth={2.25} />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight text-stone-900">Crusher Admin</p>
          <p className="text-xs text-stone-500">Control panel</p>
        </div>
      </div>

      <nav className="flex flex-col gap-1" aria-label="Admin navigation">
        <span className="flex items-center gap-3 rounded-lg bg-stone-900 px-3 py-2 text-sm font-semibold text-white">
          <Users2 className="h-4 w-4" />
          Users
          <span className="ml-auto rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold">{userCount}</span>
        </span>
      </nav>

      <div className="mt-auto hidden rounded-xl border border-stone-200 bg-white p-3 lg:block">
        <p className="text-[11px] font-medium uppercase tracking-wide text-stone-400">Signed in as</p>
        <p className="mt-0.5 truncate text-sm font-semibold text-stone-800" title={adminEmail}>{adminEmail || 'Admin'}</p>
        <button
          type="button"
          onClick={onLogout}
          className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-stone-300 bg-white py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-100"
        >
          <LogOut className="h-3.5 w-3.5" />
          Logout
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
