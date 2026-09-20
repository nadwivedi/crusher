import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const HIDDEN_PATHS = ['/', '/login'];

export default function BackButton() {
  const location = useLocation();
  const navigate = useNavigate();

  if (HIDDEN_PATHS.includes(location.pathname)) return null;

  // React Router stores the history position in window.history.state.idx;
  // fall back to Home when the page was opened directly (nothing to go back to).
  const handleBack = () => {
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate('/');
  };

  return (
    <div className="bg-slate-100">
      <div className="mx-auto max-w-[95%] px-4 pt-4">
        <button
          type="button"
          onClick={handleBack}
          aria-label="Go back"
          className="group inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white py-1.5 pl-2.5 pr-4 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          Back
        </button>
      </div>
    </div>
  );
}
