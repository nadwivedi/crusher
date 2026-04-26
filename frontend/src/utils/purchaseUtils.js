export const getPurchaseTypeLabel = (total, paid) => {
  const totalAmount = Number(total || 0);
  const paidAmount = Number(paid || 0);
  
  if (paidAmount === 0) return 'Credit Purchase';
  if (paidAmount >= totalAmount && totalAmount > 0) return 'Cash Purchase';
  return 'Partial Purchase';
};

export const getPurchaseTypeBadgeClass = (label) => {
  if (label === 'Cash Purchase') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (label === 'Credit Purchase') return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-orange-100 text-orange-700 border-orange-200';
};
