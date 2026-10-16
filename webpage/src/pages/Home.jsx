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
  Wallet,
  Users,
  Gauge,
  Smartphone,
  ArrowRight,
} from 'lucide-react';
import MarketingHero from '../components/MarketingHero';
import FeatureShowcase from '../components/FeatureShowcase';
import ContactActions from '../components/ContactActions';
import TestimonialCard from '../components/TestimonialCard';
import Seo from '../components/Seo';

const testimonials = [
  {
    quote:
      'Manual slip entry used to take our staff hours every evening. With CrusherBook, boulder entries and party ledger update the same minute the truck leaves the weighbridge.',
    name: 'Rajesh Sahu',
    role: 'Crusher Plant Owner',
    location: 'Raipur, Chhattisgarh',
  },
  {
    quote:
      'Tracking pending payments from dozens of parties was our biggest headache. Now every ledger entry, expense, and stock number is visible on one screen.',
    name: 'Manoj Agrawal',
    role: 'Plant Manager',
    location: 'Jabalpur, Madhya Pradesh',
  },
  {
    quote:
      'We run two crushers and CrusherBook gives us combined stock and profit reports instantly. No more waiting for the accountant to reconcile registers.',
    name: 'Biswajit Patra',
    role: 'Crusher Plant Owner',
    location: 'Rourkela, Odisha',
  },
  {
    quote:
      'Our dispatch team loves how fast sales slips get created now. Weighbridge readings flow straight into billing without any retyping.',
    name: 'Suresh Mahato',
    role: 'Operations Head',
    location: 'Dhanbad, Jharkhand',
  },
  {
    quote:
      'Employee access control was important for us since we have multiple supervisors. CrusherBook lets us control exactly who can see ledger and pricing.',
    name: 'Deepak Verma',
    role: 'Crusher Plant Owner',
    location: 'Bilaspur, Chhattisgarh',
  },
  {
    quote:
      'Switching from paper registers to CrusherBook took less than a day. Support team helped us set up party ledgers and stock categories quickly.',
    name: 'Ashok Tiwari',
    role: 'Plant Manager',
    location: 'Katni, Madhya Pradesh',
  },
];

const audiences = [
  {
    icon: Factory,
    title: 'Single crusher owners',
    text: 'Sales slips, boulder entry, party dues and daily profit for one plant, on your phone, without a munshi register.',
    to: '/stone-crusher-management-software',
    linkLabel: 'Stone crusher management software',
  },
  {
    icon: Building2,
    title: 'Owners with more than one crusher',
    text: 'Every plant in one login, with stock and profit for each crusher and for all of them together.',
    to: '/stone-crusher-plant-management-software',
    linkLabel: 'Multi-crusher management',
  },
  {
    icon: Mountain,
    title: 'Quarry + crusher operations',
    text: 'Boulder from the mine, crushing, dispatch, hired trucks and diesel tracked as one flow.',
    to: '/quarry-crusher-management-software',
    linkLabel: 'Quarry crusher software',
  },
  {
    icon: UserCheck,
    title: 'Munshi, accountant and CA',
    text: 'Party ledger with Dr / Cr, cash and bank, expenses and P&L ready to share, so the books match the weighbridge.',
    to: '/stone-crusher-accounting-software',
    linkLabel: 'Crusher accounting software',
  },
];

const dayFlow = [
  { icon: Truck, title: 'Boulder arrives', text: 'Record boulder trips from the mine or supplier, per ton or per trip, with the supplier ledger updated at once.' },
  { icon: Scale, title: 'Weighbridge slip (kanta parchi)', text: 'Enter gross, tare and net weight, or snap the slip photo and let AI fill it in.' },
  { icon: Receipt, title: 'Sale and bill', text: 'Bill gitti, dust and aggregate per ton or per cubic feet (cft) at each party’s rate. Stock goes down automatically.' },
  { icon: BookOpen, title: 'Party ledger', text: 'The sale, receipt or credit lands in the party khata. Pending udhari is always visible.' },
  { icon: MessageCircle, title: 'WhatsApp to the party', text: 'Bill and balance reminders go to customers on WhatsApp, automatically on the Advanced plan.' },
  { icon: ChartColumnBig, title: 'Profit by evening', text: 'Sales less boulder, diesel, hire, salary and expenses gives the real profit of the day.' },
];

