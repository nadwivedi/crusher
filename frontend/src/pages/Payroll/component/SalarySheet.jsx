import { Banknote, BookOpen, FileText, HandCoins, Info } from 'lucide-react';
import { SALARY_TYPES, fmt, fmtNum, rateLabel } from '../payrollUtils';

const money = (value, tone = '') => (Math.round(value) ? <span className={tone}>{fmt(value)}</span> : <span className="text-slate-300">-</span>);

function Actions({ row, onPay, onAdvance, onPayslip, onLedger, compact = false }) {
  return (
    <div className={`flex items-center gap-1.5 ${compact ? '' : 'justify-end'}`}>
      <button type="button" className="icon-btn" title="Payslip" aria-label="Payslip" onClick={() => onPayslip(row)}>
        <FileText size={15} />
      </button>
      <button type="button" className="icon-btn" title="Employee ledger" aria-label="Employee ledger" onClick={() => onLedger(row.employee)}>
        <BookOpen size={15} />
      </button>
      <button type="button" className="btn-secondary btn-sm" onClick={() => onAdvance(row.employee._id)} disabled={!row.employee.isActive}>
        <HandCoins size={14} /> Advance
      </button>
      <button type="button" className="btn-primary btn-sm" onClick={() => onPay(row.employee._id)} disabled={row.balance <= 0}>
        <Banknote size={14} /> Pay
      </button>
    </div>
  );
}

/**
 * Month-wise salary sheet: balance brought forward, what each employee earned (attendance + overtime + bonus − deduction),
 * advance and salary paid, and what is still owed.
 */
