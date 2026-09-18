import { LayoutDashboard, Users2, Mountain } from 'lucide-react'

const navigation = [
  { label: 'Dashboard', icon: LayoutDashboard, active: false },
  { label: 'Users', icon: Users2, active: true },
]

function Sidebar({ userCount = 0 }) {
  return (
    <aside className="flex w-full flex-col gap-8 border-b border-white/10 bg-slate-950/60 p-6 backdrop-blur-xl lg:h-screen lg:w-64 lg:border-b-0 lg:border-r lg:p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 shadow-lg shadow-blue-500/20">
          <Mountain className="h-5 w-5 text-white" strokeWidth={2.5} />
        </div>
        <div>
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-sky-400">Crusher</p>
          <h2 className="text-lg font-bold leading-tight text-white">Admin Panel</h2>
        </div>
      </div>

      <nav className="flex flex-col gap-1.5" aria-label="Admin navigation">
        {navigation.map((item) => (
          <button
            key={item.label}
            type="button"
            className={`group flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
              item.active
                ? 'bg-gradient-to-r from-sky-500/20 to-blue-500/10 text-white ring-1 ring-inset ring-sky-400/30'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
          >
            <item.icon className={`h-4.5 w-4.5 ${item.active ? 'text-sky-400' : 'text-slate-500 group-hover:text-slate-300'}`} strokeWidth={2} />
            <span>{item.label}</span>
            {item.label === 'Users' ? (
              <span className="ml-auto rounded-full bg-sky-500/15 px-2 py-0.5 text-[0.7rem] font-semibold text-sky-300">
                {userCount}
              </span>
            ) : null}
          </button>
        ))}
      </nav>

      <div className="mt-auto hidden rounded-2xl bg-white/5 p-4 text-xs leading-relaxed text-slate-400 lg:block">
        Users are managed from this workspace.
      </div>
    </aside>
  )
}

export default Sidebar
