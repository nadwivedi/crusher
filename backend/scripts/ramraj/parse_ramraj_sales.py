"""
Reads the Ramraj Industries sales reports (Excel + PDF) and writes one JSON file
that scripts/ramraj/importRamrajSales.js imports into the crusher app.

    pip install openpyxl pdfplumber
    python scripts/ramraj/parse_ramraj_sales.py "<folder with the reports>" scripts/ramraj/ramraj_sales.json

Every sale keeps where it came from (file / sheet / row) so anything odd can be traced back.
"""
import datetime as dt
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

import openpyxl
import pdfplumber

MONTHS = {m: i for i, m in enumerate(
    ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"], 1)}

# ---------------------------------------------------------------- helpers


def clean(value):
    if value is None:
        return ""
    return re.sub(r"\s+", " ", str(value)).strip()


def is_blank(value):
    return clean(value) in ("", "-", "--")


def to_number(value):
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    text = clean(value).replace(",", "")
    match = re.search(r"\d+(?:\.\d+)?", text)
    return float(match.group()) if match else None


def title_case(name):
    """'R.p.chaudhary' -> 'R.P. Chaudhary', 'gurdeep singh chandi' -> 'Gurdeep Singh Chandi'"""
    name = clean(name)
    name = re.sub(r"\b([A-Za-z])\.\s*(?=[A-Za-z])", lambda m: m.group(1).upper() + ". ", name)
    words = [w if re.fullmatch(r"[A-Z]\.", w) else w.capitalize() for w in name.split(" ")]
    out = " ".join(words)
    return re.sub(r"\b([A-Z])\. (?=[A-Z]\.)", r"\1.", out)


def month_from_text(text):
    """'nov.2025' / 'RAMRAJ ... (APRIL-2026)' -> (year, month)"""
    text = clean(text).lower()
    month = None
    for key, num in MONTHS.items():
        if re.search(rf"\b{key}", text):
            month = num
            break
    year = re.search(r"20\d\d", text)
    return (int(year.group()) if year else None, month)


def fix_date(value, year, month):
    """Excel stored dd/mm as mm/dd. Bring every date back into the report's month."""
    if isinstance(value, dt.datetime):
        d = value.date()
        if month is None or (d.month == month and (year is None or d.year == year)):
            return d
        if d.day == month:  # day and month swapped
            try:
                return dt.date(year or d.year, month, d.month)
            except ValueError:
                pass
        return d
    text = clean(value)
    if not text:
        return None
    parts = [p for p in re.split(r"[./\-]+", text) if p]
    if len(parts) < 2:
        return None
    day = int(re.sub(r"\D", "", parts[0]) or 0)
    mon = int(re.sub(r"\D", "", parts[1]) or 0)
    yr = int(re.sub(r"\D", "", parts[2]) or 0) if len(parts) > 2 else (year or 0)
    if yr < 100:
        yr += 2000
    if year and (yr > 2100 or yr < 2000):  # typo such as 20025
        yr = year
    if month and mon != month and day == month:
        day, mon = mon, day
    try:
        return dt.date(yr, mon, day)
    except ValueError:
        return None


# ---------------------------------------------------------------- material / payment


def normalize_material(raw):
    m = clean(raw).lower().replace(" ", "").replace("-", "").replace(";", "")
    if not m:
        return ""
    m = {"msanfd": "msand", "20mm0": "20mm"}.get(m, m)
    table = {
        "msand": "m-sand", "msands": "m-sand", "sand": "m-sand",
        "psand": "p-sand", "psans": "p-sand",
        "bolder": "boulder", "boulder": "boulder",
        "wmm": "wmm", "gsb": "gsb", "wmm/gsb": "wmm/gsb", "gsm": "gsb",
        "dust": "dust", "muram": "muram", "murum": "muram",
        "4": "4mm", "6": "6mm", "10": "10mm", "20": "20mm", "40": "40mm", "60": "60mm",
        "12/17mm": "10mm",
    }
    if m in table:
        return table[m]
    mm = re.fullmatch(r"(\d+)mm", m)
    if mm:
        return f"{mm.group(1)}mm"
    return clean(raw).lower()  # a mix such as '20mm+msand' stays as written


CREDIT_WORDS = ("borrow", "credit", "udhar", "pending", "new site")
BALANCE_WORDS = ("sesh", "banki", "baki")


def paid_at_sale(raw, total):
    """Payment mode text -> amount paid at the sale.
    borrow / credit / udhari / amount pending / new site -> 0 (credit)
    cash / online / p2 account / phonepay / paid <date>  -> total (cash)
    '1500 banki', '200 sesh', 'paid ..., sesh 2800/-'    -> total minus what is left (partial)
    '15000 cash' on a 30400 sale                          -> 15000 (partial)"""
    p = clean(raw).lower()
    if not p or p == "-":
        return 0.0
    if any(w in p for w in BALANCE_WORDS):
        left = re.search(r"(\d[\d,]*)\s*(?:/-)?\s*(?:party ke )?(?:sesh|banki|baki)|(?:sesh|banki|baki)\s*(\d[\d,]*)", p)
        if left:
            return max(0.0, total - float((left.group(1) or left.group(2)).replace(",", "")))
        return 0.0
    if "borrow" in p and "online" in p and re.search(r"\d+/\d+", p):
        return total  # 'Borrow( online 15/4/2026)': borrowed, then paid online
    if any(w in p for w in CREDIT_WORDS):
        return 0.0
    if not re.search(r"\d+/\d+", p):  # amounts written in the mode: '15000 cash', '28100+16000cash'
        numbers = [float(n) for n in re.findall(r"\d{3,}", p.replace(",", ""))]
        if numbers and 0 < sum(numbers) < total:
            return sum(numbers)
    return total


# ---------------------------------------------------------------- excel

HEADER_KEYS = {
    "date": ["date"],
    "receipt": ["receipt"],
    "gstin": ["gstin"],
    "gstBill": ["gst bill"],
    "party": ["name of party"],
    "vehicle": ["vehicle"],
    "material": ["material"],
    "qty": ["quantity"],
    "rate": ["rate"],
    "amount": ["fare", "total"],
    "payment": ["payment mode"],
    "cash": ["cash"],
    "credit": ["credit"],
    "consignee": ["consignee"],
    "address": ["delivery"],
}


def map_header(row):
    mapping = {}
    for idx, cell in enumerate(row):
        text = clean(cell).lower()
        if not text:
            continue
        for key, needles in HEADER_KEYS.items():
            if key not in mapping and any(text.startswith(n) for n in needles):
                mapping[key] = idx
                break
    return mapping


def parse_excel(path, out, notes):
    wb = openpyxl.load_workbook(path, data_only=True)
    for ws in wb.worksheets:
        rows = list(ws.iter_rows(values_only=True))
        if not rows:
            continue
        first = " ".join(clean(c) for c in rows[0] if c)
        year, month = month_from_text(first)
        y2, m2 = month_from_text(ws.title + " " + path.stem)
        year, month = year or y2, month or m2
        header_at, mapping = None, {}
        for i, r in enumerate(rows[:6]):
            m = map_header(r)
            if "date" in m and "receipt" in m:
                header_at, mapping = i, m
                break
        if header_at is None:
            notes.append(f"{path.name} / {ws.title}: no header row, skipped")
            continue

        def get(r, key):
            idx = mapping.get(key)
            return r[idx] if idx is not None and idx < len(r) else None

        last_date = None
        for i, r in enumerate(rows[header_at + 1:], start=header_at + 2):
            receipt = get(r, "receipt")
            party = clean(get(r, "party"))
            amount = to_number(get(r, "amount"))
            if is_blank(receipt) and not party:
                continue
            if not party and amount is None:
                continue
            if is_blank(receipt) and amount is None and is_blank(get(r, "date")):
                # a line that only carries text: the rest of the party name above, or a remark
                if re.search(r"\b(pvt|ltd|limited|company|co\.)", party.lower()) and out and out[-1]["sheet"] == ws.title:
                    out[-1]["party"] = f"{out[-1]['party']} {party}"
                else:
                    notes.append(f"{path.name} / {ws.title} row {i}: text-only row '{party}', skipped")
                continue
            if "cancel" in party.lower():
                notes.append(f"{path.name} / {ws.title} row {i}: receipt {clean(receipt)} cancelled ('{party}'), skipped")
                continue
            if "total" in clean(get(r, "date")).lower() or party.lower().startswith("total"):
                continue
            date_raw = get(r, "date")
            date = fix_date(date_raw, year, month)
            if date is None and last_date is not None:
                notes.append(f"{path.name} / {ws.title} row {i}: date {date_raw!r} missing/unreadable, used {last_date} from the row above")
                date = last_date
            last_date = date or last_date
            if "payment" in mapping:
                payment_raw = clean(get(r, "payment"))
            else:  # SALE.xlsx has separate Cash / Credit columns
                payment_raw = "cash" if clean(get(r, "cash")) else ("credit" if clean(get(r, "credit")) else "")
            out.append({
                "source": path.name, "sheet": ws.title, "row": i,
                "date": date, "dateRaw": date_raw,
                "receipt": clean(receipt),
                "party": party,
                "gstin": clean(get(r, "gstin")),
                "vehicle": clean(get(r, "vehicle")),
                "material": clean(get(r, "material")),
                "qty": to_number(get(r, "qty")),
                "rate": to_number(get(r, "rate")),
                "rateRaw": clean(get(r, "rate")),
                "amount": amount,
                "payment": payment_raw,
                "consignee": clean(get(r, "consignee")),
                "address": clean(get(r, "address")),
            })


# ---------------------------------------------------------------- pdf

PDF_MATERIAL_HEADERS = ("4mm", "6mm", "12/17mm", "20mm", "40mm", "sand", "muram")


def parse_pdf(path, out, notes):
    with pdfplumber.open(path) as pdf:
        header = None
        for pnum, page in enumerate(pdf.pages, 1):
            for table in page.extract_tables():
                for ri, r in enumerate(table):
                    cells = [clean(c) for c in r]
                    low = [c.lower().replace(" ", "") for c in cells]
                    if "date" in low and any("name" in c for c in low):
                        header = [re.sub(r"\s+", "", clean(c).lower()) for c in r]
                        continue
                    if header is None:
                        continue

                    def find(*names):
                        for n in names:
                            for idx, h in enumerate(header):
                                if h.startswith(n):
                                    return cells[idx] if idx < len(cells) else ""
                        return ""

                    date_raw = find("date")
                    party = find("nameof")
                    if not date_raw or not re.search(r"\d", date_raw) or not (party or find("total", "fare")):
                        continue
                    jan_format = any("material" in h for h in header)
                    if jan_format:
                        material = find("ndmaterial", "material")
                        qty = to_number(find("quantity"))
                        amount = to_number(find("total"))
                    else:
                        material, qty = "", None
                        for idx, h in enumerate(header):
                            if h not in PDF_MATERIAL_HEADERS:
                                continue
                            v = cells[idx] if idx < len(cells) else ""
                            if not is_blank(v):
                                material = v if re.search(r"[a-z]", v.lower()) else h
                                break
                        amount = to_number(find("fare"))
                    cash_cell = find("cash").lower()
                    borrow_cell = find("borrow", "credit").lower()
                    payment = borrow_cell if not is_blank(borrow_cell) else (cash_cell if not is_blank(cash_cell) else "")
                    out.append({
                        "source": path.name, "sheet": f"page {pnum}", "row": ri + 1,
                        "date": fix_date(date_raw, None, None), "dateRaw": date_raw,
                        "receipt": find("recei", "receipt"),
                        "party": party, "gstin": "",
                        "vehicle": find("vehicle"),
                        "material": material, "qty": qty, "rate": None,
                        "amount": amount, "payment": payment,
                        "consignee": find("consignee"),
                        "address": find("delivery"),
                    })


# ---------------------------------------------------------------- parties


def normalize_vehicle(raw):
    v = clean(raw).upper().replace("-", "").replace(" ", "")
    if not v:
        return "NA"
    if "TROL" in v:
        return "TROLLEY"
    return v


def party_key(name):
    k = re.sub(r"[^a-z]", "", clean(name).lower().replace("0", "o"))
    for a, b in [("constuction", "construction"), ("contruction", "construction"), ("costruction", "construction"),
                 ("constructn", "construction"), ("choudhry", "choudhary"), ("chaudary", "choudhary"),
                 ("chaudhary", "choudhary"), ("yoghesh", "yogesh")]:
        k = k.replace(a, b)
    return k


# The same party written different ways in the reports -> one name. Add lines here to merge more.
_ALIASES = {
    "Prakash Contractor": ["Prakash Contructor", "Prakash Constructor"],
    "Janvi Construction": ["Jhanvi Construction"],
    "Bhagwan Construction": ["Bhagavan Construction"],
    "Nirbhaya Construction": ["Nirvaya Construction"],
    "Rajawat Construction": ["Rajawat Constructn"],
    "Imran Khan": ["Imaran Khan"],
    "Ghanshyam Kushwah": ["Ghanshayam Kushwah"],
    "Akhilesh Jatav": ["Akhlesh Jatav"],
    "Bhal Fad": ["Bhal Fadh"],
    "Namdev Fad": ["Namdev Fadh"],
    "Harish Chandra Garg": ["Harichandra Garg"],
    "Jai Maa Durge Construction": ["Jai Ma Durge CON.", "Jai Ma Durge Constrcon", "Jai Maa Durge"],
    "Jai Mata Di": ["Jay Mata Di"],
    "Rakesh Mehta": ["Raekesh Mehta"],
    "Bharat Yadav Dargwan": ["Bharat Yadav Dargma"],
    "Ramniwas Rawat": ["Ramniwash Rawat"],
    "Sunil Rajawat": ["Suneel Rajawat"],
    "Jugraj Singh": ["Jograj Singh"],
    "Tomar Builders": ["Tomar Building"],
    "Bhupendra Chaudhary": ["Bhupendra Choudhry", "Bhupendra Choudhary"],
    "Amit Construction": [],
    "Yogesh Khandelwal": [],
    "Suman Construction": [],
    "Stelmec": ["M/S Stelmec"],
    "R.P. Chaudhary": ["R.p.chaudhary"],
    "Ashwini Bhaiya": ["Ashvini Bhaiya"],
    "Vandana Construction": ["Vandhana Construction"],
    "Shree Girrajjee Infra Heights Pvt. Ltd": ["Shree Girrajjee Infra Heights"],
}
PARTY_ALIASES = {party_key(v): k for k, vs in _ALIASES.items() for v in vs + [k]}


# ---------------------------------------------------------------- build


def build(records, notes):
    sales, seen_rows = [], set()
    for r in records:
        if not r["date"]:
            notes.append(f"{r['source']} / {r['sheet']} row {r['row']}: bad date {r['dateRaw']!r}, skipped")
            continue
        amount = r["amount"]
        if amount is None or amount <= 0:
            notes.append(f"{r['source']} / {r['sheet']} row {r['row']}: receipt {r['receipt']} {r['party']} has no amount, imported as 0")
            amount = 0.0
        material = normalize_material(r["material"]) or "unknown"
        qty = r["qty"] or 0
        rate = r["rate"]
        pricing, net_kg = "per_cubic_meter", 0
        if "ton" in r.get("rateRaw", "").lower() and rate:
            # the rate column holds the weight, e.g. '39.30 ton' -> a per-ton sale
            pricing, net_kg = "per_ton", round(rate * 1000)
            rate = round(amount / rate, 2) if amount else 0
            notes.append(f"{r['source']} / {r['sheet']} row {r['row']}: weight {r['rateRaw']}, saved as a per-ton sale at {rate}/ton ({qty:.0f} ft noted)")
        elif qty > 5000 and amount and amount / qty < 3:
            if qty == 10000 and material == "wmm":
                notes.append(f"{r['source']} / {r['sheet']} row {r['row']}: quantity 10000 ft read as 1000 ft (typo)")
                qty = 1000
            else:  # the quantity is a weight in kg -> a per-ton sale
                pricing, net_kg, qty = "per_ton", qty, 0
                rate = round(amount / net_kg * 1000, 2)
                notes.append(f"{r['source']} / {r['sheet']} row {r['row']}: quantity {net_kg:.0f} is kg, saved as a per-ton sale at {rate}/ton")
        if pricing == "per_cubic_meter" and not rate and qty and amount:
            rate = round(amount / qty, 2)
        paid = round(paid_at_sale(r["payment"], amount), 2)
        pay_type = "credit" if paid <= 0 else ("cash" if paid >= amount else "partial")
        if amount == 0:
            paid, pay_type = 0.0, "credit"
        receipt = re.sub(r"\D", "", r["receipt"]) or ""
        party = title_case(r["party"])
        if not party or party.lower() in ("cash", "cash sale"):
            party = "Cash"  # walk-in cash customer -> the app's default Cash party
        key = (receipt, r["date"].isoformat(), party_key(party), round(amount, 2))
        if key in seen_rows:  # the same sale listed in two files (April is in two workbooks)
            continue
        seen_rows.add(key)
        gstin = r["gstin"].upper().strip()
        sales.append({
            "receiptNo": receipt,
            "saleDate": r["date"].isoformat(),
            "partyName": party,
            "partyKey": party_key(party),
            "gstin": gstin if re.fullmatch(r"[0-9A-Z]{15}", gstin) else "",
            "vehicleNo": normalize_vehicle(r["vehicle"]),
            "material": material,
            "pricingMode": pricing,
            "quantityFeet": qty,
            "netWeightKg": net_kg,
            "rate": rate or 0,
            "totalAmount": round(amount, 2),
            "paidAmount": paid,
            "type": pay_type,
            "paymentMode": r["payment"],
            "consignee": title_case(r["consignee"]),
            "deliveryAddress": title_case(r["address"]),
            "source": f"{r['source']} / {r['sheet']} / row {r['row']}",
            "sourceFile": r["source"],
            "sourceSheet": r["sheet"],
            "sourceRow": r["row"],
        })

    # Receipt books restart, so one number can belong to two different sales.
    # The first keeps the plain number; later ones get the month added (e.g. 2601/APR26).
    by_receipt = defaultdict(list)
    for s in sales:
        by_receipt[s["receiptNo"]].append(s)
    for receipt, group in by_receipt.items():
        group.sort(key=lambda s: s["saleDate"])
        used = Counter()
        for idx, s in enumerate(group):
            if not receipt:
                s["invoiceNumber"] = ""
                continue
            if idx == 0:
                s["invoiceNumber"] = receipt
                continue
            d = dt.date.fromisoformat(s["saleDate"])
            base = f"{receipt}/{d.strftime('%b').upper()}{d.strftime('%y')}"
            used[base] += 1
            s["invoiceNumber"] = base if used[base] == 1 else f"{base}-{used[base]}"
            notes.append(f"receipt {receipt} used again on {s['saleDate']} ({s['partyName']}), saved as {s['invoiceNumber']}")

    # one display name per party: the alias, else the most used spelling
    names, gst = defaultdict(Counter), {}
    for s in sales:
        s["partyKey"] = party_key(PARTY_ALIASES.get(s["partyKey"], s["partyName"]))
        names[s["partyKey"]][s["partyName"]] += 1
        if s["gstin"]:
            gst[s["partyKey"]] = s["gstin"]
    for s in sales:
        s["partyName"] = PARTY_ALIASES.get(s["partyKey"]) or names[s["partyKey"]].most_common(1)[0][0]
    parties = {}
    for s in sales:
        p = parties.setdefault(s["partyKey"], {"name": s["partyName"], "gstin": gst.get(s["partyKey"], ""),
                                               "address": "", "sales": 0, "amount": 0, "outstanding": 0})
        p["sales"] += 1
        p["amount"] += s["totalAmount"]
        p["outstanding"] += s["totalAmount"] - s["paidAmount"]
        if not p["address"] and s["deliveryAddress"]:
            p["address"] = s["deliveryAddress"]
    sales.sort(key=lambda s: (s["saleDate"], s["receiptNo"].zfill(6)))
    for s in sales:
        del s["partyKey"]
    return sales, sorted(parties.values(), key=lambda p: p["name"].lower())


def main():
    folder = Path(sys.argv[1])
    out_file = Path(sys.argv[2])
    records, notes = [], []
    # the big April-October workbook first, so its April rows win over the separate April file
    files = sorted(folder.iterdir(), key=lambda p: (0 if "DAILY" in p.name.upper() else 1, p.name))
    for f in files:
        if f.name.startswith("~$"):
            continue
        if f.suffix.lower() == ".xlsx":
            parse_excel(f, records, notes)
        elif f.suffix.lower() == ".pdf":
            parse_pdf(f, records, notes)
    sales, parties = build(records, notes)
    summary = defaultdict(lambda: {"count": 0, "amount": 0, "paid": 0, "outstanding": 0})
    for s in sales:
        m = summary[s["saleDate"][:7]]
        m["count"] += 1
        m["amount"] += s["totalAmount"]
        m["paid"] += s["paidAmount"]
        m["outstanding"] += s["totalAmount"] - s["paidAmount"]
    data = {
        "generatedAt": dt.datetime.now().isoformat(timespec="seconds"),
        "company": "Ramraj Industries",
        "parties": parties,
        "sales": sales,
        "summaryByMonth": dict(sorted(summary.items())),
        "notes": notes,
    }
    out_file.parent.mkdir(parents=True, exist_ok=True)
    out_file.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"{len(sales)} sales, {len(parties)} parties -> {out_file}")
    for month, m in sorted(summary.items()):
        print(f"  {month}: {m['count']:4d} sales  total {m['amount']:>12,.0f}  paid {m['paid']:>11,.0f}  credit {m['outstanding']:>11,.0f}")
    tot = sum(m["amount"] for m in summary.values())
    print(f"  TOTAL : {len(sales):4d} sales  total {tot:>12,.0f}")
    print(f"{len(notes)} notes (see 'notes' in the JSON)")


if __name__ == "__main__":
    main()
