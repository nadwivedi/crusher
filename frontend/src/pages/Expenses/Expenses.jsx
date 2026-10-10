import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, ChevronDown, Inbox, Pencil, Plus, Receipt, Search, Trash2, Wallet } from 'lucide-react';
import { toast } from 'react-toastify';
import apiClient from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useFloatingDropdownPosition } from '../../utils/useFloatingDropdownPosition';
import useAccounts from '../../utils/useAccounts';
import CustomRangePopup, { CustomRangeButton } from '../../components/CustomRangePopup';
import MonthPickerPopup, { MonthRangeButton, getMonthRange } from '../../components/MonthPickerPopup';
import FormSection from '../../components/FormSection';
import StatCard from '../../components/StatCard';
import OptionList from '../../components/OptionList';
import AddExpensePopup from './component/AddExpensePopup';
import AddExpenseTypePopup from './component/AddExpenseTypePopup';

const TOAST_OPTIONS = { autoClose: 1200 };

// The backend keeps one default "Cash" party per account; it is preselected for new expenses.
const CASH_PARTY = { name: 'Cash' };
const findCashParty = (partyList) => partyList.find((party) => (
  party.type === 'cash-in-hand' && String(party.name || '').trim().toLowerCase() === CASH_PARTY.name.toLowerCase()
)) || null;

const getInitialForm = () => ({
  expenseGroup: '',
  party: '',
  amount: '',
  paymentAmount: '',
  account: '',
  expenseDate: new Date().toISOString().split('T')[0],
  notes: ''
});

const getInitialGoodsItem = () => ({
  quantity: '',
  unitPrice: ''
});

// A goods expense splits its amount across item categories; others use their single category.
const getExpenseCategoryAmounts = (expense) => {
  const items = Array.isArray(expense?.items) ? expense.items : [];
  if (items.length > 0) {
    return items.map((item) => ({
      name: String(item.expenseGroup?.name || item.expenseGroupName || 'Other').trim() || 'Other',
      amount: Number(item.total || 0),
      quantity: Number(item.quantity || 0),
      unit: String(item.unit || item.expenseGroup?.unit || '').trim()
    }));
  }
  return [{
    name: String(expense?.expenseGroup?.name || 'Uncategorised').trim() || 'Uncategorised',
    amount: Number(expense?.amount || 0),
    quantity: 0,
    unit: ''
  }];
};

// e.g. "250 L" for one item, "Diesel: 250 L, Oil: 5 L" for several; '' when nothing has a quantity.
const getExpenseQtyLabel = (expense) => {
  const items = (Array.isArray(expense?.items) ? expense.items : []).filter((item) => Number(item.quantity) > 0);
  const parts = items.map((item) => {
    const unit = String(item.unit || item.expenseGroup?.unit || '').trim();
    const qty = `${Number(item.quantity).toLocaleString('en-IN', { maximumFractionDigits: 2 })}${unit ? ` ${unit}` : ''}`;
    const name = String(item.expenseGroup?.name || item.expenseGroupName || '').trim();
    return items.length > 1 && name ? `${name}: ${qty}` : qty;
  });
  return parts.join(', ');
};

// Older records have no paidAmount and were fully paid.
const getExpensePaidAmount = (expense) => {
  const amount = Number(expense?.amount || 0);
  const paid = expense?.paidAmount === null || expense?.paidAmount === undefined ? amount : Number(expense.paidAmount);
  return Math.min(amount, Math.max(0, Number.isFinite(paid) ? paid : amount));
};

