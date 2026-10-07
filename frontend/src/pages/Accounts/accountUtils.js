export const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n || 0);

export const toDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatDate = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const ACCOUNT_TYPES = {
  cash: { label: 'Cash', badge: 'badge-green' },
  bank: { label: 'Bank', badge: 'badge-blue' }
};

// How each kind of entry is named in an account's ledger
export const ENTRY_TYPES = {
  sale: { label: 'Sale', badge: 'badge-green' },
  receipt: { label: 'Receipt', badge: 'badge-green' },
  purchase: { label: 'Purchase', badge: 'badge-orange' },
  payment: { label: 'Payment', badge: 'badge-red' },
  expense: { label: 'Expense', badge: 'badge-red' },
  transfer: { label: 'Transfer', badge: 'badge-blue' }
};
