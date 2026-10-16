import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, BarChart3, Boxes, CheckCircle2, ChevronDown, ClipboardList, Clock, FileText, Fuel, Gauge, Languages,
  MessageCircle, Mountain, Receipt, Scale, ShieldCheck, TriangleAlert, Truck, Wrench, XCircle,
} from 'lucide-react';
import ContactActions from '../components/ContactActions';
import Seo from '../components/Seo';

const SITE_URL = 'https://crusherbook.com';
const GUIDE_SLUG = 'how-to-choose-crusher-plant-erp-software';
const PUBLISHED = '2026-10-16';

const TITLE = 'A Beginner’s Guide to Choosing the Right Crusher Plant ERP Software';
const SEO_TITLE = 'How to Choose the Best Crusher Plant ERP Software (Beginner’s Guide)';
const DESCRIPTION =
  'A simple, practical guide for crusher plant owners: the 12 things the right crusher ERP software must do, from weighbridge and boulder records to diesel, vehicle average, WhatsApp balance alerts, quotations and profit.';

// The checklist: what to look for, why it matters at a crusher, what to ask in the demo, and how CrusherBook does it
const CHECKLIST = [
  {
    id: 'weighbridge',
    icon: Scale,
    title: 'Weighbridge integration, so weights are never typed twice',
    why: 'At a crusher, the kanta slip is the bill. If the weight is written on the slip and then typed again into billing, sooner or later a wrong number gets in, and nobody notices until the party disputes it. A tare weight typed by hand on every trip is also where small leaks start.',
    ask: [
      'Does the gross, tare and net weight go straight into the sale, without typing it again?',
      'Does the software remember each vehicle’s tare weight?',
      'Can staff fill an entry from a photo of the kanta slip?',
    ],
    crusherbook: 'Every sale and boulder entry records gross, tare and net weight. Saved vehicles remember their tare weight, and staff can click a photo of the weighbridge slip so the weight and vehicle number are read and filled in. The weight on the slip is the weight that gets billed and the weight that leaves stock.',
    link: { to: '/crusher-weighbridge-software', label: 'Weighbridge software for crushers' },
  },
  {
    id: 'easy-hindi',
    icon: Languages,
    title: 'Simple screens your staff can use, in Hindi',
    why: 'The best software is useless if the munshi at the kanta does not use it. Most entries at a crusher are made by site staff, not by the owner, and many of them are more comfortable in Hindi than in English. If the screens are confusing, they go back to the register and the software sits empty.',
    ask: [
      'Can each staff member switch the app to Hindi?',
      'Can I see the app in English while my munshi sees it in Hindi?',
      'How many taps does it take to make one sale entry?',
    ],
    crusherbook: 'Every login chooses its own language: English, हिंदी, or both together (English with Hindi under each word). The choice is saved on the login, so it stays the same on any phone. Screens are built around the daily work of a crusher: one tap opens a new sale, boulder entry or diesel issue.',
  },
  {
    id: 'boulder',
    icon: Mountain,
    title: 'Complete boulder records: inward, dump and hopper',
    why: 'Boulder is your raw material and usually your biggest cost. You need to know how much came in from each supplier, at what rate, and where it went: straight into the hopper, or unloaded on the dump when the hopper was down and fed later.',
    ask: [
      'Can I record boulder by single slip and also many trips of one vehicle at once?',
      'Does it keep a separate account of boulder lying on the dump?',
      'Does each supplier’s boulder rate fill in automatically?',
    ],
    crusherbook: 'Boulder entry records supplier, vehicle, weight and rate, by single slip or bulk trips. Boulder unloaded on the dump has its own stock ledger, and every load fed from the dump into the hopper is recorded against it, so the dump balance is always known.',
    link: { to: '/boulder-crusher-plant-software', label: 'Boulder crusher plant software' },
  },
  {
    id: 'stock',
    icon: Boxes,
    title: 'An estimate of how much stock is lying in your plant',
    why: 'Owners make promises to parties based on what they think is in the yard. Without a running estimate, you either commit material you do not have, or you let orders go while stock sits unsold. You should be able to compare tons crushed with tons sold at any time.',
    ask: [
      'Can I see tons of boulder crushed against tons of material sold, for any period?',
      'If I sell some customers by cubic feet, are those sales still counted in tons?',
      'Is the stock of diesel, oil and spare parts tracked too?',
    ],
    crusherbook: 'Tons crushed and tons sold are shown side by side on the dashboard and in reports. If you bill some customers per cubic feet, CrusherBook can record the weighbridge weight too, so every sale still counts in tons for your stock. Store items like diesel, oil and filters have their own stock ledger with every in and out.',
    link: { to: '/stone-crusher-inventory-management-software', label: 'Crusher inventory software' },
  },
  {
    id: 'material',
    icon: ClipboardList,
    title: 'Material tracking: what was sold, and what was used',
    why: 'Two kinds of material move at a crusher. Finished material (10mm, 20mm, 40mm, dust, GSB, WMM) goes out to parties, and store material (diesel, oil, grease, belts, spare parts) gets used up inside the plant. Both need tracking, or money leaks quietly.',
    ask: [
      'Can I see sales by material, per ton and per cubic feet?',
      'When oil or a spare part is given out, does the software record which vehicle or machine it went to?',
      'Can I see each item’s history: bought, used, and what is left?',
    ],
    crusherbook: 'Sales are totalled by material, by ton and by cubic feet. Every store item given out is recorded against the vehicle, the DG set or the plant, and each item has its own report: stock, bought, used in 7 and 30 days, and who used it.',
  },
  {
    id: 'vehicles',
    icon: Wrench,
    title: 'Vehicle and maintenance tracking',
    why: 'Loaders, JCBs, hyvas, tractors and the DG set are expensive to run. Oil changes, filters, tyres and repairs add up fast, and if nobody records which vehicle got what, you cannot tell which machine is costing you the most.',
    ask: [
      'Can I open one vehicle and see everything spent on it?',
      'Does it handle my own vehicles and hired vehicles differently?',
      'Can it track monthly rent for a hired vehicle, with off days?',
    ],
    crusherbook: 'Each vehicle has its own ledger: diesel, oil, parts and other material given to it, its trips, and its meter readings. Hired vehicles can be on per-trip rates or monthly rent, with off days and adjustments worked out day by day in the owner’s ledger.',
    link: { to: '/stone-crusher-fleet-management-software', label: 'Crusher fleet management software' },
  },
  {
    id: 'diesel',
    icon: Fuel,
    title: 'A proper diesel report',
    why: 'Diesel is usually the second biggest running cost after boulder, and it is the easiest to lose. Diesel issued from your own tank and diesel filled at a petrol pump on credit both need to be recorded, against the right vehicle.',
    ask: [
      'Can I issue diesel from my stock to a vehicle or the DG set?',
      'Can I record diesel filled at a petrol pump straight into a vehicle, and add it to the pump’s account?',
      'Is there one report showing diesel by day and by vehicle?',
    ],
    crusherbook: 'Diesel is a built-in item. Diesel given from stock and pump fills (diesel filled at the pump on credit, straight into a vehicle) are both recorded, and the diesel report shows it day by day and vehicle by vehicle.',
    link: { to: '/crusher-plant-diesel-consumption-tracking-software', label: 'Diesel consumption tracking' },
  },
  {
    id: 'meter',
    icon: Gauge,
    title: 'Meter reading and average (mileage) tracking',
    why: 'Diesel litres alone do not tell you if a vehicle is wasting fuel. You need its KM or hour meter with it. Then you can see the average, litres per hour for a loader, KM per litre for a truck, and catch a vehicle that suddenly needs more diesel for the same work.',
    ask: [
      'Can staff enter the opening and closing meter of each vehicle and the DG set?',
      'Does it understand hour meters (JCB, loader) and KM meters (truck)?',
      'Does it calculate the average automatically?',
    ],
    crusherbook: 'Meter readings record the opening and closing KM or hour meter of every vehicle and the DG set. Loaders, JCBs and tractors use hours; trucks use KM. Put together with the diesel given, you see each vehicle’s running and average.',
    link: { to: '/crusher-plant-vehicle-mileage-tracking-software', label: 'Vehicle mileage tracking' },
  },
  {
    id: 'expenses',
    icon: Receipt,
    title: 'Expense tracking that site staff can keep up with',
    why: 'Electricity, food, repairs, salaries and office costs are paid every day in small amounts. If they are not recorded the same day, they are forgotten, and your profit looks better on paper than it really is.',
    ask: [
      'Does it come with ready expense heads like Electricity, Food and Repair & Maintenance?',
      'Can expenses be paid from cash or from a bank account?',
      'Can I see expenses by category for any month?',
    ],
    crusherbook: 'Expenses are recorded under types like Office Expense, Food, Electricity and Repair & Maintenance (ready on day one), paid from cash or bank. Reports show where the money went, by category and by month.',
    link: { to: '/crusher-plant-expense-tracking-software', label: 'Crusher expense tracking' },
  },
  {
    id: 'profit',
    icon: BarChart3,
    title: 'Profit you can trust, and party balances you can collect',
    why: 'In the end, the owner wants two answers: did I make money this month, and who still owes me? Both depend on every entry above being recorded correctly. Good software turns those entries into a profit and loss report and a party ledger without any extra work.',
    ask: [
      'Is there a profit and loss report for any period?',
      'Does every party have a ledger with a running balance?',
      'Can I send a party their balance on WhatsApp?',
    ],
    crusherbook: 'The profit and loss report puts sales against boulder, diesel and every other expense. Each party has a ledger with a running balance, and you can share the balance summary on WhatsApp in one tap.',
    link: { to: '/stone-crusher-accounting-software', label: 'Crusher accounting software' },
  },
  {
    id: 'whatsapp-alerts',
    icon: MessageCircle,
    title: 'Automatic WhatsApp alerts for pending balances',
    why: 'Udhari is the biggest worry for most crusher owners. Material goes out on credit every day, and calling each party to remind them takes time and feels awkward. When reminders depend on someone remembering, payments slip by weeks.',
    ask: [
      'Can the software send parties their pending balance on WhatsApp by itself, without me sending each one?',
      'Does the message show the correct balance from the ledger?',
      'Can I still send a reminder to one party whenever I want?',
    ],
    crusherbook: 'CrusherBook sends pending balance alerts to your clients on WhatsApp automatically, straight from the party ledger, so every party knows what they owe without you making a single call. You can also share any party’s balance summary on WhatsApp in one tap.',
    link: { to: '/crusher-plant-payment-reminder-software', label: 'Payment reminder software' },
  },
  {
    id: 'quotation',
    icon: FileText,
    title: 'A quotation generator for new orders',
    why: 'Builders, contractors and road projects ask for a quotation before they order. Writing one by hand or in Word every time is slow, rates get copied wrong, and the quotation does not look professional next to a bigger competitor’s.',
    ask: [
      'Can I make a quotation with materials and rates in a minute?',
      'Does it use my saved material rates, per ton or per cubic feet?',
      'Can I send the quotation to the client on WhatsApp?',
    ],
    crusherbook: 'CrusherBook has a quotation generator made for crusher plants. Pick the party and materials, and the quotation is ready with your rates, looking clean and professional, so you can answer an enquiry while the client is still on the phone.',
  },
];

