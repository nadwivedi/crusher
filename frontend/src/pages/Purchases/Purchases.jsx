import { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Banknote, CreditCard, Eye, Inbox, IndianRupee, Pencil, Plus, RefreshCw, Search, ShoppingCart, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import apiClient from '../../utils/api';
import useAccounts from '../../utils/useAccounts';
import AddPartyPopup from '../Party/component/AddPartyPopup';
import AddProductPopup from '../Products/component/AddProductPopup';
import StatCard from '../../components/StatCard';
import Segmented from '../../components/Segmented';
import AddPurchasePopup from './component/AddPurchasePopup';

const PURCHASE_TYPES = {
  cash: { label: 'Cash', badge: 'badge-green' },
  partial: { label: 'Partial', badge: 'badge-orange' },
  credit: { label: 'Credit', badge: 'badge-red' }
};

const getPurchaseType = (total, paid) => {
  const totalAmount = Number(total || 0);
  const paidAmount = Number(paid || 0);

  if (paidAmount === 0) return PURCHASE_TYPES.credit;
  if (paidAmount >= totalAmount && totalAmount > 0) return PURCHASE_TYPES.cash;
  return PURCHASE_TYPES.partial;
};

// Period pills; the keys are the ranges getFromDateByFilter understands
const PERIODS = [
  { key: '', label: 'All', period: 'All time' },
  { key: '7d', label: '7 Days', period: 'Last 7 days' },
  { key: '30d', label: '30 Days', period: 'Last 30 days' },
  { key: '3m', label: '3 Months', shortLabel: '3 Mo', period: 'Last 3 months' },
  { key: '6m', label: '6 Months', shortLabel: '6 Mo', period: 'Last 6 months' },
  { key: '1y', label: '1 Year', period: 'Last 1 year' }
];

// Table cells a little tighter than the app default, so every column fits without scrolling
const TH = 'tbl-head px-3 py-2 first:pl-5 last:pr-5';
const TD = 'tbl-cell px-3 py-2 first:pl-5 last:pr-5';

const formatRupees = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const formatDate = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const purchaseCount = (count) => `${count.toLocaleString('en-IN')} purchase${count === 1 ? '' : 's'}`;

// The backend keeps one default "Cash" party per account; it is preselected for new purchases.
const CASH_PARTY = { name: 'Cash' };

export default function Purchases({ modalOnly = false, onModalFinish = null }) {
  const toastOptions = { autoClose: 1200 };
  const location = useLocation();
  const navigate = useNavigate();
  const { accounts, defaultAccountId } = useAccounts();
  const formatDateInput = (dateValue = new Date()) => {
    const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
    if (Number.isNaN(date.getTime())) return '';

    return date.toISOString().split('T')[0];
  };

  const parseDateInput = (value) => {
    const normalizedValue = String(value || '').trim();
    if (!normalizedValue) return null;

    const ddmmyyyyMatch = normalizedValue.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    const yyyymmddMatch = normalizedValue.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);

    let dayText;
    let monthText;
    let yearText;

    if (ddmmyyyyMatch) {
      [, dayText, monthText, yearText] = ddmmyyyyMatch;
    } else if (yyyymmddMatch) {
      [, yearText, monthText, dayText] = yyyymmddMatch;
    } else {
      return null;
    }

    const day = Number(dayText);
    const month = Number(monthText);
    const year = Number(yearText);
    const parsedDate = new Date(year, month - 1, day);

    if (
      Number.isNaN(parsedDate.getTime())
      || parsedDate.getDate() !== day
      || parsedDate.getMonth() !== month - 1
      || parsedDate.getFullYear() !== year
    ) {
      return null;
    }

    return parsedDate;
  };

  const normalizePurchaseDateValue = (value) => {
    const text = String(value || '').trim();
    if (!text) return '';

    const parsedDate = parseDateInput(text);
    if (parsedDate) {
      return formatDateInput(parsedDate);
    }
    return text;
  };

  const formatPurchaseNumber = (value) => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isInteger(parsed) || parsed <= 0) return '-';
    return `Pur-${String(parsed).padStart(2, '0')}`;
  };

  const getInitialFormData = () => ({
    party: '',
    supplierInvoice: '',
    items: [],
    purchaseDate: formatDateInput(),
    totalAmount: 0,
    invoiceLink: '',
    notes: '',
    paymentAmount: '',
    account: '',
    paymentMethod: 'cash',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentNotes: '',
    isBillWisePayment: false
  });

  const getInitialPartyFormData = (type = 'supplier') => ({
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
    boulderRatePerTon: ''
  });

  const toTitleCase = (value) => String(value || '')
    .toLowerCase()
    .replace(/\b[a-z]/g, (char) => char.toUpperCase());

  const initialCurrentItem = {
    product: '',
    productName: '',
    unit: '',
    quantity: '',
    unitPrice: ''
  };

  const [purchases, setPurchases] = useState([]);
  const [leadgers, setLeadgers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [formData, setFormData] = useState(getInitialFormData());
  const [currentItem, setCurrentItem] = useState(initialCurrentItem);
  const [uploadingInvoice, setUploadingInvoice] = useState(false);
  const [showPartyForm, setShowPartyForm] = useState(false);
  const [partyFormData, setPartyFormData] = useState(getInitialPartyFormData());
  const [partyPopupLoading, setPartyPopupLoading] = useState(false);
  const [partyPopupError, setPartyPopupError] = useState('');
  const [showProductForm, setShowProductForm] = useState(false);
  const [leadgerQuery, setLeadgerQuery] = useState(CASH_PARTY.name);
  const [leadgerListIndex, setLeadgerListIndex] = useState(-1);
  const [isLeadgerSectionActive, setIsLeadgerSectionActive] = useState(false);
  const [productQuery, setProductQuery] = useState('');
  const [productListIndex, setProductListIndex] = useState(-1);
  const [isProductSectionActive, setIsProductSectionActive] = useState(false);
  const leadgerSectionRef = useRef(null);
  const leadgerInputRef = useRef(null);
  const productSectionRef = useRef(null);
  const productInputRef = useRef(null);

  useEffect(() => {
    fetchPurchases();
    fetchLeadgers();
    fetchProducts();
  }, [search, dateFilter]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const tagName = event.target?.tagName?.toLowerCase();
      const isTypingTarget = tagName === 'input' || tagName === 'textarea' || tagName === 'select' || event.target?.isContentEditable;
      const key = event.key?.toLowerCase();
      if (event.defaultPrevented || !event.altKey || event.ctrlKey || event.metaKey) return;
      if (isTypingTarget || showForm) return;
      if (key !== 'p') return;

      event.preventDefault();
      handleOpenForm();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showForm]);

  useEffect(() => {
    if (location.state?.openShortcut !== 'purchase' || showForm) return;

    handleOpenForm();
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.pathname, location.state, navigate, showForm]);

  useEffect(() => {
    if (!modalOnly || showForm) return;
    handleOpenForm();
  }, [modalOnly, showForm]);

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

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const fromDate = getFromDateByFilter();
      const response = await apiClient.get('/purchases', {
        params: {
          search,
          fromDate: fromDate || undefined
        }
      });
      setPurchases(response.data || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Error fetching purchases');
    } finally {
      setLoading(false);
    }
  };

  const fetchLeadgers = async () => {
    try {
      const response = await apiClient.get('/parties');
      setLeadgers(Array.isArray(response) ? response : []);
    } catch (err) {
      console.error('Error fetching leadgers:', err);
    }
  };

  const getLeadgerDisplayName = (leadger) => {
    const name = String(leadger?.name || '').trim();

    if (name) return name;
    return 'Party Name';
  };

  const resolveLeadgerNameById = (leadgerId) => {
    const resolvedId = typeof leadgerId === 'object' ? leadgerId?._id : leadgerId;
    if (!resolvedId) return CASH_PARTY.name;
    const matching = leadgers.find((leadger) => String(leadger._id) === String(resolvedId));
    return matching ? getLeadgerDisplayName(matching) : '-';
  };

  const normalizeText = (value) => String(value || '').trim().toLowerCase();

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

  const selectedLeadgerName = useMemo(() => {
    const resolvedName = resolveLeadgerNameById(formData.party);
    return resolvedName === '-' ? '' : resolvedName;
  }, [formData.party, leadgers]);

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
  const cashLeadgerId = leadgers.find((leadger) => (
    String(leadger.type || '').toLowerCase() === 'cash-in-hand'
    && normalizeText(leadger.name) === normalizeText(CASH_PARTY.name)
  ))?._id || '';
  const isCashParty = String(selectedLeadger?.type || '').trim().toLowerCase() === 'cash-in-hand';

  useEffect(() => {
    if (!showForm || editingId || !cashLeadgerId) return;
    setFormData((prev) => (prev.party ? prev : { ...prev, party: cashLeadgerId }));
    setLeadgerQuery((prev) => prev || CASH_PARTY.name);
  }, [showForm, editingId, cashLeadgerId]);

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

  const handleLeadgerFocus = () => {
    setIsLeadgerSectionActive(true);
  };

  useEffect(() => {
    if (!showForm || editingId || !isCashParty) return;

    setFormData((prev) => {
      const nextPaymentAmount = String(Number(prev.totalAmount || 0));
      if (
        String(prev.paymentAmount || '') === nextPaymentAmount
        && prev.paymentMethod === 'cash'
      ) {
        return prev;
      }

      return {
        ...prev,
        paymentAmount: nextPaymentAmount,
        paymentMethod: 'cash'
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

  const selectLeadger = (leadger) => {
    if (!leadger) {
      setLeadgerQuery('');
      setFormData((prev) => ({ ...prev, party: '' }));
      setLeadgerListIndex(-1);
      return;
    }

    const leadgerName = getLeadgerDisplayName(leadger);
    setLeadgerQuery(leadgerName);
    setFormData((prev) => ({ ...prev, party: leadger._id }));

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
      setFormData((prev) => ({ ...prev, party: exactLeadger._id }));
      const exactIndex = getMatchingLeadgers(value).findIndex((item) => String(item._id) === String(exactLeadger._id));
      setLeadgerListIndex(exactIndex >= 0 ? exactIndex : 0);
      return;
    }

    const matches = getMatchingLeadgers(value);
    const firstMatch = matches[0] || null;
    setFormData((prev) => ({ ...prev, party: firstMatch?._id || '' }));
    setLeadgerListIndex(firstMatch ? 0 : -1);
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
      ...getInitialPartyFormData('supplier'),
      name: toTitleCase(leadgerQuery || prev.name || '')
    }));
    setPartyPopupError('');
    setIsLeadgerSectionActive(false);
    setShowPartyForm(true);
  };

  const closeInlinePartyForm = (shouldRefocusLeadger = true) => {
    setShowPartyForm(false);
    setPartyFormData(getInitialPartyFormData('supplier'));
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

    if (key === 'control' && !e.altKey && !e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
      openInlinePartyForm();
      return;
    }

    if (key === 'arrowdown') {
      e.preventDefault();
      e.stopPropagation();
      if (filteredLeadgers.length === 0) return;
      setLeadgerListIndex((prev) => {
        if (prev < 0) return 0;
        return Math.min(prev + 1, filteredLeadgers.length - 1);
      });
      return;
    }

    if (key === 'arrowup') {
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

  const fetchProducts = async () => {
    try {
      const response = await apiClient.get('/products');
      setProducts(response.data || []);
    } catch (err) {
      console.error('Error fetching products:', err);
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
      // Row 0 is "done adding items"; product N sits on row N + 1
      const selectedIndex = filteredProducts.findIndex((item) => String(item._id) === String(currentItem.product));
      setProductListIndex(selectedIndex >= 0 ? selectedIndex + 1 : 0);
      return;
    }

    setProductListIndex((prev) => {
      if (prev < 0) return 0;
      if (prev > filteredProducts.length) return filteredProducts.length;
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
        unit: ''
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
      unit: String(product.unit || '').trim()
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
        unit: String(exactProduct.unit || '').trim()
      }));
      // Row 0 of the product list is "done adding items", so products are highlighted from row 1
      const exactIndex = getMatchingProducts(value).findIndex((item) => String(item._id) === String(exactProduct._id));
      setProductListIndex(exactIndex >= 0 ? exactIndex + 1 : 1);
      return;
    }

    const matches = getMatchingProducts(value);
    const firstMatch = matches[0] || null;
    setCurrentItem((prev) => ({
      ...prev,
      product: firstMatch?._id || '',
      productName: firstMatch ? getProductDisplayName(firstMatch) : '',
      unit: firstMatch ? String(firstMatch.unit || '').trim() : ''
    }));
    setProductListIndex(firstMatch ? 1 : -1);
  };

  const handleProductInputKeyDown = (e, moveToPaymentSection) => {
    const key = e.key?.toLowerCase();
    const lastOptionIndex = filteredProducts.length;
    const endItemListIndex = 0;

    if (key === 'control' && !e.altKey && !e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
      openInlineProductForm();
      return;
    }

    if (key === 'delete') {
      e.preventDefault();
      e.stopPropagation();
      setIsProductSectionActive(false);
      moveToPaymentSection?.();
      return;
    }

    if (key === 'arrowdown') {
      e.preventDefault();
      e.stopPropagation();
      setProductListIndex((prev) => {
        if (prev < 0) return endItemListIndex;
        return Math.min(prev + 1, lastOptionIndex);
      });
      return;
    }

    if (key === 'arrowup') {
      e.preventDefault();
      e.stopPropagation();
      setProductListIndex((prev) => {
        if (prev < 0) return endItemListIndex;
        return Math.max(prev - 1, endItemListIndex);
      });
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();

      if (productListIndex === endItemListIndex) {
        setIsProductSectionActive(false);
        moveToPaymentSection?.();
        return;
      }

      const activeProduct = productListIndex > 0 ? filteredProducts[productListIndex - 1] : null;
      const matchedProduct = activeProduct || findExactProduct(productQuery) || findBestProductMatch(productQuery);
      if (matchedProduct) {
        selectProduct(matchedProduct);
      }
      setIsProductSectionActive(false);
      focusNextPopupField(e.currentTarget);
    }
  };

  const calculateTotals = (items) => {
    const totalAmount = items.reduce((sum, item) => {
      return sum + (Number(item.total || 0));
    }, 0);

    setFormData((prev) => ({
      ...prev,
      totalAmount
    }));
  };

  const handleAddItem = () => {
    if (!currentItem.product || !currentItem.quantity || !currentItem.unitPrice) {
      setError('Product, quantity and price are required');
      return false;
    }

    const quantity = Number(currentItem.quantity);
    const unitPrice = Number(currentItem.unitPrice);

    if (quantity <= 0 || unitPrice < 0) {
      setError('Quantity must be > 0 and price cannot be negative');
      return false;
    }

    const product = products.find((p) => p._id === currentItem.product);

    const newItem = {
      ...currentItem,
      productName: product?.name || currentItem.productName || 'Item',
      unit: String(product?.unit || currentItem.unit || '').trim(),
      quantity,
      unitPrice,
      total: quantity * unitPrice
    };

    const updatedItems = [...formData.items, newItem];

    setFormData((prev) => ({
      ...prev,
      items: updatedItems
    }));

    setCurrentItem(initialCurrentItem);
    setProductQuery('');
    setProductListIndex(-1);
    setIsProductSectionActive(false);
    calculateTotals(updatedItems);
    setError('');
    return true;
  };

  const handleRemoveItem = (index) => {
    const updatedItems = formData.items.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, items: updatedItems }));
    calculateTotals(updatedItems);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'purchaseDate') {
      setFormData((prev) => ({ ...prev, purchaseDate: normalizePurchaseDateValue(value) }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
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
          openingBalanceType: String(partyFormData.openingBalanceType || 'payable'),
          tenMmRate: Number(partyFormData.tenMmRate || 0),
          twentyMmRate: Number(partyFormData.twentyMmRate || 0),
          fortyMmRate: Number(partyFormData.fortyMmRate || 0),
          wmmRate: Number(partyFormData.wmmRate || 0),
          gsbRate: Number(partyFormData.gsbRate || 0),
          dustRate: Number(partyFormData.dustRate || 0),
          boulderRatePerTon: Number(partyFormData.boulderRatePerTon || 0)
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
      setPartyFormData(getInitialPartyFormData('supplier'));
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

    if (formData.items.length === 0) {
      setError('At least one item is required');
      return;
    }

    const entryPaymentAmount = isCashParty
      ? Math.max(0, Number(formData.totalAmount || 0))
      : Math.max(0, Number(formData.paymentAmount || 0));

    const parsedPurchaseDate = parseDateInput(formData.purchaseDate);
    if (!parsedPurchaseDate) {
      setError('Please select a valid purchase date');
      return;
    }

    try {
      setLoading(true);
      const isEditMode = Boolean(editingId);

      const submitData = {
        ...formData,
        supplierInvoice: String(formData.supplierInvoice || '').trim(),
        purchaseDate: parsedPurchaseDate,
        totalAmount: Number(formData.totalAmount || 0),
        invoiceLink: formData.invoiceLink || '',
        paymentAmount: entryPaymentAmount,
        account: formData.account || defaultAccountId || undefined,
        paymentMethod: formData.paymentMethod || 'cash',
        paymentDate: formData.paymentDate ? new Date(formData.paymentDate) : new Date(),
        paymentNotes: formData.paymentNotes || '',
        isBillWisePayment: false
      };

      if (editingId) {
        await apiClient.put(`/purchases/${editingId}`, submitData);
      } else {
        await apiClient.post('/purchases', submitData);
      }

      toast.success(
        isEditMode ? 'Purchase updated successfully' : 'Purchase added successfully',
        toastOptions
      );

      fetchPurchases();
      setFormData(getInitialFormData());
      setCurrentItem(initialCurrentItem);
      setEditingId(null);
      setLeadgerQuery(CASH_PARTY.name);
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
      setError(err.message || 'Error saving purchase');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (purchase) => {
    const normalizedItems = (purchase.items || []).map((item) => ({
      ...item,
      product: item.product?._id || item.product,
      productName: item.productName || item.product?.name || 'Item',
      unit: String(item.unit || item.product?.unit || '').trim(),
      quantity: Number(item.quantity || 0),
      unitPrice: Number(item.unitPrice || 0),
      total: Number(item.total || (Number(item.quantity || 0) * Number(item.unitPrice || 0)))
    }));

    const normalizedPartyId = purchase.party?._id || purchase.party || '';
    const resolvedLeadgerName = resolveLeadgerNameById(normalizedPartyId);

    setFormData({
      party: normalizedPartyId,
      supplierInvoice: purchase.supplierInvoice || purchase.invoiceNo || purchase.invoiceNumber || '',
      items: normalizedItems,
      purchaseDate: purchase.purchaseDate ? formatDateInput(purchase.purchaseDate) : '',
      totalAmount: Number(purchase.totalAmount || 0),
      invoiceLink: purchase.invoiceLink || '',
      notes: purchase.notes || '',
      paymentAmount: String(Number(purchase.paidAmount || 0)),
      account: purchase.account?._id || purchase.account || '',
      paymentMethod: purchase.paymentMethod || 'cash',
      paymentDate: purchase.purchaseDate ? new Date(purchase.purchaseDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      paymentNotes: '',
      isBillWisePayment: false
    });

    setCurrentItem(initialCurrentItem);
    setLeadgerQuery(resolvedLeadgerName === '-' ? CASH_PARTY.name : resolvedLeadgerName);
    setLeadgerListIndex(resolvedLeadgerName && resolvedLeadgerName !== '-' ? 0 : -1);
    setIsLeadgerSectionActive(false);
    setProductQuery('');
    setProductListIndex(-1);
    setIsProductSectionActive(false);
    setEditingId(purchase._id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this purchase?')) {
      try {
        await apiClient.delete(`/purchases/${id}`);
        toast.success('Purchase deleted successfully', toastOptions);
        fetchPurchases();
      } catch (err) {
        setError(err.message || 'Error deleting purchase');
      }
    }
  };

  const handleCancel = () => {
    if (modalOnly && typeof onModalFinish === 'function') {
      onModalFinish();
      return;
    }

    setShowForm(false);
    setEditingId(null);
    setFormData(getInitialFormData());
    setCurrentItem(initialCurrentItem);
    setLeadgerQuery(CASH_PARTY.name);
    setLeadgerListIndex(-1);
    setIsLeadgerSectionActive(false);
    setProductQuery('');
    setProductListIndex(-1);
    setIsProductSectionActive(false);
    setShowPartyForm(false);
    setPartyFormData(getInitialPartyFormData('supplier'));
    setPartyPopupError('');
    setShowProductForm(false);
    setError('');
  };

  const handleOpenForm = () => {
    setEditingId(null);
    setFormData(getInitialFormData());
    setCurrentItem(initialCurrentItem);
    setLeadgerQuery(CASH_PARTY.name);
    setLeadgerListIndex(0);
    setIsLeadgerSectionActive(false);
    setProductQuery('');
    setProductListIndex(0);
    setIsProductSectionActive(false);
    setShowPartyForm(false);
    setPartyFormData(getInitialPartyFormData('supplier'));
    setPartyPopupError('');
    setShowProductForm(false);
    setError('');
    setShowForm(true);
  };

  const handleInvoiceUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadingInvoice(true);
      const body = new FormData();
      body.append('invoice', file);

      const response = await apiClient.post('/uploads/invoice', body, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setFormData((prev) => ({
        ...prev,
        invoiceLink: response.data?.url || response.data?.relativePath || ''
      }));
      setError('');
    } catch (err) {
      setError(err.message || 'Error uploading invoice');
    } finally {
      setUploadingInvoice(false);
      event.target.value = '';
    }
  };

  // The popup shares `loading` while it saves; the list behind it should not react to that
  const listLoading = loading && !showForm;
  const initialLoading = listLoading && purchases.length === 0;
  const periodLabel = PERIODS.find((option) => option.key === dateFilter)?.period || 'All time';

  // The values a purchase row shows, worked out once for the phone list and the table
  const describePurchase = (purchase) => {
    const total = Number(purchase.totalAmount || 0);
    const paid = Number(purchase.paidAmount || 0);
    const itemNames = (purchase.items || []).map((item) => item.productName).filter(Boolean);
    const extraItems = itemNames.length - 2;

    return {
      party: resolveLeadgerNameById(purchase.party) || '—',
      supplierInvoice: purchase.supplierInvoice || purchase.invoiceNo || purchase.invoiceNumber || '',
      items: extraItems > 0 ? `${itemNames.slice(0, 2).join(', ')} +${extraItems} more` : itemNames.join(', '),
      allItems: itemNames.join(', '),
      type: getPurchaseType(total, paid),
      total,
      paid,
      balance: total - paid
    };
  };

  const totals = purchases.reduce((acc, purchase) => {
    const total = Number(purchase.totalAmount || 0);
    const paid = Number(purchase.paidAmount || 0);
    acc.total += total;
    acc.paid += paid;
    acc.balance += total - paid;
    if (total > paid) acc.unpaid += 1;
    return acc;
  }, { total: 0, paid: 0, balance: 0, unpaid: 0 });

  const shareOfTotal = (amount) => (
    totals.total > 0 ? `${((amount / totals.total) * 100).toFixed(0)}% of total` : 'No purchases'
  );

  const stats = [
    { icon: ShoppingCart, label: 'Purchases', tone: 'blue', value: purchases.length.toLocaleString('en-IN'), hint: `${totals.unpaid.toLocaleString('en-IN')} with balance due` },
    { icon: IndianRupee, label: 'Total Amount', tone: 'indigo', value: formatRupees(totals.total), hint: periodLabel },
    { icon: Banknote, label: 'Paid', tone: 'emerald', value: formatRupees(totals.paid), hint: shareOfTotal(totals.paid) },
    { icon: CreditCard, label: 'Balance Due', tone: 'rose', value: formatRupees(totals.balance), hint: shareOfTotal(totals.balance) }
  ];

  const renderActions = (purchase) => (
    <div className="flex items-center justify-end">
      {purchase.invoiceLink && (
        <a href={purchase.invoiceLink} target="_blank" rel="noreferrer" title="View invoice" aria-label="View invoice" className="icon-btn inline-flex p-1.5 hover:bg-blue-50 hover:text-blue-600">
          <Eye size={16} />
        </a>
      )}
      <button type="button" title="Edit" aria-label="Edit" className="icon-btn p-1.5 hover:bg-blue-50 hover:text-blue-600" onClick={() => handleEdit(purchase)}>
        <Pencil size={16} />
      </button>
      <button type="button" title="Delete" aria-label="Delete" className="icon-btn p-1.5 hover:bg-rose-50 hover:text-rose-600" onClick={() => handleDelete(purchase._id)}>
        <Trash2 size={16} />
      </button>
    </div>
  );

  if (modalOnly) {
    return (
      <>
        <AddPurchasePopup
          showForm={showForm}
          editingId={editingId}
          loading={loading}
          error={error}
          isCashParty={isCashParty}
          accounts={accounts}
          defaultAccountId={defaultAccountId}
          formData={formData}
          currentItem={currentItem}
          products={products}
          uploadingInvoice={uploadingInvoice}
          leadgerSectionRef={leadgerSectionRef}
          leadgerInputRef={leadgerInputRef}
          leadgerQuery={leadgerQuery}
          leadgerListIndex={leadgerListIndex}
          filteredLeadgers={filteredLeadgers}
          isLeadgerSectionActive={isLeadgerSectionActive}
          productSectionRef={productSectionRef}
          productInputRef={productInputRef}
          productQuery={productQuery}
          productListIndex={productListIndex}
          filteredProducts={filteredProducts}
          isProductSectionActive={isProductSectionActive}
          getLeadgerDisplayName={getLeadgerDisplayName}
          getProductDisplayName={getProductDisplayName}
          setCurrentItem={setCurrentItem}
          setIsLeadgerSectionActive={setIsLeadgerSectionActive}
          setLeadgerListIndex={setLeadgerListIndex}
          setIsProductSectionActive={setIsProductSectionActive}
          setProductListIndex={setProductListIndex}
          handleCancel={handleCancel}
          handleSubmit={handleSubmit}
          handleInputChange={handleInputChange}
          handleLeadgerFocus={handleLeadgerFocus}
          handleLeadgerInputChange={handleLeadgerInputChange}
          handleLeadgerInputKeyDown={handleLeadgerInputKeyDown}
          onOpenNewParty={openInlinePartyForm}
          handleProductFocus={handleProductFocus}
          handleProductInputChange={handleProductInputChange}
          handleProductInputKeyDown={handleProductInputKeyDown}
          onOpenNewProduct={openInlineProductForm}
          handleSelectEnterMoveNext={handleSelectEnterMoveNext}
          handleInvoiceUpload={handleInvoiceUpload}
          handleAddItem={handleAddItem}
          handleRemoveItem={handleRemoveItem}
          selectLeadger={selectLeadger}
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
    <div className="page-fade-in space-y-3.5 px-3 pb-6 pt-3.5 md:space-y-4 lg:px-6 lg:pt-4">
      <AddPurchasePopup
        showForm={showForm}
        editingId={editingId}
        loading={loading}
        error={showForm ? error : ''}
        isCashParty={isCashParty}
        accounts={accounts}
        defaultAccountId={defaultAccountId}
        formData={formData}
        currentItem={currentItem}
        products={products}
        uploadingInvoice={uploadingInvoice}
        leadgerSectionRef={leadgerSectionRef}
        leadgerInputRef={leadgerInputRef}
        leadgerQuery={leadgerQuery}
        leadgerListIndex={leadgerListIndex}
        filteredLeadgers={filteredLeadgers}
        isLeadgerSectionActive={isLeadgerSectionActive}
        productSectionRef={productSectionRef}
        productInputRef={productInputRef}
        productQuery={productQuery}
        productListIndex={productListIndex}
        filteredProducts={filteredProducts}
        isProductSectionActive={isProductSectionActive}
        getLeadgerDisplayName={getLeadgerDisplayName}
        getProductDisplayName={getProductDisplayName}
        setCurrentItem={setCurrentItem}
        setIsLeadgerSectionActive={setIsLeadgerSectionActive}
        setLeadgerListIndex={setLeadgerListIndex}
        setIsProductSectionActive={setIsProductSectionActive}
        setProductListIndex={setProductListIndex}
        handleCancel={handleCancel}
        handleSubmit={handleSubmit}
        handleInputChange={handleInputChange}
        handleLeadgerFocus={handleLeadgerFocus}
        handleLeadgerInputChange={handleLeadgerInputChange}
        handleLeadgerInputKeyDown={handleLeadgerInputKeyDown}
        onOpenNewParty={openInlinePartyForm}
        handleProductFocus={handleProductFocus}
        handleProductInputChange={handleProductInputChange}
        handleProductInputKeyDown={handleProductInputKeyDown}
        onOpenNewProduct={openInlineProductForm}
        handleSelectEnterMoveNext={handleSelectEnterMoveNext}
        handleInvoiceUpload={handleInvoiceUpload}
        handleAddItem={handleAddItem}
        handleRemoveItem={handleRemoveItem}
        selectLeadger={selectLeadger}
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

      {/* The page is three blocks, like the other reports: period filter, the period's totals, then one panel with the data */}
      <div className="page-header gap-2.5">
        <div className="min-w-0">
          <h1 className="page-title">Purchase Report</h1>
          <p className="page-subtitle">Goods bought from suppliers · {periodLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented options={PERIODS} value={dateFilter} onChange={setDateFilter} />
          <button type="button" className="btn-primary" onClick={handleOpenForm}>
            <Plus size={18} /> New Purchase
          </button>
        </div>
      </div>

      {error && !showForm && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700">{error}</div>
      )}

      <section className={`grid grid-cols-2 gap-2 transition-opacity md:gap-3 lg:grid-cols-4 ${listLoading ? 'opacity-50' : ''}`}>
        {stats.map((stat) => <StatCard key={stat.label} compact {...stat} />)}
      </section>

      <section className="panel">
        <div className="panel-header py-2.5 flex flex-wrap items-center justify-between gap-2.5">
          <h2 className="text-sm font-bold text-slate-800">Purchases</h2>
          <div className="flex min-w-0 flex-1 basis-56 items-center justify-end gap-2">
            <div className="relative min-w-0 flex-1 md:max-w-64">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                className="input pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search purchases"
              />
            </div>
            <button type="button" className="icon-btn shrink-0" title="Refresh" aria-label="Refresh" onClick={fetchPurchases}>
              <RefreshCw size={16} className={listLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {initialLoading ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="h-9 w-9 animate-spin rounded-full border-4 border-primary-600 border-r-transparent" />
            <p className="text-sm text-slate-400">Loading purchases…</p>
          </div>
        ) : purchases.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Inbox size={20} />
            </span>
            <p className="text-sm font-semibold text-slate-800">No purchases found</p>
            <p className="text-xs text-slate-500">
              {search || dateFilter ? 'Try changing the search or the period.' : 'Add the first purchase with "New Purchase".'}
            </p>
          </div>
        ) : (
          <div className={`transition-opacity ${listLoading ? 'pointer-events-none opacity-50' : ''}`}>
            {/* Phone: three short lines per purchase */}
            <ul className="divide-y divide-slate-100 md:hidden">
              {purchases.map((purchase) => {
                const view = describePurchase(purchase);
                return (
                  <li key={purchase._id} className="px-4 py-2.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="min-w-0 truncate text-sm font-semibold text-slate-800">{view.party}</p>
                      <p className="shrink-0 text-sm font-bold text-slate-900">{formatRupees(view.total)}</p>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-3">
                      <p className="min-w-0 truncate text-xs text-slate-500">{view.items || 'No items'}</p>
                      <span className="shrink-0 text-xs text-slate-500">{formatDate(purchase.purchaseDate)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-1.5 text-[11px] text-slate-400">
                        <span className={`${view.type.badge} shrink-0`}>{view.type.label}</span>
                        <span className="truncate">
                          {formatPurchaseNumber(purchase.purchaseNumber)}
                          {view.balance > 0 && ` · Bal ${formatRupees(view.balance)}`}
                        </span>
                      </div>
                      {renderActions(purchase)}
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[860px] text-left">
                <thead>
                  <tr>
                    <th className={TH}>Date</th>
                    <th className={TH}>Party</th>
                    <th className={TH}>Products</th>
                    <th className={`${TH} text-right`}>Total</th>
                    <th className={`${TH} text-right`}>Paid</th>
                    <th className={`${TH} text-right`}>Balance</th>
                    <th className={TH}>Payment</th>
                    <th className={TH} />
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((purchase) => {
                    const view = describePurchase(purchase);
                    return (
                      <tr key={purchase._id} className="tbl-row">
                        <td className={`${TD} whitespace-nowrap`}>
                          {formatDate(purchase.purchaseDate)}
                          <span className="block text-[11px] leading-tight text-slate-400">{formatPurchaseNumber(purchase.purchaseNumber)}</span>
                        </td>
                        <td className={TD}>
                          <p className="max-w-[18rem] truncate font-semibold text-slate-800" title={view.party}>{view.party}</p>
                          {view.supplierInvoice && (
                            <span className="block max-w-[18rem] truncate text-[11px] leading-tight text-slate-400">Invoice {view.supplierInvoice}</span>
                          )}
                        </td>
                        <td className={TD}>
                          <p className="max-w-[20rem] truncate" title={view.allItems}>
                            {view.items || <span className="text-slate-400">No items</span>}
                          </p>
                        </td>
                        <td className={`${TD} whitespace-nowrap text-right font-bold text-slate-900`}>{formatRupees(view.total)}</td>
                        <td className={`${TD} whitespace-nowrap text-right text-emerald-700`}>{formatRupees(view.paid)}</td>
                        <td className={`${TD} whitespace-nowrap text-right ${view.balance > 0 ? 'font-semibold text-rose-600' : 'text-slate-400'}`}>{formatRupees(view.balance)}</td>
                        <td className={`${TD} whitespace-nowrap`}>
                          <span className={view.type.badge}>{view.type.label}</span>
                        </td>
                        <td className={`${TD} py-1!`}>{renderActions(purchase)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200 bg-slate-50">
                    <td className={`${TD} font-bold text-slate-900`} colSpan={3}>Total</td>
                    <td className={`${TD} whitespace-nowrap text-right font-bold text-slate-900`}>{formatRupees(totals.total)}</td>
                    <td className={`${TD} whitespace-nowrap text-right font-semibold text-emerald-700`}>{formatRupees(totals.paid)}</td>
                    <td className={`${TD} whitespace-nowrap text-right font-semibold text-rose-600`}>{formatRupees(totals.balance)}</td>
                    <td className={TD} colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-0.5 border-t border-slate-100 px-4 py-2 text-xs text-slate-500 md:px-5">
              <span>{purchaseCount(purchases.length)}</span>
              {/* The table has its own total row; phones get the totals here */}
              <span className="font-semibold text-slate-700 md:hidden">
                {formatRupees(totals.total)} · Bal {formatRupees(totals.balance)}
              </span>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
