import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ban, CalendarClock, ChevronRight, Eye, Inbox, MoreVertical, Pencil, Plus, RefreshCw, RotateCcw, Search, ShieldCheck, SlidersHorizontal, Trash2, Truck, Users, Wallet } from 'lucide-react';
import { toast } from 'react-toastify';
import apiClient from '../utils/api';
import { canDeleteEntries, canEditEntry } from '../utils/staffAccess';
import { useAuth } from '../context/AuthContext';
import AddVehiclePopup from './Vehicle/component/AddVehiclePopup';
import MonthlyHireDetail from './MonthlyHire/component/MonthlyHireDetail';
import AdjustmentPopup from './MonthlyHire/component/AdjustmentPopup';
import CancelHirePopup from './MonthlyHire/component/CancelHirePopup';
import MonthlyHireForm from './MonthlyHire/component/MonthlyHireForm';
import StatCard from '../components/StatCard';
import { getBasisLabel, getVehicleCategoryLabel, getVehicleHireRates, getVehicleOwnerIds } from '../utils/transport';
import { formatHireDate, formatRupees, getHireStatus, toDayInput } from '../utils/monthlyHire';
import { toLocalDateInput } from '../components/CustomRangePopup';
import { VALIDITY_TYPES, fetchRtoDetails, getCurrentPapers, isRtoPending, needsRtoFetch } from '../utils/rtoDetails';

const TOAST_OPTIONS = { autoClose: 1200 };

const TH = 'tbl-head px-3 py-2 first:pl-5 last:pr-5';
const TD = 'tbl-cell px-3 py-2 first:pl-5 last:pr-5';

// "12 Mar 27": short enough for a chip
const formatChipDay = (key) => {
  if (!key) return '';
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
};

const getTypeBadgeClass = (type) => (type === 'boulder' ? 'badge-blue' : 'badge-orange');

// Truck, Hyva, JCB... or, for a vehicle saved before that was asked, what it is used for
const getTypeLabel = (vehicle) => {
  const category = getVehicleCategoryLabel(vehicle?.category);
  if (category) return category;
  return vehicle?.vehicleType === 'boulder' ? 'Boulder Load' : 'Sales';
};

