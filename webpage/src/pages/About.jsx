import { motion } from 'framer-motion';
import { Target, Shield, TrendingUp, Zap } from 'lucide-react';
import ContactActions from '../components/ContactActions';
import Seo from '../components/Seo';

const aboutSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'CrusherBook',
  url: 'https://crusherbook.com',
  logo: 'https://crusherbook.com/cruhserbook.webp',
  description: 'CrusherBook is a stone crusher plant ERP software built by SoftwareBytes India for weighbridge workflow, slip entry, party ledger, expenses, stock management, and reporting.',
  founder: {
    '@type': 'Person',
    name: 'SoftwareBytes India',
  },
  foundingDate: '2021',
  areaServed: ['IN'],
  knowsAbout: [
    'Crusher Plant Management',
    'ERP Software',
    'Weighbridge Integration',
    'Ledger Management',
    'Stock Management',
    'Expense Tracking',
  ],
};

const highlights = [
  {
    icon: Zap,
    title: 'Work Made Easier',
    description: 'Stop managing crushers with paper registers and scattered notebooks. CrusherBook gives you a single dashboard for slips, stock, ledger, and expenses — organized, searchable, and always backed up.',
    color: 'text-blue-600',
    bgColor: 'from-blue-100 to-blue-50',
  },
  {
    icon: TrendingUp,
    title: 'Profit & Loss Made Simple',
    description: 'Know your real profit every single day. Auto-calculated P&L reports show revenue, boulder cost, expenses, and net margin — no guessing, no manual math, no surprises at year-end.',
    color: 'text-green-600',
    bgColor: 'from-green-100 to-green-50',
  },
  {
    icon: Target,
    title: 'Built for Crushers, By Crushers',
    description: 'Designed with crusher plant owners and managers in mind. Every feature solves real problems — from weighbridge integration to party ledger tracking to employee payroll.',
    color: 'text-orange-600',
    bgColor: 'from-orange-100 to-orange-50',
  },
];