const featureLinks = [
  { icon: Receipt, title: 'Crusher billing software', to: '/crusher-billing-software' },
  { icon: Scale, title: 'Weighbridge software', to: '/crusher-weighbridge-software' },
  { icon: BookOpen, title: 'Accounting & party ledger', to: '/stone-crusher-accounting-software' },
  { icon: MessageCircle, title: 'Payment reminders', to: '/crusher-plant-payment-reminder-software' },
  { icon: Boxes, title: 'Stock & inventory', to: '/stone-crusher-inventory-management-software' },
  { icon: Truck, title: 'Boulder production tracking', to: '/stone-crusher-boulder-production-tracking-software' },
  { icon: Fuel, title: 'Diesel consumption tracking', to: '/crusher-plant-diesel-consumption-tracking-software' },
  { icon: Gauge, title: 'Machine & vehicle meter readings', to: '/crusher-plant-vehicle-mileage-tracking-software' },
  { icon: Truck, title: 'Fleet & hired vehicles', to: '/stone-crusher-fleet-management-software' },
  { icon: Wallet, title: 'Expense tracking', to: '/crusher-plant-expense-tracking-software' },
  { icon: Users, title: 'Payroll & attendance', to: '/crusher-plant-payroll-software' },
  { icon: ChartColumnBig, title: 'Production reports', to: '/crusher-plant-production-report-software' },
  { icon: Smartphone, title: 'Mobile app for crushers', to: '/stone-crusher-management-app' },
  { icon: Mountain, title: 'Quarry management software', to: '/quarry-management-software' },
];

const comparisonRows = [
  { label: 'Weighbridge slip to bill in one step', register: false, excel: false, generic: false, crusherbook: true },
  { label: 'Per ton and per cubic feet (cft) billing', register: true, excel: true, generic: false, crusherbook: true },
  { label: 'Boulder in, gitti out, live stock', register: false, excel: false, generic: false, crusherbook: true },
  { label: 'Party ledger updates by itself', register: false, excel: false, generic: true, crusherbook: true },
  { label: 'Automated WhatsApp bills & reminders', register: false, excel: false, generic: false, crusherbook: true },
  { label: 'Diesel, hire and machine costs per plant', register: false, excel: false, generic: false, crusherbook: true },
  { label: 'Owner sees everything on the phone', register: false, excel: false, generic: false, crusherbook: true },
  { label: 'Works in English and Hindi', register: true, excel: false, generic: false, crusherbook: true },
];

const planSummary = [
  { name: 'Basic', price: 'Rs 9,999', text: 'Crusher entry, sales and boulder slips, party ledger, expenses and stock. 1 employee login.' },
  { name: 'Advanced', price: 'Rs 11,999', text: 'Everything in Basic plus automated WhatsApp alerts, AI slip photo entry and Excel export.', popular: true },
  { name: 'Enterprise', price: 'Rs 13,999', text: 'Everything in Advanced plus multi-crusher management and weighbridge integration.' },
];

