// Keyword-targeted landing pages. Each entry renders through pages/KeywordLanding.jsx
// at /<slug>. Keep copy unique per page — duplicate text across these hurts ranking.

export const landingPages = [
  {
    slug: 'stone-crusher-management-software',
    navLabel: 'Stone Crusher Management Software',
    seoTitle: 'Stone Crusher Management Software for Plant Owners',
    description:
      'Stone crusher management software to run sales slips, boulder entry, stock, party ledger, diesel & expenses from one screen. Free demo on WhatsApp.',
    keywords: [
      'stone crusher management software',
      'crusher management system',
      'crusher plant management software',
      'stone crusher software',
      'crusher plant software India',
      'stone crusher management system',
    ],
    eyebrow: 'Crusher Management System',
    h1: 'Stone Crusher Management Software That Runs Your Whole Plant',
    intro:
      'CrusherBook replaces the registers, slip books, and Excel sheets at your crusher with one simple system. Every truck, every boulder load, every rupee spent on diesel and every party balance is recorded the moment it happens — so you see the real position of your plant from your phone, anytime.',
    painTitle: 'Problems every crusher owner knows',
    painPoints: [
      {
        title: 'Slips go missing',
        text: 'Paper sales slips and boulder slips get lost, torn, or entered twice. At month end, dispatch never matches billing.',
      },
      {
        title: 'No idea of real stock',
        text: 'How much 20mm, 40mm, dust, or GSB is actually lying in the yard? Without live stock, you either over-promise or lose orders.',
      },
      {
        title: 'Owner must be on site',
        text: 'If you are not at the plant, you do not know what was sold, who took material on credit, or how much diesel was used.',
      },
    ],
    featuresTitle: 'Everything a crusher plant needs to manage',
    features: [
      { icon: 'truck', title: 'Sales slip & dispatch', text: 'Create sales slips with vehicle number, material, weight, rate, and party in seconds. Every dispatch goes straight into stock and ledger.' },
      { icon: 'mountain', title: 'Boulder entry', text: 'Record every boulder load from mines or suppliers with vehicle, weight, and rate, so raw material cost is always known.' },
      { icon: 'boxes', title: 'Live stock of every size', text: 'See stock of each product — 10mm, 20mm, 40mm, dust, GSB, WMM — updated automatically after every sale and production entry.' },
      { icon: 'users', title: 'Party ledger', text: 'Know what each customer and supplier owes you, with full transaction history and one-tap WhatsApp balance reminders.' },
      { icon: 'fuel', title: 'Diesel & expenses', text: 'Log diesel, spare parts, labour, and electricity expenses by group. The diesel consumption report shows where fuel is going.' },
      { icon: 'userCog', title: 'Employee access control', text: 'Give supervisors and munshis their own login with only the screens they need — pricing and profit stay private.' },
    ],
    stepsTitle: 'How crusher management works in CrusherBook',
    steps: [
      { title: 'Boulder comes in', text: 'Boulder entry records supplier, vehicle, and weight — raw material stock goes up.' },
      { title: 'Material is crushed', text: 'Material-used entries convert boulder into finished sizes in stock.' },
      { title: 'Truck is dispatched', text: 'Sales slip is created (or read from a slip photo by AI) and stock goes down.' },
      { title: 'Money is tracked', text: 'Receipts and payments update the party ledger; daybook and profit report update instantly.' },
    ],
    faq: [
      { question: 'What is stone crusher management software?', answer: 'It is software built specifically for crusher plants to record sales dispatch, boulder purchase, production, stock, party accounts, and expenses in one place instead of registers and Excel. CrusherBook is designed around the daily workflow of Indian stone crusher plants.' },
      { question: 'Can I use CrusherBook on my mobile phone?', answer: 'Yes. CrusherBook works on mobile, tablet, and computer. Owners usually check the daybook, stock, and party balances on their phone while staff do entries at the plant.' },
      { question: 'Do I need a weighbridge to use it?', answer: 'No. You can start with manual or slip-photo entry. If you have a weighbridge, the Advanced plan supports weighbridge-based entry so weights come in without retyping.' },
      { question: 'How long does it take to start?', answer: 'Most plants start the same day. Our team helps you add your products, parties, and opening balances over a WhatsApp or phone call.' },
      { question: 'Can I manage more than one crusher?', answer: 'Yes. The Enterprise plan supports multi-plant management with combined stock and profit reports.' },
    ],
    related: ['stone-crusher-accounting-software', 'crusher-billing-software', 'crusher-hisab-kitab-app'],
  },
  {
    slug: 'stone-crusher-accounting-software',
    navLabel: 'Stone Crusher Accounting Software',
    seoTitle: 'Stone Crusher Accounting Software – Ledger, Daybook, P&L',
    description:
      'Stone crusher accounting software with party ledger, daybook, cash & bank book, receipts, payments and profit & loss. Built for crusher plants in India.',
    keywords: [
      'stone crusher accounting software',
      'crusher accounting software',
      'accounting software for stone crusher',
      'crusher ledger software',
      'stone crusher account management',
      'crusher daybook software',
    ],
    eyebrow: 'Crusher Accounting',
    h1: 'Stone Crusher Accounting Software Made for Crusher Businesses',
    intro:
      'Generic accounting software does not understand boulders, dispatch slips, or material sizes. CrusherBook does. Your sales, purchases, receipts, payments, and expenses flow into party ledgers, the daybook, and your profit and loss report automatically — without a separate accountant re-entering everything.',
    painTitle: 'Why crusher accounts get messy',
    painPoints: [
      {
        title: 'Double entry work',
        text: 'Staff write slips at the plant, then someone types them again into Tally or Excel. Mistakes creep in at every step.',
      },
      {
        title: 'Credit is out of control',
        text: 'Contractors and builders take material on credit. Without a clean ledger, outstanding amounts keep growing unnoticed.',
      },
      {
        title: 'Profit is a guess',
        text: 'Boulder cost, diesel, labour, and electricity are spread across notebooks, so true profit per month is never clear.',
      },
    ],
    featuresTitle: 'Accounting features built for crushers',
    features: [
      { icon: 'users', title: 'Party-wise ledger', text: 'Every customer and supplier gets a running ledger with opening balance, sales, purchases, receipts, payments, and returns.' },
      { icon: 'book', title: 'Daybook', text: 'A complete day-wise record of every transaction — print it or share it with your CA in one click.' },
      { icon: 'landmark', title: 'Cash & bank accounts', text: 'Record receipts and payments against cash or multiple bank accounts and always know your balance.' },
      { icon: 'receipt', title: 'Receipts & payments', text: 'Money received and paid is linked to parties so outstanding balances update instantly.' },
      { icon: 'wallet', title: 'Expense groups', text: 'Organise diesel, repairs, salaries, electricity, and royalty under expense groups for clear cost reports.' },
      { icon: 'chart', title: 'Profit & loss report', text: 'See sales, material cost, and expenses together in a crusher-specific P&L for any date range.' },
    ],
    stepsTitle: 'From slip to balance sheet — automatically',
    steps: [
      { title: 'Entry at the plant', text: 'Sales and boulder slips are entered once, at the source.' },
      { title: 'Ledger updates', text: 'Party ledgers and stock update from the same entry — no re-typing.' },
      { title: 'Money is recorded', text: 'Receipts and payments are tagged to cash or bank and to the party.' },
      { title: 'Reports are ready', text: 'Daybook, outstanding list, and P&L are always up to date for you and your CA.' },
    ],
    faq: [
      { question: 'Is CrusherBook a replacement for Tally?', answer: 'CrusherBook handles the day-to-day crusher accounts — ledgers, daybook, receipts, payments, expenses, and P&L. Many plants use it for daily operations and share reports with their CA for final filing.' },
      { question: 'Can I track outstanding payments from contractors?', answer: 'Yes. Every party ledger shows the pending balance, and you can send balance reminders to customers on WhatsApp.' },
      { question: 'Does it support multiple bank accounts?', answer: 'Yes. You can add multiple bank accounts along with cash, and record each receipt or payment against the right account.' },
      { question: 'Can I see profit month by month?', answer: 'Yes. The profit and loss report works for any date range, so you can compare months or seasons.' },
    ],
    related: ['stone-crusher-management-software', 'crusher-billing-software', 'quarry-management-software'],
  },
  {
    slug: 'crusher-billing-software',
    navLabel: 'Crusher Billing Software',
    seoTitle: 'Crusher Billing Software – Fast Sales Slips & Dispatch',
    description:
      'Crusher billing software for fast sales slips, AI slip photo entry, weighbridge weights, rate by party and WhatsApp bills. Try CrusherBook free.',
    keywords: [
      'crusher billing software',
      'stone crusher billing software',
      'crusher bill software',
      'aggregate billing software',
      'gitti billing software',
      'crusher invoice software',
    ],
    eyebrow: 'Crusher Billing',
    h1: 'Crusher Billing Software for Fast, Error-Free Dispatch',
    intro:
      'At a busy crusher, trucks are waiting and billing has to be fast. CrusherBook lets your munshi create a sales slip in seconds — or simply click a photo of the weighbridge slip and let AI fill vehicle, weight, and party. Stock and ledger update on their own.',
    painTitle: 'What slows down crusher billing',
    painPoints: [
      {
        title: 'Queues at the gate',
        text: 'Hand-written slips and manual calculations make trucks wait, especially in peak construction season.',
      },
      {
        title: 'Wrong weights and rates',
        text: 'Retyping weighbridge numbers and remembering each party’s rate leads to under-billing and disputes.',
      },
      {
        title: 'Unbilled trucks',
        text: 'When billing is separate from dispatch, some loads simply never get billed.',
      },
    ],
    featuresTitle: 'Billing built around the crusher gate',
    features: [
      { icon: 'camera', title: 'AI slip photo entry', text: 'Upload a photo of the weighbridge or sales slip — AI reads vehicle number, weight, and date and fills the bill.' },
      { icon: 'scale', title: 'Weighbridge entry', text: 'Gross, tare, and net weight captured for every vehicle so billing matches the scale exactly.' },
      { icon: 'truck', title: 'Vehicle master', text: 'Save regular vehicles with tare weight and owner — repeat trucks are billed in a couple of taps.' },
      { icon: 'receipt', title: 'GST-ready bills', text: 'Generate sales bills with the right material, quantity, rate, and tax, ready to share or print.' },
      { icon: 'message', title: 'WhatsApp bills & reminders', text: 'Send bill details and pending balance reminders to customers on WhatsApp.' },
      { icon: 'undo', title: 'Sale returns', text: 'Record returned or rejected loads so stock and party balance stay correct.' },
    ],
    stepsTitle: 'Billing a truck in CrusherBook',
    steps: [
      { title: 'Truck arrives', text: 'Pick the vehicle — saved tare weight and party load automatically.' },
      { title: 'Weight is captured', text: 'Enter or upload the weighbridge slip; net weight is calculated.' },
      { title: 'Bill is created', text: 'Material and rate are applied and the sales slip is saved.' },
      { title: 'Customer is informed', text: 'Stock, ledger, and daybook update, and the customer can be notified on WhatsApp.' },
    ],
    faq: [
      { question: 'Can I bill in tonnes as well as brass or cubic feet?', answer: 'CrusherBook bills by the unit you set for each product, so plants that sell by tonne or by volume can both use it.' },
      { question: 'Does AI slip entry work with any weighbridge slip?', answer: 'It works with standard printed weighbridge and sales slips. You can always review and correct the filled data before saving.' },
      { question: 'Can I set different rates for different parties?', answer: 'Yes. Rates can be entered per sale, so each contractor or builder can be billed at their agreed rate.' },
      { question: 'Can I record cash and credit sales separately?', answer: 'Yes. Cash sales and credit sales are both supported, and credit sales automatically go into the party ledger.' },
    ],
    related: ['crusher-weighbridge-software', 'stone-crusher-accounting-software', 'stone-crusher-management-software'],
  },
  {
    slug: 'crusher-weighbridge-software',
    navLabel: 'Crusher Weighbridge Software',
    seoTitle: 'Weighbridge Software for Stone Crusher Plants',
    description:
      'Weighbridge software for stone crushers: capture gross, tare and net weight, link every weighment to billing, stock and party ledger. Book a demo today.',
    keywords: [
      'weighbridge software for crusher',
      'crusher weighbridge software',
      'weighbridge billing software',
      'weighbridge integration software',
      'dharam kanta software',
      'weighbridge slip software',
    ],
    eyebrow: 'Weighbridge + Crusher',
    h1: 'Weighbridge Software Connected to Your Crusher Billing',
    intro:
      'A weighbridge on its own only prints a slip. CrusherBook connects each weighment to the sale, the stock, and the party account — so the weight on the scale is exactly what gets billed and exactly what leaves your stock.',
    painTitle: 'Where weighbridge data leaks',
    painPoints: [
      {
        title: 'Weights typed twice',
        text: 'The dharam kanta prints one slip and billing is typed again. Every retype is a chance for a wrong number.',
      },
      {
        title: 'Tare weight tricks',
        text: 'Without saved tare weights per vehicle, it is hard to spot loads that do not add up.',
      },
      {
        title: 'Slips not reconciled',
        text: 'Weighbridge slips, sales slips, and stock registers are rarely matched, so leakage goes unnoticed.',
      },
    ],
    featuresTitle: 'Weighbridge features in CrusherBook',
    features: [
      { icon: 'scale', title: 'Gross, tare & net', text: 'Record gross and tare weight for each vehicle; net weight is calculated for billing.' },
      { icon: 'truck', title: 'Vehicle tare memory', text: 'Saved vehicles remember their tare weight so repeat trips are quick and consistent.' },
      { icon: 'camera', title: 'Slip photo to entry', text: 'Click the kanta slip — AI reads the weight and vehicle number and fills the entry.' },
      { icon: 'boxes', title: 'Linked to stock', text: 'Every outgoing weighment reduces stock of that product automatically.' },
      { icon: 'mountain', title: 'Inward boulder weight', text: 'Incoming boulder loads are weighed and recorded against the supplier.' },
      { icon: 'chart', title: 'Weight-wise reports', text: 'See material dispatched by day, party, vehicle, or product from the recorded weights.' },
    ],
    stepsTitle: 'Weighbridge-to-bill flow',
    steps: [
      { title: 'Vehicle on scale', text: 'Vehicle is identified and tare weight is loaded.' },
      { title: 'Loaded weight', text: 'Gross weight is recorded after loading.' },
      { title: 'Net & bill', text: 'Net weight becomes the sale quantity with the party’s rate.' },
      { title: 'Stock & ledger', text: 'Stock goes down and the party ledger goes up — nothing retyped.' },
    ],
    faq: [
      { question: 'Does CrusherBook work with my existing weighbridge?', answer: 'Yes. You can start by entering or photographing the weighbridge slip. The Advanced plan adds weighbridge-based entry for faster weight capture — talk to us about your weighbridge model.' },
      { question: 'Is weighbridge software included in all plans?', answer: 'Manual weight entry is in every plan. Weighbridge entry and AI slip photo entry are part of the Advanced and Enterprise plans.' },
      { question: 'Can I use it for boulder purchase weighments too?', answer: 'Yes. Inward boulder weighments are recorded against suppliers and added to raw material stock.' },
    ],
    related: ['crusher-billing-software', 'stone-crusher-management-software', 'quarry-management-software'],
  },
  {
    slug: 'quarry-management-software',
    navLabel: 'Quarry Management Software',
    seoTitle: 'Quarry Management Software for Mines & Crushers',
    description:
      'Quarry management software for boulder from mines, crushing, dispatch, royalty, diesel and vehicle tracking. Simple cloud software for Indian quarries.',
    keywords: [
      'quarry management software',
      'quarry software India',
      'mines and crusher software',
      'quarry and crusher ERP',
      'mining crusher management software',
      'quarry billing software',
    ],
    eyebrow: 'Quarry + Crusher',
    h1: 'Quarry Management Software for Mines and Crusher Units',
    intro:
      'When you run both a quarry and a crusher, material moves from the mine face to the crusher to the customer. CrusherBook tracks every step — boulder from the mine, material used in crushing, finished stock, dispatch, royalty, and the diesel your machines burn.',
    painTitle: 'Challenges of running a quarry',
    painPoints: [
      {
        title: 'Mine to crusher gap',
        text: 'Boulder extracted and boulder crushed are rarely compared, hiding losses and theft.',
      },
      {
        title: 'Heavy diesel cost',
        text: 'Excavators, loaders, dumpers, and DG sets burn diesel all day with little accountability.',
      },
      {
        title: 'Compliance pressure',
        text: 'Royalty and transit records must match dispatch, and manual registers make that painful.',
      },
    ],
    featuresTitle: 'Built for quarry operations',
    features: [
      { icon: 'mountain', title: 'Boulder tracking', text: 'Record boulder from your own mines or from outside suppliers, with vehicle and weight.' },
      { icon: 'factory', title: 'Material used / production', text: 'Material-used entries show how much boulder went into crushing and what came out.' },
      { icon: 'fuel', title: 'Diesel consumption report', text: 'Track diesel issued to each machine and vehicle and spot unusual consumption.' },
      { icon: 'landmark', title: 'Royalty records', text: 'Keep royalty tracked alongside dispatch for compliance and audits.' },
      { icon: 'truck', title: 'Vehicle management', text: 'Maintain your dumpers, tippers, and hired vehicles with trip-wise records.' },
      { icon: 'building', title: 'Multi-site view', text: 'Manage more than one quarry or crusher with combined reports on the Enterprise plan.' },
    ],
    stepsTitle: 'Mine to money, tracked',
    steps: [
      { title: 'Extract', text: 'Boulder from the mine is recorded as inward stock.' },
      { title: 'Crush', text: 'Material used converts boulder into finished aggregate sizes.' },
      { title: 'Dispatch', text: 'Sales slips reduce stock and record royalty and party.' },
      { title: 'Review', text: 'Diesel, expenses, and P&L show what each tonne really cost.' },
    ],
    faq: [
      { question: 'Is CrusherBook suitable for small quarries?', answer: 'Yes. Plans start at Rs 4,999 per year and the software is simple enough for a single munshi to run.' },
      { question: 'Can I track diesel for each machine?', answer: 'Yes. Record diesel issued against machines or vehicles and use the diesel consumption report to compare usage.' },
      { question: 'Can I manage both mine and crusher in one account?', answer: 'Yes. Boulder inward, crushing, and dispatch are all part of the same flow, and multi-plant is available on the Enterprise plan.' },
    ],
    related: ['stone-crusher-management-software', 'crusher-weighbridge-software', 'stone-crusher-accounting-software'],
  },
  {
    slug: 'crusher-hisab-kitab-app',
    navLabel: 'Crusher Hisab Kitab App',
    seoTitle: 'Crusher Hisab Kitab App – गिट्टी क्रशर का हिसाब',
    description:
      'Crusher hisab kitab app: गिट्टी क्रशर की बिक्री, बोल्डर, स्टॉक, पार्टी उधारी और डीजल का पूरा हिसाब मोबाइल पर। Simple crusher app with free demo.',
    keywords: [
      'crusher hisab kitab app',
      'crusher ka hisab app',
      'gitti crusher software',
      'क्रशर हिसाब ऐप',
      'stone crusher app',
      'crusher udhari app',
    ],
    eyebrow: 'Crusher ka Hisab',
    h1: 'Crusher Hisab Kitab App – गिट्टी क्रशर का पूरा हिसाब मोबाइल पर',
    intro:
      'रजिस्टर और डायरी का झंझट खत्म। CrusherBook से अपने क्रशर की हर गाड़ी, हर बोल्डर, हर पार्टी की उधारी और डीजल का खर्चा — सब मोबाइल पर देखें। Munshi entry kare, owner kahin se bhi hisab dekhe.',
    painTitle: 'रजिस्टर वाले हिसाब की परेशानियाँ',
    painPoints: [
      {
        title: 'पर्ची खो जाती है',
        text: 'Kagaz ki parchi gum ho jati hai ya do baar likh di jati hai. Mahine ke end mein hisab milta hi nahi.',
      },
      {
        title: 'उधारी का पता नहीं',
        text: 'Kis party ka kitna paisa baki hai, yeh yaad rakhna mushkil hai. Udhari badhti rehti hai.',
      },
      {
        title: 'प्लांट पर रहना ज़रूरी',
        text: 'Owner plant par na ho toh pata nahi chalta ki aaj kitni gaadi gayi aur kitna diesel laga.',
      },
    ],
    featuresTitle: 'App में क्या-क्या मिलेगा',
    features: [
      { icon: 'truck', title: 'बिक्री पर्ची (Sales slip)', text: 'Gaadi number, maal, wajan aur rate daalo — parchi turant ban jati hai.' },
      { icon: 'camera', title: 'फोटो से एंट्री', text: 'Kanta parchi ki photo kheecho, AI khud gaadi number aur wajan bhar deta hai.' },
      { icon: 'users', title: 'पार्टी खाता (उधारी)', text: 'Har party ka khata — kitna maal gaya, kitna paisa aaya, kitna baki. WhatsApp par yaad dilayein.' },
      { icon: 'boxes', title: 'स्टॉक', text: '10mm, 20mm, 40mm, dust — har size ka stock apne aap update hota hai.' },
      { icon: 'fuel', title: 'डीजल और खर्चा', text: 'Diesel, mazdoori, bijli, spare parts — har kharcha likho aur report dekho.' },
      { icon: 'book', title: 'रोज़नामचा (Daybook)', text: 'Aaj ka pura hisab ek screen par — bikri, aamad, kharcha, sab.' },
    ],
    stepsTitle: 'कैसे शुरू करें',
    steps: [
      { title: 'WhatsApp करें', text: 'Humein WhatsApp par message karein, hum demo dikhayenge.' },
      { title: 'खाता बनाएं', text: 'Apne maal, parties aur purani baki hum set karwa denge.' },
      { title: 'Munshi को login', text: 'Munshi ko alag login dein — rate aur munafa sirf aap dekhein.' },
      { title: 'कहीं से भी देखें', text: 'Mobile par roz ka hisab, stock aur udhari dekhein.' },
    ],
    faq: [
      { question: 'क्या यह ऐप हिंदी समझने वालों के लिए आसान है?', answer: 'Haan. CrusherBook bahut simple hai aur hamari team Hindi mein phone ya WhatsApp par setup aur training karwati hai.' },
      { question: 'इसकी कीमत कितनी है?', answer: 'Plan Rs 4,999 saal se shuru hote hain. Pehle free demo dekhein, phir decide karein.' },
      { question: 'क्या मुंशी एंट्री कर सकता है और मालिक मोबाइल पर देख सकता है?', answer: 'Haan. Munshi ko alag login milta hai, aur owner apne mobile par roz ka hisab, stock aur party ki baki dekh sakta hai.' },
      { question: 'क्या डेटा सुरक्षित है?', answer: 'Haan. Aapka data cloud par surakshit rehta hai aur har user sirf wahi dekh sakta hai jo aap allow karein.' },
    ],
    related: ['stone-crusher-management-software', 'stone-crusher-accounting-software', 'crusher-billing-software'],
  },
];

export const landingPageBySlug = Object.fromEntries(landingPages.map((page) => [page.slug, page]));
