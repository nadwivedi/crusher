import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, CalendarX, FileCheck, FileText, FolderOpen, Inbox, LayoutGrid, List, Paperclip, Pencil, Plus, RefreshCw, RotateCcw, Search, Trash2, Truck } from 'lucide-react';
import { toast } from 'react-toastify';
import apiClient from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { canAddEntries, canDeleteEntries, canEditEntry } from '../../utils/staffAccess';
import StatCard from '../../components/StatCard';
import Segmented from '../../components/Segmented';
import { toLocalDateInput } from '../../components/CustomRangePopup';
import { formatHireDate, toDayInput } from '../../utils/monthlyHire';
import {
  DOCUMENT_TYPES, EXPIRY_SOON_DAYS, describeDaysLeft, getDocumentName, getExpiryStatus, getRenewedIds
} from '../../utils/vehicleDocuments';
import AddDocumentPopup from './component/AddDocumentPopup';
import VehiclePapersView from './component/VehiclePapersView';

const TH = 'tbl-head px-3 py-2 first:pl-5 last:pr-5';
const TD = 'tbl-cell px-3 py-2 first:pl-5 last:pr-5';

// The three lists: active (valid now, starting later, or never expiring), expiring soon and expired.
// An old copy replaced by its renewal is in none of them.
const STATUS_VIEWS = [
  { key: 'active', label: 'Active', statuses: ['valid', 'none', 'upcoming'] },
  { key: 'soon', label: 'Expiring Soon', shortLabel: 'Expiring', statuses: ['soon'] },
  { key: 'expired', label: 'Expired', statuses: ['expired'] }
];
const VIEW_STATUSES = Object.fromEntries(STATUS_VIEWS.map((view) => [view.key, view.statuses]));

// By Vehicle: one strip per vehicle with all its papers side by side. All Papers: one row per document.
const LAYOUTS = [
  { key: 'vehicles', label: 'By Vehicle', icon: LayoutGrid },
  { key: 'list', label: 'All Papers', icon: List }
];
const LAYOUT_STORAGE_KEY = 'documents-layout';
const readLayout = () => {
  try {
    return window.localStorage.getItem(LAYOUT_STORAGE_KEY) === 'list' ? 'list' : 'vehicles';
  } catch {
    return 'vehicles';
  }
};

// The day after a document's last day: where its renewal starts
const dayAfter = (value) => {
  const day = toDayInput(value);
  if (!day) return '';
  const next = new Date(`${day}T00:00:00`);
  next.setDate(next.getDate() + 1);
  return toLocalDateInput(next);
};

const formatDay = (value) => formatHireDate(value) || '—';

