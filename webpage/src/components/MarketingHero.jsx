import { motion } from 'framer-motion';
import { ArrowRight, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import DashboardPreview from './DashboardPreview';

export default function MarketingHero() {
  return (
    <section className="relative overflow-hidden bg-brand-navy pt-16 pb-12 sm:pt-20 lg:pt-24 lg:pb-16">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(250,86,8,0.18),transparent),radial-gradient(circle_at_90%_60%,rgba(17,76,171,0.25),transparent_40%)]"
        aria-hidden
      />

      <div className="relative mx-auto w-full max-w-5xl px-4 sm:px-5 lg:px-6 xl:max-w-6xl">
        <div className="relative z-10 grid items-center gap-8 lg:grid-cols-2 lg:gap-10">
          {/* Left Content */}
          <div className="animate-in text-center lg:text-left">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-2 text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl lg:text-[1.75rem]"
            >
              CrusherBook
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mb-4 text-sm font-semibold leading-snug text-brand-orange sm:text-base lg:text-lg"
            >
              Stone Crusher Plant ERP Software
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mx-auto mb-5 max-w-sm text-xs leading-relaxed text-white/75 sm:max-w-md sm:text-sm lg:mx-0"
            >
              One dashboard for sales slips, boulder entry, weighbridge workflow, stock, ledger, expenses, and profit reports — built for crusher plants.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mb-5 flex flex-col gap-2 sm:flex-row sm:justify-center lg:justify-start"
            >
              <a
                href="https://wa.me/916264682508?text=Hello%20Crusherbook%2C%20I%20want%20a%20demo%20for%20crusher%20software."
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 rounded-full bg-green-600 px-5 py-2.5 text-center text-sm font-bold leading-tight text-white shadow-lg shadow-green-600/30 transition-all hover:-translate-y-1 hover:bg-green-700 sm:w-auto sm:px-6 sm:py-3 sm:text-base"
              >
                <MessageCircle className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
                <span>Start Free Trial</span>
              </a>
              <Link
                to="/pricing"
                className="group flex items-center justify-center gap-1 rounded-full bg-brand-orange px-4 py-2.5 text-center text-sm font-bold leading-tight text-white shadow-lg shadow-brand-orange/30 transition-all hover:-translate-y-1 hover:bg-[#e66c00] hover:shadow-brand-orange/50 sm:w-auto sm:gap-2 sm:px-6 sm:py-3 sm:text-base"
              >
                <span>Book Demo</span>
                <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1 sm:h-5 sm:w-5" />
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mx-auto grid max-w-sm gap-2 sm:max-w-none sm:grid-cols-1 lg:mx-0"
            >
              {[
                { label: 'Weighbridge ready workflow' },
                { label: 'Slip to entry in minutes' },
                { label: 'Rs 19,999 per year' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-2.5 rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 backdrop-blur-sm"
                >
                  <span className="text-left text-[0.6875rem] font-medium leading-snug text-white/90 sm:text-xs">
                    {item.label}
                  </span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right Dashboard Preview */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative hidden animate-in animate-delay-2 lg:block"
          >
            <DashboardPreview />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
