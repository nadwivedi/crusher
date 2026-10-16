# Hindi, Hinglish and Regional-Language SEO Keywords for CrusherBook

Method note: The most reliable primary data in these notes is live Google autocomplete. On 2026-10-11 I queried `suggestqueries.google.com` with `hl=hi&gl=in` for about 150 seed terms, plus YouTube autocomplete (`ds=yt`). Autocomplete only shows a term once enough people search it. So "appears with many completions" means relative volume is higher, and "no completions" means it is low or unknown. These are not search volumes. No keyword-tool volume data (Ahrefs, Semrush, Keyword Planner) was available, and I have not invented any numbers. The WebSearch tool is US-based and returned almost nothing useful for Devanagari queries, so the competitor/SERP findings below are partial.

Citation conventions:
- [AC] = Google autocomplete, India, hl=hi, fetched 2026-10-11, endpoint https://suggestqueries.google.com/complete/search?client=firefox&hl=hi&gl=in&q=...
- [YT-AC] = the same endpoint with `ds=yt`.

Existing crusherbook.com pages, from `webpage/src/data/landingPages.js`: stone-crusher-management-software, stone-crusher-accounting-software, crusher-billing-software, crusher-weighbridge-software, quarry-management-software, quarry-crusher-management-software, best-quarry-crusher-management-software, stone-crusher-management-app, quarry-management-system, crusher-hisab-kitab-app.

---

## Q1. Which Hindi/Hinglish terms are used for crusher accounting and business, by intent cluster?

### Takeaway
The demand is real but split. Hinglish phrases for crusher accounting ("crusher ka hisab", "crusher munshi", "crusher udhari", "dumper ka hisab") have no autocomplete at all, so volume is near zero and nobody competes for them. The neighbouring terms do have clear demand:
- generic ledger terms: "hisab kitab app", "udhar khata app", "truck/tractor/jcb ka hisab"
- slip and billing terms: "kanta parchi app", "dharam kanta software", "crusher bill book"
- rate terms: "gitti ka rate", "gitti rate today", "20mm gitti price"
- business how-to: "crusher plant lagane ka kharcha", "stone crusher business kaise kare"
- royalty and transit-pass terms: "royalty kaise nikale", "khanij online cg", "dmg rajasthan erawana"

The best play is to target the adjacent high-volume terms and connect them to crusher use cases. Do not build pages for exact-match crusher-accounting phrases that nobody searches.

### Cited Findings

**Cluster A: app/software seeking (commercial; best fit for landing pages)**

