import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { Minus, Plus } from 'lucide-react';
import apiClient from '../utils/api';
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
  const firstFieldRef = useRef(null);

  const stockOptions = useMemo(
    () => products.map((product) => ({ value: product._id, label: product.name })),
    [products]
  );

  const isIncrease = formData.adjustmentType === 'add';
  const selectedProduct = products.find((product) => product._id === formData.stockItem);
  const unit = selectedProduct?.unit || '';
  const inStock = Number(selectedProduct?.currentStock) || 0;
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
    setFormData(buildInitialForm());
    setError('');
    setShowForm(true);
  };

  const handleCloseForm = () => {
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
      await apiClient.post('/stock-adjustments', {
        voucherDate: parsedDate,
        stockItem: formData.stockItem,
        quantity,
        reason: formData.reason.trim(),
        notes: formData.notes.trim(),
        adjustmentType: formData.adjustmentType
      });
      toast.success(isIncrease ? 'Stock increased successfully' : 'Stock decreased successfully');
      handleCloseForm();
      await Promise.all([refreshEntries(), fetchProducts()]);
    } catch (submitError) {
      setError(submitError?.response?.data?.message || submitError.message || 'Error saving stock adjustment');
    } finally {
      setSaving(false);
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
          title="Add Stock Adjustment"
          subtitle="Increase or decrease the stock of an item"
          submitLabel={saving ? 'Saving...' : 'Save Adjustment'}
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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    Loading...
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
