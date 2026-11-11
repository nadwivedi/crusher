import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import apiClient from '../../../utils/api';
import { describeDaysLeft } from '../../../utils/vehicleDocuments';
import { RC_DETAIL_FIELDS, VALIDITY_TYPES, fetchRtoDetails, formatDocDay, getCurrentPapers, isRtoPending, needsRtoFetch } from '../../../utils/rtoDetails';

const formatFetchedAt = (value) => (value
  ? new Date(value).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '');

/**
 * My own vehicle's RTO record: insurance / PUC / fitness / tax / permit validity (from its documents) and the RC
 * details fetched from RTO Sarthi, with a button to fetch them (or fetch again, which uses one call).
 */
export default function RtoDetailsPanel({ vehicle, canFetch = true, onFetched }) {
  const [documents, setDocuments] = useState([]);
  const [busy, setBusy] = useState(false);

  const loadDocuments = useCallback(async () => {
    try {
      const response = await apiClient.get('/vehicle-documents', { params: { vehicleId: vehicle._id } });
      setDocuments(Array.isArray(response) ? response : []);
    } catch {
      setDocuments([]);
    }
  }, [vehicle._id]);

  useEffect(() => { loadDocuments(); }, [loadDocuments]);

  const papers = useMemo(() => getCurrentPapers(documents).get(String(vehicle._id)) || {}, [documents, vehicle._id]);
  const details = vehicle.rcDetails || {};
  const detailRows = RC_DETAIL_FIELDS.filter((field) => details[field.key]);
  const notFetched = needsRtoFetch(vehicle);
  // A new vehicle's lookup still running on the server: look again every few seconds
  const pending = isRtoPending(vehicle);
  const failed = vehicle.rcFetchStatus === 'failed' && notFetched;

  useEffect(() => {
    if (!pending || !onFetched) return undefined;
    const timer = setTimeout(() => onFetched(), 4000);
    return () => clearTimeout(timer);
  }, [pending, onFetched, vehicle]);

  const runFetch = async () => {
    if (!notFetched && !window.confirm(`Fetch ${vehicle.vehicleNo} again from the RTO? This uses one RTO Sarthi call.`)) return;
    setBusy(true);
    const result = await fetchRtoDetails(vehicle);
    setBusy(false);
    if (result) {
      loadDocuments();
      if (onFetched) onFetched(result.vehicle);
    }
  };

  return (
    <section className="panel">
      <div className="panel-header flex flex-wrap items-center justify-between gap-2 py-2.5">
        <div className="min-w-0">
          <h3 className="flex items-center gap-1.5 text-sm font-bold text-slate-900"><ShieldCheck size={16} className="text-primary-600" /> RTO Details</h3>
          <p className="text-xs text-slate-500">
            {vehicle.rcFetchedAt ? `From the RTO record · fetched ${formatFetchedAt(vehicle.rcFetchedAt)}` : 'RC, insurance, PUC, fitness and tax from the RTO record'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to={`/documents?vehicle=${vehicle._id}`} className="text-xs font-semibold text-primary-600 hover:text-primary-700">All documents</Link>
          {canFetch && (
            <button type="button" className={notFetched ? 'btn-primary' : 'btn-secondary'} onClick={runFetch} disabled={busy || pending}>
              <RefreshCw size={16} className={busy || pending ? 'animate-spin' : ''} />
              {busy || pending ? 'Fetching…' : failed ? 'Try Again' : notFetched ? 'Fetch From RTO' : 'Refresh From RTO'}
            </button>
          )}
        </div>
      </div>

      {pending && (
        <p className="border-b border-slate-100 bg-primary-50 px-4 py-2 text-xs font-medium text-primary-700 md:px-5">
          Fetching RC, insurance, PUC, fitness and tax from the RTO in the background…
        </p>
      )}
      {failed && (
        <p className="border-b border-slate-100 bg-rose-50 px-4 py-2 text-xs font-medium text-rose-700 md:px-5">
          RTO fetch did not work: {vehicle.rcFetchError || 'try again'}
        </p>
      )}

      {/* Validity of each paper: the latest copy kept in Documents */}
      <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 md:p-4 lg:grid-cols-5">
        {VALIDITY_TYPES.map((type) => {
          const paper = papers[type.docType];
          const day = paper && formatDocDay(paper.doc.validTo);
          return (
            <div key={type.docType} className="rounded-lg border border-slate-200 px-3 py-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{type.label}</p>
              {paper ? (
                <>
                  <p className="mt-0.5 text-sm font-semibold text-slate-800">{day || paper.doc.title || 'No expiry'}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className={`${paper.status.className} text-[10px]`}>{paper.status.label}</span>
                    {paper.status.daysLeft !== null && <span className="text-[11px] text-slate-500">{describeDaysLeft(paper.status.daysLeft)}</span>}
                  </div>
                </>
              ) : (
                <p className="mt-0.5 text-sm text-slate-400">Not on record</p>
              )}
            </div>
          );
        })}
      </div>

      {detailRows.length > 0 ? (
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2.5 border-t border-slate-100 px-4 py-3 sm:grid-cols-2 md:px-5 lg:grid-cols-3">
          {detailRows.map((field) => (
            <div key={field.key} className={`min-w-0 ${field.wide ? 'sm:col-span-2 lg:col-span-3' : ''}`}>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{field.label}</dt>
              <dd className="break-words text-sm font-medium text-slate-800">{details[field.key]}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500 md:px-5">
          {notFetched
            ? 'Not fetched yet. "Fetch From RTO" brings the RC details and adds the insurance, PUC, fitness and tax dates to Documents.'
            : 'The RTO record had no more details for this vehicle.'}
        </p>
      )}
    </section>
  );
}
