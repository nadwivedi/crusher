// A party's own sale rates, per ton and per cubic feet. The keys match the
// account's material rates in Settings (per_cubic_meter is billed as cft).
export const PARTY_SALE_RATES = [
  { material: '10mm', label: '10mm', tonKey: 'tenMmRate', cubicKey: 'tenMmRatePerCubicMeter' },
  { material: '20mm', label: '20mm', tonKey: 'twentyMmRate', cubicKey: 'twentyMmRatePerCubicMeter' },
  { material: '40mm', label: '40mm', tonKey: 'fortyMmRate', cubicKey: 'fortyMmRatePerCubicMeter' },
  { material: '60mm', label: '60mm', tonKey: 'sixtyMmRate', cubicKey: 'sixtyMmRatePerCubicMeter' },
  { material: '6mm', label: '6mm', tonKey: 'sixMmRate', cubicKey: 'sixMmRatePerCubicMeter' },
  { material: '4mm', label: '4mm', tonKey: 'fourMmRate', cubicKey: 'fourMmRatePerCubicMeter' },
  { material: 'wmm', label: 'WMM', tonKey: 'wmmRate', cubicKey: 'wmmRatePerCubicMeter' },
  { material: 'gsb', label: 'GSB', tonKey: 'gsbRate', cubicKey: 'gsbRatePerCubicMeter' },
  { material: 'dust', label: 'Dust', tonKey: 'dustRate', cubicKey: 'dustRatePerCubicMeter' }
];

export const PARTY_SALE_RATE_KEYS = PARTY_SALE_RATES.flatMap((rate) => [rate.tonKey, rate.cubicKey]);

// Rates to send when saving a party; a blank box saves as 0 (no special rate)
export const getPartySaleRatesPayload = (form) => Object.fromEntries(
  PARTY_SALE_RATE_KEYS.map((key) => [key, Number(form?.[key] || 0)])
);

// Rates of a saved party for the edit form, blank where none is set
export const readPartySaleRates = (party) => Object.fromEntries(
  PARTY_SALE_RATE_KEYS.map((key) => [key, Number(party?.[key] || 0) || ''])
);

// The party's own rate for a material in the sale's pricing mode, 0 if it has none
export const getPartyMaterialRate = (party, materialType, pricingMode = 'per_ton') => {
  const rate = PARTY_SALE_RATES.find((item) => item.material === materialType);
  if (!party || !rate) return 0;
  return Number(party[pricingMode === 'per_cubic_meter' ? rate.cubicKey : rate.tonKey] || 0);
};
