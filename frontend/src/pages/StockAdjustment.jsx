import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import apiClient from '../utils/api';
import { handlePopupFormKeyDown } from '../utils/popupFormKeyboard';

const REASON_OPTIONS = [
  'Loss due to expiry date',
  'Theft loss',
  'Other losses'
];

const buildInitialForm = () => ({
  voucherDate: new Date().toISOString().split('T')[0],
  stockItem: '',
  quantity: '',
  reason: '',
  notes: ''
});

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
    () => products.map((product) => ({ value: product.name, label: product.name })),
    [products]
  );

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

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await apiClient.get('/products');
        setProducts(Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : []);
      } catch (fetchError) {
        console.error('Error fetching stock items for stock adjustment:', fetchError);
        setProducts([]);
      }
    };

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

  const handleSubmit = async (event) => {
    event.preventDefault();

    const parsedDate = parseVoucherDateValue(formData.voucherDate);
    if (!parsedDate) {
      setError('Valid date is required');
      return;
    }

    if (!String(formData.stockItem || '').trim()) {
      setError('Stock Item is required');
      return;
    }

    const quantity = Number(formData.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError('Quantity must be greater than 0');
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
        stockItem: formData.stockItem.trim(),
        quantity,
        reason: formData.reason.trim(),
        notes: formData.notes.trim(),
        adjustmentType: 'subtract'
      });
      toast.success('Stock adjustment created successfully');
      handleCloseForm();
      await refreshEntries();
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={handleCloseForm}>
          <div className="w-full max-w-5xl rounded-2xl border border-gray-200 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-xl font-bold text-gray-800">Add New Stock Adjustment</h2>
              <button
                type="button"
                onClick={handleCloseForm}
                className="h-9 w-9 rounded-full border border-gray-300 text-gray-500 transition hover:border-gray-400 hover:text-gray-700"
                aria-label="Close popup"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} onKeyDown={(event) => handlePopupFormKeyDown(event, handleCloseForm)} className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-slate-600">Date</label>
                <input
                  ref={firstFieldRef}
                  type="text"
                  name="voucherDate"
                  value={formData.voucherDate}
                  onChange={handleChange}
                  placeholder="DD-MM-YYYY"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-600">Stock Item *</label>
                <select
                  name="stockItem"
                  value={formData.stockItem}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option value="">Select stock item</option>
                  {stockOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-600">Quantity *</label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  step="0.000001"
                  min="0.000001"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-600">Reason *</label>
                <select
                  name="reason"
                  value={formData.reason}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option value="">Select reason</option>
                  {REASON_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm text-slate-600">Notes</label>
                <input
                  type="text"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Optional note"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              {error && (
                <div className="md:col-span-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {error}
                </div>
              )}

              <div className="md:col-span-2 flex items-end gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-white transition hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
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
                    <td className="px-6 py-4 text-slate-700">{item.stockItem || '-'}</td>
                    <td className="px-6 py-4 text-slate-700">{item.quantity ?? '-'}</td>
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
