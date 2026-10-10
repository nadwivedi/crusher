import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/** Opened from the admin panel's "Access" button: signs in as that user with the one-time link, then goes home. */
export default function AdminAccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { adminAccessLogin } = useAuth();
  const token = searchParams.get('token');
  const [linkError, setLinkError] = useState('');
  const error = token ? linkError : 'This access link is missing its key.';
  // A link works once, so React's double run in development must not spend it twice
  const startedRef = useRef(false);

  useEffect(() => {
    if (!token || startedRef.current) return;
    startedRef.current = true;

    adminAccessLogin(token).then((result) => {
      if (result.success) navigate('/', { replace: true });
      else setLinkError(result.message || 'This access link did not work.');
    });
  }, [adminAccessLogin, navigate, token]);

  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 p-6">
      {error ? (
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-rose-50 text-rose-600">
            <ShieldAlert size={22} />
          </span>
          <h1 className="mt-3 text-base font-bold text-slate-900">Could not open this account</h1>
          <p className="mt-1 text-sm text-slate-500">{error}</p>
          <Link to="/login" className="btn-secondary mt-4">Go to login</Link>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="h-7 w-7 animate-spin text-primary-600" />
          <p className="text-sm font-medium">Opening the account…</p>
        </div>
      )}
    </div>
  );
}
