import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layers3, Plus, Pencil, Search, Trash2, ArrowLeft } from 'lucide-react';
import { toast } from 'react-toastify';
import apiClient from '../utils/api';
import { handlePopupFormKeyDown } from '../utils/popupFormKeyboard';

const TOAST_OPTIONS = { autoClose: 1200 };

const getInitialForm = () => ({
  name: '',
  description: ''
});

export default function ExpenseTypes() {
  const navigate = useNavigate();
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

  // Alt+N to open form
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

  // Escape to navigate back (only when not in a form field)
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

  const fetchExpenseGroups = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/expense-types', { params: { search } });
      setExpenseGroups(response.data || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Error fetching expense types');
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
      setError('Expense type name is required');
      return;
    }

    try {
      setLoading(true);
      if (editingId) {
        await apiClient.put(`/expense-types/${editingId}`, formData);
        toast.success('Expense type updated successfully', TOAST_OPTIONS);
      } else {
        await apiClient.post('/expense-types', formData);
        toast.success('Expense type created successfully', TOAST_OPTIONS);
      }

      handleCloseForm();
      fetchExpenseGroups();
    } catch (err) {
      setError(err.message || 'Error saving expense type');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense type?')) return;

    try {
      await apiClient.delete(`/expense-types/${id}`);
      toast.success('Expense type deleted successfully', TOAST_OPTIONS);
      fetchExpenseGroups();
    } catch (err) {
      setError(err.message || 'Error deleting expense type');
    }
  };

  const totalGroups = expenseGroups.length;

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-100 via-slate-50 to-slate-100">
      <div className="mx-auto max-w-[1600px] px-3 pb-8 pt-4 md:px-6 lg:px-8">
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 shadow-sm">
            {error}
          </div>
        )}

        {/* Page header */}
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
              <h1 className="text-2xl font-bold text-slate-900">Expense Types</h1>
            </div>
          </div>
          <button
            onClick={handleOpenForm}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:from-emerald-700 hover:to-teal-700 hover:shadow-xl hover:shadow-emerald-500/30"
          >
            <Plus className="h-4 w-4" />
            Add Expense Type
          </button>
        </div>

        {/* Stats card */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-1 lg:flex lg:justify-start">
          <div className="group relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60 transition-all hover:shadow-lg lg:min-w-[220px] lg:w-fit">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-slate-500">Total Expense Types</p>
                <p className="mt-1 text-3xl font-bold text-slate-900">{totalGroups}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition-transform group-hover:scale-110">
                <Layers3 className="h-6 w-6" />
              </div>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
          </div>
        </div>

        {/* Modal form */}
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
                        {editingId ? 'Edit Expense Type' : 'Add Expense Type'}
                      </h2>
                      <p className="mt-0.5 text-[11px] text-cyan-100 md:text-xs">
                        Create or update expense types in a clean accounting format.
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
                        Expense Type Details
                      </h3>

                      <div className="space-y-3 md:space-y-4">
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
                          <label className="md:w-36 shrink-0 text-xs font-semibold text-gray-700 md:text-sm">
                            Group Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            ref={nameInputRef}
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-3 py-2 text-sm font-bold text-gray-900 transition-all placeholder:font-normal placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
                            placeholder="Enter expense type name"
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
                        <div className="flex flex-col gap-2 md:flex-row md:items-start md:gap-3">
                          <label className="md:w-36 shrink-0 pt-0.5 text-xs font-semibold text-gray-700 md:text-sm">
                            Description
                          </label>
                          <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            onKeyDown={handleDescriptionKeyDown}
                            rows="1"
                            className="min-w-0 flex-1 resize-none rounded-lg border border-transparent bg-transparent px-3 py-2 text-sm font-bold text-gray-900 transition-all placeholder:font-normal placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200"
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
                      {loading ? 'Saving...' : editingId ? 'Update Expense Type' : 'Save Expense Type'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Table container */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-xl">
          {/* Search header inside table */}
          <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-slate-50 px-6 py-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search expense types..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="w-full rounded-lg border border-slate-400 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium">{expenseGroups.length}</span>
                expense types found
              </div>
            </div>
          </div>

          {loading && !showForm ? (
            <div className="flex h-48 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600"></div>
            </div>
          ) : expenseGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-50">
                <Layers3 className="h-10 w-10 text-slate-300" />
              </div>
              <p className="mb-2 text-lg font-medium text-slate-700">No expense types found</p>
              <p className="mb-4 text-sm text-slate-500">Get started by adding your first expense type</p>
              <button
                onClick={handleOpenForm}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
              >
                Add Your First Expense Type
              </button>
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="space-y-3 p-3 md:hidden">
                {expenseGroups.map((expenseGroup) => (
                  <article
                    key={expenseGroup._id}
                    className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-[0_16px_32px_rgba(8,47,73,0.10)]"
                  >
                    <div className="flex items-start justify-between gap-3 border-b border-emerald-900/20 bg-[linear-gradient(135deg,#065f46_0%,#047857_38%,#059669_72%,#10b981_100%)] px-4 py-3 text-white">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-white">{expenseGroup.name || '-'}</p>
                        <p className="mt-1 text-xs text-emerald-100">Expense type details</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(expenseGroup)}
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-white text-blue-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
                          aria-label={`Edit ${expenseGroup.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(expenseGroup._id)}
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-red-200 bg-white text-red-700 shadow-sm transition hover:border-red-300 hover:bg-red-50"
                          aria-label={`Delete ${expenseGroup.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3 px-4 py-4 text-sm">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Description</p>
                        <p className="mt-1 break-words text-sm text-slate-700">{expenseGroup.description || '-'}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[720px]">
                  <thead>
                    <tr className="bg-slate-700 text-left text-xs font-semibold uppercase tracking-wider text-slate-100">
                      <th className="px-6 py-4">Name</th>
                      <th className="px-6 py-4">Description</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {expenseGroups.map((expenseGroup) => (
                      <tr key={expenseGroup._id} className="group transition-colors hover:bg-slate-50/70">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                              <Layers3 className="h-4 w-4" />
                            </div>
                            <span className="font-medium text-slate-900">{expenseGroup.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="max-w-[24rem] truncate text-sm text-slate-600">{expenseGroup.description || '-'}</div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleEdit(expenseGroup)}
                              className="rounded-lg p-2 text-slate-400 transition-all hover:bg-indigo-50 hover:text-indigo-600"
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(expenseGroup._id)}
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
            </>
          )}

          {/* Footer with keyboard hint */}
          <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-3">
            <p className="text-xs text-slate-400">
              Press <kbd className="rounded bg-slate-200 px-1.5 py-0.5 font-sans text-slate-600">Alt</kbd> + <kbd className="rounded bg-slate-200 px-1.5 py-0.5 font-sans text-slate-600">N</kbd> to add new expense type
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
