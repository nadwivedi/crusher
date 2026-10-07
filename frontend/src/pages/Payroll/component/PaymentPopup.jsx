import { useState } from 'react';
import FormPopup from '../../../components/FormPopup';
import { PAYMENT_MODES, fmt, monthLabel, toDateKey } from '../payrollUtils';

/** Pay salary for the selected month, or give an advance. type: 'salary' | 'advance' */
export default function PaymentPopup({ type, salaryRows, monthKey, defaultEmployeeId = '', onSave, onClose }) {
  const isSalary = type === 'salary';
  const [employeeId, setEmployeeId] = useState(defaultEmployeeId || salaryRows[0]?.employee._id || '');
  const row = salaryRows.find((item) => item.employee._id === employeeId);
  const [amount, setAmount] = useState(() => (isSalary && row?.balance > 0 ? String(row.balance) : ''));
  const [date, setDate] = useState(toDateKey(new Date()));
  const [mode, setMode] = useState(PAYMENT_MODES[0]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const selectEmployee = (id) => {
    setEmployeeId(id);
    const next = salaryRows.find((item) => item.employee._id === id);
    if (isSalary) setAmount(next?.balance > 0 ? String(next.balance) : '');
  };

  const handleSubmit = () => {
    const value = Number(amount);
    if (!employeeId) return setError('Choose an employee');
    if (!Number.isFinite(value) || value <= 0) return setError('Enter the amount');
    onSave({ employeeId, type, amount: value, date, mode, notes: notes.trim(), month: isSalary ? monthKey : date.slice(0, 7) });
  };

  return (
    <FormPopup
      title={isSalary ? 'Pay Salary' : 'Give Advance'}
      subtitle={isSalary ? `Salary for ${monthLabel(monthKey)}` : 'Advance is cut from that month\'s salary'}
      submitLabel={isSalary ? 'Pay Salary' : 'Give Advance'}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}

      <div>
        <label className="label">Employee</label>
        <select className="input" value={employeeId} onChange={(event) => selectEmployee(event.target.value)}>
          {salaryRows.map(({ employee }) => (
            <option key={employee._id} value={employee._id}>{employee.name} · {employee.role}</option>
          ))}
        </select>
      </div>

      {row && (
        <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-xl bg-slate-200 ring-1 ring-slate-200">
          {[
            { label: 'Earned', value: fmt(row.earned), tone: 'text-slate-900' },
            { label: 'Advance + Paid', value: fmt(row.advance + row.paid), tone: 'text-amber-700' },
            { label: 'Balance', value: fmt(row.balance), tone: row.balance < 0 ? 'text-rose-700' : 'text-emerald-700' }
          ].map((stat) => (
            <div key={stat.label} className="bg-white px-3 py-2">
              <dt className="text-[11px] font-medium text-slate-500">{stat.label}</dt>
              <dd className={`text-sm font-bold ${stat.tone}`}>{stat.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Amount (₹)</label>
          <input className="input" type="number" min="0" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0" autoFocus />
        </div>
        <div>
          <label className="label">Date</label>
          <input className="input" type="date" value={date} max={toDateKey(new Date())} onChange={(event) => setDate(event.target.value)} />
        </div>
      </div>

      <div>
        <label className="label">Paid By</label>
        <div className="grid grid-cols-3 gap-2">
          {PAYMENT_MODES.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setMode(option)}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                mode === option ? 'border-primary-600 bg-primary-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label">Notes</label>
        <input className="input" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional" />
      </div>
    </FormPopup>
  );
}
