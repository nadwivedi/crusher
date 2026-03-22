import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

const homeQuickShortcuts = [
  { label: 'Boulder Entry', hint: '', combo: '', stateKey: 'homeQuickBoulder', imageSrc: '/buttons/boulder.png' },
  { label: 'New Sale', hint: '', combo: '', stateKey: 'homeQuickSale', imageSrc: '/buttons/add sales.png' },
  { label: 'New Purchase', hint: '', combo: '', stateKey: 'homeQuickPurchase', imageSrc: '/buttons/add purchase.png' },
  { label: 'New Payment', hint: 'Money Paid', combo: '', stateKey: 'homeQuickPayment', imageSrc: '/buttons/money paid.png', imageClassName: 'sm:scale-90' },
  { label: 'New Receipt', hint: 'Money Received', combo: '', stateKey: 'homeQuickReceipt', imageSrc: '/buttons/money received.png' },
  { label: 'Material Used', hint: '', combo: '', stateKey: 'homeQuickMaterialUsed', imageSrc: '/buttons/material used.png' },
  { label: 'New Expense', hint: '', combo: 'Alt + 6', stateKey: 'homeQuickExpense', accent: 'from-emerald-500 to-lime-500' },
  { label: 'Expense Group', hint: '', combo: '', path: '/expense-groups', accent: 'from-teal-500 to-cyan-500' },
  { label: 'Purchase Return', hint: '', combo: '', stateKey: 'homeQuickPurchaseReturn', accent: 'from-rose-500 to-pink-500' }
];

export default function Home() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleQuickShortcutOpen = (target) => {
    const shortcut = homeQuickShortcuts.find((item) => item.stateKey === target || item.path === target);
    if (shortcut?.path) {
      navigate(shortcut.path);
      return;
    }

    const currentState = location.state || {};
    navigate('/', {
      replace: true,
      state: {
        ...currentState,
        homeQuickBoulder: target === 'homeQuickBoulder',
        homeQuickSale: target === 'homeQuickSale',
        homeQuickPurchase: target === 'homeQuickPurchase',
        homeQuickPayment: target === 'homeQuickPayment',
        homeQuickReceipt: target === 'homeQuickReceipt',
        homeQuickMaterialUsed: target === 'homeQuickMaterialUsed',
        homeQuickPurchaseReturn: target === 'homeQuickPurchaseReturn',
        homeQuickExpense: target === 'homeQuickExpense'
      }
    });
  };

  useEffect(() => {
    const isTypingTarget = (target) => {
      const tagName = target?.tagName?.toLowerCase();
      return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target?.isContentEditable;
    };

    const isPopupOpen = () => Boolean(document.querySelector('.fixed.inset-0.z-50'));

    const handleKeyDown = (event) => {
      const key = event.key?.toLowerCase();
      const quickShortcutMap = { '6': 'homeQuickExpense' };

      if (event.defaultPrevented || event.metaKey) return;
      if (event.altKey && quickShortcutMap[key]) {
        if (isTypingTarget(event.target) || isPopupOpen()) return;
        event.preventDefault();
        handleQuickShortcutOpen(quickShortcutMap[key]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [location.state, navigate]);

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0f172a] to-[#020617]">
      <div className="flex flex-col">
        <Navbar />

        <div className="px-4 py-4 sm:px-6 sm:py-5">
          <div className="mx-auto flex min-h-[calc(100vh-7rem)] max-w-6xl items-center justify-center">
            <aside className="relative w-full max-w-[26rem] overflow-hidden rounded-[20px] border border-slate-200/15 bg-[linear-gradient(165deg,rgba(30,41,59,0.92),rgba(51,65,85,0.9),rgba(71,85,105,0.88))] shadow-[0_24px_60px_rgba(15,23,42,0.34),0_0_42px_rgba(14,165,233,0.08)] sm:max-w-[30rem] sm:rounded-[30px] lg:max-w-[34rem]">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.16),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.1),transparent_28%)]" />
              <div className="relative z-10 flex h-full flex-col">
                <div className="border-b border-white/10 px-3 py-3 sm:px-5 sm:py-5">
                  <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-cyan-200 sm:text-[10px] sm:tracking-[0.24em]">Quick Keys</p>
                </div>

                <div className="flex flex-1 flex-col gap-2 px-2 py-2 sm:gap-2.5 sm:px-3 sm:py-3">
                  {homeQuickShortcuts.map((shortcut) => (
                    <button
                      key={shortcut.stateKey || shortcut.path}
                      type="button"
                      onClick={() => handleQuickShortcutOpen(shortcut.stateKey || shortcut.path)}
                      className={
                        shortcut.imageSrc
                          ? 'cursor-pointer overflow-visible rounded-xl bg-transparent px-0 py-0.5 text-left shadow-none transition hover:-translate-y-0.5 hover:shadow-none'
                          : 'cursor-pointer rounded-xl border border-slate-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.94))] p-2 text-left shadow-[0_14px_30px_rgba(148,163,184,0.16),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(148,163,184,0.22),inset_0_1px_0_rgba(255,255,255,0.95)] sm:rounded-2xl sm:p-2.5'
                      }
                    >
                      {shortcut.imageSrc ? (
                        <div className="relative">
                          <img
                            src={shortcut.imageSrc}
                            alt={shortcut.hint || shortcut.label}
                            className={`h-auto w-full scale-100 object-contain mix-blend-multiply sm:scale-95 ${shortcut.imageClassName || ''}`}
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className={`h-7 w-1.5 rounded-full bg-gradient-to-b sm:h-8 ${shortcut.accent}`} />
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-semibold leading-tight text-slate-800 sm:text-[12px]">{shortcut.label}</p>
                            {shortcut.hint && (
                              <p className="mt-0.5 hidden text-[10px] font-medium text-slate-500 sm:block">{shortcut.hint}</p>
                            )}
                          </div>
                          {shortcut.combo && (
                            <span className="hidden rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[10px] font-bold tracking-[0.14em] text-sky-700 sm:inline-flex">
                              {shortcut.combo}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