export default function About() {
  return (
    <div className="w-full bg-white">
      <Seo
        title="About CrusherBook - Stone Crusher ERP Software Company"
        description="Meet CrusherBook by SoftwareBytes India - stone crusher ERP software for weighbridge workflow, party ledger, expenses & profit reports since 2021. Learn our story!"
        path="/about"
        keywords={[
          'about crusher ERP software',
          'stone crusher plant software company',
          'crusher management software India',
          'ERP for stone crushers',
          'weighbridge software India',
          'crusher plant management system',
          'SoftwareBytes India',
        ]}
        schema={aboutSchema}
      />

      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-navy pt-10 pb-8 sm:pt-16 sm:pb-10 lg:pt-20 lg:pb-12">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(250,86,8,0.18),transparent),radial-gradient(circle_at_90%_60%,rgba(17,76,171,0.25),transparent_40%)]"
          aria-hidden
        />
        <div className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-5 lg:px-6 xl:max-w-6xl text-center">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-brand-accent backdrop-blur-sm"
          >
            <span className="flex h-1.5 w-1.5 rounded-full bg-brand-orange animate-pulse"></span>
            <span className="text-[0.65rem] font-medium tracking-wide text-brand-accent/90 sm:text-xs">
              About CrusherBook
            </span>
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mb-2 text-xl font-bold leading-tight tracking-tight text-white sm:text-2xl lg:text-[1.75rem]"
          >
            Simplifying Crusher Plant Operations Since 2021
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="mx-auto max-w-2xl text-xs leading-relaxed text-white/70 sm:text-sm"
          >
            Trusted for over 3 years by crusher plant owners across Chhattisgarh, Madhya Pradesh, Odisha, and Jharkhand — helping them manage sales, stock, ledger, and profits with clarity and speed.
          </motion.p>
        </div>
      </section>

      {/* What We Do */}
      <section className="bg-white px-4 py-10 sm:py-12 lg:py-16">
        <div className="w-full max-w-5xl mx-auto px-0 sm:px-5 lg:px-6 xl:max-w-6xl">
          <div className="max-w-3xl mx-auto text-center mb-8 sm:mb-10">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-[2.2rem] font-bold text-brand-navy mb-4 sm:mb-6 leading-tight">
              Software Built for Crusher Plants
            </h2>
            <p className="text-sm sm:text-base md:text-lg leading-relaxed text-brand-slate">
              CrusherBook replaces manual registers, messy spreadsheets, and scattered data with one unified system that handles slips, stock, ledger, expenses, and profit reporting.
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-4 mb-8 sm:mb-10">
            <p className="text-sm sm:text-base leading-relaxed text-brand-slate">
              Every day, a crusher plant owner juggles weighbridge slips, boulder movements, party payments, expense tracking, and month-end P&L calculations. CrusherBook digitizes that entire workflow so you spend less time on paperwork and more time growing your business.
            </p>
            <p className="text-sm sm:text-base leading-relaxed text-brand-slate">
              For <strong className="text-brand-navy">3+ years</strong>, CrusherBook has grown with feedback from working crusher plant owners — earning trust as the go-to ERP software for crusher operations that demand <strong className="text-brand-navy">reliability, speed, and features that match how crushing actually happens</strong>.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {[
              { label: '3+ Years', sublabel: 'Serving crusher plants' },
              { label: 'AI', sublabel: 'Slip entry automation' },
              { label: 'WA', sublabel: 'Automated alerts' },
              { label: 'P&L', sublabel: 'Automatic daily reports' },
            ].map((stat) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="rounded-xl border border-gray-200 bg-gradient-to-br from-orange-50 to-white px-3 py-4 text-center"
              >
                <strong className="block text-lg font-bold text-brand-navy sm:text-xl">{stat.label}</strong>
                <span className="mt-1 block text-[0.6rem] font-medium leading-snug text-brand-slate sm:text-xs">
                  {stat.sublabel}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="px-4 py-10 sm:py-12 lg:py-16 bg-gray-50">
        <div className="w-full max-w-5xl mx-auto px-0 sm:px-5 lg:px-6 xl:max-w-6xl">
          <div className="max-w-3xl mx-auto text-center mb-8 sm:mb-10">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-[2.2rem] font-bold text-brand-navy mb-4 sm:mb-6 leading-tight">
              Why Crusher Plants Choose CrusherBook
            </h2>
            <p className="text-sm sm:text-base text-brand-slate">
              Three core pillars that make the difference
            </p>
          </div>

          <div className="grid gap-5 sm:gap-6 md:grid-cols-3">
            {highlights.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`rounded-2xl border border-gray-200 bg-gradient-to-br ${item.bgColor} p-6 sm:p-7 shadow-sm hover:shadow-md transition-shadow`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm mb-4`}>
                  <item.icon className={`h-5 w-5 ${item.color}`} />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-brand-navy mb-2">{item.title}</h3>
                <p className="text-xs sm:text-sm leading-relaxed text-brand-slate">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SoftwareBytes Section */}
      <section className="px-4 py-10 sm:py-12 lg:py-16 bg-white">
        <div className="w-full max-w-5xl mx-auto px-0 sm:px-5 lg:px-6 xl:max-w-6xl">
          <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-10">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-2xl sm:text-3xl font-bold text-brand-navy mb-4 leading-tight">
                Made by SoftwareBytes, Raipur
              </h2>
              <p className="text-sm sm:text-base leading-relaxed text-brand-slate mb-4">
                CrusherBook is designed, developed, and supported by{' '}
                <a
                  href="https://softwarebytes.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-brand-orange hover:underline"
                >
                  SoftwareBytes
                </a>
                , a Raipur-based IT company in Chhattisgarh, India. The team builds practical business software for Indian enterprises — with deep focus on products that solve real local problems.
              </p>
              <p className="text-sm sm:text-base leading-relaxed text-brand-slate mb-4">
                SoftwareBytes works closely with crusher plant owners to understand daily workflows, weighbridge setups, ledger management, and compliance needs. That on-ground knowledge shapes every feature in CrusherBook — not generic software adapted from abroad.
              </p>
              <p className="text-sm sm:text-base leading-relaxed text-brand-slate">
                When you choose CrusherBook, you partner with a product team in Raipur that offers hands-on support, understands your language, and is committed to helping your crusher plant grow with technology.
              </p>

              <ul className="mt-6 space-y-2">
                {[
                  'Raipur, Chhattisgarh, India',
                  'CrusherBook.com — full crusher ERP product',
                  'Ongoing updates driven by crusher feedback',
                ].map((line) => (
                  <li key={line} className="flex items-center gap-2 text-xs sm:text-sm text-brand-slate">
                    <span className="shrink-0 text-brand-orange">
                      <Shield className="h-4 w-4" />
                    </span>
                    {line}
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="rounded-2xl border border-gray-200 bg-gradient-to-br from-brand-navy/10 to-white p-6 sm:p-8 text-center shadow-sm"
            >
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-orange to-brand-navy text-lg font-bold text-white shadow-md">
                SB
              </div>
              <h3 className="text-base sm:text-lg font-bold text-brand-navy mb-1">SoftwareBytes</h3>
              <p className="text-sm font-medium text-brand-orange mb-1">Raipur-based IT company</p>
              <p className="text-xs sm:text-sm text-brand-slate mb-5">
                Chhattisgarh, India · Business &amp; ERP software
              </p>
              <div className="rounded-lg border border-orange-100 bg-orange-50/80 px-4 py-3">
                <p className="text-xs sm:text-sm leading-relaxed text-brand-slate">
                  <strong className="text-brand-navy">CrusherBook</strong> is SoftwareBytes' flagship product for the crusher community — built in India, for India, and trusted by 50+ crusher plants.
                </p>
              </div>
              <div className="mt-5">
                <a
                  href="https://softwarebytes.in"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex text-xs sm:text-sm font-semibold text-brand-orange hover:text-brand-navy transition-colors"
                >
                  Visit SoftwareBytes →
                </a>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-12 sm:py-16 lg:py-20 bg-gray-50">
        <div className="w-full max-w-5xl mx-auto px-0 sm:px-5 lg:px-6 xl:max-w-6xl">
          <div className="relative overflow-hidden rounded-2xl bg-brand-navy px-6 py-12 sm:px-10 sm:py-16 text-center text-white shadow-lg">
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(250,86,8,0.18),transparent),radial-gradient(circle_at_90%_60%,rgba(17,76,171,0.25),transparent_40%)]"
              aria-hidden
            />
            <div className="relative z-10">
              <h2 className="text-xl sm:text-2xl lg:text-[1.65rem] font-bold mb-3 leading-tight">
                Ready to Simplify Your Crusher Operations?
              </h2>
              <p className="mx-auto max-w-2xl text-xs sm:text-sm lg:text-base leading-relaxed text-white/75 mb-6">
                Join 50+ crusher plant owners who trust CrusherBook. Start your 14-day free trial today — no credit card required.
              </p>
              <ContactActions primaryLabel="Start Free Trial" secondaryLabel="Talk to Sales" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
