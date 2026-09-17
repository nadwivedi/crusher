import { motion } from 'framer-motion';
import { CheckCircle2, ScanText, Scale, Users, ChartColumnBig } from 'lucide-react';
import ContactActions from '../components/ContactActions';
import Seo from '../components/Seo';

const plans = [
  {
    name: 'Basic',
    price: 'Rs 2,999',
    period: '/ year',
    badge: 'Starter',
    popular: false,
    description: 'For entry, records, and ledger.',
    features: [
      'Crusher entry',
      'Manage records',
      'Party wise ledger',
      'Sales & boulder entry',
      'Expense management',
      'Stock movement',
    ],
  },
  {
    name: 'Advanced',
    price: 'Rs 4,999',
    period: '/ year',
    badge: 'Most Popular',
    popular: true,
    description: 'For AI auto entry and weightbridge entry.',
    features: [
      'Everything in Basic',
      'AI auto entry (slip photo upload)',
      'Automated WhatsApp alerts',
      'Weightbridge entry',
      'Faster weight capture',
      'Dispatch flow',
    ],
  },
  {
    name: 'Enterprise',
    price: 'Rs 6,999',
    period: '/ year',
    badge: 'Best Value',
    popular: false,
    description: 'For multi-plant control and priority support.',
    features: [
      'Everything in Advanced',
      'Multi-plant management',
      'Advanced profit & analytics',
      'Custom user roles',
      'Priority support',
      'Data export & backup',
    ],
  },
];

const highlightCards = [
  { icon: Scale, title: 'Weightbridge Entry', description: 'Weightbridge-based entry.' },
  { icon: ScanText, title: 'AI Auto Entry', description: 'Snap a slip photo, AI fills the entry.' },
  { icon: Users, title: 'Party Wise Ledger', description: 'Party account tracking.' },
  { icon: ChartColumnBig, title: 'Stock & Profit Visibility', description: 'Stock and profit view.' },
];

const coreTags = [
  { label: 'Crusher Entry', color: 'bg-orange-50 text-orange-700' },
  { label: 'Sales Slip Entry', color: 'bg-blue-50 text-blue-700' },
  { label: 'Boulder Slip Entry', color: 'bg-slate-100 text-slate-700' },
  { label: 'Party Ledger', color: 'bg-green-50 text-green-700' },
  { label: 'Expense Management', color: 'bg-yellow-50 text-yellow-700' },
  { label: 'Stock Movement', color: 'bg-purple-50 text-purple-700' },
  { label: 'Profit & Loss', color: 'bg-pink-50 text-pink-700' },
  { label: 'Employee Add/View', color: 'bg-emerald-50 text-emerald-700' },
  { label: 'Weightbridge Support', color: 'bg-cyan-50 text-cyan-700' },
];

export default function Pricing() {
  return (
    <div className="w-full bg-white">
      <Seo
        title="Crusher ERP Pricing"
        description="CrusherBook pricing includes Basic at Rs 2,999/year, Advanced at Rs 4,999/year with AI auto entry, automated WhatsApp alerts, and weightbridge entry, and Enterprise at Rs 6,999/year for multi-plant control."
        path="/pricing"
        keywords={[
          'crusher software pricing',
          'stone crusher ERP pricing',
          'weighbridge software pricing',
          'crusherbook pricing',
        ]}
        schema={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'CrusherBook Pricing',
          url: 'https://crusherbook.com/pricing',
        }}
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
              Simple Annual Pricing
            </span>
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mb-2 text-xl font-bold leading-tight tracking-tight text-white sm:text-2xl lg:text-[1.75rem]"
          >
            Choose the Plan That Fits Your Plant
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="text-xs text-white/70 sm:text-sm"
          >
            Basic for records. Advanced for automation. Enterprise for full control.
          </motion.p>
        </div>
      </section>

      {/* Plans */}
      <section className="px-4 py-8 sm:py-10 lg:py-12 bg-gray-50">
        <div className="w-full max-w-5xl mx-auto px-0 sm:px-5 lg:px-6 xl:max-w-6xl">
          <div className="grid gap-4 sm:gap-5 lg:grid-cols-3">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className={`relative rounded-2xl border p-5 sm:p-6 shadow-sm ${
                  plan.popular
                    ? 'border-brand-orange/40 bg-gradient-to-br from-orange-50 via-white to-white'
                    : plan.badge === 'Best Value'
                      ? 'border-brand-navy/25 bg-gradient-to-br from-slate-50 via-white to-white'
                      : 'border-gray-200 bg-white'
                }`}
              >
                {(plan.popular || plan.badge === 'Best Value') && (
                  <span
                    className={`absolute -top-2.5 right-5 rounded-full px-2.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-white shadow-sm ${
                      plan.popular ? 'bg-brand-orange' : 'bg-brand-navy'
                    }`}
                  >
                    {plan.badge}
                  </span>
                )}

                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="text-base sm:text-lg font-bold text-brand-navy">{plan.name}</h2>
                  {!plan.popular && plan.badge !== 'Best Value' && (
                    <span className="text-[0.6rem] font-semibold uppercase tracking-wide text-brand-orange">
                      {plan.badge}
                    </span>
                  )}
                </div>

                <div className="mt-3 flex items-end gap-1.5">
                  <span className="text-2xl sm:text-3xl font-extrabold text-brand-navy">{plan.price}</span>
                  <span className="pb-0.5 text-xs font-medium text-brand-slate">{plan.period}</span>
                </div>
                <p className="mt-1.5 text-xs sm:text-sm text-brand-slate">{plan.description}</p>

                <div className="mt-4 grid grid-cols-1 gap-1.5 border-t border-gray-100 pt-4">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-600" />
                      <p className="text-xs leading-snug text-slate-700">{feature}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Help CTA */}
          <div className="mt-4 sm:mt-5 rounded-2xl bg-brand-navy p-5 sm:p-6 text-white shadow-md">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-bold">Need Help Choosing?</h2>
                <p className="mt-1 text-xs sm:text-sm text-white/75">
                  Basic for records, Advanced for AI auto entry, WhatsApp alerts & weightbridge, Enterprise for multi-plant control.
                </p>
              </div>
              <ContactActions align="left" compact primaryLabel="Get Pricing on WhatsApp" secondaryLabel="Call for Demo" />
            </div>
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="px-4 py-8 sm:py-10 lg:py-12 bg-white">
        <div className="w-full max-w-5xl mx-auto px-0 sm:px-5 lg:px-6 xl:max-w-6xl">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {highlightCards.map(({ icon: Icon, title, description }) => (
              <div key={title} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md hover:border-brand-orange/30 transition-all">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-orange/10 text-brand-orange">
                  <Icon className="h-4 w-4" />
                </div>
                <h3 className="mt-3 text-sm font-bold text-brand-navy leading-snug">{title}</h3>
                <p className="mt-1 text-[0.7rem] leading-relaxed text-brand-slate sm:text-xs">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Core controls tags */}
      <section className="px-4 py-8 sm:py-10 lg:py-12 bg-gray-50">
        <div className="w-full max-w-5xl mx-auto px-0 sm:px-5 lg:px-6 xl:max-w-6xl">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-8 text-center shadow-sm">
            <h2 className="text-base sm:text-lg lg:text-xl font-bold text-brand-navy">Core Business Controls</h2>
            <p className="mt-1.5 text-xs sm:text-sm text-brand-slate">
              Records, ledger, stock, and reporting in one place.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              {coreTags.map((tag) => (
                <span key={tag.label} className={`rounded-full px-3 py-1.5 text-[0.65rem] sm:text-xs font-semibold ${tag.color}`}>
                  {tag.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
