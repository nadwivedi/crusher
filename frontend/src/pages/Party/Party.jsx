import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Search, Wallet } from 'lucide-react';
import { toast } from 'react-toastify';
import apiClient from '../../utils/api';
import AddPartyPopup from './component/AddPartyPopup';

const getInitialForm = () => ({
  type: '',
  name: '',
  mobile: '',
  email: '',
  address: '',
  state: '',
  pincode: '',
  openingBalance: '',
  openingBalanceType: 'receivable',
  tenMmRate: '',
  twentyMmRate: '',
  fortyMmRate: '',
  wmmRate: '',
  gsbRate: '',
  dustRate: ''
});

const TOAST_OPTIONS = { autoClose: 1200 };

const toTitleCase = (value) => String(value || '')
  .toLowerCase()
  .replace(/\b[a-z]/g, (char) => char.toUpperCase());

const PARTY_TYPE_LABELS = {
  supplier: 'Supplier',
  customer: 'Customer',
  'cash-in-hand': 'Cash In Hand'
};

const getTypeBadgeClass = (type) => {
  if (type === 'customer') {
    return 'border border-amber-200 bg-amber-50 text-amber-700';
  }

  if (type === 'cash-in-hand') {
    return 'border border-cyan-200 bg-cyan-50 text-cyan-700';
  }

  return 'border border-emerald-200 bg-emerald-50 text-emerald-700';
};

const getTypeLabel = (type) => PARTY_TYPE_LABELS[type] || 'Supplier';
const getDefaultOpeningBalanceType = (partyType) => (partyType === 'supplier' ? 'payable' : 'receivable');
const resolveOpeningBalanceType = (party) => {
  const explicitType = String(party?.openingBalanceType || '').trim().toLowerCase();
  if (explicitType === 'receivable' || explicitType === 'payable') return explicitType;

  const balance = Number(party?.openingBalance || 0);
  if (!Number.isFinite(balance) || balance === 0) {
    return getDefaultOpeningBalanceType(party?.type);
  }

  if (party?.type === 'supplier') {
    return balance >= 0 ? 'payable' : 'receivable';
  }

  return balance >= 0 ? 'receivable' : 'payable';
};

