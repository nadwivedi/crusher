import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// CrusherBook support on WhatsApp; the admin connects the account's WhatsApp
const ADMIN_WHATSAPP = '916264682508';

export default function WhatsApp() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const message = `Hi, please connect WhatsApp for my CrusherBook account${user?.name ? ` (${user.name}${user.mobile ? `, ${user.mobile}` : ''})` : ''}.`;
  const contactUrl = `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(message)}`;

  return (
    <div className="page-fade-in max-w-5xl space-y-4 px-3 pb-8 pt-4 md:space-y-5 lg:px-6 lg:pt-5">
      <div className="flex items-center gap-3">
        <button type="button" className="icon-btn" onClick={() => navigate('/settings')} aria-label="Back to settings" title="Back to settings">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="page-title">WhatsApp</h1>
          <p className="page-subtitle">Connect WhatsApp to your CrusherBook account</p>
        </div>
      </div>

      <section className="card flex flex-col items-center gap-4 py-10 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <MessageCircle size={28} />
        </span>
        <a
          href={contactUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
        >
          <MessageCircle size={18} /> Contact Admin to Connect WhatsApp
        </a>
      </section>
    </div>
  );
}
