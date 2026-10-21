import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ban, Loader2, LogOut, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Shown over the blurred app while the account is deactivated by the admin
export default function DeactivatedNotice() {
  const { logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);

  const signOut = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  // Once the admin turns the account back on, this takes the notice away
  const checkAgain = async () => {
    setChecking(true);
    await refreshUser();
    setChecking(false);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 p-4" role="alertdialog" aria-modal="true">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-2xl">
        <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-100">
          <Ban size={30} className="text-rose-600" />
        </span>
        <h2 className="mb-2 text-xl font-bold text-slate-900">Account Deactivated</h2>
        <p className="mb-6 text-sm text-slate-600">
          Your account has been deactivated. Please contact CrusherBook support to continue using the app.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={checkAgain}
            disabled={checking}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            {checking ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            Check again
          </button>
          <button
            type="button"
            onClick={signOut}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary-600 py-3 text-sm font-semibold text-white transition hover:bg-primary-700"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
