import { LayoutDashboard, LogOut, Mountain, Rocket, Users2 } from 'lucide-react'

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'users', label: 'Users', icon: Users2, showCount: true },
  { key: 'deploy', label: 'Deploy', icon: Rocket },
]

/** Left rail of the admin panel: brand, the sections, and the signed-in admin with logout. */
function Sidebar({ view, onNavigate, userCount = 0, adminEmail = '', onLogout }) {
  return (
    <aside className="flex w-full flex-col gap-4 border-b border-stone-200 bg-[#fbfaf7] p-4 lg:sticky lg:top-0 lg:h-screen lg:w-60 lg:gap-6 lg:border-b-0 lg:border-r lg:p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-stone-900">
          <Mountain className="h-5 w-5 text-white" strokeWidth={2.25} />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight text-stone-900">Crusher Admin</p>
          <p className="text-xs text-stone-500">Control panel</p>
        </div>
      </div>

      <nav className="flex gap-1 lg:flex-col" aria-label="Admin navigation">
        {NAV_ITEMS.map((item) => {
          const active = view === item.key
          const Icon = item.icon
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onNavigate(item.key)}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-1 items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition lg:flex-none ${active ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'}`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
              {item.showCount && (
                <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold ${active ? 'bg-white/15' : 'bg-stone-200/70 text-stone-600'}`}>{userCount}</span>
              )}
            </button>
          )
        })}
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
