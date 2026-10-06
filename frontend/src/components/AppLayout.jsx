import { useCallback, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu, ChevronLeft } from 'lucide-react';
import AppSidebar from './AppSidebar';
import BackButton from './BackButton';
import Logo from './Logo';

export default function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const location = useLocation();
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <AppSidebar mobileOpen={menuOpen} onClose={closeMenu} />

      {/* Mobile topbar */}
      <nav className="fixed inset-x-0 top-0 z-20 flex h-16 items-center border-b border-slate-200 bg-white/80 px-2 backdrop-blur-md lg:hidden">
        <div className="relative z-10 flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="rounded-lg p-2 text-slate-700 transition hover:bg-slate-100"
            aria-label="Open menu"
          >
            <Menu size={24} />
          </button>
          {location.pathname !== '/' && (
            <button
              type="button"
              onClick={handleBack}
              className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              aria-label="Go back"
            >
              <ChevronLeft size={24} />
            </button>
          )}
        </div>
        <Link to="/" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <Logo />
        </Link>
      </nav>

      {/* Page content. Pages bring their own background and padding. */}
      <div className="lg:ml-[260px]">
        <div className="pt-16 lg:pt-0">
          <BackButton />
          <Outlet />
        </div>
      </div>
    </div>
  );
}
