import MarketingHero from '../components/MarketingHero';
import FeatureShowcase from '../components/FeatureShowcase';
import ContactActions from '../components/ContactActions';
import Seo from '../components/Seo';

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
      price: '14999',
      name: 'Basic',
    },
    {
      '@type': 'Offer',
      priceCurrency: 'INR',
      price: '19999',
      name: 'Advanced',
    },
  ],
};

const Home = () => {
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

      <section className="bg-gradient-to-b from-brand-navy via-brand-navy to-brand-navy/95 px-4 py-16 sm:py-20 lg:py-24 text-white">
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

      <section className="bg-white px-4 py-16 sm:py-20 lg:py-24">
        <div className="w-full max-w-5xl mx-auto px-0 sm:px-5 lg:px-6 xl:max-w-6xl">
          <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16">
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

      <section className="bg-gradient-to-b from-gray-50 via-white to-gray-50/50 px-4 py-16 sm:py-20 lg:py-24">
        <div className="w-full max-w-5xl mx-auto px-0 sm:px-5 lg:px-6 xl:max-w-6xl">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-[2.2rem] font-bold text-brand-navy mb-3 sm:mb-4">
              Questions? We Have Answers
            </h2>
            <p className="text-sm sm:text-base text-brand-slate max-w-2xl mx-auto">
              Everything you need to know about CrusherBook and how it works for your crusher plant.
            </p>
          </div>
          <div className="space-y-3 sm:space-y-4">
            {[
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
                answer: 'We offer flexible pricing. Basic plan starts at Rs 14,999/year and Advanced plan starts at Rs 19,999/year. Both include 14-day free trial with no credit card required.',
              },
            ].map((item) => (
              <div key={item.question} className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-base sm:text-lg font-bold text-brand-navy mb-2 sm:mb-3">{item.question}</h3>
                <p className="text-sm sm:text-base leading-relaxed text-brand-slate">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