const RED_FLAGS = [
  'It is general billing or accounting software with no idea of boulder, dump, hopper, gross/tare or ton vs cubic feet.',
  'Only English screens, so site staff cannot use it and entries go back to the register.',
  'Every staff login can see everything, including your profit and bank balance.',
  'No mobile access: you still have to visit the plant to know what happened today.',
  'Price only after a long sales process, with setup fees and yearly charges that are not written down.',
  'No one to call in your language when something does not work.',
];

const DEMO_QUESTIONS = [
  'Show me one full sale: vehicle in, weight, material, rate, bill and party balance.',
  'Show me a boulder load going to the dump, and then from the dump into the hopper.',
  'Show me how much stock is in my plant right now.',
  'Switch a staff login to Hindi. What exactly will my munshi see?',
  'Give diesel to a loader, enter its meter, and show me its average.',
  'Show me everything spent on one vehicle this month.',
  'Show me this month’s profit and loss.',
  'Show me a pending balance alert going to a party on WhatsApp.',
  'Make a quotation for 20mm and dust for a new client, right now.',
  'What can a staff login see, and what is hidden from them?',
];

const COMPARISON = [
  { need: 'Weighbridge weights flow into billing', register: false, general: false, crusherbook: true },
  { need: 'Boulder, dump and hopper records', register: false, general: false, crusherbook: true },
  { need: 'Sell per ton or per cubic feet, track both', register: false, general: false, crusherbook: true },
  { need: 'Diesel report, meter and average', register: false, general: false, crusherbook: true },
  { need: 'Vehicle-wise maintenance and hire', register: false, general: false, crusherbook: true },
  { need: 'Hindi screens for staff', register: true, general: false, crusherbook: true },
  { need: 'Party ledger and profit report', register: false, general: true, crusherbook: true },
  { need: 'Automatic WhatsApp balance alerts', register: false, general: false, crusherbook: true },
  { need: 'Quotation generator for crusher material', register: false, general: false, crusherbook: true },
  { need: 'Check from your phone, anywhere', register: false, general: false, crusherbook: true },
];

