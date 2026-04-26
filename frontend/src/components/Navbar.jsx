import { Link, useNavigate } from 'react-router-dom';
import { 
  BarChart2, 
  Users, 
  BookOpen, 
  Package, 
  TrendingUp, 
  Receipt, 
  Database, 
  Layers,
  Settings,
  ClipboardList
} from 'lucide-react';

const LEDGER_BUTTONS = [
  { id: 'party-ledger', label: 'Party', icon: Users, color: 'emerald', path: '/reports/party-ledger' },
  { id: 'boulder-ledger', label: 'Boulder', icon: Package, color: 'amber', path: '/reports/boulder-ledger' },
  { id: 'sales-report', label: 'Sales', icon: TrendingUp, color: 'violet', path: '/reports/sales-report' },
  { id: 'expense-ledger', label: 'Expense', icon: Receipt, color: 'rose', path: '/reports/expense-report' },
  { id: 'material-used-ledger', label: 'Material', icon: Database, color: 'cyan' },
  { id: 'stock-ledger', label: 'Stock', icon: Layers, color: 'indigo', path: '/reports/stock-ledger' },
];

export default function Navbar({ onToggleMobileSidebar = null, activeView = 'daybook', setActiveView }) {
  const navigate = useNavigate();

  const getButtonStyles = (btn, isActive) => {
    const config = {
      emerald: {
        bg: 'from-emerald-500 to-teal-600',
        shadow: 'shadow-emerald-500/30',
        active: 'border-white/50 bg-emerald-600'
      },
      sky: {
        bg: 'from-sky-500 to-blue-600',
        shadow: 'shadow-sky-500/30',
        active: 'border-white/50 bg-sky-600'
      },
      amber: {
        bg: 'from-amber-500 to-orange-600',
        shadow: 'shadow-amber-500/30',
        active: 'border-white/50 bg-amber-600'
      },
      violet: {
        bg: 'from-violet-500 to-purple-600',
        shadow: 'shadow-violet-500/30',
        active: 'border-white/50 bg-violet-600'
      },
      rose: {
        bg: 'from-rose-500 to-pink-600',
        shadow: 'shadow-rose-500/30',
        active: 'border-white/50 bg-rose-600'
      },
      cyan: {
        bg: 'from-cyan-500 to-sky-600',
        shadow: 'shadow-cyan-500/30',
        active: 'border-white/50 bg-cyan-600'
      },
      indigo: {
        bg: 'from-indigo-500 to-blue-700',
        shadow: 'shadow-indigo-500/30',
        active: 'border-white/50 bg-indigo-600'
      }
    };

    const style = config[btn.color];
    return `flex items-center gap-2 rounded-xl bg-gradient-to-br ${style.bg} px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-white transition-all duration-200 shadow-md ${style.shadow} hover:-translate-y-0.5 hover:brightness-110 border cursor-pointer ${isActive ? style.active : 'border-transparent opacity-90 hover:opacity-100'}`;
  };

  const handleButtonClick = (btn) => {
    if (btn.path) {
      navigate(btn.path);
    } else {
      setActiveView?.(btn.id);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white shadow-sm">
      <div className="w-full px-4 py-3 sm:px-6">
        {/* Mobile View */}
        <div className="flex flex-col gap-3 lg:hidden">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => onToggleMobileSidebar?.()}
              className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm cursor-pointer"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            <div className="flex gap-2">
              <Link to="/masters" className="flex items-center justify-center p-2 rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 cursor-pointer">
                <ClipboardList size={18} />
              </Link>
              <Link to="/settings" className="flex items-center justify-center p-2 rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 cursor-pointer">
                <Settings size={18} />
              </Link>
            </div>
          </div>

          <div className="flex overflow-x-auto gap-2.5 pb-2 scrollbar-hide">
            {LEDGER_BUTTONS.map((btn) => (
              <button
                key={btn.id}
                onClick={() => handleButtonClick(btn)}
                className={getButtonStyles(btn, activeView === btn.id)}
              >
                <btn.icon size={14} strokeWidth={2.5} />
                <span className="whitespace-nowrap">{btn.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Desktop View */}
        <div className="hidden lg:flex lg:items-center lg:justify-between lg:gap-8">
          <div className="flex-1 min-w-0 flex items-center gap-3 overflow-x-auto py-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {LEDGER_BUTTONS.map((btn) => (
              <button
                key={btn.id}
                onClick={() => handleButtonClick(btn)}
                className={getButtonStyles(btn, activeView === btn.id)}
              >
                <btn.icon size={15} strokeWidth={2.5} className="shrink-0" />
                <span className="whitespace-nowrap">{btn.label}</span>
              </button>
            ))}
          </div>

          <nav className="flex items-center gap-3">
            {[
              { label: 'Masters', path: '/masters', icon: ClipboardList },
              { label: 'Reports', path: '/reports', icon: BarChart2 },
              { label: 'Settings', path: '/settings', icon: Settings },
            ].map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-700 transition-all duration-200 shadow-sm hover:border-slate-300 hover:bg-slate-50 hover:-translate-y-0.5 cursor-pointer"
              >
                <item.icon size={14} strokeWidth={2} className="text-slate-500" />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
