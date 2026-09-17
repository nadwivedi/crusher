import { Link } from 'react-router-dom';
import { Menu, X, MessageCircle } from 'lucide-react';
import { useState } from 'react';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          
          {/* Logo Section */}
          <div className="flex-shrink-0 flex items-center">
            <Link to="/" className="flex items-center gap-2">
              <img 
                src="/cruhserbook.webp" 
                alt="Crusherbook Logo" 
                className="h-12 w-auto object-contain"
              />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-brand-slate hover:text-brand-orange transition-colors font-medium">Home</Link>
            <Link to="/about" className="text-brand-slate hover:text-brand-orange transition-colors font-medium">About</Link>
            <Link to="/pricing" className="text-brand-slate hover:text-brand-orange transition-colors font-medium">Pricing</Link>
            <Link to="/contact" className="text-brand-slate hover:text-brand-orange transition-colors font-medium">Contact</Link>
            
            <a
              href="https://wa.me/916264682508?text=Hello%20Crusherbook%2C%20I%20want%20to%20know%20more%20about%20crusher%20software."
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 bg-green-600 text-white px-5 py-2 rounded-full font-semibold shadow-md hover:bg-green-700 hover:shadow-green-600/30 hover:-translate-y-0.5 transition-all text-sm"
            >
              <MessageCircle size={17} />
              <span>WhatsApp</span>
            </a>

            <a
              href="https://app.crusherbook.com"
              target="_blank"
              rel="noreferrer"
              className="bg-brand-orange text-white px-6 py-2 rounded-full font-semibold shadow-lg hover:shadow-orange-500/30 hover:-translate-y-0.5 transition-all text-sm"
            >
              Login
            </a>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-brand-slate hover:text-brand-orange focus:outline-none"
            >
              {isOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-gray-100">
          <div className="px-4 pt-2 pb-6 space-y-2">
            <Link 
              to="/" 
              onClick={() => setIsOpen(false)}
              className="block px-3 py-3 rounded-md text-base font-medium text-brand-slate hover:bg-gray-50 hover:text-brand-orange"
            >
              Home
            </Link>
            <Link 
              to="/about" 
              onClick={() => setIsOpen(false)}
              className="block px-3 py-3 rounded-md text-base font-medium text-brand-slate hover:bg-gray-50 hover:text-brand-orange"
            >
              About
            </Link>
            <Link 
              to="/pricing" 
              onClick={() => setIsOpen(false)}
              className="block px-3 py-3 rounded-md text-base font-medium text-brand-slate hover:bg-gray-50 hover:text-brand-orange"
            >
              Pricing
            </Link>
            <Link 
              to="/contact" 
              onClick={() => setIsOpen(false)}
              className="block px-3 py-3 rounded-md text-base font-medium text-brand-slate hover:bg-gray-50 hover:text-brand-orange"
            >
              Contact
            </Link>
            <div className="pt-2 px-3 space-y-2">
              <a
                href="https://wa.me/916264682508?text=Hello%20Crusherbook%2C%20I%20want%20to%20know%20more%20about%20crusher%20software."
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-green-600 text-center text-white px-6 py-3 rounded-full font-semibold shadow-md hover:bg-green-700"
              >
                <MessageCircle size={18} />
                <span>WhatsApp (+91 6264682508)</span>
              </a>
              <a
                href="https://app.crusherbook.com"
                target="_blank"
                rel="noreferrer"
                className="block w-full bg-brand-orange text-center text-white px-6 py-3 rounded-full font-semibold shadow-md"
              >
                Login
              </a>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
