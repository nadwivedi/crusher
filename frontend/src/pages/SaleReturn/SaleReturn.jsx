import { useEffect, useMemo, useState } from 'react';
import { Boxes, RotateCcw, Search, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import apiClient from '../../utils/api';
import ReturnVoucherPopup from '../../components/ReturnVoucherPopup';

const TOAST_OPTIONS = { autoClose: 1200 };

const getInitialForm = () => ({
  sale: '',
  voucherDate: new Date().toISOString().split('T')[0],
  notes: ''
});

const formatInvoiceNumber = (value) => {
  const normalized = String(value || '').trim();
  if (!normalized) return '-';
  return normalized;
};

const getSalePartyLabel = (sale) => sale?.party?.name || sale?.customerName || 'Walk-in';

const formatDate = (value) => (value ? new Date(value).toLocaleDateString('en-GB') : '-');

const getSaleLabel = (sale) => `Invoice No. ${formatInvoiceNumber(sale?.invoiceNumber)}`;

// A sale is one material: tons (net weight is kept in kg) or cubic metres, at the sale rate
const isPerCubicMeter = (sale) => sale?.pricingMode === 'per_cubic_meter';

const getSaleQty = (sale) => (
  isPerCubicMeter(sale) ? Number(sale?.cubicMeterQty || 0) : Number(sale?.netWeight || 0) / 1000
);

// Older sales without a rate: bill minus transport, per unit (the server prices returns the same way)
const getSaleRate = (sale) => {
  const rate = Number(sale?.rate || 0);
  if (rate > 0) return rate;
  const qty = getSaleQty(sale);
  return qty > 0 ? Math.max(0, Number(sale?.totalAmount || 0) - Number(sale?.transportCharge || 0)) / qty : 0;
};

const formatReturnedItems = (entry) => (entry.items || [])
  .map((item) => `${item.productName} (${Number(item.quantity || 0)}${item.unit ? ` ${item.unit}` : ''})`)
  .join(', ');

const getSaleHint = (sale) => `${formatDate(sale?.saleDate)} · ${getSalePartyLabel(sale)} · ₹${Number(sale?.totalAmount || 0).toLocaleString('en-IN')}`;

export default function SaleReturn({ modalOnly = false, onModalFinish = null }) {
  const [entries, setEntries] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(getInitialForm());
  const [returnQuantities, setReturnQuantities] = useState({});

  useEffect(() => {
    fetchEntries();
  }, [search]);

  useEffect(() => {
    fetchSales();
  }, []);

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
    if (!modalOnly || showForm) return;
    handleOpenForm();
  }, [modalOnly, showForm]);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/sale-returns', { params: { search } });
      setEntries(response.data || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Error fetching sale returns');
    } finally {
      setLoading(false);
    }
  };

  const fetchSales = async () => {
    try {
      const response = await apiClient.get('/sales');
      setSales(Array.isArray(response) ? response : response?.data || []);
    } catch (err) {
      setError(err.message || 'Error fetching sales');
    }
  };

  const returnedMap = useMemo(() => {
    const map = new Map();
    entries.forEach((entry) => {
      (entry.items || []).forEach((item) => {
        const key = String(item.saleItemId || '');
        if (!key) return;
        map.set(key, (map.get(key) || 0) + Number(item.quantity || 0));
      });
    });
    return map;
  }, [entries]);

  const selectedSale = useMemo(
    () => sales.find((sale) => String(sale._id) === String(formData.sale)) || null,
    [sales, formData.sale]
  );

  const saleItems = useMemo(() => {
    if (!selectedSale) return [];
    const saleItemId = String(selectedSale._id);
    const soldQty = Math.round(getSaleQty(selectedSale) * 1000) / 1000;
    const returnedQty = Number(returnedMap.get(saleItemId) || 0);
    return [{
      saleItemId,
      productName: String(selectedSale.stoneSize || selectedSale.materialType || 'Material').toUpperCase(),
      unit: isPerCubicMeter(selectedSale) ? 'm3' : 'ton',
      soldQty,
      returnedQty,
      remainingQty: Math.max(0, Math.round((soldQty - returnedQty) * 1000) / 1000),
      unitPrice: Math.round(getSaleRate(selectedSale) * 100) / 100
    }];
  }, [selectedSale, returnedMap]);

  const selectedItems = useMemo(() => (
    saleItems
      .map((item) => ({ ...item, quantity: Number(returnQuantities[item.saleItemId] || 0) }))
      .filter((item) => item.quantity > 0)
  ), [saleItems, returnQuantities]);

  const totalAmount = selectedItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const totalReturnedAmount = entries.reduce((sum, entry) => sum + Number(entry.totalAmount || entry.amount || 0), 0);

  const handleOpenForm = () => {
    setFormData(getInitialForm());
    setReturnQuantities({});
    setError('');
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setFormData(getInitialForm());
    setReturnQuantities({});

    if (modalOnly && typeof onModalFinish === 'function') {
      onModalFinish();
    }
  };

  const handleQuantityChange = (saleItemId, value, maxQty) => {
    const normalized = String(value || '').replace(/[^\d.]/g, '');
    const parsed = Number(normalized);
    if (!normalized) {
      setReturnQuantities((prev) => ({ ...prev, [saleItemId]: '' }));
      return;
    }
    if (!Number.isFinite(parsed)) return;
    const safeValue = Math.max(0, Math.min(parsed, maxQty));
    setReturnQuantities((prev) => ({ ...prev, [saleItemId]: String(safeValue) }));
  };

  const handleDelete = async (entry) => {
    if (!window.confirm(`Delete sale return ${entry.voucherNumber || ''}?`)) return;
    try {
      await apiClient.delete(`/sale-returns/${entry._id}`);
      toast.success('Sale return deleted', TOAST_OPTIONS);
      fetchEntries();
      fetchSales();
    } catch (err) {
      toast.error(err.message || 'Error deleting sale return', TOAST_OPTIONS);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.sale) {
      setError('Sale number is required');
      return;
    }

    if (selectedItems.length === 0) {
      setError('Select at least one item and quantity to return');
      return;
    }

    try {
      setSaving(true);
      await apiClient.post('/sale-returns', {
        sale: formData.sale,
        voucherDate: formData.voucherDate,
        notes: formData.notes,
        items: selectedItems.map((item) => ({
          saleItemId: item.saleItemId,
          quantity: item.quantity
        }))
      });

      toast.success('Sale return voucher created successfully', TOAST_OPTIONS);
      setError('');
      handleCloseForm();
      fetchEntries();
      fetchSales();
    } catch (err) {
      setError(err.message || 'Error creating sale return voucher');
    } finally {
      setSaving(false);
    }
  };

  const handleReturnAll = () => {
    setReturnQuantities(Object.fromEntries(
      saleItems.filter((item) => item.remainingQty > 0).map((item) => [item.saleItemId, String(item.remainingQty)])
    ));
  };

  const formPopup = showForm && (
    <ReturnVoucherPopup
      title="Sale Return"
      subtitle="Goods sent back by a customer"
      sourceLabel="Invoice No."
      sourcePlaceholder="Search by invoice no. or party..."
      originalQtyLabel="Sold"
      notesPlaceholder="Reason for return, damaged items, customer confirmation, etc."
      submitLabel="Save Sale Return"
      sources={sales}
      sourceId={formData.sale}
      getSourceLabel={getSaleLabel}
      getSourceHint={getSaleHint}
      onSelectSource={(id) => { setFormData((prev) => ({ ...prev, sale: id })); setReturnQuantities({}); setError(''); }}
      summary={selectedSale ? [
        { label: 'Party', value: getSalePartyLabel(selectedSale) },
        { label: 'Sale Date', value: formatDate(selectedSale.saleDate) },
        { label: 'Bill Amount', value: `₹${Number(selectedSale.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
        { label: 'Vehicle', value: selectedSale.vehicleNo || '-' }
      ] : []}
      items={saleItems.map((item) => ({
        id: item.saleItemId,
        productName: item.productName,
        unit: item.unit,
        originalQty: item.soldQty,
        returnedQty: item.returnedQty,
        remainingQty: item.remainingQty,
        unitPrice: item.unitPrice
      }))}
      returnQuantities={returnQuantities}
      onQuantityChange={handleQuantityChange}
      onReturnAll={handleReturnAll}
      voucherDate={formData.voucherDate}
      notes={formData.notes}
      onFieldChange={(name, value) => setFormData((prev) => ({ ...prev, [name]: value }))}
      totalAmount={totalAmount}
      selectedCount={selectedItems.length}
      error={error}
      saving={saving}
      onSubmit={handleSubmit}
      onClose={handleCloseForm}
    />
  );

  // Opened from the dashboard or by its entry URL: only the popup, without the list page behind it
  if (modalOnly) {
    return (
      <>
        {error && !showForm && (
          <div className="fixed left-4 right-4 top-4 z-[60] rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 shadow-lg md:left-auto md:right-4 md:w-[26rem]">
            {error}
          </div>
        )}
        {formPopup}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      <div className="w-full px-3 pb-8 pt-4 md:px-4 lg:px-6 lg:pt-4">
        {error && <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>}

        <div className="mb-5 mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
          <div className="group relative overflow-hidden rounded-xl bg-white p-2.5 shadow-sm ring-1 ring-slate-200/50 transition-all hover:shadow-md sm:rounded-2xl sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-medium leading-tight text-slate-500 sm:text-xs">Sale Return Count</p>
                <p className="mt-1 text-base font-bold leading-tight text-slate-800 sm:mt-2 sm:text-2xl">{entries.length}</p>
              </div>
              <div className="hidden h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-transform group-hover:scale-110 sm:flex"><Boxes className="h-6 w-6" /></div>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-blue-500 to-cyan-400 opacity-80 sm:h-1"></div>
          </div>
          <div className="group relative overflow-hidden rounded-xl bg-white p-2.5 shadow-sm ring-1 ring-slate-200/50 transition-all hover:shadow-md sm:rounded-2xl sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-medium leading-tight text-slate-500 sm:text-xs">Return Amount</p>
                <p className="mt-1 text-[11px] font-bold leading-tight text-slate-800 sm:mt-2 sm:text-2xl"><span className="mr-1 text-[10px] font-medium text-slate-400 sm:text-base">Rs</span>{totalReturnedAmount.toFixed(2)}</p>
              </div>
              <div className="hidden h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition-transform group-hover:scale-110 sm:flex"><RotateCcw className="h-6 w-6" /></div>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-400 opacity-80 sm:h-1"></div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
          <div className="border-b border-gray-200 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 px-6 py-5">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
              <div className="relative w-full lg:w-[22%] lg:min-w-[260px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Search sale returns..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
              </div>
              <button onClick={handleOpenForm} className="inline-flex items-center justify-center whitespace-nowrap rounded-lg bg-slate-800 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-900">+ Add Sale Return</button>
            </div>
          </div>

          {loading ? (
            <div className="px-6 py-10 text-center text-slate-500">Loading...</div>
          ) : (
            <div className="rounded-[20px] border border-slate-200 bg-[radial-gradient(circle_at_top_right,rgba(148,163,184,0.16),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(241,245,249,0.96)_100%)] p-3 shadow-[0_18px_36px_rgba(15,23,42,0.08)] sm:p-5">
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[980px] border-separate border-spacing-0 text-left text-sm whitespace-nowrap">
                  <thead className="bg-[linear-gradient(135deg,#0f766e_0%,#0d9488_38%,#0891b2_72%,#0284c7_100%)] text-white">
                    <tr>
                      <th className="border-y-2 border-l-2 border-r border-black px-4 py-3.5 text-center text-sm font-semibold">Voucher No</th>
                      <th className="border-y-2 border-r border-black px-4 py-3.5 text-center text-sm font-semibold">Invoice No.</th>
                      <th className="border-y-2 border-r border-black px-4 py-3.5 text-center text-sm font-semibold">Party</th>
                      <th className="border-y-2 border-r border-black px-4 py-3.5 text-sm font-semibold">Returned Items</th>
                      <th className="border-y-2 border-r border-black px-4 py-3.5 text-center text-sm font-semibold">Date</th>
                      <th className="border-y-2 border-r border-black px-4 py-3.5 text-center text-sm font-semibold">Amount</th>
                      <th className="border-y-2 border-r-2 border-black px-4 py-3.5 text-center text-sm font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(248,250,252,0.98)_100%)] text-slate-600">
                    {entries.map((entry) => (
                      <tr key={entry._id} className="transition-colors duration-150 hover:bg-slate-200/45">
                        <td className="border border-slate-400 px-4 py-3 text-center font-semibold text-slate-800">{entry.voucherNumber || '-'}</td>
                        <td className="border border-slate-400 px-4 py-3 text-center">{formatInvoiceNumber(entry.sale?.invoiceNumber)}</td>
                        <td className="border border-slate-400 px-4 py-3 text-center">{entry.party?.name || entry.sale?.customerName || '-'}</td>
                        <td className="border border-slate-400 px-4 py-3"><div className="max-w-[24rem] truncate">{formatReturnedItems(entry) || '-'}</div></td>
                        <td className="border border-slate-400 px-4 py-3 text-center">{entry.voucherDate ? new Date(entry.voucherDate).toLocaleDateString('en-GB') : '-'}</td>
                        <td className="border border-slate-400 px-4 py-3 text-center font-semibold text-emerald-700">Rs {Number(entry.totalAmount || entry.amount || 0).toFixed(2)}</td>
                        <td className="border border-slate-400 px-2 py-2 text-center">
                          <button type="button" onClick={() => handleDelete(entry)} title="Delete sale return" aria-label="Delete sale return" className="rounded-lg p-1.5 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!entries.length && <tr><td colSpan="7" className="border border-slate-400 px-6 py-10 text-center text-slate-500">No sale returns found</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {formPopup}
      </div>
    </div>
  );
}
