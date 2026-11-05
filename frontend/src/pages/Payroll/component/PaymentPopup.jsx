import { useMemo, useState } from 'react';
import FormPopup from '../../../components/FormPopup';
import AccountSelect from '../../../components/AccountSelect';
import useAccounts from '../../../utils/useAccounts';
import { handlePopupFormKeyDown } from '../../../utils/popupFormKeyboard';
import { ENTRY_TYPES, fmt, monthLabel, shiftMonth, toDateKey, toMonthKey } from '../payrollUtils';

/**
 * Pay salary, give an advance, or add a bonus / deduction for a month. With `entry`, edits that entry.
 * rows: the salary sheet of the month on screen, for the employee's balance.
 */
export default function PaymentPopup({ type: initialType = 'salary', entry = null, employees, rows, monthKey, defaultEmployeeId = '', saving = false, onSave, onClose }) {
  const { accounts, defaultAccountId } = useAccounts();
  const today = toDateKey(new Date());
  const currentMonth = toMonthKey(new Date());
  const [type, setType] = useState(entry?.type || initialType);
  const [employeeId, setEmployeeId] = useState(entry?.employee || defaultEmployeeId || '');
  // Salary and bonus belong to the month on screen; an advance to the month it is given in
  const [forMonth, setForMonth] = useState(entry?.monthKey || monthKey);
  const row = rows.find((item) => item.employee._id === employeeId);
  const [amount, setAmount] = useState(() => {
    if (entry) return String(entry.amount);
    return initialType === 'salary' && row?.balance > 0 ? String(Math.round(row.balance)) : '';
  });
  const [dateKey, setDateKey] = useState(entry?.dateKey || today);
  const [account, setAccount] = useState(entry?.account || '');
  const [notes, setNotes] = useState(entry?.notes || '');
  const [error, setError] = useState('');
  const info = ENTRY_TYPES[type];

  // Working employees, plus the one already on this entry if they have left
  const choices = useMemo(() => employees.filter((employee) => employee.isActive || employee._id === employeeId), [employees, employeeId]);
  const monthOptions = useMemo(() => {
    const list = [0, -1, -2, -3, -4, -5].map((delta) => shiftMonth(currentMonth, delta));
    if (!list.includes(forMonth)) list.push(forMonth);
    return list;
  }, [currentMonth, forMonth]);

  const pickEmployee = (id) => {
    setEmployeeId(id);
    setError('');
    if (!entry && type === 'salary') {
      const next = rows.find((item) => item.employee._id === id);
      setAmount(next?.balance > 0 ? String(Math.round(next.balance)) : '');
    }
  };

  const pickType = (next) => {
    setType(next);
    setError('');
    if (!entry && next === 'salary' && row?.balance > 0) setAmount(String(Math.round(row.balance)));
  };

  const handleSubmit = () => {
    const value = Number(amount);
    if (!employeeId) return setError('Choose the employee');
    if (!Number.isFinite(value) || value <= 0) return setError('Enter the amount');
    if (!dateKey || dateKey > today) return setError('Choose a date up to today');
    return onSave({
      employee: employeeId,
      type,
      amount: value,
      dateKey,
      monthKey: forMonth,
      account: info.money ? (account || defaultAccountId || '') : '',
      notes: notes.trim()
    });
  };

  const title = entry ? `Edit ${info.short}` : { salary: 'Pay Salary', advance: 'Give Advance', bonus: 'Add Bonus', deduction: 'Add Deduction' }[type];

  return (
    <FormPopup
      title={title}
      subtitle={info.money ? 'Money paid out of a cash / bank account (saved as a Salary expense)' : 'Changes what the employee earned for the month; no money moves'}
      submitLabel={saving ? 'Saving...' : entry ? 'Update' : title}
      submitDisabled={saving}
      onSubmit={handleSubmit}
      onClose={onClose}
      onKeyDown={(event) => handlePopupFormKeyDown(event, onClose)}
    >
      {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Entry type">
        {Object.entries(ENTRY_TYPES).map(([key, item]) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={type === key}
            onClick={() => pickType(key)}
            className={`rounded-lg border px-2 py-2 text-xs font-semibold transition sm:text-sm ${
              type === key ? 'border-primary-600 bg-primary-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            {item.short}
          </button>
        ))}
      </div>

      <div>
        <label className="label" htmlFor="pay-employee">Employee <span className="text-rose-500">*</span></label>
        <select id="pay-employee" className="input" value={employeeId} onChange={(event) => pickEmployee(event.target.value)} autoFocus={!employeeId}>
          <option value="">Select employee</option>
          {choices.map((employee) => (
            <option key={employee._id} value={employee._id}>{employee.name}{employee.role ? ` · ${employee.role}` : ''}{employee.isActive ? '' : ' (left)'}</option>
          ))}
        </select>
      </div>

      {row && (
        <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-xl bg-slate-200 ring-1 ring-slate-200">
          {[
            { label: 'Earned + Due', value: fmt(row.opening + row.netPay), tone: 'text-slate-900' },
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
      {row && row.balance < 0 && <p className="-mt-1 text-xs text-rose-600">Advance is more than earned so far; the extra is carried to next month.</p>}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="pay-amount">Amount (₹) <span className="text-rose-500">*</span></label>
          <input id="pay-amount" className="input" type="number" min="0" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0" autoFocus={Boolean(employeeId)} />
        </div>
        <div>
          <label className="label" htmlFor="pay-date">Date</label>
          <input id="pay-date" className="input" type="date" value={dateKey} max={today} onChange={(event) => setDateKey(event.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="pay-month">For Salary Month</label>
          <select id="pay-month" className="input" value={forMonth} onChange={(event) => setForMonth(event.target.value)}>
            {monthOptions.map((month) => <option key={month} value={month}>{monthLabel(month)}</option>)}
          </select>
        </div>
        {info.money && (
          <div>
            <label className="label" htmlFor="pay-account">Paid From</label>
            <AccountSelect
              accounts={accounts}
              defaultAccountId={defaultAccountId}
              value={account}
              onChange={(event) => setAccount(event.target.value)}
              className="input"
            />
          </div>
        )}
      </div>

      <div>
        <label className="label" htmlFor="pay-notes">Notes</label>
        <input id="pay-notes" className="input" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder={type === 'deduction' ? 'e.g. damage, late fine' : 'Optional'} autoComplete="off" />
      </div>
    </FormPopup>
  );
}
