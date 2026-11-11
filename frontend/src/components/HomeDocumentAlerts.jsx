import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, BellRing, CalendarX, ChevronRight, ShieldCheck, Truck } from 'lucide-react';
import apiClient from '../utils/api';
import { toDayInput } from '../utils/monthlyHire';
import {
  EXPIRY_SOON_DAYS, describeDaysLeft, getDocumentName, getExpiryStatus, getRenewedIds
} from '../utils/vehicleDocuments';

// How many vehicles are listed before "View all"
const MAX_VEHICLES = 6;

const formatDay = (value) => {
  const key = toDayInput(value);
  if (!key) return '';
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

/**
 * Dashboard alerts: vehicle papers (insurance, permit, fitness, tax, PUC...) that have expired or end within
 * EXPIRY_SOON_DAYS, grouped by vehicle, most urgent first. A paper already renewed by a newer copy is left out.
 * Hidden when the account has no vehicle documents at all.
 */
export default function HomeDocumentAlerts() {
  const [documents, setDocuments] = useState(null);

  useEffect(() => {
    let ignore = false;
    apiClient.get('/vehicle-documents')
      .then((response) => { if (!ignore) setDocuments(Array.isArray(response) ? response : []); })
      // No alerts rather than an error on the dashboard
      .catch(() => { if (!ignore) setDocuments([]); });
    return () => { ignore = true; };
  }, []);

  const { vehicles, expiredCount, soonCount } = useMemo(() => {
    const list = documents || [];
    const renewedIds = getRenewedIds(list);
    const alerts = list
      .map((doc) => ({ ...doc, status: getExpiryStatus(doc, { renewed: renewedIds.has(doc._id) }) }))
      .filter((doc) => doc.status.key === 'expired' || doc.status.key === 'soon')
      .sort((a, b) => a.status.daysLeft - b.status.daysLeft);

    // One row per vehicle, with each of its papers; the vehicle's most urgent paper decides its place
    const byVehicle = new Map();
    alerts.forEach((doc) => {
      const key = String(doc.vehicleId);
      if (!byVehicle.has(key)) byVehicle.set(key, { key, vehicleNo: doc.vehicleNo, vehicleId: doc.vehicleId, docs: [] });
      byVehicle.get(key).docs.push(doc);
    });

    return {
      vehicles: [...byVehicle.values()],
      expiredCount: alerts.filter((doc) => doc.status.key === 'expired').length,
      soonCount: alerts.filter((doc) => doc.status.key === 'soon').length,
    };
  }, [documents]);

  // Still loading, or nothing recorded yet: no section
  if (!documents || documents.length === 0) return null;

  if (vehicles.length === 0) {
    return (
      <section className="panel flex items-center gap-3 px-4 py-3 md:px-5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-100">
          <ShieldCheck size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900">All vehicle documents are valid</p>
          <p className="text-xs text-slate-500">Nothing expired or ending in the next {EXPIRY_SOON_DAYS} days</p>
        </div>
        <Link to="/documents" className="shrink-0 text-xs font-semibold text-primary-600 hover:text-primary-700">Documents</Link>
      </section>
    );
  }

  const shown = vehicles.slice(0, MAX_VEHICLES);
  const hasExpired = expiredCount > 0;

  return (
    <section className={`panel overflow-hidden ring-1 ${hasExpired ? 'ring-rose-200' : 'ring-amber-200'}`}>
      <div className={`panel-header flex flex-wrap items-center justify-between gap-2 py-3 ${hasExpired ? 'border-rose-100 bg-rose-50' : 'border-amber-100 bg-amber-50'}`}>
        <div className="flex min-w-0 items-center gap-2.5">
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${hasExpired ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'}`}>
            <BellRing size={16} />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900">Vehicle Document Alerts</h3>
            <p className="text-xs text-slate-600">
              {[
                expiredCount ? `${expiredCount} expired` : '',
                soonCount ? `${soonCount} expiring in the next ${EXPIRY_SOON_DAYS} days` : '',
              ].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
        <Link
          to="/documents"
          className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50"
        >
          View all <ChevronRight size={14} />
        </Link>
      </div>

      <ul className="divide-y divide-slate-100">
        {shown.map((vehicle) => (
          <li key={vehicle.key}>
            <Link
              to={`/documents/vehicle/${vehicle.vehicleId}`}
              className="flex items-start gap-3 px-4 py-3 transition hover:bg-slate-50 md:px-5"
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                <Truck size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-sm font-bold text-slate-900">{vehicle.vehicleNo || '-'}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {vehicle.docs.map((doc) => {
                    const expired = doc.status.key === 'expired';
                    const Icon = expired ? CalendarX : AlertTriangle;
                    return (
                      <span
                        key={doc._id}
                        title={`Valid to ${formatDay(doc.validTo)}`}
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${
                          expired ? 'bg-rose-50 text-rose-700 ring-rose-200' : 'bg-amber-50 text-amber-800 ring-amber-200'
                        }`}
                      >
                        <Icon size={12} />
                        {getDocumentName(doc)}
                        <span className="font-medium opacity-80">· {describeDaysLeft(doc.status.daysLeft)} ({formatDay(doc.validTo)})</span>
                      </span>
                    );
                  })}
                </div>
              </div>
              <ChevronRight size={16} className="mt-2 shrink-0 text-slate-300" />
            </Link>
          </li>
        ))}
      </ul>

      {vehicles.length > shown.length && (
        <Link to="/documents" className="block border-t border-slate-100 px-4 py-2.5 text-center text-xs font-semibold text-primary-600 hover:bg-slate-50 md:px-5">
          {vehicles.length - shown.length} more {vehicles.length - shown.length === 1 ? 'vehicle' : 'vehicles'} need attention · View all
        </Link>
      )}
    </section>
  );
}
