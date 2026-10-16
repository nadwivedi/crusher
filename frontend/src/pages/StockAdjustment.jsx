import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { Minus, Pencil, Plus, Trash2 } from 'lucide-react';
import apiClient from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { canDeleteEntries, canEditEntry } from '../utils/staffAccess';
import FormPopup from '../components/FormPopup';
import { handlePopupFormKeyDown } from '../utils/popupFormKeyboard';

const ADJUSTMENT_TYPES = [
  { key: 'add', label: 'Increase Stock', Icon: Plus, activeClass: 'border-emerald-600 bg-emerald-600 text-white' },
  { key: 'subtract', label: 'Decrease Stock', Icon: Minus, activeClass: 'border-rose-600 bg-rose-600 text-white' }
];

const REASON_OPTIONS = {
  add: [
    'Extra stock found in counting',
    'Entry correction',
    'Other additions'
  ],
  subtract: [
    'Loss due to expiry date',
    'Theft loss',
    'Other losses'
  ]
};

const buildInitialForm = () => ({
  adjustmentType: 'subtract',
  voucherDate: new Date().toISOString().split('T')[0],
  stockItem: '',
  quantity: '',
  reason: '',
  notes: ''
});

const formatQty = (value) => Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 6 });

const parseVoucherDateValue = (value) => {
  const normalized = String(value || '').trim();
  if (!normalized) return null;

  const isoMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, yearText, monthText, dayText] = isoMatch;
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    const parsed = new Date(year, month - 1, day);
    if (!Number.isNaN(parsed.getTime()) && parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day) {
      return parsed;
    }
  }

  const manualMatch = normalized.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
  if (manualMatch) {
    const [, dayText, monthText, yearText] = manualMatch;
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    const parsed = new Date(year, month - 1, day);
    if (!Number.isNaN(parsed.getTime()) && parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day) {
      return parsed;
    }
  }

  return null;
};

