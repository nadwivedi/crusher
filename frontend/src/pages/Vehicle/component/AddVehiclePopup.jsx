import { useState, useEffect } from 'react';
import { X, Truck } from 'lucide-react';
import { toast } from 'react-toastify';
import apiClient from '../../../utils/api';

const initialFormData = {
  partyId: '',
  vehicleNo: '',
  unladenWeight: '',
  vehicleType: 'sales'
};

export default function AddVehiclePopup({ vehicle, onClose, onSave }) {
  const [formData, setFormData] = useState(vehicle || initialFormData);
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(false);
  const isEditing = Boolean(vehicle?._id);

  useEffect(() => {
    fetchParties();
  }, []);

  const fetchParties = async () => {
    try {
      const response = await apiClient.get('/parties');
      setParties(response.data || []);
    } catch (error) {
      console.error('Error fetching parties:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.partyId || !formData.vehicleNo || !formData.unladenWeight) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        partyId: formData.partyId,
        vehicleNo: formData.vehicleNo.toUpperCase(),
        unladenWeight: parseFloat(formData.unladenWeight),
        vehicleType: formData.vehicleType || 'sales'
      };

      if (isEditing) {
        await apiClient.put(`/vehicles/${vehicle._id}`, payload);
        toast.success('Vehicle updated successfully');
      } else {
        await apiClient.post('/vehicles', payload);
        toast.success('Vehicle created successfully');
      }

      if (onSave) onSave();
      if (onClose) onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error saving vehicle');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-cyan-50 to-blue-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                {isEditing ? 'Edit Vehicle' : 'Add Vehicle'}
              </h2>
              <p className="text-xs text-slate-500">Register vehicle details</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Owner / Party <span className="text-red-500">*</span>
              </label>
              <select
                name="partyId"
                value={formData.partyId}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200"
                required
              >
                <option value="">Select Party</option>
                {parties.map((party) => (
                  <option key={party._id} value={party._id}>
                    {party.partyName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Vehicle Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="vehicleNo"
                value={formData.vehicleNo}
                onChange={handleChange}
                placeholder="e.g., TN 01 AB 1234"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Unladen Weight (kg) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="unladenWeight"
                value={formData.unladenWeight}
                onChange={handleChange}
                placeholder="Enter empty vehicle weight"
                step="0.01"
                min="0"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Vehicle Type <span className="text-red-500">*</span>
              </label>
              <select
                name="vehicleType"
                value={formData.vehicleType}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200"
                required
              >
                <option value="sales">Sales</option>
                <option value="boulder">Boulder Load</option>
              </select>
              <p className="mt-1 text-xs text-slate-500">
                Select "Boulder Load" for vehicles that transport boulders, or "Sales" for delivery vehicles
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-medium text-white hover:from-cyan-600 hover:to-blue-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : isEditing ? 'Update Vehicle' : 'Add Vehicle'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
