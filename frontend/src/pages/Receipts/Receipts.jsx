import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Receipt, IndianRupee } from 'lucide-react';
import MoneyVoucherList from '../../components/MoneyVoucherList';
import { toast } from 'react-toastify';
import apiClient from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { getBankDisplayName, normalizeBankName } from '../../utils/bankAccounts';
import AddReceiptPopup from './component/AddReceiptPopup';

const formatReceiptDateInput = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const parseReceiptDateInput = (value) => {
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
  receiptDate: formatReceiptDateInput(),
  notes: '',
  refType: 'none',
  refId: ''
});
const TOAST_OPTIONS = { autoClose: 1200 };

const getReceiptAccountOptions = (banks = []) => {
  const uniqueNames = banks
    .map((bank) => getBankDisplayName(bank))
    .filter((name, index, values) => name && values.indexOf(name) === index);

  return uniqueNames.length > 0 ? uniqueNames : ['Cash Account'];
};

const getDefaultReceiptMethod = (banks = []) => {
  const cashAccount = banks.find((bank) => normalizeBankName(bank?.name) === 'cash account');
  return getBankDisplayName(cashAccount || banks[0]) || 'Cash Account';
};

const formatDisplayDate = (value) => {
  if (!value) return '-';
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return '-';
  return parsedDate.toLocaleDateString('en-GB');
};

const formatReceiptNumber = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return '-';
  return `Rec-${String(parsed).padStart(2, '0')}`;
};

