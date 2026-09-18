import { motion } from 'framer-motion';
import { Camera, MessageCircle, Scale, BarChart3, Users, FileText, DollarSign, Zap, Smartphone, Monitor, Cloud, Infinity, Receipt, Landmark } from 'lucide-react';
import ContactActions from '../components/ContactActions';
import Seo from '../components/Seo';

const featuresData = [
  {
    icon: Camera,
    title: 'AI Auto Entry (Slip Upload)',
    description: 'Snap a photo of your weighbridge or sales slip. Our AI reads the data instantly — vehicle number, weight, date, party — and fills the entry automatically. No manual typing, no errors.',
    color: 'text-blue-600',
    bgColor: 'from-blue-100 to-blue-50',
  },
  {
    icon: MessageCircle,
    title: 'Automated WhatsApp Integration',
    description: 'Send auto-generated party pending balance notifications, payment reminders, and transaction updates via WhatsApp. Customers stay informed, you save time on manual follow-ups.',
    color: 'text-green-600',
    bgColor: 'from-green-100 to-green-50',
  },
  {
    icon: Scale,
    title: 'Weightbridge Integration',
    description: 'Connect your weighbridge directly to CrusherBook. Weights flow automatically from the scale to your system in real-time. Perfect for large crushers managing high throughput.',
    color: 'text-orange-600',
    bgColor: 'from-orange-100 to-orange-50',
  },
  {
    icon: FileText,
    title: 'Daily Report (Daybook)',
    description: 'Automatic end-of-day summary showing all entries, total sales, boulder quantity moved, and cash collected. Print or email it to your accountant with one click.',
    color: 'text-purple-600',
    bgColor: 'from-purple-100 to-purple-50',
  },
  {
    icon: Users,
    title: 'Party Ledger Report',
    description: 'Track what each customer owes you. See all transactions, pending amounts, payment history, and credit limits in one clear ledger. Follow up with precision.',
    color: 'text-indigo-600',
    bgColor: 'from-indigo-100 to-indigo-50',
  },
  {
    icon: BarChart3,
    title: 'Sales Ledger Report',
    description: 'Daily, weekly, and monthly sales summaries. See which parties buy the most, track seasonal trends, and identify your top-performing boulder grades and sales channels.',
    color: 'text-cyan-600',
    bgColor: 'from-cyan-100 to-cyan-50',
  },
  {
    icon: DollarSign,
    title: 'Expense Tracking',
    description: 'Record all operational costs — fuel, labour, maintenance, repairs. Categorize by type and track trends. See exactly where your money goes every single day.',
    color: 'text-rose-600',
    bgColor: 'from-rose-100 to-rose-50',
  },
  {
    icon: Zap,
    title: 'Payroll Management',
    description: 'Manage employee work records, calculate wages based on daily output or fixed rates, and generate monthly payroll reports. Transparent, fast, and error-free.',
    color: 'text-amber-600',
    bgColor: 'from-amber-100 to-amber-50',
  },
  {
    icon: Receipt,
    title: 'GST Billing',
    description: 'Generate GST-compliant sales invoices and bills automatically with correct tax slabs. Track input and output GST, and export GST-ready reports for easy filing.',
    color: 'text-teal-600',
    bgColor: 'from-teal-100 to-teal-50',
  },
  {
    icon: Landmark,
    title: 'Royalty Management',
    description: 'Track mining royalty on every dispatch — quantity, rate, and amount payable to the government. Get royalty reports ready for compliance and audits, without manual calculation.',
    color: 'text-violet-600',
    bgColor: 'from-violet-100 to-violet-50',
  },
];

const platformFeatures = [
  {
    icon: Users,
    title: 'Dedicated Employee Panel',
    description: 'Role-based access for employees. They see only assigned data — sales entry, work logs, punch records — but not pricing or ledger details.',
  },
  {
    icon: Smartphone,
    title: 'Mobile Application',
    description: 'Manage from anywhere with sales entry, slip upload, daily reports, WhatsApp alerts, and full offline support.',
  },
  {
    icon: Monitor,
    title: 'Desktop Software',
    description: 'Full-featured office application with faster data entry, large reports, bulk uploads, and complete dashboard control.',
  },
  {
    icon: Cloud,
    title: 'Cloud Based Variant',
    description: 'Access CrusherBook from any device, anytime. Real-time sync, automatic backups, and secure cloud storage for all your crusher plant data.',
  },
  {
    icon: Infinity,
    title: 'Offline Variant + Lifetime Plan',
    description: 'Work without internet with our offline version. One-time lifetime payment — no recurring subscriptions, perfect for locations with connectivity challenges.',
  },
];

