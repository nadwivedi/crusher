# CrusherBook (crusherbook.com) technical and on-page SEO audit, 16 October 2026

Method: I read the repo at `C:\Users\Naray\OneDrive\Desktop\code\crusher\webpage` (commit 277d822) without changing it. I fetched the live site with curl, sending the Googlebot, GPTBot and ClaudeBot user agents, and rendered it with headless Chrome (`--dump-dom`) on 2026-10-16 between about 17:30 and 17:40 GMT. **A deploy landed during the audit, at 17:33 GMT.** Before it, the live HTML loaded `index-C33VnR3x.js` (590,654 B) and the sitemap had 34 URLs. After it, the live HTML loads `index-CwbwtVPf.js` (622,435 B), the same file as the local `dist/`, and the sitemap has 35 URLs. Everything below describes the state after the deploy unless marked otherwise. Repo file sources are cited as local paths.

## 1. What raw HTML do search engines and AI crawlers get today? Is the site still a client-only SPA shell, and are the sitemap and routes in sync?

### Takeaway
It is still a pure client-side SPA shell. Every URL, real or not, with or without www or a trailing slash, returns HTTP 200 and the same 4,994-byte `index.html`. That file carries the homepage title, the homepage description, `canonical=https://crusherbook.com/`, an empty `<div id="root">` and the unverified 4.8/250 rating schema. **Since the earlier audit the sitemap and the routes have come into sync (35 = 35), but none of the structural problems have been fixed.** The new headless-Chrome check found something worse than before: after JavaScript runs, every page has **two `<title>`, two meta descriptions, two canonicals and two `og:url` tags**, and the homepage version comes first in each pair.

### Cited Findings
**Raw HTTP responses (curl, Googlebot UA, 2026-10-16)**

| URL requested | Status | Body |
|---|---|---|
| https://crusherbook.com/ | 200 | 4,994 B shell, gzip |
| /stone-crusher-management-software | 200 | identical 4,994 B shell |
| /stone-crusher-management-software/ (trailing slash) | 200, no redirect | identical shell |
| /how-to-choose-crusher-plant-erp-software (new guide) | 200 | identical shell |
| /crusher-udhari-payment-reminder-app | 200 | identical shell |
| /this-page-does-not-exist-xyz | **200** (soft 404) | identical shell |
| /llms.txt | **200, text/html** | the SPA shell (no llms.txt exists) |
| /index.html | 200 | duplicate of / |
| https://www.crusherbook.com/ | **200, no redirect** | identical shell |
| http://crusherbook.com/ | 301 to https://crusherbook.com/ | — |
| http://www.crusherbook.com/ | 301 to **https://www.**crusherbook.com/ (stays on www) | — |
| /robots.txt | 200 text/plain, 69 B | `User-agent: * / Allow: / / Sitemap: …` |
| /sitemap.xml | 200 text/xml | 35 `<loc>` |

