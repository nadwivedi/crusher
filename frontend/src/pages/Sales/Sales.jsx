import { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Banknote, ClipboardList, CreditCard, Eye, FileSpreadsheet, FileText, Filter, Inbox, IndianRupee, Layers, Pencil, Plus, RefreshCw, Scale, Search, Trash2, X } from 'lucide-react';
import { toast } from 'react-toastify';
import apiClient from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { canDeleteEntries, canEditEntry } from '../../utils/staffAccess';
import { getSmartVehicleMatch, normalizeVehicleValue } from '../../utils/vehicleMatching';
import useAccounts from '../../utils/useAccounts';
import { getPartyMaterialRate, getPartySaleRatesPayload } from '../../utils/partyRates';
import { getSaleGstAmount, getSavedSaleGst } from '../../utils/saleGst';
import { getSaleRoyaltyAmount, getSaleRoyaltyQty, getSavedSaleRoyalty } from '../../utils/saleRoyalty';
import { PERIOD_BASES, getBasisUnit, getOwnershipLabel, getSaleTransport, getSaleTransportCharge, getTripRate, getSupplierRatesPayload, getVehicleHireRates, getVehicleOwnerIds } from '../../utils/transport';
import AddPartyPopup from '../Party/component/AddPartyPopup';
import AddProductPopup from '../Products/component/AddProductPopup';
import AddVehiclePopup from '../Vehicle/component/AddVehiclePopup';
import AddSalePopup from './component/AddSalePopup';
import SaleDetailsPopup from './component/SaleDetailsPopup';
import StatCard from '../../components/StatCard';
import Segmented from '../../components/Segmented';
import CustomRangePopup, { formatRangeLabel, toLocalDateInput } from '../../components/CustomRangePopup';
import { downloadExcel, getExportFileName } from '../../utils/excelExport';
import { downloadPdf } from '../../utils/pdfExport';
import MonthPickerPopup, { formatMonthLabel } from '../../components/MonthPickerPopup';

const isCompleteVehicleNumber = (value) => normalizeVehicleValue(value).length >= 9;

const MATERIAL_TYPE_OPTIONS = [
  { value: '60mm', label: '60mm' },
  { value: '40mm', label: '40mm' },
  { value: '20mm', label: '20mm' },
  { value: '10mm', label: '10mm' },
  { value: '6mm', label: '6mm' },
  { value: '4mm', label: '4mm' },
  { value: 'wmm', label: 'WMM' },
  { value: 'gsb', label: 'GSB' },
  { value: 'dust', label: 'Dust' }
];

const SALE_BASIS_OPTIONS = [
  { value: 'per_ton', label: 'Per Ton' },
  { value: 'per_cubic_meter', label: 'Per Cubic Feet' }
];

const formatDateForInput = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return date.toISOString().split('T')[0];
};

const formatTimeForInput = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

const combineSaleDateTime = (dateValue, timeValue) => {
  const date = dateValue instanceof Date ? new Date(dateValue) : new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;

  const normalizedTime = String(timeValue || '').trim();
  if (!normalizedTime) return date;

  const timeMatch = normalizedTime.match(/^(\d{1,2}):(\d{2})$/);
  if (!timeMatch) return date;

  const [, hourText, minuteText] = timeMatch;
  date.setHours(Number(hourText), Number(minuteText), 0, 0);
  return date;
};

const parseSaleDate = (value) => {
  const normalized = String(value || '').trim();
  if (!normalized) return null;

  const yyyymmddMatch = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const ddmmyyyyMatch = normalized.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);

  let dayText;
  let monthText;
  let yearText;

  if (yyyymmddMatch) {
    [, yearText, monthText, dayText] = yyyymmddMatch;
  } else if (ddmmyyyyMatch) {
    [, dayText, monthText, yearText] = ddmmyyyyMatch;
  } else {
    return null;
  }

  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);
  const date = new Date(year, month - 1, day);

  if (
    Number.isNaN(date.getTime())
    || date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
  ) {
    return null;
  }

  return date;
};

// Transport fields of a sale carried by the party's own vehicle
const NO_SALE_TRANSPORT = {
  transportMode: 'party',
  transportCharge: '',
  transporterId: '',
  transportBasis: 'per_ton',
  transportLocation: '',
  transportQty: '',
  transportRate: ''
};

// The transport fields a sale starts with when this vehicle is picked. A hired vehicle is paid at its own pay terms.
const getVehicleTransportDefaults = (vehicle, currentCharge = '') => {
  if (vehicle?.ownership === 'own') {
    return { ...NO_SALE_TRANSPORT, transportMode: 'own', transportCharge: currentCharge };
  }

  if (vehicle?.ownership === 'hired') {
    const hire = getVehicleHireRates(vehicle);
    // A per-trip vehicle with a single location needs no picking
    if (hire.hireBasis === 'per_trip') {
      const onlyTrip = hire.tripRates.length === 1 ? hire.tripRates[0] : null;
      return {
        ...NO_SALE_TRANSPORT,
        transportMode: 'hired',
        transportCharge: currentCharge,
        transporterId: typeof vehicle.partyId === 'object' ? vehicle.partyId?._id || '' : vehicle.partyId || '',
        transportBasis: 'per_trip',
        transportLocation: onlyTrip?.location || '',
        transportRate: Number(onlyTrip?.rate || 0) > 0 ? String(onlyTrip.rate) : ''
      };
    }

    return {
      ...NO_SALE_TRANSPORT,
      transportMode: 'hired',
      transportCharge: currentCharge,
      transporterId: typeof vehicle.partyId === 'object' ? vehicle.partyId?._id || '' : vehicle.partyId || '',
      transportBasis: hire.hireBasis,
      transportRate: hire.hireRate > 0 ? String(hire.hireRate) : ''
    };
  }

  return { ...NO_SALE_TRANSPORT };
};

// A new sale starts per ton or per cubic feet, as set in Settings
const getInitialFormData = (pricingMode = 'per_ton') => ({
  saleDate: formatDateForInput(),
  invoiceNumber: '',
  rstNo: '',
  entryTime: '',
  exitTime: '',
  party: '',
  vehicleId: '',
  customerName: '',
  customerPhone: '',
  customerAddress: '',
  vehicleNo: '',
  driverName: '',
  materialType: '',
  tareWeight: '',
  grossWeight: '',
  netWeight: '',
  pricingMode,
  cubicMeterQty: '',
  rate: '',
  dispatchLocation: '',
  ...NO_SALE_TRANSPORT,
  // GST sale: GST % of material + royalty is added to the total; transport carries no GST
  isGst: false,
  gstRate: '',
  // Royalty sale: royalty tons x royalty rate per ton is added before GST
  isRoyalty: false,
  royaltyNo: '',
  royaltyRate: '',
  royaltyQty: '',
  totalAmount: 0,
  // Most sales are on credit: nothing paid unless entered
  paidAmount: '0',
  account: '',
  slipImg: '',
  notes: '',
  items: []
});

const getInitialPartyFormData = (type = 'customer') => ({
  type,
  name: '',
  mobile: '',
  email: '',
  address: '',
  state: '',
  pincode: '',
  openingBalance: '',
  openingBalanceType: type === 'supplier' ? 'payable' : 'receivable',
  tenMmRate: '',
  twentyMmRate: '',
  fortyMmRate: '',
  wmmRate: '',
  gsbRate: '',
  dustRate: '',
  boulderRatePerTon: '',
  boulderRatePerTrip: ''
});

const getCrusherRateKey = (materialType, pricingMode = 'per_ton') => {
  if (materialType === '10mm') return pricingMode === 'per_cubic_meter' ? 'tenMmRatePerCubicMeter' : 'tenMmRate';
  if (materialType === '20mm') return pricingMode === 'per_cubic_meter' ? 'twentyMmRatePerCubicMeter' : 'twentyMmRate';
  if (materialType === '40mm') return pricingMode === 'per_cubic_meter' ? 'fortyMmRatePerCubicMeter' : 'fortyMmRate';
  if (materialType === '60mm') return pricingMode === 'per_cubic_meter' ? 'sixtyMmRatePerCubicMeter' : 'sixtyMmRate';
  if (materialType === '6mm') return pricingMode === 'per_cubic_meter' ? 'sixMmRatePerCubicMeter' : 'sixMmRate';
  if (materialType === '4mm') return pricingMode === 'per_cubic_meter' ? 'fourMmRatePerCubicMeter' : 'fourMmRate';
  if (materialType === 'wmm') return pricingMode === 'per_cubic_meter' ? 'wmmRatePerCubicMeter' : 'wmmRate';
  if (materialType === 'gsb') return pricingMode === 'per_cubic_meter' ? 'gsbRatePerCubicMeter' : 'gsbRate';
  if (materialType === 'dust') return pricingMode === 'per_cubic_meter' ? 'dustRatePerCubicMeter' : 'dustRate';
  return '';
};

const toTitleCase = (value) => String(value || '')
  .toLowerCase()
  .replace(/\b[a-z]/g, (char) => char.toUpperCase());

const getSalePriceInputValue = (product) => String(Number(product?.salePrice || 0));
const getSaleQuantityValue = (pricingMode, netWeight, cubicMeterQty) => {
  if (pricingMode === 'per_cubic_meter') {
    const numericCubicMeterQty = Number(cubicMeterQty || 0);
    return Number.isFinite(numericCubicMeterQty) ? numericCubicMeterQty : 0;
  }

  const numericNetWeight = Number(netWeight || 0);
  return Number.isFinite(numericNetWeight) ? numericNetWeight / 1000 : 0;
};

const calculateSaleTotalAmount = ({ pricingMode, netWeight, cubicMeterQty, rate }) => {
  const numericRate = Number(rate || 0);
  const quantity = getSaleQuantityValue(pricingMode, netWeight, cubicMeterQty);
  if (!Number.isFinite(quantity) || !Number.isFinite(numericRate)) return 0;
  return quantity * numericRate;
};

const getSafeNetWeight = (grossWeight, tareWeight) => {
  const gross = Number(grossWeight || 0);
  const tare = Number(tareWeight || 0);
  const derived = gross - tare;
  if (!Number.isFinite(derived)) return 0;
  return Math.max(0, derived);
};

const getCrusherMaterialRate = (user, materialType, pricingMode = 'per_ton') => {
  const rates = user?.materialRates || {};
  const rateKey = getCrusherRateKey(materialType, pricingMode);
  return rateKey ? Number(rates[rateKey] || 0) : 0;
};

const getSaleRateForParty = (user, party, materialType, pricingMode = 'per_ton') => {
  const partyRate = getPartyMaterialRate(party, materialType, pricingMode);
  if (partyRate > 0) return partyRate;
  return getCrusherMaterialRate(user, materialType, pricingMode);
};

// What GST is charged on: the material amount plus the royalty on a royalty sale. Transport is not taxed.
const getSaleTaxableAmount = (payload = {}) => calculateSaleTotalAmount({
  pricingMode: payload.pricingMode,
  netWeight: payload.netWeight,
  cubicMeterQty: payload.cubicMeterQty,
  rate: payload.rate,
}) + getSaleRoyaltyAmount(payload);

// The sale total: material + royalty, plus GST on those two for a GST sale, plus the transport charged to the party (no GST on it)
const recalculateSaleAmount = (payload = {}) => {
  const taxable = getSaleTaxableAmount(payload);
  return taxable + getSaleGstAmount(payload, taxable) + getSaleTransportCharge(payload);
};

const deriveSaleType = (totalAmountValue, paidAmountValue) => {
  const totalAmount = Math.max(0, Number(totalAmountValue || 0));
  const paidAmount = Math.max(0, Number(paidAmountValue || 0));

  if (paidAmount <= 0) return 'credit';
  if (paidAmount >= totalAmount) return 'cash';
  return 'partial';
};

const formatSaleTypeLabel = (value) => {
  if (value === 'cash') return 'Cash';
  if (value === 'partial') return 'Partial';
  return 'Credit';
};

const formatQty = (value) => Number(value || 0).toLocaleString('en-IN', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});

const formatDate = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatTons = (kg) => (Number(kg || 0) / 1000).toLocaleString('en-IN', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

// What a sale row shows as its quantity: net weight in tons, or the cubic feet of a volume sale that was not weighed
const formatSaleQty = (sale, view) => (
  view.isCubic && !view.netWeight ? `${formatQty(sale.cubicMeterQty)} cft` : view.netWeight ? `${formatTons(view.netWeight)} T` : '—'
);

// "06 Nov" for this year, "06 Nov 25" for an older sale
const formatShortDate = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '-';
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', ...(sameYear ? {} : { year: '2-digit' }) });
};

const entryCount = (count) => `${formatQty(count)} entr${count === 1 ? 'y' : 'ies'}`;

// Tons sold of a material (every sale with a weight), and the cubic feet of its sales billed by volume.
// A sale can have both, so the two are shown side by side, not added.
const getMaterialQtyLabel = (row) => {
  const tons = `${formatQty(row.totalWeight / 1000)} T`;
  return row.totalCubicMeter > 0 ? `${tons} · ${formatQty(row.totalCubicMeter)} cft` : tons;
};

const SALE_TYPE_BADGE = { cash: 'badge-green', partial: 'badge-orange', credit: 'badge-red' };

const getSaleBasisDisplayName = (value) => (
  SALE_BASIS_OPTIONS.find((option) => option.value === value)?.label || 'Per Ton'
);

const getMaterialBadgeClass = (value) => {
  const normalized = String(value || '').trim().toLowerCase();

  if (normalized === '60mm') return 'border border-rose-200 bg-rose-50 text-rose-700';
  if (normalized === '40mm') return 'border border-violet-200 bg-violet-50 text-violet-700';
  if (normalized === '20mm') return 'border border-emerald-200 bg-emerald-50 text-emerald-700';
  if (normalized === '10mm') return 'border border-sky-200 bg-sky-50 text-sky-700';
  if (normalized === '6mm') return 'border border-cyan-200 bg-cyan-50 text-cyan-700';
  if (normalized === '4mm') return 'border border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700';
  if (normalized === 'wmm') return 'border border-amber-200 bg-amber-50 text-amber-700';
  if (normalized === 'gsb') return 'border border-lime-200 bg-lime-50 text-lime-700';
  if (normalized === 'dust') return 'border border-slate-200 bg-slate-100 text-slate-700';

  return 'border border-orange-200 bg-orange-50 text-orange-700';
};

const sortVehiclesByTypePreference = (vehicles, preferredType) => [...vehicles].sort((a, b) => {
  const aPreferred = a?.vehicleType === preferredType ? 0 : 1;
  const bPreferred = b?.vehicleType === preferredType ? 0 : 1;
  if (aPreferred !== bPreferred) return aPreferred - bPreferred;

  return String(a?.vehicleNo || '').localeCompare(String(b?.vehicleNo || ''));
});

// Period pills; the keys are the ranges getRangeBounds understands
const SALES_RANGE_OPTIONS = [
  { key: 'lifetime', label: 'All' },
  { key: '3d', label: '3 Days' },
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
  { key: '90d', label: '90 Days' },
  { key: 'month', label: 'Month' },
  { key: 'currentYear', label: 'This Year', shortLabel: 'Year' },
  { key: 'custom', label: 'Custom' }
];

// The two views of the data panel
const TABS = [
  { key: 'entries', label: 'Entries', icon: ClipboardList },
  { key: 'materials', label: 'Material-wise', icon: Layers }
];

const GST_FILTER_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'gst', label: 'GST' },
  { key: 'non_gst', label: 'Non-GST' }
];

const ROYALTY_FILTER_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'royalty', label: 'Royalty' },
  { key: 'non_royalty', label: 'Non-Royalty' }
];

/** One row of choice chips in the filter menu. */
function FilterChips({ label, options, value, onChange }) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange(option.key)}
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset transition ${
              value === option.key
                ? 'bg-primary-600 text-white ring-primary-600'
                : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Filter icon with a drop-down: period, GST / non-GST, royalty / non-royalty and material.
 * The badge counts the filters that are not "All". Esc or a click outside closes it.
 */
function SalesFilterMenu({ rangeOptions, range, onRangeChange, gst, onGstChange, royalty, onRoyaltyChange, materials, material, onMaterialChange, onClear }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const activeCount = [range !== 'lifetime', gst !== 'all', royalty !== 'all', Boolean(material)].filter(Boolean).length;

  useEffect(() => {
    if (!open) return undefined;
    const handlePointer = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) setOpen(false);
    };
    // Capture phase, so this Esc closes the menu before the page's own Esc handler sees it
    const handleKey = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('touchstart', handlePointer);
    document.addEventListener('keydown', handleKey, true);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('touchstart', handlePointer);
      document.removeEventListener('keydown', handleKey, true);
    };
  }, [open]);

  // Month and Custom open their own popups, so the menu steps aside
  const pickRange = (key) => {
    if (key === 'month' || key === 'custom') setOpen(false);
    onRangeChange(key);
  };

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        title="Filter sales"
        aria-label="Filter sales"
        aria-expanded={open}
        className={`icon-btn relative ${activeCount ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-200' : ''}`}
      >
        <Filter size={16} />
        {activeCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-600 px-1 text-[10px] font-bold leading-none text-white">
            {activeCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] space-y-3.5 rounded-xl bg-white p-4 shadow-xl ring-1 ring-slate-200">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-slate-800">Filter Sales</p>
            {activeCount > 0 && (
              <button type="button" onClick={onClear} className="text-xs font-semibold text-primary-700 hover:underline">
                Clear all
              </button>
            )}
          </div>
          <FilterChips label="Time period" options={rangeOptions} value={range} onChange={pickRange} />
          <FilterChips label="GST" options={GST_FILTER_OPTIONS} value={gst} onChange={onGstChange} />
          <FilterChips label="Royalty" options={ROYALTY_FILTER_OPTIONS} value={royalty} onChange={onRoyaltyChange} />
          <FilterChips
            label="Material"
            options={[{ key: '', label: 'All' }, ...materials]}
            value={material.toLowerCase()}
            onChange={onMaterialChange}
          />
          <button type="button" className="btn-primary w-full justify-center" onClick={() => setOpen(false)}>
            Done
          </button>
        </div>
      )}
    </div>
  );
}

