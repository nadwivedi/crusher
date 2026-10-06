import { useEffect, useMemo, useRef, useState } from 'react';
import { Landmark, Pencil, Search, Trash2, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import apiClient from '../utils/api';
import { handlePopupFormKeyDown } from '../utils/popupFormKeyboard';

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2
});

export default function Banks() {
  const toastOptions = { autoClose: 1200 };
  const navigate = useNavigate();

  const initialFormData = {
    name: '',
    totalBalance: '',
    notes: ''
  };

  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState(initialFormData);
  const nameInputRef = useRef(null);

  useEffect(() => {
    fetchBanks();
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

  useEffect(() => {
    if (!showForm) return;

    const timer = setTimeout(() => {
      nameInputRef.current?.focus();
    }, 0);

    return () => clearTimeout(timer);
  }, [showForm, editingId]);

  const totalBalance = useMemo(
    () => banks.reduce((sum, bank) => sum + (Number(bank.totalBalance) || 0), 0),
    [banks]
  );

  const cashAccountCount = useMemo(
    () => banks.filter((bank) => String(bank.name || '').trim().toLowerCase() === 'cash account').length,
    [banks]
  );

  const fetchBanks = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/banks', { params: { search } });
      setBanks(response.data || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Error fetching banks');
    } finally {
      setLoading(false);
    }
  };

  const getInlineFieldClass = (tone = 'indigo') => {
    const focusTone = tone === 'emerald'
      ? 'focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200'
      : 'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200';
    return `flex-1 min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-bold text-gray-900 transition-all placeholder:font-normal placeholder:text-gray-400 focus:outline-none ${focusTone}`;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError('Bank name is required');
      return;
    }

    const payload = {
      name: formData.name.trim(),
      totalBalance: formData.totalBalance === '' ? 0 : Number(formData.totalBalance),
      notes: formData.notes.trim()
    };

    if (Number.isNaN(payload.totalBalance)) {
      setError('Total balance must be a valid number');
      return;
    }

    try {
      setLoading(true);
      const isEditMode = Boolean(editingId);

      if (editingId) {
        await apiClient.put(`/banks/${editingId}`, payload);
      } else {
        await apiClient.post('/banks', payload);
      }

      toast.success(
        isEditMode ? 'Bank updated successfully' : 'Bank added successfully',
        toastOptions
      );

      fetchBanks();
      setFormData(initialFormData);
      setEditingId(null);
      setShowForm(false);
      setError('');
    } catch (err) {
      setError(err.message || 'Error saving bank');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (bank) => {
    setFormData({
      name: bank.name || '',
      totalBalance: bank.totalBalance ?? '',
      notes: bank.notes || ''
    });
    setEditingId(bank._id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this bank account?')) {
      try {
        await apiClient.delete(`/banks/${id}`);
        toast.success('Bank deleted successfully', toastOptions);
        fetchBanks();
      } catch (err) {
        setError(err.message || 'Error deleting bank');
      }
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(initialFormData);
    setError('');
  };

  const handleOpenForm = () => {
    setEditingId(null);
    setFormData(initialFormData);
    setError('');
    setShowForm(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      <div className="w-full px-3 pb-8 pt-4 md:px-4 lg:px-6 lg:pt-4">
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        <div className="mb-5 mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-4 xl:flex xl:justify-start">
          <div className="group relative overflow-hidden rounded-xl bg-white p-2.5 shadow-sm ring-1 ring-slate-200/50 transition-all hover:shadow-md sm:rounded-2xl sm:p-5 xl:min-w-[220px] xl:w-fit">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-medium leading-tight text-slate-500 sm:text-xs">Bank Count</p>
                <p className="mt-1 text-base font-bold leading-tight text-slate-800 sm:mt-2 sm:text-2xl">{banks.length}</p>
              </div>
              <div className="hidden h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-transform group-hover:scale-110 sm:flex">
                <Landmark className="h-6 w-6" />
              </div>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-blue-500 to-cyan-400 opacity-80 sm:h-1"></div>
          </div>

          <div className="group relative overflow-hidden rounded-xl bg-white p-2.5 shadow-sm ring-1 ring-emerald-200/70 transition-all hover:shadow-md sm:rounded-2xl sm:p-5 xl:min-w-[240px] xl:w-fit">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-medium leading-tight text-emerald-700 sm:text-xs">Total Balance</p>
                <p className="mt-1 text-base font-bold leading-tight text-emerald-800 sm:mt-2 sm:text-2xl">
                  {currencyFormatter.format(totalBalance)}
                </p>
              </div>
              <div className="hidden h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition-transform group-hover:scale-110 sm:flex">
                <Wallet className="h-6 w-6" />
              </div>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-400 opacity-80 sm:h-1"></div>
          </div>

          <div className="group relative overflow-hidden rounded-xl bg-white p-2.5 shadow-sm ring-1 ring-amber-200/70 transition-all hover:shadow-md sm:rounded-2xl sm:p-5 xl:min-w-[220px] xl:w-fit">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-medium leading-tight text-amber-700 sm:text-xs">Cash Accounts</p>
                <p className="mt-1 text-base font-bold leading-tight text-amber-800 sm:mt-2 sm:text-2xl">{cashAccountCount}</p>
              </div>
              <div className="hidden h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600 transition-transform group-hover:scale-110 sm:flex">
                <Landmark className="h-6 w-6" />
              </div>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-amber-500 to-orange-400 opacity-80 sm:h-1"></div>
          </div>
        </div>

        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 backdrop-blur-[1.5px] md:p-4" onClick={handleCancel}>
            <div
              className="flex max-h-[92vh] w-full max-w-[28rem] flex-col overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-slate-200/80 md:rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex-shrink-0 border-b border-white/15 bg-gradient-to-r from-cyan-700 via-blue-700 to-indigo-700 px-3 py-1.5 text-white md:px-4 md:py-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white/20 text-white ring-1 ring-white/30 md:h-8 md:w-8">
                      <Landmark className="h-4 w-4 md:h-5 md:w-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold md:text-xl">{editingId ? 'Edit Bank' : 'Add New Bank'}</h2>
                      <p className="mt-0.5 text-[11px] text-cyan-100 md:text-xs">Create or update bank details in a clean accounting format.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCancel}
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
                id="bank-form"
                onSubmit={handleSubmit}
                onKeyDown={(e) => handlePopupFormKeyDown(e, handleCancel)}
                className="flex flex-1 flex-col overflow-hidden"
              >
                <div className="flex-1 overflow-y-auto p-2.5 md:p-4">
                  <div className="flex flex-col gap-3 md:gap-4">
                    <div className="rounded-xl border-2 border-indigo-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-2.5 md:p-4">
                      <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-gray-800 md:mb-4 md:text-lg">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs text-white md:h-8 md:w-8 md:text-sm">1</span>
                        Bank Details
                      </h3>

                      <div className="space-y-3 md:space-y-4">
                        <div className="flex items-center gap-2">
                          <label htmlFor="bank-name" className="mb-0 w-32 shrink-0 text-xs font-semibold text-gray-700 md:text-sm">
                          Bank Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="bank-name"
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          ref={nameInputRef}
                          className={getInlineFieldClass('indigo')}
                          placeholder="Enter bank or cash account name"
                          autoFocus
                          required
                        />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border-2 border-emerald-200 bg-gradient-to-r from-green-50 to-emerald-50 p-2.5 md:p-4">
                      <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-gray-800 md:mb-4 md:text-lg">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs text-white md:h-8 md:w-8 md:text-sm">2</span>
                        Balance & Notes
                      </h3>

                      <div className="space-y-3 md:space-y-4">
                        <div className="flex items-center gap-2">
                          <label htmlFor="bank-balance" className="mb-0 w-32 shrink-0 text-xs font-semibold text-gray-700 md:text-sm">
                            Total Balance
                          </label>
                          <input
                            id="bank-balance"
                            type="number"
                            name="totalBalance"
                            value={formData.totalBalance}
                            onChange={handleInputChange}
                            className={getInlineFieldClass('emerald')}
                            placeholder="Enter total balance"
                            step="0.01"
                          />
                        </div>

                        <div className="flex items-start gap-2">
                          <label htmlFor="bank-notes" className="mb-0 w-32 shrink-0 pt-2 text-xs font-semibold text-gray-700 md:text-sm">
                            Notes
                          </label>
                          <textarea
                            id="bank-notes"
                            name="notes"
                            value={formData.notes}
                            onChange={handleInputChange}
                            className={`${getInlineFieldClass('emerald')} min-h-0 resize-none`}
                            placeholder="Enter notes"
                            rows="1"
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
                      onClick={handleCancel}
                      className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-1.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 md:flex-none md:px-5"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      form="bank-form"
                      disabled={loading}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-1.5 text-sm font-semibold text-white transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 md:flex-none md:px-6"
                    >
                      {loading ? 'Saving...' : editingId ? 'Update Bank' : 'Save Bank'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
          <div className="border-b border-gray-200 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 px-6 py-5">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
              <div className="relative w-full lg:w-[22%] lg:min-w-[260px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search banks..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <button
                onClick={handleOpenForm}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-lg bg-slate-800 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-900"
              >
                + Add Bank
              </button>
            </div>
          </div>

          {loading && !showForm ? (
            <div className="px-6 py-10 text-center text-slate-500">Loading...</div>
          ) : (
            <div className="rounded-[20px] border border-slate-200 bg-[radial-gradient(circle_at_top_right,rgba(148,163,184,0.16),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(241,245,249,0.96)_100%)] p-3 shadow-[0_18px_36px_rgba(15,23,42,0.08)] sm:p-5">
              <div className="space-y-3 md:hidden">
                {banks.map((bank) => (
                  <article
                    key={bank._id}
                    className="overflow-hidden rounded-2xl border border-cyan-200 bg-white shadow-[0_16px_32px_rgba(8,47,73,0.10)]"
                  >
                    <div className="flex items-start justify-between gap-3 border-b border-cyan-900/20 bg-[linear-gradient(135deg,#0f766e_0%,#0d9488_38%,#0891b2_72%,#0284c7_100%)] px-4 py-3 text-white">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-white">{bank.name || '-'}</p>
                        <p className="mt-1 text-xs text-cyan-100">{currencyFormatter.format(Number(bank.totalBalance) || 0)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(bank)}
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-white text-blue-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
                          aria-label={`Edit ${bank.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(bank._id)}
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-red-200 bg-white text-red-700 shadow-sm transition hover:border-red-300 hover:bg-red-50"
                          aria-label={`Delete ${bank.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3 px-4 py-4 text-sm">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Notes</p>
                        <p className="mt-1 break-words text-sm text-slate-700">{bank.notes || '-'}</p>
                      </div>
                    </div>
                  </article>
                ))}

                {banks.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 px-6 py-10 text-center text-slate-500">
                    No banks found
                  </div>
                )}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[820px] overflow-hidden whitespace-nowrap border-separate border-spacing-0 text-left text-sm">
                  <thead className="bg-[linear-gradient(135deg,#0f766e_0%,#0d9488_38%,#0891b2_72%,#0284c7_100%)] text-white">
                    <tr>
                      <th className="border-y-2 border-l-2 border-r border-black px-4 py-3.5 text-center text-sm font-semibold shadow-[inset_0_-1px_0_rgba(148,163,184,0.2)]">Bank Name</th>
                      <th className="border-y-2 border-r border-black px-4 py-3.5 text-center text-sm font-semibold shadow-[inset_0_-1px_0_rgba(148,163,184,0.2)]">Total Balance</th>
                      <th className="border-y-2 border-r border-black px-4 py-3.5 text-sm font-semibold shadow-[inset_0_-1px_0_rgba(148,163,184,0.2)]">Notes</th>
                      <th className="border-y-2 border-r-2 border-black px-4 py-3.5 text-center text-sm font-semibold shadow-[inset_0_-1px_0_rgba(148,163,184,0.2)]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(248,250,252,0.98)_100%)] text-slate-600">
                    {banks.map((bank) => (
                      <tr key={bank._id} className="transition-colors duration-150 hover:bg-slate-200/45">
                        <td className="border border-slate-400 px-4 py-3 text-center font-semibold text-slate-800">{bank.name || '-'}</td>
                        <td className="border border-slate-400 px-4 py-3 text-center font-semibold text-slate-700">
                          {currencyFormatter.format(Number(bank.totalBalance) || 0)}
                        </td>
                        <td className="border border-slate-400 px-4 py-3">
                          <div className="max-w-[24rem] truncate">{bank.notes || '-'}</div>
                        </td>
                        <td className="border border-slate-400 px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleEdit(bank)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-blue-200 bg-white text-blue-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
                              aria-label={`Edit ${bank.name}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(bank._id)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 bg-white text-red-700 shadow-sm transition hover:border-red-300 hover:bg-red-50"
                              aria-label={`Delete ${bank.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {banks.length === 0 && (
                      <tr>
                        <td colSpan="4" className="border border-slate-400 px-6 py-10 text-center text-slate-500">
                          No banks found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
