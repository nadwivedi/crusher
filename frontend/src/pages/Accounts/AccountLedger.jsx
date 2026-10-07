import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Inbox, Trash2, Wallet } from 'lucide-react';
import apiClient from '../../utils/api';
import StatCard from '../../components/StatCard';
import Segmented from '../../components/Segmented';
import TransferPopup from './component/TransferPopup';
import { ACCOUNT_TYPES, ENTRY_TYPES, fmt, formatDate, toDateKey } from './accountUtils';

const TOAST_OPTIONS = { autoClose: 1200 };

const daysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};
const startOfMonth = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1);

// `get` returns [from, to]; no `get` means the whole history
const RANGES = [
  { key: 'month', label: 'This Month', get: () => [startOfMonth(), new Date()] },
  { key: 'today', label: 'Today', get: () => [new Date(), new Date()] },
  { key: 'last7', label: 'Last 7 Days', get: () => [daysAgo(6), new Date()] },
  { key: 'last30', label: 'Last 30 Days', get: () => [daysAgo(29), new Date()] },
  { key: 'all', label: 'All' },
  { key: 'custom', label: 'Custom' }
];

const rangeFor = (key) => {
  const preset = RANGES.find((range) => range.key === key);
  if (!preset?.get) return { from: '', to: '' };
  const [from, to] = preset.get();
  return { from: toDateKey(from), to: toDateKey(to) };
};