const FAQ = [
  {
    question: 'What is crusher plant ERP software?',
    answer: 'It is software made for stone crusher plants that keeps every part of the business in one place: sales and weighbridge slips, boulder purchase, stock, diesel and store items, vehicles, expenses, staff, party accounts and profit. It replaces registers, slip books and Excel sheets.',
  },
  {
    question: 'Is general accounting software enough for a crusher?',
    answer: 'It can keep your accounts, but it does not understand the work of a crusher: gross and tare weight, boulder on the dump, material sold per ton or per cubic feet, diesel given to a loader or vehicle average. Those are exactly the places where crushers lose money, so a crusher-specific ERP usually pays for itself faster.',
  },
  {
    question: 'Can my staff use the software in Hindi?',
    answer: 'With CrusherBook, yes. Each login picks English, Hindi, or both together, and the choice follows them to any phone or computer they sign in on.',
  },
  {
    question: 'Will my staff see my profit and bank balances?',
    answer: 'Not in CrusherBook. Staff logins only see the parts of the app the owner switches on, and never see the dashboard numbers, reports or cash and bank. They can edit only the entries they added.',
  },
  {
    question: 'I sell some customers per cubic feet. Can I still track stock in tons?',
    answer: 'Yes. CrusherBook lets you bill a sale per cubic feet and still record its weighbridge weight, so tons sold stays correct for your stock while the customer is billed by volume.',
  },
  {
    question: 'Can the software remind my parties about pending payments?',
    answer: 'Yes. CrusherBook sends automatic WhatsApp alerts to clients with their pending balance from the party ledger, so you do not have to call each party. You can also send any party their balance summary on WhatsApp in one tap.',
  },
  {
    question: 'Can I make quotations for new customers?',
    answer: 'Yes. CrusherBook has a quotation generator for crusher plants: choose the party and materials, and a professional quotation with your rates is ready to share.',
  },
  {
    question: 'How much does crusher ERP software cost?',
    answer: 'Prices vary a lot, and many vendors only share them after a demo. CrusherBook plans start from Rs 6,999 per year, with the price written on the pricing page.',
  },
  {
    question: 'How long does it take to start?',
    answer: 'Most plants start the same day. Add your materials, parties, vehicles and opening balances, and your staff can start making entries. The CrusherBook team helps you set up over WhatsApp or a phone call.',
  },
];

