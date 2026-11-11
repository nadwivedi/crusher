import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, Inbox, Paperclip, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import apiClient from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { canAddEntries, canDeleteEntries, canEditEntry } from '../../utils/staffAccess';
import { toLocalDateInput } from '../../components/CustomRangePopup';
import { toDayInput } from '../../utils/monthlyHire';
import { getVehicleCategoryLabel } from '../../utils/transport';
import { getDocumentName, getExpiryStatus, getRenewedIds } from '../../utils/vehicleDocuments';
import { formatDocDay } from '../../utils/rtoDetails';
import AddDocumentPopup from './component/AddDocumentPopup';
import VehiclePapersView from './component/VehiclePapersView';
import RtoDetailsPanel from '../Vehicle/component/RtoDetailsPanel';

const TH = 'tbl-head px-3 py-2 first:pl-5 last:pr-5';
const TD = 'tbl-cell px-3 py-2.5 first:pl-5 last:pr-5';

// Papers in the order the page lists them
const TYPE_ORDER = ['insurance', 'puc', 'fitness', 'tax', 'permit', 'rc', 'other'];

// The day after a paper's last day: where its renewal starts
const dayAfter = (value) => {
  const day = toDayInput(value);
  if (!day) return '';
  const next = new Date(`${day}T00:00:00`);
  next.setDate(next.getDate() + 1);
  return toLocalDateInput(next);
};

// A record's state in plain words: Current, Expiring in 2d, Expired 2d ago, Renewed, No expiry, Starts later
const describeRecord = (status) => {
  switch (status.key) {
    case 'expired': return { text: `Expired ${Math.abs(status.daysLeft)}d ago`, dot: 'bg-rose-500', tone: 'text-rose-700' };
    case 'soon': return { text: status.daysLeft === 0 ? 'Expires today' : `Expiring in ${status.daysLeft}d`, dot: 'bg-amber-500', tone: 'text-amber-700' };
    case 'renewed': return { text: 'Renewed', dot: 'bg-slate-300', tone: 'text-slate-400' };
    case 'upcoming': return { text: 'Starts later', dot: 'bg-sky-500', tone: 'text-sky-700' };
    case 'none': return { text: 'No expiry', dot: 'bg-emerald-500', tone: 'text-slate-600' };
    default: return { text: 'Current', dot: 'bg-emerald-500', tone: 'text-slate-600' };
  }
};

/**
 * One vehicle's papers: the current insurance / PUC / fitness / tax / permit / RC as tiles, its RC details from
 * the RTO, and every record it has ever had (old, renewed copies too), paper by paper.
 */
