import { useState } from 'react';
import FormPopup from '../../../components/FormPopup';
import FormSection from '../../../components/FormSection';
import { handlePopupFormKeyDown } from '../../../utils/popupFormKeyboard';
import { ROLES, SALARY_TYPES, monthLabel, shiftMonth, toDateKey, toMonthKey } from '../payrollUtils';

const emptyEmployee = () => ({
  name: '',
  mobile: '',
  role: '',
  salaryType: 'monthly',
  rate: '',
  overtimeRate: '',
  joiningDate: toDateKey(new Date()),
  openingBalance: '',
  openingDirection: 'owed',
  bankDetails: '',
  address: '',
  notes: ''
});

const fromEmployee = (employee) => ({
  ...emptyEmployee(),
  ...employee,
  rate: String(employee.rate ?? ''),
  overtimeRate: employee.overtimeRate ? String(employee.overtimeRate) : '',
  openingBalance: employee.openingBalance ? String(Math.abs(employee.openingBalance)) : '',
  openingDirection: Number(employee.openingBalance) < 0 ? 'advance' : 'owed'
});

/** Add or edit a worker on the payroll: who they are, how they are paid, and any balance from before. */
export default function EmployeeFormPopup({ employee = null, saving = false, onSave, onClose }) {
  const [form, setForm] = useState(() => (employee ? fromEmployee(employee) : emptyEmployee()));
  const currentMonth = toMonthKey(new Date());
  const [applyFromMonth, setApplyFromMonth] = useState(currentMonth);
  const [error, setError] = useState('');
  const set = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
    setError('');
  };

  const payChanged = Boolean(employee) && (
    Number(form.rate) !== Number(employee.rate)
    || form.salaryType !== employee.salaryType
    || Number(form.overtimeRate || 0) !== Number(employee.overtimeRate || 0)
  );

  const handleSubmit = () => {
    const rate = Number(form.rate);
    const mobile = form.mobile.replace(/\D/g, '');
    if (!form.name.trim()) return setError('Enter the employee name');
    if (mobile && mobile.length !== 10) return setError('Mobile number must be 10 digits');
    if (!Number.isFinite(rate) || rate <= 0) return setError(form.salaryType === 'daily' ? 'Enter the wage per day' : 'Enter the salary per month');
    const opening = Number(form.openingBalance || 0);
    if (!Number.isFinite(opening) || opening < 0) return setError('Enter a valid opening balance');

    return onSave({
      name: form.name.trim(),
      mobile,
      role: form.role.trim(),
      salaryType: form.salaryType,
      rate,
      overtimeRate: Number(form.overtimeRate || 0),
      joiningDate: form.joiningDate || null,
      openingBalance: form.openingDirection === 'advance' ? -opening : opening,
      bankDetails: form.bankDetails.trim(),
      address: form.address.trim(),
      notes: form.notes.trim(),
      ...(payChanged ? { applyFromMonth } : {})
    });
  };

  return (
    <FormPopup
      title={employee ? 'Edit Employee' : 'Add Employee'}
      subtitle={employee ? 'Update employee and salary details' : 'Add a worker to your payroll'}
      submitLabel={saving ? 'Saving...' : employee ? 'Update Employee' : 'Save Employee'}
      submitDisabled={saving}
      maxWidth="max-w-2xl"
      onSubmit={handleSubmit}
      onClose={onClose}
      onKeyDown={(event) => handlePopupFormKeyDown(event, onClose)}
    >
      {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}

      <FormSection number={1} title="Employee" tone="blue">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="label" htmlFor="pe-name">Employee Name <span className="text-rose-500">*</span></label>
            <input id="pe-name" className="input" value={form.name} onChange={set('name')} placeholder="Full name" autoFocus autoComplete="off" />
          </div>
          <div>
            <label className="label" htmlFor="pe-mobile">Mobile</label>
            <input
              id="pe-mobile"
              className="input"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={form.mobile}
              onChange={(event) => setForm((current) => ({ ...current, mobile: event.target.value.replace(/\D/g, '') }))}
              placeholder="10 digit mobile, for payslip on WhatsApp"
            />
          </div>
          <div>
            <label className="label" htmlFor="pe-role">Work / Role</label>
            <input id="pe-role" className="input" list="payroll-roles" value={form.role} onChange={set('role')} placeholder="e.g. Driver, Loader" autoComplete="off" />
            <datalist id="payroll-roles">
              {ROLES.map((role) => <option key={role} value={role} />)}
            </datalist>
          </div>
          <div>
            <label className="label" htmlFor="pe-joining">Joining Date</label>
            <input id="pe-joining" className="input" type="date" value={form.joiningDate || ''} onChange={set('joiningDate')} />
          </div>
        </div>
      </FormSection>

      <FormSection number={2} title="Salary" tone="emerald">
        <div>
          <p className="label">Salary Type</p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(SALARY_TYPES).map(([key, type]) => (
              <button
                key={key}
                type="button"
                onClick={() => setForm((current) => ({ ...current, salaryType: key }))}
                aria-pressed={form.salaryType === key}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                  form.salaryType === key ? 'border-primary-600 bg-primary-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {form.salaryType === 'monthly'
              ? 'Earned per day marked: salary ÷ days in that month. Paid leave counts as a full day.'
              : 'Earned per day marked: the day\'s wage. A half day earns half.'}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="pe-rate">{form.salaryType === 'monthly' ? 'Salary per Month (₹)' : 'Wage per Day (₹)'} <span className="text-rose-500">*</span></label>
            <input id="pe-rate" className="input" type="number" min="0" inputMode="decimal" value={form.rate} onChange={set('rate')} placeholder={form.salaryType === 'monthly' ? 'e.g. 15000' : 'e.g. 500'} />
          </div>
          <div>
            <label className="label" htmlFor="pe-ot">Overtime per Hour (₹)</label>
            <input id="pe-ot" className="input" type="number" min="0" inputMode="decimal" value={form.overtimeRate} onChange={set('overtimeRate')} placeholder="Optional" />
          </div>
        </div>
        {payChanged && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            <label className="label" htmlFor="pe-apply">New salary counts from</label>
            <select id="pe-apply" className="input" value={applyFromMonth} onChange={(event) => setApplyFromMonth(event.target.value)}>
              {[0, -1, -2, -3].map((delta) => {
                const month = shiftMonth(currentMonth, delta);
                return <option key={month} value={month}>{monthLabel(month)}{delta === 0 ? ' (this month)' : ''}</option>;
              })}
            </select>
            <p className="mt-1 text-xs text-amber-800">Days marked before this month keep the old salary.</p>
          </div>
        )}
      </FormSection>

      <FormSection
        number={3}
        title="Opening Balance & Other Details"
        tone="slate"
        hint="Use opening balance only for salary still due, or an advance not yet recovered, from before you started Payroll here."
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="label" htmlFor="pe-opening">Opening Balance (₹)</label>
            <input id="pe-opening" className="input" type="number" min="0" inputMode="decimal" value={form.openingBalance} onChange={set('openingBalance')} placeholder="0" />
          </div>
          <div>
            <p className="label">This amount is</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'owed', label: 'Salary due to them' },
                { key: 'advance', label: 'Advance they owe' }
              ].map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, openingDirection: option.key }))}
                  aria-pressed={form.openingDirection === option.key}
                  className={`rounded-lg border px-2 py-2 text-xs font-semibold transition sm:text-sm ${
                    form.openingDirection === option.key ? 'border-slate-700 bg-slate-700 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label" htmlFor="pe-bank">Bank A/c / UPI</label>
            <input id="pe-bank" className="input" value={form.bankDetails} onChange={set('bankDetails')} placeholder="Optional, e.g. SBI 1234…, IFSC / UPI id" autoComplete="off" />
          </div>
          <div>
            <label className="label" htmlFor="pe-address">Address</label>
            <input id="pe-address" className="input" value={form.address} onChange={set('address')} placeholder="Optional" autoComplete="off" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="pe-notes">Notes</label>
          <input id="pe-notes" className="input" value={form.notes} onChange={set('notes')} placeholder="Optional, e.g. Aadhaar no., guarantor" autoComplete="off" />
        </div>
      </FormSection>
    </FormPopup>
  );
}