| Keyword | What autocomplete showed | Relative volume | Notes |
|---|---|---|---|
| stone crusher software | 9 completions incl. "free download", "billing", "management", "accounting", "accounting software free download", "best", "erp", "plant management" [AC] | Medium (for a niche) | English, but Indian searchers use it. "free download" appears repeatedly, so many searchers expect desktop software |
| crusher billing software / stone crusher billing software / crusher bill book / stone crusher bill book format / crusher bill format | all present [AC] | Low-medium | "bill book format" intent = a printable template. Good for a free downloadable bill/slip template that funnels into the app |
| dharam kanta software / dharam kanta parchi software / dharam kanta billing software / dharam kanta software free download | present [AC] | Low-medium | Weighbridge operators. Maps to the existing crusher-weighbridge-software page; a Hinglish variant could work |
| kanta parchi app / kanta parchi app free download / kanta parchi format / kanta parchi kaise nikale / कांटा पर्ची | present [AC]; YT-AC: "kanta parchi kaise nikaalte hain", "कांटा पर्ची कैसे निकाले", "computer kanta parchi kaise nikale" [YT-AC] | Medium | Strong how-to and YouTube intent. Many searches for "kanta parchi" are about paper, printer or font, i.e. the physical slip |
| weighbridge slip format in excel / word / pdf free download | many completions [AC] | Medium | Template intent. Offer a free Excel/PDF slip template plus a "make it on your phone" CTA |
| hisab kitab app / हिसाब किताब app / hisab kitab app for pc / download | 10 completions [AC] | High (generic) | OkCredit ranks with a dedicated /hisab-kitab-app page ([OkCredit](https://okcredit.in/hisab-kitab-app)). CrusherBook's crusher-hisab-kitab-app page already targets the crusher angle |
| udhar khata app / udhaar khata app / उधार खाता ऐप / udhari app / udhari khata app / udhari likhne wala app | 10 completions each [AC] | High (generic) | Khatabook and OkCredit dominate. A niche angle such as "crusher udhari app" has no autocomplete [AC] |
| truck hisab app / truck ka hisab kaise rakhe / tractor hisab app / jcb ka hisab kaise kare | present [AC] | Medium | Shows that vehicle-hire ledger intent exists. Dumper/hywa/tipper versions ("dumper ka hisab", "hywa ka hisab", "tipper ka hisab") returned nothing [AC] |
| diesel ka hisab / diesel ka hisab kaise jode | present [AC] | Low | Blog or calculator opportunity |
| party ka hisab / party hisab / party ledger app | present [AC] | Low | Fits the udhari/WhatsApp ledger feature |
| crusher app / stone crusher app / crusher management app | "crusher app" completions are dominated by unrelated meanings (headphones, BG3 game) [AC]; "stone crusher app" has 3 completions [AC] | Low | Ambiguous term. Pair "crusher" with "stone" or "gitti" |
| crusher ka hisab / crusher hisab kitab / crusher khata / crusher udhari / crusher munshi / crusher app hindi | no completions [AC]; "crusher ka hisab" also empty on YouTube [YT-AC] | Very low / unknown | No competition, so easy to rank, but little traffic. Keep them as secondary terms on the existing Hinglish page, not as separate pages |
| gitti ka hisab kaise kare | single completion [AC] | Low | Blog/how-to topic: "gitti ka hisab ton/brass/cft mein kaise kare" |

**Cluster B: rates/prices (informational, very high volume, lead magnet rather than purchase intent)**

| Keyword | What autocomplete showed | Notes |
|---|---|---|
| gitti ka rate / गिट्टी का रेट / गिट्टी का रेट आज का / gitti rate today | 10 completions each; variants "kya chal raha hai", "2025", "2026", "उत्तर प्रदेश today 2026", "bihar today" [AC]; also on YouTube: "gitti ka rate kaise pata kare", "kaise nikale" [YT-AC] | Highest-volume cluster found. Searchers are mostly buyers (house builders), not crusher owners |
| gitti rate in {city} | indore, bhopal, jabalpur, bihar, up, ballia, varanasi, siwan, gopalganj, prayagraj, gorakhpur, gwalior, raipur, chhattisgarh, rajasthan [AC] | City/state pages are possible; UP, Bihar and MP lead |
| gitti price 1 tractor / per truck / per kg | present [AC] | Shows the units buyers think in (tractor/truck load) |
| 10mm / 20mm / 40mm gitti (rate, price, gst rate, hsn code, weight, density) | present [AC] | "20mm gitti hsn code", "gst rate" and "density/weight" are evergreen reference queries |
| gitti gst rate / gitti hsn code / crusher gst rate / stone crusher gst hsn code / crusher dust gst rate / गिट्टी जीएसटी रेट / gitti per gst kitna hai | many completions [AC] | Good evergreen reference post. Owners and munshis search it while billing |
| crusher rate / crusher rate today / in haryana, gurgaon, punjab, mathura / क्रेशर रेट | present [AC] | "crusher" itself means the aggregate in North India (Haryana/Punjab) |
| stone dust rate / crusher dust rate / dust rate in noida, ghaziabad, delhi, agra, haryana, faridabad | present [AC] | NCR-heavy |
| chura rate / chura ka rate / चुरा रेट | present but mixed with the food meaning (poha/chura) [AC] | Ambiguous. Low priority |
| boulder rate per ton / per cubic meter / per cft / boulder royalty rate / boulder gst rate | present [AC] | Fits the purchase side (boulder buying) |
| pathar ka rate / pathar ka rate kya chal raha hai | present but mixed with granite/marble flooring [AC] | Ambiguous |
| rodi rate / rodi ka rate / rodi rate in delhi, gurgaon, noida, jaipur / rodi badarpur ka rate | present [AC] | Delhi-NCR, Haryana and Jaipur word for aggregate |
| bajri rate / in rajasthan, jaipur, pune, punjab / बजरी रेट | present [AC] | In Rajasthan, bajri = sand/fine aggregate |
| kapchi rate / kapchi rate in ahmedabad / in gujarat / kapchi gst rate / કપચી નો ભાવ | present [AC] | Gujarati word for aggregate |
| khadi rate per brass / in pune / in maharashtra | present [AC] | Marathi word (खडी) with the unit brass (100 cft) |
| jalli rate in tamilnadu, chennai / ஜல்லி விலை இன்று / ஒரு யூனிட் ஜல்லி விலை / ஒரு லோடு ஜல்லி விலை | present [AC] | Tamil. The units are "unit" and "load" |
| m sand rate (bangalore, hyderabad, chennai) | present [AC] | South India; crushers also make M-sand |

**Cluster C: business how-to and profit (informational, high value for top-of-funnel; YouTube-heavy)**

| Keyword | What autocomplete showed |
|---|---|
| crusher ka business kaise kare / stone crusher ka business kaise kare / stone crusher business kaise start kare | present [AC]; "stone crusher business full details", "kaise kare" [YT-AC] |
| crusher plant lagane ka kharcha / crusher plant lagane me kitna kharcha aata hai | present [AC] |
| crusher plant kaise lagaye / stone crusher plant kaise lagaye / crusher plant kaise chalta hai / crusher ka kaam kaise hota hai | present [AC] [YT-AC] |
| crusher business profit / income / monthly income / investment in india / plan | present [AC] |
| stone crusher business profit per month / per day / cost / is legal or illegal / plan pdf (india) | present [AC] |
| stone crusher plant setup cost / price in india / 50 tph / 100 tph price / project cost | present [AC] |
| गिट्टी का बिजनेस कैसे करें / gitti ka business kaise kare / balu gitti ka business / ret gitti ka business / gitti morang ka business | present [AC]. This is the trader/dealer persona (sells sand and aggregate) |
| स्टोन क्रेशर प्लांट प्रोजेक्ट रिपोर्ट / स्टोन क्रेशर बिजनेस / क्रशर उद्योग / स्टोन क्रशर व्यवसाय | present [AC] |
| gitti crusher business / mini gitti crusher / gitti crusher plant price | present [YT-AC] [AC] |
| crusher plant manager jobs / crusher plant operator / crusher job vacancy | present [AC]. This is the staff/munshi persona; a job-related angle exists |
| crusher se kitni kamai / crusher munshi salary | no completions [AC] |

Supporting content facts already published in English (useful for a Hindi explainer):
- A crusher business is "two businesses bolted together": a quarry (a mine) and a crusher (a factory). It needs a quarry lease under MMDR s.15, a crusher licence under state law, and SPCB consents (CTE and CTO). Environmental clearance (Category B, SEIAA) attaches to the quarry, not the crusher — [calcguru.in](https://calcguru.in/how-to-start-a-stone-crusher-business-in-india/)
- Royalty is the biggest recurring cost: about Rs 80/MT in Karnataka versus Rs 23-30 in Rajasthan, plus DMF and NMET. Typical capex is Rs 1.5-4.3 crore for a 30-60 TPH plant without tippers. GST on output is 5%. Real utilisation is 40-60% of nameplate capacity — [calcguru.in](https://calcguru.in/how-to-start-a-stone-crusher-business-in-india/) (single secondary source; verify before republishing)
- Project report: a 150 t/day unit with about Rs 80 lakh plant and machinery and about Rs 190 lakh total investment — [Entrepreneur India](https://www.entrepreneurindia.co/project-details/stone-crusher-manufacturing-plant-detailed-project-report-profile-business-plan-industry-trends-market-research-survey-manufacturing-process-machinery-raw-materials-feasibility-study-investment-opportunities-cost-and-revenue-plant-economics) (vendor report; may be optimistic)

**Cluster D: license/royalty/legal (informational and navigational; strongly state-specific)**

| Keyword | What autocomplete showed |
|---|---|
| crusher plant license / stone crusher plant license / stone crusher plant license cost | present [AC] |
| stone crusher license in maharashtra (price) / in karnataka / in tamil nadu / crusher license in kerala | present [AC] |
| खडी क्रशर परवाना (Marathi: crusher licence) / स्टोन क्रेशर नियम महाराष्ट्र मराठी | present [AC] |
| royalty kaise nikale / royalty kaise check kare / रॉयल्टी कैसे निकाले / रॉयल्टी कैसे चेक करें / royalty kaise milti hai | present [AC] |
| mining royalty rates in madhya pradesh / in rajasthan / mining royalty check / gst rate / hsn code | present [AC] |
| boulder royalty rate | present [AC] |
| rajasthan royalty check (online) / dmg rajasthan royalty / dmg rajasthan erawana / transit pass / vehicle registration / राजस्थान रॉयल्टी | present [AC] |
| e rawanna / eravana check / ई रवन्ना / e ravanna uttarakhand / e ravanna app download | present [AC] |
| khanij online cg (login, 2.0, app) / khanij vibhag mp / khanij mp | present [AC] (Chhattisgarh/MP portals) |
| etp mp / etp mp verify / etp khanij / mp etp mining login | present [AC] (MP electronic transit pass) |
| khadan parchi / khadan parchi mp / khadan portal mp / khadan parchi check karna hai | present [AC] |
| royalty parchi / mining parchi | present, but with no extra completions [AC] (low volume) |
| crusher plant license kaise / consent to operate crusher / crusher plant noc | no completions [AC] |

- Karnataka has a dedicated Karnataka Regulation of Stone Crushers Act, 2011. A licence is issued after a safer-zone compliance certificate and a KSPCB Consent for Operation, and renewal must be applied for three months before expiry — [PRS India](https://prsindia.org/files/bills_acts/acts_states/karnataka/2012/2012Karnataka8.pdf); [CaseMine](https://www.casemine.com/act/in/5a9cccf34a932653478126e7)
- In 2021, Jammu & Kashmir removed the licence requirement for stone crushers and hot/wet-mix plants — [Kashmir Life](https://kashmirlife.net/no-license-required-to-operate-stone-crushers-hot-and-wet-mixing-plants-260476/)

### Inferences
- **Volume tiers (relative, from autocomplete breadth):**
  - High: gitti ka rate / gitti rate today, hisab kitab app, udhar khata app, stone crusher (machine/plant/price).
  - Medium: stone crusher software, kanta parchi, weighbridge slip format, crusher business profit/kharcha, gitti gst/hsn, royalty kaise nikale, state portal names.
  - Low: crusher billing software, dharam kanta software, crusher bill book, boulder rate, diesel ka hisab.
  - Very low / unknown: crusher ka hisab, crusher munshi, crusher udhari, dumper ka hisab.
- **Searcher persona per cluster:**
  - Rates: mostly buyers (house builders and contractors), not owners.
  - App/hisab: owners and munshis.
  - Business how-to: aspiring owners.
  - Royalty/portal: owners, transporters and munshis (high fit with the munshi persona).
- **Gaps between demand and the existing site:**
  - The kanta parchi / weighbridge slip "format" cluster (template intent).
  - GST/HSN for gitti.
  - Hinglish business how-to.
  - Vehicle-hire ledger ("truck/tractor/jcb ka hisab" exists; the dumper version doesn't yet, but the concept matches).

### Gaps
- No absolute search volumes; keyword tools were not available. Google Keyword Planner (India, Hindi + English) or a Search Console impression test is needed to rank the clusters.
- I could not view live Google SERPs for Devanagari queries, because the search tool is US-based and returned irrelevant results for Hindi queries.

---

## Q2. What do YouTube and Google autocomplete in Hindi show for crusher/quarry business topics?

### Takeaway
YouTube autocomplete is dominated by "how it works / how to start / machine price" and by regional-language versions ("crusher business in kannada / telugu / malayalam / odisha / marathi"). It also shows strong "kanta parchi kaise nikale" how-to intent. Accounting topics ("crusher ka hisab", "dumper ka hisab", "crusher munshi", "royalty parchi") have no YouTube autocomplete, so the topic is open but the audience is small.

### Cited Findings
- "crusher business" on YouTube completes to: in kannada, telugu, malayalam, in odisha, status, plan, kaise kare, in india, explain [YT-AC]
- "stone crusher business" on YouTube completes to: full details, kaise kare, plan, telugu, kannada, status, "rajni chaudhary" (an individual creator's name, so creator-led content ranks here), marathi, in maharashtra [YT-AC]
- "gitti crusher" on YouTube: गिट्टी क्रेशर, machine, machine price, business, plant, गिट्टी क्रेशर मशीन की कीमत, mini gitti crusher, gitti todne wala crusher [YT-AC]
- "crusher plant" on YouTube: kaise lagaye, machine, business, fitting, job, panel, project cost, working [YT-AC]
- "gitti ka rate" on YouTube: गिट्टी का रेट क्या है, today, kya hai 2025, kaise pata kare, kaise nikale [YT-AC]
- "kanta parchi" on YouTube: kaise nikaalte hain, कांटा पर्ची कैसे निकाले, kaise banaen, computer kanta parchi kaise nikale [YT-AC]
- "khatabook" on YouTube: app kaise chalayen, loan, billing software, kya hai [YT-AC]. Khatabook owns tutorial intent for generic ledger apps
- No YouTube completions for: crusher ka hisab, crusher munshi, crusher plant license, royalty parchi, dumper ka hisab, crusher plant chhattisgarh [YT-AC]
- "dharam kanta" on YouTube is almost entirely the 1982 film [YT-AC], so avoid it as a YouTube keyword; on Google it carries city intent (gwalior, bhopal, near me, price) [AC]

### Inferences
- **YouTube content plan for CrusherBook:**
  1. "Kanta parchi mobile se kaise banaye/nikale" (clear demand, product demo fits naturally).
  2. "Crusher plant ka hisab kaise rakhe: gitti bikri, boulder kharid, udhari, dumper bhada" (no competition; it doubles as the product walkthrough).
  3. "Crusher business mein profit kaise nikale (per ton margin)".
  4. "Gitti ka rate kaise nikale: ton vs brass vs cft vs tractor" (rate-calculation intent).
  5. Short videos in Kannada, Telugu and Marathi, since YouTube autocomplete shows those language modifiers for "crusher business".
- "kanta parchi" and "weighbridge slip format" searches mix paper/printer and template intent, so a free generator ("kanta parchi online banaye") could capture traffic beyond the template seekers.

### Gaps
- I could not list actual top YouTube video titles, channels or view counts; the search tool does not index YouTube results. Manual review is needed.

---

## Q3. Are there regional-language opportunities, and which states have the most crushers?

### Takeaway
Yes, but mainly through regional vocabulary in Roman script and Hindi/English, not native-script software queries. Each region uses its own word for gitti:
- rodi (Delhi/Haryana/Punjab)
- bajri (Rajasthan)
- kapchi / કપચી (Gujarat)
- khadi / खडी, priced per brass (Maharashtra)
- jalli / ஜல்லி, priced per unit/load (Tamil Nadu/Karnataka)
- M-sand (South)

Native-script software queries (Gujarati, Telugu, Kannada "crusher software") return nothing. I found no authoritative state-wise national crusher count; only district/state fragments exist.

### Cited Findings
- **Regional aggregate vocabulary [AC]:**
  - rodi rate (delhi, gurgaon, noida, jaipur, "rodi badarpur")
  - bajri rate (rajasthan, jaipur, pune, punjab)
  - kapchi rate (ahmedabad, gujarat, gst/hsn), કપચી નો ભાવ
  - khadi rate per brass (pune, maharashtra), खडी क्रशर परवाना
  - jalli rate (tamilnadu, chennai), ஜல்லி விலை இன்று, ஒரு யூனிட்/லோடு ஜல்லி விலை, முக்கால் ஜல்லி (3/4 inch)
  - grit rate per brass
  - m sand rate (bangalore, hyderabad, chennai)
  - crusher rate in haryana / punjab / gurgaon
- **Native-script crusher terms [AC]:**
  - Tamil கிரஷர் completes to கிரஷர் மணல் (crusher sand), கிரஷர் ஜல்லி, கிரஷர் உரிமையாளர்கள் (crusher owners), கல்குவாரி கிரஷர் (quarry crusher). This is a real but small Tamil search space.
  - Kannada ಜಲ್ಲಿ completes to ಜಲ್ಲಿ ಕಲ್ಲು (aggregate stone).
  - Telugu జల్లి is swamped by jallikattu.
  - Gujarati ક્રશર and Telugu క్రషర్ fell back to Hindi suggestions, i.e. too little native-script volume.
  - "crusher software tamil / telugu / marathi / gujarati" returned no completions.
- **State fragments (no national ranking found):**
  - Telangana: 734 stone crushing units, of which 452 have Board consent — [NGT filing](https://www.greentribunal.gov.in/sites/default/files/news_updates/922_0.pdf) (date unclear)
  - Haryana, Charkhi Dadri district: 343 units (2023), 330 (2021) — [India Environment Portal](https://indiaenvironmentportal.org.in/in-court/joint-committee-report-regarding-stone-crushers-operating-in-charkhi-dadri-district-haryana-18092023)
  - Haryana, Mahendragarh: 133 units, all closed at the time of the 2023 report for air-pollution compliance — [India Environment Portal](https://indiaenvironmentportal.org.in/in-court/report-by-the-haryana-state-pollution-control-board-regarding-stone-crushing-units-in-mahendragarh-haryana-20112023)
  - Haryana, Yamunanagar: 217 units, of which 127 operating, 50 closed by the Board and 40 found dismantled — [NGT](https://www.greentribunal.gov.in/sites/default/files/news_updates/LATEST%20JOINT%20REPORT%20BY%20DM,%20DFO%20AND%20HSPCB,%20YAMUNA%20NAGAR%20IN%20OA%20NO.%201127%20of%202024%20SUKHDEEP%20SINGH%20%20Vs%20HARYANA%20POLLUTION%20CONTROL%20BOARD%20&%20Ors.pdf)
  - Punjab, Ropar: 154 registered, 140 operational — [NGT](https://www.greentribunal.gov.in/sites/default/files/news_updates/REPORT%20IN%20OA%20NO.%2057%20of%202020%20(BACHITTER%20SINGH%20&%20CO%20VS%20STATE%20OF%20PUNJAB%20&%20ORS%20).pdf)
  - J&K: 691 units, of which 527 operational (2026) — [Kashmir Reader](https://kashmirreader.com/2026/04/03/527-stone-crushers-operational-in-jk-dy-cm/); an earlier count of 803 registered / 674 operational, including hot-mix plants — [Kashmir Life](https://kashmirlife.net/674-stone-crushers-operational-across-jammu-kashmir-says-govt-411416/)
  - MP, Rewa district: a joint inspection of 32 crushers — [NGT](https://www.greentribunal.gov.in/sites/default/files/news_updates/JCR%20IN%2036-2023.pdf)
  - UP: Sonbhadra has a published study of stone crusher unit distribution — [NGJI](https://www.ngji.in/index.php/ngji/article/view/910)
- **Gitti-rate autocomplete is concentrated in UP (Varanasi, Gorakhpur, Prayagraj, Ballia), Bihar (Siwan, Gopalganj, Muzaffarpur) and MP (Indore, Bhopal, Jabalpur, Gwalior)** [AC]. That is where Hindi aggregate-buying search is heaviest.

### Inferences
- Priority for Hindi/Hinglish content: UP, Bihar, MP, Chhattisgarh, Rajasthan, Haryana and Jharkhand (all Hindi-belt).
- Gujarat and Maharashtra are better served by English/Hinglish pages that use the local nouns (kapchi, khadi, brass) than by full Gujarati or Marathi translations.
- South India (TN, Karnataka, Telangana): use "jalli", "M-sand", "quarry" and "blue metal" in English pages. Optional Tamil/Kannada YouTube shorts. A full native-script site is not justified by the observed demand.

### Gaps
- No credible national or state-wise crusher count was found. CPCB's "Comprehensive Industry Document on Stone Crushers" (2009) exists — [India Environment Portal](https://www.indiaenvironmentportal.org.in/reports-and-documents/comprehensive-industry-document-on-stone-crushers) — but I could not extract its numbers. A Lok Sabha/Rajya Sabha question or state PCB consent lists are the next sources. Any claim that "Rajasthan/Gujarat have the most crushers" is unverified.
- I did not test "blue metal rate" or Malayalam/Odia terms; YouTube shows "crusher business malayalam" and "in odisha" [YT-AC].

---

## Q4. Which terms could support state-specific pages without being thin doorway pages?

### Takeaway
Searchers do not type "stone crusher software {state}" at all: there was no autocomplete for Rajasthan, Gujarat or Chhattisgarh variants. Pages built only on "software + state" would be thin and unsupported by demand. But each state has a different royalty/transit-pass portal, its own aggregate vocabulary and units, its own royalty rates and licensing rules. A state page built around "crusher hisab + royalty/transit pass + local rates/units for {state}" has distinct, useful content and matches real searches.

### Cited Findings
- No completions for: stone crusher software rajasthan, stone crusher software gujarat, crusher software chhattisgarh [AC]. "crusher plant rajasthan" only gives "in bharatpur rajasthan" and "stone crusher plant in rajasthan"; "crusher plant chhattisgarh" only gives "stone crusher plant in chhattisgarh" [AC]
- **State-specific demand that does exist [AC]:**
  - Rajasthan: dmg rajasthan royalty / erawana / transit pass / vehicle registration, rajasthan royalty check online, mining royalty rates in rajasthan, bajri rate in rajasthan, gitti rate in rajasthan
  - Chhattisgarh: khanij online cg (login, 2.0, app), gitti rate in chhattisgarh, gitti rate in raipur
  - MP: etp mp verify, khanij vibhag mp, khadan parchi mp, mining royalty rates in madhya pradesh, gitti rate in indore/bhopal/jabalpur/gwalior
  - Uttarakhand: e ravanna uttarakhand
  - UP: गिट्टी का रेट उत्तर प्रदेश today 2026
  - Bihar: gitti rate in bihar today
  - Haryana/Punjab: crusher rate in haryana/punjab
  - Maharashtra: stone crusher license in maharashtra price, khadi rate per brass in maharashtra, स्टोन क्रेशर नियम महाराष्ट्र मराठी
  - Karnataka: stone crusher license in karnataka
  - Tamil Nadu: stone crusher license in tamil nadu, jalli rate in tamilnadu
- Royalty differs sharply by state (Karnataka about Rs 80/MT vs Rajasthan Rs 23-30/MT) — [calcguru.in](https://calcguru.in/how-to-start-a-stone-crusher-business-in-india/); Karnataka has its own Stone Crushers Act — [PRS India](https://prsindia.org/files/bills_acts/acts_states/karnataka/2012/2012Karnataka8.pdf)
- Existing vendors already use geo pages, e.g. "Stone Crusher Management Software ... Rajasthan, India" — [Softwares Window](https://www.softwareswindow.com/softwares/crusher-management-software/)

### Inferences
- **Recommended state pages (each needs at least 3 unique facts):**
  1. "Rajasthan crusher hisab + eRawanna/royalty guide" (bajri/gitti, DMG portal, royalty records alongside each sale)
  2. "Chhattisgarh gitti crusher hisab + Khanij Online CG" (also CrusherBook's likely home market, so local case studies are possible)
  3. "MP crusher hisab + ETP/khadan parchi"
  4. "UP/Bihar gitti rate and crusher hisab" (rate-led)
  5. "Haryana rodi/crusher" (NCR rate-led)
  6. "Maharashtra khadi crusher: brass-to-ton conversion + licence"
  7. "Gujarat kapchi crusher"
  8. "Tamil Nadu/Karnataka jalli & M-sand crusher"
- **What makes them not doorways:** the state's portal walkthrough, its royalty/transit-pass fields, local units (brass, unit, load, tractor, cft), local product names, licence authority, and ideally a local customer testimonial. Each page must also link to the product.
- Make the gitti/rodi/kapchi/khadi/jalli "rate" pages a "rate tracker / calculator" (ton ↔ brass ↔ cft ↔ tractor) instead of publishing prices. Prices change daily, and invented or stale prices are a trust risk.
- Risk to manage: CrusherBook should never imply it files royalty or transit passes officially unless it integrates with the portal; describe it as a record/register. The same disclaimer appears on a competitor's listing (see Q5).

### Gaps
- No volume data per state. Use Keyword Planner or a test page per state and compare Search Console impressions after 8-12 weeks.

---

## Q5. Who currently ranks or competes for these terms?

### Takeaway
- **Generic Hinglish ledger terms:** owned by Khatabook and OkCredit.
- **Crusher software terms (English):** Indian desktop/ERP vendors and TechJockey listings.
- **Bilingual Hindi/Hinglish crusher app:** a direct competitor exists on Play Store, Crusher Suvidha.
- **Rate terms:** IndiaMART-style listing pages and YouTube.
- **Accounting-specific Hinglish crusher terms:** I found no ranking content.

### Cited Findings
- OkCredit runs a dedicated "Hisab Kitab App" landing page aimed at daily len-den — [OkCredit](https://okcredit.in/hisab-kitab-app)
- Khatabook has a large Hindi blog (/blog/hi/, 280+ pages of posts) — [Khatabook Hindi blog](https://khatabook.com/blog/hi/?page=284). No crusher-specific post surfaced in my searches.
- **Crusher Suvidha** (Play Store package in.crushersuvidha.app) — [chrome-stats listing](https://chrome-stats.com/d/in.crushersuvidha.app):
  - It is a bilingual Hindi + Hinglish platform for stone crusher owners, contractors, workers, suppliers, buyers and transporters.
  - It includes a "Royalty Register" and "GST Invoice" tool, and states these are personal records, not official filings.
  - It is the closest direct competitor for Hindi/Hinglish app intent. I could not fetch its installs/rating (Play Store and chrome-stats pages blocked or truncated).
- Indian crusher software vendors that would compete on "stone crusher software" / "crusher management software":
  - Stone Crusher Software by LogiBit on TechJockey, with comparison pages vs Vyapar, Apna Billbook, Khatabuddy etc. — [TechJockey](https://techjockey.com/detail/stonecrusher-software)
  - [Softwares Window (Rajasthan)](https://www.softwareswindow.com/softwares/crusher-management-software/)
  - [CrushSoft](https://crushsoft.in/)
  - [SAZS Apps crusher & quarry ERP](https://sazsapps.com/products/crusher-management-software.html)
  - [Inniti ERP](https://www.innitisoftware.com/stone-crusher-management-erp-system)
  - [SyvaSoft](https://www.syvasoft.com/industries/quarrying-and-stone-crushing)
  - [Essae Digitronics crusher production management](https://essaedig.com/weighing-solutions/crusher-production-management-system/)
  - [Orbit IT QuarryMate](http://www.orbititsolution.com/SOFTWARE%20PROJECTS/Quarry%20mate/QuarryMate.html)
  - An IndiaMART listing at Rs 1,50,000 — [IndiaMART](https://www.indiamart.com/proddetail/stone-crusher-management-software-27114270991.html)

  None of these surfaced with Hindi/Hinglish pages or an udhari/WhatsApp-ledger angle.
- Quarry360 publishes content on "stone crusher software" (Issuu) — [Issuu](https://issuu.com/quarry360/docs/the_fastest_stone_crusher_software_streamlining_y). "quarry 360 software" also appears in autocomplete [AC].
- Rate queries: IndiaMART city pages list 20mm/40mm aggregate, e.g. Morena — [IndiaMART](https://m.indiamart.com/city/morena/construction-aggregates.html)
- Business how-to: English guides (calcguru, Bajaj Finserv "what is stone crusher", Entrepreneur India project reports) — [calcguru](https://calcguru.in/how-to-start-a-stone-crusher-business-in-india/), [Bajaj Finserv](https://www.bajajfinserv.in/what-is-stone-crusher). I found no strong Hindi text article in search results (the WebSearch tool's Hindi coverage is weak, so this is not conclusive).
- Low-quality AI-generated pages on "crusher apps" (on an asburyseminary.edu subdomain) show up for "crusher hisab kitab app" in US-index search — [example](https://dev.asburyseminary.edu/manual/what-is-the-best-crusher-app-for-android-srwu.html). This shows how thin the competition is for the query.

### Inferences
- **Content ideas by cluster:**
  - **Landing pages (Hinglish, with Devanagari H1/H2 variants):**
    1. kanta parchi app / dharam kanta parchi software ("mobile se kanta parchi banaye")
    2. gitti bikri aur udhari app ("party ka hisab WhatsApp par")
    3. dumper/truck bhada hisab (per trip + monthly)
    4. boulder kharid register
    5. Hindi page "क्रेशर का हिसाब किताब ऐप" (a Devanagari twin of the existing crusher-hisab-kitab-app, or hreflang/lang-switch on it)
  - **Blog posts (Hindi + Hinglish):**
    1. गिट्टी का रेट कैसे निकालें: ton/brass/cft/tractor converter + calculator
    2. Gitti GST rate & HSN code (10/20/40mm, dust)
    3. Crusher plant lagane ka kharcha aur profit (per-ton margin, royalty, diesel, bijli)
    4. Stone crusher business kaise shuru kare: license, CTE/CTO, quarry lease
    5. Royalty / eRawanna / Khanij Online / ETP: crusher munshi guide by state
    6. Weighbridge (kanta) slip format free download (Excel/PDF)
    7. Diesel ka hisab kaise rakhe (crusher + dumper)
    8. Crusher munshi ka kaam: daily register checklist
  - **YouTube (Hindi; shorts + 8-12 minute walkthroughs):**
    1. kanta parchi mobile se
    2. crusher ka pura hisab ek app mein
    3. party ko udhari WhatsApp par bhejna
    4. dumper per trip vs monthly bhada hisab
    5. gitti ka rate ton vs brass
    6. Kannada/Telugu/Marathi short versions of "crusher business" explainer + demo
- Generic "udhar khata app" and "hisab kitab app" are not winnable head-on against Khatabook/OkCredit; use them only as secondary terms.

### Gaps
- Exact current Google India rankings for any Hindi term are unverified; the search tool is not India-localised.
- Crusher Suvidha's install count, rating and keyword ranking are unknown; check Play Store manually.
- I found no Play Store listing data for other "crusher hisab" apps; a manual Play Store search for "crusher", "gitti", "kanta parchi" is recommended.
