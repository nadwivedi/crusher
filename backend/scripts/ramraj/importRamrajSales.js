/*
 * Imports the Ramraj Industries sales (ramraj_sales.json, made by parse_ramraj_sales.py) for one account.
 *
 *   node scripts/ramraj/importRamrajSales.js                       -> dry run: shows what would be added
 *   node scripts/ramraj/importRamrajSales.js --commit              -> adds the parties and sales
 *   options: --user=<userId>  --file=<path to json>
 *
 * - A party is matched to one the account already has by name (spelling differences in case, spaces,
 *   dots are ignored); otherwise it is created as a customer. Walk-in "CASH" sales go to the
 *   account's default Cash party.
 * - Each sale keeps its receipt number as the Invoice / Slip No. A sale whose number the account
 *   already has is skipped, so running the script again does not add anything twice.
 * - Cash sales are saved fully paid (Cash Account), credit ("borrow") sales unpaid, so the party
 *   ledger shows what each party still owes. Partly paid ones keep the paid part.
 * - Materials beyond the default nine (M-Sand, P-Sand, Boulder, ...) are added to Masters -> Material Types.
 */
const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });

const connectDB = require("../../config/mongodb");
const User = require("../../models/User");
const Party = require("../../models/Party");
const Sales = require("../../models/Sales");
const Vehicle = require("../../models/Vehicle");

const DEFAULT_USER_ID = "6ad75429c56d7ce60756d998";
const DEFAULT_MATERIALS = ["60mm", "40mm", "20mm", "10mm", "6mm", "4mm", "dust", "wmm", "gsb"];
const MAX_CUSTOM_MATERIALS = 50;
// Added to Material Types when the sales use them this many times or more (one-off mixes are not)
const MIN_USES_FOR_MATERIAL_TYPE = 3;
const MATERIAL_LABELS = { "m-sand": "M-Sand", "p-sand": "P-Sand", boulder: "Boulder", "wmm/gsb": "WMM/GSB", muram: "Muram", "p+msand": "P+M Sand" };

const arg = (name) => {
  const hit = process.argv.slice(2).find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return undefined;
  return hit.includes("=") ? hit.slice(hit.indexOf("=") + 1) : true;
};

const userId = String(arg("user") || DEFAULT_USER_ID);
const file = path.resolve(String(arg("file") || path.join(__dirname, "ramraj_sales.json")));
const commit = Boolean(arg("commit"));

// Same idea as party_key() in the parser: spelling noise does not make a new party
const partyKey = (name) => String(name || "")
  .toLowerCase()
  .replace(/0/g, "o")
  .replace(/[^a-z]/g, "")
  .replace(/constuction|contruction|costruction|constructn/g, "construction")
  .replace(/choudhry|chaudary|chaudhary/g, "choudhary");