export default function Party() {
  const navigate = useNavigate();
  const [parties, setParties] = useState([]);
  const [formData, setFormData] = useState(getInitialForm());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
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

  const fetchParties = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/parties', { params: { search } });
      setParties(response.data || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Error fetching parties');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'name') {
      setFormData((prev) => ({ ...prev, [name]: toTitleCase(value) }));
      return;
    }
    if (name === 'mobile') {
      const normalized = String(value || '').replace(/\D/g, '').slice(0, 10);
      setFormData((prev) => ({ ...prev, [name]: normalized }));
      return;
    }
    if (name === 'pincode') {
      const normalized = String(value || '').replace(/\D/g, '').slice(0, 6);
      setFormData((prev) => ({ ...prev, [name]: normalized }));
      return;
    }
    if (name === 'openingBalance') {
      setFormData((prev) => ({ ...prev, [name]: value }));
      return;
    }
    if (['tenMmRate', 'twentyMmRate', 'fortyMmRate', 'wmmRate', 'gsbRate', 'dustRate'].includes(name)) {
      setFormData((prev) => ({ ...prev, [name]: value }));
      return;
    }
    if (name === 'type') {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
        openingBalanceType: prev.openingBalance ? prev.openingBalanceType : getDefaultOpeningBalanceType(value)
      }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
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

  const handleEdit = (party) => {
    setEditingId(party._id);
    setFormData({
      type: ['supplier', 'customer', 'cash-in-hand'].includes(party.type) ? party.type : 'supplier',
      name: String(party.name || ''),
      mobile: String(party.mobile || '').replace(/\D/g, '').slice(0, 10),
      email: String(party.email || ''),
      address: String(party.address || ''),
      state: String(party.state || ''),
      pincode: String(party.pincode || '').replace(/\D/g, '').slice(0, 6),
      openingBalance: Math.abs(Number(party.openingBalance || 0)) || '',
      openingBalanceType: resolveOpeningBalanceType(party),
      tenMmRate: Number(party.tenMmRate || 0) || '',
      twentyMmRate: Number(party.twentyMmRate || 0) || '',
      fortyMmRate: Number(party.fortyMmRate || 0) || '',
      wmmRate: Number(party.wmmRate || 0) || '',
      gsbRate: Number(party.gsbRate || 0) || '',
      dustRate: Number(party.dustRate || 0) || ''
    });
    setError('');
    setShowForm(true);
  };

  const handleOpenPartyLedger = (party) => {
    if (!party?._id) return;
    navigate(`/party/${party._id}`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !String(formData.name).trim()) {
      setError('Party name is required');
      return;
    }

    if (!['supplier', 'customer', 'cash-in-hand'].includes(formData.type)) {
      setError('Party type is required');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        type: formData.type,
        name: String(formData.name || '').trim(),
        mobile: String(formData.mobile || '').trim(),
        email: String(formData.email || '').trim(),
        address: String(formData.address || '').trim(),
        state: String(formData.state || '').trim(),
        pincode: String(formData.pincode || '').trim(),
        openingBalance: Number(formData.openingBalance || 0),
        openingBalanceType: String(formData.openingBalanceType || getDefaultOpeningBalanceType(formData.type)),
        tenMmRate: Number(formData.tenMmRate || 0),
        twentyMmRate: Number(formData.twentyMmRate || 0),
        fortyMmRate: Number(formData.fortyMmRate || 0),
        wmmRate: Number(formData.wmmRate || 0),
        gsbRate: Number(formData.gsbRate || 0),
        dustRate: Number(formData.dustRate || 0)
      };

      if (editingId) {
        await apiClient.put(`/parties/${editingId}`, payload);
      } else {
        await apiClient.post('/parties', payload);
      }

      handleCloseForm();
      fetchParties();
      setError('');
      toast.success(
        editingId ? 'Party updated successfully' : 'Party created successfully',
        TOAST_OPTIONS
      );
    } catch (err) {
      setError(err.message || (editingId ? 'Error updating party' : 'Error creating party'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      <div className="w-full px-3 md:px-4 lg:px-6 pt-4 lg:pt-4 pb-8">
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <div className="mb-5 mt-1 grid grid-cols-1 gap-2 sm:gap-4 lg:flex lg:justify-start">
        <div className="group relative overflow-hidden rounded-xl bg-white p-2.5 shadow-sm ring-1 ring-slate-200/50 transition-all hover:shadow-md sm:rounded-2xl sm:p-5 lg:min-w-[220px] lg:w-fit">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs font-medium text-slate-500 leading-tight">Party Count</p>
              <p className="mt-1 sm:mt-2 text-base sm:text-2xl font-bold text-slate-800 leading-tight">{parties.length}</p>
            </div>
            <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-transform group-hover:scale-110">
              <Wallet className="h-6 w-6" />
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-0.5 sm:h-1 bg-gradient-to-r from-blue-500 to-cyan-400 opacity-80"></div>
        </div>
      </div>

      <AddPartyPopup
        showForm={showForm}
        editingId={editingId}
        loading={loading}
        formData={formData}
        error={error}
        handleCloseForm={handleCloseForm}
        handleSubmit={handleSubmit}
        handleChange={handleChange}
      />

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
        <div className="border-b border-gray-200 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 px-6 py-5">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <div className="relative w-full lg:w-[22%] lg:min-w-[260px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search parties..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
            </div>

            <button
              onClick={handleOpenForm}
              className="inline-flex items-center justify-center rounded-lg bg-slate-800 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-900 whitespace-nowrap"
            >
              + Add Party
            </button>
          </div>
        </div>

        {loading ? (
          <div className="px-6 py-10 text-center text-slate-500">Loading...</div>
        ) : (
          <div className="rounded-[20px] border border-slate-200 bg-[radial-gradient(circle_at_top_right,rgba(148,163,184,0.16),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(241,245,249,0.96)_100%)] p-3 shadow-[0_18px_36px_rgba(15,23,42,0.08)] sm:p-5">
            <div className="space-y-3 md:hidden">
              {parties.map((item) => (
                <article
                  key={item._id}
                  onClick={() => handleOpenPartyLedger(item)}
                  className="cursor-pointer overflow-hidden rounded-2xl border border-cyan-200 bg-white shadow-[0_16px_32px_rgba(8,47,73,0.10)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_36px_rgba(8,47,73,0.14)]"
                >
                  <div className="flex items-start justify-between gap-3 border-b border-cyan-900/20 bg-[linear-gradient(135deg,#0f766e_0%,#0d9488_38%,#0891b2_72%,#0284c7_100%)] px-4 py-3 text-white">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-white">{item.name || '-'}</p>
                      <p className="mt-1 text-xs text-cyan-100">Open party ledger</p>
                    </div>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleEdit(item);
                      }}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-white text-blue-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
                      aria-label={`Edit ${item.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-3 px-4 py-4 text-sm">
                    <div className="flex items-center justify-between gap-3 rounded-xl bg-cyan-50 px-3 py-2.5">
                      <span className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-700">Type</span>
                      <span className={`inline-flex rounded-md px-2.5 py-1 text-xs font-semibold capitalize ${getTypeBadgeClass(item.type)}`}>
                        {getTypeLabel(item.type)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3 rounded-xl bg-sky-50 px-3 py-2.5">
                      <span className="text-xs font-medium uppercase tracking-[0.18em] text-sky-700">Mobile</span>
                      <span className="text-right font-semibold text-slate-800">{item.mobile || '-'}</span>
                    </div>
                  </div>
                </article>
              ))}

              {parties.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 px-6 py-10 text-center text-slate-500">
                  No parties found
                </div>
              )}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[720px] border-separate border-spacing-0 text-left text-sm whitespace-nowrap overflow-hidden">
                <thead className="bg-[linear-gradient(135deg,#0f766e_0%,#0d9488_38%,#0891b2_72%,#0284c7_100%)] text-white">
                  <tr>
                    <th className="border-y-2 border-l-2 border-r border-black px-4 py-3.5 text-center text-sm font-semibold shadow-[inset_0_-1px_0_rgba(148,163,184,0.2)]">Party Name</th>
                    <th className="border-y-2 border-r border-black px-4 py-3.5 text-center text-sm font-semibold shadow-[inset_0_-1px_0_rgba(148,163,184,0.2)]">Type</th>
                    <th className="border-y-2 border-r border-black px-4 py-3.5 text-center text-sm font-semibold shadow-[inset_0_-1px_0_rgba(148,163,184,0.2)]">Mobile Number</th>
                    <th className="border-y-2 border-r-2 border-black px-4 py-3.5 text-center text-sm font-semibold shadow-[inset_0_-1px_0_rgba(148,163,184,0.2)]">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(248,250,252,0.98)_100%)] text-slate-600">
                  {parties.map((item) => (
                    <tr
                      key={item._id}
                      onClick={() => handleOpenPartyLedger(item)}
                      className="cursor-pointer transition-colors duration-150 hover:bg-slate-200/45"
                    >
                      <td className="border border-slate-400 px-4 py-3 text-center font-semibold text-slate-800">{item.name || '-'}</td>
                      <td className="border border-slate-400 px-4 py-3 text-center">
                        <span className={`inline-flex rounded-md px-2.5 py-1 text-xs font-semibold capitalize ${getTypeBadgeClass(item.type)}`}>
                          {getTypeLabel(item.type)}
                        </span>
                      </td>
                      <td className="border border-slate-400 px-4 py-3 text-center">{item.mobile || '-'}</td>
                      <td className="border border-slate-400 px-4 py-3">
                        <div className="flex items-center justify-center">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleEdit(item);
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-blue-200 bg-white text-blue-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
                            aria-label={`Edit ${item.name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {parties.length === 0 && (
                    <tr>
                      <td colSpan="4" className="border border-slate-400 px-6 py-10 text-center text-slate-500">
                        No parties found
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
