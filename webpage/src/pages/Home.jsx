import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronDown,
  CheckCircle2,
  XCircle,
  Factory,
  Building2,
  Mountain,
  UserCheck,
  Truck,
  Scale,
  Receipt,
  BookOpen,
  MessageCircle,
  ChartColumnBig,
  Fuel,
  Boxes,
  ArrowRight,
  ClipboardX,
  TrendingUp,
  Wrench,
  PlayCircle,
} from 'lucide-react';
import MarketingHero from '../components/MarketingHero';
import FeatureShowcase from '../components/FeatureShowcase';
import TestimonialCard from '../components/TestimonialCard';
import Seo from '../components/Seo';

const WHATSAPP_TRIAL_URL = 'https://wa.me/916264682508?text=Hello%20Crusherbook%2C%20I%20want%20to%20start%20the%20free%20trial.';
const WHATSAPP_CHAT_URL = 'https://wa.me/916264682508?text=Hello%20Crusherbook%2C%20I%20want%20a%20demo%20for%20crusher%20software.';
// The 3-minute product video. Until it is set, the button asks for the video on WhatsApp.
const DEMO_VIDEO_URL = '';
const WHATSAPP_VIDEO_URL = 'https://wa.me/916264682508?text=Hello%20Crusherbook%2C%20please%20send%20me%20the%203-minute%20video.';

// Real reviews only (name, plant and city). The section shows once this has entries.
const testimonials = [];

const stats = [
  { strong: '3+ years', rest: 'serving crusher plants' },
  { strong: 'Automatic', rest: 'WhatsApp alerts (Advanced)' },
  { strong: 'Automatic', rest: 'daily P&L reports' },
  { strong: 'AI', rest: 'slip entry (Advanced)' },
];

const audiences = [
  {
    icon: Factory,
    title: 'Single Crusher Owners',
    text: 'Replace the register with stone crusher software on your phone: sales slips, boulder entry, party dues and daily profit, without needing an accountant for every small thing.',
    to: '/stone-crusher-management-software',
  },
  {
    icon: Building2,
    title: 'Owners With More Than One Crusher',
    text: 'Manage every plant in one login, with stock, sales, expenses and profit for each crusher and for all of them together (Enterprise).',
    to: '/stone-crusher-plant-management-software',
  },
  {
    icon: Mountain,
    title: 'Quarry + Crusher Operations',
    text: 'Boulders from your own mine or outside suppliers, crushing, dispatch, hired trucks and diesel are tracked as one flow.',
    to: '/quarry-crusher-management-software',
  },
  {
    icon: UserCheck,
    title: 'Munshi, Accountant and CA',
    text: 'The munshi enters data, the accountant checks the Dr/Cr party ledger and cash and bank, and your CA gets clean P&L reports so the books match the weighbridge.',
    to: '/stone-crusher-accounting-software',
  },
];

const dayFlow = [
  { icon: Truck, title: 'Boulder Arrives', text: 'Record trips from the mine or supplier, per ton or per trip. Stock and the supplier ledger update at once.' },
  { icon: Scale, title: 'Weighbridge Slip (Kanta Parchi)', text: 'Enter gross, tare and net weight, or snap the photo and let AI fill it in (Advanced).' },
  { icon: Receipt, title: 'Sale and Bill', text: "Bill gitti, dust and aggregate per ton or per cubic feet (cft) at each party's rate, with GST invoices in a few taps. Stock goes down automatically." },
  { icon: BookOpen, title: 'Party Ledger', text: 'The sale, receipt or credit lands in the party khata. Pending udhari is always visible.' },
  { icon: MessageCircle, title: 'WhatsApp to the Party', text: 'Bills and balance reminders go to customers on WhatsApp, automatically on the Advanced plan.' },
  { icon: ChartColumnBig, title: 'Profit by Evening', text: 'Sales less boulder, diesel, hire, salary and expenses gives the real profit of the day.' },
];

// Feature groups; the linked words lead to each feature's own page
const L = ({ to, children }) => (
  <Link to={to} className="font-medium text-brand-orange hover:underline">{children}</Link>
);

