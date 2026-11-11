import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Inbox, List, Plus, ShieldCheck } from 'lucide-react';
import { canEditEntry } from '../../../utils/staffAccess';
import { describeDaysLeft } from '../../../utils/vehicleDocuments';
import { VALIDITY_TYPES, formatDocDay, getCurrentPapers } from '../../../utils/rtoDetails';
import { getVehicleCategoryLabel } from '../../../utils/transport';

// The papers each vehicle's strip shows, in this order
const PAPER_COLUMNS = [...VALIDITY_TYPES, { docType: 'rc', label: 'RC', shortLabel: 'RC' }];

const TH = 'tbl-head px-3 py-2 first:pl-5 last:pr-5';
const TD = 'tbl-cell px-3 py-2 align-top first:pl-5 last:pr-5';

// How urgent a vehicle is: expired papers first, then those ending soonest; no papers at all last
const urgencyOf = (papers) => {
  const days = Object.values(papers)
    .map((paper) => paper.status.daysLeft)
    .filter((value) => value !== null && value !== undefined);
  if (Object.keys(papers).length === 0) return Number.POSITIVE_INFINITY;
  return days.length ? Math.min(...days) : Number.MAX_SAFE_INTEGER;
};

const DOT_CLASS = {
  expired: 'bg-rose-500',
  soon: 'bg-amber-500',
  valid: 'bg-emerald-500',
  none: 'bg-slate-400',
  upcoming: 'bg-sky-500'
};

/**
 * Documents by vehicle: one strip per vehicle with its current insurance, PUC, fitness, tax, permit and RC
 * side by side (date, status, days left). A paper opens for editing; an empty one can be added from its cell.
 */
