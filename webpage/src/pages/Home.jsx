import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
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

const homeSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'CrusherBook',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  url: 'https://crusherbook.com',
  image: 'https://crusherbook.com/cruhserbook.webp',
  description: 'Stone crusher plant ERP software for sales slips, boulder entry, weighbridge workflow, stock, ledger, expenses, and profit reports.',
  offers: [
    {
      '@type': 'Offer',
      priceCurrency: 'INR',
      price: '2999',
      name: 'Basic',
    },
    {
      '@type': 'Offer',
      priceCurrency: 'INR',
      price: '4999',
      name: 'Advanced',
    },
    {
      '@type': 'Offer',
      priceCurrency: 'INR',
      price: '6999',
      name: 'Enterprise',
    },
  ],
};

const Home = () => {
  const [expandedFAQ, setExpandedFAQ] = useState(0);

  const faqItems = [
    {
      question: 'What is CrusherBook?',
      answer: 'CrusherBook is stone crusher plant ERP software designed to manage sales slips, boulder entry, stock movement, party ledger, expenses, employee access, and profit reports all in one unified system.',
    },
    {
      question: 'Does it support weighbridge workflow?',
      answer: 'Yes! CrusherBook works with slip-based entry today and scales to full weighbridge-connected workflow for automatic dispatch entry and zero manual typing.',
    },
    {
      question: 'Can I track party-wise ledger and expenses?',
      answer: 'Absolutely. The software includes detailed party-wise ledger tracking, transaction history, expense management, and real-time stock visibility.',
    },
    {
      question: 'What are your pricing plans?',
      answer: 'We offer flexible pricing starting at Rs 2,999/year for Basic, Rs 4,999/year for Advanced, and Rs 6,999/year for Enterprise with multi-plant support. All plans include a 14-day free trial with no credit card required.',
    },
  ];

  return (
    <div className="w-full">
      <Seo
        title="Stone Crusher Plant ERP Software"
        description="CrusherBook is stone crusher plant ERP software for weighbridge workflow, sales slips, boulder entry, stock management, party ledger, expenses, employee access, and profit reports."
        path="/"
        keywords={[
          'stone crusher plant ERP software',
          'crusher management software',
          'crusher billing software',
          'weighbridge software',
          'stone crusher ledger software',
          'crusher stock management software',
        ]}
        schema={homeSchema}
      />
      <MarketingHero />
      <FeatureShowcase />

      <section className="bg-gradient-to-b from-brand-navy via-brand-navy to-brand-navy/95 px-4 py-10 sm:py-12 lg:py-16 text-white">
        <div className="w-full max-w-5xl mx-auto px-0 sm:px-5 lg:px-6 xl:max-w-6xl text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-[2.2rem] font-bold leading-tight mb-4 sm:mb-6">
            Everything for Your Crusher Plant, in One Place
          </h2>
          <p className="text-sm sm:text-base md:text-lg leading-relaxed text-white/80 max-w-3xl mx-auto mb-8 sm:mb-10">
            Manage sales, boulder entry, weighbridge workflow, party ledger, stock movement, expenses, and reporting — all without manual registers.
          </p>
          <div className="mt-8 sm:mt-10">
            <ContactActions primaryLabel="Start Free Trial" secondaryLabel="Call for Demo" />
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-10 sm:py-12 lg:py-16">
        <div className="w-full max-w-5xl mx-auto px-0 sm:px-5 lg:px-6 xl:max-w-6xl">
          <div className="max-w-3xl mx-auto text-center mb-8 sm:mb-10">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-[2.2rem] font-bold text-brand-navy mb-4 sm:mb-6 leading-tight">
              Why Crusher Plants Trust Us
            </h2>
            <p className="text-sm sm:text-base md:text-lg leading-relaxed text-brand-slate">
              Purpose-built for stone crusher operations. Faster entry, cleaner records, better control.
            </p>
          </div>

          <div className="grid gap-5 sm:gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-orange/10 text-brand-orange mb-4">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-brand-navy mb-3">Daily Operations Made Simple</h3>
              <p className="text-sm sm:text-base leading-relaxed text-brand-slate">
                Sales slips, boulder entry, stock movement, party ledger, expenses, employee management — everything in one unified system.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-accent/10 text-brand-accent mb-4">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-brand-navy mb-3">Ready for Weighbridge Integration</h3>
              <p className="text-sm sm:text-base leading-relaxed text-brand-slate">
                Start with slip-based entry today. Scale to weighbridge-connected workflow tomorrow for instant dispatch and zero manual typing.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-10 sm:py-12 lg:py-16">
        <div className="w-full max-w-5xl mx-auto px-0 sm:px-5 lg:px-6 xl:max-w-6xl">
          <div className="max-w-3xl mx-auto text-center mb-8 sm:mb-10">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-[2.2rem] font-bold text-brand-navy mb-4 sm:mb-6 leading-tight">
              What Our Customers Say
            </h2>
            <p className="text-sm sm:text-base text-brand-slate max-w-2xl mx-auto">
              Loved by crusher plants in MP, Chhattisgarh, Odisha, and Jharkhand
            </p>
            <p className="text-sm sm:text-base md:text-lg leading-relaxed text-brand-slate">
              Real feedback from crusher plant owners and managers who switched from manual registers to CrusherBook.
            </p>
          </div>

          <div className="grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((t) => (
              <TestimonialCard key={t.name} {...t} />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-b from-gray-50 via-white to-gray-50/50 px-4 py-10 sm:py-12 lg:py-16">
        <div className="w-full max-w-5xl mx-auto px-0 sm:px-5 lg:px-6 xl:max-w-6xl">
          <div className="text-center mb-8 sm:mb-10">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-[2.2rem] font-bold text-brand-navy mb-3 sm:mb-4">
              Questions? We Have Answers
            </h2>
            <p className="text-sm sm:text-base text-brand-slate max-w-2xl mx-auto">
              Everything you need to know about CrusherBook and how it works for your crusher plant.
            </p>
          </div>
          <div className="space-y-3 sm:space-y-4">
            {faqItems.map((item, index) => (
              <button
                key={item.question}
                onClick={() => setExpandedFAQ(expandedFAQ === index ? -1 : index)}
                className="w-full text-left rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="p-5 sm:p-6 flex items-center justify-between gap-3">
                  <h3 className="text-base sm:text-lg font-bold text-brand-navy">{item.question}</h3>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-brand-navy transition-transform ${
                      expandedFAQ === index ? 'rotate-180' : ''
                    }`}
                  />
                </div>
                {expandedFAQ === index && (
                  <div className="border-t border-gray-100 px-5 py-4 sm:px-6 sm:py-5">
                    <p className="text-sm sm:text-base leading-relaxed text-brand-slate">{item.answer}</p>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