Sources: [crusherbook.com](https://crusherbook.com/), [robots.txt](https://crusherbook.com/robots.txt), [sitemap.xml](https://crusherbook.com/sitemap.xml) (live fetches, 2026-10-16).

- The raw HTML of every URL contains: `<title>CrusherBook | Stone Crusher Plant ERP Software</title>`; `meta description` "CrusherBook is stone crusher plant ERP software for sales slips, boulder entry, stock, party ledger, expenses, weighbridge workflow, and profit reports."; `<link rel="canonical" href="https://crusherbook.com/">`; `og:url` = homepage; an Organization JSON-LD and a SoftwareApplication JSON-LD with `aggregateRating` 4.8 / `ratingCount` 250. The body is only `<div id="root"></div>`, with **no H1, no body text and no internal links**. The response is the same on every URL — [live shell](https://crusherbook.com/stone-crusher-management-software); the source is `webpage/index.html`.
- GPTBot and ClaudeBot user agents both get 200 and the same shell. No bot is blocked or treated differently — [live fetch](https://crusherbook.com/crusher-billing-software).
- **Rendered DOM (headless Chrome, live `/crusher-billing-software`):** it has `<title>Crusher Billing Software – Fast Sales Slips & Dispatch | CrusherBook</title>` **and** `<title>CrusherBook | Stone Crusher Plant ERP Software</title>`; two meta descriptions (homepage first); **`<link rel="canonical" href="https://crusherbook.com/">` and `<link rel="canonical" href="https://crusherbook.com/crusher-billing-software">`**; two `og:url` tags; H1 "Crusher Billing Software for Fast, Error-Free Dispatch"; and 3 JSON-LD blocks. The new guide renders the same way: two titles, two canonicals (homepage first), H1 "A Beginner's Guide to Choosing the Right Crusher Plant ERP Software" — [live render](https://crusherbook.com/how-to-choose-crusher-plant-erp-software).
- Why the tags are duplicated: react-helmet-async **v3.0.0** is installed. On React 19 it "renders real DOM elements" and "`<HelmetProvider>` becomes a transparent passthrough", so it no longer finds and replaces the static tags already in `index.html`. React adds its own tags alongside them — [react-helmet-async README](https://github.com/staylor/react-helmet-async); installed versions are react 19.2.4, react-router-dom 7.13.2, react-helmet-async 3.0.0, vite 8.0.3 (`webpage/node_modules/*/package.json`).
- Google: "The best way to set the canonical URL is to use HTML"; if JavaScript sets it, "make sure that you always set the canonical URL to the same value as the original HTML"; "Conflicting or multiple rel=\"canonical\" link tags may lead to unexpected results." Googlebot "queues all pages with a 200 HTTP status code for rendering", and SSR or pre-rendering "is still a great idea" because "not all bots can run JavaScript" — [Google JS SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics).
- The rendered 404 page has the homepage title and canonical, and its `<main class="flex-grow"></main>` is empty (no catch-all route in `App.jsx`). That is a textbook soft 404. Google suggests a JS redirect to a real server 404 or a JS-added `noindex` on error pages — [Google JS SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics); source `webpage/src/App.jsx`.
- An unknown landing-page slug inside `KeywordLanding` does `<Navigate to="/" replace />`, which is a client-side redirect to the homepage. This only applies to slugs that are not in the route list — `webpage/src/pages/KeywordLanding.jsx`.
- Server: `nginx/1.24.0 (Ubuntu)`, with no HSTS, X-Robots-Tag or CSP headers seen — [live headers](https://crusherbook.com/).

**Sitemap and route sync**
- `App.jsx` defines 6 static routes (/, /features, /about, /pricing, /contact, /how-to-choose-crusher-plant-erp-software) plus 29 slugs from `landingPages.js`, so **35 routes**. The live sitemap now lists the same 35 URLs. Before the 17:33 deploy, the live sitemap had 34 and lacked the guide — `webpage/src/App.jsx`, `webpage/public/sitemap.xml`, [live sitemap](https://crusherbook.com/sitemap.xml).
- In the sitemap every keyword page has `priority 0.9` and `changefreq monthly`. Google ignores `priority` and `changefreq` — [Google sitemaps docs](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).

**Status against the earlier audit** (earlier claims from `reports/CrusherBook SEO growth plan.md`, checked 2026-10-11)

| Earlier finding | Status 2026-10-16 |
|---|---|
| Every URL serves the same empty shell | **Still broken** |
| Raw canonical points to homepage on every URL | **Still broken, now worse**: the rendered DOM has two conflicting canonicals |
| No prerendering / SSR | **Still broken** (`vite.config.js` has only the react + tailwind plugins; build is `vite build`) |
| www and non-www both serve 200 | **Still broken**; http://www even 301s to https://www |
| Trailing slash not redirected | **Still broken** |
| Unknown URLs return 200 (soft 404), no 404 route | **Still broken** |
| Sitemap out of date (11 live vs 15 repo) | **Fixed**: 35 live = 35 repo = 35 routes |
| Live bundle older than repo | **Fixed** as of the 17:33 GMT deploy |
| Unverifiable aggregateRating 4.8 / 250 | **Still broken** (`index.html`, `Home.jsx`) |
| JS served uncompressed, no Cache-Control | **Still broken** (bundle grew from 492 KB to 622 KB) |
| Double brand in titles ("… \| CrusherBook \| CrusherBook") | **Still broken** on `/` and `/quarry-crusher-management-software` |
| Organization uses invalid `contact` property, email mismatch | **Still broken** |
| Organization schema emitted twice | **Still broken** (static + Helmet, plus About's own Organization) |
| "Offline support", "Offline Variant + Lifetime Plan", "Royalty Management" claims | **Still present** in `Features.jsx` |
| Hindi pages declare `lang="en"` | **Still broken** (`Seo.jsx` hard-codes `<html lang="en">`) |
| OG image misspelled `cruhserbook.webp` | **Still present**, and also wrong size (see §5) |

### Inferences
- Google can still index each landing page after rendering, but the raw HTML says every page is a copy of the homepage. The rendered HTML then gives two canonicals, homepage first. The most likely outcome is that Google folds most of the 35 URLs into `/` or picks canonicals unpredictably. This is still the single biggest blocker.
- Non-JS crawlers (GPTBot, ClaudeBot, PerplexityBot, Bing's lighter passes, WhatsApp/LinkedIn link previews) see 35 identical homepages with no body text. For AI answer engines the site has no content at all.

### Gaps
- I could not see Google Search Console coverage, the "Google-selected canonical" or URL Inspection rendered HTML. These need the owner's GSC access.
- I could not see the nginx config, so the redirect and `try_files` behaviour is inferred from responses.

## 2. Page-by-page inventory: titles, descriptions, H1s, targets, length, links, cannibalization, schema

### Takeaway
There are 35 indexable routes: 5 static pages, 1 long article and 29 templated keyword pages. The 29 pages share one template (pain points, features, steps, FAQ, three related links) at about 380-680 words each. Titles often run past 60 characters once " | CrusherBook" is added, and 19 descriptions run past 160. There is heavy cannibalization in five clusters, including **the new guide vs `/best-quarry-crusher-management-software`**, which are both "how to choose the best crusher software" buyer's guides. Schema has a fake rating, an invalid property, contradictory feature claims, and an AggregateOffer repeated with a different `url` on every page.

### Cited Findings
**Static pages and article** (sources: the files in `webpage/src/pages/`; word counts are rough counts of string literals in each file and include UI text)

| Route | Rendered `<title>` | Meta description | H1 | Primary target | Words (est.) |
|---|---|---|---|---|---|
| / | "Stone Crusher Plant ERP Software \| CrusherBook \| CrusherBook" (**doubled brand**) | "CrusherBook stone crusher plant ERP software for weighbridge workflow… Start your free trial today!" (163 chars) | **"CrusherBook"** (brand only, `MarketingHero.jsx`) | stone crusher plant ERP software | ~600 + components |
| /features | "CrusherBook Features - AI Entry, Weighbridge, GST & Royalty \| CrusherBook" (73) | AI slip entry, GST billing, **royalty management**… (163) | "Powerful Features Built for Crusher Plants" | crusher software features | ~770 |
| /about | "About CrusherBook - Stone Crusher ERP Software Company \| CrusherBook" | "…by SoftwareBytes India… since 2021…" | "Simplifying Crusher Plant Operations Since 2021" | brand / company | ~540 |
| /pricing | "CrusherBook Pricing - Affordable Stone Crusher ERP Plans \| CrusherBook" | Basic Rs 6,999 / Advanced 8,999 / Enterprise 10,999, 14-day trial | "Choose the Plan That Fits Your Plant" | crusher software price | ~340 |
| /contact | "Contact CrusherBook - Crusher ERP Support & Demo \| CrusherBook" | demo, pricing, support | "Contact CrusherBook - ERP Support & Demo" | brand / demo | ~340 |
| /how-to-choose-crusher-plant-erp-software (new, published 2026-10-16) | "How to Choose the Best Crusher Plant ERP Software (Beginner's Guide) \| CrusherBook" (~84) | "A simple, practical guide… the 12 things the right crusher ERP software must do…" (~215, too long) | "A Beginner's Guide to Choosing the Right Crusher Plant ERP Software" | crusher plant ERP software, how to choose crusher ERP, best crusher plant software | **~2,900** (by far the deepest page) |

- Guide internal links: 9 contextual links to keyword pages (weighbridge, boulder-crusher-plant, inventory, fleet, diesel, mileage, expense, accounting, payment-reminder) plus /pricing and /features. Schema is Article (author and publisher are both Organizations "CrusherBook Team"/"CrusherBook") + FAQPage + BreadcrumbList + Organization — `webpage/src/pages/CrusherErpBuyingGuide.jsx`.
- Sitewide links: the navbar links only Home, Features, About, Pricing, Contact. The footer links all 29 keyword pages ("Solutions") plus the guide, so every page carries 30+ footer links and **none of the keyword pages are reachable from the main nav or from a hub page** — `webpage/src/components/Navbar.jsx`, `webpage/src/components/Footer.jsx`.

**29 keyword pages** (all from `webpage/src/data/landingPages.js`, rendered by `KeywordLanding.jsx`). T = rendered title length including " | CrusherBook", D = description length. Words are estimated from the data object. Each page has 3-5 FAQs and 3 related links.

| Slug | T | D | H1 | Words |
|---|---|---|---|---|
| stone-crusher-management-software | 64 | 147 | Stone Crusher Management Software That Runs Your Whole Plant | 586 |
| stone-crusher-accounting-software | 72 | 161 | Stone Crusher Accounting Software Made for Crusher Businesses | 523 |
| crusher-billing-software | 68 | 144 | Crusher Billing Software for Fast, Error-Free Dispatch | 463 |
| crusher-weighbridge-software | 59 | 152 | Weighbridge Software Connected to Your Crusher Billing | 408 |
| quarry-management-software | 61 | 151 | Quarry Management Software for Mines and Crusher Units | **381** (thinnest, 3 FAQs) |
| quarry-crusher-management-software | **62, rendered as "… \| CrusherBook \| CrusherBook"** | 152 | Quarry Crusher Management Software for the Whole Plant | 586 |
| best-quarry-crusher-management-software | 71 | 152 | Best Quarry Crusher Management Software: A Practical Buyer's Guide | 633 |
| stone-crusher-management-app | 61 | 158 | Stone Crusher Management App: Your Crusher in Your Pocket | 577 |
| quarry-management-system | 68 | 149 | Quarry Management System That Connects Every Department | 555 |
| crusher-plant-vehicle-mileage-tracking-software | 61 | 174 | Vehicle Mileage Tracking Software for Crusher Plants | 644 |
| crusher-plant-production-report-software | 72 | 190 | Crusher Plant Production Report Software | 592 |
| crusher-plant-production-tracking-software | 74 | 194 | Crusher Plant Production Tracking Software | 581 |
| crusher-machine-production-tracking-software | 75 | 184 | Crusher Machine Production Tracking Software | 606 |
| crusher-plant-expense-tracking-software | 67 | 182 | Crusher Plant Expense Tracking Software | 580 |
| crusher-plant-diesel-consumption-tracking-software | 64 | 174 | Crusher Plant Diesel Consumption Tracking Software | 606 |
| stone-crusher-plant-management-software | 71 | 205 | Stone Crusher Plant Management Software for Every Department | 547 |
| stone-crusher-plant-vehicle-management-software | 61 | 191 | Stone Crusher Plant Vehicle Management Software | 600 |
| crusher-plant-payroll-software | 66 | 176 | Crusher Plant Payroll Software | 568 |
| stone-crusher-boulder-production-tracking-software | 64 | 197 | Stone Crusher Boulder Production Tracking Software | 610 |
| stone-crusher-inventory-management-software | 75 | 189 | Stone Crusher Inventory Management Software | 617 |
| stone-crusher-fleet-management-software | 78 | 182 | Stone Crusher Fleet Management Software | 611 |
| stone-crusher-raw-material-tracking-software | 79 | 199 | Stone Crusher Raw Material Tracking Software | 618 |
| boulder-crusher-plant-software | 71 | 195 | Boulder Crusher Plant Software | 593 |
| gitti-plant-software (Hindi/Hinglish) | 69 | 144 | Gitti Plant Software – गिट्टी की बिक्री से मुनाफे तक | 582 |
| crusher-hisab-kitab-app (Hindi/Hinglish) | 61 | 144 | Crusher Hisab Kitab App – गिट्टी क्रशर का पूरा हिसाब मोबाइल पर | 453 |
| crusher-plant-ke-liye-software (Hindi/Hinglish) | 73 | 152 | Crusher Plant ke liye Software – बोल्डर से बिक्री तक पूरा हिसाब | 585 |
| crusher-plant-cloud-software | 76 | 167 | Crusher Plant Cloud Software – Your Whole Plant, Live on Any Device | 683 |
| crusher-plant-payment-reminder-software | 80 | 165 | Crusher Plant Payment Reminder Software – Know Who Owes You… | 652 |
| crusher-udhari-payment-reminder-app (Hindi/Hinglish) | 89 | 154 | Crusher Udhari Payment Reminder App – किसका कितना बाकी है… | 611 |

Source: `webpage/src/data/landingPages.js` (29 entries; fields slug, navLabel, seoTitle, description, keywords, eyebrow, h1, intro, painPoints, features, steps, faq, related).

**Cannibalization clusters** (same or near-same head term on several URLs)
1. **Buyer's guide intent:** `/how-to-choose-crusher-plant-erp-software` ("How to Choose the **Best** Crusher Plant ERP Software", keywords "best crusher plant software", "crusher software buying guide") vs `/best-quarry-crusher-management-software` (H1 "…A Practical **Buyer's Guide**", description "How to choose the best…"). These are the same intent. The new guide does not link to the older one, and the older one does not link to the guide (the guide's 9 links omit it; its `related` list omits the guide) — `CrusherErpBuyingGuide.jsx`, `landingPages.js`.
2. **"(stone) crusher (plant) management software/system/app":** `/` (keyword "crusher management software"), `/stone-crusher-management-software` (keywords include "crusher plant management software", "stone crusher management system"), `/stone-crusher-plant-management-software`, `/quarry-crusher-management-software`, `/stone-crusher-management-app`, `/crusher-plant-cloud-software`, and `/about` (keyword "crusher plant management system"). The first page's keyword list explicitly targets the third page's head term.
3. **Quarry:** `/quarry-management-software` vs `/quarry-management-system` vs `/quarry-crusher-management-software`.
4. **Production:** `/crusher-plant-production-report-software` vs `/crusher-plant-production-tracking-software` vs `/crusher-machine-production-tracking-software` vs `/stone-crusher-boulder-production-tracking-software`.
5. **Vehicles:** `/crusher-plant-vehicle-mileage-tracking-software` vs `/stone-crusher-plant-vehicle-management-software` vs `/stone-crusher-fleet-management-software`. Also boulder/raw material: `/stone-crusher-raw-material-tracking-software` vs `/stone-crusher-boulder-production-tracking-software` vs `/boulder-crusher-plant-software`. Also diesel: `/crusher-plant-diesel-consumption-tracking-software` vs `/stone-crusher-inventory-management-software` (whose title is "…| Diesel & Spares").
6. **Hinglish all-in-one:** `/gitti-plant-software`, `/crusher-hisab-kitab-app` and `/crusher-plant-ke-liye-software` all pitch "sab ek app mein" whole-plant accounting. `/crusher-plant-payment-reminder-software` vs `/crusher-udhari-payment-reminder-app` is an English/Hinglish pair, which is acceptable if the copy differs.
- Source for all clusters: `webpage/src/data/landingPages.js` (seoTitle, keywords, h1).

**Thin or duplicated copy**
- All 29 pages use one template and the same three-pain-point / six-feature / four-step layout, with the same CTA ("Get Free Demo on WhatsApp", "Plans from Rs 6,999/year"). Each page's unique copy is about 400-650 words. The file's own header says "duplicate text across these hurts ranking" — `landingPages.js` line 1-2.
- All 29 pages emit an identical SoftwareApplication `description`/`offers` block, changing only `url` — `KeywordLanding.jsx` `buildSchema`.

**Missing pages**
- No 404 route (`App.jsx` has no `path="*"`).
- No blog or resources index for the guide, and no hub page listing the 29 solutions. Keyword pages are linked only from the footer.
- No `/llms.txt`. The request returns the HTML shell with status 200.
- No page targets the earlier plan's recommended terms: `/stone-crusher-erp-software`, `/free-stone-crusher-software`, `/kanta-parchi-app` — `reports/CrusherBook SEO growth plan.md`.

**Schema and trust problems**
- `aggregateRating` 4.8 / `ratingCount` 250 appears in `index.html` (served raw on every URL, including 404s) and in `Home.jsx`. No reviews are visible on the page. Google requires that if you use AggregateRating, "users should be able to see that aggregate rating on the page", and reviews must reflect genuine experience. SoftwareApplication is an eligible type, so the markup is eligible but unsupported — [Google review snippet guidelines](https://developers.google.com/search/docs/appearance/structured-data/review-snippet).
- The homepage shows six named testimonials (Rajesh Sahu, Raipur; Manoj Agrawal, Jabalpur; Biswajit Patra, Rourkela; Suresh Mahato, Dhanbad; Deepak Verma, Bilaspur; Ashok Tiwari, Katni). The earlier audit could not verify them — `webpage/src/pages/Home.jsx`; `reports/CrusherBook SEO growth plan.md`.
- The Organization schema uses `contact` (not a schema.org property; it should be `contactPoint`). Its email `support@crusherbook.com` does not match the footer's `softwarebytesindia@gmail.com`. It is emitted by `index.html`, again by `Seo.jsx` on every page, and About adds a third Organization whose `founder` is a **`Person` named "SoftwareBytes India"** (should be an Organization; better as `parentOrganization`) — `webpage/index.html`, `Seo.jsx`, `About.jsx`, `Footer.jsx`.
- `sameAs`: facebook.com/crusherbook, twitter.com/crusherbook (redirects to x.com) and linkedin.com/company/crusherbook all return HTTP 200, but those sites return 200 for login walls too, so this does not prove the profiles exist. The footer links Instagram, Facebook and X but not LinkedIn, and Instagram is missing from `sameAs` — live checks; `Footer.jsx`.
- Pricing uses three bare `PriceSpecification` nodes not attached to any Offer or Product. They are valid JSON-LD but have no rich-result meaning — `Pricing.jsx`.
- `KeywordLanding` emits a `SoftwareApplication` with `AggregateOffer` (low 6999, high 10999, offerCount 3) and no rating. That is acceptable, but Google's software rich result requires a rating or review, so these will not earn stars — [Google software app docs](https://developers.google.com/search/docs/appearance/structured-data/software-app).
- **Contradictory product claims:** `Features.jsx` advertises "Royalty Management", "full offline support" and an "Offline Variant + Lifetime Plan" (the title is "…GST & Royalty"), and `/quarry-management-software` lists "Royalty records". But the FAQ on `/stone-crusher-raw-material-tracking-software` answers "Does it track royalty or mining permits?" with "No." — `Features.jsx` lines 72-103, `landingPages.js` lines 239-280 and 1269.
- `Seo.jsx` hard-codes `<html lang="en">` and `hreflang="en"` on the four Hindi/Hinglish pages.
- `meta keywords` is still emitted on every page. Google ignores it, so this is harmless but noisy.

### Inferences
- Merge or re-angle the buyer's-guide pair. The new 2,900-word guide is the stronger asset. Either 301 `/best-quarry-crusher-management-software` into it, or retitle that page to a quarry-specific comparison ("quarry crusher software comparison") and link both ways.
- Choose one owner page per cluster (for example `/stone-crusher-management-software` for "management software/system", `/stone-crusher-fleet-management-software` for vehicles, `/crusher-plant-production-report-software` for production). Retarget the rest at narrower modifiers, give them unique sections (screenshots, report samples, Hindi terms), and remove overlapping terms from their `keywords`, H1 and title.
- A rendered title over about 60 characters is likely to be truncated in Indian mobile SERPs. Dropping " | CrusherBook" from the long keyword titles, or shortening the trailing taglines, fixes most of them.

### Gaps
- I did not measure true rendered word counts per page. The figures are estimates from the source.
- I could not verify whether the homepage testimonials are real customers.

## 3. Most practical prerendering / SSR approach for Vite 8 + React 19 + react-router-dom 7 + react-helmet-async 3

### Takeaway
The quickest safe fix is a **post-build static prerender of all 35 routes into `dist/<route>/index.html`**, combined with **stripping the page-specific SEO tags out of `index.html`**. Without the second step the duplicate-canonical bug survives prerendering. The cleanest long-term path is **React Router framework mode with `ssr: false` + `prerender`**. That needs react-router upgraded to at least 7.18.4 for Vite 8 peer support. `vite-react-ssg` is ruled out: it does not support React 19, and its authors point React Router 7 users to built-in prerendering.

### Cited Findings
- React Router prerender works in **Framework mode only**. Set `prerender: true` (static paths from `routes.ts`), an array of paths, or an async function, in `react-router.config.ts`. With `ssr: false` the output is static files in `build/client` (`[url].html` + `[url].data`). When `/` is prerendered, a fallback `__spa-fallback.html` is written for other paths — [React Router pre-rendering docs](https://reactrouter.com/how-to/pre-rendering) (fetched page is the 8.4.0 docs).
- `@react-router/dev` latest 7.x declares the peer `vite: ^5.1.0 || ^6 || ^7 || ^8` but requires `react-router ^7.18.4`. v8.4.0 declares `vite ^7 || ^8` — `npm view @react-router/dev peerDependencies` (2026-10-16). The project has react-router 7.13.2, so it would need an upgrade first.
- `vite-react-ssg` lists "Support react19" as unchecked on its roadmap, and says React Router v7 "now has built-in SSG support" and recommends using that — [vite-react-ssg README](https://github.com/Daydreamer-riri/vite-react-ssg).
- react-helmet-async v3 on React 19 does not fill `helmetContext` on the server. `<title>`, `<meta>` and `<link>` are "included directly in the React render output and hoisted to `<head>` by React itself" — [react-helmet-async README](https://github.com/staylor/react-helmet-async). So any SSR or prerender path must let React render the head tags, and must not also hard-code them in `index.html`.
- My headless Chrome `--dump-dom` of the live site already produced correct per-page H1, title and body (about 47 KB of DOM per page). This shows a browser-snapshot prerender would capture full content today, though it would also capture the duplicate homepage tags unless `index.html` is cleaned — live render of [/crusher-billing-software](https://crusherbook.com/crusher-billing-software).
- Puppeteer latest is 25.14.0 — `npm view puppeteer version`.

**Option A: post-build snapshot (recommended this week; no app refactor)**
1. In `index.html`, delete `<title>`, meta description, canonical, `hreflang`, all `og:*`/`twitter:*` and both JSON-LD blocks. Keep charset, viewport and verification. `Seo.jsx` then becomes the only source of head tags.
2. Add a `routes` list built from `landingPages` slugs + the 6 static paths. Use the same list to **generate `sitemap.xml` at build time**, so the two never drift again.
3. Add a `postbuild` script: `vite preview` on a port, then Puppeteer visits each route, waits for `networkidle0`, and writes `document.documentElement.outerHTML` to `dist/<route>/index.html` (and `dist/index.html` for `/`). Add a `NotFound` route (`path="*"`, rendering `<meta name="robots" content="noindex">`), snapshot it to `dist/404.html`, and set `<html lang="hi">` on the Hindi pages.
4. Swap `createRoot` for `hydrateRoot` when `#root` has children, or keep `createRoot` (it will re-render over the snapshot; simpler, with a small flash). Note: framer-motion `initial={{opacity:0}}` will be snapshotted mid-animation unless animations finish or are disabled under a `navigator.webdriver` check. Verify the H1 text is visible in the snapshot.
5. nginx: `try_files $uri $uri/index.html =404; error_page 404 /404.html;` and 301 `www.` to the apex. Add `rewrite ^/(.+)/$ /$1 permanent;` for trailing slashes, enable gzip for `application/javascript`, and add `Cache-Control: public, max-age=31536000, immutable` on `/assets/`.

**Option B: React Router framework mode (long-term)**
- Upgrade `react-router`/`react-router-dom` to ≥7.18.4 and add `@react-router/dev`. Replace `BrowserRouter`/`main.jsx` with `app/root.jsx` + `app/routes.js` (one route module per static page, plus one `:slug` route or 29 generated entries). Set `react-router.config.js` to `{ ssr: false, prerender: async ({getStaticPaths}) => [...getStaticPaths(), ...landingPages.map(p => '/' + p.slug)] }`. Move SEO into route `meta` exports, or keep the Helmet v3 inline tags. Deploy `build/client` to nginx with a 404 fallback. More work (about 1-2 days), but it gives real per-route HTML, `.data` files, and an easy path to a blog.

**Option C: custom Vite SSR build** (`vite build --ssr src/entry-server.jsx`, `renderToString(<StaticRouter location={url}><App/></StaticRouter>)`, inject into the template). This is viable, but Option A is less code and Option B is better supported.

### Inferences
- Option A can ship within a day and fixes raw HTML, canonicals, soft 404s and link previews at once. Option B is worth doing when the blog or resource section is added.
- Whatever option is chosen, cleaning `index.html` is mandatory. Otherwise the prerendered HTML will still carry the homepage canonical first.

### Gaps
- I did not test how React 19 `renderToString` places hoisted `<title>`/`<meta>` when the app is rendered into `#root` rather than as a full `<html>` document (Option C). This needs a prototype.
- I did not check framer-motion behaviour during the snapshot.

## 4. Do robots.txt and llms.txt allow and help AI crawlers?

### Takeaway
robots.txt is permissive (`User-agent: * / Allow: /`), so GPTBot, OAI-SearchBot, ChatGPT-User, PerplexityBot, Google-Extended, ClaudeBot and Bingbot are all allowed, and test fetches with the GPTBot and ClaudeBot user agents got 200. But these AI crawlers do not run JavaScript, so today they can read only the shell's homepage title, description and JSON-LD on every URL. There is no llms.txt: `/llms.txt` returns the HTML shell with status 200.

### Cited Findings
- robots.txt content: `User-agent: *`, `Allow: /`, `Sitemap: https://crusherbook.com/sitemap.xml`. There are no bot-specific groups — [robots.txt](https://crusherbook.com/robots.txt).
- GPTBot and ClaudeBot user agents receive 200 and the same 4,994 B shell — live curl, [crusherbook.com](https://crusherbook.com/).
- Vercel/MERJ found that none of the major AI crawlers (OpenAI's, Anthropic's ClaudeBot and others) render JavaScript, although they download JS files. Googlebot is the exception. Vercel advises server-rendering important content — [Vercel, "The rise of the AI crawler"](https://vercel.com/blog/the-rise-of-the-ai-crawler). Secondary coverage reports GPTBot fetching JS in 11.50% of requests and ClaudeBot in 23.84%, and more than 34% of their requests hitting 404s. Those figures come via secondary sources and vary between them — [SEJ AI crawlers](https://www.searchenginejournal.com/ai-crawlers).
- `/llms.txt` returns `text/html` 200 (the SPA shell), so it does not exist and the request is a soft 404 — live curl.

### Inferences
- robots.txt needs no change for access. Adding explicit `User-agent: GPTBot / OAI-SearchBot / PerplexityBot / ClaudeBot / Google-Extended — Allow: /` groups is optional documentation.
- An `llms.txt` (a markdown summary of the product, prices, the 29 solution URLs and the guide) is cheap, but it helps only if the linked pages are prerendered. Prerendering comes first. Add a real 404 so a missing `/llms.txt` stops returning a 200 HTML page.

### Gaps
- No server logs were available to confirm which AI bots actually crawl the site.
- llms.txt adoption by OpenAI, Anthropic, Perplexity and Google crawlers was not researched here.

## 5. Core Web Vitals and performance signals

### Takeaway
The single JS bundle (622 KB, after the 17:33 deploy) is **served uncompressed with no Cache-Control**. CSS and HTML are gzipped. Nothing renders until the JS executes. The OG/logo image is 498×103 but declared as 1200×630. The site preconnects to Google Fonts but uses none.

### Cited Findings
- `/assets/index-CwbwtVPf.js`: `Content-Length: 622435`, no `Content-Encoding` even when gzip/br is requested, no `Cache-Control`/`Expires`, only ETag/Last-Modified. Before the deploy, `index-C33VnR3x.js` was 590,654 B and also uncompressed. The earlier audit measured 492 KB — live headers; `webpage/dist/assets/`; `reports/CrusherBook SEO growth plan.md`.
- CSS `/assets/index-*.css` (65,594 B raw) is served with `Content-Encoding: gzip`, so nginx gzip is on but `gzip_types` appears to omit `application/javascript` — live headers.
- HTML is gzipped. The JS fetch had a TTFB of about 0.47 s from the test machine (India-based user's PC, single sample) — live curl.
- `og:image` / logo `cruhserbook.webp`: 14,792 B, actual size **498×103 px**, while `og:image:width=1200` / `height=630` are declared. The filename is misspelled — `webpage/public/cruhserbook.webp` (measured with PIL); `Seo.jsx`, `index.html`.
- `index.html` preconnects to `fonts.googleapis.com` and `fonts.gstatic.com`, but `index.css` only imports Tailwind and loads no Google font — `webpage/index.html`, `webpage/src/index.css`.
- Heavy client dependencies: framer-motion 12, lucide-react, the whole `landingPages.js` (1,681 lines) and every page in one chunk. There is no route-level code splitting (`App.jsx` imports every page statically) — `webpage/package.json`, `webpage/src/App.jsx`.
- Above-the-fold H1s use framer-motion `initial={{opacity:0}}` (About, Contact, Features, Pricing, MarketingHero), which delays LCP until JS and the animation finish — `webpage/src/pages/*.jsx`.

### Inferences
- Turning on gzip/brotli for JS would cut the transfer to about 150-200 KB (a typical 3-4× ratio for minified JS; not measured). Immutable caching on hashed assets would make repeat visits nearly instant. Both are nginx-only changes.
- Prerendered HTML would make LCP independent of the 622 KB bundle on slow rural 4G.
- `React.lazy` per route, and dropping framer-motion entrance animations on H1s, are the next app-side wins.

### Gaps
- No field CrUX or PageSpeed Insights data was collected (no PSI API call was made). Real LCP, INP and CLS are unknown.
- HTTP/2 or HTTP/3 support could not be checked because the local curl lacks HTTP/2.

## 6. Is crusherbook.com indexed?

### Takeaway
I found no evidence of indexing in the search tool I used. `site:crusherbook.com` returned zero crusherbook.com pages, and the brand query surfaced Capterra (IN and UK) listings, not the site itself. This matches the earlier audit. The search tool is not Google, so Search Console is needed to confirm.

### Cited Findings
- `site:crusherbook.com` returned only unrelated crusher pages (Recycling Today, Encyclopedia.com and others) and no crusherbook.com URL — WebSearch, 2026-10-16 (e.g. [Recycling Today result](https://www.recyclingtoday.com/news/handbook-of-crushing-cd-rom-now-available)).
- "crusherbook stone crusher software" returned [Capterra India CrusherBook](https://www.capterra.in/software/1241879/crusherbook) and [Capterra UK](https://www.capterra.co.uk/software/1241879/crusherbook) first, then Quarry360 Issuu brochures and Techjockey "Stone Crusher Software vs …" comparison pages. The official site did not appear — WebSearch, 2026-10-16.
- The Google site-verification meta tag (`stlYUTZVP6MIWvn8gT58cF_-zQ_rYMZxn5xlUr3UQrA`) is present, so GSC access should exist — `webpage/index.html`.

### Inferences
- The likely cause is the identical-shell, homepage-canonical setup in §1, plus a young domain with few backlinks. Capterra currently outranks the brand's own site.

**Overall fix list, ranked by impact**
1. Remove the static title, description, canonical, OG and JSON-LD from `index.html`, and prerender all 35 routes (Option A now, Option B later). This fixes the raw HTML, the duplicate canonicals, AI-crawler visibility and WhatsApp/LinkedIn previews.
2. nginx: real 404 (`try_files … =404` + `404.html` with noindex), 301 www to apex (including http://www), 301 trailing slash to no slash, redirect `/index.html` to `/`.
3. Remove the unsupported `aggregateRating` (4.8/250) from `index.html` and `Home.jsx` until real Capterra or Google reviews exist and are shown on the page.
4. Resolve the buyer's-guide cannibalization (new guide vs `/best-quarry-crusher-management-software`) and the "management software" cluster. Choose owner pages, retarget the others, and add cross-links.
5. Remove the false claims (offline, lifetime plan, royalty) from `Features.jsx` and `/quarry-management-software` so they match the raw-material FAQ's "No".
6. nginx gzip/brotli for JS + `Cache-Control: immutable` on `/assets/`; route-level code splitting.
7. Fix titles: remove the doubled brand on `/` and `/quarry-crusher-management-software`, and trim titles over 60 characters and the 19 descriptions over 160. Give the homepage a keyword H1 instead of "CrusherBook".
8. Schema hygiene: change `contact` to `contactPoint`, use one Organization node sitewide with a consistent email, About `founder` → `parentOrganization` of type Organization (SoftwareBytes), confirm `sameAs` profiles exist and add Instagram, and replace the bare PriceSpecifications with Offers.
9. Add `lang="hi"` to the Hindi/Hinglish pages, a solutions hub and a resources/blog index (linked from the navbar), `llms.txt`, and a build-generated sitemap. Fix the OG image (a real 1200×630 file, correctly spelled).
10. After deploy, use GSC URL Inspection and "Request indexing" on the top 10 URLs, resubmit the sitemap, and check the Google-selected canonical.

### Gaps
- Real Google index status, impressions, and which URL Google picked as canonical for each page are unknown without Search Console access.
- No Bing index check was done (Bing Webmaster Tools / `site:` on Bing was not available).
