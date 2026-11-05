import { Pencil, Trash2 } from 'lucide-react';
import { ENTRY_TYPES, fmt, formatDate, shortMonthLabel } from '../payrollUtils';

/** Salary paid, advances, bonuses and deductions of the month, newest first. */
export default function PaymentList({ entries, employeesById, onEdit, onDelete }) {
  if (entries.length === 0) {
    return (
      <div className="px-6 py-14 text-center">
        <p className="font-semibold text-slate-800">Nothing for this month yet</p>
        <p className="text-sm text-slate-500">Salary paid, advances, bonuses and deductions will show here.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left">
        <thead>
          <tr>
            <th className="tbl-head">Date</th>
            <th className="tbl-head">Employee</th>
            <th className="tbl-head">Type</th>
            <th className="tbl-head">For Month</th>
            <th className="tbl-head">Paid From</th>
            <th className="tbl-head text-right">Amount</th>
            <th className="tbl-head">Notes</th>
            <th className="tbl-head text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const employee = employeesById[entry.employee];
            const type = ENTRY_TYPES[entry.type];
            return (
              <tr key={entry._id} className="tbl-row">
                <td className="tbl-cell whitespace-nowrap">{formatDate(entry.dateKey)}</td>
                <td className="tbl-cell">
                  <p className="font-semibold text-slate-800">{employee?.name || entry.employeeName || '-'}</p>
                  <p className="text-xs text-slate-500">{employee?.role}</p>
                </td>
                <td className="tbl-cell"><span className={type?.badge}>{type?.short}</span></td>
                <td className="tbl-cell whitespace-nowrap">{shortMonthLabel(entry.monthKey)}</td>
                <td className="tbl-cell">{type?.money ? entry.accountName || 'Cash Account' : <span className="text-slate-400">No money moved</span>}</td>
                <td className={`tbl-cell whitespace-nowrap text-right font-semibold ${entry.type === 'bonus' ? 'text-blue-700' : entry.type === 'deduction' ? 'text-rose-600' : 'text-slate-800'}`}>
                  {type?.sign} {fmt(entry.amount)}
                </td>
                <td className="tbl-cell max-w-[220px] truncate text-slate-500" title={entry.notes}>{entry.notes || '-'}</td>
                <td className="tbl-cell">
                  <div className="flex justify-end gap-1">
                    <button type="button" className="icon-btn" title="Edit" aria-label="Edit" onClick={() => onEdit(entry)}>
                      <Pencil size={15} />
                    </button>
                    <button type="button" className="icon-btn text-rose-600" title="Delete" aria-label="Delete" onClick={() => onDelete(entry)}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
