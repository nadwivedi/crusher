// The usual materials every crusher sells. Their rates live in the account's materialRates
// (tonKey / cubicKey are the field names there).
export const DEFAULT_MATERIAL_OPTIONS = [
  { value: '60mm', label: '60mm', tonKey: 'sixtyMmRate', cubicKey: 'sixtyMmRatePerCubicMeter' },
  { value: '40mm', label: '40mm', tonKey: 'fortyMmRate', cubicKey: 'fortyMmRatePerCubicMeter' },
  { value: '20mm', label: '20mm', tonKey: 'twentyMmRate', cubicKey: 'twentyMmRatePerCubicMeter' },
  { value: '10mm', label: '10mm', tonKey: 'tenMmRate', cubicKey: 'tenMmRatePerCubicMeter' },
  { value: '6mm', label: '6mm', tonKey: 'sixMmRate', cubicKey: 'sixMmRatePerCubicMeter' },
  { value: '4mm', label: '4mm', tonKey: 'fourMmRate', cubicKey: 'fourMmRatePerCubicMeter' },
  { value: 'wmm', label: 'WMM', tonKey: 'wmmRate', cubicKey: 'wmmRatePerCubicMeter' },
  { value: 'gsb', label: 'GSB', tonKey: 'gsbRate', cubicKey: 'gsbRatePerCubicMeter' },
  { value: 'dust', label: 'Dust', tonKey: 'dustRate', cubicKey: 'dustRatePerCubicMeter' }
];

export const DEFAULT_MATERIAL_VALUES = DEFAULT_MATERIAL_OPTIONS.map((item) => item.value);

// A sale saves its material in lower case, so a custom material's value is its name in lower case
export const toMaterialValue = (name) => String(name || '').replace(/\s+/g, ' ').trim().toLowerCase();

// The extra materials the owner added in Masters -> Material Types
export const getCustomMaterials = (user) => (Array.isArray(user?.customMaterials) ? user.customMaterials : [])
  .filter((item) => toMaterialValue(item?.name));

// The usual materials, then the owner's own
export const getMaterialOptions = (user) => {
  const options = [...DEFAULT_MATERIAL_OPTIONS];
  getCustomMaterials(user).forEach((item) => {
    const value = toMaterialValue(item.name);
    if (!options.some((option) => option.value === value)) {
      options.push({ value, label: String(item.name).trim(), custom: true });
    }
  });
  return options;
};

// The owner's rate for one of their own materials, 0 if it is not one or has no rate
export const getCustomMaterialRate = (user, materialType, pricingMode = 'per_ton') => {
  const value = toMaterialValue(materialType);
  const material = getCustomMaterials(user).find((item) => toMaterialValue(item.name) === value);
  if (!material) return 0;
  return Number((pricingMode === 'per_cubic_meter' ? material.ratePerCubicMeter : material.rate) || 0);
};