// Table cells a little tighter than the app default, so every column fits without scrolling
const TH = 'tbl-head px-3 py-2 first:pl-5 last:pr-5';
const TD = 'tbl-cell px-3 py-2 first:pl-5 last:pr-5';

// The entries table is a size smaller still, with even-width digits so the amount columns line up
const ETH = `${TH} text-[11px]`;
const ETD = `${TD} text-[13px] tabular-nums`;

const SALES_PAGE_SIZE = 50;

// An amount without the ₹, for the table's money columns: 13,007 or 549.50
const formatAmount = (value) => Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

const formatRupees = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

// Returns { from, to } as ISO strings (either may be undefined) for the server query.
const getRangeBounds = (range, customFrom = '', customTo = '', month = '', year = new Date().getFullYear()) => {
  if (range === 'month') {
    const y = Number(year);
    if (month === '') {
      return { from: new Date(y, 0, 1).toISOString(), to: new Date(y, 11, 31, 23, 59, 59, 999).toISOString() };
    }
    const m = Number(month);
    return { from: new Date(y, m, 1).toISOString(), to: new Date(y, m + 1, 0, 23, 59, 59, 999).toISOString() };
  }
  if (range === 'custom') {
    const from = parseSaleDate(customFrom);
    const to = parseSaleDate(customTo);
    if (from) from.setHours(0, 0, 0, 0);
    if (to) to.setHours(23, 59, 59, 999);
    return { from: from?.toISOString(), to: to?.toISOString() };
  }

  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);

  const daysBack = { '3d': 2, '7d': 6, '30d': 29, '90d': 89 }[range];
  if (daysBack !== undefined) {
    start.setDate(today.getDate() - daysBack);
    return { from: start.toISOString(), to: today.toISOString() };
  }
  if (range === 'currentYear') {
    const yearStart = new Date(today.getFullYear(), 0, 1);
    return { from: yearStart.toISOString(), to: today.toISOString() };
  }

  return {};
};

// Weights of a sale made from a weighbridge ticket (RST); the form cannot change them
const ticketWeights = (source) => ({
  grossWeight: Number(source.grossKg ?? source.grossWeight ?? 0),
  tareWeight: Number(source.tareKg ?? source.tareWeight ?? 0),
  netWeight: Number(source.netKg ?? source.netWeight ?? 0)
});

const formatClock = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

