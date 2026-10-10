import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Search, Wallet, ChevronRight, Users } from 'lucide-react';
import { toast } from 'react-toastify';
import apiClient from '../../utils/api';
import AddPartyPopup from './component/AddPartyPopup';
import { getSupplierRatesPayload, isTransportProvider } from '../../utils/transport';

const getInitialForm = () => ({
  type: '',
  name: '',
  mobile: '',
  openingBalance: '',
  openingBalanceType: 'receivable',
  tenMmRate: '',
  twentyMmRate: '',
  fortyMmRate: '',
  wmmRate: '',
  gsbRate: '',
  dustRate: '',
  boulderRatePerTon: '',
  boulderRatePerTrip: '',
  isTransportProvider: false,
  hireBasis: 'per_ton',
  hireRate: '',
  tripRates: []
});

const TOAST_OPTIONS = { autoClose: 1200 };

const toTitleCase = (value) => String(value || '')
  .toLowerCase()
  .replace(/\b[a-z]/g, (char) => char.toUpperCase());

const PARTY_TYPE_LABELS = {
  supplier: 'Supplier',
  customer: 'Customer',
  transporter: 'Transporter',
  'cash-in-hand': 'Cash In Hand'
};

const getTypeBadgeClass = (type) => {
  if (type === 'customer') {
    return 'border border-amber-200 bg-amber-50 text-amber-700';
  }

  if (type === 'transporter') {
    return 'border border-violet-200 bg-violet-50 text-violet-700';
  }

  if (type === 'cash-in-hand') {
    return 'border border-cyan-200 bg-cyan-50 text-cyan-700';
  }

  return 'border border-emerald-200 bg-emerald-50 text-emerald-700';
};

