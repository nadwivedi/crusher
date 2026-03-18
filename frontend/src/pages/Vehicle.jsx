import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Search, Trash2, Truck } from 'lucide-react';
import { toast } from 'react-toastify';
import apiClient from '../utils/api';
import AddVehiclePopup from './Vehicle/component/AddVehiclePopup';

const TOAST_OPTIONS = { autoClose: 1200 };

const getTypeBadgeClass = (type) => {
  if (type === 'boulder') {
    return 'border border-violet-200 bg-violet-50 text-violet-700';
  }
  return 'border border-amber-200 bg-amber-50 text-amber-700';
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
      setVehicles(response.data || []);
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
      setParties(response.data || []);
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
    return party?.partyName || '-';
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.16),transparent_24%),linear-gradient(180deg,#0f172a_0%,#111827_48%,#020617_100%)] px-4 py-6">
      <div className="mx-auto max-w-6xl">
        <div className="overflow-hidden rounded-[32px] border border-white/15 bg-gradient-to-br from-slate-50 via-white to-slate-100 shadow-[0_28px_80px_rgba(15,23,42,0.28)]">
          <div className="border-b border-slate-200/80 bg-white/80 px-5 py-5 backdrop-blur-sm md:px-8 md:py-7">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-slate-500">Master Records</p>
                <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 md:text-3xl">Manage Vehicle</h1>
                <p className="mt-1 text-sm font-medium text-slate-600">Register and manage your vehicles for boulder load and sales</p>
              </div>

              <div className="flex gap-3">
                <Link
                  to="/masters"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Back To Masters
                </Link>
                <button
                  onClick={() => handleOpenForm()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:from-cyan-600 hover:to-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Add Vehicle
                </button>
              </div>
            </div>
          </div>

          <div className="p-5 md:p-8">
            <div className="mb-4 flex items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search vehicles..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200"
                />
              </div>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {loading ? (
              <div className="py-8 text-center text-slate-500">Loading vehicles...</div>
            ) : vehicles.length === 0 ? (
              <div className="py-12 text-center">
                <Truck className="mx-auto h-12 w-12 text-slate-300" />
                <p className="mt-4 text-slate-500">No vehicles found</p>
                <button
                  onClick={() => handleOpenForm()}
                  className="mt-4 text-sm font-medium text-cyan-600 hover:text-cyan-700"
                >
                  Add your first vehicle
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Vehicle No
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Owner
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Unladen Weight
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Type
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {vehicles.map((vehicle) => (
                      <tr key={vehicle._id} className="hover:bg-slate-50">
                        <td className="whitespace-nowrap px-4 py-3">
                          <span className="font-mono font-semibold text-slate-900">{vehicle.vehicleNo}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {getPartyName(vehicle.partyId)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                          {vehicle.unladenWeight} kg
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getTypeBadgeClass(vehicle.vehicleType)}`}>
                            {getTypeLabel(vehicle.vehicleType)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenForm(vehicle)}
                              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-cyan-600"
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(vehicle._id)}
                              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-red-600"
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

            <p className="mt-3 text-xs text-slate-500">
              Press Alt+N to add new vehicle
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