const faqItems = [
  {
    question: 'What is CrusherBook?',
    answer: 'CrusherBook is stone crusher management software made in India for crusher plants and quarries. It records sales slips, boulder entry, weighbridge weights, stock, party ledger, diesel, expenses, payroll and profit in one place, on phone, tablet or laptop, in English and Hindi.',
  },
  {
    question: 'Which is the best stone crusher management software in India?',
    answer: 'The best software is the one built around a crusher’s real day: weighbridge slips, boulder trips, per ton or cft billing, party udhari and diesel. CrusherBook is made only for stone crushers, works in English and Hindi, shows its price openly from Rs 9,999 per year, and gives a free demo on your own slips before you pay.',
  },
  {
    question: 'How much does crusher management software cost?',
    answer: 'CrusherBook costs Rs 9,999 per year for Basic (1 employee login), Rs 11,999 per year for Advanced with automated WhatsApp alerts, and Rs 13,999 per year for Enterprise with multi-crusher management and weighbridge integration. Every plan starts with a free demo.',
  },
  {
    question: 'Does it support weighbridge (dharam kanta) integration?',
    answer: 'Yes. On every plan you can enter gross, tare and net weight from the slip, or snap a slip photo on Advanced and Enterprise. Direct weighbridge integration, where weights come in without typing, is on the Enterprise plan. Tell us your weighbridge model and we will confirm it.',
  },
  {
    question: 'Can I bill per ton and per cubic feet (cft)?',
    answer: 'Yes. Each sale can be billed per ton or per cubic feet, and you can set the default sale type for every new sale. You can also record both cubic feet and weight on the same sale.',
  },
  {
    question: 'Can I manage more than one crusher plant?',
    answer: 'Yes. The Enterprise plan manages multiple crushers from one login, with separate and combined stock and profit reports.',
  },
  {
    question: 'Does CrusherBook send bills and payment reminders on WhatsApp?',
    answer: 'You can share any party ledger or bill on WhatsApp on every plan. Automated WhatsApp alerts, sent without anyone pressing a button, are part of the Advanced and Enterprise plans.',
  },
  {
    question: 'Is the software available in Hindi?',
    answer: 'Yes. CrusherBook can show English and Hindi together, with the Hindi under each label, so a munshi who reads Hindi and an owner who reads English can use the same screen.',
  },
  {
    question: 'Does it work on mobile?',
    answer: 'Yes. CrusherBook works on any Android phone, tablet or laptop at app.crusherbook.com. It is cloud software, so it needs an internet connection, and mobile data is enough.',
  },
  {
    question: 'Is my crusher data safe?',
    answer: 'Your data is stored on the cloud, not on one office computer, so it is not lost if a laptop breaks. The owner decides which employee can see ledgers, rates and profit.',
  },
  {
    question: 'Can I move from registers, Excel or Tally?',
    answer: 'Yes. Most plants start the same day. Our team helps you add products, parties and opening balances over WhatsApp or a phone call, and you can keep sharing reports with your CA.',
  },
  {
    question: 'Is there a free trial?',
    answer: 'Yes. Every plan comes with a free trial and a free demo on WhatsApp, so you can test CrusherBook on your own slips before you pay.',
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
    'Stone crusher management software for India: weighbridge slips, sales billing per ton or cft, boulder entry, stock, party ledger, diesel, expenses, payroll and profit reports.',
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

const Mark = ({ ok }) =>
  ok ? (
    <CheckCircle2 className="mx-auto h-5 w-5 text-green-600" aria-label="Yes" />
  ) : (
    <XCircle className="mx-auto h-5 w-5 text-gray-300" aria-label="No" />
  );

const Home = () => {
  const [expandedFAQ, setExpandedFAQ] = useState(0);

  return (
    <div className="w-full">
      <Seo
        title="India's Best Stone Crusher Management Software"
        description="CrusherBook is stone crusher management software for India: weighbridge slips, per ton or cft billing, boulder, stock, party ledger and WhatsApp. From Rs 9,999/yr."
        path="/"
        keywords={[
          'stone crusher management software',
          'best stone crusher management software in India',
          'stone crusher plant ERP software',
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
              <strong className="text-brand-navy">CrusherBook is stone crusher management software made for Indian crusher plants and quarries.</strong>{' '}
              It replaces the slip book, the munshi register and the Excel sheet with one simple app. Every truck that crosses the
              weighbridge, every boulder trip, every litre of diesel and every rupee a party owes you is recorded the moment it happens.
              The owner sees stock, dues and profit from the phone, anytime, in English or Hindi.
            </p>
            <p className={`${sectionLead} mt-4`}>
              Plans start at Rs 9,999 per year, and you can try it free on your own slips first.
            </p>
          </div>
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
            {audiences.map(({ icon: Icon, title, text, to, linkLabel }) => (
              <div key={title} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-orange/10 text-brand-orange mb-4">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-brand-navy mb-2">{title}</h3>
                <p className="text-sm sm:text-base leading-relaxed text-brand-slate">{text}</p>
                <Link to={to} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-orange hover:underline">
                  {linkLabel} <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
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
              From the first boulder trip in the morning to the profit figure at night, each step updates the next by itself.
            </p>
          </div>
          <ol className="grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {dayFlow.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="relative rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-5 sm:p-6 shadow-sm">
                <span className="absolute right-5 top-5 text-3xl font-extrabold text-brand-navy/10">{i + 1}</span>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-navy/10 text-brand-navy mb-4">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-brand-navy mb-2">{title}</h3>
                <p className="text-sm leading-relaxed text-brand-slate">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Feature links */}
      <section className="bg-gray-50 px-4 py-10 sm:py-12 lg:py-16">
        <div className={container}>
          <div className="max-w-3xl mx-auto text-center mb-8 sm:mb-10">
            <h2 className={sectionHeading}>Everything a Stone Crusher Needs, in One Software</h2>
            <p className={sectionLead}>
              Billing, weighbridge, accounts, stock, diesel, vehicles and payroll work together, so nothing is entered twice.
            </p>
          </div>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {featureLinks.map(({ icon: Icon, title, to }) => (
              <li key={to}>
                <Link
                  to={to}
                  className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:border-brand-orange/40 hover:shadow-md transition-all"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-orange/10 text-brand-orange">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-semibold text-brand-navy">{title}</span>
                  <ArrowRight className="ml-auto h-4 w-4 text-brand-slate transition-transform group-hover:translate-x-1" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Comparison */}
      <section className="bg-white px-4 py-10 sm:py-12 lg:py-16">
        <div className={container}>
          <div className="max-w-3xl mx-auto text-center mb-8 sm:mb-10">
            <h2 className={sectionHeading}>CrusherBook vs Register, Excel and Generic Accounting Software</h2>
            <p className={sectionLead}>
              Registers and Excel cannot connect the weighbridge to the ledger, and general billing software does not know what a
              boulder trip or a tare weight is.
            </p>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-sm">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-brand-navy text-white">
                <tr>
                  <th scope="col" className="p-3 sm:p-4 text-left font-semibold">What you need</th>
                  <th scope="col" className="p-3 sm:p-4 text-center font-semibold">Paper register</th>
                  <th scope="col" className="p-3 sm:p-4 text-center font-semibold">Excel</th>
                  <th scope="col" className="p-3 sm:p-4 text-center font-semibold">Generic accounting</th>
                  <th scope="col" className="p-3 sm:p-4 text-center font-semibold text-brand-orange">CrusherBook</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {comparisonRows.map((row) => (
                  <tr key={row.label}>
                    <th scope="row" className="p-3 sm:p-4 text-left font-medium text-brand-navy">{row.label}</th>
                    <td className="p-3 sm:p-4"><Mark ok={row.register} /></td>
                    <td className="p-3 sm:p-4"><Mark ok={row.excel} /></td>
                    <td className="p-3 sm:p-4"><Mark ok={row.generic} /></td>
                    <td className="p-3 sm:p-4 bg-orange-50/60"><Mark ok={row.crusherbook} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Pricing summary */}
      <section className="bg-gray-50 px-4 py-10 sm:py-12 lg:py-16">
        <div className={container}>
          <div className="max-w-3xl mx-auto text-center mb-8 sm:mb-10">
            <h2 className={sectionHeading}>Stone Crusher Software Price</h2>
            <p className={sectionLead}>Simple yearly plans, with the price written openly. No hidden setup fee.</p>
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
                  <span className="text-xs font-medium text-brand-slate"> / year</span>
                </p>
                <p className="mt-2 text-sm leading-relaxed text-brand-slate">{plan.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 text-center">
            <Link to="/pricing" className="inline-flex items-center gap-1 font-semibold text-brand-orange hover:underline">
              Compare all plan features <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Hindi */}
      <section lang="hi" className="bg-white px-4 py-10 sm:py-12 lg:py-16">
        <div className={container}>
          <div className="max-w-3xl mx-auto rounded-2xl border border-gray-200 bg-gradient-to-br from-orange-50 via-white to-white p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-brand-navy mb-4 leading-snug">
              क्रशर प्लांट का पूरा हिसाब-किताब, एक ऐप में
            </h2>
            <p className="text-sm sm:text-base leading-relaxed text-brand-slate">
              CrusherBook से कांटा पर्ची, बोल्डर की एंट्री, गिट्टी की बिक्री (टन या घन फुट में), पार्टी का खाता, उधारी, डीज़ल
              और खर्च सब एक जगह दर्ज होता है। मालिक घर बैठे मोबाइल पर स्टॉक, बकाया और रोज़ का मुनाफ़ा देख सकता है। ऐप हिंदी और
              अंग्रेज़ी दोनों में चलता है।
            </p>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
              <Link to="/crusher-hisab-kitab-app" className="text-brand-orange hover:underline">क्रशर हिसाब किताब ऐप</Link>
              <Link to="/crusher-plant-ke-liye-software" className="text-brand-orange hover:underline">क्रशर प्लांट के लिए सॉफ्टवेयर</Link>
              <Link to="/crusher-udhari-payment-reminder-app" className="text-brand-orange hover:underline">उधारी पेमेंट रिमाइंडर</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-gray-50 px-4 py-10 sm:py-12 lg:py-16">
        <div className={container}>
          <div className="max-w-3xl mx-auto text-center mb-8 sm:mb-10">
            <h2 className={sectionHeading}>What Crusher Owners Say</h2>
            <p className={sectionLead}>
              Feedback from crusher plant owners and managers in Madhya Pradesh, Chhattisgarh, Odisha and Jharkhand who moved from
              manual registers to CrusherBook.
            </p>
          </div>
          <div className="grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((t) => (
              <TestimonialCard key={t.name} {...t} />
            ))}
          </div>
        </div>
      </section>

      {/* Buyer's guide */}
      <section className="bg-white px-4 py-10 sm:py-12">
        <div className={container}>
          <Link
            to="/how-to-choose-crusher-plant-erp-software"
            className="group flex flex-col gap-3 rounded-2xl border border-brand-navy/15 bg-gradient-to-br from-slate-50 to-white p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-brand-navy">New to crusher software?</h2>
              <p className="mt-1 text-sm sm:text-base text-brand-slate">
                Read our beginner’s guide with a 12-point checklist and the questions to ask in every demo.
              </p>
            </div>
            <span className="inline-flex items-center gap-1 font-semibold text-brand-orange">
              Read the guide <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-gradient-to-b from-gray-50 via-white to-gray-50/50 px-4 py-10 sm:py-12 lg:py-16">
        <div className={container}>
          <div className="text-center mb-8 sm:mb-10">
            <h2 className={sectionHeading}>Stone Crusher Software FAQs</h2>
            <p className="text-sm sm:text-base text-brand-slate max-w-2xl mx-auto">
              Answers to what crusher owners ask most before they switch.
            </p>
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
            See CrusherBook on your own weighbridge slips. Free demo on WhatsApp, set up the same day.
          </p>
          <div className="mt-8 sm:mt-10">
            <ContactActions primaryLabel="Start Free Trial" secondaryLabel="Call for Demo" />
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