export default function StockAdjustment({ modalOnly = false, onModalFinish = null }) {
  const [entries, setEntries] = useState([]);
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState(buildInitialForm());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  // The adjustment being edited; null while adding a new one
  const [editing, setEditing] = useState(null);
  const { user } = useAuth();
  const firstFieldRef = useRef(null);

  const stockOptions = useMemo(
    () => products.map((product) => ({ value: product._id, label: product.name })),
    [products]
  );

  const isIncrease = formData.adjustmentType === 'add';
  const selectedProduct = products.find((product) => product._id === formData.stockItem);
  const unit = selectedProduct?.unit || '';
  // While editing, the item's stock is shown as it was before this adjustment
  const editingEffect = editing && String(editing.stockItem) === String(formData.stockItem)
    ? (editing.adjustmentType === 'add' ? 1 : -1) * (Number(editing.quantity) || 0)
    : 0;
  const inStock = (Number(selectedProduct?.currentStock) || 0) - editingEffect;
  const quantityValue = Number(formData.quantity) || 0;
  const stockAfter = Math.round((inStock + (isIncrease ? quantityValue : -quantityValue)) * 1e6) / 1e6;
  const exceedsStock = Boolean(selectedProduct) && stockAfter < 0;

  useEffect(() => {
    if (!modalOnly || showForm) return;
    setShowForm(true);
  }, [modalOnly, showForm]);

  useEffect(() => {
    if (!showForm) return;
    const timer = setTimeout(() => {
      firstFieldRef.current?.focus();
    }, 0);
    return () => clearTimeout(timer);
  }, [showForm]);

  const fetchProducts = async () => {
    try {
      const response = await apiClient.get('/products');
      setProducts(Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : []);
    } catch (fetchError) {
      console.error('Error fetching stock items for stock adjustment:', fetchError);
      setProducts([]);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const refreshEntries = async () => {
    const response = await apiClient.get('/stock-adjustments', { params: { search } });
    setEntries(Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : []);
  };

  useEffect(() => {
    const fetchEntries = async () => {
      try {
        setLoading(true);
        await refreshEntries();
        setError('');
      } catch (fetchError) {
        setEntries([]);
        setError(fetchError?.response?.data?.message || fetchError.message || 'Error fetching stock adjustments');
      } finally {
        setLoading(false);
      }
    };

    fetchEntries();
  }, [search]);

  const handleOpenForm = () => {
    setEditing(null);
    setFormData(buildInitialForm());
    setError('');
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setEditing(null);
    setFormData(buildInitialForm());
    setError('');
    setShowForm(false);

    if (modalOnly && typeof onModalFinish === 'function') {
      onModalFinish();
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const selectAdjustmentType = (adjustmentType) => {
    if (adjustmentType === formData.adjustmentType) return;
    setFormData((prev) => ({ ...prev, adjustmentType, reason: '' }));
    setError('');
  };

  const handleSubmit = async () => {
    if (saving) return;

    if (!String(formData.stockItem || '').trim()) {
      setError('Stock Item is required');
      return;
    }

    const quantity = Number(formData.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError('Quantity must be greater than 0');
      return;
    }

    if (exceedsStock) {
      setError(`Only ${formatQty(inStock)} ${unit} in stock`);
      return;
    }

    const parsedDate = parseVoucherDateValue(formData.voucherDate);
    if (!parsedDate) {
      setError('Valid date is required');
      return;
    }

    if (!String(formData.reason || '').trim()) {
      setError('Reason is required');
      return;
    }

    try {
      setSaving(true);
      setError('');
      const body = {
        voucherDate: parsedDate,
        stockItem: formData.stockItem,
        quantity,
        reason: formData.reason.trim(),
        notes: formData.notes.trim(),
        adjustmentType: formData.adjustmentType
      };
      if (editing) await apiClient.put(`/stock-adjustments/${editing._id}`, body);
      else await apiClient.post('/stock-adjustments', body);
      toast.success(editing ? 'Adjustment updated' : isIncrease ? 'Stock increased successfully' : 'Stock decreased successfully');
      handleCloseForm();
      await Promise.all([refreshEntries(), fetchProducts()]);
    } catch (submitError) {
      setError(submitError?.response?.data?.message || submitError.message || 'Error saving stock adjustment');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item) => {
    setEditing(item);
    setFormData({
      ...buildInitialForm(),
      adjustmentType: item.adjustmentType,
      voucherDate: item.voucherDate ? new Date(item.voucherDate).toLocaleDateString('en-CA') : buildInitialForm().voucherDate,
      stockItem: String(item.stockItem || ''),
      quantity: String(item.quantity ?? ''),
      reason: item.reason || '',
      notes: item.notes || ''
    });
    setError('');
    setShowForm(true);
  };

  // Deleting undoes the adjustment: the stock goes back to what it was before it
  const handleDelete = async (item) => {
    const undo = item.adjustmentType === 'add' ? 'reduces' : 'increases';
    if (!window.confirm(`Delete ${item.voucherNumber || 'this adjustment'}? This ${undo} ${item.stockItemName} stock by ${formatQty(item.quantity)} ${item.unit || ''}.`)) return;
    try {
      await apiClient.delete(`/stock-adjustments/${item._id}`);
      toast.success('Adjustment deleted');
      await Promise.all([refreshEntries(), fetchProducts()]);
    } catch (deleteError) {
      toast.error(deleteError.message || 'Could not delete the adjustment');
    }
  };

  return (
    <div className={modalOnly ? '' : 'px-3 pb-6 pt-4 sm:px-4 md:px-6'}>
      {!modalOnly && (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={handleOpenForm}
            className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + Add Stock Adjustment
          </button>

          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search stock adjustments"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 sm:max-w-xs"
          />
        </div>
      )}

      {showForm && (
        <FormPopup
          title={editing ? `Edit ${editing.voucherNumber || 'Stock Adjustment'}` : 'Add Stock Adjustment'}
          subtitle="Increase or decrease the stock of an item"
          submitLabel={saving ? 'Saving...' : editing ? 'Update Adjustment' : 'Save Adjustment'}
          maxWidth="max-w-lg"
          onSubmit={handleSubmit}
          onClose={handleCloseForm}
          onKeyDown={(event) => handlePopupFormKeyDown(event, handleCloseForm)}
        >
          {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}

          <div className="grid grid-cols-2 gap-2">
            {ADJUSTMENT_TYPES.map((type) => (
              <button
                key={type.key}
                type="button"
                onClick={() => selectAdjustmentType(type.key)}
                aria-pressed={formData.adjustmentType === type.key}
                className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                  formData.adjustmentType === type.key ? type.activeClass : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                <type.Icon size={16} />
                {type.label}
              </button>
            ))}
          </div>

          <div>
            <label className="label">Stock Item *</label>
            <select ref={firstFieldRef} className="input" name="stockItem" value={formData.stockItem} onChange={handleChange}>
              <option value="">Select stock item</option>
              {stockOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {selectedProduct && (
            <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-xl bg-slate-200 ring-1 ring-slate-200">
              {[
                { label: 'In Stock', value: `${formatQty(inStock)} ${unit}`, tone: 'text-slate-900' },
                {
                  label: isIncrease ? 'Increase By' : 'Decrease By',
                  value: quantityValue > 0 ? `${isIncrease ? '+' : '−'} ${formatQty(quantityValue)} ${unit}` : '-',
                  tone: isIncrease ? 'text-emerald-700' : 'text-amber-700'
                },
                { label: 'Stock After', value: `${formatQty(stockAfter)} ${unit}`, tone: exceedsStock ? 'text-rose-700' : 'text-emerald-700' }
              ].map((stat) => (
                <div key={stat.label} className="bg-white px-3 py-2">
                  <dt className="text-[11px] font-medium text-slate-500">{stat.label}</dt>
                  <dd className={`truncate text-sm font-bold ${stat.tone}`}>{stat.value}</dd>
                </div>
              ))}
            </dl>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Quantity *</label>
              <div className="relative">
                <input
                  className={`input ${unit ? 'pr-14' : ''}`}
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  step="0.000001"
                  min="0.000001"
                  placeholder="0"
                />
                {unit && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-slate-400">{unit}</span>}
              </div>
              {exceedsStock && <p className="mt-1 text-xs font-medium text-rose-600">Only {formatQty(inStock)} {unit} in stock</p>}
            </div>
            <div>
              <label className="label">Date *</label>
              <input className="input" type="date" name="voucherDate" value={formData.voucherDate} onChange={handleChange} />
            </div>
          </div>

          <div>
            <label className="label">Reason *</label>
            <select className="input" name="reason" value={formData.reason} onChange={handleChange}>
              <option value="">Select reason</option>
              {/* An older entry's reason that is no longer in the list still shows when editing */}
              {formData.reason && !REASON_OPTIONS[formData.adjustmentType].includes(formData.reason) && (
                <option value={formData.reason}>{formData.reason}</option>
              )}
              {REASON_OPTIONS[formData.adjustmentType].map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Notes</label>
            <input className="input" type="text" name="notes" value={formData.notes} onChange={handleChange} placeholder="Optional" />
          </div>
        </FormPopup>
      )}

      {!modalOnly && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full whitespace-nowrap text-left text-sm">
              <thead className="bg-slate-800 text-white">
                <tr>
                  <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider">Voucher No</th>
                  <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider">Stock Item</th>
                  <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider">Quantity</th>
                  <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider">Reason</th>
                  <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider">Notes</th>
                  <th className="px-6 py-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                      Loading...
                    </td>
                  </tr>
                ) : entries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                      No stock adjustments found
                    </td>
                  </tr>
                ) : (
                  entries.map((item) => (
                    <tr key={item._id} className="bg-white transition-colors duration-200 hover:bg-slate-50">
                      <td className="px-6 py-4 text-slate-600">{item.voucherDate ? new Date(item.voucherDate).toLocaleDateString() : '-'}</td>
                      <td className="px-6 py-4 font-semibold text-slate-800">{item.voucherNumber || '-'}</td>
                      <td className="px-6 py-4 text-slate-700">{item.stockItemName || '-'}</td>
                      <td className={`px-6 py-4 font-semibold ${item.adjustmentType === 'add' ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {item.adjustmentType === 'add' ? '+' : '−'} {formatQty(item.quantity)} {item.unit || ''}
                      </td>
                      <td className="px-6 py-4 text-slate-700">{item.reason || '-'}</td>
                      <td className="px-6 py-4 text-slate-500">{item.notes || '-'}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-end">
                          {canEditEntry(user, item) && (
                            <button type="button" title="Edit" aria-label="Edit" className="icon-btn p-1.5 hover:bg-blue-50 hover:text-blue-600" onClick={() => handleEdit(item)}>
                              <Pencil size={15} />
                            </button>
                          )}
                          {canDeleteEntries(user) && (
                            <button type="button" title="Delete" aria-label="Delete" className="icon-btn p-1.5 hover:bg-rose-50 hover:text-rose-600" onClick={() => handleDelete(item)}>
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
