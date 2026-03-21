import { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, IndianRupee, Search } from 'lucide-react';
import { toast } from 'react-toastify';
import apiClient from '../../utils/api';
import AddPartyPopup from '../Party/component/AddPartyPopup';
import AddProductPopup from '../Products/component/AddProductPopup';
import AddSalePopup from './component/AddSalePopup';

const formatDateForInput = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return date.toISOString().split('T')[0];
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

const getInitialFormData = () => ({
  party: '',
  customerName: '',
  customerPhone: '',
  customerAddress: '',
  vehicleNo: '',
  materialType: '',
  vehicleWeight: '',
  netWeight: '',
  materialWeight: '',
  rate: '',
  totalAmount: 0,
  paidAmount: 0,
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
  dustRate: ''
});

const toTitleCase = (value) => String(value || '')
  .toLowerCase()
  .replace(/\b[a-z]/g, (char) => char.toUpperCase());

const getSalePriceInputValue = (product) => String(Number(product?.salePrice || 0));

export default function Sales({ modalOnly = false, onModalFinish = null }) {
  const toastOptions = { autoClose: 1200 };
  const location = useLocation();
  const navigate = useNavigate();
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
    { _id: '1', name: '10mm', unit: 'ton', salePrice: 0 },
    { _id: '2', name: '20mm', unit: 'ton', salePrice: 0 },
    { _id: '3', name: '40mm', unit: 'ton', salePrice: 0 },
    { _id: '4', name: 'dust', unit: 'ton', salePrice: 0 },
    { _id: '5', name: 'gsb', unit: 'ton', salePrice: 0 }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedMonthKey, setSelectedMonthKey] = useState('');
  const [formData, setFormData] = useState(initialFormData);
  const [currentItem, setCurrentItem] = useState(initialCurrentItem);
  const [showPartyForm, setShowPartyForm] = useState(false);
  const [partyFormData, setPartyFormData] = useState(getInitialPartyFormData());
  const [partyPopupLoading, setPartyPopupLoading] = useState(false);
  const [partyPopupError, setPartyPopupError] = useState('');
  const [showProductForm, setShowProductForm] = useState(false);
  const [leadgerQuery, setLeadgerQuery] = useState('');
  const [leadgerListIndex, setLeadgerListIndex] = useState(-1);
  const [isLeadgerSectionActive, setIsLeadgerSectionActive] = useState(false);
  const [vehicleQuery, setVehicleQuery] = useState('');
  const [vehicleListIndex, setVehicleListIndex] = useState(-1);
  const [isVehicleSectionActive, setIsVehicleSectionActive] = useState(false);
  const [productQuery, setProductQuery] = useState('');
  const [productListIndex, setProductListIndex] = useState(-1);
  const [isProductSectionActive, setIsProductSectionActive] = useState(false);
  const leadgerSectionRef = useRef(null);
  const leadgerInputRef = useRef(null);
  const vehicleSectionRef = useRef(null);
  const vehicleInputRef = useRef(null);
  const productSectionRef = useRef(null);
  const productInputRef = useRef(null);

  useEffect(() => {
    fetchSales();
    fetchLeadgers();
    fetchVehicles();
  }, [search, dateFilter]);

  useEffect(() => {
    if (dateFilter !== 'monthwise') {
      setSelectedMonthKey('');
    }
  }, [dateFilter]);

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

  const getFromDateByFilter = () => {
    const now = new Date();
    if (dateFilter === '7d') {
      now.setDate(now.getDate() - 7);
      return now.toISOString().split('T')[0];
    }
    if (dateFilter === '30d') {
      now.setDate(now.getDate() - 30);
      return now.toISOString().split('T')[0];
    }
    if (dateFilter === '3m') {
      now.setMonth(now.getMonth() - 3);
      return now.toISOString().split('T')[0];
    }
    if (dateFilter === '6m') {
      now.setMonth(now.getMonth() - 6);
      return now.toISOString().split('T')[0];
    }
    if (dateFilter === '1y') {
      now.setFullYear(now.getFullYear() - 1);
      return now.toISOString().split('T')[0];
    }
    return '';
  };

  const getMonthKey = (dateValue) => {
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return '';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
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
    try {
      setLoading(true);
      const fromDate = getFromDateByFilter();
      const response = await apiClient.get('/sales', {
        params: {
          search,
          fromDate: fromDate || undefined
        }
      });
      setSales(response.data || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Error fetching sales');
    } finally {
      setLoading(false);
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
      setVehicles(Array.isArray(response) ? response : []);
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

    if (
      isVehicleSectionActive
      && normalizedQuery
      && normalizedQuery === normalizedSelectedVehicle
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
  const isCashParty = String(selectedLeadger?.type || '').trim().toLowerCase() === 'cash-in-hand';

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

  const handleLeadgerFocus = () => {
    setIsLeadgerSectionActive(true);
  };

  const handleVehicleFocus = () => {
    setIsVehicleSectionActive(true);
  };

  useEffect(() => {
    if (!showForm || editingId || !isCashParty) return;

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
    return vehicles.find((vehicle) => normalizeText(getVehicleDisplayName(vehicle)).startsWith(normalized))
      || vehicles.find((vehicle) => normalizeText(getVehicleDisplayName(vehicle)).includes(normalized))
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
        customerAddress: ''
      }));
      setLeadgerListIndex(-1);
      return;
    }

    const leadgerName = getLeadgerDisplayName(leadger);
    setLeadgerQuery(leadgerName);
    setFormData((prev) => ({
      ...prev,
      party: leadger._id,
      customerName: leadgerName,
      customerPhone: '',
      customerAddress: ''
    }));

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
      setFormData((prev) => ({
        ...prev,
        party: exactLeadger._id,
        customerName: getLeadgerDisplayName(exactLeadger),
        customerPhone: '',
        customerAddress: ''
      }));
      const exactIndex = getMatchingLeadgers(value).findIndex((item) => String(item._id) === String(exactLeadger._id));
      setLeadgerListIndex(exactIndex >= 0 ? exactIndex : 0);
      return;
    }

    const matches = getMatchingLeadgers(value);
    const firstMatch = matches[0] || null;
    setFormData((prev) => ({
      ...prev,
      party: firstMatch?._id || '',
      customerName: firstMatch ? getLeadgerDisplayName(firstMatch) : '',
      customerPhone: '',
      customerAddress: ''
    }));
    setLeadgerListIndex(firstMatch ? 0 : -1);
  };

  const selectVehicle = (vehicle) => {
    if (!vehicle) {
      setVehicleQuery('');
      setFormData((prev) => ({
        ...prev,
        vehicleNo: ''
      }));
      setVehicleListIndex(-1);
      return;
    }

    const vehicleNumber = getVehicleDisplayName(vehicle);
    setVehicleQuery(vehicleNumber);
    setFormData((prev) => ({
      ...prev,
      vehicleNo: vehicleNumber
    }));

    const selectedIndex = filteredVehicles.findIndex((item) => String(item._id) === String(vehicle._id));
    setVehicleListIndex(selectedIndex >= 0 ? selectedIndex : 0);
  };

  const handleVehicleInputChange = (e) => {
    const value = String(e.target.value || '').toUpperCase();
    setVehicleQuery(value);

    if (!normalizeText(value)) {
      selectVehicle(null);
      return;
    }

    const exactVehicle = findExactVehicle(value);
    if (exactVehicle) {
      const vehicleNumber = getVehicleDisplayName(exactVehicle);
      setFormData((prev) => ({
        ...prev,
        vehicleNo: vehicleNumber
      }));
      const exactIndex = filteredVehicles.findIndex((item) => String(item._id) === String(exactVehicle._id));
      setVehicleListIndex(exactIndex >= 0 ? exactIndex : 0);
      return;
    }

    const firstMatch = findBestVehicleMatch(value);
    setFormData((prev) => ({
      ...prev,
      vehicleNo: firstMatch ? getVehicleDisplayName(firstMatch) : value
    }));
    setVehicleListIndex(firstMatch ? 0 : -1);
  };

  const focusNextPopupField = (element) => {
    if (!(element instanceof HTMLElement)) return;
    const form = element.closest('form');
    if (!form) return;

    const fields = Array.from(form.querySelectorAll(
      'input:not([type="hidden"]):not([disabled]):not([readonly]), select:not([disabled]):not([readonly]), textarea:not([disabled]):not([readonly])'
    )).filter((field) => {
      if (!(field instanceof HTMLElement)) return false;
      if (field.tabIndex === -1) return false;
      const style = window.getComputedStyle(field);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });

    const currentIndex = fields.indexOf(element);
    if (currentIndex === -1) return;

    const nextField = fields[currentIndex + 1];
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
    if (['tenMmRate', 'twentyMmRate', 'fortyMmRate', 'wmmRate', 'gsbRate', 'dustRate'].includes(name)) {
      setPartyFormData((prev) => ({ ...prev, [name]: value }));
      return;
    }
    if (name === 'type') {
      setPartyFormData((prev) => ({
        ...prev,
        [name]: value,
        openingBalanceType: prev.openingBalance ? prev.openingBalanceType : (value === 'supplier' ? 'payable' : 'receivable')
      }));
      return;
    }

    setPartyFormData((prev) => ({ ...prev, [name]: value }));
  };

  const openInlineProductForm = () => {
    setIsProductSectionActive(false);
    setShowProductForm(true);
  };

  const closeInlineProductForm = (shouldRefocusProduct = true) => {
    setShowProductForm(false);

    if (!shouldRefocusProduct) return;

    requestAnimationFrame(() => {
      productInputRef.current?.focus();
      productInputRef.current?.select?.();
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
        setFormData({ ...formData, vehicleNo: String(value || '').toUpperCase() });
        return;
      }
    if (name === 'saleDate') {
      setFormData({ ...formData, saleDate: value });
      return;
    }
    if (name === 'vehicleWeight' || name === 'netWeight') {
      const vehicleWeight = name === 'vehicleWeight' ? Number(value || 0) : Number(formData.vehicleWeight || 0);
      const netWeight = name === 'netWeight' ? Number(value || 0) : Number(formData.netWeight || 0);
      const materialWeight = vehicleWeight - netWeight;
      setFormData({ ...formData, [name]: value, materialWeight });
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

    if (!['supplier', 'customer', 'cash-in-hand'].includes(partyFormData.type)) {
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
          dustRate: Number(partyFormData.dustRate || 0)
        };

      const response = await apiClient.post('/parties', payload);
      const createdParty = response?.data || null;

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
    const parsedSaleDate = parseSaleDate(formData.saleDate);
    if (!parsedSaleDate) {
      setError('Please select a valid sale date');
      return;
    }
    if (formData.items.length === 0) {
      setError('At least one item is required');
      return;
    }

    try {
      setLoading(true);
      const isEditMode = Boolean(editingId);
      const submitData = {
        ...formData,
        stoneSize: formData.materialType,
        paidAmount: !isEditMode && isCashParty ? Number(formData.totalAmount || 0) : formData.paidAmount,
        saleDate: parsedSaleDate
      };

      if (editingId) {
        await apiClient.put(`/sales/${editingId}`, submitData);
      } else {
        await apiClient.post('/sales', submitData);
      }
      toast.success(
        isEditMode ? 'Sale updated successfully' : 'Sale added successfully',
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
      setError(err.message || 'Error saving sale');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (sale) => {
    const normalizedPartyId = typeof sale.party === 'object'
      ? sale.party?._id || ''
      : (sale.party || '');
    const resolvedLeadgerName = resolveLeadgerNameById(normalizedPartyId) || sale.customerName || '';

      setFormData({
        ...getInitialFormData(),
        ...sale,
      party: normalizedPartyId,
      saleDate: formatDateForInput(sale.saleDate),
      customerName: resolvedLeadgerName,
      customerPhone: String(sale.customerPhone || '').replace(/\D/g, '').slice(0, 10),
      customerAddress: sale.customerAddress || '',
      materialType: sale.materialType || sale.stoneSize || '',
      vehicleNo: sale.vehicleNo || '',
      vehicleWeight: sale.vehicleWeight || '',
      netWeight: sale.netWeight || '',
        materialWeight: sale.materialWeight || ''
      });
      setLeadgerQuery(resolvedLeadgerName);
      setLeadgerListIndex(resolvedLeadgerName ? 0 : -1);
      setIsLeadgerSectionActive(false);
      setVehicleQuery(sale.vehicleNo || '');
      setVehicleListIndex(sale.vehicleNo ? 0 : -1);
      setIsVehicleSectionActive(false);
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
      setProductQuery('');
      setProductListIndex(-1);
      setIsProductSectionActive(false);
  };

  const handleOpenForm = () => {
    setEditingId(null);
    setShowPartyForm(false);
    setShowProductForm(false);
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
      setProductQuery('');
      setProductListIndex(0);
      setIsProductSectionActive(false);
    setShowForm(true);
  };

  const monthWiseSummary = useMemo(() => {
    const grouped = new Map();

    sales.forEach((sale) => {
      const monthKey = getMonthKey(sale.saleDate);
      if (!monthKey) return;

      if (!grouped.has(monthKey)) {
        const monthDate = new Date(sale.saleDate);
        grouped.set(monthKey, {
          key: monthKey,
          label: monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          saleCount: 0,
          totalAmount: 0
        });
      }

      const bucket = grouped.get(monthKey);
      const total = Number(sale.totalAmount || 0);

      bucket.saleCount += 1;
      bucket.totalAmount += total;
    });

    return Array.from(grouped.values()).sort((a, b) => b.key.localeCompare(a.key));
  }, [sales]);

  const visibleSales = useMemo(() => {
    if (dateFilter !== 'monthwise' || !selectedMonthKey) return sales;
    return sales.filter((sale) => getMonthKey(sale.saleDate) === selectedMonthKey);
  }, [sales, dateFilter, selectedMonthKey]);

  const totalSales = visibleSales.length;
  const totalAmount = visibleSales.reduce((sum, sale) => sum + Number(sale.totalAmount || 0), 0);
  const popupFieldClass = 'w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-medium text-gray-900 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200';
  const popupLabelClass = 'mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-600';
  const popupSectionClass = 'rounded-xl border-2 border-indigo-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-3 md:p-4';

  if (modalOnly) {
    return (
      <>
        {error && (
          <div className="fixed left-4 right-4 top-4 z-[60] rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 shadow-lg md:left-auto md:right-4 md:w-[26rem]">
            {error}
          </div>
        )}
        <AddSalePopup
          showForm={showForm}
          editingId={editingId}
          loading={loading}
          isCashParty={isCashParty}
          formData={formData}
          currentItem={currentItem}
          products={products}
          popupFieldClass={popupFieldClass}
          popupLabelClass={popupLabelClass}
          leadgerSectionRef={leadgerSectionRef}
          leadgerInputRef={leadgerInputRef}
          vehicleSectionRef={vehicleSectionRef}
          vehicleInputRef={vehicleInputRef}
          productSectionRef={productSectionRef}
          productInputRef={productInputRef}
          leadgerQuery={leadgerQuery}
          vehicleQuery={vehicleQuery}
          productQuery={productQuery}
          leadgerListIndex={leadgerListIndex}
          vehicleListIndex={vehicleListIndex}
          productListIndex={productListIndex}
          filteredLeadgers={filteredLeadgers}
          filteredVehicles={filteredVehicles}
          filteredProducts={filteredProducts}
          isLeadgerSectionActive={isLeadgerSectionActive}
          isVehicleSectionActive={isVehicleSectionActive}
          isProductSectionActive={isProductSectionActive}
          setCurrentItem={setCurrentItem}
          setIsLeadgerSectionActive={setIsLeadgerSectionActive}
          setIsVehicleSectionActive={setIsVehicleSectionActive}
          setIsProductSectionActive={setIsProductSectionActive}
          setLeadgerListIndex={setLeadgerListIndex}
          setVehicleListIndex={setVehicleListIndex}
          setProductListIndex={setProductListIndex}
          getLeadgerDisplayName={getLeadgerDisplayName}
          getVehicleDisplayName={getVehicleDisplayName}
          getProductDisplayName={getProductDisplayName}
          handleCancel={handleCancel}
          handleSubmit={handleSubmit}
          handleInputChange={handleInputChange}
          handleLeadgerFocus={handleLeadgerFocus}
          handleLeadgerInputChange={handleLeadgerInputChange}
          handleLeadgerInputKeyDown={handleLeadgerInputKeyDown}
          handleVehicleFocus={handleVehicleFocus}
          handleVehicleInputChange={handleVehicleInputChange}
          handleVehicleInputKeyDown={handleVehicleInputKeyDown}
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
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      <div className="w-full px-3 pb-8 pt-4 md:px-4 lg:px-6 lg:pt-4">

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      <div className="mb-5 mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-4">
        <div className="group relative overflow-hidden rounded-xl bg-white p-2.5 shadow-sm ring-1 ring-slate-200/50 transition-all hover:shadow-md sm:rounded-2xl sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs font-medium text-slate-500 leading-tight">Total Sales</p>
              <p className="mt-1 sm:mt-2 text-base sm:text-2xl font-bold text-slate-800 leading-tight">{totalSales}</p>
            </div>
            <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-transform group-hover:scale-110">
              <ShoppingCart className="h-6 w-6" />
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-0.5 sm:h-1 bg-gradient-to-r from-blue-500 to-cyan-400 opacity-80"></div>
        </div>
        <div className="group relative overflow-hidden rounded-xl bg-white p-2.5 shadow-sm ring-1 ring-slate-200/50 transition-all hover:shadow-md sm:rounded-2xl sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs font-medium text-slate-500 leading-tight">Total Amount</p>
              <p className="mt-1 sm:mt-2 text-[11px] sm:text-2xl font-bold text-slate-800 leading-tight">
                <span className="text-[10px] sm:text-base text-slate-400 font-medium mr-1">Rs</span>
                {totalAmount.toFixed(2)}
              </p>
            </div>
            <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition-transform group-hover:scale-110">
              <IndianRupee className="h-6 w-6" />
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-0.5 sm:h-1 bg-gradient-to-r from-emerald-500 to-teal-400 opacity-80"></div>
        </div>
      </div>

      <AddSalePopup
        showForm={showForm}
        editingId={editingId}
        loading={loading}
        isCashParty={isCashParty}
        formData={formData}
        currentItem={currentItem}
        products={products}
        popupFieldClass={popupFieldClass}
        popupLabelClass={popupLabelClass}
        popupSectionClass={popupSectionClass}
        leadgerSectionRef={leadgerSectionRef}
        leadgerInputRef={leadgerInputRef}
        vehicleSectionRef={vehicleSectionRef}
        vehicleInputRef={vehicleInputRef}
        productSectionRef={productSectionRef}
        productInputRef={productInputRef}
        leadgerQuery={leadgerQuery}
        vehicleQuery={vehicleQuery}
        productQuery={productQuery}
        leadgerListIndex={leadgerListIndex}
        vehicleListIndex={vehicleListIndex}
        productListIndex={productListIndex}
        filteredLeadgers={filteredLeadgers}
        filteredVehicles={filteredVehicles}
        filteredProducts={filteredProducts}
        isLeadgerSectionActive={isLeadgerSectionActive}
        isVehicleSectionActive={isVehicleSectionActive}
        isProductSectionActive={isProductSectionActive}
        setCurrentItem={setCurrentItem}
        setIsLeadgerSectionActive={setIsLeadgerSectionActive}
        setIsVehicleSectionActive={setIsVehicleSectionActive}
        setIsProductSectionActive={setIsProductSectionActive}
        setLeadgerListIndex={setLeadgerListIndex}
        setVehicleListIndex={setVehicleListIndex}
        setProductListIndex={setProductListIndex}
        getLeadgerDisplayName={getLeadgerDisplayName}
        getVehicleDisplayName={getVehicleDisplayName}
        getProductDisplayName={getProductDisplayName}
        handleCancel={handleCancel}
        handleSubmit={handleSubmit}
        handleInputChange={handleInputChange}
        handleLeadgerFocus={handleLeadgerFocus}
        handleLeadgerInputChange={handleLeadgerInputChange}
        handleLeadgerInputKeyDown={handleLeadgerInputKeyDown}
        handleVehicleFocus={handleVehicleFocus}
        handleVehicleInputChange={handleVehicleInputChange}
        handleVehicleInputKeyDown={handleVehicleInputKeyDown}
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
      <div className="mb-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
        <div className="border-b border-gray-200 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 px-6 py-5">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <div className="relative w-full lg:w-[22%] lg:min-w-[260px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search sales..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 lg:w-56"
            >
              <option value="">Sale History - All Time</option>
              <option value="7d">Sale History - 7 Days</option>
              <option value="30d">Sale History - 30 Days</option>
              <option value="3m">Sale History - 3 Months</option>
              <option value="6m">Sale History - 6 Months</option>
              <option value="1y">Sale History - 1 Year</option>
              <option value="monthwise">Sale History - Month Wise</option>
            </select>
            <button
              onClick={handleOpenForm}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-lg bg-slate-800 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-900"
            >
              + New Sale
            </button>
          </div>
        </div>

      {dateFilter === 'monthwise' && (
        <div className="border-b border-slate-200 bg-white px-4 py-4 sm:px-5">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedMonthKey('')}
              className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition ${
                !selectedMonthKey
                  ? 'border-slate-700 bg-slate-800 text-white'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              All Months
            </button>
            {monthWiseSummary.map((month) => (
              <button
                key={month.key}
                type="button"
                onClick={() => setSelectedMonthKey(month.key)}
                className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition ${
                  selectedMonthKey === month.key
                    ? 'border-blue-700 bg-blue-700 text-white'
                    : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
                }`}
              >
                {month.label}
              </button>
            ))}
          </div>

          {monthWiseSummary.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              No monthly sale history available for the current search.
            </div>
          ) : (
            <div className="rounded-[20px] border border-slate-200 bg-[radial-gradient(circle_at_top_right,rgba(148,163,184,0.16),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(241,245,249,0.96)_100%)] p-3 shadow-[0_18px_36px_rgba(15,23,42,0.08)] sm:p-5">
              <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-separate border-spacing-0 text-left text-sm whitespace-nowrap">
                <thead className="bg-[linear-gradient(135deg,#0f766e_0%,#0d9488_38%,#0891b2_72%,#0284c7_100%)] text-white">
                  <tr>
                    <th className="border-y-2 border-l-2 border-r border-black px-4 py-3.5 text-center text-sm font-semibold">Month</th>
                    <th className="border-y-2 border-r border-black px-4 py-3.5 text-center text-sm font-semibold">Invoices</th>
                    <th className="border-y-2 border-r-2 border-black px-4 py-3.5 text-center text-sm font-semibold">Total Sale</th>
                  </tr>
                </thead>
                <tbody className="bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(248,250,252,0.98)_100%)] text-slate-600">
                  {monthWiseSummary.map((month) => (
                    <tr
                      key={month.key}
                      onClick={() => setSelectedMonthKey(month.key)}
                      className={`cursor-pointer transition-colors duration-150 ${
                        selectedMonthKey === month.key ? 'bg-blue-100/80' : 'hover:bg-slate-200/45'
                      }`}
                    >
                      <td className="border border-slate-400 px-4 py-3 text-center font-semibold text-slate-800">{month.label}</td>
                      <td className="border border-slate-400 px-4 py-3 text-center">{month.saleCount}</td>
                      <td className="border border-slate-400 px-4 py-3 text-center font-semibold text-emerald-700">
                        Rs {month.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sales List */}
      {loading && !showForm ? (
        <div className="px-6 py-10 text-center text-slate-500">Loading...</div>
      ) : visibleSales.length === 0 ? (
        <div className="rounded-[20px] border border-dashed border-slate-300 bg-white/80 px-6 py-10 text-center text-slate-500">
          {dateFilter === 'monthwise' && selectedMonthKey
            ? 'No sales found for selected month.'
            : 'No sales found. Create your first sale!'}
        </div>
      ) : (
        <div className="rounded-[20px] border border-slate-200 bg-[radial-gradient(circle_at_top_right,rgba(148,163,184,0.16),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(241,245,249,0.96)_100%)] p-3 shadow-[0_18px_36px_rgba(15,23,42,0.08)] sm:p-5">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] border-separate border-spacing-0 text-left text-sm whitespace-nowrap">
              <thead className="bg-[linear-gradient(135deg,#0f766e_0%,#0d9488_38%,#0891b2_72%,#0284c7_100%)] text-white">
                <tr>
                  <th className="border-y-2 border-l-2 border-r border-black px-4 py-3.5 text-center text-sm font-semibold">Invoice</th>
                  <th className="border-y-2 border-r border-black px-4 py-3.5 text-center text-sm font-semibold">Party Name</th>
                  <th className="border-y-2 border-r border-black px-4 py-3.5 text-center text-sm font-semibold">Vehicle No</th>
                  <th className="border-y-2 border-r border-black px-4 py-3.5 text-center text-sm font-semibold">Material</th>
                  <th className="border-y-2 border-r border-black px-4 py-3.5 text-center text-sm font-semibold">Vehicle Wt</th>
                  <th className="border-y-2 border-r border-black px-4 py-3.5 text-center text-sm font-semibold">Net Wt</th>
                  <th className="border-y-2 border-r border-black px-4 py-3.5 text-center text-sm font-semibold">Mat. Wt</th>
                  <th className="border-y-2 border-r border-black px-4 py-3.5 text-sm font-semibold">Products</th>
                  <th className="border-y-2 border-r border-black px-4 py-3.5 text-center text-sm font-semibold">Date</th>
                  <th className="border-y-2 border-r border-black px-4 py-3.5 text-center text-sm font-semibold">Total</th>
                  <th className="border-y-2 border-r-2 border-black px-4 py-3.5 text-center text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(248,250,252,0.98)_100%)] text-slate-600">
                {visibleSales.map((sale) => {
                  return (
                  <tr key={sale._id} className="transition-colors duration-150 hover:bg-slate-200/45">
                    <td className="border border-slate-400 px-4 py-3 text-center font-semibold text-slate-800">
                      <button
                        type="button"
                        onClick={() => handleOpenInvoicePdf(sale._id)}
                        className="text-blue-700 underline underline-offset-2 transition hover:text-blue-900"
                      >
                        {sale.invoiceNumber}
                      </button>
                    </td>
                    <td className="border border-slate-400 px-4 py-3 text-center font-medium text-slate-700">{resolveLeadgerNameById(sale.party) || sale.customerName || '-'}</td>
                    <td className="border border-slate-400 px-4 py-3 text-center font-medium text-slate-700">{sale.vehicleNo || '-'}</td>
                    <td className="border border-slate-400 px-4 py-3 text-center">
                      {sale.materialType ? (
                        <span className="bg-amber-50 text-amber-700 px-2 py-1 rounded-full text-xs font-medium border border-amber-200">
                          {sale.materialType.toUpperCase()}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="border border-slate-400 px-4 py-3 text-center text-slate-600">{sale.vehicleWeight ? `${sale.vehicleWeight} kg` : '-'}</td>
                    <td className="border border-slate-400 px-4 py-3 text-center text-slate-600">{sale.netWeight ? `${sale.netWeight} kg` : '-'}</td>
                    <td className="border border-slate-400 px-4 py-3 text-center font-semibold text-emerald-600">{sale.materialWeight ? `${sale.materialWeight} kg` : '-'}</td>
                    <td className="border border-slate-400 px-4 py-3 text-slate-600">
                      {sale.items?.length
                        ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {sale.items.slice(0, 2).map((item, idx) => (
                              <span key={idx} className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-xs font-medium border border-blue-100">
                                {item.productName}
                              </span>
                            ))}
                            {sale.items.length > 2 && (
                              <span className="text-xs font-medium text-slate-500 ml-1">
                                +{sale.items.length - 2} more
                              </span>
                            )}
                          </div>
                        )
                        : '-'}
                    </td>
                    <td className="border border-slate-400 px-4 py-3 text-center text-slate-600">{new Date(sale.saleDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td className="border border-slate-400 px-4 py-3 text-center font-semibold text-emerald-600">
                      Rs {Number(sale.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="border border-slate-400 px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleEdit(sale)}
                        className="inline-flex items-center justify-center rounded-md border border-blue-200 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(sale._id)}
                        className="inline-flex items-center justify-center rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 shadow-sm transition hover:border-red-300 hover:bg-red-50"
                      >
                        Delete
                      </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
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

