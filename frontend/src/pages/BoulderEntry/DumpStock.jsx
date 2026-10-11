import { useCallback, useEffect, useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, Inbox, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import apiClient from '../../utils/api';
import DumpSiteEntry from './DumpSiteEntry';
import DumpToHopper from './DumpToHopper';
import { formatKg, formatTon } from './dumpUtils';

const TH = 'tbl-head px-3 py-2 first:pl-5 last:pr-5';
const TD = 'tbl-cell px-3 py-2 first:pl-5 last:pr-5';

const formatDate = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const isIn = (row) => row.type === 'to_dump';

const KIND = {
  to_dump: { label: 'Dump Boulder Entry', badge: 'badge-orange' },
  to_hopper: { label: 'Dump Boulder to Hopper', badge: 'badge-blue' }
};

// How the weight was taken: slip, trips × average, or trips fed
const describeWeight = (row) => {
  if (row.type === 'to_dump' && row.entryMode === 'bulk') return `${row.trips} trips × ${formatTon(row.averageWeight)} T`;
  if (row.type === 'to_dump') return `Gross ${formatKg(row.grossWeight)} · Tare ${formatKg(row.tareWeight)} kg`;
  return row.trips ? `${row.trips} trips / buckets` : '';
};

const EMPTY_LEDGER = { openingBalance: 0, closingBalance: 0, currentBalance: 0, totals: {}, rows: [] };

/**
 * Dump boulder stock: Dump Boulder Entry entries in, Dump Boulder to Hopper entries out, with a running balance.
 * fromDate / toDate: the page's period (empty = all time). refreshKey: reload when it changes.
 */
export default function DumpStock({ fromDate, toDate, refreshKey, canEdit }) {
  const [ledger, setLedger] = useState(EMPTY_LEDGER);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // { type: 'to_dump' | 'to_hopper', entry? }
  const [popup, setPopup] = useState(null);

  const loadLedger = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);
      const query = params.toString();
      const response = await apiClient.get(`/dump-stock/ledger${query ? `?${query}` : ''}`);
      setLedger({ ...EMPTY_LEDGER, ...response });
    } catch (err) {
      setError(err?.message || 'Error loading dump stock');
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    loadLedger();
  }, [loadLedger, refreshKey]);

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete ${row.voucherNumber}?`)) return;
    try {
      await apiClient.delete(`/dump-stock/${row._id}`);
      toast.success('Dump entry deleted');
      loadLedger();
    } catch (err) {
      toast.error(err?.message || 'Error deleting dump entry');
    }
  };

  const closePopup = () => {
    setPopup(null);
    loadLedger();
  };

  const { totals = {}, rows = [] } = ledger;
  const hasPeriod = Boolean(fromDate || toDate);

  const summary = [
    { label: 'On dump now', value: `${formatTon(ledger.currentBalance)} T`, tone: 'text-amber-700', strong: true },
    ...(hasPeriod ? [{ label: 'Opening', value: `${formatTon(ledger.openingBalance)} T`, tone: 'text-slate-800' }] : []),
    { label: 'Dump Boulder Entry', value: `+${formatTon(totals.dumped)} T`, tone: 'text-emerald-700' },
    { label: 'Dump Boulder to Hopper', value: `−${formatTon(totals.toHopper)} T`, tone: 'text-blue-700' },
    ...(hasPeriod ? [{ label: 'Closing', value: `${formatTon(ledger.closingBalance)} T`, tone: 'text-slate-900' }] : [])
  ];

  const renderActions = (row) => (canEdit ? (
    <div className="flex items-center justify-end">
      <button type="button" title="Edit" aria-label="Edit" className="icon-btn p-1.5 hover:bg-blue-50 hover:text-blue-600" onClick={() => setPopup({ type: row.type, entry: row })}>
        <Pencil size={16} />
      </button>
      <button type="button" title="Delete" aria-label="Delete" className="icon-btn p-1.5 hover:bg-rose-50 hover:text-rose-600" onClick={() => handleDelete(row)}>
        <Trash2 size={16} />
      </button>
    </div>
  ) : null);

  return (
    <div className={`transition-opacity ${loading ? 'pointer-events-none opacity-60' : ''}`}>
      {popup?.type === 'to_dump' && <DumpSiteEntry editingEntry={popup.entry} onModalFinish={closePopup} />}
      {popup?.type === 'to_hopper' && <DumpToHopper editingEntry={popup.entry} onModalFinish={closePopup} />}

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 md:px-5">
        <dl className="flex flex-wrap gap-x-6 gap-y-1.5">
          {summary.map((item) => (
            <div key={item.label}>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{item.label}</dt>
              <dd className={`${item.strong ? 'text-xl' : 'text-base'} font-bold ${item.tone}`}>{item.value}</dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={() => setPopup({ type: 'to_dump' })}>
            <ArrowUpFromLine size={16} /> Dump Boulder Entry
          </button>
          <button type="button" className="btn-primary" onClick={() => setPopup({ type: 'to_hopper' })}>
            <ArrowDownToLine size={16} /> Dump Boulder to Hopper
          </button>
        </div>
      </div>

      <p className="border-b border-slate-100 bg-slate-50 px-4 py-1.5 text-xs text-slate-500 md:px-5">
        Fed to hopper in this period: <b className="text-slate-700">{formatTon(totals.hopperFeed)} T</b>
        {' '}({formatTon(totals.directToHopper)} T from boulder entries + {formatTon(totals.toHopper)} T from dump)
      </p>

      {error && <p className="px-5 py-3 text-sm font-semibold text-rose-600">{error}</p>}

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <Inbox size={20} />
          </span>
          <p className="text-sm font-semibold text-slate-800">No dump entries {hasPeriod ? 'in this period' : 'yet'}</p>
          <p className="text-xs text-slate-500">Use "Dump Boulder Entry" when boulder is unloaded on the dump instead of the hopper.</p>
        </div>
      ) : (
        <>
          {/* Phone: newest first, one card per entry */}
          <ul className="divide-y divide-slate-100 md:hidden">
            {[...rows].reverse().map((row) => (
              <li key={row._id} className="px-4 py-2.5">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className={`${KIND[row.type]?.badge} shrink-0`}>{KIND[row.type]?.label}</span>
                    <span className="truncate text-xs text-slate-500">{formatDate(row.date)}</span>
                  </div>
                  <span className={`shrink-0 text-sm font-bold ${isIn(row) ? 'text-emerald-700' : 'text-blue-700'}`}>
                    {isIn(row) ? '+' : '−'}{formatTon(row.weight)} T
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-[11px] text-slate-400">
                    {[row.voucherNumber, row.vehicleNo, describeWeight(row), row.notes].filter(Boolean).join(' · ')}
                  </p>
                  <div className="flex shrink-0 items-center gap-1">
                    <span className="text-xs font-semibold text-slate-700">Bal {formatTon(row.balance)} T</span>
                    {renderActions(row)}
                  </div>
                </div>
              </li>
            ))}
            {hasPeriod && (
              <li className="flex justify-between bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600">
                <span>Opening balance</span><span>{formatTon(ledger.openingBalance)} T</span>
              </li>
            )}
          </ul>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[820px] text-left">
              <thead>
                <tr>
                  <th className={TH}>Date</th>
                  <th className={TH}>Entry</th>
                  <th className={TH}>Vehicle / Details</th>
                  <th className={`${TH} text-right`}>In (T)</th>
                  <th className={`${TH} text-right`}>Out (T)</th>
                  <th className={`${TH} text-right`}>Balance (T)</th>
                  <th className={TH} />
                </tr>
              </thead>
              <tbody>
                {hasPeriod && (
                  <tr className="bg-slate-50">
                    <td className={`${TD} font-semibold text-slate-600`} colSpan={5}>Opening balance</td>
                    <td className={`${TD} text-right font-bold text-slate-800`}>{formatTon(ledger.openingBalance)}</td>
                    <td className={TD} />
                  </tr>
                )}
                {rows.map((row) => (
                  <tr key={row._id} className="tbl-row">
                    <td className={`${TD} whitespace-nowrap`}>{formatDate(row.date)}</td>
                    <td className={TD}>
                      <span className={KIND[row.type]?.badge}>{KIND[row.type]?.label}</span>
                      <span className="block text-[11px] text-slate-400">{row.voucherNumber}</span>
                    </td>
                    <td className={TD}>
                      {row.vehicleNo && <span className="font-mono text-xs font-semibold text-slate-800">{row.vehicleNo}</span>}
                      <p className="max-w-[20rem] truncate text-xs text-slate-500" title={row.notes || undefined}>
                        {[describeWeight(row), row.notes].filter(Boolean).join(' · ') || '—'}
                      </p>
                    </td>
                    <td className={`${TD} text-right font-semibold text-emerald-700`}>{row.inWeight ? formatTon(row.inWeight) : ''}</td>
                    <td className={`${TD} text-right font-semibold text-blue-700`}>{row.outWeight ? formatTon(row.outWeight) : ''}</td>
                    <td className={`${TD} text-right font-bold text-slate-900`}>{formatTon(row.balance)}</td>
                    <td className={`${TD} py-1!`}>{renderActions(row)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50">
                  <td className={`${TD} font-bold text-slate-900`} colSpan={3}>{hasPeriod ? 'Closing balance' : 'Balance on dump'}</td>
                  <td className={`${TD} text-right font-semibold text-emerald-700`}>{formatTon(totals.dumped)}</td>
                  <td className={`${TD} text-right font-semibold text-blue-700`}>{formatTon(totals.toHopper)}</td>
                  <td className={`${TD} text-right font-bold text-amber-700`}>{formatTon(ledger.closingBalance)}</td>
                  <td className={TD} />
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