export default function VehiclePapersView({ documents, vehicles, vehicleFilter, search, user, canAdd, onAdd, onEdit, onShowList }) {
  const papersByVehicle = useMemo(() => getCurrentPapers(documents, PAPER_COLUMNS), [documents]);

  const strips = useMemo(() => {
    const term = search.trim().toLowerCase();
    const known = new Set(vehicles.map((vehicle) => String(vehicle._id)));
    // A document whose vehicle was deleted still gets its strip
    const orphans = documents
      .filter((doc) => !known.has(String(doc.vehicleId)))
      .reduce((list, doc) => (list.some((item) => item._id === String(doc.vehicleId))
        ? list
        : [...list, { _id: String(doc.vehicleId), vehicleNo: doc.vehicleNo, missing: true }]), []);
    return [...vehicles, ...orphans]
      .filter((vehicle) => !vehicleFilter || String(vehicle._id) === vehicleFilter)
      .filter((vehicle) => !term || String(vehicle.vehicleNo || '').toLowerCase().includes(term))
      .map((vehicle) => {
        const papers = papersByVehicle.get(String(vehicle._id)) || {};
        return { vehicle, papers, urgency: urgencyOf(papers) };
      })
      .sort((a, b) => a.urgency - b.urgency || String(a.vehicle.vehicleNo).localeCompare(String(b.vehicle.vehicleNo)));
  }, [documents, vehicles, vehicleFilter, search, papersByVehicle]);

  if (strips.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400"><Inbox size={20} /></span>
        <p className="text-sm font-semibold text-slate-800">No vehicles found</p>
        <p className="text-xs text-slate-500">{vehicles.length === 0 ? 'Add a vehicle first, then save its papers here.' : 'Try a different search.'}</p>
      </div>
    );
  }

  const canEditDoc = (doc) => canEditEntry(user, doc);

  // One paper of a vehicle: its last day and where it stands, or an Add button when there is none
  const renderPaper = (vehicle, column, paper, { compact = false } = {}) => {
    if (!paper) {
      if (!canAdd || vehicle.missing) return <span className="text-xs text-slate-300">—</span>;
      return (
        <button
          type="button"
          onClick={() => onAdd({ vehicleId: String(vehicle._id), docType: column.docType })}
          className="inline-flex items-center gap-0.5 text-xs font-semibold text-slate-400 transition hover:text-primary-600"
          title={`Add ${column.label}`}
        >
          <Plus size={12} /> Add
        </button>
      );
    }
    const { doc, status } = paper;
    const day = formatDocDay(doc.validTo);
    const urgent = status.key === 'expired' || status.key === 'soon';
    const body = (
      <>
        <span className={`block whitespace-nowrap font-semibold text-slate-800 ${compact ? 'text-xs' : 'text-sm'}`}>
          {day || (column.docType === 'rc' ? 'On file' : doc.title || 'No expiry')}
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-1">
          <span className={`${status.className} text-[10px]`}>{status.label}</span>
          {doc.source === 'rto' && !compact && <span className="badge-blue text-[10px]" title="Filled from the RTO record">RTO</span>}
        </span>
        {urgent && (
          <span className={`mt-0.5 block text-[11px] font-semibold ${status.key === 'expired' ? 'text-rose-600' : 'text-amber-700'}`}>
            {describeDaysLeft(status.daysLeft)}
          </span>
        )}
      </>
    );
    return canEditDoc(doc) ? (
      <button type="button" onClick={() => onEdit(doc)} className="-mx-1.5 -my-1 block rounded-md px-1.5 py-1 text-left transition hover:bg-slate-100" title={`Open ${column.label}${doc.documentNumber ? ` · ${doc.documentNumber}` : ''}`}>
        {body}
      </button>
    ) : <div>{body}</div>;
  };

  const renderVehicle = (vehicle) => (
    <div className="min-w-0">
      {vehicle.missing
        ? <p className="font-mono text-sm font-semibold text-slate-500">{vehicle.vehicleNo}</p>
        : <Link to={`/vehicle/${vehicle._id}`} className="font-mono text-sm font-semibold text-slate-800 hover:text-primary-700 hover:underline">{vehicle.vehicleNo}</Link>}
      <p className="flex items-center gap-1 text-[11px] text-slate-500">
        {vehicle.missing
          ? 'Vehicle deleted'
          : [getVehicleCategoryLabel(vehicle.category), vehicle.ownership === 'own' ? 'My vehicle' : vehicle.ownership === 'hired' ? 'Hired' : ''].filter(Boolean).join(' · ')}
        {vehicle.rcFetchedAt && <span title="Details fetched from the RTO"><ShieldCheck size={12} className="text-primary-500" /></span>}
      </p>
    </div>
  );

  const renderRowActions = (vehicle) => (
    <div className="flex items-center justify-end gap-1">
      <button type="button" className="icon-btn p-1.5 hover:bg-slate-100" title="All papers of this vehicle (with old copies)" aria-label="All papers of this vehicle" onClick={() => onShowList(String(vehicle._id))}>
        <List size={16} />
      </button>
      {canAdd && !vehicle.missing && (
        <button type="button" className="icon-btn p-1.5 hover:bg-primary-50 hover:text-primary-600" title="Add a document" aria-label="Add a document" onClick={() => onAdd({ vehicleId: String(vehicle._id) })}>
          <Plus size={16} />
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* Phone: a card per vehicle with its papers in a grid */}
      <ul className="divide-y divide-slate-100 md:hidden">
        {strips.map(({ vehicle, papers }) => (
          <li key={vehicle._id} className="px-4 py-3">
            <div className="flex items-start justify-between gap-2">
              {renderVehicle(vehicle)}
              {renderRowActions(vehicle)}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {PAPER_COLUMNS.map((column) => {
                const paper = papers[column.docType];
                return (
                  <div key={column.docType} className="rounded-lg border border-slate-200 px-2 py-1.5">
                    <p className="mb-0.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      {paper && <span className={`h-1.5 w-1.5 rounded-full ${DOT_CLASS[paper.status.key] || 'bg-slate-400'}`} />}
                      {column.label}
                    </p>
                    {renderPaper(vehicle, column, paper, { compact: true })}
                  </div>
                );
              })}
            </div>
          </li>
        ))}
      </ul>

      {/* Larger screens: one row per vehicle, one column per paper */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[980px] text-left">
          <thead>
            <tr>
              <th className={TH}>Vehicle</th>
              {PAPER_COLUMNS.map((column) => <th key={column.docType} className={TH}>{column.label}</th>)}
              <th className={TH} />
            </tr>
          </thead>
          <tbody>
            {strips.map(({ vehicle, papers }) => (
              <tr key={vehicle._id} className="tbl-row">
                <td className={TD}>{renderVehicle(vehicle)}</td>
                {PAPER_COLUMNS.map((column) => (
                  <td key={column.docType} className={TD}>{renderPaper(vehicle, column, papers[column.docType])}</td>
                ))}
                <td className={`${TD} py-1!`}>{renderRowActions(vehicle)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
