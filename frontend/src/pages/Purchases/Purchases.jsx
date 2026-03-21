import { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, IndianRupee, Search } from 'lucide-react';
import { toast } from 'react-toastify';
import apiClient from '../../utils/api';
import AddPartyPopup from '../Party/component/AddPartyPopup';
import AddProductPopup from '../Products/component/AddProductPopup';
import AddPurchasePopup from './component/AddPurchasePopup';

export default function Purchases({ modalOnly = false, onModalFinish = null }) {
  const toastOptions = { autoClose: 1200 };
  const location = useLocation();
  const navigate = useNavigate();
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
    dueDate: '',
    totalAmount: 0,
    invoiceLink: '',
    notes: '',
    paymentAmount: '',
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
    dustRate: ''
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
  const [leadgerQuery, setLeadgerQuery] = useState('');
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
    if (!resolvedId) return '-';
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
        && prev.dueDate === ''
      ) {
        return prev;
      }

      return {
        ...prev,
        paymentAmount: nextPaymentAmount,
        paymentMethod: 'cash',
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
      unit: firstMatch ? String(firstMatch.unit || '').trim() : ''
    }));
    setProductListIndex(firstMatch ? 0 : -1);
  };

  const handleProductInputKeyDown = (e, moveToPaymentSection) => {
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
        moveToPaymentSection?.();
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
          openingBalanceType: String(partyFormData.openingBalanceType || 'payable'),
          tenMmRate: Number(partyFormData.tenMmRate || 0),
          twentyMmRate: Number(partyFormData.twentyMmRate || 0),
          fortyMmRate: Number(partyFormData.fortyMmRate || 0),
          wmmRate: Number(partyFormData.wmmRate || 0),
          gsbRate: Number(partyFormData.gsbRate || 0),
          dustRate: Number(partyFormData.dustRate || 0)
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

    if (!formData.party || formData.items.length === 0) {
      setError('Party name and at least one item are required');
      return;
    }

    const entryPaymentAmount = isCashParty
      ? Math.max(0, Number(formData.totalAmount || 0))
      : Math.max(0, Number(formData.paymentAmount || 0));
    if (entryPaymentAmount > Number(formData.totalAmount || 0)) {
      setError('Entry payment amount cannot exceed total purchase amount');
      return;
    }

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
        dueDate: formData.dueDate ? new Date(formData.dueDate) : null,
        totalAmount: Number(formData.totalAmount || 0),
        invoiceLink: formData.invoiceLink || '',
        paymentAmount: isEditMode ? 0 : entryPaymentAmount,
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
      dueDate: purchase.dueDate ? new Date(purchase.dueDate).toISOString().split('T')[0] : '',
      totalAmount: Number(purchase.totalAmount || 0),
      invoiceLink: purchase.invoiceLink || '',
      notes: purchase.notes || '',
      paymentAmount: '',
      paymentMethod: 'cash',
      paymentDate: purchase.purchaseDate ? new Date(purchase.purchaseDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      paymentNotes: '',
      isBillWisePayment: false
    });

    setCurrentItem(initialCurrentItem);
    setLeadgerQuery(resolvedLeadgerName === '-' ? '' : resolvedLeadgerName);
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
    setLeadgerQuery('');
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
    setLeadgerQuery('');
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

  const totalPurchases = purchases.length;
  const totalAmount = purchases.reduce((sum, purchase) => sum + Number(purchase.totalAmount || 0), 0);

  if (modalOnly) {
    return (
      <>
        {error && (
          <div className="fixed left-4 right-4 top-4 z-[60] rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 shadow-lg md:left-auto md:right-4 md:w-[26rem]">
            {error}
          </div>
        )}
        <AddPurchasePopup
          showForm={showForm}
          editingId={editingId}
          loading={loading}
          isCashParty={isCashParty}
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      <div className="w-full px-3 pb-8 pt-4 md:px-4 lg:px-6 lg:pt-4">
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      <div className="mb-4 mt-1 grid grid-cols-2 gap-2.5">
        <div className="group relative overflow-hidden rounded-xl bg-white p-3 shadow-lg shadow-blue-500/10 ring-1 ring-slate-200/60 transition-all hover:shadow-xl hover:shadow-blue-500/20 sm:rounded-2xl sm:p-4">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 opacity-60"></div>
          <div className="relative flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[9px] sm:text-xs font-semibold text-slate-500 leading-tight">Total Purchases</p>
              <p className="mt-1 sm:mt-2 text-sm sm:text-2xl font-bold text-slate-800 leading-tight">{totalPurchases}</p>
            </div>
            <div className="flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30 transition-transform group-hover:scale-110">
              <ShoppingCart className="h-4 w-4 sm:h-6 sm:w-6" />
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
        </div>

        <div className="group relative overflow-hidden rounded-xl bg-white p-3 shadow-lg shadow-emerald-500/10 ring-1 ring-slate-200/60 transition-all hover:shadow-xl hover:shadow-emerald-500/20 sm:rounded-2xl sm:p-4">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 opacity-60"></div>
          <div className="relative flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[9px] sm:text-xs font-semibold text-slate-500 leading-tight">Total Amount</p>
              <p className="mt-1 sm:mt-2 text-[10px] sm:text-2xl font-bold text-slate-800 leading-tight">
                <span className="text-[9px] sm:text-base text-slate-400 font-semibold mr-0.5">Rs</span>
                {totalAmount.toFixed(2)}
              </p>
            </div>
            <div className="flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center rounded-lg sm:rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30 transition-transform group-hover:scale-110">
              <IndianRupee className="h-4 w-4 sm:h-6 sm:w-6" />
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500"></div>
        </div>

      </div>

      <AddPurchasePopup
        showForm={showForm}
        editingId={editingId}
        loading={loading}
        isCashParty={isCashParty}
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

      <div className="mb-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
        <div className="border-b border-gray-200 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 px-6 py-5">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <div className="relative w-full lg:w-[22%] lg:min-w-[260px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search purchases..."
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
              <option value="">Purchase History - All Time</option>
              <option value="7d">Purchase History - 7 Days</option>
              <option value="30d">Purchase History - 30 Days</option>
              <option value="3m">Purchase History - 3 Months</option>
              <option value="6m">Purchase History - 6 Months</option>
              <option value="1y">Purchase History - 1 Year</option>
            </select>
            <button
              onClick={handleOpenForm}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-lg bg-slate-800 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-900"
            >
              + New Purchase
            </button>
          </div>
        </div>

      {loading && !showForm ? (
        <div className="px-6 py-10 text-center text-slate-500">Loading...</div>
      ) : purchases.length === 0 ? (
        <div className="rounded-[20px] border border-dashed border-slate-300 bg-white/80 px-6 py-10 text-center text-slate-500">
          No purchases found. Create your first purchase!
        </div>
      ) : (
          <div className="rounded-[20px] border border-slate-200 bg-[radial-gradient(circle_at_top_right,rgba(148,163,184,0.16),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(241,245,249,0.96)_100%)] p-3 shadow-[0_18px_36px_rgba(15,23,42,0.08)] sm:p-5">
          <div className="space-y-2.5 md:hidden">
            {purchases.map((purchase) => (
              <article
                key={purchase._id}
                className="overflow-hidden rounded-xl border border-slate-200/60 bg-white shadow-lg shadow-slate-200/40"
              >
                <div className="border-b border-slate-100 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-3.5 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/80">
                        {formatPurchaseNumber(purchase.purchaseNumber)}
                      </p>
                      <p className="mt-0.5 truncate text-xs font-semibold text-white">
                        {purchase.supplierInvoice || purchase.invoiceNo || purchase.invoiceNumber || 'No supplier invoice'}
                      </p>
                    </div>
                    <div className="rounded-lg bg-white/20 backdrop-blur-sm px-2.5 py-1.5 text-right">
                      <p className="text-[8px] font-semibold uppercase tracking-[0.1em] text-white/90">Total</p>
                      <p className="text-xs font-bold text-white">
                        Rs {Number(purchase.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 px-3.5 py-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 px-2.5 py-1.5 border border-slate-200/50">
                      <p className="text-[8px] font-semibold uppercase tracking-[0.1em] text-slate-500">Party</p>
                      <p className="mt-0.5 truncate text-xs font-medium text-slate-800">{resolveLeadgerNameById(purchase.party)}</p>
                    </div>
                    <div className="rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 px-2.5 py-1.5 border border-slate-200/50">
                      <p className="text-[8px] font-semibold uppercase tracking-[0.1em] text-slate-500">Date</p>
                      <p className="mt-0.5 text-xs font-medium text-slate-800">
                        {new Date(purchase.purchaseDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 px-2.5 py-2 border border-blue-100/50">
                    <p className="text-[8px] font-semibold uppercase tracking-[0.1em] text-slate-500">Items</p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {purchase.items?.length ? (
                        <>
                          {purchase.items.slice(0, 2).map((item, index) => (
                            <span
                              key={`${purchase._id}-item-${index}`}
                              className="rounded-full border border-blue-200 bg-white px-2 py-0.5 text-[10px] font-medium text-blue-700"
                            >
                              {item.productName}
                            </span>
                          ))}
                          {purchase.items.length > 2 && (
                            <span className="self-center text-[9px] font-medium text-slate-500">
                              +{purchase.items.length - 2} more
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-[10px] italic text-slate-400">No items</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    {purchase.invoiceLink ? (
                      <a
                        href={purchase.invoiceLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[10px] font-semibold text-blue-700 transition hover:bg-blue-100"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Invoice
                      </a>
                    ) : (
                      <span className="text-[10px] text-slate-400">No invoice</span>
                    )}

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleEdit(purchase)}
                        className="inline-flex items-center justify-center rounded-lg border border-blue-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-blue-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(purchase._id)}
                        className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-red-700 shadow-sm transition hover:border-red-300 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[980px] border-separate border-spacing-0 text-left text-sm whitespace-nowrap">
              <thead className="bg-[linear-gradient(135deg,#0f766e_0%,#0d9488_38%,#0891b2_72%,#0284c7_100%)] text-white">
                <tr>
                  <th className="border-y-2 border-l-2 border-r border-black px-4 py-3.5 text-center text-sm font-semibold">Purchase No</th>
                  <th className="border-y-2 border-r border-black px-4 py-3.5 text-center text-sm font-semibold">Supplier Invoice No.</th>
                  <th className="border-y-2 border-r border-black px-4 py-3.5 text-center text-sm font-semibold">Manage Party</th>
                  <th className="border-y-2 border-r border-black px-4 py-3.5 text-sm font-semibold">Products</th>
                  <th className="border-y-2 border-r border-black px-4 py-3.5 text-center text-sm font-semibold">Date</th>
                  <th className="border-y-2 border-r border-black px-4 py-3.5 text-center text-sm font-semibold">Invoice File</th>
                  <th className="border-y-2 border-r border-black px-4 py-3.5 text-center text-sm font-semibold">Total</th>
                  <th className="border-y-2 border-r-2 border-black px-4 py-3.5 text-center text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(248,250,252,0.98)_100%)] text-slate-600">
                {purchases.map((purchase) => {
                  return (
                    <tr key={purchase._id} className="transition-colors duration-150 hover:bg-slate-200/45">
                      <td className="border border-slate-400 px-4 py-3 text-center font-semibold text-slate-800">{formatPurchaseNumber(purchase.purchaseNumber)}</td>
                      <td className="border border-slate-400 px-4 py-3 text-center font-semibold text-slate-800">{purchase.supplierInvoice || purchase.invoiceNo || purchase.invoiceNumber || '-'}</td>
                      <td className="border border-slate-400 px-4 py-3 text-center font-medium text-slate-700">{resolveLeadgerNameById(purchase.party)}</td>
                      <td className="border border-slate-400 px-4 py-3 text-slate-600">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {purchase.items?.length
                            ? (
                              <>
                                <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-xs font-medium border border-blue-100">
                                  {purchase.items[0]?.productName}
                                </span>
                                {purchase.items.length > 1 && (
                                  <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-xs font-medium border border-blue-100">
                                    {purchase.items[1]?.productName}
                                  </span>
                                )}
                                {purchase.items.length > 2 && (
                                  <span className="text-xs font-medium text-slate-500 ml-1">
                                    +{purchase.items.length - 2} more
                                  </span>
                                )}
                              </>
                            )
                            : <span className="text-slate-400 italic">No items</span>}
                        </div>
                      </td>
                      <td className="border border-slate-400 px-4 py-3 text-center text-slate-600">{new Date(purchase.purchaseDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                      <td className="border border-slate-400 px-4 py-3 text-center">
                        {purchase.invoiceLink ? (
                          <a
                            href={purchase.invoiceLink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors font-medium text-xs"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            View
                          </a>
                        ) : <span className="text-slate-400">-</span>}
                      </td>
                      <td className="border border-slate-400 px-4 py-3 text-center font-semibold text-emerald-600">
                        Rs {Number(purchase.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="border border-slate-400 px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(purchase)}
                          className="inline-flex items-center justify-center rounded-md border border-blue-200 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(purchase._id)}
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