export default function VehicleDocuments() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [vehicle, setVehicle] = useState(null);
  const [documents, setDocuments] = useState(null);
  const [error, setError] = useState('');
  // { document } to edit, { preset } to add
  const [popup, setPopup] = useState(null);

  const load = useCallback(async () => {
    try {
      const [vehicleResponse, documentResponse] = await Promise.all([
        // A deleted vehicle's papers still open here
        apiClient.get(`/vehicles/${id}`).catch(() => null),
        apiClient.get('/vehicle-documents', { params: { vehicleId: id } })
      ]);
      setVehicle(vehicleResponse);
      setDocuments(Array.isArray(documentResponse) ? documentResponse : []);
      setError('');
    } catch (loadError) {
      setError(loadError?.message || 'Error loading documents');
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key !== 'Escape' || popup || document.querySelector('.fixed.inset-0.z-50')) return;
      navigate('/documents');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, popup]);

  const canAdd = canAddEntries(user);
  const vehicleNo = vehicle?.vehicleNo || documents?.[0]?.vehicleNo || '';
  const shownVehicle = vehicle || (documents?.length ? { _id: id, vehicleNo, missing: true } : null);

  // Every record, paper by paper; the newest copy of each first
  const groups = useMemo(() => {
    const list = documents || [];
    const renewedIds = getRenewedIds(list);
    const rows = list.map((doc) => ({ ...doc, status: getExpiryStatus(doc, { renewed: renewedIds.has(doc._id) }) }));
    const byType = new Map();
    rows.forEach((row) => {
      const key = row.docType === 'other' ? `other|${String(row.title || '').toLowerCase()}` : row.docType;
      if (!byType.has(key)) byType.set(key, { key, docType: row.docType, label: getDocumentName({ docType: row.docType, title: row.docType === 'other' ? row.title : '' }), rows: [] });
      byType.get(key).rows.push(row);
    });
    const rank = (docType) => {
      const index = TYPE_ORDER.indexOf(docType);
      return index < 0 ? TYPE_ORDER.length : index;
    };
    return [...byType.values()]
      .map((group) => ({
        ...group,
        rows: group.rows.sort((a, b) => String(toDayInput(b.validTo) || '9999').localeCompare(String(toDayInput(a.validTo) || '9999'))
          || new Date(b.createdAt) - new Date(a.createdAt))
      }))
      .sort((a, b) => rank(a.docType) - rank(b.docType) || a.label.localeCompare(b.label));
  }, [documents]);

  const recordCount = documents?.length || 0;

  const handleDelete = async (doc) => {
    if (!window.confirm(`Delete this ${getDocumentName(doc)} record of ${vehicleNo}?`)) return;
    try {
      await apiClient.delete(`/vehicle-documents/${doc._id}`);
      toast.success('Document deleted', { autoClose: 1200 });
      load();
    } catch (deleteError) {
      toast.error(deleteError?.message || 'Error deleting document', { autoClose: 1200 });
    }
  };

  const renewPreset = (doc) => ({ vehicleId: id, docType: doc.docType, title: doc.title, validFrom: dayAfter(doc.validTo) });

  const closePopup = (changed = false) => {
    setPopup(null);
    if (changed) load();
  };

  if (error && !documents) {
    return <div className="m-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div>;
  }
  if (!documents) {
    return <p className="py-16 text-center text-sm text-slate-400">Loading documents…</p>;
  }
  if (!shownVehicle) {
    return (
      <div className="m-4 space-y-3 text-center">
        <p className="text-sm font-semibold text-slate-700">Vehicle not found</p>
        <Link to="/documents" className="btn-secondary inline-flex"><ArrowLeft size={16} /> Back to Documents</Link>
      </div>
    );
  }

  const renderFiles = (doc) => (doc.files?.length ? (
    <div className="flex flex-wrap items-center gap-1">
      {doc.files.map((file, index) => (
        <a
          key={file.url}
          href={file.url}
          target="_blank"
          rel="noreferrer"
          title={file.name || `File ${index + 1}`}
          className="inline-flex items-center gap-0.5 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600 hover:bg-primary-50 hover:text-primary-700"
        >
          <Paperclip size={11} /> {doc.files.length > 1 ? index + 1 : 'View'}
        </a>
      ))}
    </div>
  ) : <span className="text-xs text-slate-300">—</span>);

  const renderActions = (doc) => (
    <div className="flex items-center justify-end">
      {canAdd && (doc.status.key === 'expired' || doc.status.key === 'soon') && (
        <button type="button" title="Renew" aria-label="Renew" className="icon-btn p-1.5 hover:bg-emerald-50 hover:text-emerald-600" onClick={() => setPopup({ preset: renewPreset(doc) })}>
          <RotateCcw size={15} />
        </button>
      )}
      {canEditEntry(user, doc) && (
        <button type="button" title="Edit" aria-label="Edit" className="icon-btn p-1.5 hover:bg-blue-50 hover:text-blue-600" onClick={() => setPopup({ document: doc })}>
          <Pencil size={15} />
        </button>
      )}
      {canDeleteEntries(user) && (
        <button type="button" title="Delete" aria-label="Delete" className="icon-btn p-1.5 hover:bg-rose-50 hover:text-rose-600" onClick={() => handleDelete(doc)}>
          <Trash2 size={15} />
        </button>
      )}
    </div>
  );

  const renderState = (doc) => {
    const state = describeRecord(doc.status);
    return (
      <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold ${state.tone}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${state.dot}`} /> {state.text}
      </span>
    );
  };

  const subtitle = shownVehicle.missing
    ? 'Vehicle deleted · its papers are kept'
    : [getVehicleCategoryLabel(shownVehicle.category), shownVehicle.ownership === 'own' ? 'My vehicle' : shownVehicle.ownership === 'hired' ? 'Hired vehicle' : ''].filter(Boolean).join(' · ');

  return (
    <div className="page-fade-in space-y-3.5 px-3 pb-6 pt-3.5 md:space-y-4 lg:px-6 lg:pt-4">
      <div className="page-header gap-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <Link to="/documents" aria-label="Back to documents" className="icon-btn shrink-0"><ArrowLeft size={18} /></Link>
          <div className="min-w-0">
            <h1 className="page-title font-mono">{vehicleNo}</h1>
            <p className="page-subtitle">{subtitle || 'Vehicle documents'}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!shownVehicle.missing && (
            <Link to={`/vehicle/${id}`} className="btn-secondary"><BookOpen size={16} /> Vehicle Ledger</Link>
          )}
          {canAdd && !shownVehicle.missing && (
            <button type="button" className="btn-primary" onClick={() => setPopup({ preset: { vehicleId: id } })}>
              <Plus size={18} /> Add Document
            </button>
          )}
        </div>
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700">{error}</div>}

      {/* The current copy of each paper */}
      <section className="panel">
        <div className="panel-header py-2.5">
          <h2 className="text-sm font-bold text-slate-900">Current Papers</h2>
          <p className="text-xs text-slate-500">Tap a paper to open it · Upload adds its photo or PDF</p>
        </div>
        <div className="p-3 md:p-4">
          <VehiclePapersView
            variant="tiles"
            documents={documents}
            vehicles={vehicle ? [vehicle] : []}
            vehicleFilter={id}
            user={user}
            canAdd={canAdd}
            onAdd={(preset) => setPopup({ preset })}
            onEdit={(doc) => setPopup({ document: doc })}
            onChanged={load}
          />
        </div>
      </section>

      {/* RC details from the RTO, for my own vehicle */}
      {vehicle?.ownership === 'own' && <RtoDetailsPanel key={vehicle.rcFetchedAt || 'none'} vehicle={vehicle} canFetch={canEditEntry(user, vehicle)} onFetched={load} />}

      {/* Every record, old copies too */}
      <section className="panel">
        <div className="panel-header py-2.5">
          <h2 className="text-sm font-bold text-slate-900">All Records <span className="ml-1 font-medium text-slate-400">{recordCount}</span></h2>
          <p className="text-xs text-slate-500">Every copy of each paper, the newest first</p>
        </div>

        {groups.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400"><Inbox size={20} /></span>
            <p className="text-sm font-semibold text-slate-800">No documents yet</p>
            <p className="text-xs text-slate-500">Add its insurance, PUC, fitness or tax with "Add Document".</p>
          </div>
        ) : (
          <>
            {/* Phone: paper by paper, a line per record */}
            <div className="divide-y divide-slate-100 md:hidden">
              {groups.map((group) => (
                <div key={group.key} className="px-4 py-3">
                  <p className="mb-1.5 text-xs font-bold text-slate-800">{group.label} <span className="font-medium text-slate-400">· {group.rows.length}</span></p>
                  <ul className="space-y-2">
                    {group.rows.map((doc) => (
                      <li key={doc._id} className={`flex items-start justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 ${doc.status.key === 'renewed' ? 'opacity-70' : ''}`}>
                        <div className="min-w-0 space-y-0.5 text-xs">
                          <p className="text-slate-500">
                            <span className="text-slate-400">From</span> {formatDocDay(doc.validFrom) || '—'}
                            <span className="mx-1.5 text-slate-300">→</span>
                            <span className="text-slate-400">To</span> <span className="font-semibold text-slate-800">{doc.validTo ? formatDocDay(doc.validTo) : 'No expiry'}</span>
                          </p>
                          {doc.documentNumber && <p className="truncate text-slate-500">No. {doc.documentNumber}</p>}
                          <div className="flex flex-wrap items-center gap-2">{renderState(doc)}{renderFiles(doc)}</div>
                        </div>
                        {renderActions(doc)}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Desktop: one table, a heading row per paper */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[820px] text-left">
                <thead>
                  <tr>
                    <th className={TH}>Number</th>
                    <th className={TH}>Valid From</th>
                    <th className={TH}>Valid To</th>
                    <th className={TH}>Status</th>
                    <th className={TH}>Notes</th>
                    <th className={TH}>Files</th>
                    <th className={TH} />
                  </tr>
                </thead>
                {groups.map((group) => (
                  <tbody key={group.key}>
                    <tr className="border-t border-slate-200 bg-slate-50/70">
                      <td colSpan={7} className="px-5 py-1.5 text-xs font-bold text-slate-700">
                        {group.label} <span className="font-medium text-slate-400">· {group.rows.length} record{group.rows.length === 1 ? '' : 's'}</span>
                      </td>
                    </tr>
                    {group.rows.map((doc) => (
                      <tr key={doc._id} className={`tbl-row ${doc.status.key === 'renewed' ? 'text-slate-400' : ''}`}>
                        <td className={`${TD} text-sm ${doc.status.key === 'renewed' ? '' : 'text-slate-700'}`}>{doc.documentNumber || '—'}</td>
                        <td className={`${TD} whitespace-nowrap text-sm tabular-nums`}>{formatDocDay(doc.validFrom) || '—'}</td>
                        <td className={`${TD} whitespace-nowrap text-sm font-semibold tabular-nums ${doc.status.key === 'renewed' ? '' : 'text-slate-800'}`}>{doc.validTo ? formatDocDay(doc.validTo) : 'No expiry'}</td>
                        <td className={TD}>{renderState(doc)}</td>
                        <td className={`${TD} max-w-64`}><p className="truncate text-xs text-slate-500" title={doc.notes}>{doc.notes || '—'}</p></td>
                        <td className={TD}>{renderFiles(doc)}</td>
                        <td className={`${TD} py-1!`}>{renderActions(doc)}</td>
                      </tr>
                    ))}
                  </tbody>
                ))}
              </table>
            </div>
          </>
        )}
      </section>

      {popup && (
        <AddDocumentPopup
          document={popup.document || null}
          preset={popup.preset || null}
          vehicles={vehicle ? [vehicle] : []}
          onClose={() => closePopup()}
          onSaved={() => closePopup(true)}
        />
      )}
    </div>
  );
}
