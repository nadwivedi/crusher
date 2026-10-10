import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowDownLeft, ArrowLeft, ArrowUpRight, Inbox, Scale, ShoppingCart } from 'lucide-react';
import apiClient from '../utils/api';
import StatCard from '../components/StatCard';
import Segmented from '../components/Segmented';

const toInputDate = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})}`;

const formatQuantity = (value) => Number(value || 0).toLocaleString('en-IN', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});

const isPerCubicMeter = (value) => ['per_cubic_meter', 'per cubic meter'].includes(String(value || '').trim().toLowerCase());

const formatWeightWithTon = (value) => {
  const quantity = Number(value || 0);
  if (!Number.isFinite(quantity) || quantity <= 0) return '-';
  return `${formatQuantity(quantity)} kg (${formatQuantity(quantity / 1000)} ton)`;
};

const formatLedgerQuantity = (row) => {
  // Transport is counted in km, tons, days...; the server sends it ready to show
  if (row?.type === 'transport') return row.quantityLabel || '-';

  const quantity = Number(row?.quantity || 0);
  if (!Number.isFinite(quantity) || quantity <= 0) return '-';

  if (row?.type === 'sale' || row?.type === 'saleReturn') {
    return isPerCubicMeter(row?.pricingMode) ? `${formatQuantity(quantity)} m3` : formatWeightWithTon(quantity);
  }

  if (row?.type === 'boulder') {
    if (row?.entryMode === 'bulk' && Number(row?.tripCount || 0) > 0) {
      return `${formatQuantity(row.tripCount)} trips x ${formatQuantity(Number(row.averageWeight || 0) / 1000)} ton = ${formatQuantity(quantity / 1000)} ton`;
    }
    return formatWeightWithTon(quantity);
  }

  return formatQuantity(quantity);
};

const formatSaleSummaryQuantity = (summary) => {
  const parts = [];

  if (Number(summary?.saleQtyKg || 0) > 0) {
    parts.push(formatWeightWithTon(summary.saleQtyKg));
  }

  if (Number(summary?.saleQtyM3 || 0) > 0) {
    parts.push(`${formatQuantity(summary.saleQtyM3)} m3`);
  }

  return parts.length > 0 ? parts.join(' / ') : '-';
};

const formatLabel = (value) => {
  const normalized = String(value || '').trim();
  if (!normalized) return '-';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const TYPE_BADGES = {
  sale: { label: 'Sale', className: 'badge-orange' },
  purchase: { label: 'Purchase', className: 'badge-green' },
  receipt: { label: 'Receipt', className: 'badge-blue' },
  payment: { label: 'Payment', className: 'badge-gray' },
  expense: { label: 'Expense', className: 'badge-red' },
  transport: { label: 'Transport', className: 'badge-orange' },
  boulder: { label: 'Boulder', className: 'badge-green' },
  purchaseReturn: { label: 'Purchase Return', className: 'badge-red' },
  saleReturn: { label: 'Sale Return', className: 'badge-red' }
};

const getTypeMeta = (type) => TYPE_BADGES[type] || { label: formatLabel(type), className: 'badge-gray' };

const getBalanceHint = (value) => {
  if (Number(value || 0) > 0) return 'Receivable';
  if (Number(value || 0) < 0) return 'Payable';
  return 'Settled';
};

// "₹12,000 Dr" (they owe me) / "₹8,000 Cr" (I owe them)
const formatBalance = (value) => {
  const amount = Number(value || 0);
  if (amount === 0) return formatCurrency(0);
  return `${formatCurrency(Math.abs(amount))} ${amount > 0 ? 'Dr' : 'Cr'}`;
};

const PERIODS = [
  { key: '', label: 'All Time', shortLabel: 'All' },
  { key: 'last7Days', label: '7 Days' },
  { key: 'last30Days', label: '30 Days' },
  { key: 'last1Year', label: '1 Year' }
];

const TH = 'tbl-head px-3 py-2 first:pl-5 last:pr-5';
const TD = 'tbl-cell px-3 py-2.5 first:pl-5 last:pr-5';

const getLedgerMaterialType = (row) => {
  const materialType = String(row?.materialType || '').trim();
  if (materialType) return materialType;
  if (row?.type === 'sale') return 'Material';
  if (row?.type === 'boulder') return 'Boulder';
  return '-';
};

const getLedgerVehicleNumber = (row) => {
  const vehicleNo = String(row?.vehicleNo || row?.method || '').trim();
  return vehicleNo || '-';
};

// Entries that carry their own total / paid / balance
const hasPaidAmount = (row) => ['sale', 'purchase', 'expense'].includes(row?.type);

const getEntryTypeLabel = (row) => String(row?.displayType || row?.type || '-');

const isLedgerDetailSupported = (row) => Boolean(row?.refId && row?.type);

function VoucherDetailModal({ detail, loading, error, onClose }) {
  if (!detail && !loading && !error) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3" onClick={onClose}>
      <div
        className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 bg-gradient-to-r from-[#1f2a3c] via-[#27374f] to-[#314866] px-5 py-4 text-white">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100">Voucher Detail</p>
            <h2 className="mt-1 text-xl font-bold">{detail?.title || 'Loading details'}</h2>
            {detail ? (
              <p className="mt-1 text-sm text-cyan-50">
                {detail.refNumber || '-'} | {detail.partyName || '-'}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
            aria-label="Close voucher detail"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="max-h-[calc(92vh-88px)] overflow-y-auto p-5">
          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-12 text-center text-sm text-slate-500">
              Loading voucher details...
            </div>
          ) : null}

          {!loading && error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {!loading && !error && detail ? (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Amount</p>
                  <p className="mt-1 text-lg font-bold text-slate-900">{formatCurrency(detail.amount)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Date</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{formatDate(detail.date)}</p>
                  <p className="mt-1 text-xs font-medium text-slate-500">{detail.refNumber || '-'}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Qty</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{formatLedgerQuantity(detail)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Method</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{detail.method || '-'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {(detail.fields || []).map((field) => (
                  <div key={`${field.label}-${field.value || 'empty'}`} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{field.label}</p>
                    <p className="mt-1 text-sm font-medium text-slate-800">
                      {field.label.toLowerCase().includes('date') ? formatDate(field.value) : (field.value || '-')}
                    </p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Account</p>
                  <p className="mt-1 text-sm font-medium text-slate-800">{detail.accountName || '-'}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Opened</p>
                  <p className="mt-1 text-sm font-medium text-slate-800">{formatDateTime(detail.date)}</p>
                </div>
              </div>

              {detail.linkedReference ? (
                <div className="rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-cyan-700">Linked Reference</p>
                  <p className="mt-1 text-sm font-semibold text-cyan-900">{detail.linkedReference}</p>
                </div>
              ) : null}

              {detail.notes ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Notes</p>
                  <p className="mt-1 text-sm text-slate-700">{detail.notes}</p>
                </div>
              ) : null}

              {(detail.items || []).length > 0 ? (
                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                    <h3 className="text-sm font-semibold text-slate-900">Items</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[520px] text-sm">
                      <thead className="bg-white text-slate-600">
                        <tr>
                          <th className="border-b border-slate-200 px-4 py-3 text-left font-semibold">Product</th>
                          <th className="border-b border-slate-200 px-4 py-3 text-center font-semibold">Qty</th>
                          <th className="border-b border-slate-200 px-4 py-3 text-center font-semibold">Rate</th>
                          <th className="border-b border-slate-200 px-4 py-3 text-center font-semibold">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.items.map((item) => (
                          <tr key={item.id} className="bg-white">
                            <td className="border-b border-slate-100 px-4 py-3">
                              <p className="font-medium text-slate-800">{item.productName}</p>
                              {item.unit ? <p className="text-xs text-slate-500">{item.unit}</p> : null}
                            </td>
                            <td className="border-b border-slate-100 px-4 py-3 text-center font-medium text-slate-800">{formatQuantity(item.quantity)}</td>
                            <td className="border-b border-slate-100 px-4 py-3 text-center font-medium text-slate-800">{formatCurrency(item.unitPrice)}</td>
                            <td className="border-b border-slate-100 px-4 py-3 text-center font-semibold text-slate-900">{formatCurrency(item.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

const resolveDateRange = (filterType, fromDate, toDate, monthKey) => {
  const now = new Date();

  if (filterType === 'last7Days') {
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 6);
    return {
      fromDate: toInputDate(startDate),
      toDate: toInputDate(now)
    };
  }

  if (filterType === 'last30Days') {
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 29);
    return {
      fromDate: toInputDate(startDate),
      toDate: toInputDate(now)
    };
  }

  if (filterType === 'last1Year') {
    const startDate = new Date(now);
    startDate.setFullYear(startDate.getFullYear() - 1);
    return {
      fromDate: toInputDate(startDate),
      toDate: toInputDate(now)
    };
  }

  if (filterType === 'monthwise' && monthKey) {
    const [year, month] = monthKey.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    return {
      fromDate: toInputDate(startDate),
      toDate: toInputDate(endDate)
    };
  }

  return {
    fromDate: fromDate || '',
    toDate: toDate || ''
  };
};

export default function PartyDetail() {
  const { id } = useParams();
  const [party, setParty] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [period, setPeriod] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [voucherDetail, setVoucherDetail] = useState(null);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherError, setVoucherError] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      const popup = document.querySelector('.fixed.inset-0.z-50');
      if (popup) return;
      e.preventDefault();
      e.stopPropagation();
      navigate('/reports/party-ledger');
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [navigate]);

  const loadPartyDetails = async (showLoader = true, overrides = {}) => {
    try {
      if (showLoader) {
        setLoading(true);
      }

      const queryFromDate = overrides.fromDate !== undefined ? overrides.fromDate : fromDate;
      const queryToDate = overrides.toDate !== undefined ? overrides.toDate : toDate;

      const [partyResponse, ledgerResponse] = await Promise.all([
        apiClient.get('/parties'),
        apiClient.get('/reports/party-ledger', {
          params: {
            partyId: id,
            fromDate: queryFromDate || undefined,
            toDate: queryToDate || undefined
          }
        })
      ]);

      const matchedParty = (Array.isArray(partyResponse) ? partyResponse : []).find((item) => String(item._id) === String(id)) || null;
      setParty(matchedParty);
      setLedger(Array.isArray(ledgerResponse) ? ledgerResponse : []);
      setError('');
    } catch (err) {
      setError(err.message || 'Error loading party details');
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!id) return;
    loadPartyDetails(true);
  }, [id]);

  const summary = useMemo(() => {
    return ledger.reduce((acc, row) => {
      const amount = Number(row.amount || 0);
      const quantity = Number(row.quantity || 0);

      acc.entries += 1;

      if (row.type === 'sale') {
        acc.totalSales += amount;
        if (isPerCubicMeter(row.pricingMode)) {
          acc.saleQtyM3 += quantity;
        } else {
          acc.saleQtyKg += quantity;
        }
      }

      if (row.type === 'purchase') {
        acc.totalPurchases += amount;
        acc.purchaseQty += quantity;
      }

      if (row.type === 'receipt') {
        acc.totalReceipts += amount;
      }

      if (row.type === 'payment') {
        acc.totalPayments += amount;
      }

      if (row.type === 'boulder') {
        acc.totalBoulderPayable += amount;
        acc.boulderQty += quantity;
      }

      if (row.type === 'purchaseReturn') {
        acc.totalPurchaseReturns += amount;
        acc.purchaseReturnQty += quantity;
      }

      if (row.type === 'saleReturn') {
        acc.totalSaleReturns += amount;
      }

      return acc;
    }, {
      entries: 0,
      totalSales: 0,
      totalPurchases: 0,
      totalReceipts: 0,
      totalPayments: 0,
      totalBoulderPayable: 0,
      totalPurchaseReturns: 0,
      totalSaleReturns: 0,
      saleQty: 0,
      saleQtyKg: 0,
      saleQtyM3: 0,
      purchaseQty: 0,
      boulderQty: 0,
      purchaseReturnQty: 0
    });
  }, [ledger]);

  const closingBalance = ledger.length > 0 ? Number(ledger[ledger.length - 1].runningBalance || 0) : 0;

  const sortedLedgerRows = useMemo(() => {
    const closing = ledger.length > 0 ? Number(ledger[ledger.length - 1].runningBalance || 0) : 0;
    const sortedRows = [...ledger].sort((firstRow, secondRow) => {
      const firstTime = new Date(firstRow.entryCreatedAt || firstRow.date).getTime() || 0;
      const secondTime = new Date(secondRow.entryCreatedAt || secondRow.date).getTime() || 0;
      return secondTime - firstTime;
    });

    let reverseRunningBalance = closing;

    return sortedRows.map((row) => {
      const displayRunningBalance = reverseRunningBalance;
      reverseRunningBalance -= Number(row.impact || 0);

      return {
        ...row,
        displayRunningBalance
      };
    });
  }, [ledger]);

  // The ledger for a period: all time, or the last 7 days, 30 days or year
  const choosePeriod = async (value) => {
    setPeriod(value);
    const range = value ? resolveDateRange(value, '', '', '') : { fromDate: '', toDate: '' };
    setFromDate(range.fromDate);
    setToDate(range.toDate);
    await loadPartyDetails(true, range);
  };

  const handleOpenVoucherDetail = async (row) => {
    if (!isLedgerDetailSupported(row)) return;

    setVoucherDetail(null);
    setVoucherError('');
    setVoucherLoading(true);

    try {
      const response = await apiClient.get('/reports/party-ledger-entry-detail', {
        params: {
          type: row.type,
          refId: row.refId
        }
      });

      setVoucherDetail(response || null);
    } catch (err) {
      setVoucherError(err.message || 'Error loading voucher detail');
    } finally {
      setVoucherLoading(false);
    }
  };

  const handleCloseVoucherDetail = () => {
    setVoucherDetail(null);
    setVoucherError('');
    setVoucherLoading(false);
  };

  const handleShareOnWhatsApp = () => {
    if (!party || !party.mobile) {
      alert("Party does not have a valid mobile number.");
      return;
    }

    const formatCurrencyText = (val) => `Rs ${Math.abs(Number(val)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    let message = `*🧾 Ledger Summary: ${party.name}*\n`;
    if (party.mobile) message += `📱 *Mobile:* ${party.mobile}\n`;
    message += `🗓 *As of:* ${formatDate(new Date())}\n\n`;

    message += `*Current Status:*\n`;
    if (closingBalance > 0) {
       message += `🔴 *Pending Receivable:* ${formatCurrencyText(closingBalance)}\n`;
    } else if (closingBalance < 0) {
       message += `🟢 *Pending Payable:* ${formatCurrencyText(Math.abs(closingBalance))}\n`;
    } else {
       message += `✅ *Fully Settled* (Zero Balance)\n`;
    }
    
    if (sortedLedgerRows.length > 0) {
       message += `\n*Recent Transactions:*\n`;
       message += `-----------------------------------\n`;
       
       sortedLedgerRows.slice(0, 10).forEach(row => {
          const typeMeta = getTypeMeta(row.type);
          const icon = Number(row.impact) > 0 ? '🔻' : '🟩'; 
          message += `${icon} *${formatDate(row.date)}* | ${typeMeta.label}\n`;
          if (row.refNumber && row.refNumber !== '-') {
             message += `   Ref: ${row.refNumber}\n`;
          }
          message += `   Amount: ${formatCurrencyText(row.amount)}\n`;
          message += `   Bal: ${formatCurrencyText(row.displayRunningBalance)}\n\n`;
       });
       
       message += `-----------------------------------\n`;
       if (closingBalance > 0) {
           message += `*Please clear the pending dues at your earliest convenience.* 🙏\n`;
       }
    }

    let cleanedMobile = String(party.mobile).replace(/\D/g, '');
    if (cleanedMobile.length === 10) {
        cleanedMobile = '91' + cleanedMobile;
    }

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `whatsapp://send?phone=${cleanedMobile}&text=${encodedMessage}`;
    window.location.href = whatsappUrl;
  };

  const boughtTotal = summary.totalPurchases + summary.totalBoulderPayable - summary.totalPurchaseReturns;
  const stats = [
    {
      icon: Scale,
      label: closingBalance > 0 ? 'You Receive' : closingBalance < 0 ? 'You Pay' : 'Balance',
      tone: closingBalance > 0 ? 'emerald' : closingBalance < 0 ? 'rose' : 'indigo',
      value: formatCurrency(Math.abs(closingBalance)),
      hint: closingBalance === 0 ? 'Settled' : `${getBalanceHint(closingBalance)} as of today`
    },
    {
      icon: ArrowUpRight,
      label: 'Sales',
      tone: 'amber',
      value: formatCurrency(summary.totalSales - summary.totalSaleReturns),
      hint: formatSaleSummaryQuantity(summary)
    },
    {
      icon: ShoppingCart,
      label: 'Purchases & Boulder',
      tone: 'blue',
      value: formatCurrency(boughtTotal),
      hint: summary.boulderQty > 0 ? `Boulder ${formatQuantity(summary.boulderQty / 1000)} ton` : 'Bought from this party'
    },
    {
      icon: ArrowDownLeft,
      label: 'Received',
      tone: 'indigo',
      value: formatCurrency(summary.totalReceipts),
      hint: `Paid out ${formatCurrency(summary.totalPayments)}`
    }
  ];

  const partyLine = [
    party?.type ? formatLabel(party.type === 'cash-in-hand' ? 'Cash' : party.type) : '',
    party?.mobile || '',
    party?.address || ''
  ].filter(Boolean).join(' · ');

  return (
    <div className="page-fade-in space-y-3.5 px-3 pb-6 pt-3.5 md:space-y-4 lg:px-6 lg:pt-4">
      <div className="page-header gap-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <Link to="/reports/party-ledger" aria-label="Back to party ledger" className="icon-btn shrink-0">
            <ArrowLeft size={18} />
          </Link>
          <div className="min-w-0">
            <h1 className="page-title truncate">{party?.name || 'Party Ledger'}</h1>
            <p className="page-subtitle truncate">{partyLine || 'Party ledger'}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented options={PERIODS} value={period} onChange={choosePeriod} />
          <button
            type="button"
            onClick={handleShareOnWhatsApp}
            disabled={!party?.mobile}
            title={party?.mobile ? 'Send the ledger summary on WhatsApp' : 'This party has no mobile number'}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#25D366] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#20bd5a] disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
            </svg>
            <span className="hidden sm:inline">Share</span>
          </button>
        </div>
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700">{error}</div>}

      <section className="grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-4">
        {stats.map((stat) => <StatCard key={stat.label} compact {...stat} />)}
      </section>

      <section className="panel">
        <div className="panel-header flex flex-wrap items-baseline justify-between gap-2 py-2.5">
          <h2 className="text-sm font-bold text-slate-800">Ledger</h2>
          <span className="text-xs text-slate-500">
            {summary.entries} entr{summary.entries === 1 ? 'y' : 'ies'} · newest first · Dr = they owe you, Cr = you owe them
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center gap-3 py-14">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-r-transparent" />
            <p className="text-sm text-slate-400">Loading ledger…</p>
          </div>
        ) : sortedLedgerRows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400"><Inbox size={20} /></span>
            <p className="text-sm font-semibold text-slate-800">No entries {period ? 'in this period' : 'yet'}</p>
          </div>
        ) : (
          <>
            {/* Phone: three short lines per entry */}
            <ul className="divide-y divide-slate-100 md:hidden">
              {sortedLedgerRows.map((row, index) => {
                const typeMeta = getTypeMeta(row.type);
                return (
                  <li key={`${row.refId || 'party-ledger'}-${index}`} className="px-4 py-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className={typeMeta.className}>{getEntryTypeLabel(row)}</span>
                      <span className="text-sm font-bold text-slate-900">{formatCurrency(row.amount)}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-3 text-xs text-slate-500">
                      <span className="min-w-0 truncate">
                        {formatDate(row.date)}
                        {' · '}
                        {isLedgerDetailSupported(row) ? (
                          <button type="button" onClick={() => handleOpenVoucherDetail(row)} className="font-semibold text-primary-600">
                            {row.refNumber && row.refNumber !== '-' ? row.refNumber : 'Details'}
                          </button>
                        ) : (row.refNumber || '-')}
                        {getLedgerMaterialType(row) !== '-' ? ` · ${getLedgerMaterialType(row)}` : ''}
                        {getLedgerVehicleNumber(row) !== '-' ? ` · ${getLedgerVehicleNumber(row)}` : ''}
                      </span>
                      <span className={`shrink-0 font-semibold ${Number(row.displayRunningBalance || 0) > 0 ? 'text-emerald-700' : Number(row.displayRunningBalance || 0) < 0 ? 'text-rose-700' : 'text-slate-500'}`}>
                        {formatBalance(row.displayRunningBalance)}
                      </span>
                    </div>
                    {hasPaidAmount(row) && (
                      <p className="text-[11px] text-slate-400">
                        Paid {formatCurrency(row.paidAmount)}
                        {Number(row.impact || 0) !== 0 ? ` · due ${formatCurrency(Math.abs(Number(row.impact || 0)))}` : ''}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[900px] text-left">
                <thead>
                  <tr>
                    <th className={TH}>Date</th>
                    <th className={TH}>Type</th>
                    <th className={TH}>Material / Vehicle</th>
                    <th className={`${TH} text-right`}>Quantity</th>
                    <th className={`${TH} text-right`}>Amount</th>
                    <th className={`${TH} text-right`}>Paid</th>
                    <th className={`${TH} text-right`}>Due</th>
                    <th className={`${TH} text-right`}>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedLedgerRows.map((row, index) => {
                    const typeMeta = getTypeMeta(row.type);
                    const due = Number(row.impact || 0);
                    const runningBalance = Number(row.displayRunningBalance || 0);
                    return (
                      <tr key={`${row.refId || 'party-ledger'}-${index}`} className="tbl-row">
                        <td className={`${TD} whitespace-nowrap`}>
                          {formatDate(row.date)}
                          {isLedgerDetailSupported(row) ? (
                            <button
                              type="button"
                              onClick={() => handleOpenVoucherDetail(row)}
                              className="block text-[11px] font-semibold leading-tight text-primary-600 hover:underline"
                            >
                              {row.refNumber && row.refNumber !== '-' ? row.refNumber : 'View details'}
                            </button>
                          ) : (
                            <span className="block text-[11px] leading-tight text-slate-400">{row.refNumber || '-'}</span>
                          )}
                        </td>
                        <td className={TD}><span className={typeMeta.className}>{getEntryTypeLabel(row)}</span></td>
                        <td className={TD}>
                          <p className="font-medium text-slate-800">{getLedgerMaterialType(row)}</p>
                          {getLedgerVehicleNumber(row) !== '-' && <p className="text-[11px] text-slate-500">{getLedgerVehicleNumber(row)}</p>}
                        </td>
                        <td className={`${TD} whitespace-nowrap text-right text-slate-600`}>{formatLedgerQuantity(row)}</td>
                        <td className={`${TD} whitespace-nowrap text-right font-semibold text-slate-900`}>{formatCurrency(row.amount)}</td>
                        <td className={`${TD} whitespace-nowrap text-right text-emerald-700`}>{hasPaidAmount(row) ? formatCurrency(row.paidAmount) : '—'}</td>
                        <td className={`${TD} whitespace-nowrap text-right ${due > 0 ? 'text-rose-700' : due < 0 ? 'text-emerald-700' : 'text-slate-400'}`}>
                          {hasPaidAmount(row) ? formatCurrency(Math.abs(due)) : '—'}
                        </td>
                        <td className={`${TD} whitespace-nowrap text-right font-bold ${runningBalance > 0 ? 'text-emerald-700' : runningBalance < 0 ? 'text-rose-700' : 'text-slate-500'}`}>
                          {formatBalance(runningBalance)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <VoucherDetailModal
        detail={voucherDetail}
        loading={voucherLoading}
        error={voucherError}
        onClose={handleCloseVoucherDetail}
      />
    </div>
  );
}
