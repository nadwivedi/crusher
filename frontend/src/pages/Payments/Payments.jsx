import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Wallet, IndianRupee } from 'lucide-react';
import MoneyVoucherList from '../../components/MoneyVoucherList';
import { toast } from 'react-toastify';
import apiClient from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { getBankDisplayName } from '../../utils/bankAccounts';
import AddPaymentPopup from './component/AddPaymentPopup';

const formatPaymentDateInput = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const parsePaymentDateInput = (value) => {
  const normalized = String(value || '').trim();
  if (!normalized) return null;

  let year;
  let month;
  let day;

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    [year, month, day] = normalized.split('-').map(Number);
  } else if (/^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(normalized)) {
    [day, month, year] = normalized.split(/[/-]/).map(Number);
  } else {
    return null;
  }

  const parsedDate = new Date(year, month - 1, day);
  if (
    Number.isNaN(parsedDate.getTime())
    || parsedDate.getFullYear() !== year
    || parsedDate.getMonth() !== month - 1
    || parsedDate.getDate() !== day
  ) {
    return null;
  }

  return parsedDate;
};

const getInitialForm = (defaultMethod = 'Cash Account') => ({
  party: '',
  amount: '',
  method: defaultMethod,
  paymentDate: formatPaymentDateInput(),
  notes: '',
  refType: 'none',
  refId: ''
});
const TOAST_OPTIONS = { autoClose: 1200 };

const getPaymentAccountOptions = (banks = []) => {
  const uniqueNames = banks
    .map((bank) => getBankDisplayName(bank))
    .filter((name, index, values) => name && values.indexOf(name) === index);

  return uniqueNames.length > 0 ? uniqueNames : ['Cash Account'];
};

const getDefaultPaymentMethod = (banks = []) => {
  const defaultAccount = banks.find((bank) => bank?.isDefault);
  return getBankDisplayName(defaultAccount || banks[0]) || 'Cash Account';
};

const buildPurchasePaymentMap = (payments) => {
  const map = new Map();

  payments
    .filter((payment) => payment.refType === 'purchase' && payment.refId)
    .forEach((payment) => {
      const key = String(payment.refId);
      map.set(key, (map.get(key) || 0) + Number(payment.amount || 0));
    });

  return map;
};

const formatDisplayDate = (value) => {
  if (!value) return '-';
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return '-';
  return parsedDate.toLocaleDateString('en-GB');
};

const formatPaymentNumber = (value) => {
  const normalized = String(value || '').trim();
  if (!normalized) return '-';
  if (/^PAY-\d{4}-\d{2,}$/i.test(normalized)) return normalized.toUpperCase();
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return '-';
  return `Pay-${String(parsed).padStart(2, '0')}`;
};