export default function Documents() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const vehicleFilter = searchParams.get('vehicle') || '';
  const [documents, setDocuments] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusView, setStatusView] = useState('active');
  const [layout, setLayoutState] = useState(readLayout);
  const setLayout = (value) => {
    setLayoutState(value);
    try { window.localStorage.setItem(LAYOUT_STORAGE_KEY, value); } catch { /* remembered for this visit only */ }
  };
  // { document } to edit, { preset } to add (preset may be empty)
  const [popup, setPopup] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [documentResponse, vehicleResponse] = await Promise.all([
        apiClient.get('/vehicle-documents'),
        apiClient.get('/vehicles')
      ]);
      setDocuments(Array.isArray(documentResponse) ? documentResponse : []);
      setVehicles(Array.isArray(vehicleResponse) ? vehicleResponse : []);
      setError('');
    } catch (loadError) {
      setError(loadError?.message || 'Error loading documents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const canAdd = canAddEntries(user);
  const openAdd = useCallback((preset = {}) => setPopup({ preset }), []);

  // Alt + N adds a document; Esc goes back home when nothing is open
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey) return;
      if (event.altKey && event.key?.toLowerCase() === 'n' && canAdd) {
        event.preventDefault();
        openAdd(vehicleFilter ? { vehicleId: vehicleFilter } : {});
        return;
      }
      if (event.key !== 'Escape' || event.altKey) return;
      const tag = event.target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
      if (document.querySelector('.fixed.inset-0.z-50')) return;
      event.preventDefault();
      navigate('/');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canAdd, navigate, openAdd, vehicleFilter]);

  const renewedIds = useMemo(() => getRenewedIds(documents), [documents]);

  // Each document with where it stands today
  const rows = useMemo(() => documents.map((doc) => ({
    ...doc,
    status: getExpiryStatus(doc, { renewed: renewedIds.has(doc._id) })
  })), [documents, renewedIds]);

  // Expired first (oldest first), then the ones that end soonest
  const needsAttention = useMemo(() => rows
    .filter((row) => row.status.key === 'expired' || row.status.key === 'soon')
    .filter((row) => !vehicleFilter || String(row.vehicleId) === vehicleFilter)
    .sort((a, b) => a.status.daysLeft - b.status.daysLeft), [rows, vehicleFilter]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (vehicleFilter && String(row.vehicleId) !== vehicleFilter) return false;
      if (typeFilter && row.docType !== typeFilter) return false;
      if (!VIEW_STATUSES[statusView].includes(row.status.key)) return false;
      if (!term) return true;
      return [row.vehicleNo, getDocumentName(row), row.documentNumber, row.notes]
        .some((value) => String(value || '').toLowerCase().includes(term));
    });
  }, [rows, search, statusView, typeFilter, vehicleFilter]);

  const scoped = vehicleFilter ? rows.filter((row) => String(row.vehicleId) === vehicleFilter) : rows;
  const expiredCount = scoped.filter((row) => row.status.key === 'expired').length;
  const soonCount = scoped.filter((row) => row.status.key === 'soon').length;
  const validCount = scoped.filter((row) => VIEW_STATUSES.active.includes(row.status.key)).length;
  const viewCounts = { active: validCount, soon: soonCount, expired: expiredCount };
  const viewOptions = STATUS_VIEWS.map((view) => ({
    key: view.key,
    label: `${view.label} (${viewCounts[view.key]})`,
    shortLabel: view.shortLabel ? `${view.shortLabel} (${viewCounts[view.key]})` : undefined
  }));
  const vehiclesCovered = new Set(scoped.map((row) => String(row.vehicleId))).size;
  const filteredVehicle = vehicles.find((vehicle) => vehicle._id === vehicleFilter);

  const stats = [
    { label: 'Documents', value: scoped.length, icon: FolderOpen, tone: 'indigo', hint: vehicleFilter ? 'For this vehicle' : `${vehiclesCovered} of ${vehicles.length} vehicles` },
    { label: 'Expired', value: expiredCount, icon: CalendarX, tone: 'rose', hint: 'Renew these now' },
    { label: 'Expiring Soon', value: soonCount, icon: AlertTriangle, tone: 'amber', hint: `Within ${EXPIRY_SOON_DAYS} days` },
    { label: 'Active', value: validCount, icon: FileCheck, tone: 'emerald', hint: 'Including no-expiry papers' }
  ];

  const setVehicleFilter = (value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set('vehicle', value); else next.delete('vehicle');
    setSearchParams(next, { replace: true });
  };

  const handleDelete = async (doc) => {
    if (!window.confirm(`Delete ${getDocumentName(doc)} of ${doc.vehicleNo}?`)) return;
    try {
      await apiClient.delete(`/vehicle-documents/${doc._id}`);
      toast.success('Document deleted', { autoClose: 1200 });
      load();
    } catch (deleteError) {
      toast.error(deleteError?.message || 'Error deleting document', { autoClose: 1200 });
    }
  };

  // A renewal is a new document for the same paper, starting the day after the old one ends
  const renewPreset = (doc) => ({
    vehicleId: String(doc.vehicleId),
    docType: doc.docType,
    title: doc.title,
    validFrom: dayAfter(doc.validTo)
  });

  const closePopup = (changed = false) => {
    setPopup(null);
    if (changed) load();
  };

  const renderFiles = (doc) => (doc.files?.length ? (
    <div className="flex flex-wrap items-center gap-1" onClick={(event) => event.stopPropagation()}>
      {doc.files.map((file, index) => (
        <a
          key={file.url}
          href={file.url}
          target="_blank"
          rel="noreferrer"
          title={file.name || `File ${index + 1}`}
          className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600 hover:bg-primary-50 hover:text-primary-700"
        >
          <Paperclip size={12} /> {doc.files.length > 1 ? index + 1 : 'View'}
        </a>
      ))}
    </div>
  ) : <span className="text-xs text-slate-400">No file</span>);

  const renderActions = (doc) => (
    <div className="flex items-center justify-end" onClick={(event) => event.stopPropagation()}>
      {canAdd && (doc.status.key === 'expired' || doc.status.key === 'soon') && (
        <button type="button" title="Renew" aria-label="Renew" className="icon-btn p-1.5 hover:bg-emerald-50 hover:text-emerald-600" onClick={() => openAdd(renewPreset(doc))}>
          <RotateCcw size={16} />
        </button>
      )}
      {canEditEntry(user, doc) && (
        <button type="button" title="Edit" aria-label="Edit" className="icon-btn p-1.5 hover:bg-blue-50 hover:text-blue-600" onClick={() => setPopup({ document: doc })}>
          <Pencil size={16} />
        </button>
      )}
      {canDeleteEntries(user) && (
        <button type="button" title="Delete" aria-label="Delete" className="icon-btn p-1.5 hover:bg-rose-50 hover:text-rose-600" onClick={() => handleDelete(doc)}>
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );

  return (
    <div className="page-fade-in space-y-3.5 px-3 pb-6 pt-3.5 md:space-y-4 lg:px-6 lg:pt-4">
      <div className="page-header gap-2.5">
        <div className="min-w-0">
          <h1 className="page-title">Documents</h1>
          <p className="page-subtitle">
            {filteredVehicle
              ? <>Papers of <Link to={`/vehicle/${filteredVehicle._id}`} className="font-mono font-semibold text-primary-700 hover:underline">{filteredVehicle.vehicleNo}</Link></>
              : 'RC, tax, fitness, permit and insurance of your vehicles'}
          </p>
        </div>
        {canAdd && (
          <button type="button" className="btn-primary" onClick={() => openAdd(vehicleFilter ? { vehicleId: vehicleFilter } : {})} title="Add document (Alt + N)">
            <Plus size={18} /> Add Document
          </button>
        )}
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700">{error}</div>}

      <section className="grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-4">
        {stats.map((stat) => <StatCard key={stat.label} compact {...stat} />)}
      </section>

      {needsAttention.length > 0 && (
        <section className="panel overflow-hidden border-amber-200">
          <div className="panel-header flex items-center gap-2 bg-amber-50 py-2.5">
            <AlertTriangle size={16} className="text-amber-600" />
            <h2 className="text-sm font-bold text-slate-800">
              Expiry Soon <span className="ml-1 font-medium text-slate-500">{needsAttention.length}</span>
            </h2>
            <span className="hidden text-xs text-slate-500 sm:inline">Expired, or ending in the next {EXPIRY_SOON_DAYS} days</span>
          </div>
          <ul className="divide-y divide-slate-100">
            {needsAttention.map((doc) => (
              <li key={doc._id} className="flex items-center justify-between gap-3 px-4 py-2.5 md:px-5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${doc.status.key === 'expired' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                    {doc.status.key === 'expired' ? <CalendarX size={18} /> : <AlertTriangle size={18} />}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      <span className="font-mono">{doc.vehicleNo}</span> · {getDocumentName(doc)}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      Valid to {formatDay(doc.validTo)}
                      <span className={`ml-2 font-semibold ${doc.status.key === 'expired' ? 'text-rose-600' : 'text-amber-700'}`}>{describeDaysLeft(doc.status.daysLeft)}</span>
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="hidden md:block">{renderFiles(doc)}</span>
                  {canAdd && (
                    <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={() => openAdd(renewPreset(doc))}>
                      <RotateCcw size={14} /> Renew
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="panel">
        <div className="panel-header flex flex-wrap items-center justify-between gap-2.5 py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <Segmented options={LAYOUTS} value={layout} onChange={setLayout} />
            {layout === 'list' && <Segmented options={viewOptions} value={statusView} onChange={setStatusView} />}
          </div>
          <div className="flex min-w-0 flex-1 basis-72 flex-wrap items-center justify-end gap-2">
            <select className="input w-auto min-w-0 flex-1 md:max-w-40" value={vehicleFilter} onChange={(event) => setVehicleFilter(event.target.value)} aria-label="Vehicle">
              <option value="">All vehicles</option>
              {vehicles.map((vehicle) => <option key={vehicle._id} value={vehicle._id}>{vehicle.vehicleNo}</option>)}
            </select>
            {layout === 'list' && (
              <select className="input w-auto min-w-0 flex-1 md:max-w-40" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} aria-label="Document type">
                <option value="">All documents</option>
                {DOCUMENT_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
              </select>
            )}
            <div className="relative min-w-0 flex-1 basis-40 md:max-w-56">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="search" className="input pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={layout === 'vehicles' ? 'Search vehicle' : 'Search vehicle, number'} />
            </div>
            <button type="button" className="icon-btn shrink-0" title="Refresh" aria-label="Refresh" onClick={load}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {loading && documents.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="h-9 w-9 animate-spin rounded-full border-4 border-primary-600 border-r-transparent" />
            <p className="text-sm text-slate-400">Loading documents…</p>
          </div>
        ) : layout === 'vehicles' ? (
          <div className={`transition-opacity ${loading ? 'pointer-events-none opacity-50' : ''}`}>
            <VehiclePapersView
              documents={documents}
              vehicles={vehicles}
              vehicleFilter={vehicleFilter}
              search={search}
              user={user}
              canAdd={canAdd}
              onAdd={openAdd}
              onEdit={(doc) => setPopup({ document: doc })}
              onShowList={(vehicleId) => {
                setVehicleFilter(vehicleId);
                setLayout('list');
              }}
            />
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Inbox size={20} />
            </span>
            <p className="text-sm font-semibold text-slate-800">No documents found</p>
            <p className="text-xs text-slate-500">
              {documents.length > 0 ? `No ${STATUS_VIEWS.find((view) => view.key === statusView)?.label.toLowerCase()} documents${search || typeFilter || vehicleFilter ? ' for this filter or search' : ''}.` : vehicles.length === 0 ? 'Add a vehicle first, then save its papers here.' : 'Save the first one with "Add Document".'}
            </p>
            {canAdd && documents.length === 0 && vehicles.length > 0 && (
              <button type="button" className="btn-primary mt-2" onClick={() => openAdd(vehicleFilter ? { vehicleId: vehicleFilter } : {})}>
                <Plus size={16} /> Add Document
              </button>
            )}
          </div>
        ) : (
          <div className={`transition-opacity ${loading ? 'pointer-events-none opacity-50' : ''}`}>
            {/* Phone: one card line per document */}
            <ul className="divide-y divide-slate-100 md:hidden">
              {filteredRows.map((doc) => (
                <li key={doc._id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-slate-800">{getDocumentName(doc)}</p>
                      <span className={`${doc.status.className} shrink-0`}>{doc.status.label}</span>
                      {doc.source === 'rto' && <span className="badge-blue shrink-0 text-[10px]" title="Filled from the RTO record">RTO</span>}
                    </div>
                    <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
                      <Truck size={12} className="shrink-0" /> <span className="font-mono">{doc.vehicleNo}</span>
                      {doc.documentNumber && <span className="truncate">· {doc.documentNumber}</span>}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {formatDay(doc.validFrom)} → {doc.validTo ? formatDay(doc.validTo) : 'No expiry'}
                      {(doc.status.key === 'soon' || doc.status.key === 'expired') && (
                        <span className={`ml-1.5 font-semibold ${doc.status.key === 'expired' ? 'text-rose-600' : 'text-amber-700'}`}>{describeDaysLeft(doc.status.daysLeft)}</span>
                      )}
                    </p>
                    <div className="mt-1">{renderFiles(doc)}</div>
                  </div>
                  {renderActions(doc)}
                </li>
              ))}
            </ul>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[880px] text-left">
                <thead>
                  <tr>
                    <th className={TH}>Vehicle</th>
                    <th className={TH}>Document</th>
                    <th className={TH}>Number</th>
                    <th className={TH}>Valid From</th>
                    <th className={TH}>Valid To</th>
                    <th className={TH}>Status</th>
                    <th className={TH}>File</th>
                    <th className={TH} />
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((doc) => (
                    <tr key={doc._id} className="tbl-row">
                      <td className={`${TD} whitespace-nowrap font-mono font-semibold text-slate-800`}>
                        {doc.vehicleMissing ? doc.vehicleNo : <Link to={`/vehicle/${doc.vehicleId}`} className="hover:text-primary-700 hover:underline">{doc.vehicleNo}</Link>}
                      </td>
                      <td className={TD}>
                        <p className="flex items-center gap-1.5 font-medium text-slate-700"><FileText size={14} className="text-slate-400" /> {getDocumentName(doc)}{doc.source === 'rto' && <span className="badge-blue text-[10px]" title="Filled from the RTO record">RTO</span>}</p>
                        {doc.notes && <p className="max-w-56 truncate text-xs text-slate-500" title={doc.notes}>{doc.notes}</p>}
                      </td>
                      <td className={`${TD} text-sm text-slate-600`}>{doc.documentNumber || '—'}</td>
                      <td className={`${TD} whitespace-nowrap text-sm text-slate-600`}>{formatDay(doc.validFrom)}</td>
                      <td className={`${TD} whitespace-nowrap text-sm text-slate-600`}>
                        {doc.validTo ? formatDay(doc.validTo) : 'No expiry'}
                        {(doc.status.key === 'soon' || doc.status.key === 'expired') && (
                          <p className={`text-[11px] font-semibold ${doc.status.key === 'expired' ? 'text-rose-600' : 'text-amber-700'}`}>{describeDaysLeft(doc.status.daysLeft)}</p>
                        )}
                      </td>
                      <td className={TD}><span className={doc.status.className}>{doc.status.label}</span></td>
                      <td className={TD}>{renderFiles(doc)}</td>
                      <td className={`${TD} py-1!`}>{renderActions(doc)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {popup && (
        <AddDocumentPopup
          document={popup.document || null}
          preset={popup.preset || null}
          vehicles={vehicles}
          onClose={() => closePopup()}
          onSaved={() => closePopup(true)}
        />
      )}
    </div>
  );
}