/** One account's entries with the running balance, for a chosen period. */
export default function AccountLedger() {
  const { id } = useParams();
  const [ledger, setLedger] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rangeKey, setRangeKey] = useState('month');
  const [range, setRange] = useState(() => rangeFor('month'));
  const [custom, setCustom] = useState(range);
  const [reloadKey, setReloadKey] = useState(0);
  // Summary rows for the transfer popup, loaded when it is opened
  const [transferAccounts, setTransferAccounts] = useState(null);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    apiClient.get(`/banks/${id}/ledger`, { params: { fromDate: range.from || undefined, toDate: range.to || undefined } })
      .then((response) => {
        if (ignore) return;
        setLedger(response);
        setError('');
      })
      .catch((err) => {
        if (!ignore) setError(err?.message || 'Unable to load the ledger');
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => { ignore = true; };
  }, [id, range, reloadKey]);

  const selectRange = (key) => {
    setRangeKey(key);
    if (key === 'custom') {
      setCustom(range.from ? range : rangeFor('month'));
      return;
    }
    setRange(rangeFor(key));
  };

  const customValid = custom.from && custom.to && custom.from <= custom.to;
  const applyCustom = () => { if (customValid) setRange({ ...custom }); };

  const openTransfer = async () => {
    try {
      const summary = await apiClient.get('/banks/summary');
      setTransferAccounts(summary.accounts || []);
    } catch (err) {
      toast.error(err?.message || 'Unable to load accounts');
    }
  };

  const saveTransfer = async (payload) => {
    await apiClient.post('/banks/transfers', payload);
    toast.success('Transfer saved', TOAST_OPTIONS);
    setTransferAccounts(null);
    setReloadKey((key) => key + 1);
  };

  const deleteTransfer = async (entry) => {
    if (!window.confirm(`Delete this transfer of ${fmt(entry.inAmount || entry.outAmount)}? Both accounts will be corrected.`)) return;
    try {
      await apiClient.delete(`/banks/transfers/${entry.refId}`);
      toast.success('Transfer deleted', TOAST_OPTIONS);
      setReloadKey((key) => key + 1);
    } catch (err) {
      toast.error(err?.message || 'Could not delete the transfer');
    }
  };

  const account = ledger?.account;
  const entries = ledger?.entries || [];
  // The API sends oldest first (that is how the balance runs); show the newest on top
  const rows = [...entries].reverse();
  const periodLabel = RANGES.find((item) => item.key === rangeKey)?.label;
  const periodText = range.from ? `${formatDate(range.from)} – ${formatDate(range.to)}` : 'All entries';

  const stats = [
    { icon: Wallet, label: 'Opening Balance', tone: 'slate', value: fmt(ledger?.openingBalance), hint: range.from ? `Before ${formatDate(range.from)}` : 'Starting balance' },
    { icon: ArrowDownLeft, label: 'Money In', tone: 'emerald', value: fmt(ledger?.moneyIn), hint: periodLabel },
    { icon: ArrowUpRight, label: 'Money Out', tone: 'rose', value: fmt(ledger?.moneyOut), hint: periodLabel },
    { icon: Wallet, label: 'Closing Balance', tone: 'blue', value: fmt(ledger?.closingBalance), hint: range.to ? `On ${formatDate(range.to)}` : 'Balance now' }
  ];

  return (
    <div className="page-fade-in space-y-4 px-3 pb-8 pt-4 md:space-y-5 lg:px-6 lg:pt-5">
      <div className="page-header">
        <div className="min-w-0">
          <h1 className="page-title flex flex-wrap items-center gap-2">
            {account?.name || 'Account Ledger'}
            {account && <span className={ACCOUNT_TYPES[account.type].badge}>{ACCOUNT_TYPES[account.type].label}</span>}
          </h1>
          <p className="page-subtitle">Ledger · {periodText}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented options={RANGES} value={rangeKey} onChange={selectRange} />
          <button type="button" className="btn-secondary" onClick={openTransfer}>
            <ArrowLeftRight size={16} /> Transfer
          </button>
        </div>
      </div>

      {rangeKey === 'custom' && (
        <div className="card flex flex-wrap items-end gap-3">
          <div>
            <label className="label">From</label>
            <input type="date" className="input" value={custom.from} max={custom.to || undefined}
              onChange={(event) => setCustom({ ...custom, from: event.target.value })} />
          </div>
          <div>
            <label className="label">To</label>
            <input type="date" className="input" value={custom.to} min={custom.from || undefined}
              onChange={(event) => setCustom({ ...custom, to: event.target.value })} />
          </div>
          <button type="button" className="btn-primary" onClick={applyCustom} disabled={!customValid}>Apply</button>
          {!customValid && <p className="pb-2 text-xs font-medium text-rose-600">"From" date must be on or before "To" date</p>}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div>
      )}

      {loading && !ledger ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-primary-600 border-r-transparent" />
          <p className="text-sm text-slate-400">Loading ledger…</p>
        </div>
      ) : ledger && (
        <div className={`space-y-4 transition-opacity md:space-y-5 ${loading ? 'pointer-events-none opacity-50' : ''}`}>
          <section className="grid grid-cols-2 gap-2.5 md:gap-4 xl:grid-cols-4">
            {stats.map((stat) => <StatCard key={stat.label} {...stat} />)}
          </section>

          <section className="panel">
            <div className="panel-header flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Entries</h2>
                <p className="text-xs text-slate-500">Newest first, with the balance after each entry</p>
              </div>
              <span className="badge-gray">{entries.length} entr{entries.length === 1 ? 'y' : 'ies'}</span>
            </div>

            {rows.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <Inbox size={22} />
                </span>
                <p className="text-sm font-semibold text-slate-800">No entries in this period</p>
                <p className="text-xs text-slate-500">The balance stays at {fmt(ledger.closingBalance)}.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left">
                  <thead>
                    <tr>
                      <th className="tbl-head">Date</th>
                      <th className="tbl-head">Details</th>
                      <th className="tbl-head text-right">Money In</th>
                      <th className="tbl-head text-right">Money Out</th>
                      <th className="tbl-head text-right">Balance</th>
                      <th className="tbl-head" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((entry, index) => {
                      const type = ENTRY_TYPES[entry.type] || { label: entry.type, badge: 'badge-gray' };
                      return (
                        <tr key={`${entry.type}-${entry.refId}-${index}`} className="tbl-row">
                          <td className="tbl-cell whitespace-nowrap">{formatDate(entry.date)}</td>
                          <td className="tbl-cell">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                              <span className={type.badge}>{type.label}</span>
                              <span className="font-semibold text-slate-800">{entry.partyName || '-'}</span>
                              {entry.number && <span className="text-xs text-slate-400">{entry.number}</span>}
                            </div>
                            {entry.notes && <p className="mt-0.5 text-xs text-slate-500">{entry.notes}</p>}
                          </td>
                          <td className="tbl-cell whitespace-nowrap text-right font-semibold text-emerald-700">{entry.inAmount > 0 ? fmt(entry.inAmount) : '-'}</td>
                          <td className="tbl-cell whitespace-nowrap text-right font-semibold text-rose-700">{entry.outAmount > 0 ? fmt(entry.outAmount) : '-'}</td>
                          <td className={`tbl-cell whitespace-nowrap text-right font-bold ${entry.balance < 0 ? 'text-rose-700' : 'text-slate-900'}`}>{fmt(entry.balance)}</td>
                          <td className="tbl-cell text-right">
                            {entry.type === 'transfer' && (
                              <button type="button" className="icon-btn hover:bg-rose-50 hover:text-rose-600" title="Delete transfer" onClick={() => deleteTransfer(entry)}>
                                <Trash2 size={16} />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-slate-200 bg-slate-50">
                      <td className="tbl-cell font-bold text-slate-900" colSpan={2}>Opening balance {range.from ? `before ${formatDate(range.from)}` : ''}</td>
                      <td className="tbl-cell" />
                      <td className="tbl-cell" />
                      <td className="tbl-cell whitespace-nowrap text-right font-bold text-slate-900">{fmt(ledger.openingBalance)}</td>
                      <td className="tbl-cell" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {transferAccounts && (
        <TransferPopup accounts={transferAccounts} defaultFromId={id} onSave={saveTransfer} onClose={() => setTransferAccounts(null)} />
      )}
    </div>
  );
}
