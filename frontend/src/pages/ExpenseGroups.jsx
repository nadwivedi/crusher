import { useEffect, useRef, useState } from 'react';
import { Layers3, Plus, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import apiClient from '../utils/api';
import { handlePopupFormKeyDown } from '../utils/popupFormKeyboard';

const TOAST_OPTIONS = { autoClose: 1200 };

const getInitialForm = () => ({
  name: '',
  description: ''
});

export default function ExpenseGroups() {
  const [expenseGroups, setExpenseGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(getInitialForm());
  const nameInputRef = useRef(null);

  useEffect(() => {
    fetchExpenseGroups();
  }, [search]);

  useEffect(() => {
    if (!showForm) return;

    const timer = setTimeout(() => {
      nameInputRef.current?.focus();
    }, 0);

    return () => clearTimeout(timer);
  }, [showForm, editingId]);

  const fetchExpenseGroups = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/expense-groups', { params: { search } });
      setExpenseGroups(response.data || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Error fetching expense groups');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDescriptionKeyDown = (event) => {
    if (event.key !== 'Enter' || event.shiftKey || loading) return;
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  };

  const getInlineFieldClass = (tone = 'indigo') => {
    const focusTone = tone === 'emerald'
      ? 'focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200'
      : 'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200';
    return `flex-1 min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-bold text-gray-900 transition-all placeholder:font-normal placeholder:text-gray-400 focus:outline-none ${focusTone}`;
  };

  const handleOpenForm = () => {
    setFormData(getInitialForm());
    setEditingId(null);
    setError('');
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(getInitialForm());
  };

  const handleEdit = (expenseGroup) => {
    setFormData({
      name: expenseGroup.name || '',
      description: expenseGroup.description || ''
    });
    setEditingId(expenseGroup._id);
    setError('');
    setShowForm(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!String(formData.name || '').trim()) {
      setError('Expense group name is required');
      return;
    }

    try {
      setLoading(true);
      if (editingId) {
        await apiClient.put(`/expense-groups/${editingId}`, formData);
        toast.success('Expense group updated successfully', TOAST_OPTIONS);
      } else {
        await apiClient.post('/expense-groups', formData);
        toast.success('Expense group created successfully', TOAST_OPTIONS);
      }

      handleCloseForm();
      fetchExpenseGroups();
    } catch (err) {
      setError(err.message || 'Error saving expense group');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense group?')) return;

    try {
      await apiClient.delete(`/expense-groups/${id}`);
      toast.success('Expense group deleted successfully', TOAST_OPTIONS);
      fetchExpenseGroups();
    } catch (err) {
      setError(err.message || 'Error deleting expense group');
    }
  };

  const totalGroups = expenseGroups.length;
  return (
    <div className="min-h-screen bg-[#f3f6fb] p-4 pt-16 md:px-8 md:pb-8 md:pt-5">
      {error && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-3 md:gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Total Groups</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{totalGroups}</p>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 md:flex-row">
        <input
          type="text"
          placeholder="Search expense group..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        />
        <button
          type="button"
          onClick={handleOpenForm}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" />
          Add Expense Group
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 backdrop-blur-[1.5px] md:p-4" onClick={handleCloseForm}>
          <div
            className="flex max-h-[92vh] w-full max-w-[28rem] flex-col overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-slate-200/80 md:rounded-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex-shrink-0 border-b border-white/15 bg-gradient-to-r from-cyan-700 via-blue-700 to-indigo-700 px-3 py-1.5 text-white md:px-4 md:py-2">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white/20 text-white ring-1 ring-white/30 md:h-8 md:w-8">
                    <Layers3 className="h-4 w-4 md:h-5 md:w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold md:text-xl">
                      {editingId ? 'Edit Expense Group' : 'Add Expense Group'}
                    </h2>
                    <p className="mt-0.5 text-[11px] text-cyan-100 md:text-xs">
                      Create or update expense groups in a clean accounting format.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="rounded-lg p-1.5 text-white transition hover:bg-white/25 md:p-2"
                  aria-label="Close popup"
                >
                  <svg className="h-5 w-5 md:h-6 md:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              onKeyDown={(event) => handlePopupFormKeyDown(event, handleCloseForm)}
              className="flex flex-1 flex-col overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto p-2.5 md:p-4">
                <div className="flex flex-col gap-3 md:gap-4">
                  <div className="rounded-xl border-2 border-indigo-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-2.5 md:p-4">
                    <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-gray-800 md:mb-4 md:text-lg">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs text-white md:h-8 md:w-8 md:text-sm">1</span>
                      Expense Group Details
                    </h3>

                    <div className="space-y-3 md:space-y-4">
                      <div className="flex items-center gap-2">
                        <label className="mb-0 w-32 shrink-0 text-xs font-semibold text-gray-700 md:text-sm">
                          Group Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          ref={nameInputRef}
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          className={getInlineFieldClass('indigo')}
                          placeholder="Enter expense group name"
                          required
                        />
                      </div>

                    </div>
                  </div>

                  <div className="rounded-xl border-2 border-emerald-200 bg-gradient-to-r from-green-50 to-emerald-50 p-2.5 md:p-4">
                    <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-gray-800 md:mb-4 md:text-lg">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs text-white md:h-8 md:w-8 md:text-sm">2</span>
                      Notes
                    </h3>

                    <div className="space-y-3 md:space-y-4">
                      <div className="flex items-start gap-2">
                        <label className="mb-0 w-32 shrink-0 pt-2 text-xs font-semibold text-gray-700 md:text-sm">
                          Description
                        </label>
                        <textarea
                          name="description"
                          value={formData.description}
                          onChange={handleChange}
                          onKeyDown={handleDescriptionKeyDown}
                          rows="1"
                          className={`${getInlineFieldClass('emerald')} min-h-0 resize-none`}
                          placeholder="Optional description"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 flex-col items-center justify-between gap-2 border-t border-gray-200 bg-gray-50 px-3 py-2 md:flex-row md:px-4">
                <div className="text-[11px] text-gray-600 md:text-xs">
                  <kbd className="rounded bg-gray-200 px-2 py-1 font-mono text-xs">Esc</kbd> to close
                </div>

                <div className="flex w-full gap-2 md:w-auto">
                  <button
                    type="button"
                    onClick={handleCloseForm}
                    className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-1.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 md:flex-none md:px-5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-1.5 text-sm font-semibold text-white transition hover:shadow-lg disabled:opacity-50 md:flex-none md:px-6"
                  >
                    {loading ? 'Saving...' : editingId ? 'Update Expense Group' : 'Save Expense Group'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="bg-slate-900 text-white">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em]">Name</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em]">Description</th>
                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.18em]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {expenseGroups.map((expenseGroup) => (
                <tr key={expenseGroup._id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">{expenseGroup.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{expenseGroup.description || '-'}</td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => handleEdit(expenseGroup)}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(expenseGroup._id)}
                        className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!loading && expenseGroups.length === 0 && (
                <tr>
                  <td colSpan="3" className="px-6 py-12 text-center text-sm text-slate-500">
                    No expense groups found. Add your first expense group.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
