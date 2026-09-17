import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Globe, MessageCircle, Share2 } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="border-t border-white/10 bg-brand-navy pt-9 pb-6 text-white lg:pt-10 lg:pb-8">
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-5 lg:px-6 xl:max-w-6xl">
        <div className="mb-7 grid gap-7 sm:grid-cols-2 md:grid-cols-4 lg:gap-6">

          {/* Brand Info */}
          <div>
            <Link to="/" className="inline-block">
              <img
                src="/cruhserbook.webp"
                alt="Crusherbook Logo"
                className="h-8 w-auto object-contain brightness-0 invert"
              />
            </Link>
            <p className="mt-4 max-w-xs text-xs leading-relaxed text-white/50 sm:text-[0.8125rem]">
              ERP software for rock crusher plants — automate workflow, manage stock, and grow productivity from anywhere.
            </p>
            <div className="mt-3 flex gap-2">
              <a href="https://crusherbook.com" className="flex h-7 w-7 items-center justify-center rounded-md bg-white/10 text-white/60 transition-colors hover:bg-brand-orange hover:text-white [&_svg]:h-3.5 [&_svg]:w-3.5" aria-label="CrusherBook website"><Globe /></a>
              <a href="https://wa.me/916264682508" target="_blank" rel="noreferrer" className="flex h-7 w-7 items-center justify-center rounded-md bg-white/10 text-white/60 transition-colors hover:bg-green-600 hover:text-white [&_svg]:h-3.5 [&_svg]:w-3.5" aria-label="CrusherBook WhatsApp"><MessageCircle /></a>
              <a href="https://app.crusherbook.com" target="_blank" rel="noreferrer" className="flex h-7 w-7 items-center justify-center rounded-md bg-white/10 text-white/60 transition-colors hover:bg-brand-orange hover:text-white [&_svg]:h-3.5 [&_svg]:w-3.5" aria-label="CrusherBook login"><Share2 /></a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="mb-2.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-white/80">
              Quick Links
            </h4>
            <ul className="space-y-1.5 text-xs sm:text-[0.8125rem]">
              <li><Link to="/" className="text-white/50 hover:text-brand-orange transition-colors">Home</Link></li>
              <li><Link to="/about" className="text-white/50 hover:text-brand-orange transition-colors">About Us</Link></li>
              <li><Link to="/pricing" className="text-white/50 hover:text-brand-orange transition-colors">Pricing</Link></li>
              <li><Link to="/contact" className="text-white/50 hover:text-brand-orange transition-colors">Contact</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="mb-2.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-white/80">
              Support
            </h4>
            <ul className="space-y-1.5 text-xs sm:text-[0.8125rem]">
              <li><a href="https://wa.me/916264682508" target="_blank" rel="noreferrer" className="text-white/50 hover:text-brand-orange transition-colors">WhatsApp Support</a></li>
              <li><a href="tel:+916264682508" className="text-white/50 hover:text-brand-orange transition-colors">Call Support</a></li>
              <li><a href="https://app.crusherbook.com" target="_blank" rel="noreferrer" className="text-white/50 hover:text-brand-orange transition-colors">Login</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="mb-2.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-white/80">
              Contact
            </h4>
            <ul className="space-y-1.5 text-xs sm:text-[0.8125rem]">
              <li className="flex items-start gap-2">
                <MapPin size={14} className="mt-0.5 shrink-0 text-brand-orange" />
                <span className="text-white/50">Shankar Nagar, Raipur, Chhattisgarh</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone size={14} className="shrink-0 text-brand-orange" />
                <a href="tel:+916264682508" className="text-white/50 hover:text-brand-orange transition-colors">6264682508</a>
              </li>
              <li className="flex items-center gap-2">
                <Phone size={14} className="shrink-0 text-brand-orange opacity-0" />
                <a href="tel:+919202469725" className="text-white/50 hover:text-brand-orange transition-colors">9202469725</a>
              </li>
              <li className="flex items-center gap-2">
                <Mail size={14} className="shrink-0 text-brand-orange" />
                <a href="mailto:softwarebytesindia@gmail.com" className="break-all text-white/50 hover:text-brand-orange transition-colors">softwarebytesindia@gmail.com</a>
              </li>
            </ul>
          </div>

        </div>

        {/* Copyright */}
        <div className="flex flex-col gap-2 border-t border-white/10 pt-5 text-center text-[0.6875rem] text-white/40 sm:flex-row sm:justify-between sm:text-left sm:text-xs">
          <span>
            &copy; {new Date().getFullYear()} Crusherbook. Developed by{' '}
            <a href="https://softwarebytes.in/" target="_blank" rel="noopener noreferrer" className="font-medium text-brand-orange hover:underline">
              SoftwareBytes
            </a>
            .
          </span>
          <a href="https://crusherbook.com" className="font-medium text-brand-orange hover:underline">
            CrusherBook.com
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
