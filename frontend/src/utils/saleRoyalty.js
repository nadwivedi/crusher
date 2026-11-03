// Royalty on a sale: royalty tons x royalty rate per ton, added to the material amount.
// A GST sale then charges GST on material + royalty (not on transport). Only a sale marked as royalty sale carries it.

const round2 = (value) => Math.round(value * 100) / 100;

// Tons the royalty is charged on: the net weight when the sale is weighed, else the tons typed on the sale
export const getSaleRoyaltyQty = (sale) => {
  const netWeight = Number(sale?.netWeight || 0);
  if (Number.isFinite(netWeight) && netWeight > 0) return netWeight / 1000;
  const typedQty = Number(sale?.royaltyQty || 0);
  return Number.isFinite(typedQty) && typedQty > 0 ? typedQty : 0;
};

// The royalty is worked out from the net weight, so its tons cannot be typed
export const isRoyaltyQtyFromWeight = (sale) => Number(sale?.netWeight || 0) > 0;

export const getSaleRoyaltyAmount = (sale) => {
  if (!sale?.isRoyalty) return 0;
  const amount = getSaleRoyaltyQty(sale) * Number(sale.royaltyRate || 0);
  return Number.isFinite(amount) && amount > 0 ? round2(amount) : 0;
};

// The royalty saved on a sale, 0 for a sale without royalty
export const getSavedSaleRoyalty = (sale) => (sale?.isRoyalty ? Math.max(0, Number(sale.royaltyAmount || 0)) : 0);
