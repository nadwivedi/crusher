import { toast } from 'react-toastify';
import apiClient from './api';
import { toDayInput } from './monthlyHire';
import { getExpiryStatus, getRenewedIds } from './vehicleDocuments';

// The papers shown for a vehicle, in this order
export const VALIDITY_TYPES = [
  { docType: 'insurance', label: 'Insurance', shortLabel: 'Ins' },
  { docType: 'puc', label: 'PUC', shortLabel: 'PUC' },
  { docType: 'fitness', label: 'Fitness', shortLabel: 'Fit' },
  { docType: 'tax', label: 'Tax', shortLabel: 'Tax' },
  { docType: 'permit', label: 'Permit', shortLabel: 'Permit' }
];

// The RC details shown on a vehicle, by the RTO's field names
export const RC_DETAIL_FIELDS = [
  { key: 'OWNER_NAME', label: 'Owner' },
  { key: 'OWNER_SERIAL_NO', label: 'Owner No.' },
  { key: 'REGISTERED_AT', label: 'Registered At' },
  { key: 'REGN_DT', label: 'Registered On' },
  { key: 'REGN_UPTO', label: 'Registration Valid Up To' },
  { key: 'VEHICLE_CLASS', label: 'Vehicle Class' },
  { key: 'MAKER_DESC', label: 'Maker' },
  { key: 'MAKER_MODEL', label: 'Model' },
  { key: 'FUEL_DESC', label: 'Fuel' },
  { key: 'FUEL_NORMS', label: 'Fuel Norms' },
  { key: 'CHASI_NO', label: 'Chassis No.' },
  { key: 'ENG_NO', label: 'Engine No.' },
  { key: 'UNLADEN_WEIGHT', label: 'Unladen Weight (kg)' },
  { key: 'LADEN_WEIGHT', label: 'Laden Weight (kg)' },
  { key: 'FINANCER_DETAILS', label: 'Financer' },
  { key: 'INSURANCE_COMP', label: 'Insurance Company' },
  { key: 'INS_POLICY_NO', label: 'Policy No.' },
  { key: 'PERMIT_NO', label: 'Permit No.' },
  { key: 'PERMIT_TYPE', label: 'Permit Type' },
  { key: 'BLACKLIST_STATUS', label: 'Blacklist' },
  { key: 'NOC_DETAILS', label: 'NOC' },
  { key: 'PRESENT_ADDRESS', label: 'Address', wide: true }
];

const normalizeVehicleNo = (value) => String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

// A new own vehicle whose background RTO lookup is still running (a lookup older than 3 minutes is taken as stuck)
const PENDING_FOR_MS = 3 * 60 * 1000;
export const isRtoPending = (vehicle) => (
  vehicle?.rcFetchStatus === 'pending'
  && Date.now() - new Date(vehicle.updatedAt || vehicle.createdAt || 0).getTime() < PENDING_FOR_MS
);

// My own vehicle whose number has not been looked up at the RTO yet (and is not being looked up now)
export const needsRtoFetch = (vehicle) => (
  vehicle?.ownership === 'own' && normalizeVehicleNo(vehicle.vehicleNo).length >= 6
  && normalizeVehicleNo(vehicle.vehicleNo) !== String(vehicle.rcFetchedFor || '')
  && !isRtoPending(vehicle)
);

// "12 Mar 2027"
export const formatDocDay = (value) => {
  const key = toDayInput(value);
  if (!key) return '';
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

/**
 * Each vehicle's current copy of each paper (the latest, not renewed), with where it stands today:
 * Map(vehicleId -> { insurance: { doc, status }, puc: ..., ... }).
 */
export const getCurrentPapers = (documents, types = VALIDITY_TYPES) => {
  const list = Array.isArray(documents) ? documents : [];
  const renewedIds = getRenewedIds(list);
  const byVehicle = new Map();
  list.forEach((doc) => {
    if (!types.some((type) => type.docType === doc.docType) || renewedIds.has(doc._id)) return;
    const key = String(doc.vehicleId);
    if (!byVehicle.has(key)) byVehicle.set(key, {});
    const papers = byVehicle.get(key);
    const current = papers[doc.docType]?.doc;
    // A paper without a last day (lifetime tax) beats a dated one; otherwise the later last day wins
    const isNewer = !current
      || (!doc.validTo && current.validTo)
      || (doc.validTo && current.validTo && toDayInput(doc.validTo) > toDayInput(current.validTo));
    if (isNewer) papers[doc.docType] = { doc, status: getExpiryStatus(doc) };
  });
  return byVehicle;
};

/**
 * Fetches my own vehicle's RC from the RTO (one RTO Sarthi call) and adds its papers to Documents.
 * Shows its progress as a toast; returns the API answer, or null when it failed.
 */
export const fetchRtoDetails = async (vehicle) => {
  const toastId = toast.loading(`Fetching RTO details of ${vehicle.vehicleNo}…`);
  try {
    const response = await apiClient.post(`/vehicles/${vehicle._id}/rto-details`);
    const added = (response?.documents || []).filter((doc) => doc.status === 'added').length;
    const remaining = response?.usage?.remaining;
    toast.update(toastId, {
      render: [
        `${vehicle.vehicleNo}: RTO details saved`,
        added ? `${added} paper${added === 1 ? '' : 's'} added to Documents` : 'papers already up to date',
        Number.isFinite(Number(remaining)) ? `${remaining} RTO calls left` : ''
      ].filter(Boolean).join(' · '),
      type: 'success',
      isLoading: false,
      autoClose: 4000,
      closeButton: true
    });
    return response;
  } catch (error) {
    toast.update(toastId, {
      render: `${vehicle.vehicleNo}: ${error?.message || 'Could not fetch RTO details'}`,
      type: 'error',
      isLoading: false,
      autoClose: 5000,
      closeButton: true
    });
    return null;
  }
};
