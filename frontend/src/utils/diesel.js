import { getVehicleCategoryLabel } from './transport';

// Where a material used entry went. A plant has one DG set, so "DG Set" needs nothing more picked.
export const USED_FOR_OPTIONS = [
  { key: 'vehicle', label: 'Vehicle' },
  { key: 'dg', label: 'DG Set' },
  { key: 'other', label: 'Plant / Other' }
];

// Same as backend/utils/diesel.js: older entries have no usedFor and went to their vehicle, if any
export const usedForOf = (entry) => entry?.usedFor || (entry?.vehicle ? 'vehicle' : 'other');

// The vehicle number, "DG Set", or '' when used at the plant / other
export const usedForName = (entry) => {
  const usedFor = usedForOf(entry);
  if (usedFor === 'dg') return 'DG Set';
  return usedFor === 'vehicle' ? entry?.vehicleNo || '' : '';
};

// Same rule as backend/utils/diesel.js: the DG set counts hours; a vehicle counts what was picked for it (KM or hours),
// and one saved before that was asked goes by its type (JCB, loader, PC and tractor count hours, the rest KM)
const HOUR_METER_CATEGORIES = ['jcb', 'loader', 'pc', 'tractor'];
export const meterUnitFor = (usedFor, category, meterUnit) => {
  if (usedFor === 'dg') return 'hr';
  if (meterUnit === 'km' || meterUnit === 'hr') return meterUnit;
  return HOUR_METER_CATEGORIES.includes(category) ? 'hr' : 'km';
};

export const METER_UNIT_OPTIONS = [
  { value: 'km', label: 'KM', hint: 'Odometer' },
  { value: 'hr', label: 'Hours', hint: 'Hour meter' }
];
export const meterLabel = (unit) => (unit === 'hr' ? 'Hour Meter' : 'KM Reading');

// My vehicles first, then hired, then party vehicles; each group by number
const OWNERSHIP_ORDER = { own: 0, hired: 1, party: 2 };
export const sortVehiclesForFuel = (vehicles) => [...vehicles].sort((a, b) => (
  (OWNERSHIP_ORDER[a.ownership] ?? 3) - (OWNERSHIP_ORDER[b.ownership] ?? 3)
  || String(a.vehicleNo || '').localeCompare(String(b.vehicleNo || ''))
));

const OWNERSHIP_TAGS = { own: 'My vehicle', hired: 'Hired', party: 'Party' };
export const describeVehicle = (vehicle) => [
  getVehicleCategoryLabel(vehicle?.category),
  OWNERSHIP_TAGS[vehicle?.ownership] || ''
].filter(Boolean).join(' · ');