const getTypeLabel = (party) => (isTransportProvider(party) ? 'Supplier · Transport' : PARTY_TYPE_LABELS[party?.type] || 'Supplier');
const getDefaultOpeningBalanceType = (partyType) => (['supplier', 'transporter'].includes(partyType) ? 'payable' : 'receivable');
const resolveOpeningBalanceType = (party) => {
  const explicitType = String(party?.openingBalanceType || '').trim().toLowerCase();
  if (explicitType === 'receivable' || explicitType === 'payable') return explicitType;

  const balance = Number(party?.openingBalance || 0);
  if (!Number.isFinite(balance) || balance === 0) {
    return getDefaultOpeningBalanceType(party?.type);
  }

  if (['supplier', 'transporter'].includes(party?.type)) {
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
      setParties(Array.isArray(response) ? response : []);
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
    if (name === 'openingBalance') {
      setFormData((prev) => ({ ...prev, [name]: value }));
      return;
    }
    if (['tenMmRate', 'twentyMmRate', 'fortyMmRate', 'wmmRate', 'gsbRate', 'dustRate', 'boulderRatePerTon'].includes(name)) {
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
      isTransportProvider: isTransportProvider(party),
      name: String(party.name || ''),
      mobile: String(party.mobile || '').replace(/\D/g, '').slice(0, 10),
      openingBalance: Math.abs(Number(party.openingBalance || 0)) || '',
      openingBalanceType: resolveOpeningBalanceType(party),
      tenMmRate: Number(party.tenMmRate || 0) || '',
      twentyMmRate: Number(party.twentyMmRate || 0) || '',
      fortyMmRate: Number(party.fortyMmRate || 0) || '',
      wmmRate: Number(party.wmmRate || 0) || '',
      gsbRate: Number(party.gsbRate || 0) || '',
      dustRate: Number(party.dustRate || 0) || '',
      boulderRatePerTon: Number(party.boulderRatePerTon || 0) || '',
      boulderRatePerTrip: Number(party.boulderRatePerTrip || 0) || '',
      hireBasis: party.hireBasis || 'per_ton',
      hireRate: Number(party.hireRate || 0) || '',
      tripRates: (party.tripRates || []).map((row) => ({ location: row.location, rate: String(row.rate ?? '') }))
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

    if (!['supplier', 'customer', 'transporter', 'cash-in-hand'].includes(formData.type)) {
      setError('Party type is required');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        type: formData.type,
        name: String(formData.name || '').trim(),
        mobile: String(formData.mobile || '').trim(),
        openingBalance: Number(formData.openingBalance || 0),
        openingBalanceType: String(formData.openingBalanceType || getDefaultOpeningBalanceType(formData.type)),
        tenMmRate: Number(formData.tenMmRate || 0),
        twentyMmRate: Number(formData.twentyMmRate || 0),
        fortyMmRate: Number(formData.fortyMmRate || 0),
        wmmRate: Number(formData.wmmRate || 0),
        gsbRate: Number(formData.gsbRate || 0),
        dustRate: Number(formData.dustRate || 0),
        ...getSupplierRatesPayload(formData)
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

      <div className="mb-5 mt-1 grid grid-cols-3 gap-2 sm:gap-4 lg:flex lg:justify-start">
        <div className="group relative overflow-hidden rounded-xl bg-white p-2 sm:p-5 shadow-sm ring-1 ring-slate-200/50 transition-all hover:shadow-md lg:min-w-[200px]">
          <div className="flex items-start justify-between gap-1 sm:gap-2">
            <div className="min-w-0">
              <p className="text-[9px] sm:text-xs font-medium text-slate-500 leading-tight truncate">Total</p>
              <p className="mt-0.5 sm:mt-2 text-[13px] sm:text-2xl font-bold text-slate-800 leading-tight truncate">{parties.length}</p>
            </div>
            <div className="shrink-0 flex h-7 w-7 sm:h-12 sm:w-12 items-center justify-center rounded-lg sm:rounded-xl bg-blue-50 text-blue-600">
              <Wallet className="h-3.5 w-3.5 sm:h-6 sm:w-6" />
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-0.5 sm:h-1 bg-blue-500 opacity-80"></div>
        </div>

        <div className="group relative overflow-hidden rounded-xl bg-white p-2 sm:p-5 shadow-sm ring-1 ring-slate-200/50 transition-all hover:shadow-md lg:min-w-[200px]">
          <div className="flex items-start justify-between gap-1 sm:gap-2">
            <div className="min-w-0">
              <p className="text-[9px] sm:text-xs font-medium text-slate-500 leading-tight truncate">Suppliers</p>
              <p className="mt-0.5 sm:mt-2 text-[13px] sm:text-2xl font-bold text-emerald-600 leading-tight truncate">
                {parties.filter(p => p.type === 'supplier').length}
              </p>
            </div>
            <div className="shrink-0 flex h-7 w-7 sm:h-12 sm:w-12 items-center justify-center rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600">
              <Pencil className="h-3.5 w-3.5 sm:h-6 sm:w-6" />
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-0.5 sm:h-1 bg-emerald-500 opacity-80"></div>
        </div>

        <div className="group relative overflow-hidden rounded-xl bg-white p-2 sm:p-5 shadow-sm ring-1 ring-slate-200/50 transition-all hover:shadow-md lg:min-w-[200px]">
          <div className="flex items-start justify-between gap-1 sm:gap-2">
            <div className="min-w-0">
              <p className="text-[9px] sm:text-xs font-medium text-slate-500 leading-tight truncate">Customers</p>
              <p className="mt-0.5 sm:mt-2 text-[13px] sm:text-2xl font-bold text-amber-600 leading-tight truncate">
                {parties.filter(p => p.type === 'customer').length}
              </p>
            </div>
            <div className="shrink-0 flex h-7 w-7 sm:h-12 sm:w-12 items-center justify-center rounded-lg sm:rounded-xl bg-amber-50 text-amber-600">
              <Search className="h-3.5 w-3.5 sm:h-6 sm:w-6" />
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-0.5 sm:h-1 bg-amber-500 opacity-80"></div>
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
            {parties.length > 0 ? (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:hidden">
                  {parties.map((item) => (
                    <div
                      key={item._id}
                      onClick={() => handleOpenPartyLedger(item)}
                      className="group relative cursor-pointer overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:ring-2 hover:ring-indigo-500/20"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex gap-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20 transition-transform group-hover:scale-110">
                            <Wallet className="h-6 w-6" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="truncate text-base font-black text-slate-800 transition-colors group-hover:text-indigo-700">{item.name || '-'}</h3>
                            <p className={`mt-1 inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getTypeBadgeClass(item.type === 'transporter' ? 'supplier' : item.type)}`}>
                              {getTypeLabel(item)}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleEdit(item);
                          }}
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="mt-6 flex flex-col gap-3">
                        <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Mobile</span>
                          <span className="text-sm font-black text-slate-700">{item.mobile || '-'}</span>
                        </div>
                      </div>

                      {/* Action Hint */}
                      <div className="mt-4 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-300 transition-colors group-hover:text-indigo-400">
                        View Ledger <ChevronRight size={14} className="transition-transform group-hover:translate-x-1" />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[720px] border-separate border-spacing-0 text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-800 text-white">
                      <tr>
                        <th className="px-6 py-4 font-bold uppercase tracking-wider rounded-tl-2xl">Party Name</th>
                        <th className="px-6 py-4 font-bold uppercase tracking-wider">Type</th>
                        <th className="px-6 py-4 font-bold uppercase tracking-wider">Mobile</th>
                        <th className="px-6 py-4 font-bold uppercase tracking-wider text-center rounded-tr-2xl">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white/50">
                      {parties.map((item) => (
                        <tr
                          key={item._id}
                          onClick={() => handleOpenPartyLedger(item)}
                          className="cursor-pointer transition-colors hover:bg-indigo-50/50"
                        >
                          <td className="px-6 py-4 font-black text-slate-800">{item.name || '-'}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex rounded-md px-2.5 py-1 text-xs font-semibold capitalize ${getTypeBadgeClass(item.type === 'transporter' ? 'supplier' : item.type)}`}>
                              {getTypeLabel(item)}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-600">{item.mobile || '-'}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleEdit(item);
                                }}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white/80 px-6 py-16 text-center text-slate-500">
                <Users size={48} className="mx-auto mb-4 text-slate-300" />
                <p className="text-lg font-bold">No parties found</p>
                <p className="text-sm">Create your first party to get started</p>
              </div>
            )}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
