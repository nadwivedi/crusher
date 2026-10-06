import { fmt, formatDate, monthLabel } from '../payrollUtils';

/** Salary payments and advances, newest first. */
export default function PaymentList({ payments, employeesById }) {
  if (payments.length === 0) {
    return (
      <div className="px-6 py-14 text-center">
        <p className="font-semibold text-slate-800">No payments yet</p>
        <p className="text-sm text-slate-500">Salary payments and advances will show here.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[680px] text-left">
        <thead>
          <tr>
            <th className="tbl-head">Date</th>
            <th className="tbl-head">Employee</th>
            <th className="tbl-head">Type</th>
            <th className="tbl-head">For Month</th>
            <th className="tbl-head">Paid By</th>
            <th className="tbl-head text-right">Amount</th>
            <th className="tbl-head">Notes</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((payment) => {
            const employee = employeesById[payment.employeeId];
            return (
              <tr key={payment._id} className="tbl-row">
                <td className="tbl-cell whitespace-nowrap">{formatDate(payment.date)}</td>
                <td className="tbl-cell">
                  <p className="font-semibold text-slate-800">{employee?.name || '-'}</p>
                  <p className="text-xs text-slate-500">{employee?.role}</p>
                </td>
                <td className="tbl-cell">
                  <span className={payment.type === 'salary' ? 'badge-green' : 'badge-orange'}>{payment.type === 'salary' ? 'Salary' : 'Advance'}</span>
                </td>
                <td className="tbl-cell whitespace-nowrap">{monthLabel(payment.month)}</td>
                <td className="tbl-cell">{payment.mode}</td>
                <td className="tbl-cell whitespace-nowrap text-right font-semibold text-slate-800">{fmt(payment.amount)}</td>
                <td className="tbl-cell text-slate-500">{payment.notes || '-'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
