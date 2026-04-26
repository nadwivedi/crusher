import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import apiClient from '../utils/api';

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

const formatCurrency = (value) => `Rs ${Number(value || 0).toLocaleString('en-IN', {
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
  const quantity = Number(row?.quantity || 0);
  if (!Number.isFinite(quantity) || quantity <= 0) return '-';

  if (row?.type === 'sale') {
    return isPerCubicMeter(row?.pricingMode) ? `${formatQuantity(quantity)} m3` : formatWeightWithTon(quantity);
  }

  if (row?.type === 'boulder') {
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

const getTypeMeta = (type) => {
  if (type === 'sale') {
    return {
      label: 'Sale',
      className: 'border-amber-200 bg-amber-50 text-amber-700'
    };
  }

  if (type === 'purchase') {
    return {
      label: 'Purchase',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700'
    };
  }

  if (type === 'receipt') {
    return {
      label: 'Receipt',
      className: 'border-sky-200 bg-sky-50 text-sky-700'
    };
  }

  if (type === 'payment') {
    return {
      label: 'Payment',
      className: 'border-violet-200 bg-violet-50 text-violet-700'
    };
  }

  if (type === 'purchase return') {
    return {
      label: 'Purchase Return',
      className: 'border-rose-200 bg-rose-50 text-rose-700'
    };
  }

  if (type === 'sale return') {
    return {
      label: 'Sale Return',
      className: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700'
    };
  }

  return {
    label: formatLabel(type),
    className: 'border-slate-200 bg-slate-100 text-slate-700'
  };
};

const getBalanceHint = (value) => {
  if (Number(value || 0) > 0) return 'Receivable';
  if (Number(value || 0) < 0) return 'Payable';
  return 'Settled';
};

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

const getEntryTypeLabel = (row) => String(row?.displayType || row?.type || '-');

const isLedgerDetailSupported = (row) => Boolean(row?.refId && row?.type);

function VoucherDetailModal({ detail, loading, error, onClose }) {
  if (!detail && !loading && !error) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3" onClick={onClose}>
      <div
        className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-gradient-to-r from-slate-900 via-cyan-900 to-sky-800 px-5 py-4 text-white">
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
  const [filterType, setFilterType] = useState('custom');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLedgerEntry, setSelectedLedgerEntry] = useState(null);
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

      if (row.type === 'purchase return') {
        acc.totalPurchaseReturns += amount;
        acc.purchaseReturnQty += quantity;
      }

      if (row.type === 'sale return') {
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

  const handleApplyFilter = async () => {
    const resolvedRange = resolveDateRange(filterType, fromDate, toDate, selectedMonth);

    if (filterType === 'monthwise' && !selectedMonth) {
      setError('Please select a month for month-wise ledger.');
      return;
    }

    setFromDate(resolvedRange.fromDate);
    setToDate(resolvedRange.toDate);
    await loadPartyDetails(true, resolvedRange);
  };

  const handleClearFilter = async () => {
    setFilterType('custom');
    setSelectedMonth('');
    setFromDate('');
    setToDate('');
    await loadPartyDetails(true, { fromDate: '', toDate: '' });
  };

  const handleOpenVoucherDetail = async (row) => {
    if (!isLedgerDetailSupported(row)) return;

    setSelectedLedgerEntry(row);
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
    setSelectedLedgerEntry(null);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50 to-pink-50">
      <div className="w-full px-3 md:px-4 lg:px-6 pt-4 lg:pt-6 pb-8">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h1 className="truncate text-xl font-bold text-gray-900 flex items-center gap-2">
              <Link
                to="/reports/party-ledger"
                aria-label="Back to party ledger"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:border-gray-300 hover:text-gray-900"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              {party?.name || 'Party Ledger'}
            </h1>
            <button
              onClick={handleShareOnWhatsApp}
              disabled={!party?.mobile}
              className="flex shrink-0 items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#20bd5a] disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
              </svg>
              <span className="hidden sm:inline">Share Ledger</span>
            </button>
          </div>
          <p className="mb-4 text-xs text-gray-500 md:text-sm pl-10">
            {party?.type ? `Type: ${formatLabel(party.type)}` : 'Type: -'}
            {' | '}
            {`Mobile: ${party?.mobile || '-'}`}
            {party?.address ? ` | ${party.address}` : ''}
          </p>

          {error ? (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              {error}
            </div>
          ) : null}
        </div>


      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden mt-6">
        <div className="px-6 py-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Transaction Ledger</h2>
                <p className="text-xs text-gray-600">
                  Sale, purchase, receipt, payment, boulder, and return history.
                </p>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="px-4 py-10 text-center text-sm text-slate-500">Loading...</div>
        ) : (
          <div className="p-3 md:p-4">
            <div className="space-y-3 md:hidden">
              {sortedLedgerRows.map((row, index) => {
                const typeMeta = getTypeMeta(row.type);

                return (
                  <article
                    key={`${row.refId || 'party-ledger'}-${index}`}
                    className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/50 p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${typeMeta.className}`}>
                          {getEntryTypeLabel(row)}
                        </span>
                        <div className="flex flex-col items-start">
                          <p className="text-xs font-medium text-slate-500">{formatDate(row.date)}</p>
                          {isLedgerDetailSupported(row) ? (
                            <button
                              type="button"
                              onClick={() => handleOpenVoucherDetail(row)}
                              className="text-xs font-semibold text-blue-600 underline decoration-blue-300 underline-offset-2 transition hover:text-blue-800"
                            >
                              {row.refNumber && row.refNumber !== '-' ? row.refNumber : 'View details'}
                            </button>
                          ) : (
                            <p className="text-xs text-slate-600">{row.refNumber || '-'}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        {row.type === 'sale' || row.type === 'purchase' ? (
                          <div className="mt-3 space-y-2 rounded-xl bg-slate-50 p-3">
                            <div className="flex justify-between items-center text-[11px]">
                              <span className="text-slate-500 uppercase font-bold tracking-wider">{row.type === 'sale' ? 'Sale Total' : 'Purchase Total'}</span>
                              <span className="font-black text-slate-800">{formatCurrency(row.amount)}</span>
                            </div>
                            <div className="flex justify-between items-center text-[11px]">
                              <span className="text-slate-500 uppercase font-bold tracking-wider">Paid Amount</span>
                              <span className="font-black text-emerald-600">{formatCurrency(row.paidAmount)}</span>
                            </div>
                            <div className="flex justify-between items-center text-[11px] pt-1 border-t border-slate-200">
                              <span className="text-slate-500 uppercase font-bold tracking-wider">{row.type === 'sale' ? 'Sale Balance' : 'Purchase Balance'}</span>
                              <span className={`font-black ${Number(row.impact || 0) !== 0 ? (Number(row.impact || 0) > 0 ? 'text-rose-600' : 'text-emerald-600') : 'text-slate-400'}`}>
                                {formatCurrency(Math.abs(Number(row.impact || 0)))}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-3 flex justify-between items-center rounded-xl bg-slate-50 p-3 text-[11px]">
                            <span className="text-slate-500 uppercase font-bold tracking-wider">Amount</span>
                            <span className="font-black text-slate-900">{formatCurrency(row.amount)}</span>
                          </div>
                        )}
                        <p className={`mt-2 text-xs font-semibold ${Number(row.displayRunningBalance || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          Bal {formatCurrency(row.displayRunningBalance)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between rounded-xl bg-slate-100/80 px-3 py-2 text-xs">
                        <div className="min-w-0">
                          <p className="font-medium uppercase tracking-wider text-slate-500">{getLedgerMaterialType(row)}</p>
                          <p className="mt-1 font-semibold text-slate-800">{formatLedgerQuantity(row)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium uppercase tracking-wider text-slate-500">Vehicle</p>
                          <p className="mt-1 font-semibold text-slate-800">{getLedgerVehicleNumber(row)}</p>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[1000px] border-separate border-spacing-0">
                <thead className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider rounded-tl-xl">Date & Ref</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Type</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Material & Vehicle</th>
                    <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider">Quantity</th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">Total</th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">Paid</th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">Balance</th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider rounded-tr-xl">Running Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {sortedLedgerRows.map((row, index) => {
                    const typeMeta = getTypeMeta(row.type);

                    return (
                      <tr key={`${row.refId || 'party-ledger'}-${index}`} className="transition-colors hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{formatDate(row.date)}</p>
                            {isLedgerDetailSupported(row) ? (
                              <button
                                type="button"
                                onClick={() => handleOpenVoucherDetail(row)}
                                className="text-xs font-semibold text-blue-600 underline decoration-blue-300 underline-offset-2 transition hover:text-blue-800"
                              >
                                {row.refNumber && row.refNumber !== '-' ? row.refNumber : 'View details'}
                              </button>
                            ) : (
                              <p className="text-xs text-slate-500">{row.refNumber || '-'}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${typeMeta.className}`}>
                            {getEntryTypeLabel(row)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-slate-800">{getLedgerMaterialType(row)}</p>
                            <p className="text-xs text-slate-500">{getLedgerVehicleNumber(row)}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <p className="text-sm font-semibold text-slate-800">{formatLedgerQuantity(row)}</p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className="text-sm font-bold text-slate-800">{formatCurrency(row.amount)}</p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className="text-sm font-bold text-emerald-600">
                            {(row.type === 'sale' || row.type === 'purchase') ? formatCurrency(row.paidAmount) : '-'}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className={`text-sm font-bold ${Number(row.impact || 0) !== 0 ? (Number(row.impact || 0) > 0 ? 'text-rose-600' : 'text-emerald-600') : 'text-slate-400'}`}>
                            {(row.type === 'sale' || row.type === 'purchase') ? formatCurrency(Math.abs(Number(row.impact || 0))) : '-'}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className={`text-sm font-black ${(row.displayRunningBalance || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {formatCurrency(row.displayRunningBalance)}
                          </p>
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

      <VoucherDetailModal
        detail={voucherDetail}
        loading={voucherLoading}
        error={voucherError}
        onClose={handleCloseVoucherDetail}
      />
      </div>
    </div>
  );
}