const formatCurrency = (value) => `Rs ${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

const formatDate = (value) => (
  value
    ? new Date(value).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
    : '-'
);

const formatDateForInput = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const EXPENSE_RANGE_OPTIONS = [
  { value: '3d', label: 'Last 3 Days' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
  { value: 'currentYear', label: 'Current Year' },
  { value: 'month', label: 'Month Wise' },
  { value: 'lifetime', label: 'Lifetime' },
  { value: 'custom', label: 'Custom Range' }
];

const isWithinRange = (value, range, customFrom = '', customTo = '', monthValue = '', yearValue = '') => {
  if (range === 'month') {
    const bounds = getMonthRange(monthValue, yearValue);
    return isWithinRange(value, 'custom', bounds.from, bounds.to);
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  if (range === 'custom') {
    const from = customFrom ? new Date(`${customFrom}T00:00:00`) : null;
    const to = customTo ? new Date(`${customTo}T23:59:59.999`) : null;
    if (from && !Number.isNaN(from.getTime()) && date < from) return false;
    if (to && !Number.isNaN(to.getTime()) && date > to) return false;
    return true;
  }

  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const start = new Date(today);
  start.setHours(0, 0, 0, 0);

  if (range === '3d') {
    start.setDate(today.getDate() - 2);
    return date >= start && date <= today;
  }

  if (range === '7d') {
    start.setDate(today.getDate() - 6);
    return date >= start && date <= today;
  }

  if (range === '30d') {
    start.setDate(today.getDate() - 29);
    return date >= start && date <= today;
  }

  if (range === '90d') {
    start.setDate(today.getDate() - 89);
    return date >= start && date <= today;
  }

  if (range === 'currentYear') {
    const yearStart = new Date(today.getFullYear(), 0, 1);
    yearStart.setHours(0, 0, 0, 0);
    return date >= yearStart && date <= today;
  }

  return true;
};

const getMethodBadgeClass = (method) => {
  const normalized = String(method || '').toLowerCase();
  if (normalized === 'cash') return 'badge-green';
  if (normalized === 'bank' || normalized === 'upi') return 'badge-blue';
  if (normalized === 'card') return 'badge-orange';
  if (normalized === 'credit') return 'badge-red';
  return 'badge-gray';
};

const TH = 'tbl-head px-3 py-2 first:pl-5 last:pr-5';
const TD = 'tbl-cell px-3 py-2.5 first:pl-5 last:pr-5';

// "₹12,500" or "−₹800" for an overdrawn account
const formatAccountBalance = (value) => `${value < 0 ? '−' : ''}₹${Math.abs(Number(value || 0)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export default function Expenses({ modalOnly = false, onModalFinish = null }) {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState([]);
  const [expenseGroups, setExpenseGroups] = useState([]);
  const [parties, setParties] = useState([]);
  const [formData, setFormData] = useState(getInitialForm());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const { user } = useAuth();
  // The "Paid From" list: one option per cash / bank account, Cash Account by default
  const { accounts, defaultAccountId } = useAccounts();
  const accountOptions = useMemo(
    () => accounts.map((account) => ({ value: String(account._id), label: account.name, type: account.type === 'cash' ? 'Cash' : 'Bank' })),
    [accounts]
  );
  // Current balance of each cash / bank account, loaded when the form opens
  const [accountBalances, setAccountBalances] = useState({});
  const defaultAccountLabel = accountOptions.find((option) => option.value === String(defaultAccountId))?.label || 'Cash Account';
  const canManageExpenses = user?.role !== 'employee' && (user?.role === 'owner' || user?.permissions?.edit);
  const [editingId, setEditingId] = useState(null);
  const [tableRange, setTableRange] = useState('lifetime');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth()));
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const rangeBeforeCustomRef = useRef('lifetime');
  const [showForm, setShowForm] = useState(false);
  const [expenseEntryType, setExpenseEntryType] = useState('');
  const [showTypePopup, setShowTypePopup] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeDescription, setNewTypeDescription] = useState('');
  const [typePopupLoading, setTypePopupLoading] = useState(false);
  const [typePopupError, setTypePopupError] = useState('');
  const expenseGroupInputRef = useRef(null);
  const partyInputRef = useRef(null);
  const methodInputRef = useRef(null);
  const goodsQuantityInputRef = useRef(null);
  const goodsUnitPriceInputRef = useRef(null);
  const expenseGroupSectionRef = useRef(null);
  const partySectionRef = useRef(null);
  const methodSectionRef = useRef(null);
  const [expenseGroupQuery, setExpenseGroupQuery] = useState('');
  const [partyQuery, setPartyQuery] = useState(CASH_PARTY.name);
  const [methodQuery, setMethodQuery] = useState('Cash Account');
  const [expenseGroupListIndex, setExpenseGroupListIndex] = useState(-1);
  const [partyListIndex, setPartyListIndex] = useState(-1);
  const [methodListIndex, setMethodListIndex] = useState(0);
  const [isExpenseGroupSectionActive, setIsExpenseGroupSectionActive] = useState(false);
  const [isPartySectionActive, setIsPartySectionActive] = useState(false);
  const [isMethodSectionActive, setIsMethodSectionActive] = useState(false);
  const [goodsItem, setGoodsItem] = useState(getInitialGoodsItem());
  const [goodsItems, setGoodsItems] = useState([]);
  const cashPartyId = findCashParty(parties)?._id || '';

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleRangeChange = (value) => {
    if (value === 'month') {
      if (tableRange !== 'month') rangeBeforeCustomRef.current = tableRange;
      setTableRange('month');
      setShowMonthPicker(true);
      return;
    }
    if (value === 'custom') {
      if (tableRange !== 'custom') rangeBeforeCustomRef.current = tableRange;
      setTableRange('custom');
      setShowCustomPicker(true);
      return;
    }
    rangeBeforeCustomRef.current = value;
    setTableRange(value);
  };

  const closeMonthPicker = () => {
    setShowMonthPicker(false);
    // Cancelled straight after choosing "Month Wise": go back to the previous range.
    if (rangeBeforeCustomRef.current !== 'month') setTableRange(rangeBeforeCustomRef.current);
  };

  const applyMonth = (month, year) => {
    setSelectedMonth(month);
    setSelectedYear(year);
    rangeBeforeCustomRef.current = 'month';
    setShowMonthPicker(false);
  };

  const closeCustomPicker = () => {
    setShowCustomPicker(false);
    // Cancelled straight after choosing "Custom Range": go back to the previous range.
    if (rangeBeforeCustomRef.current !== 'custom') setTableRange(rangeBeforeCustomRef.current);
  };

  const applyCustomRange = (from, to) => {
    setCustomFrom(from);
    setCustomTo(to);
    rangeBeforeCustomRef.current = 'custom';
    setShowCustomPicker(false);
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !showForm && !showCustomPicker && !showMonthPicker) {
        navigate('/');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, showForm, showCustomPicker, showMonthPicker]);

  useEffect(() => {
    fetchExpenseGroups();
    fetchParties();
  }, []);

  useEffect(() => {
    if (!showForm) return;

    const timer = setTimeout(() => {
      expenseGroupInputRef.current?.focus();
    }, 0);

    return () => clearTimeout(timer);
  }, [showForm]);

  useEffect(() => {
    if (!showForm) return;

    apiClient.get('/banks/summary')
      .then((summary) => {
        setAccountBalances(Object.fromEntries((summary?.accounts || []).map((account) => [String(account._id), Number(account.currentBalance || 0)])));
      })
      .catch((err) => console.error('Error fetching account balances:', err));
  }, [showForm]);

  useEffect(() => {
    if (!showForm || !cashPartyId) return;
    setFormData((prev) => (prev.party ? prev : { ...prev, party: cashPartyId }));
    setPartyQuery((prev) => prev || CASH_PARTY.name);
  }, [showForm, cashPartyId]);

  useEffect(() => {
    if (!modalOnly || showForm) return;
    handleOpenForm();
  }, [modalOnly, showForm]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/expenses');
      setExpenses(response.data || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Error fetching expenses');
    } finally {
      setLoading(false);
    }
  };

  const fetchExpenseGroups = async () => {
    try {
      const response = await apiClient.get('/expense-types');
      setExpenseGroups(response.data || []);
    } catch (err) {
      console.error('Error fetching expense types:', err);
    }
  };

  const fetchParties = async () => {
    try {
      const response = await apiClient.get('/parties');
      const partyList = Array.isArray(response) ? response : (response?.data || []);
      setParties(partyList);
    } catch (err) {
      console.error('Error fetching parties:', err);
    }
  };

  const getTableFieldClass = (tone = 'emerald') => {
    const focusTone = tone === 'emerald'
      ? 'focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200'
      : 'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200';
    return `block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-bold text-gray-900 transition-all placeholder:font-normal placeholder:text-gray-400 focus:outline-none ${focusTone}`;
  };

  const normalizeText = (value) => String(value || '').trim().toLowerCase();

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

  const selectedExpenseGroupName = useMemo(() => {
    const selectedGroup = expenseGroups.find(
      (group) => String(group._id || '') === String(formData.expenseGroup || '')
    );
    return selectedGroup?.name || '';
  }, [expenseGroups, formData.expenseGroup]);

  const selectedExpenseGroup = useMemo(
    () => expenseGroups.find((group) => String(group._id || '') === String(formData.expenseGroup || '')) || null,
    [expenseGroups, formData.expenseGroup]
  );

  const serviceExpenseGroups = useMemo(
    () => expenseGroups.filter((group) => String(group.type || '').toLowerCase() === 'services'),
    [expenseGroups]
  );
  const goodsExpenseGroups = useMemo(
    () => expenseGroups.filter((group) => String(group.type || '').toLowerCase() === 'goods'),
    [expenseGroups]
  );
  const isGoodsSelection = String(selectedExpenseGroup?.type || '').toLowerCase() === 'goods';
  const isGoodsExpense = expenseEntryType === 'purchase';
  const selectedPartyRecord = parties.find((party) => String(party._id || '') === String(formData.party || ''));
  const isCashExpense = !formData.party || selectedPartyRecord?.type === 'cash-in-hand';
  const expenseTotalAmount = Math.max(0, Number(formData.amount || 0));
  const expensePaidAmount = Math.max(0, Number(formData.paymentAmount || 0));
  const expenseBalanceAmount = Math.max(0, expenseTotalAmount - expensePaidAmount);

  // What the picked account will hold once this expense is saved
  const paidFromAccountId = String(formData.account || defaultAccountId || '');
  const paidNowAmount = isCashExpense ? expenseTotalAmount : Math.min(expensePaidAmount, expenseTotalAmount);
  const editingExpense = editingId ? expenses.find((expense) => expense._id === editingId) : null;
  // While editing, the balance already has this expense's old payment taken out of its old account
  const alreadyPaidFromAccount = editingExpense && String(editingExpense.account?._id || editingExpense.account || defaultAccountId || '') === paidFromAccountId
    ? Number(editingExpense.paidAmount ?? editingExpense.amount ?? 0)
    : 0;
  const paidFromBalance = accountBalances[paidFromAccountId];
  const paidFromBalanceAfter = paidFromBalance === undefined ? null : paidFromBalance + alreadyPaidFromAccount - paidNowAmount;
  const goodsItemUnit = String(selectedExpenseGroup?.unit || '').trim() || '-';
  const goodsQuantity = Number(goodsItem.quantity || 0);
  const goodsUnitPrice = Number(goodsItem.unitPrice || 0);
  const goodsDraftAmount = Math.max(0, goodsQuantity * goodsUnitPrice);
  const goodsAmount = goodsItems.reduce((sum, item) => sum + Number(item.total || 0), 0);

  const selectedPartyName = useMemo(() => {
    const selectedParty = parties.find(
      (party) => String(party._id || '') === String(formData.party || '')
    );
    return selectedParty?.name || '';
  }, [formData.party, parties]);

  const selectedMethodLabel = useMemo(() => {
    const selectedId = String(formData.account || defaultAccountId || '');
    return accountOptions.find((option) => option.value === selectedId)?.label || defaultAccountLabel;
  }, [accountOptions, defaultAccountId, defaultAccountLabel, formData.account]);

  const availableExpenseGroups = useMemo(() => {
    if (expenseEntryType === 'purchase' || goodsItems.length > 0) return goodsExpenseGroups;
    if (expenseEntryType === 'normal') return serviceExpenseGroups;
    return expenseGroups;
  }, [expenseEntryType, expenseGroups, goodsItems.length, goodsExpenseGroups, serviceExpenseGroups]);

  const getMatchingExpenseGroups = (queryValue) => {
    const normalized = normalizeText(queryValue);
    if (!normalized) return availableExpenseGroups;

    const startsWith = availableExpenseGroups.filter((group) => normalizeText(group.name).startsWith(normalized));
    const includes = availableExpenseGroups.filter((group) => (
      !normalizeText(group.name).startsWith(normalized)
      && normalizeText(group.name).includes(normalized)
    ));

    return [...startsWith, ...includes];
  };

  const getMatchingParties = (queryValue) => {
    const normalized = normalizeText(queryValue);
    if (!normalized) return parties;

    const startsWith = parties.filter((party) => normalizeText(party.name).startsWith(normalized));
    const includes = parties.filter((party) => (
      !normalizeText(party.name).startsWith(normalized)
      && normalizeText(party.name).includes(normalized)
    ));

    return [...startsWith, ...includes];
  };

  const filteredExpenseGroups = useMemo(
    () => getMatchingExpenseGroups(expenseGroupQuery),
    [expenseGroups, expenseGroupQuery]
  );

  const filteredParties = useMemo(
    () => getMatchingParties(partyQuery),
    [parties, partyQuery]
  );

  const expenseGroupOptions = useMemo(() => {
    const normalizedQuery = normalizeText(expenseGroupQuery);
    const normalizedSelectedName = normalizeText(selectedExpenseGroupName);

    if (
      isExpenseGroupSectionActive
      && normalizedQuery
      && normalizedQuery === normalizedSelectedName
    ) {
      return availableExpenseGroups;
    }

    return filteredExpenseGroups;
  }, [availableExpenseGroups, expenseGroupQuery, filteredExpenseGroups, isExpenseGroupSectionActive, selectedExpenseGroupName]);

  const partyOptions = useMemo(() => {
    const normalizedQuery = normalizeText(partyQuery);
    const normalizedSelectedName = normalizeText(selectedPartyName);

    if (
      isPartySectionActive
      && normalizedQuery
      && normalizedQuery === normalizedSelectedName
    ) {
      return parties;
    }

    return filteredParties;
  }, [filteredParties, isPartySectionActive, parties, partyQuery, selectedPartyName]);

  const filteredMethodOptions = useMemo(() => {
    const normalized = normalizeText(methodQuery);
    const normalizedSelectedMethod = normalizeText(selectedMethodLabel);

    if (
      isMethodSectionActive
      && normalized
      && normalized === normalizedSelectedMethod
    ) {
      return accountOptions;
    }

    if (!normalized) return accountOptions;

    const startsWith = accountOptions.filter((option) => normalizeText(option.label).startsWith(normalized));
    const includes = accountOptions.filter((option) => (
      !normalizeText(option.label).startsWith(normalized)
      && normalizeText(option.label).includes(normalized)
    ));

    return [...startsWith, ...includes];
  }, [accountOptions, isMethodSectionActive, methodQuery, selectedMethodLabel]);

  const expenseGroupDropdownStyle = useFloatingDropdownPosition(
    expenseGroupSectionRef,
    isExpenseGroupSectionActive,
    [expenseGroupOptions.length, expenseGroupListIndex]
  );

  const partyDropdownStyle = useFloatingDropdownPosition(
    partySectionRef,
    isPartySectionActive,
    [partyOptions.length, partyListIndex]
  );

  const methodDropdownStyle = useFloatingDropdownPosition(
    methodSectionRef,
    isMethodSectionActive,
    [filteredMethodOptions.length, methodListIndex],
    'down',
    'viewport'
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Credit expense: Enter on Total Amount moves to Paid Amount; Enter there saves (form submit).
  const handleAmountKeyDown = (event) => {
    if (event.key !== 'Enter' || event.shiftKey || isCashExpense) return;
    event.preventDefault();
    event.stopPropagation();
    focusNextPopupField(event.currentTarget);
  };

  const handleSelectEnterMoveNext = (event) => {
    if (event.key !== 'Enter' || event.shiftKey) return;
    event.preventDefault();
    event.stopPropagation();
    focusNextPopupField(event.currentTarget);
  };

  useEffect(() => {
    if (isGoodsExpense) {
      setFormData((prev) => ({ ...prev, amount: goodsAmount ? String(goodsAmount) : '' }));
      return;
    }

    setGoodsItem(getInitialGoodsItem());
    setGoodsItems([]);
  }, [goodsAmount, isGoodsExpense]);

  useEffect(() => {
    if (!showForm) return;

    if (expenseGroupOptions.length === 0) {
      setExpenseGroupListIndex(-1);
      return;
    }

    setExpenseGroupListIndex((prev) => {
      if (prev < 0) return isExpenseGroupSectionActive ? 0 : -1;
      if (prev >= expenseGroupOptions.length) return expenseGroupOptions.length - 1;
      return prev;
    });
  }, [expenseGroupOptions, isExpenseGroupSectionActive, showForm]);

  useEffect(() => {
    if (!showForm) return;

    if (partyOptions.length === 0) {
      setPartyListIndex(-1);
      return;
    }

    setPartyListIndex((prev) => {
      if (prev < 0) return isPartySectionActive ? 0 : -1;
      if (prev >= partyOptions.length) return partyOptions.length - 1;
      return prev;
    });
  }, [isPartySectionActive, partyOptions, showForm]);

  useEffect(() => {
    if (!showForm) {
      setMethodQuery(selectedMethodLabel);
      setMethodListIndex(0);
      setIsMethodSectionActive(false);
      return;
    }

    const selectedIndex = filteredMethodOptions.findIndex(
      (option) => option.label === selectedMethodLabel
    );
    setMethodListIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [filteredMethodOptions, selectedMethodLabel, showForm]);

  const findExactExpenseGroup = (value) => {
    const normalized = normalizeText(value);
    if (!normalized) return null;
    return expenseGroups.find((group) => normalizeText(group.name) === normalized) || null;
  };

  const findBestExpenseGroupMatch = (value) => {
    const normalized = normalizeText(value);
    if (!normalized) return null;
    return expenseGroups.find((group) => normalizeText(group.name).startsWith(normalized))
      || expenseGroups.find((group) => normalizeText(group.name).includes(normalized))
      || null;
  };

  const findExactParty = (value) => {
    const normalized = normalizeText(value);
    if (!normalized) return null;
    return parties.find((party) => normalizeText(party.name) === normalized) || null;
  };

  const findBestPartyMatch = (value) => {
    const normalized = normalizeText(value);
    if (!normalized) return null;
    return parties.find((party) => normalizeText(party.name).startsWith(normalized))
      || parties.find((party) => normalizeText(party.name).includes(normalized))
      || null;
  };

  const findExactMethod = (value) => {
    const normalized = normalizeText(value);
    if (!normalized) return null;
    return accountOptions.find((option) => normalizeText(option.label) === normalized) || null;
  };

  const selectExpenseGroup = (group) => {
    if (!group) {
      setExpenseGroupQuery('');
      setFormData((prev) => ({ ...prev, expenseGroup: '' }));
      setExpenseGroupListIndex(-1);
      return;
    }

    setExpenseGroupQuery(group.name);
    setFormData((prev) => ({ ...prev, expenseGroup: group._id }));
    const selectedIndex = getMatchingExpenseGroups(group.name).findIndex((item) => String(item._id) === String(group._id));
    setExpenseGroupListIndex(selectedIndex >= 0 ? selectedIndex : 0);
  };

  const selectParty = (party) => {
    if (!party) {
      setPartyQuery('');
      setFormData((prev) => ({ ...prev, party: '' }));
      setPartyListIndex(-1);
      return;
    }

    setPartyQuery(party.name);
    setFormData((prev) => ({ ...prev, party: party._id }));
    const selectedIndex = getMatchingParties(party.name).findIndex((item) => String(item._id) === String(party._id));
    setPartyListIndex(selectedIndex >= 0 ? selectedIndex : 0);
  };

  const selectMethod = (option) => {
    if (!option) return;

    setMethodQuery(option.label);
    setFormData((prev) => ({ ...prev, account: option.value }));
    setMethodListIndex(
      Math.max(filteredMethodOptions.findIndex((item) => item.value === option.value), 0)
    );
    setIsMethodSectionActive(false);
  };

  const handleExpenseGroupInputChange = (event) => {
    const value = event.target.value;
    setExpenseGroupQuery(value);

    if (!normalizeText(value)) {
      selectExpenseGroup(null);
      return;
    }

    const exactGroup = findExactExpenseGroup(value);
    if (exactGroup) {
      setFormData((prev) => ({ ...prev, expenseGroup: exactGroup._id }));
      const exactIndex = getMatchingExpenseGroups(value).findIndex((item) => String(item._id) === String(exactGroup._id));
      setExpenseGroupListIndex(exactIndex >= 0 ? exactIndex : 0);
      return;
    }

    const matches = getMatchingExpenseGroups(value);
    const firstMatch = matches[0] || null;
    setFormData((prev) => ({ ...prev, expenseGroup: firstMatch?._id || '' }));
    setExpenseGroupListIndex(firstMatch ? 0 : -1);
  };

  const handlePartyInputChange = (event) => {
    const value = event.target.value;
    setPartyQuery(value);

    if (!normalizeText(value)) {
      selectParty(null);
      return;
    }

    const exactParty = findExactParty(value);
    if (exactParty) {
      setFormData((prev) => ({ ...prev, party: exactParty._id }));
      const exactIndex = getMatchingParties(value).findIndex((item) => String(item._id) === String(exactParty._id));
      setPartyListIndex(exactIndex >= 0 ? exactIndex : 0);
      return;
    }

    const matches = getMatchingParties(value);
    const firstMatch = matches[0] || null;
    setFormData((prev) => ({ ...prev, party: firstMatch?._id || '' }));
    setPartyListIndex(firstMatch ? 0 : -1);
  };

  // Paid From behaves like a dropdown: focusing it shows every account, typing narrows the list
  const handleMethodFocus = (event) => {
    setIsMethodSectionActive(true);
    event.target.select?.();
  };

  const handleMethodInputChange = (event) => {
    const value = event.target.value;
    setMethodQuery(value);
    setIsMethodSectionActive(true);

    const exactMatch = findExactMethod(value);
    if (exactMatch) {
      setFormData((prev) => ({ ...prev, account: exactMatch.value }));
    }
  };

  const openTypePopup = () => {
    setNewTypeName(String(expenseGroupQuery || '').trim());
    setNewTypeDescription('');
    setTypePopupError('');
    setIsExpenseGroupSectionActive(false);
    setShowTypePopup(true);
  };

  const closeTypePopup = () => {
    setShowTypePopup(false);
    requestAnimationFrame(() => expenseGroupInputRef.current?.focus());
  };

  const handleCreateExpenseType = async () => {
    const name = newTypeName.trim();
    if (!name) {
      setTypePopupError('Expense type name is required');
      return;
    }

    try {
      setTypePopupLoading(true);
      setTypePopupError('');
      const response = await apiClient.post('/expense-types', {
        name,
        description: newTypeDescription.trim(),
        type: 'services'
      });
      const created = response?.data;
      if (created?._id) {
        setExpenseGroups((prev) => [...prev, created]);
        selectExpenseGroup(created);
      }
      toast.success('Expense type created', TOAST_OPTIONS);
      setShowTypePopup(false);
      requestAnimationFrame(() => focusNextPopupField(expenseGroupInputRef.current));
    } catch (err) {
      setTypePopupError(err.message || 'Error creating expense type');
    } finally {
      setTypePopupLoading(false);
    }
  };

  const handleExpenseGroupInputKeyDown = (event) => {
    const key = event.key?.toLowerCase();

    if (key === 'control' && !event.altKey && !event.metaKey) {
      event.preventDefault();
      event.stopPropagation();
      openTypePopup();
      return;
    }

    if (key === 'arrowdown') {
      event.preventDefault();
      event.stopPropagation();
      setIsExpenseGroupSectionActive(true);
      if (expenseGroupOptions.length === 0) return;
      setExpenseGroupListIndex((prev) => {
        if (prev < 0) return 0;
        return Math.min(prev + 1, expenseGroupOptions.length - 1);
      });
      return;
    }

    if (key === 'arrowup') {
      event.preventDefault();
      event.stopPropagation();
      setIsExpenseGroupSectionActive(true);
      if (expenseGroupOptions.length === 0) return;
      setExpenseGroupListIndex((prev) => {
        if (prev < 0) return 0;
        return Math.max(prev - 1, 0);
      });
      return;
    }

    if (key === 'enter') {
      event.preventDefault();
      event.stopPropagation();

      const activeGroup = expenseGroupListIndex >= 0 ? expenseGroupOptions[expenseGroupListIndex] : null;
      const matchedGroup = activeGroup || findExactExpenseGroup(expenseGroupQuery) || findBestExpenseGroupMatch(expenseGroupQuery);
      if (matchedGroup) {
        selectExpenseGroup(matchedGroup);
      }
      setIsExpenseGroupSectionActive(false);
      if (isGoodsExpense && matchedGroup) {
        requestAnimationFrame(() => {
          goodsQuantityInputRef.current?.focus();
          goodsQuantityInputRef.current?.select?.();
        });
        return;
      }

      focusNextPopupField(event.currentTarget);
    }
  };

  const handlePartyInputKeyDown = (event) => {
    const key = event.key?.toLowerCase();

    if (key === 'arrowdown') {
      event.preventDefault();
      event.stopPropagation();
      setIsPartySectionActive(true);
      if (partyOptions.length === 0) return;
      setPartyListIndex((prev) => {
        if (prev < 0) return 0;
        return Math.min(prev + 1, partyOptions.length - 1);
      });
      return;
    }

    if (key === 'arrowup') {
      event.preventDefault();
      event.stopPropagation();
      setIsPartySectionActive(true);
      if (partyOptions.length === 0) return;
      setPartyListIndex((prev) => {
        if (prev < 0) return 0;
        return Math.max(prev - 1, 0);
      });
      return;
    }

    if (key === 'enter') {
      event.preventDefault();
      event.stopPropagation();

      const activeParty = partyListIndex >= 0 ? partyOptions[partyListIndex] : null;
      const matchedParty = activeParty || findExactParty(partyQuery) || findBestPartyMatch(partyQuery);
      if (matchedParty) {
        selectParty(matchedParty);
      }
      setIsPartySectionActive(false);
      focusNextPopupField(event.currentTarget);
    }
  };

  const handleMethodInputKeyDown = (event) => {
    const key = event.key?.toLowerCase();

    if (key === 'arrowdown') {
      event.preventDefault();
      event.stopPropagation();
      setIsMethodSectionActive(true);
      if (filteredMethodOptions.length === 0) return;
      setMethodListIndex((prev) => {
        if (prev < 0) return 0;
        return Math.min(prev + 1, filteredMethodOptions.length - 1);
      });
      return;
    }

    if (key === 'arrowup') {
      event.preventDefault();
      event.stopPropagation();
      setIsMethodSectionActive(true);
      if (filteredMethodOptions.length === 0) return;
      setMethodListIndex((prev) => {
        if (prev < 0) return 0;
        return Math.max(prev - 1, 0);
      });
      return;
    }

    if (key === 'escape' && isMethodSectionActive) {
      event.preventDefault();
      event.stopPropagation();
      setMethodQuery(selectedMethodLabel);
      setIsMethodSectionActive(false);
      return;
    }

    if (key === 'enter') {
      event.preventDefault();
      event.stopPropagation();

      if (!isMethodSectionActive) {
        setIsMethodSectionActive(true);
        return;
      }

      const activeOption = methodListIndex >= 0 ? filteredMethodOptions[methodListIndex] : null;
      const exactMatch = findExactMethod(methodQuery);
      const matchedOption = activeOption || exactMatch || filteredMethodOptions[0] || accountOptions[0];
      if (matchedOption) {
        selectMethod(matchedOption);
      }
      focusNextPopupField(event.currentTarget);
    }
  };

  const handlePartyFocus = () => {
    const selectedIndex = partyOptions.findIndex(
      (party) => String(party?._id || '') === String(formData.party || '')
    );
    setIsExpenseGroupSectionActive(false);
    setIsMethodSectionActive(false);
    setIsPartySectionActive(true);
    setPartyListIndex(selectedIndex >= 0 ? selectedIndex : (partyOptions.length > 0 ? 0 : -1));
  };

  const handleExpenseGroupFocus = () => {
    const selectedIndex = expenseGroupOptions.findIndex(
      (group) => String(group?._id || '') === String(formData.expenseGroup || '')
    );
    setIsPartySectionActive(false);
    setIsMethodSectionActive(false);
    setIsExpenseGroupSectionActive(true);
    setExpenseGroupListIndex(selectedIndex >= 0 ? selectedIndex : (expenseGroupOptions.length > 0 ? 0 : -1));
  };

  const handleGoodsExpenseGroupFocus = () => {
    const selectedIndex = expenseGroupOptions.findIndex(
      (group) => String(group?._id || '') === String(formData.expenseGroup || '')
    );
    setIsPartySectionActive(false);
    setIsMethodSectionActive(false);
    setIsExpenseGroupSectionActive(true);
    setExpenseGroupListIndex(selectedIndex >= 0 ? selectedIndex : (expenseGroupOptions.length > 0 ? 0 : -1));
  };

  const handleOpenForm = () => {
    setEditingId(null);
    setFormData(getInitialForm());
    setGoodsItem(getInitialGoodsItem());
    setGoodsItems([]);
    setExpenseEntryType('normal');
    setExpenseGroupQuery('');
    setExpenseGroupListIndex(-1);
    setIsExpenseGroupSectionActive(false);
    setPartyQuery(CASH_PARTY.name);
    setPartyListIndex(-1);
    setIsPartySectionActive(false);
    setMethodQuery(defaultAccountLabel);
    setMethodListIndex(0);
    setIsMethodSectionActive(false);
    setError('');
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setEditingId(null);
    setShowForm(false);
    setFormData(getInitialForm());
    setGoodsItem(getInitialGoodsItem());
    setGoodsItems([]);
    setExpenseEntryType('');
    setExpenseGroupQuery('');
    setExpenseGroupListIndex(-1);
    setIsExpenseGroupSectionActive(false);
    setPartyQuery(CASH_PARTY.name);
    setPartyListIndex(-1);
    setIsPartySectionActive(false);
    setMethodQuery(defaultAccountLabel);
    setMethodListIndex(0);
    setIsMethodSectionActive(false);

    if (modalOnly && typeof onModalFinish === 'function') {
      onModalFinish();
    }
  };

  const handleEdit = (expense) => {
    // Entries saved before accounts existed have none and count under the default account
    const accountId = String(expense.account?._id || expense.account || defaultAccountId || '');
    setEditingId(expense._id);
    setExpenseEntryType('normal');
    setFormData({
      expenseGroup: expense.expenseGroup?._id || '',
      party: expense.party?._id || '',
      amount: String(expense.amount ?? ''),
      paymentAmount: String(expense.paidAmount ?? expense.amount ?? ''),
      account: accountId,
      expenseDate: formatDateForInput(expense.expenseDate),
      notes: expense.notes || ''
    });
    setExpenseGroupQuery(expense.expenseGroup?.name || '');
    setPartyQuery(expense.party?.name || CASH_PARTY.name);
    setMethodQuery(accountOptions.find((option) => option.value === accountId)?.label || defaultAccountLabel);
    setError('');
    setShowForm(true);
  };

  const handleDelete = async (expense) => {
    if (!window.confirm(`Delete expense ${expense.expenseNumber || ''}? This cannot be undone.`)) return;

    try {
      await apiClient.delete(`/expenses/${expense._id}`);
      toast.success('Expense deleted', TOAST_OPTIONS);
      fetchExpenses();
      fetchExpenseGroups();
    } catch (err) {
      setError(err.message || 'Error deleting expense');
    }
  };

  const renderExpenseActions = (expense, className = '') => {
    if (!canManageExpenses) return null;
    const isGoods = Array.isArray(expense.items) && expense.items.length > 0;

    return (
      <div className={`flex items-center justify-end ${className}`}>
        {!isGoods && (
          <button type="button" title="Edit" aria-label="Edit" className="icon-btn p-1.5 hover:bg-blue-50 hover:text-blue-600" onClick={() => handleEdit(expense)}>
            <Pencil size={16} />
          </button>
        )}
        <button type="button" title="Delete" aria-label="Delete" className="icon-btn p-1.5 hover:bg-rose-50 hover:text-rose-600" onClick={() => handleDelete(expense)}>
          <Trash2 size={16} />
        </button>
      </div>
    );
  };

  const buildCurrentGoodsItem = () => {
    if (!selectedExpenseGroup || !isGoodsSelection) return null;
    if (!Number.isFinite(goodsQuantity) || goodsQuantity <= 0) return null;
    if (!Number.isFinite(goodsUnitPrice) || goodsUnitPrice < 0) return null;

    return {
      expenseGroup: selectedExpenseGroup._id,
      expenseGroupName: selectedExpenseGroup.name,
      quantity: goodsQuantity,
      unit: goodsItemUnit,
      unitPrice: goodsUnitPrice,
      total: goodsDraftAmount,
    };
  };

  const handleAddGoodsItem = () => {
    const nextItem = buildCurrentGoodsItem();
    if (!nextItem) {
      setError('Select a goods expense group and enter valid quantity and price');
      return false;
    }

    setGoodsItems((prev) => [...prev, nextItem]);
    setGoodsItem(getInitialGoodsItem());
    setExpenseGroupQuery('');
    setFormData((prev) => ({ ...prev, expenseGroup: '' }));
    setExpenseGroupListIndex(-1);
    setIsExpenseGroupSectionActive(false);
    setError('');
    requestAnimationFrame(() => {
      expenseGroupInputRef.current?.focus();
      expenseGroupInputRef.current?.select?.();
    });
    return true;
  };

  const handleRemoveGoodsItem = (indexToRemove) => {
    setGoodsItems((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const purchaseExpenseCurrentItem = useMemo(() => ({
    product: formData.expenseGroup || '',
    productName: selectedExpenseGroup?.name || '',
    unit: goodsItemUnit,
    quantity: goodsItem.quantity,
    unitPrice: goodsItem.unitPrice,
  }), [formData.expenseGroup, goodsItem.quantity, goodsItem.unitPrice, goodsItemUnit, selectedExpenseGroup?.name]);

  const purchaseExpenseFormData = useMemo(() => ({
    ...formData,
    purchaseDate: formData.expenseDate,
    supplierInvoice: '',
    dueDate: '',
    invoiceLink: '',
    items: goodsItems.map((item) => ({
      product: item.expenseGroup,
      productName: item.expenseGroupName,
      unit: item.unit,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.total,
    })),
    totalAmount: goodsAmount,
  }), [formData, goodsAmount, goodsItems]);

  const setPurchaseExpenseCurrentItem = (updater) => {
    const nextItem = typeof updater === 'function' ? updater(purchaseExpenseCurrentItem) : updater;
    const nextGroupId = nextItem?.product || '';
    const matchedGroup = goodsExpenseGroups.find((group) => String(group._id) === String(nextGroupId));

    setFormData((prev) => ({
      ...prev,
      expenseGroup: nextGroupId,
    }));
    setExpenseGroupQuery(nextItem?.productName ?? matchedGroup?.name ?? '');
    setGoodsItem((prev) => ({
      ...prev,
      quantity: nextItem?.quantity ?? '',
      unitPrice: nextItem?.unitPrice ?? '',
    }));
  };

  const handlePurchaseExpenseInputChange = (event) => {
    const { name, value } = event.target;
    if (name === 'purchaseDate') {
      setFormData((prev) => ({ ...prev, expenseDate: value }));
      return;
    }

    if (name === 'paymentAmount') {
      setFormData((prev) => ({ ...prev, paymentAmount: value }));
      return;
    }

    handleChange(event);
  };

  const handleGoodsExpenseGroupInputKeyDown = (event, moveToPaymentSection) => {
    const key = event.key?.toLowerCase();
    const lastOptionIndex = expenseGroupOptions.length;

    if (key === 'arrowdown') {
      event.preventDefault();
      event.stopPropagation();
      setExpenseGroupListIndex((prev) => {
        if (prev < 0) return 0;
        return Math.min(prev + 1, lastOptionIndex);
      });
      return;
    }

    if (key === 'arrowup') {
      event.preventDefault();
      event.stopPropagation();
      setExpenseGroupListIndex((prev) => {
        if (prev < 0) return 0;
        return Math.max(prev - 1, 0);
      });
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();

      if (expenseGroupListIndex === lastOptionIndex) {
        setIsExpenseGroupSectionActive(false);
        moveToPaymentSection?.();
        return;
      }

      const activeGroup = expenseGroupListIndex >= 0 ? expenseGroupOptions[expenseGroupListIndex] : null;
      const matchedGroup = activeGroup || findExactExpenseGroup(expenseGroupQuery) || findBestExpenseGroupMatch(expenseGroupQuery);
      if (matchedGroup) {
        selectExpenseGroup(matchedGroup);
      }
      setIsExpenseGroupSectionActive(false);
      focusNextPopupField(event.currentTarget);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.expenseGroup && goodsItems.length === 0) {
      setError('Expense group is required');
      return;
    }

    let expenseItems = goodsItems;
    const pendingGoodsItem = buildCurrentGoodsItem();

    if (isGoodsExpense) {
      if (pendingGoodsItem) {
        expenseItems = [...goodsItems, pendingGoodsItem];
      } else if (selectedExpenseGroup && isGoodsSelection && (String(goodsItem.quantity || '').trim() || String(goodsItem.unitPrice || '').trim())) {
        setError('Complete the goods item row before saving');
        return;
      }
    }

    const resolvedAmount = isGoodsExpense
      ? expenseItems.reduce((sum, item) => sum + Number(item.total || 0), 0)
      : Number(formData.amount);

    if (!Number.isFinite(resolvedAmount) || resolvedAmount <= 0) {
      setError('Valid amount is required');
      return;
    }

    if (isGoodsExpense && expenseItems.length === 0) {
      setError('Add at least one goods item');
      return;
    }

    if (!isGoodsExpense && !isCashExpense && expensePaidAmount > resolvedAmount) {
      setError('Paid amount cannot be more than total amount');
      return;
    }

    try {
      setLoading(true);
      const paidFromAccountId = formData.account || defaultAccountId;
      const paidFromAccount = accounts.find((account) => String(account._id) === String(paidFromAccountId));
      const payload = {
        expenseGroup: isGoodsExpense ? expenseItems[0]?.expenseGroup : formData.expenseGroup,
        party: formData.party || null,
        amount: resolvedAmount,
        paidAmount: isGoodsExpense || isCashExpense ? resolvedAmount : expensePaidAmount,
        account: paidFromAccountId || null,
        // Older screens still read method: a cash account counts as cash, any other as bank
        method: paidFromAccount?.type === 'cash' || !paidFromAccount ? 'cash' : 'bank',
        expenseDate: formData.expenseDate ? new Date(formData.expenseDate) : new Date(),
        notes: formData.notes,
        items: isGoodsExpense
          ? expenseItems.map((item) => ({
            expenseGroup: item.expenseGroup,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
          }))
          : undefined
      };

      if (editingId) {
        await apiClient.put(`/expenses/${editingId}`, payload);
      } else {
        await apiClient.post('/expenses', payload);
      }

      setError('');
      toast.success(editingId ? 'Expense updated successfully' : 'Expense created successfully', TOAST_OPTIONS);
      handleCloseForm();
      fetchExpenses();
      fetchExpenseGroups();
    } catch (err) {
      setError(err.message || (editingId ? 'Error updating expense' : 'Error creating expense'));
    } finally {
      setLoading(false);
    }
  };


  const rangeExpenses = useMemo(() => {
    const normalizedSearch = String(search || '').trim().toLowerCase();

    return expenses.filter((item) => {
      if (!isWithinRange(item.expenseDate, tableRange, customFrom, customTo, selectedMonth, selectedYear)) return false;

      if (!normalizedSearch) return true;

      const haystack = [
        item.expenseNumber,
        item.expenseGroup?.name,
        item.party?.name,
        item.method,
        item.account?.name,
        item.notes,
        formatDate(item.expenseDate)
      ].join(' ').toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [expenses, search, tableRange, customFrom, customTo, selectedMonth, selectedYear]);

  // Category breakdown covers the whole selected period; clicking a row narrows the table to it.
  const categoryStats = useMemo(() => {
    const map = new Map();
    rangeExpenses.forEach((expense) => {
      const seenInExpense = new Set();
      getExpenseCategoryAmounts(expense).forEach(({ name, amount, quantity, unit }) => {
        const key = name.toLowerCase();
        const entry = map.get(key) || { key, name, count: 0, totalAmount: 0, totalQty: 0, unit: '' };
        if (!seenInExpense.has(key)) {
          entry.count += 1;
          seenInExpense.add(key);
        }
        entry.totalAmount += amount;
        if (quantity > 0) {
          entry.totalQty += quantity;
          if (!entry.unit) entry.unit = unit;
        }
        map.set(key, entry);
      });
    });
    return [...map.values()].sort((a, b) => b.totalAmount - a.totalAmount);
  }, [rangeExpenses]);

  // Drop a category filter that no longer exists in the selected period.
  useEffect(() => {
    if (categoryFilter && !categoryStats.some((item) => item.key === categoryFilter)) setCategoryFilter('');
  }, [categoryStats, categoryFilter]);

  const visibleExpenses = useMemo(() => {
    if (!categoryFilter) return rangeExpenses;
    return rangeExpenses.filter((expense) => (
      getExpenseCategoryAmounts(expense).some(({ name }) => name.toLowerCase() === categoryFilter)
    ));
  }, [rangeExpenses, categoryFilter]);

  const expenseSummary = useMemo(() => visibleExpenses.reduce((acc, expense) => {
    const amount = Number(expense.amount || 0);
    const paid = getExpensePaidAmount(expense);
    acc.total += amount;
    acc.cash += paid;
    acc.credit += amount - paid;
    return acc;
  }, { total: 0, cash: 0, credit: 0 }), [visibleExpenses]);

  const categoryGrandTotal = categoryStats.reduce((sum, row) => sum + row.totalAmount, 0);
  const showCategoryQty = categoryStats.some((item) => item.totalQty > 0);

  return (
    <div className="page-fade-in space-y-3.5 px-3 pb-6 pt-3.5 md:space-y-4 lg:px-6 lg:pt-4">
      {showMonthPicker && (
        <MonthPickerPopup
          month={selectedMonth}
          year={selectedYear}
          subtitle="Choose the year, then the month to view expenses"
          onApply={applyMonth}
          onClose={closeMonthPicker}
        />
      )}
      {showCustomPicker && (
        <CustomRangePopup from={customFrom} to={customTo} onApply={applyCustomRange} onClose={closeCustomPicker} />
      )}
      <AddExpenseTypePopup
        open={showTypePopup}
        name={newTypeName}
        description={newTypeDescription}
        loading={typePopupLoading}
        error={typePopupError}
        onNameChange={setNewTypeName}
        onDescriptionChange={setNewTypeDescription}
        onClose={closeTypePopup}
        onSubmit={handleCreateExpenseType}
      />

      {showForm && !isGoodsExpense && (
        <AddExpensePopup
          open={showForm}
          isEditing={Boolean(editingId)}
          onClose={handleCloseForm}
          onSubmit={handleSubmit}
          loading={loading}
          error={error}
        >
          <FormSection number={1} title="Expense Details" tone="blue">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
              <div className="sm:col-span-2">
                <label className="label" htmlFor="expense-date-input">Date</label>
                <input id="expense-date-input" className="input" type="date" name="expenseDate" value={formData.expenseDate} onChange={handleChange} />
              </div>

              <div className="sm:col-span-3">
                <label className="label" htmlFor="expense-type-input">Expense Type <span className="text-rose-500">*</span></label>
                <div
                  ref={expenseGroupSectionRef}
                  className="relative"
                  onBlurCapture={(event) => {
                    // Moving into the list itself keeps it open
                    if (expenseGroupSectionRef.current?.contains(event.relatedTarget)) return;
                    setIsExpenseGroupSectionActive(false);
                  }}
                >
                  <input
                    id="expense-type-input"
                    ref={expenseGroupInputRef}
                    className="input pr-10"
                    type="text"
                    value={expenseGroupQuery}
                    onFocus={handleExpenseGroupFocus}
                    onChange={handleExpenseGroupInputChange}
                    onKeyDown={handleExpenseGroupInputKeyDown}
                    placeholder="Type to search, e.g. Electricity"
                    autoComplete="off"
                    required
                  />
                  <ChevronDown className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-transform ${isExpenseGroupSectionActive ? 'rotate-180' : ''}`} />

                  {isExpenseGroupSectionActive && expenseGroupDropdownStyle && (
                    <OptionList
                      style={expenseGroupDropdownStyle}
                      options={expenseGroupOptions}
                      activeIndex={expenseGroupListIndex}
                      emptyText="No expense type found."
                      getKey={(group) => group._id}
                      getLabel={(group) => group.name}
                      isSelected={(group) => String(formData.expenseGroup || '') === String(group._id)}
                      onHover={setExpenseGroupListIndex}
                      onPick={(group) => {
                        selectExpenseGroup(group);
                        setIsExpenseGroupSectionActive(false);
                      }}
                      footer={(
                        <button
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={openTypePopup}
                          className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-left text-sm font-semibold text-primary-600 transition hover:bg-primary-50"
                        >
                          <Plus className="h-4 w-4" />
                          Add Expense Type
                          <kbd className="ml-auto rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">Ctrl</kbd>
                        </button>
                      )}
                    />
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="label" htmlFor="expense-party-input">Paid To <span className="font-normal text-slate-400">(Cash if not on credit)</span></label>
              <div
                ref={partySectionRef}
                className="relative"
                onBlurCapture={(event) => {
                  if (partySectionRef.current?.contains(event.relatedTarget)) return;
                  setIsPartySectionActive(false);
                }}
              >
                <input
                  id="expense-party-input"
                  ref={partyInputRef}
                  className="input pr-10"
                  type="text"
                  value={partyQuery}
                  onFocus={handlePartyFocus}
                  onClick={handlePartyFocus}
                  onChange={handlePartyInputChange}
                  onKeyDown={handlePartyInputKeyDown}
                  placeholder="Type to search party"
                  autoComplete="off"
                />
                <ChevronDown className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-transform ${isPartySectionActive ? 'rotate-180' : ''}`} />

                {isPartySectionActive && partyDropdownStyle && (
                  <OptionList
                    style={partyDropdownStyle}
                    options={partyOptions}
                    activeIndex={partyListIndex}
                    emptyText="No matching party found."
                    getKey={(party) => party._id}
                    getLabel={(party) => party.name}
                    getHint={(party) => party.mobile}
                    isSelected={(party) => String(formData.party || '') === String(party._id)}
                    onHover={setPartyListIndex}
                    onPick={(party) => {
                      selectParty(party);
                      setIsPartySectionActive(false);
                    }}
                  />
                )}
              </div>
            </div>
          </FormSection>

          <FormSection
            number={2}
            title="Amount & Payment"
            tone="emerald"
            hint={isCashExpense ? 'A cash expense is paid in full now.' : 'On credit: enter what you paid now. The rest stays payable to the party.'}
          >
            <div className={`grid grid-cols-1 gap-3 ${isCashExpense ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
              <div>
                <label className="label" htmlFor="expense-amount-input">{isCashExpense ? 'Amount' : 'Total Amount'} <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-semibold text-slate-400">₹</span>
                  <input id="expense-amount-input" className="input pl-7 font-semibold text-rose-700" type="number" name="amount" value={formData.amount} onChange={handleChange} onKeyDown={handleAmountKeyDown} step="0.01" placeholder="0" required />
                </div>
              </div>

              {!isCashExpense && (
                <>
                  <div>
                    <label className="label" htmlFor="expense-paid-input">Paid Now</label>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-semibold text-slate-400">₹</span>
                      <input id="expense-paid-input" className="input pl-7" type="number" name="paymentAmount" value={formData.paymentAmount} onChange={handleChange} min="0" max={expenseTotalAmount || undefined} step="0.01" placeholder="0" />
                    </div>
                  </div>
                  <div>
                    <p className="label">Balance</p>
                    <p className={`flex min-h-[2.5rem] items-center rounded-lg border px-3 text-sm font-bold ${expenseBalanceAmount > 0 ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                      ₹{expenseBalanceAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </>
              )}

              <div className={isCashExpense ? '' : 'sm:col-span-3'}>
                <label className="label" htmlFor="expense-account-input">Paid From</label>
                <div
                  ref={methodSectionRef}
                  className="relative"
                  onBlurCapture={(event) => {
                    if (methodSectionRef.current?.contains(event.relatedTarget)) return;
                    setIsMethodSectionActive(false);
                  }}
                >
                  <input id="expense-account-input" ref={methodInputRef} className="input pr-10" type="text" value={methodQuery} onFocus={handleMethodFocus} onClick={() => setIsMethodSectionActive(true)} onChange={handleMethodInputChange} onKeyDown={handleMethodInputKeyDown} placeholder="Cash or bank account" autoComplete="off" />
                  <ChevronDown className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-transform ${isMethodSectionActive ? 'rotate-180' : ''}`} />

                  {isMethodSectionActive && methodDropdownStyle && (
                    <OptionList
                      style={methodDropdownStyle}
                      options={filteredMethodOptions}
                      activeIndex={methodListIndex}
                      emptyText="No matching account found."
                      getKey={(option) => option.value}
                      getLabel={(option) => option.label}
                      getHint={(option) => (accountBalances[option.value] === undefined
                        ? option.type
                        : `${option.type} · Balance ${formatAccountBalance(accountBalances[option.value])}`)}
                      isSelected={(option) => String(formData.account || defaultAccountId || '') === String(option.value)}
                      onHover={setMethodListIndex}
                      onPick={selectMethod}
                    />
                  )}
                </div>
                {paidFromBalanceAfter !== null && (
                  <p className="mt-1 text-xs text-slate-500">
                    Balance {formatAccountBalance(paidFromBalance)}
                    {paidNowAmount > 0 || alreadyPaidFromAccount > 0 ? (
                      <> → <span className={`font-semibold ${paidFromBalanceAfter < 0 ? 'text-rose-600' : 'text-slate-700'}`}>{formatAccountBalance(paidFromBalanceAfter)}</span> after this expense</>
                    ) : null}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="label" htmlFor="expense-notes-input">Notes</label>
              <input id="expense-notes-input" className="input" type="text" name="notes" value={formData.notes} onChange={handleChange} placeholder="Optional" />
            </div>
          </FormSection>
        </AddExpensePopup>
      )}

      <div className="page-header gap-2.5">
        <div className="min-w-0">
          <h1 className="page-title">Expenses</h1>
          <p className="page-subtitle">Every expense, by category, with how it was paid</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select
              value={tableRange}
              onChange={(event) => handleRangeChange(event.target.value)}
              className="input w-auto py-1.5 pl-9"
              aria-label="Period"
            >
              {EXPENSE_RANGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          {tableRange === 'month' && (
            <MonthRangeButton month={selectedMonth} year={selectedYear} onClick={() => setShowMonthPicker(true)} />
          )}
          {tableRange === 'custom' && (
            <CustomRangeButton from={customFrom} to={customTo} onClick={() => setShowCustomPicker(true)} />
          )}
          <button type="button" className="btn-primary" onClick={handleOpenForm} disabled={expenseGroups.length === 0}>
            <Plus size={18} /> Add Expense
          </button>
        </div>
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700">{error}</div>}

      <section className="grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-4">
        <StatCard compact icon={Wallet} tone="rose" label="Total Expense" value={formatCurrency(expenseSummary.total)} hint="In the selected period" />
        <StatCard compact icon={Wallet} tone="emerald" label="Paid" value={formatCurrency(expenseSummary.cash)} hint="Cash or bank" />
        <StatCard compact icon={Wallet} tone="amber" label="On Credit" value={formatCurrency(expenseSummary.credit)} hint="Still to pay" />
        <StatCard compact icon={Receipt} tone="indigo" label="Entries" value={String(visibleExpenses.length)} hint={categoryFilter ? 'In the picked category' : 'All categories'} />
      </section>

      {categoryStats.length > 0 && (
        <section className="panel">
          <div className="panel-header flex items-baseline justify-between gap-2 py-2.5">
            <h2 className="text-sm font-bold text-slate-800">By Category</h2>
            {categoryFilter ? (
              <button type="button" onClick={() => setCategoryFilter('')} className="text-xs font-semibold text-primary-600 hover:underline">
                Show all categories
              </button>
            ) : (
              <span className="text-[11px] text-slate-400">Tap a category to filter the list</span>
            )}
          </div>
          <ul className="divide-y divide-slate-100">
            {categoryStats.map((item) => {
              const share = categoryGrandTotal > 0 ? (item.totalAmount / categoryGrandTotal) * 100 : 0;
              const active = categoryFilter === item.key;
              return (
                <li key={item.key}>
                  <button
                    type="button"
                    onClick={() => setCategoryFilter(active ? '' : item.key)}
                    aria-pressed={active}
                    className={`grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-4 py-2 text-left transition md:px-5 ${active ? 'bg-primary-50' : 'hover:bg-slate-50'}`}
                  >
                    <span className="min-w-0 truncate text-sm font-semibold text-slate-800">
                      {item.name}
                      <span className="ml-2 text-xs font-normal text-slate-500">
                        {item.count} entr{item.count === 1 ? 'y' : 'ies'}
                        {showCategoryQty && item.totalQty > 0
                          ? ` · ${item.totalQty.toLocaleString('en-IN', { maximumFractionDigits: 2 })}${item.unit ? ` ${item.unit}` : ''}`
                          : ''}
                      </span>
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      {formatCurrency(item.totalAmount)}
                      <span className="ml-2 text-xs font-medium text-slate-400">{share.toFixed(0)}%</span>
                    </span>
                    <span className="col-span-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <span className="block h-full rounded-full bg-rose-400" style={{ width: `${Math.max(share, 1)}%` }} />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className={`panel transition-opacity ${loading && visibleExpenses.length > 0 ? 'opacity-60' : ''}`}>
        <div className="panel-header flex flex-wrap items-center justify-between gap-2 py-2.5">
          <h2 className="text-sm font-bold text-slate-800">Expense List</h2>
          <div className="relative min-w-0 flex-1 md:max-w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Search type, party or notes"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="input pl-9"
            />
          </div>
        </div>

        {loading && visibleExpenses.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-400">Loading expenses…</p>
        ) : visibleExpenses.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400"><Inbox size={20} /></span>
            <p className="text-sm font-semibold text-slate-800">No expenses found</p>
            <p className="text-xs text-slate-500">Try another period, category or search.</p>
          </div>
        ) : (
          <>
            {/* Phone: three short lines per expense */}
            <ul className="divide-y divide-slate-100 md:hidden">
              {visibleExpenses.map((expense) => (
                <li key={expense._id} className="px-4 py-2.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="min-w-0 truncate text-sm font-semibold text-slate-800">{expense.expenseGroup?.name || 'Expense'}</p>
                    <p className="shrink-0 text-sm font-bold text-rose-700">{formatCurrency(expense.amount)}</p>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-3 text-xs text-slate-500">
                    <span className="min-w-0 truncate">
                      {formatDate(expense.expenseDate)}
                      {expense.party?.name ? ` · ${expense.party.name}` : ''}
                      {getExpenseQtyLabel(expense) ? ` · ${getExpenseQtyLabel(expense)}` : ''}
                    </span>
                    <span className={`${getMethodBadgeClass(expense.method)} shrink-0 capitalize`}>{expense.account?.name || expense.method}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate text-[11px] text-slate-400">{expense.expenseNumber || '-'}{expense.notes ? ` · ${expense.notes}` : ''}</p>
                    {renderExpenseActions(expense)}
                  </div>
                </li>
              ))}
            </ul>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[860px] text-left">
                <thead>
                  <tr>
                    <th className={TH}>Date</th>
                    <th className={TH}>Expense Type</th>
                    <th className={TH}>Party</th>
                    <th className={`${TH} text-right`}>Amount</th>
                    <th className={TH}>Paid From</th>
                    <th className={TH}>Notes</th>
                    {canManageExpenses && <th className={TH} />}
                  </tr>
                </thead>
                <tbody>
                  {visibleExpenses.map((expense) => (
                    <tr key={expense._id} className="tbl-row">
                      <td className={`${TD} whitespace-nowrap`}>
                        {formatDate(expense.expenseDate)}
                        <span className="block text-[11px] leading-tight text-slate-400">{expense.expenseNumber || '-'}</span>
                      </td>
                      <td className={TD}>
                        <p className="font-semibold text-slate-800">{expense.expenseGroup?.name || '-'}</p>
                        {getExpenseQtyLabel(expense) && <p className="text-[11px] text-slate-500">{getExpenseQtyLabel(expense)}</p>}
                      </td>
                      <td className={TD}>{expense.party?.name || '—'}</td>
                      <td className={`${TD} whitespace-nowrap text-right font-bold text-rose-700`}>{formatCurrency(expense.amount)}</td>
                      <td className={TD}><span className={`${getMethodBadgeClass(expense.method)} capitalize`}>{expense.account?.name || expense.method}</span></td>
                      <td className={TD}><div className="max-w-[20rem] truncate text-slate-600" title={expense.notes || undefined}>{expense.notes || '—'}</div></td>
                      {canManageExpenses && <td className={`${TD} py-1!`}>{renderExpenseActions(expense)}</td>}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200 bg-slate-50">
                    <td className={`${TD} font-bold text-slate-900`} colSpan={3}>Total · {visibleExpenses.length} entr{visibleExpenses.length === 1 ? 'y' : 'ies'}</td>
                    <td className={`${TD} whitespace-nowrap text-right font-bold text-rose-700`}>
                      {formatCurrency(visibleExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0))}
                    </td>
                    <td className={TD} colSpan={canManageExpenses ? 3 : 2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