const featureGroups = [
  {
    icon: Receipt,
    title: 'Billing and Accounts',
    body: (
      <>
        <L to="/crusher-billing-software">Crusher billing software</L> with per ton and cft billing, GST invoices, credit and debit
        notes, and a <L to="/stone-crusher-accounting-software">Dr/Cr party ledger</L> showing outstanding balances and payment
        history. <L to="/crusher-plant-payment-reminder-software">WhatsApp bills and reminders</L> come with the Advanced plan.
      </>
    ),
  },
  {
    icon: Scale,
    title: 'Weighbridge and Slips',
    body: (
      <>
        <L to="/crusher-weighbridge-software">Weighbridge software</L> for slip entry and vehicle records, with AI photo reading
        (Advanced) and direct weighbridge integration (Enterprise).
      </>
    ),
  },
  {
    icon: Boxes,
    title: 'Stock and Production',
    body: (
      <>
        <L to="/stone-crusher-inventory-management-software">Real-time stock</L> of{' '}
        <L to="/stone-crusher-boulder-production-tracking-software">boulder in</L>, gitti out, dust and sand, plus{' '}
        <L to="/crusher-plant-production-report-software">production reports</L> and{' '}
        <L to="/quarry-management-software">quarry tracking</L> from the mine to the dispatch gate.
      </>
    ),
  },
  {
    icon: Fuel,
    title: 'Plant Costs',
    body: (
      <>
        <L to="/crusher-plant-diesel-consumption-tracking-software">Diesel consumption</L>,{' '}
        <L to="/crusher-plant-vehicle-mileage-tracking-software">machine hours and meter readings</L>,{' '}
        <L to="/stone-crusher-fleet-management-software">own and hired trucks</L>,{' '}
        <L to="/crusher-plant-expense-tracking-software">daily expenses</L>,{' '}
        <L to="/crusher-plant-payroll-software">payroll and attendance</L>.
      </>
    ),
  },
  {
    icon: ChartColumnBig,
    title: 'Reports and Control',
    body: (
      <>
        Automatic daily P&amp;L and monthly reports, party-wise, material-wise and vehicle-wise sales, employee logins with
        controlled permissions, a <L to="/stone-crusher-management-app">mobile app</L>, and multi-plant support (Enterprise).
      </>
    ),
  },
];

const reasons = [
  {
    icon: ClipboardX,
    title: 'No More Paper Registers',
    text: 'Stop managing crushers with paper registers and scattered notebooks. One dashboard holds slips, stock, ledger and expenses, organised, searchable and always backed up.',
  },
  {
    icon: TrendingUp,
    title: 'Daily Profit and Loss, Automatically',
    text: 'Auto-calculated P&L reports show revenue, boulder cost, expenses and net margin every day. No guessing, no manual math, no surprises at year-end.',
  },
  {
    icon: Wrench,
    title: 'Built Around How Crushers Work',
    text: 'Every feature solves a real problem, from weighbridge slips to party ledger tracking to employee payroll.',
  },
];

const comparisonRows = [
  { label: 'Weighbridge slip to bill in one step', values: ['No', 'No', 'No', 'Yes'] },
  { label: 'Per ton and cft billing', values: ['Manual', 'Self-built formulas', 'Usually not available', 'Built in'] },
  { label: 'Boulder in, gitti out, live stock', values: ['Hard', 'Error-prone', 'Limited', 'Real time'] },
  { label: 'Party ledger updates by itself', values: ['No', 'No', 'Yes', 'Yes'] },
  { label: 'Automatic WhatsApp bills and reminders (Advanced)', values: ['No', 'No', 'No', 'Yes'] },
  { label: 'Diesel, hire and machine costs per plant', values: ['No', 'No', 'No', 'Yes'] },
  { label: 'Owner sees everything on the phone', values: ['No', 'No', 'Varies', 'Yes'] },
  { label: 'Works in English and Hindi', values: ['No', 'No', 'Varies', 'Yes'] },
];

const planSummary = [
  {
    name: 'Basic',
    price: 'Rs 9,999',
    forWho: 'For single crusher plants.',
    text: 'Crusher entry, sales and boulder slips, party ledger, expenses and stock, with 1 employee login.',
  },
  {
    name: 'Advanced',
    price: 'Rs 11,999',
    forWho: 'For growing plants.',
    text: 'Everything in Basic plus 3 employee logins, automatic WhatsApp alerts, AI slip photo entry and Excel export.',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 'Rs 13,999',
    forWho: 'For multiple plants and quarry operations.',
    text: 'Everything in Advanced plus 10 employee logins, multi-crusher management and weighbridge integration.',
  },
];