export default function Payments({ modalOnly = false, onModalFinish = null }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canDeletePayments = user?.role !== 'employee' && (user?.role === 'owner' || user?.permissions?.edit);
  const [payments, setPayments] = useState([]);
  const [parties, setParties] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [banks, setBanks] = useState([]);
  const [formData, setFormData] = useState(getInitialForm());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [partyQuery, setPartyQuery] = useState('');
  const [partyListIndex, setPartyListIndex] = useState(-1);
  const [isPartySectionActive, setIsPartySectionActive] = useState(false);
  const [paymentAccountQuery, setPaymentAccountQuery] = useState('');
  const [paymentAccountListIndex, setPaymentAccountListIndex] = useState(-1);
  const [isPaymentAccountSectionActive, setIsPaymentAccountSectionActive] = useState(false);
  const partySectionRef = useRef(null);
  const paymentAccountSectionRef = useRef(null);

  useEffect(() => {
    fetchPayments();
  }, [search, dateFilter]);

  useEffect(() => {
    fetchParties();
    fetchPurchases();
    fetchBanks();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const tagName = event.target?.tagName?.toLowerCase();
      const isTypingTarget = tagName === 'input' || tagName === 'textarea' || tagName === 'select' || event.target?.isContentEditable;
      const key = event.key?.toLowerCase();

      if (event.defaultPrevented || !event.altKey || event.ctrlKey || event.metaKey) return;
      if (isTypingTarget || showForm) return;
      if (key !== 'm') return;

      event.preventDefault();
      handleOpenForm();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showForm]);

  useEffect(() => {
    if (location.state?.openShortcut !== 'payment' || showForm) return;

    handleOpenForm();
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.pathname, location.state, navigate, showForm]);

  useEffect(() => {
    if (!modalOnly || showForm) return;
    handleOpenForm();
  }, [modalOnly, showForm]);

  const purchasePaymentMap = useMemo(() => buildPurchasePaymentMap(payments), [payments]);
  const paymentAccountOptions = useMemo(() => getPaymentAccountOptions(banks), [banks]);
  const defaultPaymentMethod = useMemo(() => getDefaultPaymentMethod(banks), [banks]);

  const normalizeText = (value) => String(value || '').trim().toLowerCase();

  useEffect(() => {
    setFormData((prev) => {
      const currentMethod = String(prev.method || '').trim();
      const hasMatchingAccount = paymentAccountOptions.includes(currentMethod);
      const isLegacyMethod = ['cash', 'bank', 'upi', 'card', 'credit', 'other'].includes(currentMethod.toLowerCase());

      if (currentMethod && hasMatchingAccount && !isLegacyMethod) {
        return prev;
      }

      if (currentMethod === defaultPaymentMethod) {
        return prev;
      }

      return {
        ...prev,
        method: defaultPaymentMethod
      };
    });
  }, [defaultPaymentMethod, paymentAccountOptions]);

  useEffect(() => {
    if (isPaymentAccountSectionActive) return;
    setPaymentAccountQuery(formData.method || '');
  }, [formData.method, isPaymentAccountSectionActive]);

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

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const fromDate = getFromDateByFilter();
      const response = await apiClient.get('/payments', {
        params: {
          search,
          fromDate: fromDate || undefined
        }
      });
      setPayments(response.data || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Error fetching payments');
    } finally {
      setLoading(false);
    }
  };

  const fetchParties = async () => {
    try {
      const response = await apiClient.get('/parties');
      setParties(Array.isArray(response) ? response : (response?.data || []));
    } catch (err) {
      console.error('Error fetching parties:', err);
    }
  };

  const fetchPurchases = async () => {
    try {
      const response = await apiClient.get('/purchases');
      setPurchases(response.data || []);
    } catch (err) {
      console.error('Error fetching purchases:', err);
    }
  };

  const fetchBanks = async () => {
    try {
      const response = await apiClient.get('/banks');
      setBanks(response.data || []);
    } catch (err) {
      console.error('Error fetching banks:', err);
    }
  };

  const getPartyDisplayName = (party) => {
    const partyName = String(party?.partyName || party?.name || '').trim();
    if (partyName) return partyName;
    return 'Party Name';
  };

  const resolvePartyNameById = (partyId) => {
    const resolvedId = typeof partyId === 'object' ? partyId?._id : partyId;
    if (!resolvedId) return '';
    const matching = parties.find((party) => String(party._id) === String(resolvedId));
    return matching ? getPartyDisplayName(matching) : '';
  };

  const getMatchingParties = (queryValue) => {
    const normalized = normalizeText(queryValue);
    if (!normalized) return parties;

    const startsWith = parties.filter((party) => normalizeText(getPartyDisplayName(party)).startsWith(normalized));
    const includes = parties.filter((party) => (
      !normalizeText(getPartyDisplayName(party)).startsWith(normalized)
      && normalizeText(getPartyDisplayName(party)).includes(normalized)
    ));

    return [...startsWith, ...includes];
  };

  const getMatchingPaymentAccounts = (queryValue) => {
    const normalized = normalizeText(queryValue);
    if (!normalized) return paymentAccountOptions;

    const startsWith = paymentAccountOptions.filter((accountName) => normalizeText(accountName).startsWith(normalized));
    const includes = paymentAccountOptions.filter((accountName) => (
      !normalizeText(accountName).startsWith(normalized)
      && normalizeText(accountName).includes(normalized)
    ));

    return [...startsWith, ...includes];
  };

  const selectedPartyName = useMemo(() => resolvePartyNameById(formData.party), [formData.party, parties]);

  const filteredParties = useMemo(() => {
    const normalizedQuery = normalizeText(partyQuery);
    const normalizedSelectedName = normalizeText(selectedPartyName);

    if (
      isPartySectionActive
      && normalizedQuery
      && normalizedQuery === normalizedSelectedName
    ) {
      return parties;
    }

    return getMatchingParties(partyQuery);
  }, [parties, partyQuery, isPartySectionActive, selectedPartyName]);

  const filteredPaymentAccounts = useMemo(() => {
    const normalizedQuery = normalizeText(paymentAccountQuery);
    const normalizedSelectedName = normalizeText(formData.method);

    if (
      isPaymentAccountSectionActive
      && normalizedQuery
      && normalizedQuery === normalizedSelectedName
    ) {
      return paymentAccountOptions;
    }

    return getMatchingPaymentAccounts(paymentAccountQuery);
  }, [formData.method, isPaymentAccountSectionActive, paymentAccountOptions, paymentAccountQuery]);

  useEffect(() => {
    if (!showForm) return;

    if (filteredParties.length === 0) {
      setPartyListIndex(-1);
      return;
    }

    const shouldHighlightSelectedParty = (
      isPartySectionActive
      && normalizeText(partyQuery)
      && normalizeText(partyQuery) === normalizeText(selectedPartyName)
      && formData.party
    );

    if (shouldHighlightSelectedParty) {
      const selectedIndex = filteredParties.findIndex((item) => String(item._id) === String(formData.party));
      setPartyListIndex(selectedIndex >= 0 ? selectedIndex : 0);
      return;
    }

    setPartyListIndex((prev) => {
      if (prev < 0) return 0;
      if (prev >= filteredParties.length) return filteredParties.length - 1;
      return prev;
    });
  }, [showForm, filteredParties, isPartySectionActive, partyQuery, selectedPartyName, formData.party]);

  useEffect(() => {
    if (!showForm) return;

    if (filteredPaymentAccounts.length === 0) {
      setPaymentAccountListIndex(-1);
      return;
    }

    const shouldHighlightSelectedAccount = (
      isPaymentAccountSectionActive
      && normalizeText(paymentAccountQuery)
      && normalizeText(paymentAccountQuery) === normalizeText(formData.method)
      && formData.method
    );

    if (shouldHighlightSelectedAccount) {
      const selectedIndex = filteredPaymentAccounts.findIndex((item) => item === formData.method);
      setPaymentAccountListIndex(selectedIndex >= 0 ? selectedIndex : 0);
      return;
    }

    setPaymentAccountListIndex((prev) => {
      if (prev < 0) return 0;
      if (prev >= filteredPaymentAccounts.length) return filteredPaymentAccounts.length - 1;
      return prev;
    });
  }, [showForm, filteredPaymentAccounts, isPaymentAccountSectionActive, paymentAccountQuery, formData.method]);

  const handlePartyFocus = () => {
    setIsPartySectionActive(true);
  };

  const handlePaymentAccountFocus = () => {
    setIsPaymentAccountSectionActive(true);
  };

  const findExactParty = (value) => {
    const normalized = normalizeText(value);
    if (!normalized) return null;
    return parties.find((party) => normalizeText(getPartyDisplayName(party)) === normalized) || null;
  };

  const findBestPartyMatch = (value) => {
    const normalized = normalizeText(value);
    if (!normalized) return null;
    return parties.find((party) => normalizeText(getPartyDisplayName(party)).startsWith(normalized))
      || parties.find((party) => normalizeText(getPartyDisplayName(party)).includes(normalized))
      || null;
  };

  const findExactPaymentAccount = (value) => {
    const normalized = normalizeText(value);
    if (!normalized) return null;
    return paymentAccountOptions.find((accountName) => normalizeText(accountName) === normalized) || null;
  };

  const findBestPaymentAccountMatch = (value) => {
    const normalized = normalizeText(value);
    if (!normalized) return null;
    return paymentAccountOptions.find((accountName) => normalizeText(accountName).startsWith(normalized))
      || paymentAccountOptions.find((accountName) => normalizeText(accountName).includes(normalized))
      || null;
  };

  const selectParty = (party) => {
    if (!party) {
      setPartyQuery('');
      setFormData((prev) => ({
        ...prev,
        party: '',
        refId: ''
      }));
      setPartyListIndex(-1);
      return;
    }

    const partyName = getPartyDisplayName(party);
    setPartyQuery(partyName);
    setFormData((prev) => ({
      ...prev,
      party: party._id,
      refId: prev.refType === 'purchase' ? '' : prev.refId
    }));

    const selectedIndex = filteredParties.findIndex((item) => String(item._id) === String(party._id));
    setPartyListIndex(selectedIndex >= 0 ? selectedIndex : 0);
  };

  const handlePartyInputChange = (e) => {
    const value = e.target.value;
    setPartyQuery(value);

    if (!normalizeText(value)) {
      selectParty(null);
      return;
    }

    const exactParty = findExactParty(value);
    if (exactParty) {
      setFormData((prev) => ({
        ...prev,
        party: exactParty._id,
        refId: prev.refType === 'purchase' ? '' : prev.refId
      }));
      const exactIndex = getMatchingParties(value).findIndex((item) => String(item._id) === String(exactParty._id));
      setPartyListIndex(exactIndex >= 0 ? exactIndex : 0);
      return;
    }

    const matches = getMatchingParties(value);
    const firstMatch = matches[0] || null;
    setFormData((prev) => ({
      ...prev,
      party: firstMatch?._id || '',
      refId: prev.refType === 'purchase' ? '' : prev.refId
    }));
    setPartyListIndex(firstMatch ? 0 : -1);
  };

  const selectPaymentAccount = (accountName) => {
    if (!accountName) {
      setPaymentAccountQuery('');
      setFormData((prev) => ({
        ...prev,
        method: ''
      }));
      setPaymentAccountListIndex(-1);
      return;
    }

    setPaymentAccountQuery(accountName);
    setFormData((prev) => ({
      ...prev,
      method: accountName
    }));

    const selectedIndex = filteredPaymentAccounts.findIndex((item) => item === accountName);
    setPaymentAccountListIndex(selectedIndex >= 0 ? selectedIndex : 0);
  };

  const handlePaymentAccountInputChange = (e) => {
    const value = e.target.value;
    const matches = getMatchingPaymentAccounts(value);
    setPaymentAccountQuery(value);

    if (!normalizeText(value)) {
      selectPaymentAccount(null);
      return;
    }

    const exactAccount = findExactPaymentAccount(value);
    if (exactAccount) {
      setFormData((prev) => ({
        ...prev,
        method: exactAccount
      }));
      const exactIndex = matches.findIndex((item) => item === exactAccount);
      setPaymentAccountListIndex(exactIndex >= 0 ? exactIndex : 0);
      return;
    }

    const firstMatch = matches[0] || null;
    setFormData((prev) => ({
      ...prev,
      method: firstMatch || ''
    }));
    setPaymentAccountListIndex(firstMatch ? 0 : -1);
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

  const handlePartyInputKeyDown = (e) => {
    const key = e.key?.toLowerCase();

    if (key === 'arrowdown') {
      e.preventDefault();
      e.stopPropagation();
      if (filteredParties.length === 0) return;
      setPartyListIndex((prev) => {
        if (prev < 0) return 0;
        return Math.min(prev + 1, filteredParties.length - 1);
      });
      return;
    }

    if (key === 'arrowup') {
      e.preventDefault();
      e.stopPropagation();
      if (filteredParties.length === 0) return;
      setPartyListIndex((prev) => {
        if (prev < 0) return 0;
        return Math.max(prev - 1, 0);
      });
      return;
    }

    if (key === 'enter') {
      e.preventDefault();
      e.stopPropagation();

      const activeParty = partyListIndex >= 0 ? filteredParties[partyListIndex] : null;
      const matchedParty = activeParty || findExactParty(partyQuery) || findBestPartyMatch(partyQuery);
      if (matchedParty) {
        selectParty(matchedParty);
      }
      setIsPartySectionActive(false);
      focusNextPopupField(e.currentTarget);
    }
  };

  const handlePaymentAccountInputKeyDown = (e) => {
    const key = e.key?.toLowerCase();

    if (key === 'arrowdown') {
      e.preventDefault();
      e.stopPropagation();
      if (filteredPaymentAccounts.length === 0) return;
      setPaymentAccountListIndex((prev) => {
        if (prev < 0) return 0;
        return Math.min(prev + 1, filteredPaymentAccounts.length - 1);
      });
      return;
    }

    if (key === 'arrowup') {
      e.preventDefault();
      e.stopPropagation();
      if (filteredPaymentAccounts.length === 0) return;
      setPaymentAccountListIndex((prev) => {
        if (prev < 0) return 0;
        return Math.max(prev - 1, 0);
      });
      return;
    }

    if (key === 'enter') {
      e.preventDefault();
      e.stopPropagation();

      const activeAccount = paymentAccountListIndex >= 0 ? filteredPaymentAccounts[paymentAccountListIndex] : null;
      const matchedAccount = activeAccount || findExactPaymentAccount(paymentAccountQuery) || findBestPaymentAccountMatch(paymentAccountQuery);
      if (matchedAccount) {
        selectPaymentAccount(matchedAccount);
      }
      setIsPaymentAccountSectionActive(false);
      focusNextPopupField(e.currentTarget);
    }
  };

  const purchaseOptions = useMemo(() => {
    if (formData.refType !== 'purchase') return [];

    return purchases.filter((p) => {
      if (!formData.party) return true;
      return String(p.party?._id || p.party) === String(formData.party);
    }).filter((p) => {
      const pending = Math.max(0, Number(p.totalAmount || 0) - Number(purchasePaymentMap.get(String(p._id)) || 0));
      return pending > 0;
    });
  }, [purchases, purchasePaymentMap, formData.refType, formData.party]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePaymentDateBlur = (e) => {
    const parsedDate = parsePaymentDateInput(e.target.value);
    if (!parsedDate) return;

    setFormData((prev) => ({
      ...prev,
      paymentDate: formatPaymentDateInput(parsedDate)
    }));
  };

  const handleOpenForm = () => {
    setFormData(getInitialForm(defaultPaymentMethod));
    setPartyQuery('');
    setPartyListIndex(-1);
    setIsPartySectionActive(false);
    setPaymentAccountQuery(defaultPaymentMethod);
    setPaymentAccountListIndex(-1);
    setIsPaymentAccountSectionActive(false);
    setError('');
    setShowForm(true);
  };

  const handleCloseForm = () => {
    if (modalOnly && typeof onModalFinish === 'function') {
      onModalFinish();
      return;
    }

    setShowForm(false);
    setFormData(getInitialForm(defaultPaymentMethod));
    setPartyQuery('');
    setPartyListIndex(-1);
    setIsPartySectionActive(false);
    setPaymentAccountQuery(defaultPaymentMethod);
    setPaymentAccountListIndex(-1);
    setIsPaymentAccountSectionActive(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount || Number(formData.amount) <= 0) {
      setError('Valid amount is required');
      return;
    }

    if (!formData.method) {
      setError('Select payment account');
      return;
    }

    const parsedPaymentDate = parsePaymentDateInput(formData.paymentDate);
    if (!parsedPaymentDate) {
      setError('Enter payment date in DD/MM/YYYY format');
      return;
    }

    if (formData.refType === 'purchase' && !formData.refId) {
      setError('Select purchase bill for bill-wise payment');
      return;
    }

    try {
      setLoading(true);
      await apiClient.post('/payments', {
        party: formData.party || null,
        amount: Number(formData.amount),
        method: formData.method,
        paymentDate: parsedPaymentDate,
        notes: formData.notes,
        refType: formData.refType,
        refId: formData.refType === 'purchase' ? formData.refId : null
      });

      handleCloseForm();
      setError('');
      fetchPayments();
      fetchPurchases();
      toast.success('Payment created successfully', TOAST_OPTIONS);
      if (modalOnly && typeof onModalFinish === 'function') {
        onModalFinish();
      }
    } catch (err) {
      setError(err.message || 'Error creating payment');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this payment?')) return;

    try {
      await apiClient.delete(`/payments/${id}`);
      toast.success('Payment deleted successfully', TOAST_OPTIONS);
      fetchPayments();
      fetchPurchases();
    } catch (err) {
      setError(err.message || 'Error deleting payment');
    }
  };

  const totalPayments = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const totalPurchaseAmount = purchases.reduce((sum, p) => sum + Number(p.totalAmount || 0), 0);
  const totalPayable = Math.max(0, totalPurchaseAmount - totalPayments);

  if (modalOnly) {
    return (
      <>
        <AddPaymentPopup
          showForm={showForm}
          loading={loading}
          error={error}
          formData={formData}
          parties={parties}
          paymentAccountOptions={paymentAccountOptions}
          paymentAccountSectionRef={paymentAccountSectionRef}
          partySectionRef={partySectionRef}
          paymentAccountQuery={paymentAccountQuery}
          partyQuery={partyQuery}
          paymentAccountListIndex={paymentAccountListIndex}
          partyListIndex={partyListIndex}
          filteredPaymentAccounts={filteredPaymentAccounts}
          filteredParties={filteredParties}
          isPaymentAccountSectionActive={isPaymentAccountSectionActive}
          isPartySectionActive={isPartySectionActive}
          purchaseOptions={purchaseOptions}
          purchasePaymentMap={purchasePaymentMap}
          setFormData={setFormData}
          setPaymentAccountListIndex={setPaymentAccountListIndex}
          setPartyListIndex={setPartyListIndex}
          setIsPaymentAccountSectionActive={setIsPaymentAccountSectionActive}
          setIsPartySectionActive={setIsPartySectionActive}
          getPartyDisplayName={getPartyDisplayName}
          handleCloseForm={handleCloseForm}
          handleSubmit={handleSubmit}
          handleChange={handleChange}
          handlePaymentDateBlur={handlePaymentDateBlur}
          handlePaymentAccountFocus={handlePaymentAccountFocus}
          handlePartyFocus={handlePartyFocus}
          handlePaymentAccountInputChange={handlePaymentAccountInputChange}
          handlePartyInputChange={handlePartyInputChange}
          handlePaymentAccountInputKeyDown={handlePaymentAccountInputKeyDown}
          handlePartyInputKeyDown={handlePartyInputKeyDown}
          selectPaymentAccount={selectPaymentAccount}
          selectParty={selectParty}
        />
      </>
    );
  }

  return (
    <MoneyVoucherList
      title="Money Paid"
      subtitle="Money paid to your parties"
      addLabel="New Payment"
      onAdd={handleOpenForm}
      error={error}
      stats={[
        { icon: Wallet, label: 'Payments', tone: 'blue', value: String(payments.length), hint: 'Entries in this list' },
        { icon: IndianRupee, label: 'Amount Paid', tone: 'rose', amount: totalPayments, hint: 'Total of this list' },
        { icon: IndianRupee, label: 'Total Payable', tone: 'amber', amount: totalPayable, hint: 'Purchases minus payments' }
      ]}
      listTitle="Payments"
      accountLabel="Paid From"
      amountClass="text-rose-700"
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search payments..."
      dateFilter={dateFilter}
      onDateFilterChange={setDateFilter}
      loading={loading && !showForm}
      rows={payments.map((payment) => ({
        id: payment._id,
        number: formatPaymentNumber(payment.paymentNumber),
        date: formatDisplayDate(payment.paymentDate),
        party: payment.party ? getPartyDisplayName(payment.party) : '',
        account: payment.method,
        reference: payment.refType === 'purchase' ? 'Against Purchase' : 'On Account',
        notes: payment.notes,
        amount: Number(payment.amount || 0)
      }))}
      emptyTitle="No payments found"
      emptyHint='Use "New Payment" to record money you paid.'
      canDelete={canDeletePayments}
      onDelete={handleDelete}
    >
      <AddPaymentPopup
        showForm={showForm}
        loading={loading}
        error={showForm ? error : ''}
        formData={formData}
        parties={parties}
        paymentAccountOptions={paymentAccountOptions}
        paymentAccountSectionRef={paymentAccountSectionRef}
        partySectionRef={partySectionRef}
        paymentAccountQuery={paymentAccountQuery}
        partyQuery={partyQuery}
        paymentAccountListIndex={paymentAccountListIndex}
        partyListIndex={partyListIndex}
        filteredPaymentAccounts={filteredPaymentAccounts}
        filteredParties={filteredParties}
        isPaymentAccountSectionActive={isPaymentAccountSectionActive}
        isPartySectionActive={isPartySectionActive}
        purchaseOptions={purchaseOptions}
        purchasePaymentMap={purchasePaymentMap}
        setFormData={setFormData}
        setPaymentAccountListIndex={setPaymentAccountListIndex}
        setPartyListIndex={setPartyListIndex}
        setIsPaymentAccountSectionActive={setIsPaymentAccountSectionActive}
        setIsPartySectionActive={setIsPartySectionActive}
        getPartyDisplayName={getPartyDisplayName}
        handleCloseForm={handleCloseForm}
        handleSubmit={handleSubmit}
        handleChange={handleChange}
        handlePaymentDateBlur={handlePaymentDateBlur}
        handlePaymentAccountFocus={handlePaymentAccountFocus}
        handlePartyFocus={handlePartyFocus}
        handlePaymentAccountInputChange={handlePaymentAccountInputChange}
        handlePartyInputChange={handlePartyInputChange}
        handlePaymentAccountInputKeyDown={handlePaymentAccountInputKeyDown}
        handlePartyInputKeyDown={handlePartyInputKeyDown}
        selectPaymentAccount={selectPaymentAccount}
        selectParty={selectParty}
      />
    </MoneyVoucherList>
  );
}
