// The parts of the app the owner can switch on or off for each staff login
const STAFF_SECTIONS = [
  "boulder",       // Boulder entries and dump boulder
  "sales",         // Sales and sale returns
  "purchases",     // Purchases and purchase returns
  "receipts",      // Money received
  "payments",      // Money paid
  "expenses",      // Expenses
  "materialUsed",  // Material used, inventory and stock adjustment
  "meterReadings", // Meter readings
  "masters",       // Adding and changing parties, vehicles, stock items, expense types, transport and monthly hire
];

// Staff created before sections existed keep seeing everything they saw before
const allSectionsOn = () => Object.fromEntries(STAFF_SECTIONS.map((key) => [key, true]));

// Only known keys, as true/false
const readSections = (value) => {
  const source = value && typeof value === "object" ? value : {};
  return Object.fromEntries(STAFF_SECTIONS.map((key) => [key, source[key] !== false]));
};

module.exports = { STAFF_SECTIONS, allSectionsOn, readSections };
