import apiClient from './api';
import { toDayInput, todayInput } from './monthlyHire';

// Files a document can keep: photos or PDFs up to 5 MB each
export const MAX_DOCUMENT_FILE_BYTES = 5 * 1024 * 1024;
export const DOCUMENT_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

// Why these files cannot be saved, or '' when they can
export const checkDocumentFiles = (files) => {
  const wrong = files.find((file) => !DOCUMENT_FILE_TYPES.includes(file.type));
  if (wrong) return `${wrong.name}: only JPG, PNG, WEBP or PDF files can be saved`;
  const tooBig = files.find((file) => file.size > MAX_DOCUMENT_FILE_BYTES);
  if (tooBig) return `${tooBig.name} is larger than 5 MB`;
  return '';
};

// Uploads the files one by one: [{ url, name, mimeType }]
export const uploadDocumentFiles = async (files) => {
  const uploaded = [];
  for (const file of files) {
    const body = new FormData();
    body.append('document', file);
    const response = await apiClient.post('/uploads/document', body, { headers: { 'Content-Type': 'multipart/form-data' } });
    const url = response?.url || response?.relativePath;
    if (url) uploaded.push({ url, name: file.name, mimeType: file.type });
  }
  return uploaded;
};

// Adds uploaded files to a saved document, keeping its dates, number and notes; returns the saved document
export const attachFilesToDocument = async (doc, files) => apiClient.put(`/vehicle-documents/${doc._id}`, {
  vehicleId: String(doc.vehicleId),
  docType: doc.docType,
  title: doc.title || '',
  documentNumber: doc.documentNumber || '',
  validFrom: toDayInput(doc.validFrom) || null,
  validTo: toDayInput(doc.validTo) || null,
  notes: doc.notes || '',
  files: [...(doc.files || []), ...files]
});

// A document whose last day is this close (or nearer) is "expiring soon"
export const EXPIRY_SOON_DAYS = 30;

export const DOCUMENT_TYPES = [
  { value: 'rc', label: 'RC', fullLabel: 'Registration Certificate (RC)', expires: false },
  { value: 'insurance', label: 'Insurance', fullLabel: 'Insurance', expires: true },
  { value: 'fitness', label: 'Fitness', fullLabel: 'Fitness Certificate', expires: true },
  { value: 'permit', label: 'Permit', fullLabel: 'Permit', expires: true },
  { value: 'tax', label: 'Tax', fullLabel: 'Road Tax', expires: true },
  { value: 'puc', label: 'PUC', fullLabel: 'Pollution (PUC)', expires: true },
  { value: 'other', label: 'Other', fullLabel: 'Other document', expires: true }
];

export const getDocumentTypeLabel = (docType) => DOCUMENT_TYPES.find((type) => type.value === docType)?.label || 'Document';

// "Insurance", or the name typed for an "other" document
export const getDocumentName = (doc) => {
  if (doc?.docType === 'other') return doc.title || 'Other';
  return doc?.title ? `${getDocumentTypeLabel(doc.docType)} · ${doc.title}` : getDocumentTypeLabel(doc?.docType);
};

const DAY_MS = 24 * 60 * 60 * 1000;
const daysBetween = (fromDay, toDay) => Math.round((new Date(`${toDay}T00:00:00`) - new Date(`${fromDay}T00:00:00`)) / DAY_MS);

// One vehicle's same paper (its insurance, its permit...); a newer copy of it renews the older one
const getSlotKey = (doc) => `${doc.vehicleId}|${doc.docType}|${doc.docType === 'other' ? String(doc.title || '').trim().toLowerCase() : ''}`;

/**
 * The ids of documents replaced by a newer copy for the same vehicle (a renewed insurance, permit...).
 * Those are not counted as expired or expiring.
 */
export const getRenewedIds = (docs) => {
  const latest = new Map();
  for (const doc of docs) {
    if (!doc.validTo) continue;
    const key = getSlotKey(doc);
    const current = latest.get(key);
    if (!current || toDayInput(doc.validTo) > toDayInput(current.validTo)) latest.set(key, doc);
  }
  const renewed = new Set();
  for (const doc of docs) {
    if (!doc.validTo) continue;
    const newest = latest.get(getSlotKey(doc));
    if (newest && newest._id !== doc._id && toDayInput(newest.validTo) > toDayInput(doc.validTo)) renewed.add(doc._id);
  }
  return renewed;
};

/**
 * Where a document stands today: key is expired, soon, valid, upcoming, none (no expiry) or renewed.
 * daysLeft: days until its last day (negative once expired).
 */
export const getExpiryStatus = (doc, { renewed = false, today = todayInput() } = {}) => {
  const validTo = toDayInput(doc?.validTo);
  const validFrom = toDayInput(doc?.validFrom);

  if (renewed) return { key: 'renewed', label: 'Renewed', className: 'badge-gray', daysLeft: null };
  if (validFrom && validFrom > today) {
    return { key: 'upcoming', label: 'Starts later', className: 'badge-blue', daysLeft: validTo ? daysBetween(today, validTo) : null };
  }
  if (!validTo) return { key: 'none', label: 'No expiry', className: 'badge-gray', daysLeft: null };

  const daysLeft = daysBetween(today, validTo);
  if (daysLeft < 0) return { key: 'expired', label: 'Expired', className: 'badge-red', daysLeft };
  if (daysLeft <= EXPIRY_SOON_DAYS) return { key: 'soon', label: 'Expiring soon', className: 'badge-orange', daysLeft };
  return { key: 'valid', label: 'Valid', className: 'badge-green', daysLeft };
};

// "Expires today", "12 days left", "Expired 3 days ago"
export const describeDaysLeft = (daysLeft) => {
  if (daysLeft === null || daysLeft === undefined) return '';
  if (daysLeft === 0) return 'Expires today';
  if (daysLeft === 1) return '1 day left';
  if (daysLeft > 1) return `${daysLeft} days left`;
  if (daysLeft === -1) return 'Expired yesterday';
  return `Expired ${Math.abs(daysLeft)} days ago`;
};

export const isImageFile = (file) => /^image\//.test(file?.mimeType || '') || /\.(jpe?g|png|webp|gif)$/i.test(file?.url || '');