const buildSchema = () => {
  const url = `${SITE_URL}/${GUIDE_SLUG}`;
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: TITLE,
      description: DESCRIPTION,
      url,
      mainEntityOfPage: url,
      datePublished: PUBLISHED,
      dateModified: PUBLISHED,
      inLanguage: 'en-IN',
      author: { '@type': 'Organization', name: 'CrusherBook Team', url: SITE_URL },
      publisher: { '@type': 'Organization', name: 'CrusherBook', url: SITE_URL },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: item.answer },
      })),
    },
  ];
};

function Mark({ yes }) {
  return yes
    ? <CheckCircle2 className="mx-auto h-5 w-5 text-green-600" aria-label="Yes" />
    : <XCircle className="mx-auto h-5 w-5 text-gray-300" aria-label="No" />;
}

export default function CrusherErpBuyingGuide() {
  const [expandedFAQ, setExpandedFAQ] = useState(0);

  return (
    <div className="w-full">
      <Seo
        title={SEO_TITLE}
        description={DESCRIPTION}
        path={`/${GUIDE_SLUG}`}
        type="article"
        author="CrusherBook Team"
        publishedDate={PUBLISHED}
        modifiedDate={PUBLISHED}
        keywords={[
          'crusher plant ERP software',
          'how to choose crusher ERP',
          'best crusher plant software',
          'stone crusher ERP',
          'crusher software buying guide',
          'crusher software with weighbridge',
          'crusher software in Hindi',
        ]}
        schema={buildSchema()}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Guides', path: `/${GUIDE_SLUG}` },
        ]}
      />

      {/* Hero */}
      <header className="bg-gradient-to-b from-white via-orange-50/40 to-white px-4 pt-10 pb-10 sm:pt-14 sm:pb-12">
        <div className="mx-auto w-full max-w-3xl">
          <nav aria-label="Breadcrumb" className="mb-4 text-xs sm:text-sm text-brand-slate">
            <Link to="/" className="hover:text-brand-orange">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-brand-navy">Guides</span>
          </nav>
          <span className="mb-4 inline-block rounded-full bg-brand-orange/10 px-4 py-1.5 text-xs sm:text-sm font-semibold text-brand-orange">
            Buyer’s Guide
          </span>
          <h1 className="mb-5 text-3xl sm:text-4xl md:text-5xl font-bold leading-tight text-brand-navy">{TITLE}</h1>
          <p className="mb-5 text-base sm:text-lg leading-relaxed text-brand-slate">
            Choosing software for your crusher is not about the longest feature list. It is about one question:
            will it record what really happens at your plant, every day, without making work harder for your staff?
            This guide explains, in simple words, the twelve things the right crusher plant ERP must do, the questions
            to ask before you buy, and the warning signs to walk away from.
          </p>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-brand-slate">
            <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4" /> 9 min read</span>
            <span>Updated 16 October 2026</span>
            <span>By the CrusherBook Team</span>
          </p>
        </div>
      </header>

      <article className="px-4 pb-6">
        <div className="mx-auto w-full max-w-3xl space-y-12 sm:space-y-14">
          {/* Contents */}
          <nav aria-label="Contents" className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">
            <h2 className="mb-3 text-lg font-bold text-brand-navy">In this guide</h2>
            <ol className="list-decimal space-y-1.5 pl-5 text-sm sm:text-base text-brand-slate marker:text-brand-orange">
              <li><a href="#what-is-erp" className="hover:text-brand-orange">What crusher plant ERP software is</a></li>
              <li><a href="#before-you-start" className="hover:text-brand-orange">Before you start: know how your plant runs</a></li>
              <li><a href="#checklist" className="hover:text-brand-orange">The 12-point checklist</a></li>
              <li><a href="#compare" className="hover:text-brand-orange">Register vs general software vs crusher ERP</a></li>
              <li><a href="#red-flags" className="hover:text-brand-orange">Red flags to watch for</a></li>
              <li><a href="#demo-questions" className="hover:text-brand-orange">Questions to ask in a demo</a></li>
              <li><a href="#faq" className="hover:text-brand-orange">Frequently asked questions</a></li>
            </ol>
          </nav>

          {/* What it is */}
          <section id="what-is-erp" className="scroll-mt-24">
            <h2 className="mb-4 text-2xl sm:text-3xl font-bold text-brand-navy">What is crusher plant ERP software?</h2>
            <div className="space-y-4 text-base leading-relaxed text-brand-slate">
              <p>
                ERP simply means one system for the whole business. At a stone crusher, that business has more moving
                parts than most people expect: boulder coming in on the weighbridge, material going out by ton or by
                cubic feet, diesel going into loaders and the DG set, hired hyvas on monthly rent, staff salaries,
                electricity bills, and party balances that have to be collected.
              </p>
              <p>
                Most plants start with registers, slip books and an Excel sheet. That works when the plant is small and
                the owner is there all day. As soon as you are away, or the plant grows, the questions start: How much
                20mm is left? Which loader is eating diesel? Who has not paid for last month? A good crusher ERP answers
                these from your phone, because every slip is entered once, at the plant, as it happens.
              </p>
            </div>
          </section>

          {/* Before you start */}
          <section id="before-you-start" className="scroll-mt-24">
            <h2 className="mb-4 text-2xl sm:text-3xl font-bold text-brand-navy">Before you start: know how your plant runs</h2>
            <p className="mb-4 text-base leading-relaxed text-brand-slate">
              Spend ten minutes writing down how your plant works today. It makes every demo easier to judge, because you
              can check the software against your real day instead of the salesperson’s.
            </p>
            <ul className="grid gap-3 sm:grid-cols-2">
              {[
                'Who makes the entries: you, a munshi, a kanta operator? Which language are they comfortable in?',
                'Do you sell per ton, per cubic feet, or both?',
                'Is boulder always fed straight to the hopper, or sometimes unloaded on the dump?',
                'How many own vehicles, hired vehicles and machines do you run?',
                'Where does diesel come from: your own tank, a petrol pump on credit, or both?',
                'Which numbers do you want to see every evening on your phone?',
              ].map((item) => (
                <li key={item} className="flex gap-3 rounded-xl border border-gray-200 bg-white p-4 text-sm sm:text-base text-brand-slate">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-orange" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Checklist */}
          <section id="checklist" className="scroll-mt-24">
            <h2 className="mb-3 text-2xl sm:text-3xl font-bold text-brand-navy">The 12-point checklist</h2>
            <p className="mb-8 text-base leading-relaxed text-brand-slate">
              Use these twelve points to judge any crusher software. For each one you will find why it matters, what to
              ask in the demo, and how CrusherBook handles it.
            </p>
            <div className="space-y-8">
              {CHECKLIST.map((point, index) => {
                const Icon = point.icon;
                return (
                  <div key={point.id} id={point.id} className="scroll-mt-24 rounded-2xl border border-gray-200 bg-white p-5 sm:p-7 shadow-sm">
                    <div className="mb-4 flex items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="text-lg sm:text-xl font-bold leading-snug text-brand-navy">
                        <span className="text-brand-orange">{index + 1}.</span> {point.title}
                      </h3>
                    </div>
                    <p className="mb-4 text-base leading-relaxed text-brand-slate">{point.why}</p>
                    <div className="mb-4 rounded-xl bg-gray-50 p-4">
                      <p className="mb-2 text-sm font-bold text-brand-navy">Ask in the demo</p>
                      <ul className="space-y-1.5">
                        {point.ask.map((question) => (
                          <li key={question} className="flex gap-2 text-sm sm:text-base text-brand-slate">
                            <span className="text-brand-orange">•</span>
                            <span>{question}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-xl border border-brand-orange/20 bg-orange-50/50 p-4">
                      <p className="mb-1.5 text-sm font-bold text-brand-navy">How CrusherBook does it</p>
                      <p className="text-sm sm:text-base leading-relaxed text-brand-slate">{point.crusherbook}</p>
                      {point.link && (
                        <Link to={point.link.to} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-orange hover:underline">
                          {point.link.label} <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Bonus: staff access */}
          <section className="rounded-2xl bg-brand-navy p-6 sm:p-8 text-white">
            <div className="mb-3 flex items-center gap-3">
              <ShieldCheck className="h-6 w-6 text-brand-orange" />
              <h2 className="text-xl sm:text-2xl font-bold">One more thing: control what staff can see</h2>
            </div>
            <p className="text-base leading-relaxed text-white/80">
              Your munshi needs to make sale and diesel entries. They do not need to see your profit, your bank balance
              or every party’s dues. Good software gives each staff member their own login with only the screens they
              work on. In CrusherBook, staff never see dashboard numbers, reports or cash and bank, can edit only the
              entries they made, and every entry is saved with the name of the person who made it.
            </p>
          </section>

          {/* Comparison */}
          <section id="compare" className="scroll-mt-24">
            <h2 className="mb-4 text-2xl sm:text-3xl font-bold text-brand-navy">Register vs general software vs crusher ERP</h2>
            <p className="mb-5 text-base leading-relaxed text-brand-slate">
              General billing or accounting software is good at invoices and ledgers. What it misses is the crusher
              itself: weights, boulder, diesel and machines. That is where the money is lost.
            </p>
            <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
              <table className="w-full min-w-[520px] text-left text-sm sm:text-base">
                <thead className="bg-gray-50 text-brand-navy">
                  <tr>
                    <th className="px-4 py-3 font-bold">What you need</th>
                    <th className="px-3 py-3 text-center font-bold">Register / Excel</th>
                    <th className="px-3 py-3 text-center font-bold">General software</th>
                    <th className="px-3 py-3 text-center font-bold text-brand-orange">CrusherBook</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON.map((row) => (
                    <tr key={row.need} className="border-t border-gray-100">
                      <td className="px-4 py-3 text-brand-slate">{row.need}</td>
                      <td className="px-3 py-3"><Mark yes={row.register} /></td>
                      <td className="px-3 py-3"><Mark yes={row.general} /></td>
                      <td className="px-3 py-3 bg-orange-50/40"><Mark yes={row.crusherbook} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Red flags */}
          <section id="red-flags" className="scroll-mt-24">
            <h2 className="mb-5 text-2xl sm:text-3xl font-bold text-brand-navy">Red flags to watch for</h2>
            <ul className="space-y-3">
              {RED_FLAGS.map((flag) => (
                <li key={flag} className="flex gap-3 rounded-xl border border-red-100 bg-red-50/40 p-4 text-sm sm:text-base text-brand-slate">
                  <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                  <span>{flag}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Demo questions */}
          <section id="demo-questions" className="scroll-mt-24">
            <h2 className="mb-3 text-2xl sm:text-3xl font-bold text-brand-navy">Questions to ask in a demo</h2>
            <p className="mb-5 text-base leading-relaxed text-brand-slate">
              Do not just watch slides. Ask the salesperson to do these on the screen, with your own kind of entries.
              If they cannot show it, the software probably cannot do it.
            </p>
            <ol className="space-y-3">
              {DEMO_QUESTIONS.map((question, index) => (
                <li key={question} className="flex gap-3 rounded-xl border border-gray-200 bg-white p-4 text-sm sm:text-base text-brand-slate">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-orange text-sm font-bold text-white">{index + 1}</span>
                  <span className="pt-0.5">{question}</span>
                </li>
              ))}
            </ol>
          </section>

          {/* Summary + CTA */}
          <section className="rounded-2xl border border-brand-orange/30 bg-gradient-to-br from-orange-50 to-white p-6 sm:p-8 text-center">
            <Truck className="mx-auto mb-3 h-8 w-8 text-brand-orange" />
            <h2 className="mb-3 text-2xl sm:text-3xl font-bold text-brand-navy">CrusherBook: a complete ERP for crusher plant owners</h2>
            <p className="mx-auto mb-6 max-w-2xl text-base leading-relaxed text-brand-slate">
              Weighbridge entries, boulder and dump records, stock in tons and cubic feet, material and store tracking,
              vehicle maintenance, diesel, meter and average, expenses, staff, party ledger, automatic WhatsApp balance
              alerts, quotations and profit, in English and Hindi, on your phone. Made to make the owner’s work easy. Plans start from Rs 6,999 per year.
            </p>
            <ContactActions primaryLabel="Get Free Demo on WhatsApp" secondaryLabel="Call Now" />
            <p className="mt-4 text-sm text-brand-slate">
              <Link to="/pricing" className="font-semibold text-brand-orange hover:underline">See pricing</Link>
              <span className="mx-2">·</span>
              <Link to="/features" className="font-semibold text-brand-orange hover:underline">All features</Link>
            </p>
          </section>

          {/* FAQ */}
          <section id="faq" className="scroll-mt-24 pb-6">
            <h2 className="mb-6 text-2xl sm:text-3xl font-bold text-brand-navy text-center">Frequently Asked Questions</h2>
            <div className="space-y-3">
              {FAQ.map((item, index) => (
                <button
                  key={item.question}
                  type="button"
                  onClick={() => setExpandedFAQ(expandedFAQ === index ? -1 : index)}
                  aria-expanded={expandedFAQ === index}
                  className="w-full rounded-xl border border-gray-200 bg-white text-left shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex items-center justify-between gap-3 p-5">
                    <h3 className="text-base sm:text-lg font-bold text-brand-navy">{item.question}</h3>
                    <ChevronDown className={`h-5 w-5 shrink-0 text-brand-navy transition-transform ${expandedFAQ === index ? 'rotate-180' : ''}`} />
                  </div>
                  {expandedFAQ === index && (
                    <div className="border-t border-gray-100 px-5 py-4">
                      <p className="text-sm sm:text-base leading-relaxed text-brand-slate">{item.answer}</p>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </section>
        </div>
      </article>
    </div>
  );
}