export default function Features() {
  return (
    <div className="w-full bg-white">
      <Seo
        title="CrusherBook Features - AI Entry, Weighbridge, GST & Royalty"
        description="Explore CrusherBook ERP features: AI auto slip entry, weighbridge workflow, GST billing, royalty management, party ledger, expense tracking & payroll for crushers!"
        path="/features"
        keywords={[
          'crusher software features',
          'AI slip photo entry',
          'weighbridge software integration',
          'GST billing software for crusher',
          'royalty management software',
          'party ledger report',
          'sales ledger software',
          'expense tracking software',
          'stone crusher ERP features',
          'automated WhatsApp alerts',
          'payroll management system',
          'stock control software',
        ]}
        schema={[
          {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'CrusherBook Features',
            url: 'https://crusherbook.com/features',
            description: 'CrusherBook ERP features for stone crusher plants including AI auto entry, weighbridge integration, reports, and more.',
            mainEntity: {
              '@type': 'SoftwareApplication',
              name: 'CrusherBook',
              applicationCategory: 'BusinessApplication',
              operatingSystem: 'Web',
              hasFeature: [
                {
                  '@type': 'Thing',
                  name: 'AI Auto Entry (Slip Upload)',
                  description: 'Snap a photo of your weighbridge or sales slip. Our AI reads the data instantly and fills the entry automatically.',
                },
                {
                  '@type': 'Thing',
                  name: 'Automated WhatsApp Integration',
                  description: 'Send auto-generated party pending balance notifications, payment reminders, and transaction updates via WhatsApp.',
                },
                {
                  '@type': 'Thing',
                  name: 'Weighbridge Integration',
                  description: 'Connect your weighbridge directly to CrusherBook. Weights flow automatically from the scale in real-time.',
                },
                {
                  '@type': 'Thing',
                  name: 'Daily Report (Daybook)',
                  description: 'Automatic end-of-day summary showing all entries, total sales, boulder quantity moved, and cash collected.',
                },
                {
                  '@type': 'Thing',
                  name: 'Party Ledger Report',
                  description: 'Track what each customer owes you with transaction history, pending amounts, payment history, and credit limits.',
                },
                {
                  '@type': 'Thing',
                  name: 'Sales Ledger Report',
                  description: 'Daily, weekly, and monthly sales summaries with trend analysis and top-performing boulder grades.',
                },
                {
                  '@type': 'Thing',
                  name: 'Expense Tracking',
                  description: 'Record all operational costs and track trends to see exactly where your money goes every day.',
                },
                {
                  '@type': 'Thing',
                  name: 'Payroll Management',
                  description: 'Manage employee work records, calculate wages, and generate monthly payroll reports.',
                },
                {
                  '@type': 'Thing',
                  name: 'GST Billing',
                  description: 'Generate GST-compliant sales invoices with correct tax slabs and export GST-ready reports for easy filing.',
                },
                {
                  '@type': 'Thing',
                  name: 'Royalty Management',
                  description: 'Track mining royalty on every dispatch and get royalty reports ready for compliance and audits.',
                },
              ],
            },
          },
        ]}
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
              Everything You Need
            </span>
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mb-2 text-xl font-bold leading-tight tracking-tight text-white sm:text-2xl lg:text-[1.75rem]"
          >
            Powerful Features Built for Crusher Plants
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="mx-auto max-w-md text-xs leading-relaxed text-white/70 sm:text-sm"
          >
            From AI-powered entry to GST billing, royalty management, and seamless weighbridge integration — everything you need to run your crusher plant efficiently.
          </motion.p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-4 py-12 sm:py-16 lg:py-20 bg-gray-50">
        <div className="w-full max-w-5xl mx-auto px-0 sm:px-5 lg:px-6 xl:max-w-6xl">
          <div className="grid gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-2">
            {featuresData.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className={`rounded-2xl border border-gray-200 bg-gradient-to-br ${feature.bgColor} p-6 sm:p-7 shadow-sm hover:shadow-md transition-shadow`}
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-lg bg-white shadow-sm mb-4`}>
                  <feature.icon className={`h-6 w-6 ${feature.color}`} />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-brand-navy mb-2">{feature.title}</h3>
                <p className="text-xs sm:text-sm leading-relaxed text-brand-slate">{feature.description}</p>
              </motion.div>
            ))}
          </div>

          {/* Platform Features Section */}
          <div className="mt-8 sm:mt-10 pt-8 sm:pt-10 border-t border-gray-200">
            <h3 className="text-lg sm:text-xl font-bold text-brand-navy mb-5 sm:mb-6">Available On Multiple Platforms</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {platformFeatures.map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 shrink-0 mt-0.5">
                      <feature.icon className="h-5 w-5 text-brand-navy" />
                    </div>
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-brand-navy mb-1">{feature.title}</h4>
                      <p className="text-xs sm:text-sm leading-relaxed text-brand-slate">{feature.description}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-12 sm:py-16 lg:py-20 bg-white">
        <div className="w-full max-w-5xl mx-auto px-0 sm:px-5 lg:px-6 xl:max-w-6xl">
          <div className="relative overflow-hidden rounded-2xl bg-brand-navy px-6 py-12 sm:px-10 sm:py-16 text-center text-white shadow-lg">
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(250,86,8,0.18),transparent),radial-gradient(circle_at_90%_60%,rgba(17,76,171,0.25),transparent_40%)]"
              aria-hidden
            />
            <div className="relative z-10">
              <h2 className="text-xl sm:text-2xl lg:text-[1.65rem] font-bold mb-3 leading-tight">
                Ready to Transform Your Crusher Plant?
              </h2>
              <p className="mx-auto max-w-2xl text-xs sm:text-sm lg:text-base leading-relaxed text-white/75 mb-6">
                See how CrusherBook's powerful features can save you hours of manual work every day and give you complete visibility into your operations.
              </p>
              <ContactActions primaryLabel="Start Free Trial" secondaryLabel="Book a Demo" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
