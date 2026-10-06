import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  ArrowRight, BarChart3, BookOpen, Boxes, Building2, Camera, ChevronDown, Factory, Fuel, Landmark,
  MessageCircle, Mountain, Receipt, Scale, TriangleAlert, Truck, Undo2, UserCog, Users, Wallet,
} from 'lucide-react';
import ContactActions from '../components/ContactActions';
import Seo from '../components/Seo';
import { landingPageBySlug } from '../data/landingPages';

const SITE_URL = 'https://crusherbook.com';

const iconMap = {
  book: BookOpen,
  boxes: Boxes,
  building: Building2,
  camera: Camera,
  chart: BarChart3,
  factory: Factory,
  fuel: Fuel,
  landmark: Landmark,
  message: MessageCircle,
  mountain: Mountain,
  receipt: Receipt,
  scale: Scale,
  truck: Truck,
  undo: Undo2,
  userCog: UserCog,
  users: Users,
  wallet: Wallet,
};

const buildSchema = (page) => {
  const url = `${SITE_URL}/${page.slug}`;
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: page.seoTitle,
      url,
      description: page.description,
      about: { '@type': 'SoftwareApplication', name: 'CrusherBook' },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'CrusherBook',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web, Android, Windows',
      url,
      description: page.description,
      offers: {
        '@type': 'AggregateOffer',
        priceCurrency: 'INR',
        lowPrice: '4999',
        highPrice: '8999',
        offerCount: '3',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: page.faq.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: item.answer },
      })),
    },
  ];
};

export default function KeywordLanding({ slug }) {
  const [expandedFAQ, setExpandedFAQ] = useState(0);
  const page = landingPageBySlug[slug];

  if (!page) return <Navigate to="/" replace />;

  return (
    <div className="w-full">
      <Seo
        title={page.seoTitle}
        description={page.description}
        path={`/${page.slug}`}
        keywords={page.keywords}
        schema={buildSchema(page)}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: page.navLabel, path: `/${page.slug}` },
        ]}
      />

      {/* Hero */}
      <section className="bg-gradient-to-b from-white via-orange-50/40 to-white px-4 pt-10 pb-10 sm:pt-14 sm:pb-12 lg:pt-16 lg:pb-16">
        <div className="w-full max-w-5xl mx-auto px-0 sm:px-5 lg:px-6 xl:max-w-6xl text-center">
          <nav aria-label="Breadcrumb" className="mb-4 text-xs sm:text-sm text-brand-slate">
            <Link to="/" className="hover:text-brand-orange">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-brand-navy">{page.navLabel}</span>
          </nav>
          <span className="inline-block rounded-full bg-brand-orange/10 px-4 py-1.5 text-xs sm:text-sm font-semibold text-brand-orange mb-4">
            {page.eyebrow}
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-brand-navy leading-tight mb-5 max-w-4xl mx-auto">
            {page.h1}
          </h1>
          <p className="text-sm sm:text-base md:text-lg leading-relaxed text-brand-slate max-w-3xl mx-auto mb-8">
            {page.intro}
          </p>
          <ContactActions primaryLabel="Get Free Demo on WhatsApp" secondaryLabel="Call Now" />
          <p className="mt-4 text-xs sm:text-sm text-brand-slate">
            Plans from Rs 4,999/year · <Link to="/pricing" className="font-semibold text-brand-orange hover:underline">See pricing</Link>
          </p>
        </div>
      </section>

      {/* Pain points */}
      <section className="bg-white px-4 py-10 sm:py-12 lg:py-16">
        <div className="w-full max-w-5xl mx-auto px-0 sm:px-5 lg:px-6 xl:max-w-6xl">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-[2.2rem] font-bold text-brand-navy text-center mb-8 sm:mb-10 leading-tight">
            {page.painTitle}
          </h2>
          <div className="grid gap-5 md:grid-cols-3">
            {page.painPoints.map((pain) => (
              <div key={pain.title} className="rounded-2xl border border-red-100 bg-red-50/40 p-6">
                <TriangleAlert className="h-6 w-6 text-red-500 mb-3" />
                <h3 className="text-lg font-bold text-brand-navy mb-2">{pain.title}</h3>
                <p className="text-sm sm:text-base leading-relaxed text-brand-slate">{pain.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gradient-to-b from-gray-50 via-white to-gray-50/50 px-4 py-10 sm:py-12 lg:py-16">
        <div className="w-full max-w-5xl mx-auto px-0 sm:px-5 lg:px-6 xl:max-w-6xl">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-[2.2rem] font-bold text-brand-navy text-center mb-8 sm:mb-10 leading-tight">
            {page.featuresTitle}
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {page.features.map((feature) => {
              const Icon = iconMap[feature.icon] || Boxes;
              return (
                <div key={feature.title} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-orange/10 text-brand-orange mb-4">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-bold text-brand-navy mb-2">{feature.title}</h3>
                  <p className="text-sm sm:text-base leading-relaxed text-brand-slate">{feature.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section className="bg-brand-navy px-4 py-10 sm:py-12 lg:py-16 text-white">
        <div className="w-full max-w-5xl mx-auto px-0 sm:px-5 lg:px-6 xl:max-w-6xl">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-[2.2rem] font-bold text-center mb-8 sm:mb-10 leading-tight">
            {page.stepsTitle}
          </h2>
          <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {page.steps.map((step, index) => (
              <li key={step.title} className="rounded-2xl bg-white/5 border border-white/10 p-6">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-orange font-bold mb-3">
                  {index + 1}
                </span>
                <h3 className="text-lg font-bold mb-2">{step.title}</h3>
                <p className="text-sm leading-relaxed text-white/75">{step.text}</p>
              </li>
            ))}
          </ol>
          <div className="mt-10">
            <ContactActions primaryLabel="Start Free Trial" secondaryLabel="Call for Demo" />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white px-4 py-10 sm:py-12 lg:py-16">
        <div className="w-full max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-brand-navy text-center mb-8 sm:mb-10">
            Frequently Asked Questions
          </h2>
          <div className="space-y-3 sm:space-y-4">
            {page.faq.map((item, index) => (
              <button
                key={item.question}
                onClick={() => setExpandedFAQ(expandedFAQ === index ? -1 : index)}
                className="w-full text-left rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="p-5 sm:p-6 flex items-center justify-between gap-3">
                  <h3 className="text-base sm:text-lg font-bold text-brand-navy">{item.question}</h3>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-brand-navy transition-transform ${expandedFAQ === index ? 'rotate-180' : ''}`}
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

      {/* Related pages — internal linking between keyword pages */}
      <section className="bg-gray-50 px-4 py-10 sm:py-12">
        <div className="w-full max-w-5xl mx-auto px-0 sm:px-5 lg:px-6 xl:max-w-6xl">
          <h2 className="text-xl sm:text-2xl font-bold text-brand-navy text-center mb-6">Explore more CrusherBook solutions</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {page.related.map((relatedSlug) => {
              const related = landingPageBySlug[relatedSlug];
              if (!related) return null;
              return (
                <Link
                  key={relatedSlug}
                  to={`/${relatedSlug}`}
                  className="group flex items-center justify-between rounded-xl border border-gray-200 bg-white p-5 font-semibold text-brand-navy shadow-sm hover:border-brand-orange hover:text-brand-orange transition-colors"
                >
                  <span>{related.navLabel}</span>
                  <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1" />
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
