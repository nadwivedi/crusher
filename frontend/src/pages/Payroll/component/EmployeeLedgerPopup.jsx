import { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import apiClient from '../../../utils/api';
import { ENTRY_TYPES, fmt, fmtNum, formatDate, rateLabel, shortMonthLabel } from '../payrollUtils';

const cell = (value, tone = 'text-slate-700') => (Math.round(value) ? <span className={tone}>{fmt(value)}</span> : <span className="text-slate-300">-</span>);

/** One employee's statement: month by month since joining, and every payment, advance, bonus and deduction. */
export default function EmployeeLedgerPopup({ employee, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [view, setView] = useState('months');

  useEffect(() => {
    let ignore = false;
    apiClient.get(`/payroll/employees/${employee._id}/ledger`)
      .then((response) => { if (!ignore) setData(response); })
      .catch((err) => { if (!ignore) setError(err?.message || 'Could not load the ledger'); });
    return () => { ignore = true; };
  }, [employee._id]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const balance = data?.balance ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 md:p-4" onClick={onClose}>
      <div className="flex max-h-[95vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl md:rounded-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 bg-gradient-to-r from-[#1f2a3c] via-[#27374f] to-[#314866] px-4 py-3 text-white md:px-5">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold">{employee.name} · Ledger</h2>
            <p className="text-xs text-slate-300">{[employee.role, rateLabel(employee)].filter(Boolean).join(' · ')}</p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {data && (
              <div className="text-right">
                <p className="text-[11px] text-slate-300">{balance < 0 ? 'Advance to recover' : 'Balance to pay'}</p>
                <p className="text-lg font-bold">{fmt(Math.abs(balance))}</p>
              </div>
            )}
            <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 hover:bg-white/20"><X size={18} /></button>
          </div>
        </div>

        <div className="flex gap-2 border-b border-slate-200 px-4 py-2 md:px-5">
          {[{ key: 'months', label: 'Month-wise' }, { key: 'entries', label: 'Payments & Advances' }].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setView(tab.key)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${view === tab.key ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-200 text-slate-600'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto">
          {error && <p className="m-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
          {!data && !error && (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500"><Loader2 size={18} className="animate-spin" /> Loading…</div>
          )}

          {data && view === 'months' && (
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr>
                  <th className="tbl-head">Month</th>
                  <th className="tbl-head text-right">Days</th>
                  <th className="tbl-head text-right">Brought Fwd</th>
                  <th className="tbl-head text-right">Net Pay</th>
                  <th className="tbl-head text-right">Advance</th>
                  <th className="tbl-head text-right">Paid</th>
                  <th className="tbl-head text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {data.months.map((month) => (
                  <tr key={month.monthKey} className="tbl-row">
                    <td className="tbl-cell whitespace-nowrap font-semibold text-slate-800">{shortMonthLabel(month.monthKey)}</td>
                    <td className="tbl-cell text-right">
                      <p>{fmtNum(month.paidDays)}</p>
                      <p className="whitespace-nowrap text-[11px] text-slate-500">{month.present}P · {month.half}H · {month.leave}L · {month.absent}A</p>
                    </td>
                    <td className="tbl-cell whitespace-nowrap text-right">{cell(month.opening, month.opening < 0 ? 'text-rose-600' : 'text-slate-700')}</td>
                    <td className="tbl-cell whitespace-nowrap text-right">
                      {cell(month.netPay, 'font-semibold text-slate-900')}
                      {(month.bonus > 0 || month.deduction > 0 || month.overtimePay > 0) && (
                        <p className="text-[11px] text-slate-500">
                          {[month.overtimePay > 0 && `OT ${fmt(month.overtimePay)}`, month.bonus > 0 && `+${fmt(month.bonus)}`, month.deduction > 0 && `−${fmt(month.deduction)}`].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </td>
                    <td className="tbl-cell whitespace-nowrap text-right">{cell(month.advance, 'text-amber-700')}</td>
                    <td className="tbl-cell whitespace-nowrap text-right">{cell(month.paid, 'text-emerald-700')}</td>
                    <td className={`tbl-cell whitespace-nowrap text-right font-bold ${month.balance < 0 ? 'text-rose-700' : 'text-slate-900'}`}>{fmt(month.balance)}</td>
                  </tr>
                ))}
              </tbody>
              {Math.round(data.openingBalance) !== 0 && (
                <tfoot>
                  <tr>
                    <td className="tbl-cell text-xs text-slate-500" colSpan={7}>
                      Opening balance when added: {data.openingBalance < 0 ? `advance of ${fmt(-data.openingBalance)}` : `${fmt(data.openingBalance)} due`}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}

          {data && view === 'entries' && (data.entries.length === 0 ? (
            <p className="px-6 py-14 text-center text-sm text-slate-500">No payments, advances, bonuses or deductions yet.</p>
          ) : (
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr>
                  <th className="tbl-head">Date</th>
                  <th className="tbl-head">Type</th>
                  <th className="tbl-head">For Month</th>
                  <th className="tbl-head">Paid From</th>
                  <th className="tbl-head text-right">Amount</th>
                  <th className="tbl-head">Notes</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map((entry) => (
                  <tr key={entry._id} className="tbl-row">
                    <td className="tbl-cell whitespace-nowrap">{formatDate(entry.dateKey)}</td>
                    <td className="tbl-cell"><span className={ENTRY_TYPES[entry.type]?.badge}>{ENTRY_TYPES[entry.type]?.short}</span></td>
                    <td className="tbl-cell whitespace-nowrap">{shortMonthLabel(entry.monthKey)}</td>
                    <td className="tbl-cell">{ENTRY_TYPES[entry.type]?.money ? entry.accountName || 'Cash Account' : '-'}</td>
                    <td className="tbl-cell whitespace-nowrap text-right font-semibold">{ENTRY_TYPES[entry.type]?.sign} {fmt(entry.amount)}</td>
                    <td className="tbl-cell text-slate-500">{entry.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}
        </div>
      </div>
    </div>
  );
}
