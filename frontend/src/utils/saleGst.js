// GST on a sale: gstRate % of material + transport, added on top. Only a sale marked as GST sale carries it.
export const getSaleGstAmount = (sale, subtotal) => {
  if (!sale?.isGst) return 0;
  const rate = Number(sale.gstRate || 0);
  const amount = Number(subtotal || 0) * rate / 100;
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) / 100 : 0;
};

// The GST saved on a sale, 0 for a non-GST sale
export const getSavedSaleGst = (sale) => (sale?.isGst ? Math.max(0, Number(sale.gstAmount || 0)) : 0);

export const formatGstRate = (rate) => `${Number(rate || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}%`;
