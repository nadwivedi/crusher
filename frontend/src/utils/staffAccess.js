// What a staff login can use. The owner (and the admin opening the account) always sees everything;
// the backend applies the same rules, so this only decides what is shown.

export const STAFF_SECTIONS = [
  { key: 'boulder', label: 'Boulder', hint: 'Boulder entries and dump boulder' },
  { key: 'sales', label: 'Sales', hint: 'Sales and sale returns' },
  { key: 'purchases', label: 'Purchases', hint: 'Purchases and purchase returns' },
  { key: 'receipts', label: 'Money Received', hint: 'Money received from parties' },
  { key: 'payments', label: 'Money Paid', hint: 'Money paid to parties' },
  { key: 'expenses', label: 'Expenses', hint: 'Expense entries' },
  { key: 'materialUsed', label: 'Material Used & Inventory', hint: 'Diesel, oil and store items given out' },
  { key: 'meterReadings', label: 'Meter Reading', hint: 'DG set and vehicle meters' },
  { key: 'masters', label: 'Masters', hint: 'Add parties, vehicles, stock items, expense types' }
];

export const allSectionsOn = () => Object.fromEntries(STAFF_SECTIONS.map((section) => [section.key, true]));

export const isStaff = (user) => user?.role === 'employee';

// A part of the app this login may use
export const canUseSection = (user, section) => !isStaff(user) || user?.sections?.[section] !== false;

export const canAddEntries = (user) => !isStaff(user) || Boolean(user?.permissions?.add);

// Staff change only entries they added themselves; the owner changes any entry
export const canEditEntry = (user, entry) => {
  if (!isStaff(user)) return true;
  if (!user?.permissions?.edit) return false;
  return entry?.createdBy?.kind === 'staff' && String(entry.createdBy.id) === String(user.employeeId);
};

// Deleting entries is for the owner only
export const canDeleteEntries = (user) => !isStaff(user);

// "Ramesh (Staff)", "Owner", "CrusherBook Admin"; empty for entries saved before this was recorded
export const describePerson = (person) => {
  if (!person?.kind) return '';
  if (person.kind === 'staff') return `${person.name || 'Staff'} (Staff)`;
  if (person.kind === 'admin') return 'CrusherBook Admin';
  return 'Owner';
};
