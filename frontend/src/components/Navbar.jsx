import { Link } from 'react-router-dom';

const navItems = [
  { label: 'Manage Party', path: '/party' },
  { label: 'Manage Vehicle', path: '/vehicle' },
  { label: 'Stock Item', path: '/stock' },
  { label: 'Bank', path: '/banks' },
  { label: 'Reports', path: '/reports' },
  { label: 'Setting', path: '/settings' }
];

export default function Navbar() {
  return (
    <header className="w-full border-b border-white/10 bg-[linear-gradient(135deg,rgba(2,6,23,0.96),rgba(15,23,42,0.94),rgba(30,41,59,0.92))] shadow-[0_18px_40px_rgba(2,6,23,0.35)] backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 text-white shadow-lg shadow-cyan-500/25">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 19h16M6 16l3.5-5L14 8l4 3 2 5" />
            </svg>
          </div>
          <div>
            <p className="text-[16px] font-black tracking-[0.08em] text-white sm:text-[19px]">CRUSH MANAGER</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-100/80">Dashboard</p>
          </div>
        </div>

        <nav className="flex flex-wrap items-center gap-2 sm:gap-3">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="rounded-full border border-white/12 bg-white/6 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-100 transition hover:border-cyan-300/35 hover:bg-cyan-400/12 hover:text-white sm:px-4"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
