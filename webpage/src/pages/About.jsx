import { motion } from 'framer-motion';
import { Target, Users, Shield, TrendingUp } from 'lucide-react';
import ContactActions from '../components/ContactActions';
import Seo from '../components/Seo';

const aboutSchema = {
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  name: 'About CrusherBook',
  url: 'https://crusherbook.com/about',
  description: 'About CrusherBook, stone crusher plant ERP software built for weighbridge workflow, ledger, stock, expenses, and reporting.',
};

const About = () => {
  return (
    <div className="w-full bg-white">
      <Seo
        title="About CrusherBook ERP"
        description="Learn about CrusherBook, a stone crusher plant ERP system built for weighbridge workflow, slip entry, party ledger, expenses, stock, and reports."
        path="/about"
        keywords={[
          'about crusher ERP',
          'stone crusher plant software company',
          'crusher management software India',
        ]}
        schema={aboutSchema}
      />

      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-navy pt-16 pb-12 sm:pt-20 sm:pb-16 lg:pt-24 lg:pb-20">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(250,86,8,0.18),transparent),radial-gradient(circle_at_90%_60%,rgba(17,76,171,0.25),transparent_40%)]"
          aria-hidden
        />
        <div className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-5 lg:px-6 xl:max-w-6xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-brand-accent backdrop-blur-sm"
          >
            <span className="flex h-2 w-2 rounded-full bg-brand-orange animate-pulse"></span>
            <span className="text-xs font-medium tracking-wide text-brand-accent/90 sm:text-sm">
              Trusted by 50+ Crusher Plants
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-4 text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl lg:text-[1.85rem]"
          >
            About CrusherBook
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mx-auto max-w-2xl text-xs leading-relaxed text-white/75 sm:text-sm lg:text-base"
          >
            Stone crusher management software built to replace outdated, manual data tracking with intelligent, automated, mobile-first workflows for the rock crushing industry.
          </motion.p>
        </div>
      </section>

      {/* Mission / Why Choose Split */}
      <section className="bg-gray-50 px-4 py-16 sm:py-20 lg:py-24">
        <div className="w-full max-w-5xl mx-auto px-0 sm:px-5 lg:px-6 xl:max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2">
              <div className="p-6 sm:p-10 lg:p-12 flex flex-col justify-center">
                <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold mb-4 w-fit">
                  <TrendingUp size={14} />
                  Our Mission
                </div>
                <h2 className="text-xl sm:text-2xl lg:text-[1.65rem] font-bold text-brand-navy mb-4 leading-tight">
                  Empowering Crusher Plants with Modern ERP
                </h2>
                <p className="text-sm sm:text-base text-brand-slate leading-relaxed mb-4">
                  CrusherBook was built from the ground up by industry experts who lived the frustration of lost weighbridge slips, tedious ledger reconciliation, and complex software.
                </p>
                <p className="text-sm sm:text-base text-brand-slate leading-relaxed">
                  Our mission is to arm crusher plant owners and managers with absolute clarity. Through cutting-edge features like our <strong className="text-brand-navy">One-Tap Slip Scanner</strong>, we eliminate human error and give you back hours of your day.
                </p>
              </div>
              <div className="bg-brand-navy p-6 sm:p-10 lg:p-12 text-white flex flex-col justify-center relative overflow-hidden">
                <div
                  className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_100%_0%,rgba(250,86,8,0.18),transparent)]"
                  aria-hidden
                />
                <div className="relative z-10">
                  <div className="inline-flex items-center gap-2 bg-white/10 text-brand-orange px-3 py-1 rounded-full text-xs font-semibold mb-4 w-fit">
                    <Shield size={14} />
                    Built for Scale
                  </div>
                  <h2 className="text-xl sm:text-2xl lg:text-[1.65rem] font-bold mb-5 leading-tight">
                    Why Choose CrusherBook?
                  </h2>
                  <ul className="space-y-4">
                    {[
                      { icon: Target, title: 'Precision Accuracy', desc: 'Every transaction verified and recorded seamlessly.' },
                      { icon: Shield, title: 'Secure Ledger', desc: 'Your financial data is tightly encrypted and backed up.' },
                      { icon: Users, title: 'Expert Support', desc: 'Dedicated team ready to help you 24/7.' },
                    ].map((item) => (
                      <li key={item.title} className="flex items-start gap-3">
                        <div className="bg-white/10 p-2.5 rounded-lg shrink-0">
                          <item.icon className="w-5 h-5 text-brand-orange" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm sm:text-base text-white">{item.title}</h4>
                          <p className="text-white/70 text-xs sm:text-sm leading-relaxed">{item.desc}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white px-4 py-16 sm:py-20 lg:py-24">
        <div className="w-full max-w-5xl mx-auto px-0 sm:px-5 lg:px-6 xl:max-w-6xl">
          <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
            {[
              { icon: TrendingUp, value: '10k+', label: 'Slips processed daily', color: 'text-brand-orange', bg: 'from-orange-100 to-orange-50' },
              { icon: Users, value: '50+', label: 'Active crusher plants', color: 'text-brand-navy', bg: 'from-slate-100 to-slate-50' },
              { icon: Shield, value: '99.9%', label: 'Uptime guarantee', color: 'text-green-600', bg: 'from-green-100 to-green-50' },
              { icon: Users, value: '50+', label: 'Satisfied clients', color: 'text-brand-orange', bg: 'from-orange-100 to-orange-50' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="group rounded-xl border border-gray-200 bg-white p-4 sm:p-6 text-center shadow-sm hover:shadow-md hover:border-brand-orange/30 transition-all"
              >
                <div className={`w-10 h-10 sm:w-12 sm:h-12 mx-auto bg-gradient-to-br ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform`}>
                  <stat.icon size={20} className="sm:hidden" />
                  <stat.icon size={24} className="hidden sm:block" />
                </div>
                <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-brand-navy mb-1">{stat.value}</h3>
                <p className="text-xs sm:text-sm text-brand-slate font-medium">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gray-50 px-4 py-16 sm:py-20 lg:py-24">
        <div className="w-full max-w-5xl mx-auto px-0 sm:px-5 lg:px-6 xl:max-w-6xl">
          <div className="relative overflow-hidden rounded-2xl bg-brand-navy px-6 py-12 sm:px-10 sm:py-16 text-center text-white shadow-lg">
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(250,86,8,0.18),transparent),radial-gradient(circle_at_90%_60%,rgba(17,76,171,0.25),transparent_40%)]"
              aria-hidden
            />
            <div className="relative z-10">
              <h2 className="text-xl sm:text-2xl lg:text-[1.65rem] font-bold mb-3 leading-tight">
                Built Around Crusher Plant Daily Work
              </h2>
              <p className="mx-auto max-w-2xl text-xs sm:text-sm lg:text-base leading-relaxed text-white/75">
                From weighbridge connection and sales slip entry to party wise ledger, expense management, employee access, stock movement, and profit and loss visibility — CrusherBook is designed for real plant operations.
              </p>
              <div className="mt-8">
                <ContactActions primaryLabel="WhatsApp Us" secondaryLabel="Call Team" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
