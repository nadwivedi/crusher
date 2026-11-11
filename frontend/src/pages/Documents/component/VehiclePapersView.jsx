import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Inbox, List, Paperclip, Plus, UploadCloud } from 'lucide-react';
import { canEditEntry } from '../../../utils/staffAccess';
import {
  DOCUMENT_FILE_TYPES, attachFilesToDocument, checkDocumentFiles, describeDaysLeft, uploadDocumentFiles
} from '../../../utils/vehicleDocuments';
import { VALIDITY_TYPES, formatDocDay, getCurrentPapers } from '../../../utils/rtoDetails';
import { getVehicleCategoryLabel } from '../../../utils/transport';

// The papers each vehicle's card shows, in this order
const PAPER_COLUMNS = [...VALIDITY_TYPES, { docType: 'rc', label: 'RC' }];

// How urgent a vehicle is: expired papers first, then those ending soonest; no papers at all last
const urgencyOf = (papers) => {
  if (Object.keys(papers).length === 0) return Number.POSITIVE_INFINITY;
  const days = Object.values(papers)
    .map((paper) => paper.status.daysLeft)
    .filter((value) => value !== null && value !== undefined);
  return days.length ? Math.min(...days) : Number.MAX_SAFE_INTEGER;
};

// Only a paper that needs attention gets a colour: red once expired, amber when it ends within 30 days
const TILE_TONE = {
  expired: { tile: 'border-rose-200 bg-rose-50/60', to: 'text-rose-700', note: 'text-rose-600' },
  soon: { tile: 'border-amber-200 bg-amber-50/60', to: 'text-amber-800', note: 'text-amber-700' }
};
const PLAIN_TONE = { tile: 'border-slate-200 bg-white', to: 'text-slate-800', note: '' };

/**
 * Documents by vehicle: a card per vehicle with a tile per paper (insurance, PUC, fitness, tax, permit, RC).
 * Each tile reads the paper's name, then Valid From and Valid To, then its files with an Upload button.
 * Tapping a tile opens the paper; a missing one can be added from its empty tile.
 */
