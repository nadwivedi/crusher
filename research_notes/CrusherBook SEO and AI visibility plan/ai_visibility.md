# AI Visibility (GEO / AEO) for CrusherBook — how AI assistants find, cite and recommend a niche B2B brand

Research date: 16 October 2026. Includes a live technical check of crusherbook.com done the same day with curl. Labels used below: **[Official]** is platform documentation, **[Study]** is third-party research (date and sample given), **[Measured]** is my own check, **[Speculation]** is industry opinion.

## 1. How each AI system selects and cites sources (crawlers, indexes, requirements)

### Takeaway
All five systems answer from a search index (Google's own, Bing's, or a mix with their own crawlers), and none promises a special AI-only route in. The basic requirement is the same for all of them: crawlable, indexable pages whose text is in the HTML the bot receives. Google says outright that AI Overviews and AI Mode have no extra requirements beyond normal Search eligibility. ChatGPT and Perplexity need their search bots (OAI-SearchBot, PerplexityBot) allowed. **The biggest finding: crusherbook.com currently sends every bot an empty JavaScript shell.** That probably limits visibility on every non-Google AI system.

### Cited Findings
**Google AI Overviews / AI Mode / Gemini [Official]**
- To appear, a page only has to be indexed and eligible for a snippet in Google Search. "There are no additional requirements to appear in AI Overviews or AI Mode." Google also says no special schema.org markup or AI-specific files are needed. The page was last updated 2025-12-10. — [Google Search Central: AI features and your website](https://developers.google.com/search/docs/appearance/ai-features)
- AI Overviews and AI Mode use "query fan-out": they run several related searches across subtopics, so the cited links "can be broader and more varied than in classic search". AI Overviews and AI Mode can use different models, so they can cite different links. AI Overviews only show when Google judges they add value. — [Google Search Central](https://developers.google.com/search/docs/appearance/ai-features)
- Controls: Googlebot rules in robots.txt cover Search, including the AI features. `nosnippet`, `data-nosnippet`, `max-snippet` and `noindex` limit what can be shown. **Google-Extended** limits use of content for training and grounding in Google's *other* systems (Gemini apps, etc.). It does not control AI Overviews. — [Google Search Central](https://developers.google.com/search/docs/appearance/ai-features)
- Google recommends structured data that matches the visible text, keeping Business Profile data current, keeping important content in text, and using internal links. — [Google Search Central](https://developers.google.com/search/docs/appearance/ai-features)

**ChatGPT search [Official]**
- OpenAI runs three separate agents:
  - **OAI-SearchBot** surfaces sites in ChatGPT search. A site that opts out won't appear in search answers, though it can still show up as a navigational link.
  - **GPTBot** collects training data. Blocking it does not affect search.
  - **ChatGPT-User** makes fetches the user starts, and robots.txt "may not apply" to it.
  Steps to appear: allow OAI-SearchBot in robots.txt, allow its IP ranges (openai.com/searchbot.json), and allow about 24 hours for a robots.txt change to take effect. — [OpenAI crawlers overview](https://developers.openai.com/api/docs/bots)
- How much ChatGPT relies on Bing is **unresolved**:
  - Seer Interactive, citing a Semrush analysis of 80M queries (2024, SearchGPT era), said 87% of SearchGPT citations matched Bing's top results. — [Seer Interactive](https://www.seerinteractive.com/insights/87-percent-of-searchgpt-citations-match-bings-top-results)
  - A later Ahrefs study of about 15,000 long-tail queries (data collected in July, year not confirmed in the snippet) found only about 8% overlap between ChatGPT citations and Bing's top 10. It also notes ChatGPT only searches when an internal classifier decides a prompt needs it. — [Ahrefs: AI search overlap](https://ahrefs.com/blog/ai-search-overlap/)

**Perplexity [Official]**
- **PerplexityBot** surfaces and links sites in Perplexity results and, Perplexity says, is not used for model training. Its IPs are at perplexity.com/perplexitybot.json. **Perplexity-User** makes fetches the user starts and "generally ignores robots.txt rules". Changes take up to 24 hours. — [Perplexity crawlers](https://docs.perplexity.ai/guides/bots)

**Microsoft Copilot / Bing [Official + Study]**
- Bing Webmaster Tools launched an **AI Performance report** in February 2026 (public preview), open to any verified site.
  - It shows citation counts per page and the "grounding queries" behind them across Copilot, Bing AI summaries and some partner integrations. It can't be filtered by channel.
  - Data comes as CSV export only (no API yet), and there is no click data.
  — [Search Influence analysis of 20,000 Copilot citations](https://www.searchinfluence.com/blog/bing-ai-performance-report-copilot-citations/); [Search Engine Land](https://searchengineland.com/bing-webmaster-tools-testing-new-ai-performance-report-468039)
- Example of how concentrated citations can be: on one site, 19,717 citations were spread across 86 pages, and a single page took 69% of them. — [Search Influence](https://www.searchinfluence.com/blog/bing-ai-performance-report-copilot-citations/)

**crusherbook.com technical state [Measured, 16 Oct 2026]**
- robots.txt is `User-agent: * / Allow: /` with a sitemap. All AI bots are allowed. — [crusherbook.com/robots.txt](https://crusherbook.com/robots.txt)
- The sitemap lists 34 URLs, including 30+ keyword landing pages (e.g. /crusher-billing-software, /crusher-plant-ke-liye-software, /gitti-plant-software, /crusher-hisab-kitab-app). — [crusherbook.com/sitemap.xml](https://crusherbook.com/sitemap.xml)
- **Every URL returns the same 4,994-byte HTML shell with `<div id="root"></div>`.** This holds for a browser user agent and for OAI-SearchBot, Googlebot and PerplexityBot user agents. Every page, including the Hindi-slug page /crusher-plant-ke-liye-software, also gets:
  - the same `<title>CrusherBook | Stone Crusher Plant ERP Software`
  - the same `lang="en"`
  - no H1 and no body text in the raw HTML.
- The shell carries JSON-LD for Organization, SoftwareApplication, Offer (x3), ContactPoint and **AggregateRating (ratingValue 4.8, ratingCount 250)**.
- /llms.txt returns HTTP 200, but the body is the same SPA HTML shell, not a real llms.txt file.

### Inferences
- Googlebot renders JavaScript, so Google can probably still see the pages, though rendering is slower and the identical titles in the raw HTML are a warning sign. OpenAI, Perplexity and Anthropic crawlers are widely reported to **not execute JavaScript** [Speculation/industry consensus; no official confirmation found in this session]. If that is true, ChatGPT search, Perplexity and Claude currently see nothing but the title on every CrusherBook page. **Fix #1:** serve server-rendered or prerendered HTML for each route, with its own title, meta description, H1, body text and correct `lang` (e.g. `hi` for the Hindi pages).
- The AggregateRating "4.8 from 250" is not backed by any public review source I found; Capterra shows no reviews (see section 3). Google's review-snippet policies discourage self-serving or unverifiable ratings, and they are a credibility risk if an AI system or a competitor checks them. Remove the rating, or back it with real reviews collected on the site or on Capterra/G2.
- A broken /llms.txt does no harm (see section 2), but it should either be removed (return 404) or turned into a real text file.

### Gaps
- None of the five vendors publishes an official ranking algorithm for picking citations.
- I found no official OpenAI/Perplexity statement on JavaScript rendering in this session.
- I could not confirm a current (2026) study on how ChatGPT's own index and Bing's index interact.
- I did not fetch Microsoft's official Copilot publisher documentation or the IndexNow docs. IndexNow is widely recommended for faster Bing discovery, but that is unverified here.

## 2. What evidence says increases AI citations

### Takeaway
The strongest evidence points to **off-site brand presence**: brand mentions across the web, inclusion in "best X" listicles and comparison pages, and presence on Reddit, YouTube, LinkedIn and review sites. On-page factors matter less, but there is controlled evidence that adding statistics, quotations and cited sources helps. llms.txt shows no measurable effect. Most of the evidence is correlational and produced by vendors.

### Cited Findings
- **Brand mentions are the top correlate.** Ahrefs (published 26 May 2025, 75,000 brands, Spearman correlation with AI Overview brand mentions):
  - branded web mentions: 0.664
  - branded anchors: 0.527
  - branded search volume: 0.392
  - Domain Rating: 0.326
  - referring domains: 0.295
  - backlinks: 0.218
  About 26% of the brands had zero AI Overview mentions. This shows correlation, not cause. — [Ahrefs: AI Overview brand visibility factors](https://ahrefs.com/blog/ai-overview-brand-correlation/)
- **Most-cited domains.** Peec AI (March 2026, 30M sources, US only, across ChatGPT, AI Mode, Gemini, Perplexity and AI Overviews):
  - Overall ranking: Reddit #1, then YouTube, LinkedIn, Wikipedia, Forbes, **G2**, Yelp, Facebook, Medium, TechRadar.
  - Reddit and YouTube are in the top 5 on all five engines.
  - Google's surfaces lean toward social and local sites (Facebook, Yelp), while ChatGPT leans toward editorial sites (Forbes, TechRadar).
  — [Peec AI: most cited domains](https://docs.peec.ai/research/most-cited-domains-in-ai-search); [by engine](https://docs.peec.ai/research/most-cited-domains-by-engine)
- **Citations are concentrated.** An aggregate index of about 680M citations estimates that the top 15 domains take about 68% of citation share. This is a PR-firm release, so treat it with caution. — [Everything-PR via IPS News, May 2026](https://ipsnews.net/business/2026/05/21/everything-pr-releases-the-ai-platform-citation-source-index-2026-ranking-the-50-sources-behind-ai-answers/)
- **Authority shift.** Wellows (20.5M citations, March–July 2026) reports that ChatGPT and Perplexity moved toward higher-authority domains in July 2026. — [Wellows](https://wellows.com/blog/does-domain-authority-matter-for-ai-citations/)
- **Listicles dominate B2B software citations, but the figures conflict:**
  - About 18.8% of ChatGPT citations in one study of 278 responses across 6 B2B SaaS niches. The same source says 66% of brand recommendations happened without ChatGPT citing the brand's own site. — [Position Digital: ChatGPT ranking factors](https://www.position.digital/blog/chatgpt-ranking-factors/)
  - 43.8% for "Best X" listicles, per SE Ranking data cited by Averi (Jan 2026). The base is unclear. — [Averi B2B citation benchmarks 2026](https://www.averi.ai/how-to/chatgpt-vs.-perplexity-vs.-google-ai-mode-the-b2b-saas-citation-benchmarks-report-(2026))
  - Caveat: TripleDart (Q1 2026, 28 B2B SaaS companies) found generic blog content produced zero direct leads, and listicle blogs converted at 0.04%. — [TripleDart](https://www.tripledart.com/research/which-pages-do-llms-cite)
- **Controlled evidence on content (the GEO paper).** Aggarwal, Murahari, Rajpurohit, Kalyan, Narasimhan and Deshpande, from **Princeton and IIT Delhi**, KDD 2024 (arXiv Nov 2023, revised June 2024). GEO-bench has 10,000 queries.
  - Improvement in visibility (position-adjusted word count): Quotation Addition about +43%, Statistics Addition about +33%, Fluency about +29%, Cite Sources about +28%, Technical Terms about +18%, Easy-to-Understand about +14%, Authoritative about +12%.
  - **Keyword stuffing scored -9%**, and about -10% on Perplexity.
  - **Lower-ranked sites benefit more.** "Cite Sources" raised visibility by 115% for the rank-5 source but cut it by 30% for the rank-1 source.
  The per-method percentages are my calculations from Table 1. The paper's headline is up to about 40%. — [arXiv 2311.09735](https://arxiv.org/html/2311.09735v3)
- **llms.txt shows no measurable effect.**
  - SE Ranking (about 300,000 domains) found no relationship between having llms.txt and citation frequency. Removing the variable *improved* their XGBoost model. Only 10.13% of the domains had the file. — [Search Engine Journal](https://www.searchenginejournal.com/llms-txt-shows-no-clear-effect-on-ai-citations-based-on-300k-domains/561542/); [SE Ranking](https://seranking.com/blog/llms-txt/)
  - ALLMO: 1 of 94,614 cited URLs was an llms.txt page. This is secondary, via Pixis. — [Pixis](https://pixis.ai/blog/does-llms-txt-help-ai-citations-what-the-evidence-actually-shows/)
  - Google says no AI-specific files are needed. — [Google Search Central](https://developers.google.com/search/docs/appearance/ai-features)
- **Structured data:** Google needs no special schema for AI features, but structured data must match the visible content. — [Google Search Central](https://developers.google.com/search/docs/appearance/ai-features)

### Inferences
- For a niche brand with almost no web footprint, the highest-leverage moves are off-site:
  - complete, review-backed profiles on Capterra, G2, Techjockey, SoftwareSuggest, IndiaMART, Google Business Profile and LinkedIn
  - getting listed in third-party "best stone crusher software" or "crusher billing software" articles
  - YouTube demo videos in Hindi and English
  - genuine answers in Reddit and Quora threads
  - Indian trade and mining media (e.g. quarry and construction-equipment portals)
- CrusherBook's own "best-quarry-crusher-management-software" page will carry less weight than a neutral third-party listicle. Even so, an honest comparison page on its own site that names competitors (Stone Crusher Software by LogiBit, Quarry360, xNETRA, ERPNext/Tally setups) gives AI systems something to quote.
- Wikipedia and Wikidata: a brand this small almost certainly fails Wikipedia's notability rules, so don't try. A Wikidata item is low-cost and low-evidence [Speculation].

### Gaps
- I found no rigorous study isolating freshness, author/E-E-A-T or FAQ schema as causal factors for AI citation.
- I found no India-specific or Hindi citation-source study. The Peec data is US-only.
- The study figures on Reddit's share of Perplexity citations and Wikipedia's share of ChatGPT citations come from aggregators ([Contently](https://contently.com/2026/04/29/top-sources-llms-cite/), [5W](https://www.5wpr.com/research/state-of-ai-citations-2026/)), so I did not use them as primary data.

## 3. What AI assistants and search currently show for crusher-software prompts (competitor sources, CrusherBook presence)

### Takeaway
The web results behind AI answers for these prompts are thin and dominated by **directory and aggregator listings** (Techjockey product and comparison pages, Capterra, IndiaMART, Issuu, GoodFirms), not vendor websites. **CrusherBook does appear, but only through its Capterra listing (India and UK), not through crusherbook.com itself.** A brand-name search for "CrusherBook crusherbook.com" returned nothing about the company. The AI engines themselves (ChatGPT, Perplexity, Gemini) were not queried directly.

### Cited Findings
- **"best stone crusher software India"** (web search with an AI summary, 16 Oct 2026). Sources returned:
  - Capterra India listing for **CrusherBook** (described as ERP for crusher plants, with no user ratings yet). — [Capterra.in CrusherBook](https://www.capterra.in/software/1241879/crusherbook)
  - Techjockey "Stone Crusher Software" (LogiBit Technologies) detail page and comparison pages vs KhataBuddy. — [Techjockey detail](https://techjockey.com/detail/stonecrusher-software); [Techjockey compare](https://www.techjockey.com/compare/stonecrusher-software-vs-khatabuddy)
  - Quarry360 promo documents on Issuu. — [Issuu Quarry360](https://issuu.com/quarry360/docs/the_fastest_stone_crusher_software_streamlining_y)
  - IndiaMART seller O2biz Services. — [IndiaMART](https://m.indiamart.com/company/124102798)
  - SourceForge stone-fabrication list (not relevant). — [SourceForge](https://sourceforge.net/software/stone-fabrication/india/)
  - The summary said it found **no independent ranking** of crusher software in India.
- **"crusher plant ERP software billing"** returned:
  - Capterra India and UK CrusherBook listings, with starting price shown as ₹6,999 and mentions of OCR of weighbridge slips, boulder tracking and party ledgers. — [Capterra.co.uk](https://www.capterra.co.uk/software/1241879/crusherbook)
  - Techjockey comparisons vs Billing Fast and BillClap. — [Techjockey](https://www.techjockey.com/compare/stonecrusher-software-vs-billing-fast)
  - xNETRA (Odoo-based) on GoodFirms. — [GoodFirms xNETRA](https://www.goodfirms.co/company/xnetra)
  - A freelancer's "Stone Crusher Management & Weighbridge" portfolio project on Contra. — [Contra](https://contra.com/p/sLkUEcsc-stone-crusher-management-and-weighbridge)
  - An ERPNext customization job post. — [Freelancer](https://www.freelancer.de/projects/erp/erpnext-customization-for-stone-crusher)
- **"CrusherBook crusherbook.com"** returned only unrelated crushing handbooks and equipment pages. crusherbook.com was not indexed in that search engine for its own brand name.
- **Hindi query "क्रशर सॉफ्टवेयर हिंदी स्टोन क्रशर बिलिंग"** returned no crusher-specific software at all. Results were generic Indian billing software (LOGIC ERP, Busy, Crave via iSPIRT), the Quarry360 Issuu document and a Bajaj Finserv explainer. The AI summary said it found no Hindi-interface crusher billing software. — [LOGIC ERP](https://www.logicerp.com/blog/tag/invoicing-software/); [iSPIRT](https://pn.ispirt.in/tag/crave/); [Bajaj Finserv](https://www.bajajfinserv.in/what-is-stone-crusher)

### Inferences
- The Hindi crusher-software space is essentially **empty**. A properly server-rendered Hindi page set from CrusherBook would face almost no competition.
- Capterra is currently CrusherBook's only visible footprint. Getting 10–20 genuine Capterra reviews is likely the single fastest way to be recommended, because review platforms (G2/Capterra) are among the top AI-cited domains.
- Techjockey is the main competitor surface: its auto-generated "X vs Y" comparison pages get indexed. Listing CrusherBook on Techjockey would automatically put it into "CrusherBook vs Stone Crusher Software"-type pages [Inference, based on how Techjockey's comparison pages work].
- The fact that crusherbook.com did not appear for its own brand name fits the JavaScript-shell problem in section 1.

### Gaps
- I did not directly query ChatGPT, Perplexity, Gemini, Copilot or Google AI Overviews, because no tool access was available. The results above come from a web search engine with an AI summary layer, which is a proxy. A manual prompt check in each assistant is still needed (see section 5).
- I did not check whether Google shows an AI Overview for these queries, or whether Google has indexed CrusherBook pages. Use Search Console's Pages report and a `site:crusherbook.com` search.

## 4. How to write content so AI systems quote it

### Takeaway
Write so that any single passage can be lifted and still make sense:
- Put the answer first, with a definition in the first sentence.
- Use concrete numbers, a source or quote, tables, and plain language.
- Never keyword-stuff.
- Keep the brand entity (name, address, phone, description) identical everywhere, and make schema match visible text.

### Cited Findings
- Adding statistics, quotations and source citations raised generative-engine visibility by about 28–43% in a controlled test. Fluency and easy-to-understand rewrites helped. Keyword stuffing hurt. — [GEO paper, KDD 2024](https://arxiv.org/html/2311.09735v3)
- Query fan-out means AI Mode and AI Overviews pull supporting pages for *subtopics*, not only for the main query. — [Google Search Central](https://developers.google.com/search/docs/appearance/ai-features)
- Google advises keeping important content in text (not images or JavaScript-only), using internal links, and making structured data match visible text. No special schema is required. — [Google Search Central](https://developers.google.com/search/docs/appearance/ai-features)
- Listicles, service and product pages, and documentation make up close to half of LLM citations in B2B SaaS. The mix varies by niche. — [Position Digital](https://www.position.digital/blog/chatgpt-ranking-factors/)
- On one site, a single page took 69% of Copilot citations, so a few strong pages matter more than many thin ones. — [Search Influence](https://www.searchinfluence.com/blog/bing-ai-performance-report-copilot-citations/)

### Inferences (recommended page pattern for CrusherBook)
- **First 1–2 sentences:** a definition-style answer, e.g. "CrusherBook is stone crusher plant ERP software for India that records weighbridge slips, sales per ton or per cubic feet (cft), boulder purchases, diesel, party ledgers and daily profit, in English and Hindi. Plans start at ₹X per year." Match the real pricing.
- **Numbers that are specific and true:** the number of plants using it, states covered, setup time, price, and supported units (ton / cft / brass). The GEO paper's +33% result for statistics supports this.
- **Tables:** a feature × CrusherBook × Tally × Excel × generic billing app comparison; a pricing table; a "manual register vs software" before/after table.
- **Honest comparison pages:** "CrusherBook vs Tally for crusher plants", "CrusherBook vs Excel", and "best stone crusher software in India (2026)" that names real competitors with a fair summary of each.
- **An FAQ block** on each page, with schema that mirrors the visible Q&A. Google no longer shows FAQ rich results for most sites, but the Q&A format still matches how prompts are phrased [Speculation].
- **Entity consistency:** the same "CrusherBook" spelling, legal company name, address, phone and one-line description on the website, Capterra, Google Business Profile, IndiaMART, Techjockey, LinkedIn, YouTube and Justdial. The Organization schema `sameAs` should list those profiles.
- **Remove any keyword-stuffed landing pages.** The 30+ near-duplicate slugs (quarry-management-software, quarry-management-system, quarry-crusher-management-software, best-quarry-crusher-management-software…) risk looking like doorway pages. Merging them into fewer, deeper pages is safer [Inference; Google's doorway-page policy was not fetched in this session].

### Gaps
- I found no controlled study isolating schema markup's effect on AI citation.
- The GEO paper's tests used its own benchmark and engines from 2023–24. Effects on 2026 production systems are not directly verified.

## 5. Measuring AI visibility on a small budget

### Takeaway
Combine four free sources:
- Bing Webmaster Tools' AI Performance report (actual Copilot/Bing AI citation counts)
- Google Search Console (AI Overview and AI Mode impressions, but mixed in with normal web results)
- GA4 referral tracking for chatgpt.com, perplexity.ai and others
- A monthly manual prompt-tracking sheet

### Cited Findings
- Bing Webmaster Tools AI Performance report (Feb 2026 preview): free for verified sites. It shows daily citation totals, per-page citations and grounding queries as CSV. It has no clicks and no filter by channel. — [Search Influence](https://www.searchinfluence.com/blog/bing-ai-performance-report-copilot-citations/); [Practical Ecommerce](https://www.practicalecommerce.com/bings-improved-ai-performance-section)
- Google Search Console counts AI feature appearances inside the Performance report's "Web" search type. There is no separate AI Overview filter in the official documentation. Google says clicks from AI Overviews tend to be higher quality. — [Google Search Central](https://developers.google.com/search/docs/appearance/ai-features)
- GA4: create a custom channel group above "Referral" with a source regex such as `chatgpt\.com|chat\.openai\.com|perplexity\.ai|copilot\.microsoft\.com|gemini\.google\.com|claude\.ai|edgeservices`. — [freelanceseo.sg](https://freelanceseo.sg/blog/track-ai-referral-traffic-ga4/); [abmatic](https://abmatic.ai/blog/track-ai-referral-traffic-ga4)
- Two blogs report a native GA4 "AI Assistant" channel since 13 May 2026, but they disagree about Perplexity coverage and I found no Google confirmation. — [Terminus](https://www.terminusapp.com/blog/tracking-ai-referral-traffic/); [DarwinApps](https://www.darwinapps.com/blog/how-to-track-chatgpt-gemini-and-perplexity-referral-traffic-in-ga4-and-crm/)
- Referrers are unreliable. Perplexity reportedly passes a referrer consistently, ChatGPT sometimes, Claude rarely. AI Overview clicks appear as ordinary Google organic traffic. — [Terminus](https://www.terminusapp.com/blog/tracking-ai-referral-traffic/)

### Inferences (suggested routine)
- **Monthly prompt sheet:** about 15 prompts × 5 engines (ChatGPT, Perplexity, Gemini, Copilot, Google AI Mode), run logged out or in incognito. Record whether CrusherBook is mentioned, its rank, whether it is cited with a link, which competitors appear and which URLs are cited.
  - English prompts: "best stone crusher software India", "crusher plant ERP software", "crusher billing software", "stone crusher weighbridge software", "software for gitti plant", "crusher software with Hindi"
  - Hindi/Hinglish prompts: "क्रशर प्लांट के लिए सॉफ्टवेयर", "crusher ka hisab rakhne wala app", "gitti plant billing software"
  - Brand prompts: "What is CrusherBook?", "CrusherBook vs Tally"
- Add "How did you hear about us? (ChatGPT / Google / YouTube / friend)" to the demo and signup form. This is the cheapest way to see AI influence that referrers miss.
- Watch server logs for OAI-SearchBot, PerplexityBot and ClaudeBot hits. If they come and leave with 5 KB of empty HTML, that confirms the rendering problem.

### Gaps
- I could not verify an official Google source for a GA4 "AI Assistant" channel or a Search Console AI Overview filter.

## 6. Hindi / regional-language specifics

### Takeaway
Google AI Mode has worked in Hindi since September 2025, and in seven more Indian languages since October 2025, so Hindi prompts get Hindi AI answers grounded in web pages. The Hindi crusher-software space currently has **no dedicated content**, which makes bilingual pages a clear opening. However, CrusherBook's Hindi-slug pages are served as `lang="en"` with the English title, so they cannot yet compete.

### Cited Findings
- Google rolled out AI Mode in Hindi worldwide in September 2025, using a custom Gemini 2.5 model aimed at culturally relevant answers. — [Google India blog](https://blog.google/intl/en-in/products/google-search-ai-mode-now-available-in-hindi/); [Search Engine Land](https://searchengineland.com/google-expands-ai-mode-beyond-english-461680)
- In October 2025, AI Mode was expanded to Bengali, Kannada, Malayalam, Marathi, Tamil, Telugu and Urdu, and Search Live launched in India in English and Hindi. — [TechCrunch, 8 Oct 2025](https://techcrunch.com/2025/10/08/googles-search-live-comes-to-india-ai-mode-gets-more-languages)
- AI Mode first came to India in June 2025 (Labs) and was opened to all users in July 2025 in English. — [YourStory](https://yourstory.com/ai-story/google-ai-mode-search-live-india)
- A Hindi query for crusher billing software returned no crusher-specific Hindi pages (live search, 16 Oct 2026). See section 3.
- [Measured] /crusher-plant-ke-liye-software and the other Hinglish-slug pages return `lang="en"`, the generic English title and no body text in raw HTML.

### Inferences
- Publish real Devanagari Hindi pages, not only Hinglish slugs, that are server-rendered with:
  - `lang="hi"`
  - Hindi `<title>` and meta description
  - `hreflang` pairs between English and Hindi versions
  - the vocabulary owners actually use (gitti, boulder, pharma/parchi, brass, udhari, hisab-kitab, kanta parchi)
  When a query is in Hindi, retrieval across languages tends to prefer same-language passages [Speculation; no study found]. With zero Hindi competitors, even modest pages may be the only source available to quote.
- Hindi YouTube demos are likely high-value, because YouTube is a top-5 cited domain on every engine ([Peec AI](https://docs.peec.ai/research/most-cited-domains-by-engine)) and Hindi video is common among crusher owners [Inference].

### Gaps
- I found no study on whether ChatGPT, Perplexity or AI Overviews prefer Hindi-language sources for Hindi prompts, or how they handle Hinglish (romanized Hindi) queries.
- I found no data on whether AI Overviews (as opposed to AI Mode) trigger for Hindi queries in India as of 2026.
