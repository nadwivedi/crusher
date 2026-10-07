import { useState } from 'react';
import FormPopup from '../../../components/FormPopup';
import { ROLES } from '../sampleData';
import { SALARY_TYPES, toDateKey } from '../payrollUtils';

const emptyEmployee = () => ({
  name: '', mobile: '', role: ROLES[0], salaryType: 'monthly', rate: '', joiningDate: toDateKey(new Date()), isActive: true
});

export default function EmployeeFormPopup({ employee = null, onSave, onClose }) {
  const [form, setForm] = useState(() => (employee ? { ...employee } : emptyEmployee()));
  const [error, setError] = useState('');
  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });

  const handleSubmit = () => {
    const rate = Number(form.rate);
    if (!form.name.trim()) return setError('Enter the employee name');
    if (!Number.isFinite(rate) || rate <= 0) return setError('Enter the salary amount');
    onSave({ ...form, name: form.name.trim(), mobile: form.mobile.trim(), rate });
  };

  return (
    <FormPopup
      title={employee ? 'Edit Employee' : 'Add Employee'}
      subtitle={employee ? 'Update employee and salary details' : 'Add a worker to your payroll'}
      submitLabel={employee ? 'Update' : 'Save Employee'}
      maxWidth="max-w-2xl"
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
        <div>
          <label className="label">Employee Name</label>
          <input className="input" value={form.name} onChange={set('name')} placeholder="Full name" autoFocus />
        </div>
        <div>
          <label className="label">Mobile</label>
          <input className="input" type="tel" value={form.mobile} onChange={set('mobile')} placeholder="10 digit mobile number" />
        </div>
        <div>
          <label className="label">Work / Role</label>
          <select className="input" value={form.role} onChange={set('role')}>
            {ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Joining Date</label>
          <input className="input" type="date" value={form.joiningDate} onChange={set('joiningDate')} />
        </div>
      </div>

      <div className="rounded-xl border-2 border-indigo-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-3 md:p-4">
        <p className="mb-3 text-sm font-bold text-slate-800">Salary</p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
          <div>
            <label className="label">Salary Type</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(SALARY_TYPES).map(([key, type]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setForm({ ...form, salaryType: key })}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                    form.salaryType === key ? 'border-primary-600 bg-primary-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">{form.salaryType === 'monthly' ? 'Salary per Month (₹)' : 'Wage per Day (₹)'}</label>
            <input className="input" type="number" min="0" value={form.rate} onChange={set('rate')} placeholder={form.salaryType === 'monthly' ? 'e.g. 15000' : 'e.g. 500'} />
          </div>
        </div>
      </div>
    </FormPopup>
  );
}
