import { ChevronRight } from 'lucide-react';
import { formatHireDate, formatRupees, getHireStatus } from '../../../utils/monthlyHire';

const TH = 'tbl-head px-3 py-2 first:pl-5 last:pr-5';
const TD = 'tbl-cell px-3 py-2 first:pl-5 last:pr-5';

/** Monthly hires, each opening its detail. showParty: false on a party's own page. */
export default function MonthlyHireList({ hires, onOpen, showParty = true }) {
  return (
    <>
      <ul className="divide-y divide-slate-100 md:hidden">
        {hires.map((hire) => {
          const status = getHireStatus(hire);
          const isPayable = hire.direction !== 'receivable';
          return (
            <li key={hire._id}>
              <button type="button" onClick={() => onOpen(hire)} className="w-full px-4 py-2.5 text-left active:bg-slate-50">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="min-w-0 truncate text-sm font-semibold text-slate-800">
                    {showParty ? hire.partyName || '—' : hire.vehicleNo || (isPayable ? 'Hired vehicle' : 'My vehicle given')}
                  </p>
                  <p className={`shrink-0 text-sm font-bold ${isPayable ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {formatRupees(hire.monthlyRate)}<span className="text-xs font-semibold"> /mo</span>
                  </p>
                </div>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate text-xs text-slate-500">
                    {showParty && hire.vehicleNo ? `${hire.vehicleNo} · ` : ''}From {formatHireDate(hire.startDate)}
                  </span>
                  <span className={status.className}>{status.label}</span>
                </div>
                <p className="text-[11px] text-slate-400">In ledger {formatRupees(hire.bookedAmount)} · {hire.bookedMonths} month(s)</p>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[760px] text-left">
          <thead>
            <tr>
              <th className={TH}>{showParty ? 'Party / Vehicle' : 'Vehicle'}</th>
              <th className={TH}>Period</th>
              <th className={TH}>Status</th>
              <th className={`${TH} text-right`}>Per Month</th>
              <th className={`${TH} text-right`}>In Ledger</th>
              <th className={`${TH} w-8`} />
            </tr>
          </thead>
          <tbody>
            {hires.map((hire) => {
              const status = getHireStatus(hire);
              const isPayable = hire.direction !== 'receivable';
              return (
                <tr key={hire._id} onClick={() => onOpen(hire)} className="tbl-row cursor-pointer">
                  <td className={TD}>
                    {showParty && <p className="max-w-[18rem] truncate font-semibold text-slate-800" title={hire.partyName || undefined}>{hire.partyName || '—'}</p>}
                    <span className={showParty ? 'text-[11px] text-slate-400' : 'font-semibold text-slate-800'}>
                      {showParty
                        ? `${isPayable ? 'Hired vehicle' : 'My vehicle given'}${hire.vehicleNo ? ` · ${hire.vehicleNo}` : ''}`
                        : hire.vehicleNo || (isPayable ? 'Hired vehicle' : 'My vehicle given')}
                    </span>
                  </td>
                  <td className={`${TD} whitespace-nowrap`}>
                    {formatHireDate(hire.startDate)} → {status.stop ? formatHireDate(status.stop) : 'until cancelled'}
                  </td>
                  <td className={TD}><span className={status.className}>{status.label}</span></td>
                  <td className={`${TD} whitespace-nowrap text-right font-semibold ${isPayable ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {formatRupees(hire.monthlyRate)}
                  </td>
                  <td className={`${TD} whitespace-nowrap text-right`}>
                    <span className="font-bold text-slate-900">{formatRupees(hire.bookedAmount)}</span>
                    <span className="block text-[11px] text-slate-400">{hire.bookedMonths} month(s)</span>
                  </td>
                  <td className={`${TD} text-slate-300`}><ChevronRight size={16} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
