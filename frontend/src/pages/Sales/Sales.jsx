import { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Banknote, ClipboardList, CreditCard, Eye, Inbox, IndianRupee, Layers, Pencil, Plus, RefreshCw, Scale, Search, Trash2, X } from 'lucide-react';
import { toast } from 'react-toastify';
import apiClient from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { getSmartVehicleMatch, normalizeVehicleValue } from '../../utils/vehicleMatching';
import useAccounts from '../../utils/useAccounts';
import { PERIOD_BASES, getBasisUnit, getOwnershipLabel, getSaleTransport, getSaleTransportCharge, getTripRate, getSupplierRatesPayload, getVehicleHireRates, getVehicleOwnerIds } from '../../utils/transport';
import AddPartyPopup from '../Party/component/AddPartyPopup';
import AddProductPopup from '../Products/component/AddProductPopup';
import AddVehiclePopup from '../Vehicle/component/AddVehiclePopup';
import AddSalePopup from './component/AddSalePopup';
import StatCard from '../../components/StatCard';
import Segmented from '../../components/Segmented';
import CustomRangePopup, { formatRangeLabel } from '../../components/CustomRangePopup';
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
  { value: 'per_cubic_meter', label: 'Per Cubic Meter' }
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

const getInitialFormData = () => ({
  saleDate: formatDateForInput(),
  invoiceNumber: '',
  entryTime: '',
  exitTime: '',
  party: '',
  vehicleId: '',
  customerName: '',
  customerPhone: '',
  customerAddress: '',
  vehicleNo: '',
  materialType: '',
  tareWeight: '',
  grossWeight: '',
  netWeight: '',
  pricingMode: 'per_ton',
  cubicMeterQty: '',
  rate: '',
  dispatchLocation: '',
  ...NO_SALE_TRANSPORT,
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

const getPartyMaterialRate = (party, materialType, pricingMode = 'per_ton') => {
  if (!party || !materialType) return 0;
  if (pricingMode === 'per_cubic_meter') return 0;

  if (materialType === '10mm') return Number(party.tenMmRate || 0);
  if (materialType === '20mm') return Number(party.twentyMmRate || 0);
  if (materialType === '40mm') return Number(party.fortyMmRate || 0);
  if (materialType === 'wmm') return Number(party.wmmRate || 0);
  if (materialType === 'gsb') return Number(party.gsbRate || 0);
  if (materialType === 'dust') return Number(party.dustRate || 0);
  return 0;
};

const getSaleRateForParty = (user, party, materialType, pricingMode = 'per_ton') => {
  const partyRate = getPartyMaterialRate(party, materialType, pricingMode);
  if (partyRate > 0) return partyRate;
  return getCrusherMaterialRate(user, materialType, pricingMode);
};

// Material amount plus the transport charged to the party
const recalculateSaleAmount = (payload = {}) => calculateSaleTotalAmount({
  pricingMode: payload.pricingMode,
  netWeight: payload.netWeight,
  cubicMeterQty: payload.cubicMeterQty,
  rate: payload.rate,
}) + getSaleTransportCharge(payload);

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

const entryCount = (count) => `${formatQty(count)} entr${count === 1 ? 'y' : 'ies'}`;

const getSaleRateLabel = (sale) => (
  `₹${formatQty(sale?.rate)}/${sale?.pricingMode === 'per_cubic_meter' ? 'm³' : 'T'}`
);

// Tons sold of a material, plus the cubic meters of its sales made by volume
const getMaterialQtyLabel = (row) => {
  const tons = `${formatQty(row.totalWeight / 1000)} T`;
  return row.totalCubicMeter > 0 ? `${tons} + ${formatQty(row.totalCubicMeter)} m³` : tons;
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

// Table cells a little tighter than the app default, so every column fits without scrolling
const TH = 'tbl-head px-3 py-2 first:pl-5 last:pr-5';
const TD = 'tbl-cell px-3 py-2 first:pl-5 last:pr-5';

const SALES_PAGE_SIZE = 50;

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

/** Vehicle number as a small monospace chip. */
function Plate({ children }) {
  return (
    <span className="inline-block max-w-full truncate rounded-md bg-slate-100 px-2 py-0.5 align-middle font-mono text-xs font-semibold tracking-wide text-slate-800 ring-1 ring-inset ring-slate-200">
      {children}
    </span>
  );
}

export default function Sales({ modalOnly = false, onModalFinish = null }) {
  const toastOptions = { autoClose: 1200 };
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { accounts, defaultAccountId } = useAccounts();
  const canManageSales = user?.role !== 'employee' && (user?.role === 'owner' || user?.permissions?.edit);
  const canCreateSales = user?.role === 'owner' || user?.permissions?.add;
  const initialFormData = getInitialFormData();
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
  const [materialStats, setMaterialStats] = useState([]);
  const [materialFilter, setMaterialFilter] = useState('');
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
  }, [debouncedSearch, tableRange, customFrom, customTo, selectedMonth, selectedYear, materialFilter]);

  useEffect(() => {
    fetchSales();
  }, [page, debouncedSearch, tableRange, customFrom, customTo, selectedMonth, selectedYear, materialFilter]);

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

  const getSaleInvoicePdfUrl = (saleId) => {
    const baseUrl = String(apiClient.defaults.baseURL || '/api').replace(/\/+$/, '');
    return `${baseUrl}/sales/${saleId}/invoice-pdf`;
  };

  const handleOpenInvoicePdf = (saleId) => {
    if (!saleId) return;
    window.open(getSaleInvoicePdfUrl(saleId), '_blank', 'noopener,noreferrer');
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
  const filteredVehicles = useMemo(() => {
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
  }, [vehicles, vehicleQuery, isVehicleSectionActive, formData.vehicleNo]);
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
    return vehicles.find((vehicle) => normalizeText(getVehicleDisplayName(vehicle)) === normalized) || null;
  };

  const findBestVehicleMatch = (value) => {
    const normalized = normalizeText(value);
    if (!normalized) return null;
    if (isCompleteVehicleNumber(value)) return null;
    return vehicles.find((vehicle) => normalizeText(getVehicleDisplayName(vehicle)).startsWith(normalized))
      || vehicles.find((vehicle) => normalizeText(getVehicleDisplayName(vehicle)).includes(normalized))
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
        netWeight: prev.pricingMode === 'per_ton'
          ? getSafeNetWeight(prev.grossWeight, 0)
          : '',
        cubicMeterQty: prev.pricingMode === 'per_cubic_meter' ? '' : prev.cubicMeterQty,
        totalAmount: recalculateSaleAmount({
          ...prev,
          netWeight: prev.pricingMode === 'per_ton'
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
        cubicMeterQty: prev.pricingMode === 'per_cubic_meter'
          ? (vehicle?.capacityCubicMeter ?? prev.cubicMeterQty ?? '')
          : prev.cubicMeterQty
      };

      const numericTareWeight = Number(unladenWeight || 0);
      const numericGrossWeight = Number(prev.grossWeight || 0);
      nextState.netWeight = nextState.pricingMode === 'per_ton'
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
    const cubicMeterQty = value === 'per_cubic_meter'
      ? (formData.cubicMeterQty || selectedVehicle?.capacityCubicMeter || '')
      : formData.cubicMeterQty;
    const resolvedRate = formData.materialType
      ? getSaleRateForParty(user, selectedLeadger, formData.materialType, value)
      : Number(formData.rate || 0);
    const nextState = {
      ...formData,
      pricingMode: value,
      cubicMeterQty,
      grossWeight: value === 'per_cubic_meter' ? '' : formData.grossWeight,
      tareWeight: value === 'per_cubic_meter' ? '' : formData.tareWeight,
      netWeight: value === 'per_cubic_meter'
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
          tenMmRate: Number(partyFormData.tenMmRate || 0),
          twentyMmRate: Number(partyFormData.twentyMmRate || 0),
          fortyMmRate: Number(partyFormData.fortyMmRate || 0),
          wmmRate: Number(partyFormData.wmmRate || 0),
          gsbRate: Number(partyFormData.gsbRate || 0),
          dustRate: Number(partyFormData.dustRate || 0),
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
      setError('Please enter cubic meter quantity for per m³ sale');
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
        invoiceNumber: String(formData.invoiceNumber || '').trim().toUpperCase(),
        stoneSize: formData.materialType,
        entryTime: String(formData.entryTime || '').trim(),
        exitTime: String(formData.exitTime || '').trim(),
        tareWeight: formData.pricingMode === 'per_ton' ? Number(formData.tareWeight || 0) : 0,
        grossWeight: formData.pricingMode === 'per_ton' ? Number(formData.grossWeight || 0) : 0,
        netWeight: formData.pricingMode === 'per_ton' ? Number(formData.netWeight || 0) : 0,
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
        totalAmount: Number(formData.totalAmount || 0),
        paidAmount: Number(formData.paidAmount || 0),
        account: formData.account || defaultAccountId || undefined,
        slipImg: String(formData.slipImg || '').trim(),
        saleDate: saleDateTime.toISOString(),
        saleTime: formData.saleTime || ''
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
      setFormData(getInitialFormData());
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
        slipImg: sale.slipImg || ''
      });
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

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this sale?')) {
      try {
        await apiClient.delete(`/sales/${id}`);
        toast.success('Sale deleted successfully', toastOptions);
        fetchSales();
      } catch (err) {
        setError(err.message || 'Error deleting sale');
      }
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
      setFormData(getInitialFormData());
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
      setFormData(getInitialFormData());
      setCurrentItem(initialCurrentItem);
      setLeadgerQuery('');
      setLeadgerListIndex(0);
      setIsLeadgerSectionActive(false);
      setVehicleQuery('');
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
  const hasFilters = Boolean(debouncedSearch || materialFilter || tableRange !== 'lifetime');

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

  const shareOfSales = (amount) => (
    summary.totalAmount > 0 ? `${((amount / summary.totalAmount) * 100).toFixed(0)}% of sales` : 'No sales'
  );

  const stats = [
    { icon: IndianRupee, label: 'Total Sales', tone: 'emerald', value: formatRupees(summary.totalAmount), hint: entryCount(summary.count) },
    { icon: Banknote, label: 'Cash Sale', tone: 'blue', value: formatRupees(summary.cashAmount), hint: shareOfSales(summary.cashAmount) },
    { icon: CreditCard, label: 'Credit Sale', tone: 'rose', value: formatRupees(summary.creditAmount), hint: shareOfSales(summary.creditAmount) },
    {
      icon: Scale, label: 'Material Sold', tone: 'indigo',
      value: `${formatQty(summary.totalWeight / 1000)} tons`,
      hint: summaryCubicMeter > 0 ? `+ ${formatQty(summaryCubicMeter)} m³ by volume` : `${formatQty(summary.totalWeight)} kg`
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
      transportNote: transporter ? `${ownVehicle} · ${transporter}` : ownVehicle,
      transportMode: sale.transportMode || 'party',
      transporter,
      transportRate,
      transportCost: sale.transportMode === 'hired' ? getSaleTransport(sale).cost : 0,
      transportCharge,
      materialAmount: Math.max(0, Number(sale.totalAmount || 0) - transportCharge),
      paid,
      // Only a part-paid sale needs its balance spelled out; the Cash / Credit badge says the rest
      balance: paid > 0 && total > paid ? total - paid : 0
    };
  };

  const renderMaterial = (material) => (material
    ? <span className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase ${getMaterialBadgeClass(material)}`}>{material}</span>
    : <span className="text-slate-400">—</span>);

  const renderActions = (sale) => (
    <div className="flex items-center justify-end">
      {sale.slipImg && (
        <a href={sale.slipImg} target="_blank" rel="noreferrer" title="View slip" aria-label="View slip" className="icon-btn inline-flex p-1.5 hover:bg-blue-50 hover:text-blue-600">
          <Eye size={16} />
        </a>
      )}
      {canManageSales && (
        <>
          <button type="button" title="Edit" aria-label="Edit" className="icon-btn p-1.5 hover:bg-blue-50 hover:text-blue-600" onClick={() => handleEdit(sale)}>
            <Pencil size={16} />
          </button>
          <button type="button" title="Delete" aria-label="Delete" className="icon-btn p-1.5 hover:bg-rose-50 hover:text-rose-600" onClick={() => handleDelete(sale._id)}>
            <Trash2 size={16} />
          </button>
        </>
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
      {showCustomPicker && (
        <CustomRangePopup from={customFrom} to={customTo} onApply={applyCustomPicker} onClose={closeCustomPicker} />
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
          <Segmented options={TABS} value={tab} onChange={setTab} />
          <div className="flex min-w-0 flex-1 basis-56 items-center justify-end gap-2">
            {tab === 'entries' && materialFilter && (
              <button
                type="button"
                onClick={() => setMaterialFilter('')}
                title="Show all materials"
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary-600 px-2.5 py-1 text-xs font-semibold uppercase text-white transition hover:bg-primary-700"
              >
                {materialFilter}
                <X size={14} />
              </button>
            )}
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
                  {/* Phone: three short lines per sale */}
                  <ul className="divide-y divide-slate-100 md:hidden">
                    {sales.map((sale) => {
                      const view = describeSale(sale);
                      return (
                        <li key={sale._id} className="px-4 py-2.5">
                          <div className="flex items-baseline justify-between gap-3">
                            <p className="min-w-0 truncate text-sm font-semibold text-slate-800">
                              {view.party}
                              {sale.dispatchLocation && <span className="font-normal text-slate-500"> · to {sale.dispatchLocation}</span>}
                            </p>
                            <p className="shrink-0 text-sm font-bold text-slate-900">{formatRupees(sale.totalAmount)}</p>
                          </div>
                          <div className="mt-1 flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-2">
                              <Plate>{sale.vehicleNo || '-'}</Plate>
                              {renderMaterial(view.material)}
                              <span className="shrink-0 text-xs text-slate-500">{formatDate(sale.saleDate)}</span>
                            </div>
                            <p className="shrink-0 text-sm font-bold text-emerald-700">
                              {view.isCubic ? `${formatQty(sale.cubicMeterQty)} m³` : `${formatQty(view.netWeight / 1000)} T`}
                            </p>
                          </div>
                          {view.transportMode !== 'party' && (
                            <p className="truncate text-[11px] font-medium text-amber-700">
                              {[view.transportNote, view.transportRate, view.transportCharge > 0 ? `Transport ${formatRupees(view.transportCharge)}` : ''].filter(Boolean).join(' · ')}
                            </p>
                          )}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-1.5 text-[11px] text-slate-400">
                              <span className={`${SALE_TYPE_BADGE[sale.type] || 'badge-red'} shrink-0`}>{formatSaleTypeLabel(sale.type)}</span>
                              <button type="button" onClick={() => handleOpenInvoicePdf(sale._id)} className="shrink-0 font-semibold text-primary-600">
                                {sale.invoiceNumber}
                              </button>
                              <span className="truncate">
                                {getSaleRateLabel(sale)}
                                {view.balance > 0 && ` · Bal ${formatRupees(view.balance)}`}
                              </span>
                            </div>
                            {renderActions(sale)}
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[1040px] text-left">
                      <thead>
                        <tr>
                          <th className={TH}>Date</th>
                          <th className={TH}>Party</th>
                          <th className={TH}>Vehicle / Transport</th>
                          <th className={TH}>Material</th>
                          <th className={`${TH} text-right`}>Gross (kg)</th>
                          <th className={`${TH} text-right`}>Tare (kg)</th>
                          <th className={`${TH} text-right`}>Net (kg)</th>
                          <th className={`${TH} text-right`}>Amount</th>
                          <th className={TH}>Payment</th>
                          <th className={TH} />
                        </tr>
                      </thead>
                      <tbody>
                        {sales.map((sale) => {
                          const view = describeSale(sale);
                          return (
                            <tr key={sale._id} className="tbl-row">
                              <td className={`${TD} whitespace-nowrap`}>
                                {formatDate(sale.saleDate)}
                                <button
                                  type="button"
                                  onClick={() => handleOpenInvoicePdf(sale._id)}
                                  title="Open invoice PDF"
                                  className="block text-[11px] font-semibold leading-tight text-primary-600 hover:underline"
                                >
                                  {sale.invoiceNumber}
                                </button>
                                {(sale.entryTime || sale.exitTime) && (
                                  <span className="block text-[11px] leading-tight text-slate-400">{sale.entryTime || '--'} → {sale.exitTime || '--'}</span>
                                )}
                              </td>
                              <td className={TD}>
                                <p className="max-w-[14rem] truncate font-semibold text-slate-800" title={view.party}>{view.party}</p>
                                {sale.dispatchLocation && (
                                  <span className="block max-w-[14rem] truncate text-[11px] text-slate-500" title={`Dispatched to ${sale.dispatchLocation}`}>To {sale.dispatchLocation}</span>
                                )}
                              </td>
                              <td className={TD}>
                                <Plate>{sale.vehicleNo || '-'}</Plate>
                                <span className="block max-w-[14rem] truncate text-[11px] font-medium text-amber-700" title={view.transportNote || 'Party vehicle'}>
                                  {view.transportMode === 'party' ? 'Party vehicle' : view.transportNote}
                                </span>
                                {view.transportRate && (
                                  <span className="block text-[11px] leading-tight text-slate-500">
                                    Pay {view.transportRate}{view.transportCost > 0 ? ` = ${formatRupees(view.transportCost)}` : ''}
                                  </span>
                                )}
                              </td>
                              <td className={`${TD} whitespace-nowrap`}>
                                {renderMaterial(view.material)}
                                <span className="mt-0.5 block text-[11px] leading-tight text-slate-500">{getSaleRateLabel(sale)}</span>
                              </td>
                              {view.isCubic ? (
                                // A sale by volume has no weighbridge weights: its quantity goes in the net column
                                <>
                                  <td className={`${TD} text-right text-xs text-slate-400`} colSpan={2}>Sold by volume</td>
                                  <td className={`${TD} whitespace-nowrap text-right font-bold text-emerald-700`}>{formatQty(sale.cubicMeterQty)} m³</td>
                                </>
                              ) : (
                                <>
                                  <td className={`${TD} text-right`}>{sale.grossWeight ? formatQty(sale.grossWeight) : '—'}</td>
                                  <td className={`${TD} text-right`}>{sale.tareWeight ? formatQty(sale.tareWeight) : '—'}</td>
                                  <td className={`${TD} text-right font-bold text-emerald-700`}>{view.netWeight ? formatQty(view.netWeight) : '—'}</td>
                                </>
                              )}
                              <td className={`${TD} whitespace-nowrap text-right`}>
                                <span className="font-bold text-slate-900">{formatRupees(sale.totalAmount)}</span>
                                {view.transportCharge > 0 && (
                                  <span className="block text-[11px] leading-tight text-slate-400">
                                    {formatRupees(view.materialAmount)} + {formatRupees(view.transportCharge)} transport
                                  </span>
                                )}
                              </td>
                              <td className={`${TD} whitespace-nowrap`}>
                                <span className={SALE_TYPE_BADGE[sale.type] || 'badge-red'}>{formatSaleTypeLabel(sale.type)}</span>
                                {view.balance > 0 && (
                                  <span className="mt-0.5 block text-[11px] leading-tight text-rose-600" title={`Paid ${formatRupees(view.paid)}`}>
                                    Bal {formatRupees(view.balance)}
                                  </span>
                                )}
                              </td>
                              <td className={`${TD} py-1!`}>{renderActions(sale)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-slate-200 bg-slate-50">
                          <td className={`${TD} font-bold text-slate-900`} colSpan={6}>
                            Total
                            <span className="ml-2 text-xs font-medium text-slate-500">
                              {entryCount(summary.count)} · {formatQty(summary.totalWeight / 1000)} T
                            </span>
                          </td>
                          <td className={`${TD} text-right font-bold text-emerald-700`}>{formatQty(summary.totalWeight)}</td>
                          <td className={`${TD} whitespace-nowrap text-right font-bold text-slate-900`}>{formatRupees(summary.totalAmount)}</td>
                          <td className={TD} colSpan={2} />
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-slate-100 px-4 py-2 text-xs text-slate-500 md:px-5">
                    <span>
                      Showing {(page - 1) * SALES_PAGE_SIZE + 1}–{(page - 1) * SALES_PAGE_SIZE + sales.length} of {entryCount(pagination.total)}
                    </span>
                    {/* The table has its own total row; phones get the totals here */}
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
