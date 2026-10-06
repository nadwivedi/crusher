import React, { useState, useEffect } from 'react';
import apiClient from '../utils/api';
import { toast } from 'react-toastify';
import { Plus, Edit2, Trash2 } from 'lucide-react';

const MAX_STAFF = 5;

const HISTORY_LIMITS = [
  { value: 7, label: 'Last 7 days' },
  { value: 28, label: 'Last 28 days' },
  { value: 90, label: 'Last 3 months' },
  { value: 365, label: 'Last 1 year' },
  { value: 'all', label: 'All data' }
];
const historyLabel = (value) => HISTORY_LIMITS.find((item) => String(item.value) === String(value))?.label || `Last ${value} days`;

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [isAdding, setIsAdding] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    password: '',
    historyLimitDays: 7,
    permissions: { view: true, add: false, edit: false },
    isActive: true
  });

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/employees');
      setEmployees(response.data || []);
    } catch (e) {
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      mobile: '',
      password: '',
      historyLimitDays: 7,
      permissions: { view: true, add: false, edit: false },
      isActive: true
    });
    setEditingId(null);
    setIsAdding(false);
  };

  const handleEdit = (emp) => {
    setFormData({
      name: emp.name,
      mobile: emp.mobile,
      password: '', // blank password when editing
      historyLimitDays: emp.historyLimitDays,
      permissions: emp.permissions,
      isActive: emp.isActive
    });
    setEditingId(emp._id);
    setIsAdding(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingId) {
      try {
        const payload = { ...formData };
        if (!payload.password) delete payload.password; // Don't send empty pass

        await apiClient.patch(`/employees/${editingId}`, payload);
        toast.success("Employee updated!");
        fetchEmployees();
        resetForm();
      } catch (e) { toast.error(e?.message || "Update failed"); }
    } else {
      if (!formData.password) { toast.error('Password required for new employee'); return;}
      try {
        await apiClient.post('/employees', formData);
        toast.success("Employee added!");
        fetchEmployees();
        resetForm();
      } catch (e) { toast.error(e?.message || "Failed to add"); }
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this employee?")) return;
    try {
      await apiClient.delete(`/employees/${id}`);
      toast.success("Employee removed");
      fetchEmployees();
    } catch (e) { toast.error("Failed to delete"); }
  };

  const handleToggleAccess = (emp) => {
    if (!window.confirm(emp.isActive ? "Revoke access for this employee?" : "Restore access?")) return;
    apiClient.patch(`/employees/${emp._id}`, { isActive: !emp.isActive }).then(fetchEmployees);
  };

  const setPermission = (key) => (e) => setFormData({ ...formData, permissions: { ...formData.permissions, [key]: e.target.checked } });

  return (
    <section className="panel">
      <div className="panel-header flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-slate-900">Staff Logins</h2>
          <p className="text-xs text-slate-500">Up to {MAX_STAFF} logins for your staff. Choose what each one can see and do.</p>
        </div>
        {!isAdding && employees.length < MAX_STAFF && (
          <button type="button" onClick={() => setIsAdding(true)} className="btn-primary btn-sm shrink-0">
            <Plus size={16} /> Add Staff
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="space-y-4 border-b border-slate-100 bg-slate-50 p-4 md:p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
            <div>
              <label className="label">Name</label>
              <input type="text" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} required className="input" />
            </div>
            <div>
              <label className="label">Mobile (used to log in)</label>
              <input type="text" value={formData.mobile} onChange={e=>setFormData({...formData, mobile: e.target.value})} required className="input" />
            </div>
            <div>
              <label className="label">{editingId ? "New Password (leave blank to keep)" : "Password"}</label>
              <input type="text" placeholder="Min 6 chars" value={formData.password} onChange={e=>setFormData({...formData, password: e.target.value})} className="input" />
            </div>
            <div>
              <label className="label">Can see entries from</label>
              <select value={formData.historyLimitDays} onChange={e=>setFormData({...formData, historyLimitDays: e.target.value})} className="input">
                {HISTORY_LIMITS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Allowed to</label>
            <div className="flex flex-wrap gap-2">
              <label className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-500">
                <input type="checkbox" checked={formData.permissions.view} readOnly disabled className="accent-primary-600" /> View
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
                <input type="checkbox" checked={formData.permissions.add} onChange={setPermission('add')} className="accent-primary-600" /> Add entries
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
                <input type="checkbox" checked={formData.permissions.edit} onChange={setPermission('edit')} className="accent-primary-600" /> Edit entries
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={resetForm} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">{editingId ? 'Update Staff' : 'Save Staff'}</button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="px-4 py-8 text-center text-sm text-slate-400">Loading staff...</p>
      ) : employees.length === 0 ? (
        !isAdding && <p className="px-4 py-8 text-center text-sm text-slate-500">No staff logins yet. Use "Add Staff" to create one.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {employees.map(emp => (
            <li key={emp._id} className={`flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-5 ${emp.isActive ? '' : 'bg-slate-50'}`}>
              <div className={`min-w-0 ${emp.isActive ? '' : 'opacity-60'}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-800">{emp.name}</p>
                  {!emp.isActive && <span className="badge-red">Access revoked</span>}
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {emp.mobile} · Sees {historyLabel(emp.historyLimitDays).toLowerCase()}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <span className="badge-gray">View</span>
                  {emp.permissions.add && <span className="badge-green">Add</span>}
                  {emp.permissions.edit && <span className="badge-green">Edit</span>}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <button type="button" onClick={() => handleToggleAccess(emp)} className="btn-secondary btn-sm">
                  {emp.isActive ? 'Revoke Login' : 'Restore Login'}
                </button>
                <button type="button" onClick={() => handleEdit(emp)} className="icon-btn hover:bg-blue-50 hover:text-blue-600" title="Edit">
                  <Edit2 size={16} />
                </button>
                <button type="button" onClick={() => handleDelete(emp._id)} className="icon-btn hover:bg-rose-50 hover:text-rose-600" title="Delete">
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