export default function SalarySheet({ rows, totals, monthName, daysInMonth, onPay, onAdvance, onPayslip, onLedger }) {
  if (rows.length === 0) {
    return (
      <div className="px-6 py-14 text-center">
        <p className="font-semibold text-slate-800">No employees for this month</p>
        <p className="text-sm text-slate-500">Add an employee, then mark attendance to build the salary sheet.</p>
      </div>
    );
  }

  const actionProps = { onPay, onAdvance, onPayslip, onLedger };

  return (
    <>
      {/* Phones: one card per employee */}
      <ul className="divide-y divide-slate-100 md:hidden">
        {rows.map((row) => (
          <li key={row.employee._id} className="space-y-2 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-800">
                  {row.employee.name}
                  {!row.employee.isActive && <span className="badge-gray ml-1.5 align-middle">Left</span>}
                </p>
                <p className="text-xs text-slate-500">{[row.employee.role, rateLabel(row.employee)].filter(Boolean).join(' · ')}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className={`text-base font-bold ${row.balance < 0 ? 'text-rose-700' : 'text-slate-900'}`}>{fmt(row.balance)}</p>
                <p className="text-[11px] text-slate-500">{row.balance < 0 ? 'Advance to recover' : 'Balance to pay'}</p>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-1.5 text-center text-[11px]">
              {[
                { label: 'Days', value: fmtNum(row.paidDays) },
                { label: 'Earned', value: fmt(row.netPay) },
                { label: 'Advance', value: fmt(row.advance) },
                { label: 'Paid', value: fmt(row.paid) }
              ].map((stat) => (
                <div key={stat.label} className="rounded-lg bg-slate-50 px-1 py-1.5 ring-1 ring-inset ring-slate-100">
                  <p className="text-slate-500">{stat.label}</p>
                  <p className="font-semibold text-slate-800">{stat.value}</p>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-500">
              {row.present}P · {row.half}H · {row.leave}L · {row.absent}A
              {row.overtimeHours > 0 && ` · OT ${fmtNum(row.overtimeHours)}h`}
              {Math.round(row.opening) !== 0 && ` · Brought forward ${fmt(row.opening)}`}
            </p>
            <Actions row={row} {...actionProps} compact />
          </li>
        ))}
      </ul>

      {/* Tablets and up: the full sheet */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[1080px] text-left">
          <thead>
            <tr>
              <th className="tbl-head">Employee</th>
              <th className="tbl-head">Salary</th>
              <th className="tbl-head text-right">Days</th>
              <th className="tbl-head text-right">Earned</th>
              <th className="tbl-head text-right">Bonus / Ded.</th>
              <th className="tbl-head text-right">Brought Fwd</th>
              <th className="tbl-head text-right">Advance</th>
              <th className="tbl-head text-right">Paid</th>
              <th className="tbl-head text-right">Balance</th>
              <th className="tbl-head text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.employee._id} className={`tbl-row ${row.employee.isActive ? '' : 'bg-slate-50/60'}`}>
                <td className="tbl-cell">
                  <p className="font-semibold text-slate-800">
                    {row.employee.name}
                    {!row.employee.isActive && <span className="badge-gray ml-1.5 align-middle">Left</span>}
                  </p>
                  <p className="text-xs text-slate-500">{row.employee.role || '-'}</p>
                </td>
                <td className="tbl-cell">
                  <p className="whitespace-nowrap font-medium text-slate-800">{rateLabel(row.employee)}</p>
                  <span className={row.employee.salaryType === 'monthly' ? 'badge-blue' : 'badge-orange'}>
                    {SALARY_TYPES[row.employee.salaryType]?.label}
                  </span>
                </td>
                <td className="tbl-cell text-right">
                  <p className="font-semibold text-slate-800">{fmtNum(row.paidDays)}</p>
                  <p className="whitespace-nowrap text-xs text-slate-500">{row.present}P · {row.half}H · {row.leave}L · {row.absent}A</p>
                </td>
                <td className="tbl-cell whitespace-nowrap text-right">
                  <p className="font-semibold text-slate-800">{fmt(row.earned)}</p>
                  {row.overtimeHours > 0 && <p className="text-xs text-slate-500">incl. OT {fmtNum(row.overtimeHours)}h · {fmt(row.overtimePay)}</p>}
                </td>
                <td className="tbl-cell whitespace-nowrap text-right text-xs">
                  {row.bonus > 0 && <p className="font-semibold text-blue-700">+ {fmt(row.bonus)}</p>}
                  {row.deduction > 0 && <p className="font-semibold text-rose-600">− {fmt(row.deduction)}</p>}
                  {!row.bonus && !row.deduction && <span className="text-slate-300">-</span>}
                </td>
                <td className="tbl-cell whitespace-nowrap text-right">{money(row.opening, row.opening < 0 ? 'text-rose-600' : 'text-slate-700')}</td>
                <td className="tbl-cell whitespace-nowrap text-right">{money(row.advance, 'text-amber-700')}</td>
                <td className="tbl-cell whitespace-nowrap text-right">{money(row.paid, 'text-emerald-700')}</td>
                <td className={`tbl-cell whitespace-nowrap text-right font-bold ${row.balance < 0 ? 'text-rose-700' : 'text-slate-900'}`}>
                  {fmt(row.balance)}
                </td>
                <td className="tbl-cell">
                  <Actions row={row} {...actionProps} />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200 bg-slate-50">
              <td className="tbl-cell font-bold text-slate-900" colSpan={3}>Total for {monthName}</td>
              <td className="tbl-cell whitespace-nowrap text-right font-bold text-slate-900">{fmt(totals.earned)}</td>
              <td className="tbl-cell whitespace-nowrap text-right text-xs font-bold">
                {totals.bonus > 0 && <p className="text-blue-700">+ {fmt(totals.bonus)}</p>}
                {totals.deduction > 0 && <p className="text-rose-600">− {fmt(totals.deduction)}</p>}
              </td>
              <td className="tbl-cell whitespace-nowrap text-right font-bold text-slate-700">{fmt(totals.opening)}</td>
              <td className="tbl-cell whitespace-nowrap text-right font-bold text-amber-700">{fmt(totals.advance)}</td>
              <td className="tbl-cell whitespace-nowrap text-right font-bold text-emerald-700">{fmt(totals.paid)}</td>
              <td className="tbl-cell whitespace-nowrap text-right font-bold text-slate-900">{fmt(totals.balance)}</td>
              <td className="tbl-cell" />
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="flex items-start gap-2 border-t border-slate-100 px-4 py-3 text-xs text-slate-500 md:px-5">
        <Info size={14} className="mt-0.5 shrink-0 text-slate-400" />
        <span>
          Monthly salary is earned per day marked (salary ÷ {daysInMonth} days this month); daily wage is the wage × days.
          Half day counts as half, paid leave as a full day. Balance = brought forward + earned + bonus − deduction − advance − paid,
          and it carries into next month.
        </span>
      </p>
    </>
  );
}