export default function VehiclePapersView({ documents, vehicles, vehicleFilter, search, user, canAdd, onAdd, onEdit, onShowList, onChanged }) {
  const papersByVehicle = useMemo(() => getCurrentPapers(documents, PAPER_COLUMNS), [documents]);
  const fileInputRef = useRef(null);
  const uploadTarget = useRef(null);
  const [uploadingId, setUploadingId] = useState('');

  const cards = useMemo(() => {
    const term = search.trim().toLowerCase();
    const known = new Set(vehicles.map((vehicle) => String(vehicle._id)));
    // A document whose vehicle was deleted still gets its card
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

  // Upload: pick files for one paper, then they are added to it (its dates stay as they are)
  const startUpload = (doc) => {
    uploadTarget.current = doc;
    fileInputRef.current?.click();
  };

  const handleFiles = async (event) => {
    const picked = Array.from(event.target.files || []);
    event.target.value = '';
    const doc = uploadTarget.current;
    if (!doc || picked.length === 0) return;
    const fileError = checkDocumentFiles(picked);
    if (fileError) {
      toast.error(fileError);
      return;
    }
    setUploadingId(doc._id);
    try {
      const uploaded = await uploadDocumentFiles(picked);
      await attachFilesToDocument(doc, uploaded);
      toast.success(`${uploaded.length === 1 ? 'File' : `${uploaded.length} files`} added to ${doc.vehicleNo}`, { autoClose: 1500 });
      if (onChanged) onChanged();
    } catch (error) {
      toast.error(error?.message || 'Could not upload the file');
    } finally {
      setUploadingId('');
    }
  };

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400"><Inbox size={20} /></span>
        <p className="text-sm font-semibold text-slate-800">No vehicles found</p>
        <p className="text-xs text-slate-500">{vehicles.length === 0 ? 'Add a vehicle first, then save its papers here.' : 'Try a different search.'}</p>
      </div>
    );
  }

  const renderEmptyTile = (vehicle, column) => {
    const canCreate = canAdd && !vehicle.missing;
    return (
      <button
        key={column.docType}
        type="button"
        disabled={!canCreate}
        onClick={() => onAdd({ vehicleId: String(vehicle._id), docType: column.docType })}
        className="flex min-h-[7.25rem] flex-col rounded-xl border border-dashed border-slate-300 p-3 text-left transition enabled:hover:border-primary-400 enabled:hover:bg-primary-50/40 disabled:cursor-default"
      >
        <span className="text-xs font-bold text-slate-500">{column.label}</span>
        <span className="mt-auto inline-flex items-center gap-1 text-xs font-semibold text-slate-400">
          {canCreate ? <><Plus size={14} /> Add {column.label}</> : 'Not added'}
        </span>
      </button>
    );
  };

  const renderTile = (vehicle, column, paper) => {
    if (!paper) return renderEmptyTile(vehicle, column);
    const { doc, status } = paper;
    const tone = TILE_TONE[status.key] || PLAIN_TONE;
    const editable = canEditEntry(user, doc);
    const files = doc.files || [];
    const lifetime = !doc.validTo;
    const toText = lifetime ? (column.docType === 'rc' ? 'Permanent' : doc.title || 'No expiry') : formatDocDay(doc.validTo);
    const uploading = uploadingId === doc._id;

    return (
      <div
        key={column.docType}
        role={editable ? 'button' : undefined}
        tabIndex={editable ? 0 : undefined}
        onClick={editable ? () => onEdit(doc) : undefined}
        onKeyDown={editable ? (event) => { if (event.key === 'Enter') onEdit(doc); } : undefined}
        title={editable ? `Open ${column.label}` : undefined}
        className={`flex min-h-[7.25rem] flex-col rounded-xl border p-3 transition ${tone.tile} ${editable ? 'cursor-pointer hover:border-primary-300 hover:shadow-sm' : ''}`}
      >
        <p className="text-xs font-bold text-slate-800">{column.label}</p>

        <dl className="mt-1.5 space-y-0.5 text-xs">
          <div className="flex items-baseline justify-between gap-2">
            <dt className="text-slate-400">From</dt>
            <dd className="font-medium tabular-nums text-slate-600">{formatDocDay(doc.validFrom) || '—'}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <dt className="text-slate-400">To</dt>
            <dd className={`font-semibold tabular-nums ${tone.to}`}>{toText}</dd>
          </div>
        </dl>
        {tone.note && <p className={`mt-1 text-[11px] font-semibold ${tone.note}`}>{describeDaysLeft(status.daysLeft)}</p>}

        {/* Files: open each one, or upload more */}
        <div className="mt-auto flex items-center justify-between gap-1 pt-2" onClick={(event) => event.stopPropagation()}>
          <div className="flex min-w-0 flex-wrap items-center gap-1">
            {files.map((file, index) => (
              <a
                key={file.url}
                href={file.url}
                target="_blank"
                rel="noreferrer"
                title={file.name || `File ${index + 1}`}
                className="inline-flex items-center gap-0.5 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600 hover:bg-primary-50 hover:text-primary-700"
              >
                <Paperclip size={11} /> {files.length > 1 ? index + 1 : 'View'}
              </a>
            ))}
          </div>
          {editable && (
            <button
              type="button"
              onClick={() => startUpload(doc)}
              disabled={uploading}
              className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-primary-600 transition hover:bg-primary-50 disabled:opacity-60"
              title={`Upload a photo or PDF of the ${column.label}`}
            >
              <UploadCloud size={13} /> {uploading ? 'Uploading…' : 'Upload'}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3 p-3 md:p-4">
      <input ref={fileInputRef} type="file" accept={DOCUMENT_FILE_TYPES.join(',')} multiple hidden onChange={handleFiles} />

      {cards.map(({ vehicle, papers }) => (
        <article key={vehicle._id} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3 md:p-4">
          <header className="mb-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              {vehicle.missing
                ? <p className="font-mono text-base font-bold text-slate-500">{vehicle.vehicleNo}</p>
                : <Link to={`/vehicle/${vehicle._id}`} className="font-mono text-base font-bold text-slate-900 hover:text-primary-700">{vehicle.vehicleNo}</Link>}
              <p className="text-xs text-slate-500">
                {vehicle.missing
                  ? 'Vehicle deleted'
                  : [getVehicleCategoryLabel(vehicle.category), vehicle.ownership === 'own' ? 'My vehicle' : vehicle.ownership === 'hired' ? 'Hired' : ''].filter(Boolean).join(' · ')}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button type="button" className="icon-btn p-1.5 hover:bg-white" title="All papers of this vehicle, with old copies" aria-label="All papers of this vehicle" onClick={() => onShowList(String(vehicle._id))}>
                <List size={16} />
              </button>
              {canAdd && !vehicle.missing && (
                <button type="button" className="btn-secondary px-2.5 py-1.5 text-xs" onClick={() => onAdd({ vehicleId: String(vehicle._id) })}>
                  <Plus size={14} /> Add
                </button>
              )}
            </div>
          </header>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
            {PAPER_COLUMNS.map((column) => renderTile(vehicle, column, papers[column.docType]))}
          </div>
        </article>
      ))}
    </div>
  );
}