const faqItems = [
  {
    question: 'What is CrusherBook?',
    answer: 'Stone crusher management software for India that brings slips, billing, stock, ledgers, expenses and profit into one software, with WhatsApp bills and reminders (some features are only available with advanced plans).',
  },
  {
    question: 'Which is the best stone crusher management software in India?',
    answer: 'The best software is the one that matches how your plant works: weighbridge slips, per ton and cft billing, party ledger and daily profit. CrusherBook is built specifically for Indian crushers, so start a free trial and compare it with any other option.',
  },
  {
    question: 'How much does crusher management software cost?',
    answer: 'Prices vary by features and number of plants. CrusherBook plans run from Rs 9,999 to Rs 13,999 per year, with no hidden setup fee. The pricing section above shows what each plan includes.',
  },
  {
    question: 'Does it support weighbridge (dharam kanta) integration?',
    answer: 'Yes. On the Enterprise plan, weights come straight from your weighbridge into the slip. On the Advanced plan, you can photograph a slip and let AI read it.',
  },
  {
    question: 'Can I bill per ton and per cubic feet (cft)?',
    answer: 'Yes. Create bills per ton or per cft for each party and material at their own rate, with GST. This removes manual calculation and rate mistakes.',
  },
  {
    question: 'Can I manage more than one crusher plant?',
    answer: "Yes. The Enterprise plan manages several plants from one login and compares sales, stock and expenses plant by plant. Each plant's data stays separate.",
  },
  {
    question: 'Does CrusherBook send bills and payment reminders on WhatsApp?',
    answer: 'Yes. Bills and payment reminders go to parties on WhatsApp straight from the software, automatically on the Advanced plan, which helps you recover outstanding payments faster.',
  },
  {
    question: 'Is the software available in Hindi?',
    answer: 'Yes. CrusherBook works in Hindi and English, so your munshi, accountant and staff can use the language they are comfortable with.',
  },
  {
    question: 'Does it work on mobile?',
    answer: 'Yes. The mobile app lets you enter slips, check ledgers and view reports from your phone, and the software also works on a computer.',
  },
  {
    question: 'Is my crusher data safe?',
    answer: 'Yes, your crusher data is safe. CrusherBook is secure, cloud-based software that protects your operational data using several layers of security.',
  },
  {
    question: 'Can I move data from registers, Excel or Tally?',
    answer: 'Yes. Our team helps you start with opening balances for parties and stock, and can import your data from Excel and Tally.',
  },
  {
    question: 'Is there a free trial?',
    answer: 'Yes. Start a 14-day free trial. Our team sets up your plant and you test it on your own slips.',
  },
];

const softwareAppSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'CrusherBook',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web, Android, Windows',
  url: 'https://crusherbook.com',
  image: 'https://crusherbook.com/cruhserbook.webp',
  inLanguage: ['en-IN', 'hi-IN'],
  description:
    'Stone crusher management software for India: kanta parchi, boulder entry, gitti sales per ton or cft, stock, party khata, diesel, expenses and daily profit, in English and Hindi.',
  offers: [
    { '@type': 'Offer', priceCurrency: 'INR', price: '9999', name: 'Basic' },
    { '@type': 'Offer', priceCurrency: 'INR', price: '11999', name: 'Advanced' },
    { '@type': 'Offer', priceCurrency: 'INR', price: '13999', name: 'Enterprise' },
  ],
};

const buildFaqSchema = (items) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: items.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.answer,
    },
  })),
});

const sectionHeading = 'text-2xl sm:text-3xl md:text-4xl lg:text-[2.2rem] font-bold text-brand-navy mb-4 sm:mb-6 leading-tight';
const sectionLead = 'text-sm sm:text-base md:text-lg leading-relaxed text-brand-slate';
const container = 'w-full max-w-5xl mx-auto px-0 sm:px-5 lg:px-6 xl:max-w-6xl';
const primaryButton = 'inline-flex items-center justify-center gap-2 rounded-full bg-green-600 px-5 py-3.5 text-sm sm:text-base font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-green-700';
const secondaryButton = 'inline-flex items-center justify-center gap-2 rounded-full border border-brand-orange bg-white px-5 py-3.5 text-sm sm:text-base font-semibold text-brand-orange transition hover:-translate-y-0.5 hover:bg-orange-50';