export default function Receipts({ modalOnly = false, onModalFinish = null }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canDeleteReceipts = user?.role !== 'employee' && (user?.role === 'owner' || user?.permissions?.edit);
  const [receipts, setReceipts] = useState([]);
  const [parties, setParties] = useState([]);
  const [sales, setSales] = useState([]);
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
  const [receiptAccountQuery, setReceiptAccountQuery] = useState('');
  const [receiptAccountListIndex, setReceiptAccountListIndex] = useState(-1);
  const [isReceiptAccountSectionActive, setIsReceiptAccountSectionActive] = useState(false);
  const partySectionRef = useRef(null);
  const receiptAccountSectionRef = useRef(null);

  useEffect(() => {
    fetchReceipts();
  }, [search, dateFilter]);

  useEffect(() => {
    fetchParties();
    fetchSales();
    fetchBanks();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const tagName = event.target?.tagName?.toLowerCase();
      const isTypingTarget = tagName === 'input' || tagName === 'textarea' || tagName === 'select' || event.target?.isContentEditable;
      const key = event.key?.toLowerCase();

      if (event.defaultPrevented || !event.altKey || event.ctrlKey || event.metaKey) return;
      if (isTypingTarget || showForm) return;
      if (key !== 'r') return;

      event.preventDefault();
      handleOpenForm();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showForm]);

  useEffect(() => {
    if (location.state?.openShortcut !== 'receipt' || showForm) return;

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

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      const fromDate = getFromDateByFilter();
      const response = await apiClient.get('/receipts', {
        params: {
          search,
          fromDate: fromDate || undefined
        }
      });
      // The receipts API sends the list itself, not wrapped in { data }
      setReceipts(Array.isArray(response) ? response : (response?.data || []));
      setError('');
    } catch (err) {
      setError(err.message || 'Error fetching receipts');
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

  const fetchSales = async () => {
    try {
      const response = await apiClient.get('/sales');
      setSales(response.data || []);
    } catch (err) {
      console.error('Error fetching sales:', err);
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

  const receiptAccountOptions = useMemo(() => getReceiptAccountOptions(banks), [banks]);
  const defaultReceiptMethod = useMemo(() => getDefaultReceiptMethod(banks), [banks]);
  const normalizeText = (value) => String(value || '').trim().toLowerCase();

  useEffect(() => {
    setFormData((prev) => {
      const currentMethod = String(prev.method || '').trim();
      const hasMatchingAccount = receiptAccountOptions.includes(currentMethod);
      const isLegacyMethod = ['cash', 'bank', 'upi', 'card', 'credit', 'other'].includes(currentMethod.toLowerCase());

      if (currentMethod && hasMatchingAccount && !isLegacyMethod) {
        return prev;
      }

      if (currentMethod === defaultReceiptMethod) {
        return prev;
      }

      return {
        ...prev,
        method: defaultReceiptMethod
      };
    });
  }, [defaultReceiptMethod, receiptAccountOptions]);

  useEffect(() => {
    if (isReceiptAccountSectionActive) return;
    setReceiptAccountQuery(formData.method || '');
  }, [formData.method, isReceiptAccountSectionActive]);

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

  const getMatchingReceiptAccounts = (queryValue) => {
    const normalized = normalizeText(queryValue);
    if (!normalized) return receiptAccountOptions;

    const startsWith = receiptAccountOptions.filter((accountName) => normalizeText(accountName).startsWith(normalized));
    const includes = receiptAccountOptions.filter((accountName) => (
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

  const filteredReceiptAccounts = useMemo(() => {
    const normalizedQuery = normalizeText(receiptAccountQuery);
    const normalizedSelectedName = normalizeText(formData.method);

    if (
      isReceiptAccountSectionActive
      && normalizedQuery
      && normalizedQuery === normalizedSelectedName
    ) {
      return receiptAccountOptions;
    }

    return getMatchingReceiptAccounts(receiptAccountQuery);
  }, [formData.method, isReceiptAccountSectionActive, receiptAccountOptions, receiptAccountQuery]);

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

    if (filteredReceiptAccounts.length === 0) {
      setReceiptAccountListIndex(-1);
      return;
    }

    const shouldHighlightSelectedAccount = (
      isReceiptAccountSectionActive
      && normalizeText(receiptAccountQuery)
      && normalizeText(receiptAccountQuery) === normalizeText(formData.method)
      && formData.method
    );

    if (shouldHighlightSelectedAccount) {
      const selectedIndex = filteredReceiptAccounts.findIndex((item) => item === formData.method);
      setReceiptAccountListIndex(selectedIndex >= 0 ? selectedIndex : 0);
      return;
    }

    setReceiptAccountListIndex((prev) => {
      if (prev < 0) return 0;
      if (prev >= filteredReceiptAccounts.length) return filteredReceiptAccounts.length - 1;
      return prev;
    });
  }, [showForm, filteredReceiptAccounts, isReceiptAccountSectionActive, receiptAccountQuery, formData.method]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleReceiptDateBlur = (e) => {
    const parsedDate = parseReceiptDateInput(e.target.value);
    if (!parsedDate) return;

    setFormData((prev) => ({
      ...prev,
      receiptDate: formatReceiptDateInput(parsedDate)
    }));
  };

  const handlePartyFocus = () => {
    setIsPartySectionActive(true);
  };

  const handleReceiptAccountFocus = () => {
    setIsReceiptAccountSectionActive(true);
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

  const findExactReceiptAccount = (value) => {
    const normalized = normalizeText(value);
    if (!normalized) return null;
    return receiptAccountOptions.find((accountName) => normalizeText(accountName) === normalized) || null;
  };

  const findBestReceiptAccountMatch = (value) => {
    const normalized = normalizeText(value);
    if (!normalized) return null;
    return receiptAccountOptions.find((accountName) => normalizeText(accountName).startsWith(normalized))
      || receiptAccountOptions.find((accountName) => normalizeText(accountName).includes(normalized))
      || null;
  };

  const selectParty = (party) => {
    if (!party) {
      setPartyQuery('');
      setFormData((prev) => ({
        ...prev,
        party: ''
      }));
      setPartyListIndex(-1);
      return;
    }

    const partyName = getPartyDisplayName(party);
    setPartyQuery(partyName);
    setFormData((prev) => ({
      ...prev,
      party: party._id
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
        party: exactParty._id
      }));
      const exactIndex = getMatchingParties(value).findIndex((item) => String(item._id) === String(exactParty._id));
      setPartyListIndex(exactIndex >= 0 ? exactIndex : 0);
      return;
    }

    const matches = getMatchingParties(value);
    const firstMatch = matches[0] || null;
    setFormData((prev) => ({
      ...prev,
      party: firstMatch?._id || ''
    }));
    setPartyListIndex(firstMatch ? 0 : -1);
  };

  const selectReceiptAccount = (accountName) => {
    if (!accountName) {
      setReceiptAccountQuery('');
      setFormData((prev) => ({
        ...prev,
        method: ''
      }));
      setReceiptAccountListIndex(-1);
      return;
    }

    setReceiptAccountQuery(accountName);
    setFormData((prev) => ({
      ...prev,
      method: accountName
    }));

    const selectedIndex = filteredReceiptAccounts.findIndex((item) => item === accountName);
    setReceiptAccountListIndex(selectedIndex >= 0 ? selectedIndex : 0);
  };

  const handleReceiptAccountInputChange = (e) => {
    const value = e.target.value;
    const matches = getMatchingReceiptAccounts(value);
    setReceiptAccountQuery(value);

    if (!normalizeText(value)) {
      selectReceiptAccount(null);
      return;
    }

    const exactAccount = findExactReceiptAccount(value);
    if (exactAccount) {
      setFormData((prev) => ({
        ...prev,
        method: exactAccount
      }));
      const exactIndex = matches.findIndex((item) => item === exactAccount);
      setReceiptAccountListIndex(exactIndex >= 0 ? exactIndex : 0);
      return;
    }

    const firstMatch = matches[0] || null;
    setFormData((prev) => ({
      ...prev,
      method: firstMatch || ''
    }));
    setReceiptAccountListIndex(firstMatch ? 0 : -1);
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

  const handleReceiptAccountInputKeyDown = (e) => {
    const key = e.key?.toLowerCase();

    if (key === 'arrowdown') {
      e.preventDefault();
      e.stopPropagation();
      if (filteredReceiptAccounts.length === 0) return;
      setReceiptAccountListIndex((prev) => {
        if (prev < 0) return 0;
        return Math.min(prev + 1, filteredReceiptAccounts.length - 1);
      });
      return;
    }

    if (key === 'arrowup') {
      e.preventDefault();
      e.stopPropagation();
      if (filteredReceiptAccounts.length === 0) return;
      setReceiptAccountListIndex((prev) => {
        if (prev < 0) return 0;
        return Math.max(prev - 1, 0);
      });
      return;
    }

    if (key === 'enter') {
      e.preventDefault();
      e.stopPropagation();

      const activeAccount = receiptAccountListIndex >= 0 ? filteredReceiptAccounts[receiptAccountListIndex] : null;
      const matchedAccount = activeAccount || findExactReceiptAccount(receiptAccountQuery) || findBestReceiptAccountMatch(receiptAccountQuery);
      if (matchedAccount) {
        selectReceiptAccount(matchedAccount);
      }
      setIsReceiptAccountSectionActive(false);
      focusNextPopupField(e.currentTarget);
    }
  };

  const handleOpenForm = () => {
    setFormData(getInitialForm(defaultReceiptMethod));
    setPartyQuery('');
    setPartyListIndex(-1);
    setIsPartySectionActive(false);
    setReceiptAccountQuery(defaultReceiptMethod);
    setReceiptAccountListIndex(-1);
    setIsReceiptAccountSectionActive(false);
    setError('');
    setShowForm(true);
  };

  const handleCloseForm = () => {
    if (modalOnly && typeof onModalFinish === 'function') {
      onModalFinish();
      return;
    }

    setShowForm(false);
    setFormData(getInitialForm(defaultReceiptMethod));
    setPartyQuery('');
    setPartyListIndex(-1);
    setIsPartySectionActive(false);
    setReceiptAccountQuery(defaultReceiptMethod);
    setReceiptAccountListIndex(-1);
    setIsReceiptAccountSectionActive(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount || Number(formData.amount) <= 0) {
      setError('Valid amount is required');
      return;
    }

    if (!formData.method) {
      setError('Select receipt account');
      return;
    }

    const parsedReceiptDate = parseReceiptDateInput(formData.receiptDate);
    if (!parsedReceiptDate) {
      setError('Enter receipt date in DD/MM/YYYY format');
      return;
    }

    try {
      setLoading(true);
      const resolvedRefType = formData.refId ? 'sale' : 'none';
      await apiClient.post('/receipts', {
        party: formData.party || null,
        amount: Number(formData.amount),
        method: formData.method,
        receiptDate: parsedReceiptDate,
        notes: formData.notes,
        refType: 'none',
        refId: null
      });

      handleCloseForm();
      setError('');
      fetchReceipts();
      fetchSales();
      toast.success('Receipt created successfully', TOAST_OPTIONS);
      if (modalOnly && typeof onModalFinish === 'function') {
        onModalFinish();
      }
    } catch (err) {
      setError(err.message || 'Error creating receipt');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this receipt?')) return;

    try {
      await apiClient.delete(`/receipts/${id}`);
      toast.success('Receipt deleted successfully', TOAST_OPTIONS);
      fetchReceipts();
      fetchSales();
    } catch (err) {
      setError(err.message || 'Error deleting receipt');
    }
  };

  const totalReceipts = receipts.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const totalSalesAmount = sales.reduce((sum, sale) => sum + Number(sale.totalAmount || 0), 0);
  const totalReceivable = Math.max(0, totalSalesAmount - totalReceipts);

  if (modalOnly) {
    return (
      <>
        {error && (
          <div className="fixed left-4 right-4 top-4 z-[60] rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 shadow-lg md:left-auto md:right-4 md:w-[26rem]">
            {error}
          </div>
        )}
        <AddReceiptPopup
          showForm={showForm}
          loading={loading}
          formData={formData}
          parties={parties}
          receiptAccountOptions={receiptAccountOptions}
          partySectionRef={partySectionRef}
          receiptAccountSectionRef={receiptAccountSectionRef}
          partyQuery={partyQuery}
          receiptAccountQuery={receiptAccountQuery}
          partyListIndex={partyListIndex}
          receiptAccountListIndex={receiptAccountListIndex}
          filteredParties={filteredParties}
          filteredReceiptAccounts={filteredReceiptAccounts}
          isPartySectionActive={isPartySectionActive}
          isReceiptAccountSectionActive={isReceiptAccountSectionActive}
          setFormData={setFormData}
          setPartyListIndex={setPartyListIndex}
          setReceiptAccountListIndex={setReceiptAccountListIndex}
          setIsPartySectionActive={setIsPartySectionActive}
          setIsReceiptAccountSectionActive={setIsReceiptAccountSectionActive}
          getPartyDisplayName={getPartyDisplayName}
          handleCloseForm={handleCloseForm}
          handleSubmit={handleSubmit}
          handleChange={handleChange}
          handleReceiptDateBlur={handleReceiptDateBlur}
          handlePartyFocus={handlePartyFocus}
          handleReceiptAccountFocus={handleReceiptAccountFocus}
          handlePartyInputChange={handlePartyInputChange}
          handleReceiptAccountInputChange={handleReceiptAccountInputChange}
          handlePartyInputKeyDown={handlePartyInputKeyDown}
          handleReceiptAccountInputKeyDown={handleReceiptAccountInputKeyDown}
          selectParty={selectParty}
          selectReceiptAccount={selectReceiptAccount}
        />
      </>
    );
  }

  return (
    <MoneyVoucherList
      title="Money Received"
      subtitle="Money collected from your parties"
      addLabel="New Receipt"
      onAdd={handleOpenForm}
      error={error}
      stats={[
        { icon: Receipt, label: 'Receipts', tone: 'blue', value: String(receipts.length), hint: 'Entries in this list' },
        { icon: IndianRupee, label: 'Amount Received', tone: 'emerald', amount: totalReceipts, hint: 'Total of this list' },
        { icon: IndianRupee, label: 'Total Receivable', tone: 'amber', amount: totalReceivable, hint: 'Sales minus receipts' }
      ]}
      listTitle="Receipts"
      accountLabel="Received In"
      amountClass="text-emerald-700"
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search receipts..."
      dateFilter={dateFilter}
      onDateFilterChange={setDateFilter}
      loading={loading && !showForm}
      rows={receipts.map((receipt) => ({
        id: receipt._id,
        number: formatReceiptNumber(receipt.receiptNumber),
        date: formatDisplayDate(receipt.receiptDate),
        party: receipt.party ? getPartyDisplayName(receipt.party) : '',
        account: receipt.method,
        reference: receipt.refType === 'sale' ? 'Against Sale' : 'On Account',
        notes: receipt.notes,
        amount: Number(receipt.amount || 0)
      }))}
      emptyTitle="No receipts found"
      emptyHint='Use "New Receipt" to record money you received.'
      canDelete={canDeleteReceipts}
      onDelete={handleDelete}
    >
      <AddReceiptPopup
        showForm={showForm}
        loading={loading}
        formData={formData}
        parties={parties}
        receiptAccountOptions={receiptAccountOptions}
        partySectionRef={partySectionRef}
        receiptAccountSectionRef={receiptAccountSectionRef}
        partyQuery={partyQuery}
        receiptAccountQuery={receiptAccountQuery}
        partyListIndex={partyListIndex}
        receiptAccountListIndex={receiptAccountListIndex}
        filteredParties={filteredParties}
        filteredReceiptAccounts={filteredReceiptAccounts}
        isPartySectionActive={isPartySectionActive}
        isReceiptAccountSectionActive={isReceiptAccountSectionActive}
        setFormData={setFormData}
        setPartyListIndex={setPartyListIndex}
        setReceiptAccountListIndex={setReceiptAccountListIndex}
        setIsPartySectionActive={setIsPartySectionActive}
        setIsReceiptAccountSectionActive={setIsReceiptAccountSectionActive}
        getPartyDisplayName={getPartyDisplayName}
        handleCloseForm={handleCloseForm}
        handleSubmit={handleSubmit}
        handleChange={handleChange}
        handleReceiptDateBlur={handleReceiptDateBlur}
        handlePartyFocus={handlePartyFocus}
        handleReceiptAccountFocus={handleReceiptAccountFocus}
        handlePartyInputChange={handlePartyInputChange}
        handleReceiptAccountInputChange={handleReceiptAccountInputChange}
        handlePartyInputKeyDown={handlePartyInputKeyDown}
        handleReceiptAccountInputKeyDown={handleReceiptAccountInputKeyDown}
        selectParty={selectParty}
        selectReceiptAccount={selectReceiptAccount}
      />
    </MoneyVoucherList>
  );
}
