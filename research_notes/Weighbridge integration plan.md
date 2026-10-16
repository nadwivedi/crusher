# CrusherBook weighbridge integration: research and build plan (17 October 2026)

## 1. The problem in one line

CrusherBook runs in the cloud (Express + MongoDB on our server, React in the browser). The weighbridge indicator sits in the kanta cabin and only talks over a **serial cable (RS-232, sometimes RS-485 or USB)** to the PC next to it. A website on our server cannot reach that cable by itself, so **something on the plant side has to read the cable and pass the weight to the cloud.**

## 2. How a weighbridge sends its weight

- The load cells go to a **weighing indicator** (the box with the red or green digits). Common makes at Indian crushers: Essae, Avery India (ZM series), Leo, Rice Lake, and many XK3190-A9/A12 based indicators sold under local names.
- Most indicators have an RS-232 port that **sends the displayed weight several times a second** ("continuous mode"). Usual settings are **9600 baud, 8 data bits, no parity, 1 stop bit (9600-8-N-1)**, but 1200/2400/4800 also occur. The settings are chosen in the indicator's menu.
- **Every make uses its own text format.** Real examples:
  - GEC Avery: `ST,GS,+00679.4Kg` + CR LF, where ST = stable, US = unstable, GS/NT = gross/net, and `OL` = overload. [Vinsight docs](https://docs.vinsight.net/serial-port-settings-for-specific-weighbridge-models)
  - PT200: `{STX}     30G kg{ETX}` (start/end control characters, space padded). [Vinsight docs](https://docs.vinsight.net/serial-port-settings-for-specific-weighbridge-models)
  - Generic indicators: status codes ST/US/OL, GS/NT, kg/lb at 9600 baud in continuous mode. [Rostek LP7516 manual](https://rostek.cl/wp-content/uploads/2020/03/LP7516-Manual-1.pdf)
  - XK3190-type indicators (very common in India) are widely reported to send `=` followed by the digits **in reverse order**. This is to be confirmed on a real unit.
- Scales often add leading zeros and status characters, so the advice everywhere is: **capture the real output first** with a terminal program (PuTTY or RealTerm) before writing a parser. [Industrial Monitor Direct](https://industrialmonitordirect.com/blogs/knowledgebase/interfacing-weighing-scales-to-plcs-via-rs232-serial)
- Modern PCs have no COM port, so a **USB-to-RS232 adapter** is used (FTDI or PL2303 chip, about Rs 300–900). Depending on the indicator, it may also need a **null-modem** (crossed TX/RX) cable.

**Conclusion:** the parser must be **configurable per plant** (a set of known formats plus a "learn from sample" option), not hard-coded.

## 3. Ways to get the weight from the cabin PC to the cloud

| # | Method | What runs at the plant | Pros | Cons |
|---|---|---|---|---|
| A | **Web Serial in the browser** | Nothing to install. Chrome or Edge on the cabin PC opens app.crusherbook.com and the operator picks the COM port once | Zero install, fastest to ship, no extra hardware. Supported in desktop Chrome and Edge 89+. [Chrome docs](https://developer.chrome.com/articles/serial), [caniuse](https://caniuse.com/web-serial) | Works only while that browser tab is open. Desktop Chrome/Edge only: no Firefox (until recently), no Safari, and **no USB serial on Android** (Android supports Bluetooth serial only). [Chromium intent](https://groups.google.com/a/chromium.org/g/blink-dev/c/BqUGCcurReE/m/XbuAYkRxEQAJ) The weight passes through the browser, so it is less tamper-proof |
| B | **CrusherBook Weighbridge Agent** (small Windows program) | A tiny program that starts with Windows, reads the COM port and pushes readings to our server over HTTPS/WebSocket | Always on. Live weight on **any** device (owner's phone, munshi's tablet). Works through internet cuts (queues readings). Weight goes straight from cable to server, so it is much harder to fake. This is the pattern the established products use: Weighsoft's local service, OpenWeigh Bridge Link, the SAP Cloud Connector. [Weighsoft](https://help-weighsoft.theaccessgroup.com/en/articles/12585045-installing-weighbridge-integration-software), [OpenWeigh](https://www.openweigh.com/bridge_link.html), [SAP community](https://community.sap.com/t5/enterprise-resource-planning-blog-posts-by-sap/weigh-bridge-integration-in-s-4hana-public-cloud/ba-p/13555974) | One install per plant. We must build, sign and auto-update a Windows program |
| C | **Serial-to-WiFi/4G box** (no PC) | A small box wired to the indicator that sends data straight to the internet (USR-DR404 Wi-Fi with MQTT/HTTP client, USR-G771 4G modem) | No PC needed. Good for plants with only a phone. [USR-DR404 datasheet](https://cdn.soselectronic.com/productdata/83/bd/3d95b801/usr-dr404.pdf) | Rs 3,000–8,000 hardware per site, set-up by hand, and its message format has to be matched |
| D | **Plant already runs local weighbridge software** | Their program owns the COM port, and only one program can open a port at a time | — | We either (1) split the indicator output with a read-only Y-cable or use its second port, (2) read that program's database or CSV export, or (3) replace it with ours |

### Recommendation
- **Phase 1: Method A (Web Serial).** It ships in about 2 weeks, needs no installer, lets us pilot at 1–2 plants and learn the real indicator formats.
- **Phase 2: Method B (Agent).** This becomes the "real" Enterprise feature: live weight everywhere, offline queue, server-trusted weights, camera photos.
- Methods C and D are supported later, case by case. The server API is built **once** and serves A, B and C equally: every source just posts "readings" to the same endpoint.

## 4. How it will work for the user (the target flow)

### Sale (empty truck comes in, leaves loaded)
1. The truck stands on the kanta. The operator opens **Weighbridge → New weighment** and sees the **live weight** (big digits, green when stable).
2. The operator types or picks the vehicle number and presses **Capture first weight** = tare (empty). An open ticket with an auto **RST number** is created.
3. The truck loads at the crusher and comes back on the kanta. The operator opens the ticket and presses **Capture second weight** = gross.
4. Net = gross − tare. The operator presses **Make sale**: the existing Add Sale form opens with vehicle, RST, gross, tare, net and times filled in. **The weight fields are locked**, so only the party, material and rate are chosen.
5. A printed slip and/or WhatsApp slip goes out (reusing the existing automated WhatsApp feature).

### Boulder purchase (loaded truck in, empty out)
The same flow in reverse: first weight = gross, second = tare, then **Make boulder entry**.

### Single weighing with stored tare
For own or regular vehicles we keep the **last tare per vehicle** (on the `Vehicle` model). Then one weighing is enough, and a warning shows if today's tare differs from the stored one by more than X kg.

### Owner view
Owners see live weight and today's tickets on their phone, plus a report of **manual overrides, weight jumps and short stays on the bridge** (anti-fraud, see section 7).

## 5. Technical design

### 5.1 Data model (MongoDB, follows the existing models)
- **`WeighbridgeDevice`**: `userId`, `name` ("Kanta 1"), `sourceType` (`browser` | `agent` | `iot`), `tokenHash`, serial settings (`baudRate`, `dataBits`, `parity`, `stopBits`), `parserProfile` (id or custom regex), `unit` (`kg`), `minWeightKg`, `stableMs`, `lastSeenAt`, `lastReading` {weightKg, stable, at}, `active`.
- **`Weighment`** (the ticket): `userId`, `deviceId`, `rstNo` (auto from `Counter`), `vehicleNo`, `vehicleId`, `direction` (`sale` | `boulder` | `other`), `first` {weightKg, at, source: `device`|`manual`, readingId, photoUrls[]}, `second` {…}, `grossKg`, `tareKg`, `netKg`, `status` (`open` | `closed` | `used` | `cancelled`), `linkedSaleId`, `linkedBoulderId`, `manualOverride` {by, reason, at}, `createdBy`, and `hash` + `prevHash` for a tamper-evident chain per plant.
- **`WeighReading`** (optional, TTL index, e.g. 30 days): raw stable readings received, for audit and debugging.
- **`Sales` and `Boulder`**: add `weighmentId` and `weightSource` (`manual` | `weighbridge`). The existing `rstNo`, `grossWeight`, `tareWeight`, `netWeight`, `entryTime` and `exitTime` fields are reused, with no breaking change.
- **`User.featureAccess.weighbridge`**: a new flag in the existing `featureAccess` block, so the admin turns it on for **Enterprise** customers.

### 5.2 Server API (`backend/routes/weighbridgeRoutes.js`)
| Method | Path | Who | Purpose |
|---|---|---|---|
| POST | `/api/weighbridge/devices` | owner | Create a device and return a 6-digit **pairing code** (valid 10 minutes) |
| POST | `/api/weighbridge/pair` | agent | Swap the pairing code for a long-lived **device token** (stored hashed) |
| WS | `/api/weighbridge/agent` | agent | The agent streams readings `{seq, weightKg, stable, raw, at, sig}` |
| POST | `/api/weighbridge/readings` | browser (A) / IoT (C) | The same reading format over HTTPS, for sources that do not keep a socket open |
| GET (SSE) | `/api/weighbridge/live?deviceId=` | logged-in users | Server-Sent Events push of the live weight to any screen (one-way, so simpler than WebSocket) |
| POST | `/api/weighbridge/weighments` | staff | Open a ticket and capture the first weight **from the server's latest stable reading** |
| POST | `/api/weighbridge/weighments/:id/second` | staff | Capture the second weight and compute net |
| POST | `/api/weighbridge/weighments/:id/override` | owner only | Manual weight with a reason (logged and flagged) |
| GET | `/api/weighbridge/weighments` | staff | List and filter tickets (open/today/vehicle) |

**Key rule:** the capture endpoints do **not** accept a weight from the client. The server takes the last stable reading it received from that device within the last ~3 seconds. A user can therefore not type a fake weight into a "weighbridge" ticket. Manual weights exist only through `override`, which is owner-only and appears in reports.

**Realtime plumbing:** add the `ws` package for the agent socket and use plain Express SSE for browsers. The latest reading per device is kept in memory (one Node process under PM2 today). nginx needs `proxy_http_version 1.1`, the `Upgrade`/`Connection` headers on `/api/weighbridge/agent`, and `proxy_buffering off` on `/live`.

### 5.3 Parser and stable-weight detection (shared code)
Written once as a small JS module (`weighParser.js`), used by the browser (Method A) and the server (checking agent raw frames). The agent gets the same logic ported.
- **Profiles:** `avery-st-gs` (`ST,GS,+00679.4Kg`), `stx-etx`, `xk3190-reversed` (`=` + reversed digits), `plain-number` (first signed number in the line), and `custom` (owner-supplied regex with a capture group plus a multiplier).
- **Auto-detect:** read 5 seconds of raw data, try each profile, and pick the one that gives steady, plausible numbers (0–150,000 kg). The operator confirms by comparing with the indicator display.
- **Stable when:** the indicator's own ST flag is present, **or** readings stay within ±1 division (e.g. 10 kg) for `stableMs` (default 2,000 ms) **and** the weight is above `minWeightKg` (e.g. 500 kg, so an empty bridge is ignored).

### 5.4 Method A: Web Serial (Phase 1)
- A new **Weighbridge** screen in `frontend` with a **Connect** button. It calls `navigator.serial.requestPort()`, opens the port with the saved settings, pipes it through `TextDecoderStream`, splits lines, parses and detects stable weight.
- That tab posts stable readings to `/api/weighbridge/readings` (throttled, e.g. every 500 ms) using the logged-in session plus a device id, so **other screens and the owner's phone still see live weight through SSE**, as long as the cabin tab is open.
- On later visits `navigator.serial.getPorts()` reconnects without asking again.
- If the browser has no Web Serial (Firefox/Safari/phone), show: "Open this page in Chrome or Edge on the weighbridge computer."

### 5.5 Method B: the Agent (Phase 2)
- **Language: Go.** One ~8 MB `.exe` with no runtime to install, good serial support (`go.bug.st/serial`), easy to run as a Windows service, easy to cross-compile.
  - The alternative is Node + the `serialport` package. It is our own language, but it is a native module that must be rebuilt per Node/Electron version, which makes packaging and auto-update harder. [serialport notes](https://classic.yarnpkg.com/en/package/serialport)
  - Electron is too heavy for an old cabin PC.
- **What it does:**
  1. On first run it opens a small local page at `http://localhost:8765`, where the operator enters the **pairing code** shown in CrusherBook Settings, then picks the COM port and settings from a list. A live raw-data view helps choose the format.
  2. It runs as a **Windows service** (it starts at boot even if nobody logs in) and adds a tray icon showing: connected / weight / internet status.
  3. It reads the port, parses it, and sends readings over a WebSocket with `seq` (increasing number) and an HMAC `sig` made with the device token. It reconnects with back-off.
  4. **Offline queue:** if the internet drops, it saves stable readings and locally captured tickets to a small file (SQLite or JSONL) and uploads them when back online, marked `offlineCaptured`.
  5. **Auto-update:** it checks `/api/weighbridge/agent/version` daily, downloads the signed new exe, verifies its checksum and swaps itself.
  6. **Optional:** a local printer for slips, and a camera snapshot (Phase 3).
- **Installer:** Inno Setup or WiX MSI. Code-signing certificate (about Rs 15,000–30,000 a year) so Windows SmartScreen does not scare users.

### 5.6 Phase 3: cameras and extras
- **Photo at every capture:** the agent pulls a JPEG from the plant's IP camera (most have an HTTP snapshot URL or ONVIF `GetSnapshotUri`; otherwise RTSP via bundled ffmpeg) and uploads it with the ticket. Front/rear/top photos at weighing time are standard in the industry. [Avery Wi-View](https://www.averyweigh-tronix.com/en-in/wp-content/uploads/sites/4/2025/04/WI_View_WB-SurveillanceApplication_brochure.pdf), [Matrix case study](https://www.matrixcomsec.com/wp-content/uploads/2023/06/Matrix-IPVS-Kutch-Manufacturing-Unit-Weighbridge-Integration-Case-Study.pdf)
- **Number plate reading (ANPR):** reuse our existing AI OCR route on the snapshot to pre-fill the vehicle number.
- **Multi-crusher:** one device per kanta, with a `plantId` once multi-crusher is modelled.
- **Method C boxes:** document one tested Wi-Fi model (e.g. USR-DR404 in HTTP-client mode posting to `/readings`).

## 6. Delivery plan

| Phase | Scope | Rough effort (1 developer) |
|---|---|---|
| 0. Field check | Visit 2–3 customer plants. Note the indicator make/model, port, cable and existing software. Capture 1 minute of raw output from each with RealTerm. **Collect these samples first; they decide the parser.** | 2–3 days |
| 1. Server + Web Serial | Models, `featureAccess.weighbridge`, routes, SSE, parser module with tests, Weighbridge screen, connect wizard, two-step ticket, "Make sale"/"Make boulder entry" pre-fill with locked weights, RST counter, slip print | 2–3 weeks |
| 1b. Pilot | One plant on Chrome for 2 weeks. Compare every ticket with the indicator display and the paper slip | 2 weeks (in parallel) |
| 2. Agent | Go agent, pairing, service + tray, WebSocket + HMAC, offline queue, installer, auto-update, owner live view on phone | 3–4 weeks |
| 3. Extras | Camera snapshots, ANPR pre-fill, stored-tare alerts, anti-fraud report, Wi-Fi box support | 2–3 weeks |

**Testing without a weighbridge:**
- Install **com0com** (a free virtual COM-port pair) on a Windows PC.
- Write a small "fake indicator" script that writes the Avery/XK3190/STX formats to one end, with a truck driving on, settling, and leaving.
- Point the browser or agent at the other end.
- Add unit tests for every parser profile using the real samples from Phase 0.

## 7. Trust, fraud and legal points
- **Weighbridge fraud is real in India.** In April 2026 an inter-state gang was arrested in Ahmedabad for remote-controlled chips that cut the displayed weight by 5–10 tonnes, and similar cases have come up in Punjab and Ghaziabad. [ETV Bharat](https://www.etvbharat.com/en/state/ahmedabad-crime-branch-busts-high-tech-inter-state-weighbridge-fraud-seven-arrested-enn26041305459), [Tribune](https://www.tribuneindia.com/news/chandigarh/four-arrested-for-manipulating-weighbridges-260216), [the420.in](https://the420.in/ghaziabad-steel-theft-gang-electronic-weighbridge-manipulation/)
  - Software cannot detect a chip inside the load-cell wiring.
  - What software *can* do:
    - Stop **typed** weights.
    - Log every manual override.
    - Compare tare with the vehicle's history.
    - Flag trucks weighed in under N seconds, weights captured while unstable, and sudden jumps.
    - Attach photos.
  - We sell it as "removes typing errors and staff cheating at the software level", **not** as fraud-proof.
- **Legal Metrology:** a weighbridge used for trade must be verified and stamped by the Legal Metrology department, and using it past its verification date is an offence under the Legal Metrology Act, 2009. Software that records the weight is expected to keep a **tamper-proof, timestamped trail**. [Watsoo guide](https://watsoo.com/blog/best-weighbridge-software-for-startups-2026/), [Oxmaint](https://oxmaint.com/industries/cement-plant/cement-plant-weighbridge-maintenance-calibration-tracker)
  - We only **read** the indicator and never send it commands, so we do not change the stamped instrument.
  - The hash chain, locked weights and override log provide the audit trail.
  - We can add a "verification due date" reminder for the kanta.
  - These sources are secondary, so check the current Legal Metrology (General) Rules before making legal claims on the website.
- **Data and security:**
  - Device tokens are stored hashed and can be revoked from Settings.
  - All traffic uses HTTPS/WSS.
  - Each reading is signed with a sequence number, so gaps and replays are detectable.
  - The agent can only post readings. It can never read ledgers or create sales.

## 8. Risks and how we handle them
| Risk | Mitigation |
|---|---|
| Unknown indicator formats | Phase 0 samples, configurable profiles, custom-regex fallback, raw view in the wizard |
| The plant's own weighbridge software holds the COM port | Read-only Y-split of the TX line or the indicator's second port. Otherwise offer to replace their software |
| Patchy internet at the plant | The agent's offline queue. In Method A, the cabin keeps working locally and syncs; the owner's live view pauses |
| Old Windows 7 PCs | Go builds still support older Windows with an older Go toolchain. Otherwise recommend a cheap mini PC (Rs 8–12k) |
| Cabin PC switched off or user logged out | The agent runs as a service at boot. A `lastSeenAt` alert goes to the owner on WhatsApp if a device is offline during work hours |
| Wrong cable (straight vs null-modem) | The wizard's raw view shows "no data" vs garbage, with a troubleshooting checklist |

## 9. Site checklist (send to each Enterprise customer)
1. Indicator make and model (a photo of the front and of the back ports).
2. A free RS-232 port on the indicator? Is any other software using it today?
3. A Windows PC in the cabin? Which Windows version? A free USB port? Internet (wired, Wi-Fi or dongle)?
4. Chrome or Edge installed?
5. IP camera at the kanta (for Phase 3)? Brand?
6. Kanta stamping (verification) date.

## 10. Website and pricing tie-in
- This is the **Enterprise (Rs 13,999)** "weighbridge integration" item. It is gated by `featureAccess.weighbridge`.
- Update the website copy only after the Phase 1 pilot works. Until then keep the wording "weighbridge integration – talk to us about your indicator model".
