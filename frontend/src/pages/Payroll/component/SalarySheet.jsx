import { Banknote, HandCoins, Info } from 'lucide-react';
import { SALARY_TYPES, fmt, fmtNum, rateLabel } from '../payrollUtils';

/** Month-wise salary sheet: what each employee earned, took as advance, was paid, and is still owed. */
export default function SalarySheet({ rows, totals, monthName, daysInMonth, onPay, onAdvance }) {
  if (rows.length === 0) {
    return (
      <div className="px-6 py-14 text-center">
        <p className="font-semibold text-slate-800">No employees yet</p>
        <p className="text-sm text-slate-500">Add an employee to start the salary sheet.</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left">
          <thead>
            <tr>
              <th className="tbl-head">Employee</th>
              <th className="tbl-head">Salary</th>
              <th className="tbl-head text-right">Days Worked</th>
              <th className="tbl-head text-right">Earned</th>
              <th className="tbl-head text-right">Advance</th>
              <th className="tbl-head text-right">Paid</th>
              <th className="tbl-head text-right">Balance</th>
              <th className="tbl-head text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.employee._id} className="tbl-row">
                <td className="tbl-cell">
                  <p className="font-semibold text-slate-800">{row.employee.name}</p>
                  <p className="text-xs text-slate-500">{row.employee.role}</p>
                </td>
                <td className="tbl-cell">
                  <p className="whitespace-nowrap font-medium text-slate-800">{rateLabel(row.employee)}</p>
                  <span className={row.employee.salaryType === 'monthly' ? 'badge-blue' : 'badge-orange'}>
                    {SALARY_TYPES[row.employee.salaryType].label}
                  </span>
                </td>
                <td className="tbl-cell text-right">
                  <p className="font-semibold text-slate-800">{fmtNum(row.daysWorked)}</p>
                  <p className="whitespace-nowrap text-xs text-slate-500">{row.present}P · {row.half}H · {row.absent}A</p>
                </td>
                <td className="tbl-cell whitespace-nowrap text-right font-semibold text-slate-800">{fmt(row.earned)}</td>
                <td className="tbl-cell whitespace-nowrap text-right text-amber-700">{row.advance > 0 ? fmt(row.advance) : '-'}</td>
                <td className="tbl-cell whitespace-nowrap text-right text-emerald-700">{row.paid > 0 ? fmt(row.paid) : '-'}</td>
                <td className={`tbl-cell whitespace-nowrap text-right font-bold ${row.balance < 0 ? 'text-rose-700' : 'text-slate-900'}`}>
                  {fmt(row.balance)}
                </td>
                <td className="tbl-cell">
                  <div className="flex items-center justify-end gap-1.5">
                    <button type="button" className="btn-secondary btn-sm" onClick={() => onAdvance(row.employee._id)}>
                      <HandCoins size={14} /> Advance
                    </button>
                    <button type="button" className="btn-primary btn-sm" onClick={() => onPay(row.employee._id)} disabled={row.balance <= 0}>
                      <Banknote size={14} /> Pay
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200 bg-slate-50">
              <td className="tbl-cell font-bold text-slate-900" colSpan={3}>Total for {monthName}</td>
              <td className="tbl-cell whitespace-nowrap text-right font-bold text-slate-900">{fmt(totals.earned)}</td>
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
          Monthly salary is counted per day worked (salary ÷ {daysInMonth} days this month). Daily wage is the wage × days worked.
          A half day counts as half. Balance = earned − advance − paid.
        </span>
      </p>
    </>
  );
}
