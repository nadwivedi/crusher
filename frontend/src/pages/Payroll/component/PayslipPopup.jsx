import { createPortal } from 'react-dom';
import { MessageCircle, Printer, X } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { ENTRY_TYPES, SALARY_TYPES, fmt, fmtNum, formatDate, monthLabel, rateLabel, whatsappUrl } from '../payrollUtils';

// Only the slip is printed: everything else on the page is hidden while printing
const PRINT_CSS = `
.payslip-print { display: none; }
@media print {
  @page { size: A5; margin: 10mm; }
  body > *:not(.payslip-print) { display: none !important; }
  .payslip-print { display: block !important; }
}`;

function Slip({ row, entries, monthKey, daysInMonth, crusher }) {
  const { employee } = row;
  const lines = [
    { label: `Pay for ${fmtNum(row.paidDays)} paid days`, value: row.earned - row.overtimePay },
    row.overtimePay > 0 && { label: `Overtime ${fmtNum(row.overtimeHours)} hrs`, value: row.overtimePay },
    row.bonus > 0 && { label: 'Bonus / Incentive', value: row.bonus },
    row.deduction > 0 && { label: 'Deduction / Fine', value: -row.deduction }
  ].filter(Boolean);

  return (
    <div className="text-sm text-slate-900">
      <div className="border-b-2 border-slate-800 pb-2 text-center">
        <p className="text-lg font-bold uppercase">{crusher.name || 'Payslip'}</p>
        {crusher.address && <p className="text-xs">{crusher.address}</p>}
        <p className="mt-1 text-sm font-semibold">Salary Slip · {monthLabel(monthKey)}</p>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 border-b border-slate-300 py-2 text-xs">
        <p><span className="text-slate-500">Name:</span> <b>{employee.name}</b></p>
        <p><span className="text-slate-500">Work:</span> {employee.role || '-'}</p>
        <p><span className="text-slate-500">Salary:</span> {rateLabel(employee)} ({SALARY_TYPES[employee.salaryType]?.label})</p>
        <p><span className="text-slate-500">Mobile:</span> {employee.mobile || '-'}</p>
      </div>

      <div className="grid grid-cols-5 gap-1 border-b border-slate-300 py-2 text-center text-xs">
        {[
          { label: 'Present', value: row.present },
          { label: 'Half Day', value: row.half },
          { label: 'Paid Leave', value: row.leave },
          { label: 'Absent', value: row.absent },
          { label: 'Paid Days', value: `${fmtNum(row.paidDays)}/${daysInMonth}` }
        ].map((item) => (
          <div key={item.label}>
            <p className="text-slate-500">{item.label}</p>
            <p className="font-bold">{item.value}</p>
          </div>
        ))}
      </div>

      <table className="mt-2 w-full text-xs">
        <tbody>
          {lines.map((line) => (
            <tr key={line.label}>
              <td className="py-0.5">{line.label}</td>
              <td className="py-0.5 text-right">{line.value < 0 ? `− ${fmt(-line.value)}` : fmt(line.value)}</td>
            </tr>
          ))}
          <tr className="border-t border-slate-300 font-bold">
            <td className="py-1">Net Pay for {monthLabel(monthKey)}</td>
            <td className="py-1 text-right">{fmt(row.netPay)}</td>
          </tr>
          {Math.round(row.opening) !== 0 && (
            <tr>
              <td className="py-0.5">{row.opening < 0 ? 'Advance brought forward' : 'Balance brought forward'}</td>
              <td className="py-0.5 text-right">{row.opening < 0 ? `− ${fmt(-row.opening)}` : fmt(row.opening)}</td>
            </tr>
          )}
          {entries.filter((entry) => ENTRY_TYPES[entry.type]?.money).map((entry) => (
            <tr key={entry._id}>
              <td className="py-0.5">{ENTRY_TYPES[entry.type].short} · {formatDate(entry.dateKey)}{entry.notes ? ` · ${entry.notes}` : ''}</td>
              <td className="py-0.5 text-right">− {fmt(entry.amount)}</td>
            </tr>
          ))}
          <tr className="border-t-2 border-slate-800 text-sm font-bold">
            <td className="py-1.5">{row.balance < 0 ? 'Advance still to recover' : 'Balance to pay'}</td>
            <td className="py-1.5 text-right">{fmt(Math.abs(row.balance))}</td>
          </tr>
        </tbody>
      </table>

      <div className="mt-10 grid grid-cols-2 gap-6 text-center text-xs">
        <p className="border-t border-slate-400 pt-1">Employee Signature</p>
        <p className="border-t border-slate-400 pt-1">Authorised Signature</p>
      </div>
    </div>
  );
}

/** One employee's salary slip for the month: print it, or send it on WhatsApp. */
export default function PayslipPopup({ row, entries, monthKey, daysInMonth, onClose }) {
  const { user } = useAuth();
  const crusher = { name: user?.name || '', address: user?.businessAddress || '' };
  const { employee } = row;

  const share = () => {
    const text = [
      `*${crusher.name || 'Salary Slip'}*`,
      `Salary Slip · ${monthLabel(monthKey)}`,
      `Name: ${employee.name}${employee.role ? ` (${employee.role})` : ''}`,
      '',
      `Days: ${row.present} present, ${row.half} half, ${row.leave} leave, ${row.absent} absent = ${fmtNum(row.paidDays)} paid days`,
      `Earned: ${fmt(row.earned)}${row.overtimePay > 0 ? ` (incl. OT ${fmt(row.overtimePay)})` : ''}`,
      row.bonus > 0 ? `Bonus: + ${fmt(row.bonus)}` : '',
      row.deduction > 0 ? `Deduction: − ${fmt(row.deduction)}` : '',
      `Net pay: ${fmt(row.netPay)}`,
      Math.round(row.opening) !== 0 ? `Brought forward: ${fmt(row.opening)}` : '',
      row.advance > 0 ? `Advance taken: − ${fmt(row.advance)}` : '',
      row.paid > 0 ? `Salary paid: − ${fmt(row.paid)}` : '',
      `*${row.balance < 0 ? 'Advance to recover' : 'Balance to pay'}: ${fmt(Math.abs(row.balance))}*`
    ].filter((line) => line !== '').join('\n');
    window.location.href = whatsappUrl(employee.mobile, text);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 md:p-4" onClick={onClose}>
      <style>{PRINT_CSS}</style>
      <div className="flex max-h-[95vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-2xl md:rounded-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <h2 className="text-base font-bold text-slate-900">Payslip · {employee.name}</h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <Slip row={row} entries={entries} monthKey={monthKey} daysInMonth={daysInMonth} crusher={crusher} />
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 p-3">
          <button type="button" className="btn-secondary" onClick={share}>
            <MessageCircle size={16} /> WhatsApp
          </button>
          <button type="button" className="btn-primary" onClick={() => window.print()}>
            <Printer size={16} /> Print
          </button>
        </div>
      </div>
      {createPortal(
        <div className="payslip-print">
          <Slip row={row} entries={entries} monthKey={monthKey} daysInMonth={daysInMonth} crusher={crusher} />
        </div>,
        document.body
      )}
    </div>
  );
}
