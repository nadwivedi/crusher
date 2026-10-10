// How a vehicle is charged: by distance, by weight, by trip, by time, or one fixed amount
export const TRANSPORT_BASIS_OPTIONS = [
  { value: 'per_km', label: 'Per KM', unit: 'km' },
  { value: 'per_ton', label: 'Per Ton', unit: 'ton' },
  { value: 'per_trip', label: 'Per Trip', unit: 'trip' },
  { value: 'per_day', label: 'Per Day', unit: 'day' },
  { value: 'per_week', label: 'Per Week', unit: 'week' },
  { value: 'per_month', label: 'Per Month', unit: 'month' },
  { value: 'fixed', label: 'Fixed Amount', unit: '' }
];

// Rent for a period is booked from the Transport page, not on each sale
export const PERIOD_BASES = ['per_day', 'per_week', 'per_month'];

// Whose vehicle it is. Used by the vehicle master and by the transport choice on a sale.
export const VEHICLE_OWNERSHIP_OPTIONS = [
  { value: 'party', label: 'Party Vehicle', hint: "Party's own vehicle" },
  { value: 'own', label: 'My Vehicle', hint: 'I charge transport' },
  { value: 'hired', label: 'Hired Vehicle', hint: 'I pay a transporter' }
];

const getBasisOption = (basis) => TRANSPORT_BASIS_OPTIONS.find((option) => option.value === basis);

export const getBasisLabel = (basis) => getBasisOption(basis)?.label || 'Fixed Amount';
export const getBasisUnit = (basis) => getBasisOption(basis)?.unit || '';
export const getOwnershipLabel = (ownership) => (
  VEHICLE_OWNERSHIP_OPTIONS.find((option) => option.value === ownership)?.label || 'Party Vehicle'
);

const toNumber = (value) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

// What kind of vehicle it is
export const VEHICLE_CATEGORY_OPTIONS = [
  { value: 'truck', label: 'Truck' },
  { value: 'hyva', label: 'Hyva' },
  { value: 'jcb', label: 'JCB' },
  { value: 'loader', label: 'Loader' },
  { value: 'tractor', label: 'Tractor' },
  { value: 'pc', label: 'PC' },
  { value: 'other', label: 'Other' }
];

export const getVehicleCategoryLabel = (category) => (
  VEHICLE_CATEGORY_OPTIONS.find((option) => option.value === category)?.label || ''
);

const hasHireRates = (source) => Boolean(source) && (
  source.hireBasis === 'per_trip' ? (source.tripRates || []).length > 0 : Number(source.hireRate || 0) > 0
);

/**
 * What a hired vehicle is paid at. The rates live on its transporter;
 * a vehicle saved before that keeps its own rates when the transporter has none.
 */
export const getVehicleHireRates = (vehicle, parties = []) => {
  const partyId = typeof vehicle?.partyId === 'object' ? vehicle?.partyId?._id : vehicle?.partyId;
  const transporter = parties.find((party) => String(party._id) === String(partyId || ''))
    || (typeof vehicle?.partyId === 'object' ? vehicle.partyId : null);
  const source = hasHireRates(transporter) ? transporter : vehicle;
  return {
    hireBasis: source?.hireBasis || 'per_ton',
    hireRate: Number(source?.hireRate || 0),
    tripRates: source?.tripRates || []
  };
};

// The per-trip rate for a location on a hired vehicle, or null when the vehicle has none for it
export const getTripRate = (vehicle, location) => (
  (vehicle?.tripRates || []).find((row) => row.location === location) || null
);

// Per-trip rates: the rows with a location, trimmed and with numeric rates
export const getFilledTripRates = (tripRates) => (tripRates || [])
  .map((row) => ({ location: String(row.location || '').trim(), rate: Number(row.rate || 0) }))
  .filter((row) => row.location);

// A message when per-trip rates cannot be saved, or ''
export const getTripRatesError = (tripRates) => {
  const filled = getFilledTripRates(tripRates);
  if (filled.length === 0) return 'Add at least one location with its trip rate';
  const names = filled.map((row) => row.location.toLowerCase());
  return new Set(names).size === names.length ? '' : 'Each location can be added only once';
};

// A fixed amount ignores the quantity
export const calcTransportAmount = (basis, quantity, rate) => {
  const numericRate = Math.max(0, toNumber(rate));
  const amount = basis === 'fixed' ? numericRate : Math.max(0, toNumber(quantity)) * numericRate;
  return Math.round(amount * 100) / 100;
};

// "120 km × ₹40", "2 months × ₹60,000", or "Fixed amount"
export const describeTransportBasis = (entry) => {
  const unit = getBasisUnit(entry?.basis);
  if (!unit) return 'Fixed amount';
  const quantity = toNumber(entry.quantity);
  const unitLabel = unit === 'km' || quantity === 1 ? unit : `${unit}s`;
  return `${quantity.toLocaleString('en-IN', { maximumFractionDigits: 3 })} ${unitLabel} × ₹${toNumber(entry.rate).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

// Transport charged to the party on a sale. It is part of the sale total.
export const getSaleTransportCharge = (sale) => (
  sale?.transportMode && sale.transportMode !== 'party' ? Math.max(0, toNumber(sale.transportCharge)) : 0
);

/**
 * What a sale's hired vehicle costs. A per-ton vehicle on a per-ton sale takes its tons from the net weight;
 * a vehicle on daily / weekly / monthly rent costs nothing per trip.
 */
export const getSaleTransport = (sale) => {
  if (sale?.transportMode !== 'hired') return { qty: 0, cost: 0, qtyAuto: false, isPeriod: false };

  const basis = sale.transportBasis || 'per_ton';
  if (PERIOD_BASES.includes(basis)) return { qty: 0, cost: 0, qtyAuto: false, isPeriod: true };

  const qtyAuto = basis === 'per_ton' && (sale.pricingMode || 'per_ton') === 'per_ton';
  // A per-trip sale is one trip unless more are typed in
  const qty = basis === 'fixed'
    ? 1
    : qtyAuto
      ? toNumber(sale.netWeight) / 1000
      : basis === 'per_trip' ? toNumber(sale.transportQty) || 1 : toNumber(sale.transportQty);

  return { qty, cost: calcTransportAmount(basis, qty, sale.transportRate), qtyAuto, isPeriod: false };
};