// "Yes" / "No" get a mark beside the word; other answers ("Manual", "Real time") are shown as written
const ComparisonCell = ({ value, highlight }) => {
  if (value === 'Yes' || value === 'No') {
    const yes = value === 'Yes';
    return (
      <span className={`inline-flex items-center gap-1.5 font-medium ${yes ? 'text-green-700' : 'text-gray-400'}`}>
        {yes ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : <XCircle className="h-4 w-4" aria-hidden />}
        {value}
      </span>
    );
  }
  return <span className={highlight ? 'font-semibold text-brand-navy' : 'text-brand-slate'}>{value}</span>;
};

const Home = () => {
  const [expandedFAQ, setExpandedFAQ] = useState(0);

  return (
    <div className="w-full">
      <Seo
        title="Stone Crusher Management Software India"
        description="Stone crusher management software for India: weighbridge slips, per ton/cft billing, stock, party ledger & WhatsApp. From Rs 9,999/yr. Free demo."
        path="/"
        keywords={[
          'stone crusher management software',
          'best stone crusher management software in India',
          'stone crusher plant ERP software',
          'crusher plant management system',
          'crusher billing software',
          'crusher weighbridge software',
          'crusher plant software',
          'stone crusher software price',
          'crusher hisab app',
        ]}
        schema={[softwareAppSchema, buildFaqSchema(faqItems)]}
      />
      <MarketingHero />

      {/* What is CrusherBook */}
      <section className="bg-white px-4 py-10 sm:py-12 lg:py-16">
        <div className={container}>
          <div className="max-w-3xl mx-auto">
            <h2 className={`${sectionHeading} text-center`}>What Is CrusherBook?</h2>
            <p className={sectionLead}>
              CrusherBook is stone crusher management software built for Indian crusher plants and quarries. This crusher plant
              management system replaces the slip book, the munshi register and the Excel sheet with one software that handles
              slips, stock, ledger, expenses and profit reporting. Think of it as stone crusher ERP software without the heavy
              setup: billing, accounts, stock, diesel and payroll in one software.
            </p>
            <p className={`${sectionLead} mt-4`}>
              Every truck that crosses the weighbridge, every boulder trip, every litre of diesel and every rupee a party owes you
              is recorded the moment it happens. The owner sees stock, dues and profit from the phone, anytime. It suits a single
              plant or several, and your munshi, accountant and CA can each get their own login with limited access, on plans with
              multiple logins (see <Link to="/pricing" className="font-medium text-brand-orange hover:underline">Pricing</Link>).
            </p>
            <p className={`${sectionLead} mt-4`}>
              For 3+ years, CrusherBook has grown with feedback from working plant owners, so every feature matches how crushing
              actually happens.
            </p>
          </div>
          <ul className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {stats.map(({ strong, rest }) => (
              <li key={`${strong} ${rest}`} className="rounded-2xl border border-gray-200 bg-gradient-to-br from-orange-50 via-white to-white p-4 text-center shadow-sm">
                <strong className="block text-lg sm:text-xl font-extrabold text-brand-navy">{strong}</strong>
                <span className="mt-1 block text-xs sm:text-sm text-brand-slate">{rest}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <FeatureShowcase />

      {/* Who it's for */}
      <section className="bg-gray-50 px-4 py-10 sm:py-12 lg:py-16">
        <div className={container}>
          <div className="max-w-3xl mx-auto text-center mb-8 sm:mb-10">
            <h2 className={sectionHeading}>Crusher Plant Software for Every Kind of Plant</h2>
            <p className={sectionLead}>
              From a single jaw crusher to a group of plants with their own quarry, CrusherBook fits the way your plant already works.
            </p>
          </div>
          <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
            {audiences.map(({ icon: Icon, title, text, to }) => (
              <Link
                key={title}
                to={to}
                className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-brand-orange/40 transition-all"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-orange/10 text-brand-orange mb-4">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="flex items-center gap-2 text-lg font-bold text-brand-navy mb-2">
                  {title}
                  <ArrowRight className="h-4 w-4 text-brand-orange transition-transform group-hover:translate-x-1" />
                </h3>
                <p className="text-sm sm:text-base leading-relaxed text-brand-slate">{text}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* A day at the crusher */}
      <section className="bg-white px-4 py-10 sm:py-12 lg:py-16">
        <div className={container}>
          <div className="max-w-3xl mx-auto text-center mb-8 sm:mb-10">
            <h2 className={sectionHeading}>How a Day at Your Crusher Runs on CrusherBook</h2>
            <p className={sectionLead}>
              From the first boulder trip to the profit figure at night, each step updates the next.
            </p>
          </div>
          <ol className="grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {dayFlow.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="relative rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-5 sm:p-6 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-navy/10 text-brand-navy mb-4">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-brand-navy mb-2">{i + 1}. {title}</h3>
                <p className="text-sm leading-relaxed text-brand-slate">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Everything in one software */}
      <section className="bg-gray-50 px-4 py-10 sm:py-12 lg:py-16">
        <div className={container}>
          <div className="max-w-3xl mx-auto text-center mb-8 sm:mb-10">
            <h2 className={sectionHeading}>Everything a Stone Crusher Needs, in One Software!</h2>
            <p className={sectionLead}>
              Billing, weighbridge, accounts, stock, diesel, vehicles and payroll work together, so nothing is entered twice.
            </p>
          </div>
          <div className="grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
            {featureGroups.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-orange/10 text-brand-orange mb-4">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-brand-navy mb-2">{title}</h3>
                <p className="text-sm sm:text-base leading-relaxed text-brand-slate">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why choose */}
      <section className="bg-white px-4 py-10 sm:py-12 lg:py-16">
        <div className={container}>
          <div className="max-w-3xl mx-auto text-center mb-8 sm:mb-10">
            <h2 className={sectionHeading}>Why Crusher Plants Choose CrusherBook</h2>
          </div>
          <div className="grid gap-4 sm:gap-5 md:grid-cols-3">
            {reasons.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-6 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-navy/10 text-brand-navy mb-4">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-brand-navy mb-2">{title}</h3>
                <p className="text-sm sm:text-base leading-relaxed text-brand-slate">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="bg-gray-50 px-4 py-10 sm:py-12 lg:py-16">
        <div className={container}>
          <div className="max-w-3xl mx-auto text-center mb-8 sm:mb-10">
            <h2 className={sectionHeading}>CrusherBook vs Register, Excel and Generic Accounting Software</h2>
            <p className={sectionLead}>
              Registers and Excel cannot connect the weighbridge to the ledger, and general billing software does not know what a
              boulder trip or a tare weight is.
            </p>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-sm">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-brand-navy text-white">
                <tr>
                  <th scope="col" className="p-3 sm:p-4 text-left font-bold">What you need</th>
                  <th scope="col" className="p-3 sm:p-4 text-center font-bold">Paper register</th>
                  <th scope="col" className="p-3 sm:p-4 text-center font-bold">Excel</th>
                  <th scope="col" className="p-3 sm:p-4 text-center font-bold">Generic accounting</th>
                  <th scope="col" className="p-3 sm:p-4 text-center font-bold text-brand-orange">CrusherBook</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {comparisonRows.map((row) => (
                  <tr key={row.label}>
                    <th scope="row" className="p-3 sm:p-4 text-left font-medium text-brand-navy">{row.label}</th>
                    {row.values.map((value, index) => (
                      <td key={index} className={`p-3 sm:p-4 text-center ${index === 3 ? 'bg-orange-50/60' : ''}`}>
                        <ComparisonCell value={value} highlight={index === 3} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Pricing summary */}
      <section className="bg-white px-4 py-10 sm:py-12 lg:py-16">
        <div className={container}>
          <div className="max-w-3xl mx-auto text-center mb-8 sm:mb-10">
            <h2 className={sectionHeading}>Stone Crusher Software Price</h2>
            <p className={sectionLead}>Simple yearly plans, with prices listed openly. No hidden setup fee.</p>
          </div>
          <div className="grid gap-4 sm:gap-5 lg:grid-cols-3">
            {planSummary.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl border p-6 shadow-sm ${
                  plan.popular ? 'border-brand-orange/40 bg-gradient-to-br from-orange-50 via-white to-white' : 'border-gray-200 bg-white'
                }`}
              >
                <h3 className="text-lg font-bold text-brand-navy">{plan.name}</h3>
                <p className="mt-2">
                  <span className="text-2xl font-extrabold text-brand-navy">{plan.price}</span>
                  <span className="text-xs font-medium text-brand-slate"> per year</span>
                </p>
                <p className="mt-2 text-sm font-semibold text-brand-navy">{plan.forWho}</p>
                <p className="mt-1 text-sm leading-relaxed text-brand-slate">{plan.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <a href={WHATSAPP_TRIAL_URL} target="_blank" rel="noreferrer" className={primaryButton}>
              <MessageCircle className="h-4 w-4" />
              <span>Start Free Trial</span>
            </a>
          </div>
        </div>
      </section>

      {/* Testimonials: shown once real reviews are added above */}
      {testimonials.length > 0 && (
        <section className="bg-gray-50 px-4 py-10 sm:py-12 lg:py-16">
          <div className={container}>
            <div className="max-w-3xl mx-auto text-center mb-8 sm:mb-10">
              <h2 className={sectionHeading}>What Crusher Owners Say</h2>
            </div>
            <div className="grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {testimonials.map((t) => (
                <TestimonialCard key={t.name} {...t} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* New to crusher software */}
      <section className="bg-white px-4 py-10 sm:py-12">
        <div className={container}>
          <div className="flex flex-col gap-5 rounded-2xl border border-brand-navy/15 bg-gradient-to-br from-slate-50 to-white p-6 sm:p-8 shadow-sm lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-brand-navy">New to Crusher Software?</h2>
              <p className="mt-2 text-sm sm:text-base text-brand-slate">
                Not sure where to start? Watch a 3-minute video, or let our team set up your plant and move your old data for you.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
              <a href={DEMO_VIDEO_URL || WHATSAPP_VIDEO_URL} target="_blank" rel="noreferrer" className={secondaryButton}>
                <PlayCircle className="h-4 w-4" />
                <span>Watch 3-Minute Video</span>
              </a>
              <a href={WHATSAPP_CHAT_URL} target="_blank" rel="noreferrer" className={primaryButton}>
                <MessageCircle className="h-4 w-4" />
                <span>Talk to Us on WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-gradient-to-b from-gray-50 via-white to-gray-50/50 px-4 py-10 sm:py-12 lg:py-16">
        <div className={container}>
          <div className="text-center mb-8 sm:mb-10">
            <h2 className={sectionHeading}>FAQs</h2>
          </div>
          <div className="space-y-3 sm:space-y-4">
            {faqItems.map((item, index) => {
              const open = expandedFAQ === index;
              return (
                <div key={item.question} className="rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                  <button
                    type="button"
                    onClick={() => setExpandedFAQ(open ? -1 : index)}
                    aria-expanded={open}
                    className="w-full text-left p-5 sm:p-6 flex items-center justify-between gap-3"
                  >
                    <h3 className="text-base sm:text-lg font-bold text-brand-navy">{item.question}</h3>
                    <ChevronDown className={`h-5 w-5 shrink-0 text-brand-navy transition-transform ${open ? 'rotate-180' : ''}`} />
                  </button>
                  {/* Kept in the DOM when closed so crawlers read every answer */}
                  <div hidden={!open} className="border-t border-gray-100 px-5 py-4 sm:px-6 sm:py-5">
                    <p className="text-sm sm:text-base leading-relaxed text-brand-slate">{item.answer}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gradient-to-b from-brand-navy via-brand-navy to-brand-navy/95 px-4 py-10 sm:py-12 lg:py-16 text-white">
        <div className={`${container} text-center`}>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-[2.2rem] font-bold leading-tight mb-4 sm:mb-6">
            Run Your Crusher Without Registers
          </h2>
          <p className="text-sm sm:text-base md:text-lg leading-relaxed text-white/80 max-w-3xl mx-auto">
            Join crusher owners who see slips, stock, ledgers and profit in one place. Start today from Rs 9,999 per year.
          </p>
          <div className="mt-8 sm:mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <a href={WHATSAPP_TRIAL_URL} target="_blank" rel="noreferrer" className={primaryButton}>
              <MessageCircle className="h-4 w-4" />
              <span>Start Free Trial</span>
            </a>
            <a href={WHATSAPP_CHAT_URL} target="_blank" rel="noreferrer" className={secondaryButton}>
              <MessageCircle className="h-4 w-4" />
              <span>Chat on WhatsApp</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