export default function Vehicle() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  // A vehicle on monthly rent: adjust a month, cancel the rent, or open the hire
  const [hireAction, setHireAction] = useState(null);
  const [menu, setMenu] = useState(null);
  // Hire money for the summary cards: this month's hire entries and what is owed to vehicle owners today
  const [hireSummary, setHireSummary] = useState({ entries: [], balances: [] });
  // Vehicle papers (insurance, PUC, fitness, tax, permit), for the validity shown on my own vehicles
  const [documents, setDocuments] = useState([]);
  // Ids of vehicles whose RTO details are being fetched
  const [rtoBusy, setRtoBusy] = useState(() => new Set());

  useEffect(() => {
    fetchVehicles();
    fetchParties();
  }, [search]);

  // A new own vehicle's RTO details come in on the server in the background: look again every few seconds until
  // they are in, then say how it went
  const pendingRtoIds = useRef(new Set());
  useEffect(() => {
    const pending = vehicles.filter(isRtoPending);
    vehicles.forEach((vehicle) => {
      if (!pendingRtoIds.current.has(vehicle._id) || isRtoPending(vehicle)) return;
      pendingRtoIds.current.delete(vehicle._id);
      if (vehicle.rcFetchStatus === 'failed') {
        toast.error(`${vehicle.vehicleNo}: ${vehicle.rcFetchError || 'Could not fetch RTO details'}`, { autoClose: 5000 });
      } else if (vehicle.rcFetchedAt) {
        toast.success(`${vehicle.vehicleNo}: RTO details saved · insurance, PUC, fitness and tax added to Documents`, { autoClose: 4000 });
      }
    });
    pending.forEach((vehicle) => pendingRtoIds.current.add(vehicle._id));
    if (pending.length === 0) return undefined;
    const timer = setTimeout(() => fetchVehicles({ quiet: true }), 4000);
    return () => clearTimeout(timer);
  }, [vehicles]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const key = event.key?.toLowerCase();
      if (event.defaultPrevented || !event.altKey || event.ctrlKey || event.metaKey) return;
      if (key !== 'n') return;

      event.preventDefault();
      handleOpenForm();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const isTypingTarget = (target) => {
      const tagName = target?.tagName?.toLowerCase();
      return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target?.isContentEditable;
    };

    const handleKeyDown = (event) => {
      if (event.key !== 'Escape' || event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      if (isTypingTarget(event.target)) {
        return;
      }
      // A popup open on the page closes itself first; an open menu just closes
      if (document.querySelector('.fixed.inset-0.z-50')) {
        return;
      }
      if (document.querySelector('[data-vehicle-menu]')) {
        event.preventDefault();
        setMenu(null);
        return;
      }

      event.preventDefault();
      navigate('/');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  // quiet: a background re-check while a new vehicle's RTO details come in, without dimming the list
  const fetchVehicles = async ({ quiet = false } = {}) => {
    try {
      if (!quiet) setLoading(true);
      const [response, entryResponse, outstandingResponse, documentResponse] = await Promise.all([
        apiClient.get('/vehicles', { params: { search } }),
        apiClient.get('/transport'),
        // Owner-only balances; staff see the vehicles without them
        apiClient.get('/reports/outstanding').catch(() => ({})),
        apiClient.get('/vehicle-documents').catch(() => [])
      ]);
      setVehicles(Array.isArray(response) ? response : []);
      setDocuments(Array.isArray(documentResponse) ? documentResponse : []);
      setHireSummary({
        entries: Array.isArray(entryResponse) ? entryResponse : [],
        balances: Array.isArray(outstandingResponse?.partyOutstanding) ? outstandingResponse.partyOutstanding : []
      });
      setError('');
    } catch (err) {
      setError(err.message || 'Error fetching vehicles');
    } finally {
      setLoading(false);
    }
  };

  const fetchParties = async () => {
    try {
      const response = await apiClient.get('/parties');
      setParties(Array.isArray(response) ? response : []);
    } catch (err) {
      console.error('Error fetching parties:', err);
    }
  };

  const handleOpenForm = (vehicle = null) => {
    setEditingVehicle(vehicle);
    setError('');
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingVehicle(null);
  };

  const handleDelete = async (vehicleId) => {
    if (!window.confirm('Are you sure you want to delete this vehicle?')) {
      return;
    }

    try {
      await apiClient.delete(`/vehicles/${vehicleId}`);
      toast.success('Vehicle deleted successfully', TOAST_OPTIONS);
      fetchVehicles();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error deleting vehicle', TOAST_OPTIONS);
    }
  };

  // One RTO Sarthi call per vehicle, one after another so a used-up limit stops the rest; the list reloads after
  const runRtoFetch = async (list) => {
    setRtoBusy((prev) => new Set([...prev, ...list.map((vehicle) => vehicle._id)]));
    let fetched = 0;
    for (const vehicle of list) {
      const result = await fetchRtoDetails(vehicle);
      if (!result) break;
      fetched += 1;
    }
    setRtoBusy((prev) => {
      const next = new Set(prev);
      list.forEach((vehicle) => next.delete(vehicle._id));
      return next;
    });
    if (fetched > 0) fetchVehicles();
  };

  const refreshFromRto = (vehicle) => {
    if (!needsRtoFetch(vehicle) && !window.confirm(`Fetch ${vehicle.vehicleNo} again from the RTO? This uses one RTO Sarthi call.`)) return;
    runRtoFetch([vehicle]);
  };

  const getPartyName = (partyId) => {
    const party = parties.find(p => p._id === partyId);
    return party?.partyName || party?.name || '-';
  };

  const hiredCount = vehicles.filter((v) => v.ownership === 'hired').length;
  const onMonthlyRent = vehicles.filter((v) => v.monthlyHire);
  const monthStart = toLocalDateInput(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const hireCostThisMonth = hireSummary.entries
    .filter((entry) => entry.direction === 'payable' && toDayInput(entry.entryDate) >= monthStart)
    .reduce((total, entry) => total + Number(entry.amount || 0), 0);
  const ownerIds = getVehicleOwnerIds(vehicles);
  const toPayOwners = hireSummary.balances
    .filter((row) => ownerIds.has(String(row.partyId)) && Number(row.netBalance || 0) < 0)
    .reduce((total, row) => total + Math.abs(Number(row.netBalance || 0)), 0);
  const stats = [
    { label: 'Total Vehicles', value: vehicles.length, icon: Truck, tone: 'indigo', hint: `${hiredCount} hired · ${vehicles.length - hiredCount} mine` },
    {
      label: 'On Monthly Rent',
      value: onMonthlyRent.length,
      icon: CalendarClock,
      tone: 'blue',
      hint: `${formatRupees(onMonthlyRent.reduce((total, v) => total + Number(v.monthlyHire.monthlyRate || 0), 0))} a month`
    },
    { label: 'Hire Cost This Month', value: formatRupees(hireCostThisMonth), icon: Wallet, tone: 'amber', hint: 'Trips, extra charges and rent so far' },
    { label: 'To Pay Owners', value: formatRupees(toPayOwners), icon: Users, tone: 'rose', hint: 'What vehicle owners are owed today' },
  ];

  const papersByVehicle = useMemo(() => getCurrentPapers(documents), [documents]);
  // My own vehicles not looked up at the RTO yet (added before this, or the number changed)
  const unfetchedOwn = vehicles.filter((vehicle) => needsRtoFetch(vehicle) && canEditEntry(user, vehicle));

  const fetchAllFromRto = () => {
    const count = unfetchedOwn.length;
    if (!count) return;
    const plural = count === 1 ? '' : 's';
    if (!window.confirm(`Fetch RC, insurance, PUC, fitness and tax details of ${count} of your vehicle${plural} from the RTO? This uses ${count} RTO Sarthi call${plural}.`)) return;
    runRtoFetch(unfetchedOwn);
  };

  // My own vehicle's papers as small chips: green valid, orange ending within 30 days, red expired
  // An older vehicle (or one whose lookup failed) is fetched only with this button, never on its own
  const renderFetchButton = (vehicle, label) => canEditEntry(user, vehicle) && (
    <button
      type="button"
      className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-semibold text-primary-700 ring-1 ring-inset ring-primary-200 transition hover:bg-primary-100"
      title="Fetch RC, insurance, PUC, fitness and tax from the RTO (uses one RTO Sarthi call)"
      onClick={(event) => {
        event.stopPropagation();
        runRtoFetch([vehicle]);
      }}
    >
      <ShieldCheck size={12} /> {label}
    </button>
  );

  const renderPapers = (vehicle) => {
    if (vehicle.ownership !== 'own') return <span className="text-slate-400">—</span>;
    if (rtoBusy.has(vehicle._id) || isRtoPending(vehicle)) {
      return <span className="text-xs font-medium text-primary-600 animate-pulse">Fetching from RTO…</span>;
    }
    if (vehicle.rcFetchStatus === 'failed' && needsRtoFetch(vehicle)) {
      return (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-rose-600" title={vehicle.rcFetchError}>{vehicle.rcFetchError || 'RTO fetch failed'}</span>
          {renderFetchButton(vehicle, 'Try again')}
        </div>
      );
    }
    const papers = papersByVehicle.get(String(vehicle._id)) || {};
    const shown = VALIDITY_TYPES.filter((type) => papers[type.docType]);
    if (shown.length === 0) {
      return needsRtoFetch(vehicle)
        ? renderFetchButton(vehicle, 'Fetch RTO') || <span className="text-xs text-slate-400">RTO details not fetched</span>
        : <span className="text-xs text-slate-400">No papers</span>;
    }
    return (
      <div className="flex flex-wrap gap-1">
        {shown.map((type) => {
          const { doc, status } = papers[type.docType];
          const day = toDayInput(doc.validTo);
          return (
            <span
              key={type.docType}
              className={`${status.className} whitespace-nowrap text-[10px]`}
              title={`${type.label}: ${status.label}${day ? ` · up to ${formatChipDay(day)}` : ''}`}
            >
              {type.shortLabel} {day ? formatChipDay(day) : doc.title || 'Lifetime'}
            </span>
          );
        })}
      </div>
    );
  };

  const getOwnerName = (vehicle) => (vehicle.ownership === 'own' ? 'My Vehicle' : getPartyName(vehicle.partyId));

  const getHireNote = (vehicle) => {
    if (vehicle.ownership !== 'hired') return '';
    if (!vehicle.hireBasis) return 'Hired · no rate set';
    const hire = getVehicleHireRates(vehicle);
    if (hire.hireBasis === 'per_month') {
      return `Hired · Monthly ₹${hire.hireRate.toLocaleString('en-IN')}`;
    }
    if (hire.hireBasis === 'per_trip') {
      const count = hire.tripRates.length;
      return `Hired · Per Trip · ${count} location${count === 1 ? '' : 's'}`;
    }
    const rate = hire.hireRate > 0 ? ` @ ₹${hire.hireRate.toLocaleString('en-IN')}` : '';
    return `Hired · ${getBasisLabel(hire.hireBasis)}${rate}`;
  };

  // A monthly vehicle's hire period and status: the running hire, or the last one when the rent has stopped
  const getHirePeriod = (vehicle) => {
    if (vehicle.ownership !== 'hired' || vehicle.hireBasis !== 'per_month') return null;
    const shownHire = vehicle.monthlyHire || vehicle.lastHire;
    if (!shownHire) return { range: '—', status: { label: 'Not started', className: 'badge-orange' } };
    const status = getHireStatus(shownHire);
    return {
      range: `${formatHireDate(shownHire.startDate)} → ${status.stop ? formatHireDate(status.stop) : 'until cancelled'}`,
      status: vehicle.monthlyHire ? status : { ...status, label: status.isCancelled ? 'Cancelled' : 'Ended' }
    };
  };

  // The running hire of a vehicle on monthly rent, as the hire popups expect it
  const getVehicleHire = (vehicle) => (vehicle.monthlyHire
    ? { ...vehicle.monthlyHire, partyName: getPartyName(vehicle.partyId), vehicleNo: vehicle.vehicleNo, direction: 'payable' }
    : null);

  // A monthly vehicle whose rent was cancelled or ended can be hired again
  const isRentStopped = (vehicle) => vehicle.ownership === 'hired' && vehicle.hireBasis === 'per_month' && !vehicle.monthlyHire;

  const getHireAgainPreset = (vehicle) => ({
    direction: 'payable',
    partyId: typeof vehicle.partyId === 'object' ? vehicle.partyId?._id : vehicle.partyId,
    vehicleNo: vehicle.vehicleNo,
    monthlyRate: vehicle.hireRate
  });

  const closeHireAction = (changed = false) => {
    setHireAction(null);
    if (changed) fetchVehicles();
  };

  // Monthly rent actions for a vehicle, shown in its three-dot menu
  const getMenuItems = (vehicle) => [
    ...(vehicle.monthlyHire ? [
      { label: 'Adjust a month', Icon: SlidersHorizontal, onClick: () => setHireAction({ type: 'adjust', hire: getVehicleHire(vehicle) }) },
      { label: 'Cancel monthly rent', Icon: Ban, className: 'text-amber-700', onClick: () => setHireAction({ type: 'cancel', hire: getVehicleHire(vehicle) }) },
      { label: 'Open monthly hire', Icon: ChevronRight, onClick: () => setHireAction({ type: 'open', hire: getVehicleHire(vehicle) }) }
    ] : []),
    ...(isRentStopped(vehicle) ? [
      { label: 'Hire again', Icon: RotateCcw, className: 'text-emerald-700', onClick: () => setHireAction({ type: 'again', vehicle }) }
    ] : [])
  ];

  // The menu sits on the page, not inside the scrolling table, so it is never cut off
  const openMenu = (event, vehicle) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setMenu({ vehicle, top: rect.bottom + 4, right: window.innerWidth - rect.right });
  };

  const renderActions = (vehicle) => (
    <div className="flex items-center justify-end" onClick={(event) => event.stopPropagation()}>
      <button type="button" title="View ledger" aria-label="View ledger" className="icon-btn p-1.5 hover:bg-emerald-50 hover:text-emerald-600" onClick={() => navigate(`/vehicle/${vehicle._id}`)}>
        <Eye size={16} />
      </button>
      {/* Already fetched: look it up again (first-time fetches use the Fetch RTO button in the Papers column) */}
      {vehicle.ownership === 'own' && vehicle.rcFetchedAt && !needsRtoFetch(vehicle) && !isRtoPending(vehicle) && canEditEntry(user, vehicle) && (
        <button
          type="button"
          title="Refresh from RTO (uses one RTO Sarthi call)"
          aria-label="Refresh from RTO"
          disabled={rtoBusy.has(vehicle._id)}
          className="icon-btn p-1.5 hover:bg-primary-50 hover:text-primary-600"
          onClick={() => refreshFromRto(vehicle)}
        >
          <ShieldCheck size={16} className={rtoBusy.has(vehicle._id) ? 'animate-pulse' : ''} />
        </button>
      )}
      {canEditEntry(user, vehicle) && (
        <button type="button" title="Edit" aria-label="Edit" className="icon-btn p-1.5 hover:bg-blue-50 hover:text-blue-600" onClick={() => handleOpenForm(vehicle)}>
          <Pencil size={16} />
        </button>
      )}
      {canDeleteEntries(user) && (
        <button type="button" title="Delete" aria-label="Delete" className="icon-btn p-1.5 hover:bg-rose-50 hover:text-rose-600" onClick={() => handleDelete(vehicle._id)}>
          <Trash2 size={16} />
        </button>
      )}
      {getMenuItems(vehicle).length > 0 && (
        <button type="button" title="Monthly rent" aria-label="Monthly rent options" aria-haspopup="menu" className="icon-btn p-1.5 hover:bg-slate-100" onClick={(event) => openMenu(event, vehicle)}>
          <MoreVertical size={16} />
        </button>
      )}
    </div>
  );

  return (
    <div className="page-fade-in space-y-3.5 px-3 pb-6 pt-3.5 md:space-y-4 lg:px-6 lg:pt-4">
      <div className="page-header gap-2.5">
        <div className="min-w-0">
          <h1 className="page-title">Vehicles</h1>
          <p className="page-subtitle">Trucks used for sales and boulder loads</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {unfetchedOwn.length > 0 && (
            <button type="button" className="btn-secondary" onClick={fetchAllFromRto} disabled={rtoBusy.size > 0} title="Fetch RC, insurance, PUC, fitness and tax from the RTO for my vehicles not fetched yet">
              <ShieldCheck size={18} /> Fetch RTO Details ({unfetchedOwn.length})
            </button>
          )}
          <button type="button" className="btn-primary" onClick={() => handleOpenForm()} title="Add vehicle (Alt + N)">
            <Plus size={18} /> Add Vehicle
          </button>
        </div>
      </div>

      {error && !showForm && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700">{error}</div>
      )}

      <section className="grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-4">
        {stats.map((stat) => <StatCard key={stat.label} compact {...stat} />)}
      </section>

      <section className="panel">
        <div className="panel-header flex flex-wrap items-center justify-between gap-2.5 py-2.5">
          <h2 className="text-sm font-bold text-slate-800">
            All Vehicles <span className="ml-1 font-medium text-slate-400">{vehicles.length}</span>
          </h2>
          <div className="flex min-w-0 flex-1 basis-56 items-center justify-end gap-2">
            <div className="relative min-w-0 flex-1 md:max-w-64">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                className="input pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search vehicle no. or owner"
              />
            </div>
            <button type="button" className="icon-btn shrink-0" title="Refresh" aria-label="Refresh" onClick={fetchVehicles}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {loading && vehicles.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="h-9 w-9 animate-spin rounded-full border-4 border-primary-600 border-r-transparent" />
            <p className="text-sm text-slate-400">Loading vehicles…</p>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Inbox size={20} />
            </span>
            <p className="text-sm font-semibold text-slate-800">No vehicles found</p>
            <p className="text-xs text-slate-500">
              {search ? 'Try a different search.' : 'Add the first vehicle with "Add Vehicle".'}
            </p>
          </div>
        ) : (
          <div className={`transition-opacity ${loading ? 'pointer-events-none opacity-50' : ''}`}>
            {/* Phone: two short lines per vehicle */}
            <ul className="divide-y divide-slate-100 md:hidden">
              {vehicles.map((vehicle) => (
                <li key={vehicle._id} className="flex cursor-pointer items-center justify-between gap-3 px-4 py-2.5 active:bg-slate-50" onClick={() => navigate(`/vehicle/${vehicle._id}`)}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-mono text-sm font-semibold text-slate-800">{vehicle.vehicleNo}</p>
                      <span className={`${getTypeBadgeClass(vehicle.vehicleType)} shrink-0`}>{getTypeLabel(vehicle)}</span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {getOwnerName(vehicle)}
                    </p>
                    {getHireNote(vehicle) && <p className="truncate text-[11px] font-medium text-amber-700">{getHireNote(vehicle)}</p>}
                    {vehicle.ownership === 'own' && <div className="mt-1">{renderPapers(vehicle)}</div>}
                    {getHirePeriod(vehicle) && (
                      <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                        <span>{getHirePeriod(vehicle).range}</span>
                        <span className={getHirePeriod(vehicle).status.className}>{getHirePeriod(vehicle).status.label}</span>
                      </p>
                    )}
                  </div>
                  {renderActions(vehicle)}
                </li>
              ))}
            </ul>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[960px] text-left">
                <thead>
                  <tr>
                    <th className={TH}>Vehicle No.</th>
                    <th className={TH}>Owner / Party</th>
                    <th className={TH}>Papers (RTO)</th>
                    <th className={TH}>Hire Period</th>
                    <th className={TH}>Status</th>
                    <th className={TH}>Type</th>
                    <th className={TH} />
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map((vehicle) => (
                    <tr key={vehicle._id} className="tbl-row cursor-pointer" title="Open the vehicle's ledger" onClick={() => navigate(`/vehicle/${vehicle._id}`)}>
                      <td className={`${TD} whitespace-nowrap font-mono font-semibold text-slate-800`}>{vehicle.vehicleNo}</td>
                      <td className={TD}>
                        <p className="font-medium text-slate-700">{getOwnerName(vehicle)}</p>
                        {getHireNote(vehicle) && <p className="text-xs font-medium text-amber-700">{getHireNote(vehicle)}</p>}
                      </td>
                      <td className={`${TD} max-w-[18rem]`}>{renderPapers(vehicle)}</td>
                      <td className={`${TD} whitespace-nowrap text-sm text-slate-600`}>{getHirePeriod(vehicle)?.range || '—'}</td>
                      <td className={TD}>
                        {getHirePeriod(vehicle)
                          ? <span className={getHirePeriod(vehicle).status.className}>{getHirePeriod(vehicle).status.label}</span>
                          : <span className="text-slate-400">—</span>}
                      </td>
                      <td className={TD}>
                        <span className={getTypeBadgeClass(vehicle.vehicleType)}>{getTypeLabel(vehicle)}</span>
                      </td>
                      <td className={`${TD} py-1!`}>{renderActions(vehicle)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {showForm && (
        <AddVehiclePopup
          vehicle={editingVehicle}
          onClose={handleCloseForm}
          onSave={fetchVehicles}
        />
      )}
      {menu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenu(null)} onWheel={() => setMenu(null)} />
          <div
            data-vehicle-menu
            role="menu"
            className="fixed z-40 w-52 overflow-hidden rounded-lg bg-white py-1 shadow-xl ring-1 ring-slate-200"
            style={{ top: menu.top, right: menu.right }}
          >
            {getMenuItems(menu.vehicle).map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium hover:bg-slate-50 ${item.className || 'text-slate-700'}`}
                onClick={() => {
                  setMenu(null);
                  item.onClick();
                }}
              >
                <item.Icon size={16} /> {item.label}
              </button>
            ))}
          </div>
        </>
      )}
      {hireAction?.type === 'adjust' && (
        <AdjustmentPopup hire={hireAction.hire} onClose={() => closeHireAction()} onDone={() => closeHireAction(true)} />
      )}
      {hireAction?.type === 'cancel' && (
        <CancelHirePopup hire={hireAction.hire} onClose={() => closeHireAction()} onDone={() => closeHireAction(true)} />
      )}
      {hireAction?.type === 'again' && (
        <MonthlyHireForm preset={getHireAgainPreset(hireAction.vehicle)} onClose={() => closeHireAction()} onSaved={() => closeHireAction(true)} />
      )}
      {hireAction?.type === 'open' && (
        <MonthlyHireDetail hireId={hireAction.hire._id} canEdit onClose={() => closeHireAction(true)} onChanged={fetchVehicles} />
      )}
    </div>
  );
}
