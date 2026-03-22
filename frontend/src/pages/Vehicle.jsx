import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Search, Trash2, Truck, Scale, Users, ArrowLeft } from 'lucide-react';
import { toast } from 'react-toastify';
import apiClient from '../utils/api';
import AddVehiclePopup from './Vehicle/component/AddVehiclePopup';

const TOAST_OPTIONS = { autoClose: 1200 };

const getTypeBadgeClass = (type) => {
  if (type === 'boulder') {
    return 'bg-violet-100 text-violet-700 border-violet-200';
  }
  return 'bg-amber-100 text-amber-700 border-amber-200';
};

const getTypeLabel = (type) => {
  if (type === 'boulder') return 'Boulder Load';
  return 'Sales';
};

export default function Vehicle() {
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

  const totalVehicles = vehicles.length;
  const boulderVehicles = vehicles.filter(v => v.vehicleType === 'boulder').length;
  const salesVehicles = vehicles.filter(v => v.vehicleType === 'sales').length;

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-100 via-slate-50 to-slate-100">
      <div className="mx-auto max-w-[1600px] px-3 pb-8 pt-4 md:px-6 lg:px-8">
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 shadow-sm">
            {error}
          </div>
        )}

        <div className="mb-6 mt-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200/60 transition-all hover:shadow-md hover:ring-slate-300/80"
            >
              <ArrowLeft className="h-4 w-4 text-slate-600" />
            </Link>
            <div>
              <p className="text-xs font-medium text-slate-500">Master Records</p>
              <h1 className="text-2xl font-bold text-slate-900">Vehicle Management</h1>
            </div>
          </div>
          <button
            onClick={() => handleOpenForm()}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:from-indigo-700 hover:to-violet-700 hover:shadow-xl hover:shadow-indigo-500/30"
          >
            <Plus className="h-4 w-4" />
            Add Vehicle
          </button>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="group relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60 transition-all hover:shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Total Vehicles</p>
                <p className="mt-1 text-3xl font-bold text-slate-900">{totalVehicles}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition-transform group-hover:scale-110">
                <Truck className="h-6 w-6" />
              </div>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-indigo-500 to-violet-500" />
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60 transition-all hover:shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Boulder Load</p>
                <p className="mt-1 text-3xl font-bold text-violet-700">{boulderVehicles}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 text-violet-600 transition-transform group-hover:scale-110">
                <Scale className="h-6 w-6" />
              </div>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-violet-500 to-purple-500" />
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60 transition-all hover:shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Sales Vehicles</p>
                <p className="mt-1 text-3xl font-bold text-amber-700">{salesVehicles}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600 transition-transform group-hover:scale-110">
                <Users className="h-6 w-6" />
              </div>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-xl">
          <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-slate-50 px-6 py-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by vehicle number or owner..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium">{vehicles.length}</span>
                vehicles found
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600"></div>
            </div>
          ) : vehicles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-50">
                <Truck className="h-10 w-10 text-slate-300" />
              </div>
              <p className="mb-2 text-lg font-medium text-slate-700">No vehicles found</p>
              <p className="mb-4 text-sm text-slate-500">Get started by adding your first vehicle</p>
              <button
                onClick={() => handleOpenForm()}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
              >
                Add Your First Vehicle
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-6 py-4">Vehicle Number</th>
                    <th className="px-6 py-4">Owner / Party</th>
                    <th className="px-6 py-4">Unladen Weight</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vehicles.map((vehicle) => (
                    <tr key={vehicle._id} className="group transition-colors hover:bg-slate-50/70">
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-1.5 font-mono text-sm font-semibold text-white">
                          <Truck className="h-3.5 w-3.5" />
                          {vehicle.vehicleNo}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                            <Users className="h-4 w-4" />
                          </div>
                          <span className="font-medium text-slate-700">{getPartyName(vehicle.partyId)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-600">{vehicle.unladenWeight} kg</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold border ${getTypeBadgeClass(vehicle.vehicleType)}`}>
                          {getTypeLabel(vehicle.vehicleType)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenForm(vehicle)}
                            className="rounded-lg p-2 text-slate-400 transition-all hover:bg-indigo-50 hover:text-indigo-600"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(vehicle._id)}
                            className="rounded-lg p-2 text-slate-400 transition-all hover:bg-red-50 hover:text-red-600"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-3">
            <p className="text-xs text-slate-400">
              Press <kbd className="rounded bg-slate-200 px-1.5 py-0.5 font-sans text-slate-600">Alt</kbd> + <kbd className="rounded bg-slate-200 px-1.5 py-0.5 font-sans text-slate-600">N</kbd> to add new vehicle
            </p>
          </div>
        </div>
      </div>

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