// weighment: a closed weighbridge ticket to make this sale from (opens the form filled in)
export default function Sales({ modalOnly = false, onModalFinish = null, weighment = null }) {
  const toastOptions = { autoClose: 1200 };
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { accounts, defaultAccountId } = useAccounts();
  // Staff edit only the sales they added; deleting is for the owner
  const canDeleteSales = canDeleteEntries(user);
  const canCreateSales = user?.role === 'owner' || user?.permissions?.add;
  const defaultPricingMode = user?.defaultPricingMode === 'per_cubic_meter' ? 'per_cubic_meter' : 'per_ton';
  // Settings → "Record both": a sale keeps its weight and its cubic feet, whichever it is billed by.
  // The weight is what counts in tons sold, for the stock of crushed material.
  const recordBoth = Boolean(user?.recordBothQuantities);
  // A sale already saved with a weight keeps showing it, even when the setting is off
  const showsWeight = (state) => state.pricingMode !== 'per_cubic_meter' || recordBoth || Number(state.netWeight || 0) > 0;
  const showsCubic = (state) => state.pricingMode === 'per_cubic_meter' || recordBoth;
  const initialFormData = getInitialFormData(defaultPricingMode);
  const initialCurrentItem = {
    product: '',
    productName: '',
    unit: 'ton',
    quantity: '',
    unitPrice: ''
  };

  const [sales, setSales] = useState([]);
  const [leadgers, setLeadgers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [products, setProducts] = useState([
    { _id: '1', name: '60mm', unit: 'ton', salePrice: 0 },
    { _id: '2', name: '40mm', unit: 'ton', salePrice: 0 },
    { _id: '3', name: '20mm', unit: 'ton', salePrice: 0 },
    { _id: '4', name: '10mm', unit: 'ton', salePrice: 0 },
    { _id: '5', name: '6mm', unit: 'ton', salePrice: 0 },
    { _id: '6', name: '4mm', unit: 'ton', salePrice: 0 },
    { _id: '7', name: 'wmm', unit: 'ton', salePrice: 0 },
    { _id: '8', name: 'gsb', unit: 'ton', salePrice: 0 },
    { _id: '9', name: 'dust', unit: 'ton', salePrice: 0 }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [tableRange, setTableRange] = useState('lifetime');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth()));
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const rangeBeforeMonthRef = useRef('lifetime');
  const rangeBeforeCustomRef = useRef('lifetime');
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  // 'excel' or 'pdf' while the export period popup is open
  const [exportFormat, setExportFormat] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [materialStats, setMaterialStats] = useState([]);
  const [materialFilter, setMaterialFilter] = useState('');
  // 'all', 'gst' or 'non_gst'
  const [gstFilter, setGstFilter] = useState('all');
  // 'all', 'royalty' or 'non_royalty'
  const [royaltyFilter, setRoyaltyFilter] = useState('all');
  // The sale open in the details popup (eye icon)
  const [detailSale, setDetailSale] = useState(null);
  const [tab, setTab] = useState('entries');
  const [summary, setSummary] = useState({ totalAmount: 0, cashAmount: 0, creditAmount: 0, totalWeight: 0, count: 0 });
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [formData, setFormData] = useState(initialFormData);
  const [currentItem, setCurrentItem] = useState(initialCurrentItem);
  const [showPartyForm, setShowPartyForm] = useState(false);
  const [partyFormData, setPartyFormData] = useState(getInitialPartyFormData());
  const [partyPopupLoading, setPartyPopupLoading] = useState(false);
  const [partyPopupError, setPartyPopupError] = useState('');
  const [showProductForm, setShowProductForm] = useState(false);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [leadgerQuery, setLeadgerQuery] = useState('');
  const [leadgerListIndex, setLeadgerListIndex] = useState(-1);
  const [isLeadgerSectionActive, setIsLeadgerSectionActive] = useState(false);
  const [vehicleQuery, setVehicleQuery] = useState('');
  const [vehicleListIndex, setVehicleListIndex] = useState(-1);
  const [isVehicleSectionActive, setIsVehicleSectionActive] = useState(false);
  const [materialQuery, setMaterialQuery] = useState('');
  const [materialListIndex, setMaterialListIndex] = useState(-1);
  const [isMaterialSectionActive, setIsMaterialSectionActive] = useState(false);
  const [basisListIndex, setBasisListIndex] = useState(-1);
  const [isBasisSectionActive, setIsBasisSectionActive] = useState(false);
  const [productQuery, setProductQuery] = useState('');
  const [productListIndex, setProductListIndex] = useState(-1);
  const [isProductSectionActive, setIsProductSectionActive] = useState(false);
  const [ocrVehicleMismatch, setOcrVehicleMismatch] = useState(null);
  // Set while the form holds weights from the weighbridge; every change to them is put back
  const [lockedWeights, setLockedWeights] = useState(null);
  const weighmentVehiclePickedRef = useRef(false);
  const salesRequestRef = useRef(0);
  const leadgerSectionRef = useRef(null);
  const leadgerInputRef = useRef(null);
  const vehicleSectionRef = useRef(null);
  const vehicleInputRef = useRef(null);
  const materialSectionRef = useRef(null);
  const materialInputRef = useRef(null);
  const basisSectionRef = useRef(null);
  const basisInputRef = useRef(null);
  const productSectionRef = useRef(null);
  const productInputRef = useRef(null);

  useEffect(() => {
    fetchLeadgers();
    fetchVehicles();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, tableRange, customFrom, customTo, selectedMonth, selectedYear, materialFilter, gstFilter, royaltyFilter]);

  useEffect(() => {
    fetchSales();
  }, [page, debouncedSearch, tableRange, customFrom, customTo, selectedMonth, selectedYear, materialFilter, gstFilter, royaltyFilter]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      // An Esc that just closed a popup must not also leave the page
      if (event.defaultPrevented) return;
      if (event.key === 'Escape' && !showForm && !showPartyForm && !showProductForm && !showVehicleForm && !showMonthPicker && !showCustomPicker) {
        navigate('/');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, showForm, showPartyForm, showProductForm, showVehicleForm, showMonthPicker, showCustomPicker]);

  useEffect(() => {
    if (location.state?.openShortcut !== 'sale' || showForm) return;

    handleOpenForm();
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.pathname, location.state, navigate, showForm]);

  useEffect(() => {
    if (!modalOnly || showForm) return;
    handleOpenForm();
  }, [modalOnly, showForm]);

  // Vehicle picking, slip scanning and the sale basis all touch the weights; weighbridge weights always win
  useEffect(() => {
    if (!lockedWeights) return;
    const same = Number(formData.grossWeight || 0) === lockedWeights.grossWeight
      && Number(formData.tareWeight || 0) === lockedWeights.tareWeight
      && Number(formData.netWeight || 0) === lockedWeights.netWeight;
    if (same) return;
    setFormData((prev) => {
      const next = { ...prev, ...lockedWeights };
      return { ...next, totalAmount: recalculateSaleAmount(next) };
    });
  }, [formData.grossWeight, formData.tareWeight, formData.netWeight, lockedWeights]);

  // A sale from a ticket: once the lists load, pick the saved vehicle so its party and transport fill in
  useEffect(() => {
    if (!weighment || weighmentVehiclePickedRef.current || !showForm || !vehicles.length || !leadgers.length) return;
    weighmentVehiclePickedRef.current = true;
    const typed = String(weighment.vehicleNo || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const match = vehicles.find((vehicle) => String(getVehicleDisplayName(vehicle)).toUpperCase().replace(/[^A-Z0-9]/g, '') === typed);
    if (match) selectVehicle(match, leadgers);
  }, [weighment, showForm, vehicles, leadgers]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const tagName = event.target?.tagName?.toLowerCase();
      const isTypingTarget = tagName === 'input' || tagName === 'textarea' || tagName === 'select' || event.target?.isContentEditable;
      const key = event.key?.toLowerCase();
      const isSaleShortcut = event.altKey && key === 's';
      const isF1Shortcut = key === 'f1';
      if (event.defaultPrevented || event.ctrlKey || event.metaKey) return;
      if (isTypingTarget || showForm) return;
      if (!isSaleShortcut && !isF1Shortcut) return;

      event.preventDefault();
      handleOpenForm();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showForm]);

  const openMonthPicker = () => setShowMonthPicker(true);

  const closeMonthPicker = () => {
    setShowMonthPicker(false);
    // Cancelled straight after choosing "Month Wise": go back to the previous range.
    if (rangeBeforeMonthRef.current !== 'month') setTableRange(rangeBeforeMonthRef.current);
  };

  const applyMonthPicker = (month, year) => {
    setSelectedMonth(month);
    setSelectedYear(year);
    rangeBeforeMonthRef.current = 'month';
    setShowMonthPicker(false);
  };

  const openCustomPicker = () => setShowCustomPicker(true);

  const closeCustomPicker = () => {
    setShowCustomPicker(false);
    // Cancelled straight after choosing "Custom Range": go back to the previous range.
    if (rangeBeforeCustomRef.current !== 'custom') setTableRange(rangeBeforeCustomRef.current);
  };

  const applyCustomPicker = (from, to) => {
    setCustomFrom(from);
    setCustomTo(to);
    rangeBeforeCustomRef.current = 'custom';
    setShowCustomPicker(false);
  };

  const handleRangeChange = (value) => {
    if (value === 'custom') {
      if (tableRange !== 'custom') rangeBeforeCustomRef.current = tableRange;
      setTableRange('custom');
      openCustomPicker();
      return;
    }
    rangeBeforeCustomRef.current = value;
    if (value === 'month') {
      if (tableRange !== 'month') rangeBeforeMonthRef.current = tableRange;
      setTableRange('month');
      openMonthPicker();
      return;
    }
    rangeBeforeMonthRef.current = value;
    setTableRange(value);
  };

  // The sale's invoice opens in a new tab, ready to print or save as PDF
  const handleOpenInvoicePdf = (saleId) => {
    if (!saleId) return;
    window.open(`/sales/${saleId}/invoice`, '_blank', 'noopener,noreferrer');
  };

  const fetchSales = async () => {
    const requestId = ++salesRequestRef.current;
    try {
      setLoading(true);
      const params = {
        page,
        limit: SALES_PAGE_SIZE,
        ...getRangeBounds(tableRange, customFrom, customTo, selectedMonth, selectedYear)
      };
      if (debouncedSearch) params.search = debouncedSearch;
      if (materialFilter) params.material = materialFilter;
      if (gstFilter !== 'all') params.gst = gstFilter;
      if (royaltyFilter !== 'all') params.royalty = royaltyFilter;

      const response = await apiClient.get('/sales', { params });
      if (requestId !== salesRequestRef.current) return;

      const rows = Array.isArray(response?.sales) ? response.sales : [];
      const totalPages = response?.pagination?.totalPages || 1;
      if (page > totalPages) {
        setPage(totalPages);
        return;
      }
      setSales(rows);
      setMaterialStats(Array.isArray(response?.materialStats) ? response.materialStats : []);
      setSummary(response?.summary || { totalAmount: 0, cashAmount: 0, creditAmount: 0, totalWeight: 0, count: 0 });
      setPagination({ total: response?.pagination?.total || 0, totalPages });
      setError('');
    } catch (err) {
      if (requestId !== salesRequestRef.current) return;
      setError(err.message || 'Error fetching sales');
    } finally {
      if (requestId === salesRequestRef.current) setLoading(false);
    }
  };

  const fetchLeadgers = async () => {
    try {
      const response = await apiClient.get('/parties');
      const partyList = Array.isArray(response) ? response : [];
      setLeadgers(partyList);
      return partyList;
    } catch (err) {
      console.error('Error fetching leadgers:', err);
      return [];
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await apiClient.get('/products');
      setProducts(response.data || []);
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  const fetchVehicles = async () => {
    try {
      const response = await apiClient.get('/vehicles');
      const vehicleList = Array.isArray(response) ? response : [];
      setVehicles(sortVehiclesByTypePreference(vehicleList, 'sales'));
    } catch (err) {
      console.error('Error fetching vehicles:', err);
    }
  };

  const getLeadgerDisplayName = (leadger) => {
    const name = String(leadger?.name || '').trim();

    if (name) return name;
    return 'Party Name';
  };

  const resolveLeadgerNameById = (leadgerId) => {
    const resolvedId = typeof leadgerId === 'object' ? leadgerId?._id : leadgerId;
    if (!resolvedId) return '';
    const matching = leadgers.find((leadger) => String(leadger._id) === String(resolvedId));
    return matching ? getLeadgerDisplayName(matching) : '';
  };

  const normalizeText = (value) => String(value || '').trim().toLowerCase();

  const getVehicleDisplayName = (vehicle) => String(vehicle?.vehicleNo || '').trim();
  const getMaterialDisplayName = (material) => String(material?.label || '').trim();
  const getVehiclePartyId = (vehicle) => (
    typeof vehicle?.partyId === 'object'
      ? vehicle?.partyId?._id || ''
      : vehicle?.partyId || ''
  );

  const getMatchingLeadgers = (queryValue) => {
    const normalized = normalizeText(queryValue);
    if (!normalized) return leadgers;

    const startsWith = leadgers.filter((leadger) => normalizeText(getLeadgerDisplayName(leadger)).startsWith(normalized));
    const includes = leadgers.filter((leadger) => (
      !normalizeText(getLeadgerDisplayName(leadger)).startsWith(normalized)
      && normalizeText(getLeadgerDisplayName(leadger)).includes(normalized)
    ));

    return [...startsWith, ...includes];
  };

  const selectedLeadgerName = useMemo(() => resolveLeadgerNameById(formData.party), [formData.party, leadgers]);

  const filteredLeadgers = useMemo(() => {
    const normalizedQuery = normalizeText(leadgerQuery);
    const normalizedSelectedName = normalizeText(selectedLeadgerName);

    if (
      isLeadgerSectionActive
      && normalizedQuery
      && normalizedQuery === normalizedSelectedName
    ) {
      return leadgers;
    }

    return getMatchingLeadgers(leadgerQuery);
  }, [leadgers, leadgerQuery, isLeadgerSectionActive, selectedLeadgerName]);

  const selectedLeadger = useMemo(
    () => leadgers.find((leadger) => String(leadger._id) === String(formData.party || '')) || null,
    [leadgers, formData.party]
  );
  // The picker lists only vehicles of the chosen kind (mine / hired). A party's vehicle is just typed.
  const isPartyVehicleMode = (formData.transportMode || 'party') === 'party';
  const modeVehicles = useMemo(() => (
    isPartyVehicleMode ? [] : vehicles.filter((vehicle) => (vehicle.ownership || 'party') === formData.transportMode)
  ), [vehicles, isPartyVehicleMode, formData.transportMode]);
  const filteredVehicles = useMemo(() => {
    const vehicles = modeVehicles;
    const normalizedQuery = normalizeText(vehicleQuery);
    const normalizedSelectedVehicle = normalizeText(formData.vehicleNo);
    const exactVehicle = vehicles.find((vehicle) => (
      normalizeVehicleValue(getVehicleDisplayName(vehicle)) === normalizeVehicleValue(vehicleQuery)
    )) || null;
    const isCompleteTypedVehicle = isCompleteVehicleNumber(vehicleQuery);

    if (isCompleteTypedVehicle && !exactVehicle) {
      return [];
    }

    if (
      isVehicleSectionActive
      && normalizedQuery
      && normalizedQuery === normalizedSelectedVehicle
      && exactVehicle
    ) {
      return vehicles;
    }

    if (!normalizedQuery) return vehicles;

    const startsWith = vehicles.filter((vehicle) => normalizeText(getVehicleDisplayName(vehicle)).startsWith(normalizedQuery));
    const includes = vehicles.filter((vehicle) => (
      !normalizeText(getVehicleDisplayName(vehicle)).startsWith(normalizedQuery)
      && normalizeText(getVehicleDisplayName(vehicle)).includes(normalizedQuery)
    ));

    return [...startsWith, ...includes];
  }, [modeVehicles, vehicleQuery, isVehicleSectionActive, formData.vehicleNo]);
  const filteredMaterialTypes = useMemo(() => {
    const normalizedQuery = normalizeText(materialQuery);
    const selectedMaterial = MATERIAL_TYPE_OPTIONS.find((item) => item.value === formData.materialType) || null;
    const normalizedSelectedMaterial = normalizeText(getMaterialDisplayName(selectedMaterial));

    if (
      isMaterialSectionActive
      && normalizedQuery
      && normalizedQuery === normalizedSelectedMaterial
    ) {
      return MATERIAL_TYPE_OPTIONS;
    }

    if (!normalizedQuery) return MATERIAL_TYPE_OPTIONS;

    const startsWith = MATERIAL_TYPE_OPTIONS.filter((item) => normalizeText(getMaterialDisplayName(item)).startsWith(normalizedQuery));
    const includes = MATERIAL_TYPE_OPTIONS.filter((item) => (
      !normalizeText(getMaterialDisplayName(item)).startsWith(normalizedQuery)
      && normalizeText(getMaterialDisplayName(item)).includes(normalizedQuery)
    ));

    return [...startsWith, ...includes];
  }, [materialQuery, isMaterialSectionActive, formData.materialType]);
  const isCashParty = String(selectedLeadger?.type || '').trim().toLowerCase() === 'cash-in-hand';
  // Who a vehicle can be hired from: transporters first, never the cash party
  // Locations with a trip rate on the picked vehicle, for a per-trip hire
  const selectedSaleVehicle = useMemo(
    () => vehicles.find((vehicle) => String(vehicle._id) === String(formData.vehicleId || '')) || null,
    [vehicles, formData.vehicleId]
  );

  // Owners of hired vehicles come first when picking who a vehicle is hired from
  // Places material was sent to before, and the picked vehicle's trip locations, offered while typing
  const dispatchSuggestions = useMemo(() => [...new Set([
    ...(selectedSaleVehicle ? getVehicleHireRates(selectedSaleVehicle).tripRates.map((row) => row.location) : []),
    ...sales.map((sale) => String(sale.dispatchLocation || '').trim())
  ].filter(Boolean))], [sales, selectedSaleVehicle]);

  const transportParties = useMemo(() => {
    const ownerIds = getVehicleOwnerIds(vehicles);
    return leadgers
      .filter((leadger) => String(leadger.type || '').toLowerCase() !== 'cash-in-hand')
      .sort((a, b) => (
        Number(ownerIds.has(String(b._id))) - Number(ownerIds.has(String(a._id)))
        || String(a.name || '').localeCompare(String(b.name || ''))
      ));
  }, [leadgers, vehicles]);
  const paidAmount = Math.max(0, Number(formData.paidAmount || 0));
  const totalAmountValue = Math.max(0, Number(formData.totalAmount || 0));
  const saleTypePreview = formatSaleTypeLabel(deriveSaleType(totalAmountValue, paidAmount));
  const pendingAmountPreview = Math.max(0, totalAmountValue - paidAmount);
  const excessAmountPreview = Math.max(0, paidAmount - totalAmountValue);

  useEffect(() => {
    if (!showForm) return;

    if (filteredLeadgers.length === 0) {
      setLeadgerListIndex(-1);
      return;
    }

    const shouldHighlightSelectedLeadger = (
      isLeadgerSectionActive
      && normalizeText(leadgerQuery)
      && normalizeText(leadgerQuery) === normalizeText(selectedLeadgerName)
      && formData.party
    );

    if (shouldHighlightSelectedLeadger) {
      const selectedIndex = filteredLeadgers.findIndex((item) => String(item._id) === String(formData.party));
      setLeadgerListIndex(selectedIndex >= 0 ? selectedIndex : 0);
      return;
    }

    setLeadgerListIndex((prev) => {
      if (prev < 0) return 0;
      if (prev >= filteredLeadgers.length) return filteredLeadgers.length - 1;
      return prev;
    });
  }, [showForm, filteredLeadgers, isLeadgerSectionActive, leadgerQuery, selectedLeadgerName, formData.party]);

  useEffect(() => {
    if (!showForm) return;

    if (filteredVehicles.length === 0) {
      setVehicleListIndex(-1);
      return;
    }

    const shouldHighlightSelectedVehicle = (
      isVehicleSectionActive
      && normalizeText(vehicleQuery)
      && normalizeText(vehicleQuery) === normalizeText(formData.vehicleNo)
      && formData.vehicleNo
    );

    if (shouldHighlightSelectedVehicle) {
      const selectedIndex = filteredVehicles.findIndex((item) => normalizeText(getVehicleDisplayName(item)) === normalizeText(formData.vehicleNo));
      setVehicleListIndex(selectedIndex >= 0 ? selectedIndex : 0);
      return;
    }

    setVehicleListIndex((prev) => {
      if (prev < 0) return 0;
      if (prev >= filteredVehicles.length) return filteredVehicles.length - 1;
      return prev;
    });
  }, [showForm, filteredVehicles, isVehicleSectionActive, vehicleQuery, formData.vehicleNo]);

  useEffect(() => {
    if (!showForm) return;

    if (filteredMaterialTypes.length === 0) {
      setMaterialListIndex(-1);
      return;
    }

    const selectedMaterial = MATERIAL_TYPE_OPTIONS.find((item) => item.value === formData.materialType) || null;
    const shouldHighlightSelectedMaterial = (
      isMaterialSectionActive
      && normalizeText(materialQuery)
      && normalizeText(materialQuery) === normalizeText(getMaterialDisplayName(selectedMaterial))
      && formData.materialType
    );

    if (shouldHighlightSelectedMaterial) {
      const selectedIndex = filteredMaterialTypes.findIndex((item) => String(item.value) === String(formData.materialType));
      setMaterialListIndex(selectedIndex >= 0 ? selectedIndex : 0);
      return;
    }

    setMaterialListIndex((prev) => {
      if (prev < 0) return 0;
      if (prev >= filteredMaterialTypes.length) return filteredMaterialTypes.length - 1;
      return prev;
    });
  }, [showForm, filteredMaterialTypes, isMaterialSectionActive, materialQuery, formData.materialType]);

  const handleLeadgerFocus = () => {
    setIsLeadgerSectionActive(true);
  };

  const handleVehicleFocus = () => {
    setIsVehicleSectionActive(true);
  };

  const handleMaterialFocus = () => {
    setIsMaterialSectionActive(true);
  };

  const handleBasisFocus = () => {
    setIsBasisSectionActive(true);
    const selectedIndex = SALE_BASIS_OPTIONS.findIndex((option) => option.value === (formData.pricingMode || 'per_ton'));
    setBasisListIndex(selectedIndex >= 0 ? selectedIndex : 0);
  };

  // The backend keeps one default "Cash" party per account; preselect it for new sales.
  const defaultCashLeadger = useMemo(() => leadgers.find((leadger) => (
    String(leadger.type || '').toLowerCase() === 'cash-in-hand'
    && normalizeText(leadger.name) === 'cash'
  )) || null, [leadgers]);

  useEffect(() => {
    if (!showForm || editingId || !defaultCashLeadger || formData.party) return;
    selectLeadger(defaultCashLeadger);
  }, [showForm, editingId, defaultCashLeadger]);

  // A cash sale is paid in full; moving from the cash party to another one puts the payment back to 0
  const wasCashPartyRef = useRef(false);
  useEffect(() => {
    if (!showForm || editingId) return;
    if (!isCashParty) {
      if (wasCashPartyRef.current) {
        setFormData((prev) => ({ ...prev, paidAmount: '0' }));
      }
      wasCashPartyRef.current = false;
      return;
    }
    wasCashPartyRef.current = true;

    setFormData((prev) => {
      const nextPaidAmount = Number(prev.totalAmount || 0);
      if (
        Number(prev.paidAmount || 0) === nextPaidAmount
        && prev.dueDate === ''
      ) {
        return prev;
      }

      return {
        ...prev,
        paidAmount: nextPaidAmount,
        dueDate: ''
      };
    });
  }, [showForm, editingId, isCashParty, formData.totalAmount]);

  const findExactLeadger = (value) => {
    const normalized = normalizeText(value);
    if (!normalized) return null;
    return leadgers.find((leadger) => normalizeText(getLeadgerDisplayName(leadger)) === normalized) || null;
  };

  const findBestLeadgerMatch = (value) => {
    const normalized = normalizeText(value);
    if (!normalized) return null;
    return leadgers.find((leadger) => normalizeText(getLeadgerDisplayName(leadger)).startsWith(normalized))
      || leadgers.find((leadger) => normalizeText(getLeadgerDisplayName(leadger)).includes(normalized))
      || null;
  };

  const findExactVehicle = (value) => {
    const normalized = normalizeText(value);
    if (!normalized) return null;
    return modeVehicles.find((vehicle) => normalizeText(getVehicleDisplayName(vehicle)) === normalized) || null;
  };

  const findBestVehicleMatch = (value) => {
    const normalized = normalizeText(value);
    if (!normalized) return null;
    if (isCompleteVehicleNumber(value)) return null;
    return modeVehicles.find((vehicle) => normalizeText(getVehicleDisplayName(vehicle)).startsWith(normalized))
      || modeVehicles.find((vehicle) => normalizeText(getVehicleDisplayName(vehicle)).includes(normalized))
      || null;
  };

  const findExactMaterialType = (value) => {
    const normalized = normalizeText(value);
    if (!normalized) return null;
    return MATERIAL_TYPE_OPTIONS.find((item) => normalizeText(getMaterialDisplayName(item)) === normalized) || null;
  };

  const findBestMaterialTypeMatch = (value) => {
    const normalized = normalizeText(value);
    if (!normalized) return null;
    return MATERIAL_TYPE_OPTIONS.find((item) => normalizeText(getMaterialDisplayName(item)).startsWith(normalized))
      || MATERIAL_TYPE_OPTIONS.find((item) => normalizeText(getMaterialDisplayName(item)).includes(normalized))
      || null;
  };

  const selectLeadger = (leadger) => {
    if (!leadger) {
      setLeadgerQuery('');
        setFormData((prev) => ({
          ...prev,
          party: '',
          customerName: '',
          customerPhone: '',
          customerAddress: '',
          rate: prev.materialType
            ? (() => {
              const fallbackRate = getCrusherMaterialRate(user, prev.materialType, prev.pricingMode);
              return fallbackRate > 0 ? String(fallbackRate) : '';
            })()
            : '',
          totalAmount: prev.materialType
            ? recalculateSaleAmount({
              ...prev,
              rate: getCrusherMaterialRate(user, prev.materialType, prev.pricingMode),
            })
            : prev.totalAmount
        }));
      setLeadgerListIndex(-1);
      return;
    }

    const leadgerName = getLeadgerDisplayName(leadger);
    setLeadgerQuery(leadgerName);
    setFormData((prev) => {
      const resolvedRate = prev.materialType ? getSaleRateForParty(user, leadger, prev.materialType, prev.pricingMode) : 0;

      return {
        ...prev,
        party: leadger._id,
          customerName: leadgerName,
          customerPhone: '',
          customerAddress: '',
          rate: prev.materialType ? (resolvedRate > 0 ? String(resolvedRate) : '') : prev.rate,
          totalAmount: prev.materialType ? recalculateSaleAmount({ ...prev, rate: resolvedRate }) : prev.totalAmount
        };
      });

    const selectedIndex = filteredLeadgers.findIndex((item) => String(item._id) === String(leadger._id));
    setLeadgerListIndex(selectedIndex >= 0 ? selectedIndex : 0);
  };

  const handleLeadgerInputChange = (e) => {
    const value = e.target.value;
    setLeadgerQuery(value);

    if (!normalizeText(value)) {
      selectLeadger(null);
      return;
    }

    const exactLeadger = findExactLeadger(value);
    if (exactLeadger) {
      setFormData((prev) => {
        const resolvedRate = prev.materialType ? getSaleRateForParty(user, exactLeadger, prev.materialType, prev.pricingMode) : 0;

        return {
          ...prev,
          party: exactLeadger._id,
            customerName: getLeadgerDisplayName(exactLeadger),
            customerPhone: '',
            customerAddress: '',
            rate: prev.materialType ? (resolvedRate > 0 ? String(resolvedRate) : '') : prev.rate,
            totalAmount: prev.materialType ? recalculateSaleAmount({ ...prev, rate: resolvedRate }) : prev.totalAmount
          };
        });
      const exactIndex = getMatchingLeadgers(value).findIndex((item) => String(item._id) === String(exactLeadger._id));
      setLeadgerListIndex(exactIndex >= 0 ? exactIndex : 0);
      return;
    }

    const matches = getMatchingLeadgers(value);
    const firstMatch = matches[0] || null;
    setFormData((prev) => {
      const resolvedRate = prev.materialType
        ? getSaleRateForParty(user, firstMatch, prev.materialType, prev.pricingMode)
        : 0;

      return {
        ...prev,
        party: firstMatch?._id || '',
        customerName: firstMatch ? getLeadgerDisplayName(firstMatch) : '',
          customerPhone: '',
          customerAddress: '',
          rate: prev.materialType
            ? (resolvedRate > 0 ? String(resolvedRate) : '')
            : prev.rate,
          totalAmount: prev.materialType
            ? recalculateSaleAmount({ ...prev, rate: resolvedRate })
            : prev.totalAmount
        };
      });
    setLeadgerListIndex(firstMatch ? 0 : -1);
  };

  const selectVehicle = (vehicle, partyOptions = leadgers) => {
    if (!vehicle) {
      setVehicleQuery('');
      setOcrVehicleMismatch(null);
      setFormData((prev) => ({
        ...prev,
        vehicleId: '',
        vehicleNo: '',
        tareWeight: '',
        netWeight: showsWeight(prev)
          ? getSafeNetWeight(prev.grossWeight, 0)
          : '',
        cubicMeterQty: prev.pricingMode === 'per_cubic_meter' ? '' : prev.cubicMeterQty,
        totalAmount: recalculateSaleAmount({
          ...prev,
          netWeight: showsWeight(prev)
            ? getSafeNetWeight(prev.grossWeight, 0)
            : '',
          cubicMeterQty: prev.pricingMode === 'per_cubic_meter' ? '' : prev.cubicMeterQty,
        })
      }));
      setVehicleListIndex(-1);
      return;
    }

    setOcrVehicleMismatch(null);
    const vehicleNumber = getVehicleDisplayName(vehicle);
    const unladenWeight = vehicle?.unladenWeight ?? '';
    // Only a party's own vehicle tells us who the buyer is; a hired vehicle's party is its transporter
    const linkedPartyId = (vehicle.ownership || 'party') === 'party' ? getVehiclePartyId(vehicle) : '';
    const linkedParty = linkedPartyId
      ? partyOptions.find((party) => String(party._id) === String(linkedPartyId))
      : null;

    setVehicleQuery(vehicleNumber);
    setFormData((prev) => {
      const nextState = {
        ...prev,
        ...getVehicleTransportDefaults(vehicle, prev.transportCharge),
        vehicleId: vehicle._id,
        vehicleNo: vehicleNumber,
        tareWeight: unladenWeight,
        cubicMeterQty: showsCubic(prev)
          ? (vehicle?.capacityCubicMeter ?? prev.cubicMeterQty ?? '')
          : prev.cubicMeterQty
      };

      const numericTareWeight = Number(unladenWeight || 0);
      const numericGrossWeight = Number(prev.grossWeight || 0);
      nextState.netWeight = showsWeight(nextState)
        ? getSafeNetWeight(numericGrossWeight, numericTareWeight)
        : '';
      nextState.totalAmount = recalculateSaleAmount(nextState);

      if (linkedParty) {
        const partyName = getLeadgerDisplayName(linkedParty);
        const resolvedRate = nextState.materialType ? getSaleRateForParty(user, linkedParty, nextState.materialType, nextState.pricingMode) : 0;
        nextState.party = linkedParty._id;
        nextState.customerName = partyName;
        nextState.customerPhone = '';
        nextState.customerAddress = '';
        if (nextState.materialType) {
          nextState.rate = resolvedRate > 0 ? String(resolvedRate) : '';
          nextState.totalAmount = recalculateSaleAmount({ ...nextState, rate: resolvedRate });
        }
      }

      return nextState;
    });

    if (linkedParty) {
      const partyName = getLeadgerDisplayName(linkedParty);
      setLeadgerQuery(partyName);
      const selectedPartyIndex = partyOptions.findIndex((item) => String(item._id) === String(linkedParty._id));
      setLeadgerListIndex(selectedPartyIndex >= 0 ? selectedPartyIndex : 0);
    }

    const selectedIndex = filteredVehicles.findIndex((item) => String(item._id) === String(vehicle._id));
    setVehicleListIndex(selectedIndex >= 0 ? selectedIndex : 0);
  };

  const ensureVehicleExists = async () => {
    // A party's vehicle is saved on the sale as typed, not added to Vehicles
    if ((formData.transportMode || 'party') === 'party') return formData.vehicleId || '';
    const normalizedVehicleNo = normalizeVehicleValue(formData.vehicleNo);
    const partyId = String(formData.party || '').trim();

    if (!normalizedVehicleNo || !partyId) {
      return formData.vehicleId || '';
    }

    const matchedVehicle = vehicles.find((vehicle) => (
      normalizeVehicleValue(getVehicleDisplayName(vehicle)) === normalizedVehicleNo
    )) || null;

    if (matchedVehicle?._id) {
      if (String(formData.vehicleId || '') !== String(matchedVehicle._id)) {
        selectVehicle(matchedVehicle);
      }
      return matchedVehicle._id;
    }

      // A new vehicle is saved the way this sale uses it: the party's, mine, or hired from the transporter
      const isHiredVehicle = formData.transportMode === 'hired' && Boolean(formData.transporterId);
      const isOwnVehicle = formData.transportMode === 'own';
      const createdVehicle = await apiClient.post('/vehicles', {
        partyId: isOwnVehicle ? undefined : isHiredVehicle ? formData.transporterId : partyId,
        vehicleNo: String(formData.vehicleNo || '').trim().toUpperCase(),
        unladenWeight: Number(formData.tareWeight || 0),
        capacityCubicMeter: Number(formData.cubicMeterQty || 0),
        vehicleType: 'sales',
        ownership: isOwnVehicle ? 'own' : isHiredVehicle ? 'hired' : 'party',
        ...(isHiredVehicle
          ? formData.transportBasis === 'per_trip'
            ? {
              hireBasis: 'per_trip',
              tripRates: formData.transportLocation
                ? [{ location: formData.transportLocation, rate: Number(formData.transportRate || 0) }]
                : []
            }
            : { hireBasis: formData.transportBasis || 'per_ton', hireRate: Number(formData.transportRate || 0) }
          : {})
      });

    if (createdVehicle?._id) {
      setVehicles((prev) => sortVehiclesByTypePreference([
        createdVehicle,
        ...prev.filter((item) => String(item._id) !== String(createdVehicle._id))
      ], 'sales'));
      selectVehicle(createdVehicle);
      return createdVehicle._id;
    }

    return formData.vehicleId || '';
  };

  const handleVehicleInputChange = (e) => {
    const value = String(e.target.value || '').toUpperCase();
    setVehicleQuery(value);
    setOcrVehicleMismatch(null);

    if (isPartyVehicleMode) {
      setFormData((prev) => ({ ...prev, vehicleId: '', vehicleNo: value }));
      return;
    }

    if (!normalizeText(value)) {
      selectVehicle(null);
      return;
    }

    const exactVehicle = findExactVehicle(value);
    if (exactVehicle) {
      selectVehicle(exactVehicle);
      return;
    }

    const firstMatch = findBestVehicleMatch(value);
    setFormData((prev) => ({
      ...prev,
      vehicleId: firstMatch?._id || '',
      vehicleNo: firstMatch ? getVehicleDisplayName(firstMatch) : value
    }));
    setVehicleListIndex(firstMatch ? 0 : -1);
  };

  const selectMaterialType = (material) => {
    if (!material) {
      setMaterialQuery('');
      setFormData((prev) => ({
        ...prev,
        materialType: '',
        rate: '',
        totalAmount: recalculateSaleAmount({ ...prev, rate: '' })
      }));
      setMaterialListIndex(-1);
      return;
    }

    setMaterialQuery(getMaterialDisplayName(material));
    const configuredRate = getSaleRateForParty(user, selectedLeadger, material.value, formData.pricingMode);
      setFormData((prev) => ({
        ...prev,
        materialType: material.value,
        rate: configuredRate > 0 ? String(configuredRate) : '',
        totalAmount: recalculateSaleAmount({ ...prev, rate: configuredRate })
      }));

    const selectedIndex = filteredMaterialTypes.findIndex((item) => String(item.value) === String(material.value));
    setMaterialListIndex(selectedIndex >= 0 ? selectedIndex : 0);
  };

  const handleMaterialInputChange = (e) => {
    const value = String(e.target.value || '').toUpperCase();
    setMaterialQuery(value);

    if (!normalizeText(value)) {
      selectMaterialType(null);
      return;
    }

    const exactMaterial = findExactMaterialType(value);
    if (exactMaterial) {
      const configuredRate = getSaleRateForParty(user, selectedLeadger, exactMaterial.value, formData.pricingMode);
        setFormData((prev) => ({
          ...prev,
          materialType: exactMaterial.value,
          rate: configuredRate > 0 ? String(configuredRate) : '',
          totalAmount: recalculateSaleAmount({ ...prev, rate: configuredRate })
        }));
      const exactIndex = filteredMaterialTypes.findIndex((item) => String(item.value) === String(exactMaterial.value));
      setMaterialListIndex(exactIndex >= 0 ? exactIndex : 0);
      return;
    }

    const firstMatch = findBestMaterialTypeMatch(value);
    const configuredRate = firstMatch ? getSaleRateForParty(user, selectedLeadger, firstMatch.value, formData.pricingMode) : 0;
      setFormData((prev) => ({
        ...prev,
        materialType: firstMatch?.value || '',
        rate: firstMatch ? (configuredRate > 0 ? String(configuredRate) : '') : prev.rate,
        totalAmount: firstMatch ? recalculateSaleAmount({ ...prev, rate: configuredRate }) : prev.totalAmount
      }));
    setMaterialListIndex(firstMatch ? 0 : -1);
  };

  const focusNextPopupField = (element) => {
    if (!(element instanceof HTMLElement)) return;
    const form = element.closest('form');
    if (!form) return;

    const fields = Array.from(form.querySelectorAll(
      'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])'
    )).filter((field) => {
      if (!(field instanceof HTMLElement)) return false;
      if (field.tabIndex === -1) return false;
      const style = window.getComputedStyle(field);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });

    const currentIndex = fields.indexOf(element);
    if (currentIndex === -1) return;

    // Find the next field that is NOT readonly (we allow source to be readonly, but target should be editable)
    const nextField = fields.slice(currentIndex + 1).find(f => !f.readOnly);
    if (!(nextField instanceof HTMLElement)) return;
    nextField.focus();
    if (nextField instanceof HTMLInputElement && typeof nextField.select === 'function') {
      nextField.select();
    }
  };

  const handleSelectEnterMoveNext = (e) => {
    if (e.key !== 'Enter' || e.shiftKey) return;
    e.preventDefault();
    e.stopPropagation();
    focusNextPopupField(e.currentTarget);
  };

  const openInlinePartyForm = () => {
    setPartyFormData((prev) => ({
      ...getInitialPartyFormData('customer'),
      name: toTitleCase(leadgerQuery || prev.name || '')
    }));
    setPartyPopupError('');
    setIsLeadgerSectionActive(false);
    setShowPartyForm(true);
  };

  const closeInlinePartyForm = (shouldRefocusLeadger = true) => {
    setShowPartyForm(false);
    setPartyFormData(getInitialPartyFormData('customer'));
    setPartyPopupError('');

    if (!shouldRefocusLeadger) return;

    requestAnimationFrame(() => {
      leadgerInputRef.current?.focus();
      leadgerInputRef.current?.select?.();
    });
  };

  const handlePartyPopupChange = (e) => {
    const { name, value } = e.target;

    if (name === 'name') {
      setPartyFormData((prev) => ({ ...prev, [name]: toTitleCase(value) }));
      return;
    }

    if (name === 'mobile') {
      const normalized = String(value || '').replace(/\D/g, '').slice(0, 10);
      setPartyFormData((prev) => ({ ...prev, [name]: normalized }));
      return;
    }

    if (name === 'pincode') {
      const normalized = String(value || '').replace(/\D/g, '').slice(0, 6);
      setPartyFormData((prev) => ({ ...prev, [name]: normalized }));
      return;
    }
    if (name === 'openingBalance') {
      setPartyFormData((prev) => ({ ...prev, [name]: value }));
      return;
    }
    if (['tenMmRate', 'twentyMmRate', 'fortyMmRate', 'wmmRate', 'gsbRate', 'dustRate', 'boulderRatePerTon'].includes(name)) {
      setPartyFormData((prev) => ({ ...prev, [name]: value }));
      return;
    }
    if (name === 'type') {
      setPartyFormData((prev) => ({
        ...prev,
        [name]: value,
        openingBalanceType: prev.openingBalance ? prev.openingBalanceType : (['supplier', 'transporter'].includes(value) ? 'payable' : 'receivable')
      }));
      return;
    }

    setPartyFormData((prev) => ({ ...prev, [name]: value }));
  };

  const openInlineProductForm = () => {
    setIsProductSectionActive(false);
    setShowProductForm(true);
  };

  const openInlineVehicleForm = () => {
    setIsVehicleSectionActive(false);
    setShowVehicleForm(true);
  };

  const closeInlineProductForm = (shouldRefocusProduct = true) => {
    setShowProductForm(false);

    if (!shouldRefocusProduct) return;

    requestAnimationFrame(() => {
      productInputRef.current?.focus();
      productInputRef.current?.select?.();
    });
  };

  const closeInlineVehicleForm = (shouldRefocusVehicle = true) => {
    setShowVehicleForm(false);

    if (!shouldRefocusVehicle) return;

    requestAnimationFrame(() => {
      vehicleInputRef.current?.focus();
      vehicleInputRef.current?.select?.();
      setIsVehicleSectionActive(true);
    });
  };

  const handleLeadgerInputKeyDown = (e) => {
    const key = e.key?.toLowerCase();
    const isMoveDownKey = key === 'arrowdown';
    const isMoveUpKey = key === 'arrowup';

    if (key === 'control' && !e.altKey && !e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
      openInlinePartyForm();
      return;
    }

    if (isMoveDownKey) {
      e.preventDefault();
      e.stopPropagation();
      if (filteredLeadgers.length === 0) return;
      setLeadgerListIndex((prev) => {
        if (prev < 0) return 0;
        return Math.min(prev + 1, filteredLeadgers.length - 1);
      });
      return;
    }

    if (isMoveUpKey) {
      e.preventDefault();
      e.stopPropagation();
      if (filteredLeadgers.length === 0) return;
      setLeadgerListIndex((prev) => {
        if (prev < 0) return 0;
        return Math.max(prev - 1, 0);
      });
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();

      const activeLeadger = leadgerListIndex >= 0 ? filteredLeadgers[leadgerListIndex] : null;
      const matchedLeadger = activeLeadger || findExactLeadger(leadgerQuery) || findBestLeadgerMatch(leadgerQuery);
      if (matchedLeadger) {
        selectLeadger(matchedLeadger);
      }
      setIsLeadgerSectionActive(false);
      focusNextPopupField(e.currentTarget);
    }
  };

  const handleVehicleInputKeyDown = (e) => {
    const key = e.key?.toLowerCase();

    if (isPartyVehicleMode) {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        focusNextPopupField(e.currentTarget);
      }
      return;
    }

    if (key === 'control' && !e.altKey && !e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
      openInlineVehicleForm();
      return;
    }

    if (key === 'arrowdown') {
      e.preventDefault();
      e.stopPropagation();
      if (filteredVehicles.length === 0) return;
      setVehicleListIndex((prev) => {
        if (prev < 0) return 0;
        return Math.min(prev + 1, filteredVehicles.length - 1);
      });
      return;
    }

    if (key === 'arrowup') {
      e.preventDefault();
      e.stopPropagation();
      if (filteredVehicles.length === 0) return;
      setVehicleListIndex((prev) => {
        if (prev < 0) return 0;
        return Math.max(prev - 1, 0);
      });
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();

      const activeVehicle = vehicleListIndex >= 0 ? filteredVehicles[vehicleListIndex] : null;
      const matchedVehicle = activeVehicle || findExactVehicle(vehicleQuery) || findBestVehicleMatch(vehicleQuery);
      if (matchedVehicle) {
        selectVehicle(matchedVehicle);
      } else {
        setFormData((prev) => ({
          ...prev,
          vehicleNo: String(vehicleQuery || '').toUpperCase()
        }));
      }
      setIsVehicleSectionActive(false);
      focusNextPopupField(e.currentTarget);
    }
  };

  const handleMaterialInputKeyDown = (e) => {
    const key = e.key?.toLowerCase();

    if (key === 'arrowdown') {
      e.preventDefault();
      e.stopPropagation();
      if (filteredMaterialTypes.length === 0) return;
      setMaterialListIndex((prev) => {
        if (prev < 0) return 0;
        return Math.min(prev + 1, filteredMaterialTypes.length - 1);
      });
      return;
    }

    if (key === 'arrowup') {
      e.preventDefault();
      e.stopPropagation();
      if (filteredMaterialTypes.length === 0) return;
      setMaterialListIndex((prev) => {
        if (prev < 0) return 0;
        return Math.max(prev - 1, 0);
      });
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();

      const activeMaterial = materialListIndex >= 0 ? filteredMaterialTypes[materialListIndex] : null;
      const matchedMaterial = activeMaterial || findExactMaterialType(materialQuery) || findBestMaterialTypeMatch(materialQuery);
      if (matchedMaterial) {
        selectMaterialType(matchedMaterial);
      }
      setIsMaterialSectionActive(false);
      const selectedPricingMode = formData.pricingMode || 'per_ton';
      setBasisListIndex(SALE_BASIS_OPTIONS.findIndex((option) => option.value === selectedPricingMode));
      setIsBasisSectionActive(true);
      requestAnimationFrame(() => {
        basisInputRef.current?.focus();
      });
      return;
    }

    if (e.key === 'Escape' && isMaterialSectionActive) {
      e.preventDefault();
      e.stopPropagation();
      const selectedMaterial = MATERIAL_TYPE_OPTIONS.find((item) => item.value === formData.materialType) || null;
      setMaterialQuery(getMaterialDisplayName(selectedMaterial));
      setIsMaterialSectionActive(false);
    }
  };

  const selectPricingMode = (value) => {
    const selectedVehicle = vehicles.find((vehicle) => String(vehicle._id) === String(formData.vehicleId || ''));
    const cubicMeterQty = value === 'per_cubic_meter' || recordBoth
      ? (formData.cubicMeterQty || selectedVehicle?.capacityCubicMeter || '')
      : formData.cubicMeterQty;
    // Billing by volume drops the weights, unless they are being recorded too
    const dropWeights = value === 'per_cubic_meter' && !recordBoth;
    const resolvedRate = formData.materialType
      ? getSaleRateForParty(user, selectedLeadger, formData.materialType, value)
      : Number(formData.rate || 0);
    const nextState = {
      ...formData,
      pricingMode: value,
      cubicMeterQty,
      grossWeight: dropWeights ? '' : formData.grossWeight,
      tareWeight: dropWeights ? '' : formData.tareWeight,
      netWeight: dropWeights
        ? ''
        : getSafeNetWeight(formData.grossWeight, formData.tareWeight),
      rate: formData.materialType ? (resolvedRate > 0 ? String(resolvedRate) : '') : formData.rate,
    };
    setFormData({ ...nextState, totalAmount: recalculateSaleAmount(nextState) });
    setBasisListIndex(SALE_BASIS_OPTIONS.findIndex((option) => option.value === value));
  };

  // Party vehicle / my vehicle / hired vehicle. Switching to hired fills in the picked vehicle's transporter and rate.
  const selectTransportMode = (mode) => {
    setFormData((prev) => {
      if (prev.transportMode === mode) return prev;

      const selectedVehicle = vehicles.find((vehicle) => String(vehicle._id) === String(prev.vehicleId || ''));
      const vehicleDefaults = selectedVehicle?.ownership === mode
        ? getVehicleTransportDefaults(selectedVehicle, prev.transportCharge)
        : { ...NO_SALE_TRANSPORT, transportMode: mode, transportCharge: mode === 'party' ? '' : prev.transportCharge };
      const nextState = { ...prev, ...vehicleDefaults };
      if (selectedVehicle && (selectedVehicle.ownership || 'party') !== mode) nextState.vehicleId = '';

      return { ...nextState, totalAmount: recalculateSaleAmount(nextState) };
    });
  };

  const handleBasisInputKeyDown = (e) => {
    const key = e.key?.toLowerCase();

    if (key === 'arrowdown') {
      e.preventDefault();
      e.stopPropagation();
      setIsBasisSectionActive(true);
      setBasisListIndex((prev) => {
        if (prev < 0) return 0;
        return Math.min(prev + 1, SALE_BASIS_OPTIONS.length - 1);
      });
      return;
    }

    if (key === 'arrowup') {
      e.preventDefault();
      e.stopPropagation();
      setIsBasisSectionActive(true);
      setBasisListIndex((prev) => {
        if (prev < 0) return 0;
        return Math.max(prev - 1, 0);
      });
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      const activeOption = basisListIndex >= 0 ? SALE_BASIS_OPTIONS[basisListIndex] : null;
      const selectedMode = activeOption?.value || formData.pricingMode || 'per_ton';
      selectPricingMode(selectedMode);
      setIsBasisSectionActive(false);
      requestAnimationFrame(() => {
        focusNextPopupField(basisInputRef.current);
      });
      return;
    }

    if (e.key === 'Escape' && isBasisSectionActive) {
      e.preventDefault();
      e.stopPropagation();
      setIsBasisSectionActive(false);
    }
  };

  const getProductDisplayName = (product) => String(product?.name || '').trim() || 'Product';

  const resolveProductNameById = (productId) => {
    const resolvedId = typeof productId === 'object' ? productId?._id : productId;
    if (!resolvedId) return '';
    const matching = products.find((product) => String(product._id) === String(resolvedId));
    return matching ? getProductDisplayName(matching) : '';
  };

  const getMatchingProducts = (queryValue) => {
    const normalized = normalizeText(queryValue);
    if (!normalized) return products;

    const startsWith = products.filter((product) => normalizeText(getProductDisplayName(product)).startsWith(normalized));
    const includes = products.filter((product) => (
      !normalizeText(getProductDisplayName(product)).startsWith(normalized)
      && normalizeText(getProductDisplayName(product)).includes(normalized)
    ));

    return [...startsWith, ...includes];
  };

  const selectedProductName = useMemo(() => {
    const resolvedName = resolveProductNameById(currentItem.product);
    return resolvedName || currentItem.productName || '';
  }, [currentItem.product, currentItem.productName, products]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = normalizeText(productQuery);
    const normalizedSelectedName = normalizeText(selectedProductName);

    if (
      isProductSectionActive
      && normalizedQuery
      && normalizedQuery === normalizedSelectedName
    ) {
      return products;
    }

    return getMatchingProducts(productQuery);
  }, [products, productQuery, isProductSectionActive, selectedProductName]);

  useEffect(() => {
    if (!showForm) return;

    if (filteredProducts.length === 0) {
      setProductListIndex(-1);
      return;
    }

    const shouldHighlightSelectedProduct = (
      isProductSectionActive
      && normalizeText(productQuery)
      && normalizeText(productQuery) === normalizeText(selectedProductName)
      && currentItem.product
    );

    if (shouldHighlightSelectedProduct) {
      const selectedIndex = filteredProducts.findIndex((item) => String(item._id) === String(currentItem.product));
      setProductListIndex(selectedIndex >= 0 ? selectedIndex : 0);
      return;
    }

    setProductListIndex((prev) => {
      if (prev < 0) return 0;
      if (prev >= filteredProducts.length) return filteredProducts.length - 1;
      return prev;
    });
  }, [showForm, filteredProducts, isProductSectionActive, productQuery, selectedProductName, currentItem.product]);

  const findExactProduct = (value) => {
    const normalized = normalizeText(value);
    if (!normalized) return null;
    return products.find((product) => normalizeText(getProductDisplayName(product)) === normalized) || null;
  };

  const findBestProductMatch = (value) => {
    const normalized = normalizeText(value);
    if (!normalized) return null;
    return products.find((product) => normalizeText(getProductDisplayName(product)).startsWith(normalized))
      || products.find((product) => normalizeText(getProductDisplayName(product)).includes(normalized))
      || null;
  };

  const selectProduct = (product) => {
    if (!product) {
      setProductQuery('');
      setCurrentItem((prev) => ({
        ...prev,
        product: '',
        productName: '',
        unit: 'ton',
        unitPrice: ''
      }));
      setProductListIndex(-1);
      return;
    }

    const productName = getProductDisplayName(product);
    setProductQuery(productName);
    setCurrentItem((prev) => ({
      ...prev,
      product: product._id,
      productName,
      unit: 'ton',
      unitPrice: getSalePriceInputValue(product)
    }));

    const selectedIndex = filteredProducts.findIndex((item) => String(item._id) === String(product._id));
    setProductListIndex(selectedIndex >= 0 ? selectedIndex : 0);
  };

  const handleProductFocus = () => {
    setIsProductSectionActive(true);
  };

  const handleProductInputChange = (e) => {
    const value = e.target.value;
    setProductQuery(value);

    if (!normalizeText(value)) {
      selectProduct(null);
      return;
    }

    const exactProduct = findExactProduct(value);
    if (exactProduct) {
      setCurrentItem((prev) => ({
        ...prev,
        product: exactProduct._id,
        productName: getProductDisplayName(exactProduct),
        unit: 'ton',
        unitPrice: getSalePriceInputValue(exactProduct)
      }));
      const exactIndex = getMatchingProducts(value).findIndex((item) => String(item._id) === String(exactProduct._id));
      setProductListIndex(exactIndex >= 0 ? exactIndex : 0);
      return;
    }

    const matches = getMatchingProducts(value);
    const firstMatch = matches[0] || null;
    setCurrentItem((prev) => ({
      ...prev,
      product: firstMatch?._id || '',
      productName: firstMatch ? getProductDisplayName(firstMatch) : '',
      unit: 'ton',
      unitPrice: firstMatch ? getSalePriceInputValue(firstMatch) : ''
    }));
    setProductListIndex(firstMatch ? 0 : -1);
  };

  const handleProductInputKeyDown = (e, endItemList) => {
    const key = e.key?.toLowerCase();
    const lastOptionIndex = filteredProducts.length;

    if (key === 'control' && !e.altKey && !e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
      openInlineProductForm();
      return;
    }

    if (key === 'arrowdown') {
      e.preventDefault();
      e.stopPropagation();
      setProductListIndex((prev) => {
        if (prev < 0) return 0;
        return Math.min(prev + 1, lastOptionIndex);
      });
      return;
    }

    if (key === 'arrowup') {
      e.preventDefault();
      e.stopPropagation();
      if (filteredProducts.length === 0) return;
      setProductListIndex((prev) => {
        if (prev < 0) return 0;
        return Math.max(prev - 1, 0);
      });
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();

      if (productListIndex === lastOptionIndex) {
        setIsProductSectionActive(false);
        endItemList?.();
        return;
      }

      const activeProduct = productListIndex >= 0 ? filteredProducts[productListIndex] : null;
      const matchedProduct = activeProduct || findExactProduct(productQuery) || findBestProductMatch(productQuery);
      if (matchedProduct) {
        selectProduct(matchedProduct);
      }
      setIsProductSectionActive(false);
      focusNextPopupField(e.currentTarget);
    }
  };

  const handleAddItem = () => {
    if (!currentItem.product || !currentItem.quantity || !currentItem.unitPrice) {
      setError('Product, quantity and price are required');
      return false;
    }

    const product = products.find(p => p._id === currentItem.product);
    if (!product || product.currentStock < currentItem.quantity) {
      setError(`Insufficient stock for ${product?.name}`);
      return false;
    }

    const taxAmount = 0;
    const total = currentItem.unitPrice * currentItem.quantity;

    const newItem = {
      ...currentItem,
      productName: product?.name,
      unit: String(product?.unit || currentItem.unit || '').trim(),
      quantity: parseFloat(currentItem.quantity),
      unitPrice: parseFloat(currentItem.unitPrice),
      taxAmount,
      discount: 0,
      total
    };

    setFormData({
      ...formData,
      items: [...formData.items, newItem]
    });

    setCurrentItem(initialCurrentItem);
    setProductQuery('');
    setProductListIndex(-1);
    setIsProductSectionActive(false);

    calculateTotals([...formData.items, newItem]);
    setError('');
    return true;
  };

  const handleRemoveItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
    calculateTotals(newItems);
  };

  const calculateTotals = (items) => {
    let subtotal = 0;
    let totalTax = 0;

    items.forEach(item => {
      subtotal += item.unitPrice * item.quantity;
      totalTax += item.taxAmount || 0;
    });

    const total = subtotal + totalTax;

    setFormData(prev => ({
      ...prev,
      subtotal,
      taxAmount: totalTax,
      totalAmount: total
    }));
  };

  // GST Sale on / off; turning it on starts with the GST rate from Settings
  const toggleGst = () => {
    setFormData((prev) => {
      const isGst = !prev.isGst;
      const gstRate = isGst && !(Number(prev.gstRate) > 0) ? String(user?.gstRate ?? 5) : prev.gstRate;
      const nextState = { ...prev, isGst, gstRate };
      return { ...nextState, totalAmount: recalculateSaleAmount(nextState) };
    });
  };

  // Royalty on / off; turning it on starts with the royalty per ton from Settings
  const toggleRoyalty = () => {
    setFormData((prev) => {
      const isRoyalty = !prev.isRoyalty;
      const royaltyRate = isRoyalty && !(Number(prev.royaltyRate) > 0) && Number(user?.royaltyRate || 0) > 0
        ? String(user.royaltyRate)
        : prev.royaltyRate;
      const nextState = { ...prev, isRoyalty, royaltyRate };
      return { ...nextState, totalAmount: recalculateSaleAmount(nextState) };
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
      if (name === 'customerPhone') {
        const normalizedPhone = String(value || '').replace(/\D/g, '').slice(0, 10);
        setFormData({ ...formData, customerPhone: normalizedPhone });
        return;
      }
      if (name === 'vehicleNo') {
        setFormData({ ...formData, vehicleId: '', vehicleNo: String(value || '').toUpperCase() });
        return;
    }
    if (name === 'materialType') {
      const selectedMaterial = MATERIAL_TYPE_OPTIONS.find((item) => item.value === value) || null;
      const configuredRate = getSaleRateForParty(user, selectedLeadger, value, formData.pricingMode);
      setFormData({
        ...formData,
        materialType: value,
        rate: configuredRate > 0 ? String(configuredRate) : '',
        totalAmount: recalculateSaleAmount({ ...formData, materialType: value, rate: configuredRate })
      });
      setMaterialQuery(getMaterialDisplayName(selectedMaterial));
      return;
    }
    if (name === 'saleDate') {
      setFormData({ ...formData, saleDate: value });
      return;
    }
    if (name === 'saleTime') {
      setFormData({ ...formData, saleTime: value });
      return;
    }
    if (name === 'tareWeight' || name === 'grossWeight') {
      const tareWeight = name === 'tareWeight' ? Number(value || 0) : Number(formData.tareWeight || 0);
      const grossWeight = name === 'grossWeight' ? Number(value || 0) : Number(formData.grossWeight || 0);
      const netWeight = getSafeNetWeight(grossWeight, tareWeight);
      const totalAmount = recalculateSaleAmount({ ...formData, [name]: value, netWeight });
      setFormData({ ...formData, [name]: value, netWeight, totalAmount });
      return;
    }
    if (name === 'pricingMode') {
      selectPricingMode(value);
      return;
    }
    if (name === 'cubicMeterQty') {
      const nextState = { ...formData, cubicMeterQty: value };
      setFormData({ ...nextState, totalAmount: recalculateSaleAmount(nextState) });
      return;
    }
    if (name === 'rate') {
      const totalAmount = recalculateSaleAmount({ ...formData, rate: value });
      setFormData({ ...formData, rate: value, totalAmount });
      return;
    }
    // Picking a location fills in the vehicle's trip rate for it, and the dispatch location when that is still empty
    if (name === 'transportLocation') {
      const tripRate = getTripRate(getVehicleHireRates(selectedSaleVehicle), value);
      setFormData({
        ...formData,
        transportLocation: value,
        transportRate: tripRate ? String(tripRate.rate || '') : formData.transportRate,
        dispatchLocation: String(formData.dispatchLocation || '').trim() ? formData.dispatchLocation : value
      });
      return;
    }
    if (name === 'royaltyRate' || name === 'royaltyQty') {
      const nextState = { ...formData, [name]: value };
      setFormData({ ...nextState, totalAmount: recalculateSaleAmount(nextState) });
      return;
    }
    if (name === 'royaltyNo') {
      setFormData({ ...formData, royaltyNo: String(value || '').toUpperCase() });
      return;
    }
    if (name === 'gstRate') {
      const nextState = { ...formData, gstRate: value };
      setFormData({ ...nextState, totalAmount: recalculateSaleAmount(nextState) });
      return;
    }
    if (name === 'transportCharge') {
      const nextState = { ...formData, transportCharge: value };
      setFormData({ ...nextState, totalAmount: recalculateSaleAmount(nextState) });
      return;
    }
    setFormData({ ...formData, [name]: value });
  };

  const handleProductCreated = (createdProduct) => {
    if (!createdProduct?._id) return;

    setProducts((prev) => [
      createdProduct,
      ...prev.filter((item) => String(item._id) !== String(createdProduct._id))
    ]);
    selectProduct(createdProduct);
    setError('');
    setShowProductForm(false);
    toast.success('Stock item created successfully', toastOptions);

    requestAnimationFrame(() => {
      focusNextPopupField(productInputRef.current);
    });
  };

  const handlePartyPopupSubmit = async (e) => {
    e.preventDefault();

    if (!String(partyFormData.name || '').trim()) {
      setPartyPopupError('Party name is required');
      return;
    }

    if (!['supplier', 'customer', 'transporter', 'cash-in-hand'].includes(partyFormData.type)) {
      setPartyPopupError('Party type is required');
      return;
    }

    try {
      setPartyPopupLoading(true);

      const payload = {
        type: String(partyFormData.type || '').trim(),
        name: String(partyFormData.name || '').trim(),
        mobile: String(partyFormData.mobile || '').trim(),
        email: String(partyFormData.email || '').trim(),
          address: String(partyFormData.address || '').trim(),
          state: String(partyFormData.state || '').trim(),
          pincode: String(partyFormData.pincode || '').trim(),
          openingBalance: Number(partyFormData.openingBalance || 0),
          openingBalanceType: String(partyFormData.openingBalanceType || 'receivable'),
          ...getPartySaleRatesPayload(partyFormData),
          ...getSupplierRatesPayload(partyFormData)
        };

      const response = await apiClient.post('/parties', payload);
      const createdParty = response || null;

      if (!createdParty?._id) {
        throw new Error('Party created but response was incomplete');
      }

      setLeadgers((prev) => [
        createdParty,
        ...prev.filter((item) => String(item._id) !== String(createdParty._id))
      ]);
      selectLeadger(createdParty);
      setError('');
      setPartyPopupError('');
      setShowPartyForm(false);
      setPartyFormData(getInitialPartyFormData('customer'));
      toast.success('Party created successfully', toastOptions);

      requestAnimationFrame(() => {
        focusNextPopupField(leadgerInputRef.current);
      });
    } catch (err) {
      setPartyPopupError(err.message || 'Error creating party');
    } finally {
      setPartyPopupLoading(false);
    }
  };


  const handleOcrFill = (data) => {
    if (!data) return;

    const { vehicleNo: ocrRaw, materialType, grossWeight, tareWeight, netWeight, saleDate, entryTime, exitTime, slipNo } = data;
    const upperOcrRaw = String(ocrRaw || '').trim().toUpperCase();

    // Vehicle No
    if (upperOcrRaw) {
      const matchResult = getSmartVehicleMatch(upperOcrRaw, vehicles, getVehicleDisplayName);
      const { matchedVehicle, isMismatch, matchedValue } = matchResult;

      if (isMismatch) {
        setOcrVehicleMismatch({ ocrValue: upperOcrRaw, matchedValue });
      } else {
        setOcrVehicleMismatch(null);
      }

      if (matchedVehicle) {
        selectVehicle(matchedVehicle);
      } else {
        setVehicleQuery(upperOcrRaw);
        setFormData((prev) => {
          const tare = Number(tareWeight || prev.tareWeight || 0);
          const gross = Number(grossWeight || prev.grossWeight || 0);
          const net = Number(netWeight || getSafeNetWeight(gross, tare) || 0);
          const total = recalculateSaleAmount({ ...prev, netWeight: net });
          return {
            ...prev,
            vehicleId: '',
            vehicleNo: upperOcrRaw,
            tareWeight: tare || prev.tareWeight,
            grossWeight: gross || prev.grossWeight,
            netWeight: net || prev.netWeight,
            totalAmount: total,
          };
        });
      }
    }

    // Material Type
    if (materialType) {
      const normalizedMat = String(materialType).toLowerCase().trim();
      const matched = MATERIAL_TYPE_OPTIONS.find((opt) => opt.value === normalizedMat);
      if (matched) {
        setMaterialQuery(getMaterialDisplayName(matched));
        const configuredRate = getCrusherMaterialRate(user, matched.value, formData.pricingMode);
          setFormData((prev) => ({
            ...prev,
            materialType: matched.value,
            rate: configuredRate > 0 ? String(configuredRate) : prev.rate,
            totalAmount: recalculateSaleAmount({
              ...prev,
              materialType: matched.value,
              rate: configuredRate > 0 ? configuredRate : prev.rate
            })
          }));
      }
    }

    // Weights (only if vehicle wasn't already matched — vehicle match sets them)
    // 1. Try exact logic again here to avoid overwriting netWeight if vehicle was matched above
    const isMatchedInDb = !!vehicles.find(v => {
      const vNo = String(v.vehicleNo || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      const ocrShort = upperOcrRaw.replace(/[^A-Z0-9]/g, '');
      return vNo === ocrShort || (ocrShort.length >= 4 && vNo.endsWith(ocrShort.slice(-4)));
    });

      if (!isMatchedInDb) {
        const tare = Number(tareWeight || 0);
        const gross = Number(grossWeight || 0);
        const net = Number(netWeight || 0) || getSafeNetWeight(gross, tare);
        setFormData((prev) => {
          const total = recalculateSaleAmount({ ...prev, netWeight: net });
          return {
            ...prev,
            tareWeight: tare > 0 ? tare : prev.tareWeight,
          grossWeight: gross > 0 ? gross : prev.grossWeight,
          netWeight: net > 0 ? net : prev.netWeight,
          totalAmount: total,
        };
      });
    }

    // Slip number from the weighbridge slip, unless one was already typed
    if (slipNo) {
      setFormData((prev) => (prev.invoiceNumber ? prev : { ...prev, invoiceNumber: String(slipNo).trim().toUpperCase() }));
    }

    // Sale Date
    if (saleDate) {
      setFormData((prev) => ({ ...prev, saleDate }));
    }

    if (entryTime) {
      setFormData((prev) => ({ ...prev, entryTime }));
    }

    if (exitTime) {
      setFormData((prev) => ({ ...prev, exitTime }));
    }

    if (data?.slipImg) {
      setFormData((prev) => ({ ...prev, slipImg: data.slipImg }));
    }

    toast.success('Slip data extracted!', { autoClose: 1500 });
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.party) {
      setError('Party name is required');
      return;
    }
    if (!formData.vehicleNo) {
      setError('Vehicle number is required');
      return;
    }
    if (!formData.materialType) {
      setError('Material type is required');
      return;
    }
    if (formData.pricingMode === 'per_cubic_meter' && Number(formData.cubicMeterQty || 0) <= 0) {
      setError('Please enter cubic feet quantity for per cft sale');
      return;
    }
    if (Number(formData.paidAmount || 0) < 0) {
      setError('Paid amount cannot be negative');
      return;
    }
    if (formData.transportMode === 'hired' && !formData.transporterId) {
      setError('Please select the transporter for the hired vehicle');
      return;
    }
    const parsedSaleDate = parseSaleDate(formData.saleDate);
    if (!parsedSaleDate) {
      setError('Please select a valid sale date');
      return;
    }
    const saleDateTime = combineSaleDateTime(parsedSaleDate, formData.saleTime);
    if (!saleDateTime) {
      setError('Please select a valid sale date and time');
      return;
    }

    try {
      setLoading(true);
      const ensuredVehicleId = await ensureVehicleExists();
      const submitData = {
        partyId: formData.party,
        vehicleId: ensuredVehicleId || formData.vehicleId || undefined,
        vehicleNo: String(formData.vehicleNo || '').trim().toUpperCase(),
        driverName: String(formData.driverName || '').trim(),
        invoiceNumber: String(formData.invoiceNumber || '').trim().toUpperCase(),
        rstNo: String(formData.rstNo || '').trim().toUpperCase(),
        stoneSize: formData.materialType,
        entryTime: String(formData.entryTime || '').trim(),
        exitTime: String(formData.exitTime || '').trim(),
        tareWeight: showsWeight(formData) ? Number(formData.tareWeight || 0) : 0,
        grossWeight: showsWeight(formData) ? Number(formData.grossWeight || 0) : 0,
        netWeight: showsWeight(formData) ? Number(formData.netWeight || 0) : 0,
        pricingMode: formData.pricingMode || 'per_ton',
        cubicMeterQty: Number(formData.cubicMeterQty || 0),
        rate: Number(formData.rate || 0),
        dispatchLocation: String(formData.dispatchLocation || '').trim(),
        transportMode: formData.transportMode || 'party',
        transportCharge: getSaleTransportCharge(formData),
        transporterId: formData.transportMode === 'hired' ? formData.transporterId : undefined,
        transportBasis: formData.transportBasis || 'per_ton',
        transportLocation: formData.transportBasis === 'per_trip' ? String(formData.transportLocation || '').trim() : '',
        transportQty: getSaleTransport(formData).qty,
        transportRate: Number(formData.transportRate || 0),
        isGst: Boolean(formData.isGst),
        gstRate: formData.isGst ? Number(formData.gstRate || 0) : 0,
        gstAmount: getSaleGstAmount(formData, getSaleTaxableAmount(formData)),
        isRoyalty: Boolean(formData.isRoyalty),
        royaltyNo: formData.isRoyalty ? String(formData.royaltyNo || '').trim().toUpperCase() : '',
        royaltyRate: formData.isRoyalty ? Number(formData.royaltyRate || 0) : 0,
        royaltyQty: formData.isRoyalty ? getSaleRoyaltyQty(formData) : 0,
        royaltyAmount: getSaleRoyaltyAmount(formData),
        totalAmount: Number(formData.totalAmount || 0),
        paidAmount: Number(formData.paidAmount || 0),
        account: formData.account || defaultAccountId || undefined,
        slipImg: String(formData.slipImg || '').trim(),
        saleDate: saleDateTime.toISOString(),
        saleTime: formData.saleTime || '',
        ...(!editingId && formData.weighmentId ? { weighmentId: formData.weighmentId } : {})
      };

      let savedSale;
      if (editingId) {
        savedSale = await apiClient.put(`/sales/${editingId}`, submitData);
      } else {
        savedSale = await apiClient.post('/sales', submitData);
      }
      toast.success(
        editingId ? 'Sale updated successfully' : 'Sale added successfully',
        toastOptions
      );
      fetchSales();
      setLockedWeights(null);
      setFormData(getInitialFormData(defaultPricingMode));
      setCurrentItem(initialCurrentItem);
      setEditingId(null);
      setShowPartyForm(false);
      setShowProductForm(false);
      setLeadgerQuery('');
      setLeadgerListIndex(-1);
      setIsLeadgerSectionActive(false);
      setProductQuery('');
      setProductListIndex(-1);
      setIsProductSectionActive(false);
      setShowForm(false);
      setError('');
      if (modalOnly && typeof onModalFinish === 'function') {
        onModalFinish();
      }
    } catch (err) {
      const errorMessage = err.message || 'Error saving sale';
      setError(errorMessage);
      toast.error(errorMessage, toastOptions);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (sale) => {
    const normalizedPartyId = typeof (sale.partyId || sale.party) === 'object'
      ? (sale.partyId || sale.party)?._id || ''
      : (sale.partyId || sale.party || '');
    const resolvedLeadgerName = resolveLeadgerNameById(normalizedPartyId) || sale.customerName || '';

      setFormData({
        ...getInitialFormData(),
        ...sale,
      party: normalizedPartyId,
      vehicleId: typeof sale.vehicleId === 'object' ? sale.vehicleId?._id || '' : sale.vehicleId || '',
      saleDate: formatDateForInput(sale.saleDate),
      entryTime: sale.entryTime || formatTimeForInput(sale.saleDate),
      exitTime: sale.exitTime || formatTimeForInput(sale.saleDate),
      customerName: resolvedLeadgerName,
      customerPhone: String(sale.customerPhone || '').replace(/\D/g, '').slice(0, 10),
      customerAddress: sale.customerAddress || '',
          materialType: sale.materialType || sale.stoneSize || '',
          vehicleNo: sale.vehicleNo || '',
          driverName: sale.driverName || '',
          tareWeight: sale.tareWeight || sale.vehicleWeight || '',
          grossWeight: sale.grossWeight || sale.netWeight || '',
          netWeight: sale.netWeight || sale.materialWeight || '',
          pricingMode: sale.pricingMode || 'per_ton',
          cubicMeterQty: sale.cubicMeterQty || '',
          rate: sale.rate || '',
        dispatchLocation: sale.dispatchLocation || '',
        transportMode: sale.transportMode || 'party',
        transportCharge: sale.transportCharge || '',
        transporterId: sale.transporterId?._id || sale.transporterId || '',
        transportBasis: sale.transportBasis || 'per_ton',
        transportLocation: sale.transportLocation || '',
        transportQty: sale.transportQty || '',
        transportRate: sale.transportRate || '',
        totalAmount: sale.totalAmount || 0,
        paidAmount: sale.paidAmount ?? '',
        account: sale.account?._id || sale.account || '',
        slipImg: sale.slipImg || '',
        isRoyalty: Boolean(sale.isRoyalty),
        royaltyNo: sale.royaltyNo || '',
        royaltyRate: Number(sale.royaltyRate || 0) > 0 ? String(sale.royaltyRate) : '',
        royaltyQty: Number(sale.royaltyQty || 0) > 0 ? String(sale.royaltyQty) : ''
      });
      setLockedWeights(sale.weighmentId ? ticketWeights(sale) : null);
      setLeadgerQuery(resolvedLeadgerName);
      setLeadgerListIndex(resolvedLeadgerName ? 0 : -1);
      setIsLeadgerSectionActive(false);
      setVehicleQuery(sale.vehicleNo || '');
      setVehicleListIndex(sale.vehicleNo ? 0 : -1);
      setIsVehicleSectionActive(false);
      const selectedMaterial = MATERIAL_TYPE_OPTIONS.find((item) => item.value === (sale.materialType || sale.stoneSize || '')) || null;
      setMaterialQuery(getMaterialDisplayName(selectedMaterial));
      setMaterialListIndex(selectedMaterial ? 0 : -1);
      setIsMaterialSectionActive(false);
      setProductQuery('');
      setProductListIndex(-1);
      setIsProductSectionActive(false);
    setEditingId(sale._id);
    setShowForm(true);
  };

  // Resolves true when the sale was deleted
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this sale?')) return false;
    try {
      await apiClient.delete(`/sales/${id}`);
      toast.success('Sale deleted successfully', toastOptions);
      fetchSales();
      return true;
    } catch (err) {
      setError(err.message || 'Error deleting sale');
      return false;
    }
  };

  const handleCancel = () => {
    setShowPartyForm(false);
    setShowProductForm(false);
    setShowVehicleForm(false);

    if (modalOnly && typeof onModalFinish === 'function') {
      onModalFinish();
      return;
    }

    setPartyFormData(getInitialPartyFormData('customer'));
    setPartyPopupError('');
    setShowForm(false);
    setEditingId(null);
    setLockedWeights(null);
      setFormData(getInitialFormData(defaultPricingMode));
      setCurrentItem(initialCurrentItem);
      setLeadgerQuery('');
      setLeadgerListIndex(-1);
      setIsLeadgerSectionActive(false);
      setVehicleQuery('');
      setVehicleListIndex(-1);
      setIsVehicleSectionActive(false);
      setMaterialQuery('');
      setMaterialListIndex(-1);
      setIsMaterialSectionActive(false);
      setProductQuery('');
      setProductListIndex(-1);
      setIsProductSectionActive(false);
  };

  const handleOpenForm = () => {
    setEditingId(null);
    setShowPartyForm(false);
    setShowProductForm(false);
    setShowVehicleForm(false);
    setPartyFormData(getInitialPartyFormData('customer'));
    setPartyPopupError('');
    if (weighment) {
      // From a weighbridge ticket: vehicle, RST, weights and times come from the kanta
      const weights = ticketWeights(weighment);
      const times = [weighment.first?.at, weighment.second?.at].filter(Boolean).sort((a, b) => new Date(a) - new Date(b));
      const base = getInitialFormData(defaultPricingMode);
      setLockedWeights(weights);
      weighmentVehiclePickedRef.current = false;
      setFormData({
        ...base,
        ...weights,
        // Weighed on the kanta, so billed by weight unless changed
        pricingMode: 'per_ton',
        vehicleNo: String(weighment.vehicleNo || '').toUpperCase(),
        rstNo: String(weighment.rstNo || ''),
        entryTime: times[0] ? formatClock(times[0]) : '',
        exitTime: times[1] ? formatClock(times[1]) : '',
        weighmentId: weighment._id
      });
      setVehicleQuery(String(weighment.vehicleNo || '').toUpperCase());
    } else {
      setLockedWeights(null);
      setFormData(getInitialFormData(defaultPricingMode));
    }
      setCurrentItem(initialCurrentItem);
      setLeadgerQuery('');
      setLeadgerListIndex(0);
      setIsLeadgerSectionActive(false);
      if (!weighment) setVehicleQuery('');
      setVehicleListIndex(0);
      setIsVehicleSectionActive(false);
      setMaterialQuery('');
      setMaterialListIndex(0);
      setIsMaterialSectionActive(false);
      setProductQuery('');
      setProductListIndex(0);
      setIsProductSectionActive(false);
    setShowForm(true);
  };


  const popupFieldClass = 'w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-medium text-gray-900 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200';
  const popupLabelClass = 'mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-600';
  const popupSectionClass = 'rounded-xl border-2 border-indigo-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-3 md:p-4';

  if (modalOnly) {
    return (
      <>
        <AddSalePopup
          showWeight={showsWeight(formData)}
          weightsLocked={Boolean(lockedWeights)}
          showCubic={showsCubic(formData)}
          showForm={showForm}
          editingId={editingId}
          loading={loading}
          error={error}
          isCashParty={isCashParty}
          formData={formData}
          currentItem={currentItem}
          products={products}
          accounts={accounts}
          defaultAccountId={defaultAccountId}
          popupFieldClass={popupFieldClass}
          popupLabelClass={popupLabelClass}
          leadgerSectionRef={leadgerSectionRef}
            leadgerInputRef={leadgerInputRef}
            vehicleSectionRef={vehicleSectionRef}
            vehicleInputRef={vehicleInputRef}
            materialSectionRef={materialSectionRef}
            materialInputRef={materialInputRef}
            basisSectionRef={basisSectionRef}
            basisInputRef={basisInputRef}
            productSectionRef={productSectionRef}
            productInputRef={productInputRef}
            leadgerQuery={leadgerQuery}
            vehicleQuery={vehicleQuery}
            materialQuery={materialQuery}
            productQuery={productQuery}
            leadgerListIndex={leadgerListIndex}
            vehicleListIndex={vehicleListIndex}
            materialListIndex={materialListIndex}
            basisListIndex={basisListIndex}
            productListIndex={productListIndex}
            filteredLeadgers={filteredLeadgers}
            filteredVehicles={filteredVehicles}
            filteredMaterialTypes={filteredMaterialTypes}
            filteredProducts={filteredProducts}
            isLeadgerSectionActive={isLeadgerSectionActive}
            isVehicleSectionActive={isVehicleSectionActive}
            isMaterialSectionActive={isMaterialSectionActive}
            isBasisSectionActive={isBasisSectionActive}
            isProductSectionActive={isProductSectionActive}
            setCurrentItem={setCurrentItem}
            setIsLeadgerSectionActive={setIsLeadgerSectionActive}
            setIsVehicleSectionActive={setIsVehicleSectionActive}
            setIsMaterialSectionActive={setIsMaterialSectionActive}
            setIsBasisSectionActive={setIsBasisSectionActive}
            setIsProductSectionActive={setIsProductSectionActive}
            setLeadgerListIndex={setLeadgerListIndex}
            setVehicleListIndex={setVehicleListIndex}
            setMaterialListIndex={setMaterialListIndex}
            setBasisListIndex={setBasisListIndex}
            setProductListIndex={setProductListIndex}
            getLeadgerDisplayName={getLeadgerDisplayName}
            getVehicleDisplayName={getVehicleDisplayName}
            getMaterialDisplayName={getMaterialDisplayName}
            getProductDisplayName={getProductDisplayName}
          handleCancel={handleCancel}
          handleSubmit={handleSubmit}
          handleInputChange={handleInputChange}
          saleTypePreview={saleTypePreview}
          onToggleGst={toggleGst}
          onToggleRoyalty={toggleRoyalty}
          pendingAmountPreview={pendingAmountPreview}
          excessAmountPreview={excessAmountPreview}
          handleLeadgerFocus={handleLeadgerFocus}
          handleLeadgerInputChange={handleLeadgerInputChange}
            handleLeadgerInputKeyDown={handleLeadgerInputKeyDown}
              handleVehicleFocus={handleVehicleFocus}
              handleVehicleInputChange={handleVehicleInputChange}
              handleVehicleInputKeyDown={handleVehicleInputKeyDown}
              handleMaterialFocus={handleMaterialFocus}
              handleMaterialInputChange={handleMaterialInputChange}
              handleMaterialInputKeyDown={handleMaterialInputKeyDown}
            handleBasisFocus={handleBasisFocus}
            handleBasisInputKeyDown={handleBasisInputKeyDown}
            getSaleBasisDisplayName={getSaleBasisDisplayName}
            selectPricingMode={selectPricingMode}
            transportParties={transportParties}
        tripLocations={selectedSaleVehicle ? getVehicleHireRates(selectedSaleVehicle).tripRates : []}
        dispatchSuggestions={dispatchSuggestions}
            selectTransportMode={selectTransportMode}
            onOpenNewVehicle={openInlineVehicleForm}
            onOpenNewParty={openInlinePartyForm}
          handleProductFocus={handleProductFocus}
          handleProductInputChange={handleProductInputChange}
          handleProductInputKeyDown={handleProductInputKeyDown}
          onOpenNewProduct={openInlineProductForm}
          handleSelectEnterMoveNext={handleSelectEnterMoveNext}
          handleAddItem={handleAddItem}
          handleRemoveItem={handleRemoveItem}
          selectLeadger={selectLeadger}
          selectVehicle={selectVehicle}
          selectProduct={selectProduct}
          onOcrFill={handleOcrFill}
          ocrVehicleMismatch={ocrVehicleMismatch}
          setOcrVehicleMismatch={setOcrVehicleMismatch}
        />
        <AddPartyPopup
          showForm={showPartyForm}
          editingId={null}
          loading={partyPopupLoading}
          formData={partyFormData}
          error={partyPopupError}
          handleCloseForm={() => closeInlinePartyForm(true)}
          handleSubmit={handlePartyPopupSubmit}
          handleChange={handlePartyPopupChange}
        />
        <AddProductPopup
          showForm={showProductForm}
          initialName={productQuery}
          onClose={() => closeInlineProductForm(true)}
          onProductCreated={handleProductCreated}
        />
        {showVehicleForm && (
          <AddVehiclePopup
            vehicle={null}
            onClose={() => closeInlineVehicleForm(true)}
            onSave={fetchVehicles}
            onVehicleSaved={async (savedVehicle) => {
              if (!savedVehicle) return;
              setVehicles((prev) => [
                ...sortVehiclesByTypePreference([
                  savedVehicle,
                  ...prev.filter((item) => String(item._id) !== String(savedVehicle._id))
                ], 'sales')
              ]);
              const latestLeadgers = await fetchLeadgers();
              selectVehicle(savedVehicle, latestLeadgers);
              closeInlineVehicleForm(true);
            }}
          />
        )}
      </>
    );
  }

  // The popup shares `loading` while it saves; the list behind it should not react to that
  const listLoading = loading && !showForm;
  const initialLoading = listLoading && sales.length === 0;
  const hasFilters = Boolean(debouncedSearch || materialFilter || gstFilter !== 'all' || royaltyFilter !== 'all' || tableRange !== 'lifetime');

  // Material choices in the filter: the usual sizes, plus any other material sold in this period
  const materialFilterOptions = (() => {
    const known = MATERIAL_TYPE_OPTIONS.map((item) => ({ key: item.value, label: item.label }));
    const extra = materialStats
      .map((row) => row.materialType)
      .filter((key) => key && key !== 'unknown' && !known.some((item) => item.key === key))
      .map((key) => ({ key, label: key.toUpperCase() }));
    return [...known, ...extra];
  })();

  const clearAllFilters = () => {
    handleRangeChange('lifetime');
    setGstFilter('all');
    setRoyaltyFilter('all');
    setMaterialFilter('');
  };

  // Chips beside the tabs show what is applied; tapping one removes it
  const activeFilterChips = [
    gstFilter !== 'all' && { key: 'gst', label: GST_FILTER_OPTIONS.find((o) => o.key === gstFilter)?.label, clear: () => setGstFilter('all') },
    royaltyFilter !== 'all' && { key: 'royalty', label: ROYALTY_FILTER_OPTIONS.find((o) => o.key === royaltyFilter)?.label, clear: () => setRoyaltyFilter('all') },
    materialFilter && { key: 'material', label: materialFilter.toUpperCase(), clear: () => setMaterialFilter('') }
  ].filter(Boolean);

  const periodLabel = (() => {
    if (tableRange === 'month') return formatMonthLabel(selectedMonth, selectedYear);
    if (tableRange === 'custom') return formatRangeLabel(customFrom, customTo);
    if (tableRange === 'lifetime') return 'All time';
    const { from, to } = getRangeBounds(tableRange);
    return `${formatDate(from)} – ${formatDate(to)}`;
  })();

  // Material rows cover every material of the period; the summary follows the material filter
  const materialTotals = materialStats.reduce((acc, row) => {
    acc.count += Number(row.count || 0);
    acc.totalAmount += Number(row.totalAmount || 0);
    acc.totalWeight += Number(row.totalWeight || 0);
    acc.totalCubicMeter += Number(row.totalCubicMeter || 0);
    return acc;
  }, { count: 0, totalAmount: 0, totalWeight: 0, totalCubicMeter: 0 });
  const maxMaterialAmount = materialStats[0]?.totalAmount || 0;
  const summaryCubicMeter = materialFilter
    ? Number(materialStats.find((row) => row.materialType === materialFilter.toLowerCase())?.totalCubicMeter || 0)
    : materialTotals.totalCubicMeter;

  // Royalty / GST / Transport columns show only when the period has such a sale
  const showRoyaltyColumn = Number(summary.royaltyAmount || 0) > 0 || sales.some((sale) => getSavedSaleRoyalty(sale) > 0);
  const showGstColumn = Number(summary.gstAmount || 0) > 0 || sales.some((sale) => getSavedSaleGst(sale) > 0);
  const showTransportColumn = Number(summary.transportCharge || 0) > 0 || sales.some((sale) => getSaleTransportCharge(sale) > 0);

  const shareOfSales = (amount) => (
    summary.totalAmount > 0 ? `${((amount / summary.totalAmount) * 100).toFixed(0)}% of sales` : 'No sales'
  );

  const stats = [
    { icon: IndianRupee, label: 'Total Sales', tone: 'emerald', value: formatRupees(summary.totalAmount), hint: [
      entryCount(summary.count),
      Number(summary.gstAmount || 0) > 0 ? `GST ${formatRupees(summary.gstAmount)}` : '',
      Number(summary.royaltyAmount || 0) > 0 ? `Royalty ${formatRupees(summary.royaltyAmount)}` : ''
    ].filter(Boolean).join(' · ') },
    { icon: Banknote, label: 'Cash Sale', tone: 'blue', value: formatRupees(summary.cashAmount), hint: shareOfSales(summary.cashAmount) },
    { icon: CreditCard, label: 'Credit Sale', tone: 'rose', value: formatRupees(summary.creditAmount), hint: shareOfSales(summary.creditAmount) },
    {
      icon: Scale, label: 'Material Sold', tone: 'indigo',
      value: `${formatQty(summary.totalWeight / 1000)} tons`,
      hint: summaryCubicMeter > 0 ? `${formatQty(summaryCubicMeter)} cft billed by volume` : `${formatQty(summary.totalWeight)} kg`
    }
  ];

  // Picking a material in the material-wise list opens its entries
  const openMaterial = (materialType) => {
    setMaterialFilter(materialType);
    setTab('entries');
  };

  // The values a sale row shows, worked out once for the phone list and the table
  const describeSale = (sale) => {
    const total = Number(sale.totalAmount || 0);
    const paid = Number(sale.paidAmount || 0);
    const transporter = sale.transportMode === 'hired' ? resolveLeadgerNameById(sale.transporterId) : '';
    const ownVehicle = sale.transportMode && sale.transportMode !== 'party' ? getOwnershipLabel(sale.transportMode) : '';
    const transportCharge = getSaleTransportCharge(sale);
    const gstAmount = getSavedSaleGst(sale);
    const royaltyAmount = getSavedSaleRoyalty(sale);
    // What the transporter is paid for this trip: "₹500 / trip · Raipur", "₹180 / ton", or monthly rent
    const unit = getBasisUnit(sale.transportBasis);
    const transportRate = sale.transportMode !== 'hired'
      ? ''
      : PERIOD_BASES.includes(sale.transportBasis)
        ? 'On monthly rent'
        : Number(sale.transportRate || 0) > 0
          ? [`₹${Number(sale.transportRate).toLocaleString('en-IN')}${unit ? ` / ${unit}` : ''}`, sale.transportLocation].filter(Boolean).join(' · ')
          : '';

    return {
      party: resolveLeadgerNameById(sale.partyId || sale.party) || sale.customerName || '—',
      material: String(sale.materialType || sale.stoneSize || '').trim(),
      isCubic: sale.pricingMode === 'per_cubic_meter',
      netWeight: Number(sale.netWeight || sale.materialWeight || 0),
      // Cubic feet noted on a sale billed per ton (Settings → "Record both")
      extraCubic: sale.pricingMode !== 'per_cubic_meter' && recordBoth ? Number(sale.cubicMeterQty || 0) : 0,
      transportNote: transporter ? `${ownVehicle} · ${transporter}` : ownVehicle,
      transportMode: sale.transportMode || 'party',
      transporter,
      transportRate,
      transportCost: sale.transportMode === 'hired' ? getSaleTransport(sale).cost : 0,
      transportCharge,
      materialAmount: Math.max(0, Number(sale.totalAmount || 0) - transportCharge - royaltyAmount - gstAmount),
      royaltyAmount,
      gstAmount,
      paid,
      // Only a part-paid sale needs its balance spelled out; the Cash / Credit badge says the rest
      balance: paid > 0 && total > paid ? total - paid : 0
    };
  };

  // The export period starts as the period on screen; "All" starts at this month
  const getExportStartRange = () => {
    const { from, to } = getRangeBounds(tableRange, customFrom, customTo, selectedMonth, selectedYear);
    const today = new Date();
    return {
      from: from ? toLocalDateInput(new Date(from)) : toLocalDateInput(new Date(today.getFullYear(), today.getMonth(), 1)),
      to: to ? toLocalDateInput(new Date(to)) : toLocalDateInput(today)
    };
  };

  // The crusher's name heads a PDF export; staff export under their owner's name
  const companyName = String((user?.role === 'employee' ? user?.ownerName : user?.name) || '').trim();

  // Every sale of the period (not only the page on screen), oldest first, one row each.
  // The PDF leaves out gross / tare / net in kg, dispatch place and transport note so the table fits an A4 page.
  const handleExport = async (fromDay, toDay) => {
    setExporting(true);
    try {
      const response = await apiClient.get('/sales', {
        params: {
          from: new Date(`${fromDay}T00:00:00`).toISOString(),
          to: new Date(`${toDay}T23:59:59.999`).toISOString(),
          ...(gstFilter !== 'all' ? { gst: gstFilter } : {}),
          ...(royaltyFilter !== 'all' ? { royalty: royaltyFilter } : {})
        }
      });
      const rows = (Array.isArray(response) ? response : [])
        .map((sale) => ({ sale, view: describeSale(sale) }))
        .sort((a, b) => (
          new Date(a.sale.saleDate || a.sale.createdAt) - new Date(b.sale.saleDate || b.sale.createdAt)
          || new Date(a.sale.createdAt) - new Date(b.sale.createdAt)
        ));
      if (rows.length === 0) {
        toast.info('No sales in this period');
        return;
      }

      const balanceOf = ({ sale }) => Math.max(0, Number(sale.totalAmount || 0) - Number(sale.paidAmount || 0));
      const sum = (getValue) => rows.reduce((total, row) => total + Number(getValue(row) || 0), 0);
      const columns = [
        { key: 'date', header: 'Date', type: 'date', width: 12, value: ({ sale }) => sale.saleDate || sale.createdAt },
        { key: 'invoice', header: 'Invoice No', width: 12, value: ({ sale }) => sale.invoiceNumber },
        { key: 'rst', header: 'RST No', width: 10, value: ({ sale }) => sale.rstNo },
        { key: 'party', header: 'Party', width: 26, value: ({ view }) => (view.party === '—' ? '' : view.party) },
        { key: 'vehicle', header: 'Vehicle No', width: 14, value: ({ sale }) => sale.vehicleNo },
        { key: 'material', header: 'Material', width: 10, value: ({ view }) => view.material.toUpperCase() },
        { key: 'billedBy', header: 'Billed By', width: 10, value: ({ view }) => (view.isCubic ? 'Cft' : 'Ton') },
        { key: 'gross', header: 'Gross (kg)', type: 'number', format: '#,##0', width: 12, pdf: false, value: ({ sale }) => sale.grossWeight || '' },
        { key: 'tare', header: 'Tare (kg)', type: 'number', format: '#,##0', width: 12, pdf: false, value: ({ sale }) => sale.tareWeight || '' },
        { key: 'net', header: 'Net (kg)', type: 'number', format: '#,##0', width: 12, pdf: false, value: ({ view }) => view.netWeight || '' },
        { key: 'tons', header: 'Net (Ton)', type: 'number', format: '#,##0.000', width: 11, value: ({ view }) => (view.netWeight ? view.netWeight / 1000 : '') },
        { key: 'cft', header: 'Cft', type: 'number', width: 10, value: ({ sale }) => Number(sale.cubicMeterQty || 0) || '' },
        { key: 'rate', header: 'Rate', type: 'number', width: 10, value: ({ sale }) => sale.rate },
        { key: 'materialAmount', header: 'Material Amount', type: 'number', width: 15, value: ({ view }) => view.materialAmount },
        { key: 'transportCharge', header: 'Transport Charge', type: 'number', width: 15, value: ({ view }) => view.transportCharge || '' },
        { key: 'royaltyNo', header: 'Royalty No', width: 12, value: ({ sale }) => (sale.isRoyalty ? sale.royaltyNo : '') },
        { key: 'royalty', header: 'Royalty', type: 'number', width: 12, value: ({ view }) => view.royaltyAmount || '' },
        { key: 'gst', header: 'GST', type: 'number', width: 12, value: ({ view }) => view.gstAmount || '' },
        { key: 'total', header: 'Total Amount', type: 'number', width: 14, value: ({ sale }) => sale.totalAmount },
        { key: 'paid', header: 'Paid', type: 'number', width: 12, value: ({ sale }) => sale.paidAmount || '' },
        { key: 'balance', header: 'Balance', type: 'number', width: 12, value: (row) => balanceOf(row) || '' },
        { key: 'payment', header: 'Payment', width: 10, value: ({ sale }) => formatSaleTypeLabel(sale.type) },
        { key: 'dispatch', header: 'Dispatch To', width: 18, pdf: false, value: ({ sale }) => sale.dispatchLocation },
        { key: 'transport', header: 'Transport', width: 24, pdf: false, value: ({ view }) => (view.transportMode === 'party' ? 'Party vehicle' : view.transportNote) }
      ];

      const totals = {
        date: `Total (${entryCount(rows.length)})`,
        gross: sum(({ sale }) => sale.grossWeight),
        tare: sum(({ sale }) => sale.tareWeight),
        net: sum(({ view }) => view.netWeight),
        tons: sum(({ view }) => view.netWeight) / 1000,
        cft: sum(({ sale }) => sale.cubicMeterQty),
        materialAmount: sum(({ view }) => view.materialAmount),
        transportCharge: sum(({ view }) => view.transportCharge),
        royalty: sum(({ view }) => view.royaltyAmount),
        gst: sum(({ view }) => view.gstAmount),
        total: sum(({ sale }) => sale.totalAmount),
        paid: sum(({ sale }) => sale.paidAmount),
        balance: sum(balanceOf)
      };
      if (exportFormat === 'pdf') {
        await downloadPdf({
          fileName: getExportFileName('Sales', fromDay, toDay, 'pdf'),
          title: `${companyName ? `${companyName} - ` : ''}Sales Report`,
          subtitle: `${formatRangeLabel(fromDay, toDay)} · ${entryCount(rows.length)}`,
          columns,
          rows,
          totals
        });
      } else {
        await downloadExcel({ fileName: getExportFileName('Sales', fromDay, toDay), sheet: 'Sales', columns, rows, totals });
      }
      setExportFormat(null);
      toast.success(`Exported ${entryCount(rows.length)}`, toastOptions);
    } catch (err) {
      toast.error(err.message || 'Could not export sales');
    } finally {
      setExporting(false);
    }
  };

  // Under the total: Cash, Credit, or the balance left on a part-paid sale
  const getPaymentNote = (sale, view) => {
    if (sale.type === 'cash') return { label: 'Cash', tone: 'text-emerald-600' };
    if (sale.type === 'partial' && view.balance > 0) return { label: `Bal ${formatAmount(view.balance)}`, tone: 'text-rose-600' };
    return { label: 'Credit', tone: 'text-rose-500' };
  };

  // A royalty / GST / transport cell: the amount, or a faint dash when the sale has none
  // tone: GST is blue and royalty orange, so the two read apart at a glance
  const renderCharge = (amount, tone = '') => (amount > 0 ? <span className={tone}>{formatAmount(amount)}</span> : <span className="text-slate-300">—</span>);

  const renderMaterial = (material) => (material
    ? <span className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase ${getMaterialBadgeClass(material)}`}>{material}</span>
    : <span className="text-slate-400">—</span>);

  const renderActions = (sale) => (
    <div className="flex items-center justify-end" onClick={(event) => event.stopPropagation()}>
      <button type="button" title="View details" aria-label="View details" className="icon-btn p-1.5 text-slate-300 group-hover:text-slate-500 hover:bg-emerald-50 hover:text-emerald-600" onClick={() => setDetailSale(sale)}>
        <Eye size={16} />
      </button>
      {canEditEntry(user, sale) && (
        <button type="button" title="Edit" aria-label="Edit" className="icon-btn p-1.5 text-slate-300 group-hover:text-slate-500 hover:bg-blue-50 hover:text-blue-600" onClick={() => handleEdit(sale)}>
          <Pencil size={16} />
        </button>
      )}
      {canDeleteSales && (
        <button type="button" title="Delete" aria-label="Delete" className="icon-btn p-1.5 text-slate-300 group-hover:text-slate-500 hover:bg-rose-50 hover:text-rose-600" onClick={() => handleDelete(sale._id)}>
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );

  const renderEmpty = (title, text) => (
    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Inbox size={20} />
      </span>
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <p className="text-xs text-slate-500">{text}</p>
    </div>
  );

  const materialBar = (row) => (
    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${maxMaterialAmount > 0 ? Math.max((row.totalAmount / maxMaterialAmount) * 100, 2) : 0}%` }} />
    </div>
  );

  return (
    <div className="page-fade-in space-y-3.5 px-3 pb-6 pt-3.5 md:space-y-4 lg:px-6 lg:pt-4">
      <AddSalePopup
        showWeight={showsWeight(formData)}
          weightsLocked={Boolean(lockedWeights)}
        showCubic={showsCubic(formData)}
        showForm={showForm}
        editingId={editingId}
        loading={loading}
        error={showForm ? error : ''}
        isCashParty={isCashParty}
        formData={formData}
        currentItem={currentItem}
        products={products}
        accounts={accounts}
        defaultAccountId={defaultAccountId}
        popupFieldClass={popupFieldClass}
        popupLabelClass={popupLabelClass}
        popupSectionClass={popupSectionClass}
        leadgerSectionRef={leadgerSectionRef}
        leadgerInputRef={leadgerInputRef}
        vehicleSectionRef={vehicleSectionRef}
        vehicleInputRef={vehicleInputRef}
        materialSectionRef={materialSectionRef}
        materialInputRef={materialInputRef}
        basisSectionRef={basisSectionRef}
        basisInputRef={basisInputRef}
        productSectionRef={productSectionRef}
        productInputRef={productInputRef}
        leadgerQuery={leadgerQuery}
        vehicleQuery={vehicleQuery}
        materialQuery={materialQuery}
        productQuery={productQuery}
        leadgerListIndex={leadgerListIndex}
        vehicleListIndex={vehicleListIndex}
        materialListIndex={materialListIndex}
        basisListIndex={basisListIndex}
        productListIndex={productListIndex}
        filteredLeadgers={filteredLeadgers}
        filteredVehicles={filteredVehicles}
        filteredMaterialTypes={filteredMaterialTypes}
        filteredProducts={filteredProducts}
        isLeadgerSectionActive={isLeadgerSectionActive}
        isVehicleSectionActive={isVehicleSectionActive}
        isMaterialSectionActive={isMaterialSectionActive}
        isBasisSectionActive={isBasisSectionActive}
        isProductSectionActive={isProductSectionActive}
        setCurrentItem={setCurrentItem}
        setIsLeadgerSectionActive={setIsLeadgerSectionActive}
        setIsVehicleSectionActive={setIsVehicleSectionActive}
        setIsMaterialSectionActive={setIsMaterialSectionActive}
        setIsBasisSectionActive={setIsBasisSectionActive}
        setIsProductSectionActive={setIsProductSectionActive}
        setLeadgerListIndex={setLeadgerListIndex}
        setVehicleListIndex={setVehicleListIndex}
        setMaterialListIndex={setMaterialListIndex}
        setBasisListIndex={setBasisListIndex}
        setProductListIndex={setProductListIndex}
        getLeadgerDisplayName={getLeadgerDisplayName}
        getVehicleDisplayName={getVehicleDisplayName}
        getMaterialDisplayName={getMaterialDisplayName}
        getProductDisplayName={getProductDisplayName}
        handleCancel={handleCancel}
        handleSubmit={handleSubmit}
        handleInputChange={handleInputChange}
        saleTypePreview={saleTypePreview}
        onToggleGst={toggleGst}
        onToggleRoyalty={toggleRoyalty}
        pendingAmountPreview={pendingAmountPreview}
        excessAmountPreview={excessAmountPreview}
        handleLeadgerFocus={handleLeadgerFocus}
        handleLeadgerInputChange={handleLeadgerInputChange}
        handleLeadgerInputKeyDown={handleLeadgerInputKeyDown}
        handleVehicleFocus={handleVehicleFocus}
        handleVehicleInputChange={handleVehicleInputChange}
        handleVehicleInputKeyDown={handleVehicleInputKeyDown}
        handleMaterialFocus={handleMaterialFocus}
        handleMaterialInputChange={handleMaterialInputChange}
        handleMaterialInputKeyDown={handleMaterialInputKeyDown}
        handleBasisFocus={handleBasisFocus}
        handleBasisInputKeyDown={handleBasisInputKeyDown}
        getSaleBasisDisplayName={getSaleBasisDisplayName}
        selectPricingMode={selectPricingMode}
        transportParties={transportParties}
        tripLocations={selectedSaleVehicle ? getVehicleHireRates(selectedSaleVehicle).tripRates : []}
        dispatchSuggestions={dispatchSuggestions}
        selectTransportMode={selectTransportMode}
        onOpenNewVehicle={openInlineVehicleForm}
        onOpenNewParty={openInlinePartyForm}
        handleProductFocus={handleProductFocus}
        handleProductInputChange={handleProductInputChange}
        handleProductInputKeyDown={handleProductInputKeyDown}
        onOpenNewProduct={openInlineProductForm}
        handleSelectEnterMoveNext={handleSelectEnterMoveNext}
        handleAddItem={handleAddItem}
        handleRemoveItem={handleRemoveItem}
        selectLeadger={selectLeadger}
        selectVehicle={selectVehicle}
        selectProduct={selectProduct}
        onOcrFill={handleOcrFill}
        ocrVehicleMismatch={ocrVehicleMismatch}
        setOcrVehicleMismatch={setOcrVehicleMismatch}
      />
      <AddPartyPopup
        showForm={showPartyForm}
        editingId={null}
        loading={partyPopupLoading}
        formData={partyFormData}
        error={partyPopupError}
        handleCloseForm={() => closeInlinePartyForm(true)}
        handleSubmit={handlePartyPopupSubmit}
        handleChange={handlePartyPopupChange}
      />
      <AddProductPopup
        showForm={showProductForm}
        initialName={productQuery}
        onClose={() => closeInlineProductForm(true)}
        onProductCreated={handleProductCreated}
      />
      {showVehicleForm && (
        <AddVehiclePopup
          vehicle={null}
          onClose={() => closeInlineVehicleForm(true)}
          onSave={fetchVehicles}
        onVehicleSaved={async (savedVehicle) => {
          if (!savedVehicle) return;
          setVehicles((prev) => [
            ...sortVehiclesByTypePreference([
              savedVehicle,
              ...prev.filter((item) => String(item._id) !== String(savedVehicle._id))
            ], 'sales')
          ]);
          const latestLeadgers = await fetchLeadgers();
          selectVehicle(savedVehicle, latestLeadgers);
          closeInlineVehicleForm(true);
        }}
      />
      )}
      {detailSale && (
        <SaleDetailsPopup
          sale={detailSale}
          view={describeSale(detailSale)}
          accountName={accounts.find((account) => String(account._id) === String(detailSale.account))?.name || ''}
          onClose={() => setDetailSale(null)}
          onOpenInvoice={() => handleOpenInvoicePdf(detailSale._id)}
          onEdit={canEditEntry(user, detailSale) ? () => { const sale = detailSale; setDetailSale(null); handleEdit(sale); } : null}
          onDelete={canDeleteSales ? async () => { if (await handleDelete(detailSale._id)) setDetailSale(null); } : null}
        />
      )}
      {showCustomPicker && (
        <CustomRangePopup from={customFrom} to={customTo} onApply={applyCustomPicker} onClose={closeCustomPicker} />
      )}
      {exportFormat && (
        <CustomRangePopup
          {...getExportStartRange()}
          title={exportFormat === 'pdf' ? 'Export Sales to PDF' : 'Export Sales to Excel'}
          subtitle="Every sale between these dates goes in the file"
          applyLabel={exporting ? 'Exporting...' : exportFormat === 'pdf' ? 'Export PDF' : 'Export Excel'}
          busy={exporting}
          onApply={handleExport}
          onClose={() => !exporting && setExportFormat(null)}
        />
      )}
      {showMonthPicker && (
        <MonthPickerPopup
          month={selectedMonth}
          year={selectedYear}
          subtitle="Choose the year, then the month to view sales"
          onApply={applyMonthPicker}
          onClose={closeMonthPicker}
        />
      )}
      {/* The page is three blocks, like the Boulder Ledger: period filter, the period's totals, then one panel with the data */}
      <div className="page-header gap-2.5">
        <div className="min-w-0">
          <h1 className="page-title">Sales Report</h1>
          <p className="page-subtitle">Crushed material sold · {periodLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented options={SALES_RANGE_OPTIONS} value={tableRange} onChange={handleRangeChange} />
          <button type="button" className="btn-secondary" onClick={() => setExportFormat('excel')} title="Export sales of a period to Excel">
            <FileSpreadsheet size={18} /> Excel
          </button>
          <button type="button" className="btn-secondary" onClick={() => setExportFormat('pdf')} title="Export sales of a period to PDF, ready to print">
            <FileText size={18} /> PDF
          </button>
          {canCreateSales && (
            <button type="button" className="btn-primary" onClick={handleOpenForm}>
              <Plus size={18} /> New Sale
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700">{error}</div>
      )}

      <section className={`grid grid-cols-2 gap-2 transition-opacity md:gap-3 lg:grid-cols-4 ${listLoading ? 'opacity-50' : ''}`}>
        {stats.map((stat) => <StatCard key={stat.label} compact {...stat} />)}
      </section>

      <section className="panel">
        <div className="panel-header py-2.5 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <Segmented options={TABS} value={tab} onChange={setTab} />
            {activeFilterChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={chip.clear}
                title="Remove this filter"
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-primary-700"
              >
                {chip.label}
                <X size={14} />
              </button>
            ))}
          </div>
          <div className="flex min-w-0 flex-1 basis-56 items-center justify-end gap-2">
            {tab === 'entries' && (
              <div className="relative min-w-0 flex-1 md:max-w-64">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  className="input pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search party, vehicle or invoice"
                />
              </div>
            )}
            <SalesFilterMenu
              rangeOptions={SALES_RANGE_OPTIONS}
              range={tableRange}
              onRangeChange={handleRangeChange}
              gst={gstFilter}
              onGstChange={setGstFilter}
              royalty={royaltyFilter}
              onRoyaltyChange={setRoyaltyFilter}
              materials={materialFilterOptions}
              material={materialFilter}
              onMaterialChange={(key) => { setMaterialFilter(key); if (key) setTab('entries'); }}
              onClear={clearAllFilters}
            />
            <button type="button" className="icon-btn shrink-0" title="Refresh" aria-label="Refresh" onClick={fetchSales}>
              <RefreshCw size={16} className={listLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {initialLoading ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="h-9 w-9 animate-spin rounded-full border-4 border-primary-600 border-r-transparent" />
            <p className="text-sm text-slate-400">Loading sales…</p>
          </div>
        ) : (
          <div className={`transition-opacity ${listLoading ? 'pointer-events-none opacity-50' : ''}`}>
            {tab === 'entries' && (sales.length === 0
              ? renderEmpty('No sales found', hasFilters ? 'Try changing the search or the period.' : 'Add the first sale with "New Sale".')
              : (
                <>
                  {/* Phone: three short lines per sale (a fourth, small, for royalty / GST / transport); tap for details, edit and delete */}
                  <ul className="divide-y divide-slate-100 md:hidden">
                    {sales.map((sale) => {
                      const view = describeSale(sale);
                      const charges = [
                        view.royaltyAmount > 0 && { key: 'royalty', label: `Royalty ${formatAmount(view.royaltyAmount)}`, tone: 'text-orange-600' },
                        view.gstAmount > 0 && { key: 'gst', label: `GST ${formatAmount(view.gstAmount)}`, tone: 'text-sky-600' },
                        view.transportCharge > 0 && { key: 'transport', label: `Transport ${formatAmount(view.transportCharge)}`, tone: '' }
                      ].filter(Boolean);
                      const payment = getPaymentNote(sale, view);
                      return (
                        <li key={sale._id} className="cursor-pointer px-4 py-2.5 active:bg-slate-50" onClick={() => setDetailSale(sale)}>
                          <div className="flex items-baseline justify-between gap-3">
                            <p className="min-w-0 truncate text-[13px] font-semibold text-slate-800">{view.party}</p>
                            <p className="shrink-0 text-[13px] font-bold tabular-nums text-slate-900">{formatRupees(sale.totalAmount)}</p>
                          </div>
                          <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-slate-600">
                            <span className="shrink-0 font-mono text-[11px] font-medium text-slate-700">{sale.vehicleNo || '-'}</span>
                            <span className="text-slate-300">·</span>
                            {renderMaterial(view.material)}
                            <span className="truncate tabular-nums">
                              {formatSaleQty(sale, view)}
                              {Number(sale.rate || 0) > 0 && <span className="text-slate-400"> @ ₹{formatAmount(sale.rate)}/{view.isCubic ? 'cft' : 't'}</span>}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-slate-400">
                            <span className="min-w-0 truncate">
                              {formatShortDate(sale.saleDate)} · {sale.invoiceNumber}
                              {charges.map((charge) => (
                                <span key={charge.key}> · <span className={`font-medium ${charge.tone}`}>{charge.label}</span></span>
                              ))}
                            </span>
                            <span className={`shrink-0 font-semibold ${payment.tone}`}>{payment.label}</span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  {/* Desktop: one plain number per column; only the total is bold, colour only on the material and payment */}
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[980px] text-left">
                      <thead>
                        <tr>
                          <th className={ETH}>Date</th>
                          <th className={ETH}>Party</th>
                          <th className={ETH}>Vehicle</th>
                          <th className={ETH}>Material</th>
                          <th className={`${ETH} text-right`}>Net Wt</th>
                          <th className={`${ETH} text-right`}>Rate</th>
                          <th className={`${ETH} text-right`}>Mat Amt</th>
                          {showRoyaltyColumn && <th className={`${ETH} text-right text-orange-600/80`}>Royalty</th>}
                          {showGstColumn && <th className={`${ETH} text-right text-sky-600/80`}>GST</th>}
                          {showTransportColumn && <th className={`${ETH} text-right`}>Transport</th>}
                          <th className={`${ETH} text-right`}>Total</th>
                          <th className={ETH}><span className="sr-only">Actions</span></th>
                        </tr>
                      </thead>
                      <tbody>
                        {sales.map((sale) => {
                          const view = describeSale(sale);
                          const payment = getPaymentNote(sale, view);
                          const vehicleTag = view.transportMode === 'hired' ? 'Hired' : view.transportMode !== 'party' ? 'Own' : '';
                          return (
                            <tr key={sale._id} className="tbl-row group cursor-pointer" onClick={() => setDetailSale(sale)} title="Click to see full details">
                              <td className={`${ETD} whitespace-nowrap`}>
                                <span className="text-slate-800">{formatShortDate(sale.saleDate)}</span>
                                <button
                                  type="button"
                                  onClick={(event) => { event.stopPropagation(); handleOpenInvoicePdf(sale._id); }}
                                  title="Open invoice PDF"
                                  className="block text-[11px] leading-tight text-slate-400 hover:text-primary-600 hover:underline"
                                >
                                  {sale.invoiceNumber}
                                </button>
                              </td>
                              <td className={ETD}>
                                <p className="max-w-[13rem] truncate font-medium text-slate-800" title={view.party}>{view.party}</p>
                                {sale.dispatchLocation && (
                                  <span className="block max-w-[13rem] truncate text-[11px] leading-tight text-slate-400" title={`Dispatched to ${sale.dispatchLocation}`}>to {sale.dispatchLocation}</span>
                                )}
                              </td>
                              <td className={`${ETD} whitespace-nowrap`}>
                                <span className="font-mono text-xs font-medium text-slate-700">{sale.vehicleNo || '-'}</span>
                                {vehicleTag && (
                                  <span className="block text-[11px] leading-tight text-slate-400" title={view.transportNote}>{vehicleTag}</span>
                                )}
                              </td>
                              <td className={`${ETD} whitespace-nowrap`}>{renderMaterial(view.material)}</td>
                              <td className={`${ETD} whitespace-nowrap text-right text-slate-800`}>
                                {formatSaleQty(sale, view)}
                                {view.isCubic && view.netWeight > 0 && (
                                  <span className="block text-[11px] leading-tight text-slate-400">{formatQty(sale.cubicMeterQty)} cft billed</span>
                                )}
                                {view.extraCubic > 0 && (
                                  <span className="block text-[11px] leading-tight text-slate-400">{formatQty(view.extraCubic)} cft</span>
                                )}
                              </td>
                              <td className={`${ETD} whitespace-nowrap text-right`}>
                                {Number(sale.rate || 0) > 0
                                  ? <>₹{formatAmount(sale.rate)}<span className="text-slate-400">/{view.isCubic ? 'cft' : 't'}</span></>
                                  : <span className="text-slate-300">—</span>}
                              </td>
                              <td className={`${ETD} whitespace-nowrap text-right`}>{formatAmount(view.materialAmount)}</td>
                              {showRoyaltyColumn && <td className={`${ETD} whitespace-nowrap text-right`}>{renderCharge(view.royaltyAmount, 'font-medium text-orange-600')}</td>}
                              {showGstColumn && <td className={`${ETD} whitespace-nowrap text-right`}>{renderCharge(view.gstAmount, 'font-medium text-sky-600')}</td>}
                              {showTransportColumn && <td className={`${ETD} whitespace-nowrap text-right`}>{renderCharge(view.transportCharge)}</td>}
                              <td className={`${ETD} whitespace-nowrap text-right`}>
                                <span className="font-semibold text-slate-900">{formatAmount(sale.totalAmount)}</span>
                                <span className={`block text-[11px] font-medium leading-tight ${payment.tone}`} title={view.paid > 0 ? `Paid ${formatRupees(view.paid)}` : undefined}>
                                  {payment.label}
                                </span>
                              </td>
                              <td className={`${ETD} py-1! text-slate-300`}>{renderActions(sale)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-slate-100 px-4 py-2 text-xs text-slate-500 md:px-5">
                    <span>
                      Showing {(page - 1) * SALES_PAGE_SIZE + 1}–{(page - 1) * SALES_PAGE_SIZE + sales.length} of {entryCount(pagination.total)}
                    </span>
                    {/* Phones also get the period's totals here; the cards above the list show them too */}
                    <span className="font-semibold text-slate-700 md:hidden">
                      {formatQty(summary.totalWeight / 1000)} T · {formatRupees(summary.totalAmount)}
                    </span>
                    {pagination.totalPages > 1 && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="btn-secondary btn-sm"
                          onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                          disabled={page <= 1 || loading}
                        >
                          Previous
                        </button>
                        <span className="font-semibold text-slate-700">Page {page} of {pagination.totalPages}</span>
                        <button
                          type="button"
                          className="btn-secondary btn-sm"
                          onClick={() => setPage((prev) => Math.min(prev + 1, pagination.totalPages))}
                          disabled={page >= pagination.totalPages || loading}
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ))}

            {tab === 'materials' && (materialStats.length === 0
              ? renderEmpty('No materials', 'Nothing was sold during this period.')
              : (
                <>
                  <ul className="divide-y divide-slate-100 md:hidden">
                    {materialStats.map((row) => (
                      <li key={row.materialType}>
                        <button type="button" onClick={() => openMaterial(row.materialType)} className="w-full px-4 py-2.5 text-left active:bg-slate-50">
                          <div className="flex items-center justify-between gap-3">
                            {renderMaterial(row.materialType)}
                            <span className="shrink-0 text-sm font-bold text-slate-900">{formatRupees(row.totalAmount)}</span>
                          </div>
                          <p className="mt-1 text-xs text-slate-500">{entryCount(row.count)} · {getMaterialQtyLabel(row)}</p>
                          <div className="mt-1.5 flex">{materialBar(row)}</div>
                        </button>
                      </li>
                    ))}
                  </ul>

                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[680px] text-left">
                      <thead>
                        <tr>
                          <th className={`${TH} w-10`}>#</th>
                          <th className={TH}>Material</th>
                          <th className={`${TH} text-right`}>Entries</th>
                          <th className={`${TH} text-right`}>Quantity</th>
                          <th className={TH}>Sales</th>
                        </tr>
                      </thead>
                      <tbody>
                        {materialStats.map((row, index) => {
                          const share = materialTotals.totalAmount > 0 ? (row.totalAmount / materialTotals.totalAmount) * 100 : 0;
                          return (
                            <tr
                              key={row.materialType}
                              onClick={() => openMaterial(row.materialType)}
                              className={`tbl-row cursor-pointer ${materialFilter.toLowerCase() === row.materialType ? 'bg-primary-50' : ''}`}
                            >
                              <td className={`${TD} text-slate-400`}>{index + 1}</td>
                              <td className={TD}>{renderMaterial(row.materialType)}</td>
                              <td className={`${TD} text-right`}>{formatQty(row.count)}</td>
                              <td className={`${TD} whitespace-nowrap text-right`}>{getMaterialQtyLabel(row)}</td>
                              <td className={TD}>
                                <div className="flex items-center gap-3">
                                  <span className="w-28 shrink-0 whitespace-nowrap font-bold text-slate-900">{formatRupees(row.totalAmount)}</span>
                                  <div className="flex max-w-[200px] flex-1">{materialBar(row)}</div>
                                  <span className="w-9 shrink-0 text-right text-xs text-slate-400">{share.toFixed(0)}%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-slate-200 bg-slate-50">
                          <td className={`${TD} font-bold text-slate-900`} colSpan={2}>Total</td>
                          <td className={`${TD} text-right font-semibold text-slate-800`}>{formatQty(materialTotals.count)}</td>
                          <td className={`${TD} whitespace-nowrap text-right font-semibold text-slate-800`}>{getMaterialQtyLabel(materialTotals)}</td>
                          <td className={`${TD} whitespace-nowrap font-bold text-slate-900`}>{formatRupees(materialTotals.totalAmount)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500 md:px-5">
                    {materialStats.length} material{materialStats.length === 1 ? '' : 's'}, highest sales first · tap one to see its entries
                  </p>
                </>
              ))}
          </div>
        )}
      </section>
    </div>
  );
}
