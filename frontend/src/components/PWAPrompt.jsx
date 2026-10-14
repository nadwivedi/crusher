import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Download, X } from 'lucide-react';
import usePwaInstall from '../hooks/usePwaInstall';

// "Install CrusherBook" card at the bottom of the screen; it hides itself after 10 seconds.
// The login page has its own install banner, so the card is not shown there.
export default function PWAPrompt() {
  const { installable, install } = usePwaInstall();
  const { pathname } = useLocation();
  const [dismissed, setDismissed] = useState(false);

  const visible = installable && !dismissed && pathname !== '/login';

  useEffect(() => {
    if (!visible) return undefined;
    const timer = setTimeout(() => setDismissed(true), 10000);
    return () => clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;

  const handleInstall = async () => {
    await install();
    setDismissed(true);
  };

  return (
    <div className="fixed bottom-6 left-1/2 z-[9999] w-[calc(100%-2rem)] max-w-md -translate-x-1/2">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900 p-5 shadow-2xl shadow-black/40">
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 bg-orange-500/10 blur-3xl" />
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="absolute right-3 top-3 rounded-full p-1.5 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
          aria-label="Close"
        >
          <X size={18} />
        </button>
        <div className="flex items-start gap-4">
          <img src="/icon-192.png" alt="" className="h-12 w-12 shrink-0 rounded-xl bg-white object-contain" />
          <div className="flex-1 pr-6">
            <h3 className="text-base font-bold text-white">Install CrusherBook</h3>
            <p className="mt-0.5 text-xs text-slate-400">Open it from your home screen like an app</p>
            <div className="mt-3 flex gap-3">
              <button
                type="button"
                onClick={handleInstall}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition-all hover:bg-orange-400 active:scale-95"
              >
                <Download size={16} /> Install App
              </button>
              <button
                type="button"
                onClick={() => setDismissed(true)}
                className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
