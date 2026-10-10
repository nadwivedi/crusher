import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Inbox, Pencil, Plus, RefreshCw, Scale, Search, Trash2, Truck, Users } from 'lucide-react';
import { toast } from 'react-toastify';
import apiClient from '../utils/api';
import AddVehiclePopup from './Vehicle/component/AddVehiclePopup';
import StatCard from '../components/StatCard';
import { getBasisLabel, getVehicleCategoryLabel, getVehicleHireRates } from '../utils/transport';

const TOAST_OPTIONS = { autoClose: 1200 };

const TH = 'tbl-head px-3 py-2 first:pl-5 last:pr-5';
const TD = 'tbl-cell px-3 py-2 first:pl-5 last:pr-5';

const getTypeBadgeClass = (type) => (type === 'boulder' ? 'badge-blue' : 'badge-orange');

// Truck, Hyva, JCB... or, for a vehicle saved before that was asked, what it is used for
const getTypeLabel = (vehicle) => {
  const category = getVehicleCategoryLabel(vehicle?.category);
  if (category) return category;
  return vehicle?.vehicleType === 'boulder' ? 'Boulder Load' : 'Sales';
};

const formatWeight = (value) => (Number(value || 0) > 0 ? `${Number(value).toLocaleString('en-IN')} kg` : '-');
const formatCapacity = (value) => (Number(value || 0) > 0 ? `${Number(value)} m³` : '-');

export default function Vehicle() {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);

  useEffect(() => {
    fetchVehicles();
    fetchParties();
  }, [search]);

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

      event.preventDefault();
      navigate('/');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/vehicles', { params: { search } });
      setVehicles(Array.isArray(response) ? response : []);
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

  const getPartyName = (partyId) => {
    const party = parties.find(p => p._id === partyId);
    return party?.partyName || party?.name || '-';
  };

  const boulderVehicles = vehicles.filter((v) => v.vehicleType === 'boulder').length;
  const salesVehicles = vehicles.filter((v) => v.vehicleType === 'sales').length;
  const stats = [
    { label: 'Total Vehicles', value: vehicles.length, icon: Truck, tone: 'indigo' },
    { label: 'Boulder Load', value: boulderVehicles, icon: Scale, tone: 'blue' },
    { label: 'Sales Vehicles', value: salesVehicles, icon: Users, tone: 'amber' },
  ];

  const getOwnerName = (vehicle) => (vehicle.ownership === 'own' ? 'My Vehicle' : getPartyName(vehicle.partyId));

  const getHireNote = (vehicle) => {
    if (vehicle.ownership !== 'hired') return '';
    const hire = getVehicleHireRates(vehicle, parties);
    if (hire.hireBasis === 'per_trip') {
      const count = hire.tripRates.length;
      return `Hired · Per Trip · ${count} location${count === 1 ? '' : 's'}`;
    }
    const rate = hire.hireRate > 0 ? ` @ ₹${hire.hireRate.toLocaleString('en-IN')}` : '';
    return `Hired · ${getBasisLabel(hire.hireBasis)}${rate}`;
  };

  const renderActions = (vehicle) => (
    <div className="flex items-center justify-end">
      <button type="button" title="Edit" aria-label="Edit" className="icon-btn p-1.5 hover:bg-blue-50 hover:text-blue-600" onClick={() => handleOpenForm(vehicle)}>
        <Pencil size={16} />
      </button>
      <button type="button" title="Delete" aria-label="Delete" className="icon-btn p-1.5 hover:bg-rose-50 hover:text-rose-600" onClick={() => handleDelete(vehicle._id)}>
        <Trash2 size={16} />
      </button>
    </div>
  );

  return (
    <div className="page-fade-in space-y-3.5 px-3 pb-6 pt-3.5 md:space-y-4 lg:px-6 lg:pt-4">
      <div className="page-header gap-2.5">
        <div className="min-w-0">
          <h1 className="page-title">Vehicles</h1>
          <p className="page-subtitle">Trucks used for sales and boulder loads</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => handleOpenForm()} title="Add vehicle (Alt + N)">
          <Plus size={18} /> Add Vehicle
        </button>
      </div>

      {error && !showForm && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700">{error}</div>
      )}

      <section className="grid grid-cols-3 gap-2 md:gap-3">
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
                <li key={vehicle._id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-mono text-sm font-semibold text-slate-800">{vehicle.vehicleNo}</p>
                      <span className={`${getTypeBadgeClass(vehicle.vehicleType)} shrink-0`}>{getTypeLabel(vehicle)}</span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {getOwnerName(vehicle)}
                      {Number(vehicle.unladenWeight || 0) > 0 && ` · ${formatWeight(vehicle.unladenWeight)}`}
                      {Number(vehicle.capacityCubicMeter || 0) > 0 && ` · ${formatCapacity(vehicle.capacityCubicMeter)}`}
                    </p>
                    {getHireNote(vehicle) && <p className="truncate text-[11px] font-medium text-amber-700">{getHireNote(vehicle)}</p>}
                  </div>
                  {renderActions(vehicle)}
                </li>
              ))}
            </ul>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] text-left">
                <thead>
                  <tr>
                    <th className={TH}>Vehicle No.</th>
                    <th className={TH}>Owner / Party</th>
                    <th className={`${TH} text-right`}>Unladen Weight</th>
                    <th className={`${TH} text-right`}>Capacity</th>
                    <th className={TH}>Type</th>
                    <th className={TH} />
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map((vehicle) => (
                    <tr key={vehicle._id} className="tbl-row">
                      <td className={`${TD} whitespace-nowrap font-mono font-semibold text-slate-800`}>{vehicle.vehicleNo}</td>
                      <td className={TD}>
                        <p className="font-medium text-slate-700">{getOwnerName(vehicle)}</p>
                        {getHireNote(vehicle) && <p className="text-xs font-medium text-amber-700">{getHireNote(vehicle)}</p>}
                      </td>
                      <td className={`${TD} whitespace-nowrap text-right text-slate-600`}>{formatWeight(vehicle.unladenWeight)}</td>
                      <td className={`${TD} whitespace-nowrap text-right text-slate-600`}>{formatCapacity(vehicle.capacityCubicMeter)}</td>
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
    </div>
  );
}