const normVehicle = (v) => String(v || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const money = (n) => `Rs ${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const main = async () => {
  if (!mongoose.Types.ObjectId.isValid(userId)) throw new Error(`Not a valid user id: ${userId}`);
  if (!fs.existsSync(file)) throw new Error(`JSON file not found: ${file}`);
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  const rows = Array.isArray(data.sales) ? data.sales : [];
  console.log(`${commit ? "IMPORT" : "DRY RUN (add --commit to save)"}: ${rows.length} sales from ${path.basename(file)}`);

  await connectDB();
  const user = await User.findById(userId);
  if (!user) throw new Error(`User ${userId} not found`);
  console.log(`Account: ${user.companyName || user.name || user.phone || userId}`);

  // ---------------------------------------------------------------- parties
  const existingParties = await Party.find({ userId }).select("_id name type");
  const byKey = new Map();
  existingParties.forEach((p) => {
    const key = partyKey(p.name);
    if (key && !byKey.has(key)) byKey.set(key, p);
  });

  let cashParty = existingParties.find((p) => p.type === "cash-in-hand" && /^cash$/i.test(String(p.name).trim()));
  if (!cashParty && commit) cashParty = await Party.create({ userId, name: "Cash", type: "cash-in-hand" });
  if (!cashParty) cashParty = { _id: new mongoose.Types.ObjectId(), name: "Cash", type: "cash-in-hand", isNew: true };

  const partyInfo = new Map((data.parties || []).map((p) => [partyKey(p.name), p]));
  const partyFor = new Map(); // partyKey -> party
  const createdParties = [];
  const reusedParties = new Set();
  for (const row of rows) {
    const key = partyKey(row.partyName);
    if (partyFor.has(key)) continue;
    if (key === "cash") {
      partyFor.set(key, cashParty);
      continue;
    }
    const existing = byKey.get(key);
    if (existing) {
      partyFor.set(key, existing);
      reusedParties.add(existing.name);
      continue;
    }
    const info = partyInfo.get(key) || {};
    const doc = { userId, name: row.partyName, type: "customer", address: info.address || row.deliveryAddress || "" };
    const party = commit ? await Party.create(doc) : { _id: new mongoose.Types.ObjectId(), ...doc };
    partyFor.set(key, party);
    createdParties.push(party.name);
  }

  // ---------------------------------------------------------------- materials
  const uses = {};
  rows.forEach((r) => { uses[r.material] = (uses[r.material] || 0) + 1; });
  // The account's own Material Types (e.g. "M-SAND", "P-SAND"): a sale saves the type's value
  // (its name in lower case), so "m-sand" in the reports is saved as that type, whatever its spelling.
  const materialKey = (name) => String(name || "").toLowerCase().replace(/[^a-z0-9+/&]/g, "");
  const toMaterialValue = (name) => String(name || "").replace(/\s+/g, " ").trim().toLowerCase();
  const existingMaterial = new Map();
  (user.customMaterials || []).forEach((m) => existingMaterial.set(materialKey(m.name), toMaterialValue(m.name)));
  DEFAULT_MATERIALS.forEach((m) => existingMaterial.set(materialKey(m), m));
  const newMaterials = Object.entries(uses)
    .filter(([m, n]) => m && m !== "unknown" && n >= MIN_USES_FOR_MATERIAL_TYPE
      && !existingMaterial.has(materialKey(m)) && !existingMaterial.has(materialKey(MATERIAL_LABELS[m] || m)))
    .sort((a, b) => b[1] - a[1])
    .slice(0, Math.max(0, MAX_CUSTOM_MATERIALS - (user.customMaterials || []).length))
    .map(([m]) => ({ name: MATERIAL_LABELS[m] || m, rate: 0, ratePerCubicMeter: 0 }));
  if (commit && newMaterials.length) {
    user.customMaterials = [...(user.customMaterials || []), ...newMaterials];
    await user.save();
  }
  newMaterials.forEach((m) => existingMaterial.set(materialKey(m.name), toMaterialValue(m.name)));
  const materialValue = (m) => existingMaterial.get(materialKey(m))
    || existingMaterial.get(materialKey(MATERIAL_LABELS[m] || m))
    || String(m || "unknown").toLowerCase();
  const usedExisting = (user.customMaterials || [])
    .filter((m) => !newMaterials.some((n) => n.name === m.name))
    .filter((m) => rows.some((r) => materialKey(r.material) === materialKey(m.name)))
    .map((m) => m.name);

  // ---------------------------------------------------------------- vehicles (link the ones already in Vehicles)
  const vehicles = await Vehicle.find({ userId }).select("_id vehicleNo");
  const vehicleByNo = new Map(vehicles.map((v) => [normVehicle(v.vehicleNo), v._id]));

  // ---------------------------------------------------------------- sales
  const taken = new Set((await Sales.find({ userId }).select("invoiceNumber").lean())
    .map((s) => String(s.invoiceNumber || "").toUpperCase()).filter(Boolean));
  const creator = { kind: "owner", id: String(userId), name: "Excel import" };
  const docs = [];
  const skipped = [];
  for (const r of rows) {
    const invoiceNumber = String(r.invoiceNumber || "").trim().toUpperCase();
    if (invoiceNumber && taken.has(invoiceNumber)) {
      skipped.push(r);
      continue;
    }
    if (invoiceNumber) taken.add(invoiceNumber);
    const party = partyFor.get(partyKey(r.partyName));
    const perTon = r.pricingMode === "per_ton";
    const total = Math.max(0, Number(r.totalAmount || 0));
    const paid = Math.min(total, Math.max(0, Number(r.paidAmount || 0)));
    docs.push({
      userId,
      partyId: party._id,
      vehicleId: vehicleByNo.get(normVehicle(r.vehicleNo)) || null,
      vehicleNo: r.vehicleNo || "NA",
      driverName: r.consignee || "",
      ...(invoiceNumber ? { invoiceNumber } : {}),
      saleDate: new Date(`${r.saleDate}T00:00:00.000Z`),
      stoneSize: materialValue(r.material).slice(0, 40),
      pricingMode: perTon ? "per_ton" : "per_cubic_meter",
      netWeight: perTon ? Number(r.netWeightKg || 0) : 0,
      cubicMeterQty: perTon ? 0 : Number(r.quantityFeet || 0),
      rate: Number(r.rate || 0),
      totalAmount: total,
      paidAmount: paid,
      type: paid <= 0 ? "credit" : paid >= total ? "cash" : "partial",
      transportMode: "party",
      dispatchLocation: r.deliveryAddress || "",
      account: null, // paid sales count under Cash Account
      weightSource: "manual",
      createdBy: creator,
      importSource: {
        file: r.sourceFile || String(r.source || "").split(" / ")[0] || "",
        sheet: r.sourceSheet || String(r.source || "").split(" / ")[1] || "",
        row: Number(r.sourceRow || String(r.source || "").replace(/.*row\s*/, "") || 0) || 0,
        paymentNote: r.paymentMode || "",
      },
    });
  }

  let inserted = 0;
  if (commit) {
    for (let i = 0; i < docs.length; i += 500) {
      const batch = docs.slice(i, i + 500);
      const result = await Sales.insertMany(batch, { ordered: false });
      inserted += result.length;
      process.stdout.write(`  saved ${inserted}/${docs.length}\r`);
    }
    process.stdout.write("\n");
  }

  // ---------------------------------------------------------------- report
  const sum = (list, f) => list.reduce((s, d) => s + Number(d[f] || 0), 0);
  const total = sum(docs, "totalAmount");
  const paid = sum(docs, "paidAmount");
  console.log("");
  console.log(`Parties: ${createdParties.length} new, ${reusedParties.size} already in the account${cashParty.isNew ? ", Cash party will be created" : ""}`);
  if (reusedParties.size) {
    const names = [...reusedParties];
    console.log(`  matched existing: ${names.slice(0, 15).join(", ")}${names.length > 15 ? `, ... (${names.length - 15} more)` : ""}`);
  }
  console.log(`Material types already in the account and used: ${usedExisting.join(", ") || "none"}`);
  console.log(`Material types added: ${newMaterials.map((m) => m.name).join(", ") || "none"}`);
  console.log(`Sales: ${docs.length} ${commit ? "saved" : "to save"}, ${skipped.length} skipped (Invoice / Slip No already in the account)`);
  console.log(`  cash ${docs.filter((d) => d.type === "cash").length}, credit ${docs.filter((d) => d.type === "credit").length}, partial ${docs.filter((d) => d.type === "partial").length}`);
  console.log(`  total ${money(total)}, paid ${money(paid)}, due from parties ${money(total - paid)}`);
  console.log(`  linked to a vehicle in Vehicles: ${docs.filter((d) => d.vehicleId).length}`);
  if (skipped.length) {
    console.log("  skipped (first 20):");
    skipped.slice(0, 20).forEach((r) => console.log(`    ${r.invoiceNumber}  ${r.saleDate}  ${r.partyName}  ${money(r.totalAmount)}`));
  }
  if (!commit) console.log("\nNothing was saved. Run again with --commit to import.");
};

main()
  .then(() => mongoose.disconnect().then(() => process.exit(0)))
  .catch((error) => {
    console.error(error.message);
    mongoose.disconnect().finally(() => process.exit(1));
  });
