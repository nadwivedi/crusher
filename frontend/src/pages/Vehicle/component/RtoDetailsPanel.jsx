import { useEffect, useState } from 'react';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import { RC_DETAIL_FIELDS, fetchRtoDetails, isRtoPending, needsRtoFetch } from '../../../utils/rtoDetails';

const formatFetchedAt = (value) => (value
  ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  : '');

/**
 * My own vehicle's RC details from the RTO (owner, model, chassis, engine...), with a button to fetch them
 * (or fetch again, which uses one RTO Sarthi call). The papers' dates are shown by the page's paper tiles.
 */
export default function RtoDetailsPanel({ vehicle, canFetch = true, onFetched }) {
  const [busy, setBusy] = useState(false);
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
    if (result && onFetched) onFetched();
  };

  return (
    <section className="panel">
      <div className="panel-header flex flex-wrap items-center justify-between gap-2 py-2.5">
        <div className="min-w-0">
          <h2 className="flex items-center gap-1.5 text-sm font-bold text-slate-900"><ShieldCheck size={16} className="text-primary-600" /> RC Details</h2>
          <p className="text-xs text-slate-500">
            {pending
              ? 'Fetching from the RTO in the background…'
              : vehicle.rcFetchedAt ? `From the RTO record · ${formatFetchedAt(vehicle.rcFetchedAt)}` : 'Owner, model, chassis and engine from the RTO record'}
          </p>
        </div>
        {canFetch && (
          <button type="button" className={notFetched ? 'btn-primary' : 'btn-secondary'} onClick={runFetch} disabled={busy || pending}>
            <RefreshCw size={16} className={busy || pending ? 'animate-spin' : ''} />
            {busy || pending ? 'Fetching…' : failed ? 'Try Again' : notFetched ? 'Fetch From RTO' : 'Refresh'}
          </button>
        )}
      </div>

      {failed && (
        <p className="border-b border-slate-100 bg-rose-50 px-4 py-2 text-xs font-medium text-rose-700 md:px-5">
          RTO fetch did not work: {vehicle.rcFetchError || 'try again'}
        </p>
      )}

      {detailRows.length > 0 ? (
        <dl className="grid grid-cols-1 gap-x-8 gap-y-3 px-4 py-4 sm:grid-cols-2 md:px-5 lg:grid-cols-3">
          {detailRows.map((field) => (
            <div key={field.key} className={`min-w-0 ${field.wide ? 'sm:col-span-2 lg:col-span-3' : ''}`}>
              <dt className="text-xs text-slate-400">{field.label}</dt>
              <dd className="break-words text-sm font-medium text-slate-800">{details[field.key]}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="px-4 py-4 text-sm text-slate-500 md:px-5">
          {notFetched
            ? 'Not fetched yet. "Fetch From RTO" brings the RC details and fills the insurance, PUC, fitness and tax dates.'
            : 'The RTO record had no more details for this vehicle.'}
        </p>
      )}
    </section>
  );
}
