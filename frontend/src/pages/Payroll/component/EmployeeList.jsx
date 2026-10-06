import { Pencil, Phone, UserCheck, UserX } from 'lucide-react';
import { SALARY_TYPES, formatDate, rateLabel } from '../payrollUtils';

export default function EmployeeList({ employees, onEdit, onToggleActive }) {
  if (employees.length === 0) {
    return (
      <div className="px-6 py-14 text-center">
        <p className="font-semibold text-slate-800">No employees found</p>
        <p className="text-sm text-slate-500">Use "Add Employee" to add the first one.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left">
        <thead>
          <tr>
            <th className="tbl-head">Employee</th>
            <th className="tbl-head">Mobile</th>
            <th className="tbl-head">Salary Type</th>
            <th className="tbl-head text-right">Salary</th>
            <th className="tbl-head">Joined</th>
            <th className="tbl-head">Status</th>
            <th className="tbl-head text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((employee) => (
            <tr key={employee._id} className={`tbl-row ${employee.isActive ? '' : 'opacity-60'}`}>
              <td className="tbl-cell">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-50 text-sm font-bold text-primary-700 ring-1 ring-inset ring-primary-100">
                    {employee.name[0]?.toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800">{employee.name}</p>
                    <p className="text-xs text-slate-500">{employee.role}</p>
                  </div>
                </div>
              </td>
              <td className="tbl-cell whitespace-nowrap">
                {employee.mobile ? <span className="inline-flex items-center gap-1.5"><Phone size={13} className="text-slate-400" />{employee.mobile}</span> : '-'}
              </td>
              <td className="tbl-cell">
                <span className={employee.salaryType === 'monthly' ? 'badge-blue' : 'badge-orange'}>{SALARY_TYPES[employee.salaryType].label}</span>
              </td>
              <td className="tbl-cell whitespace-nowrap text-right font-semibold text-slate-800">{rateLabel(employee)}</td>
              <td className="tbl-cell whitespace-nowrap">{employee.joiningDate ? formatDate(employee.joiningDate) : '-'}</td>
              <td className="tbl-cell">
                <span className={employee.isActive ? 'badge-green' : 'badge-gray'}>{employee.isActive ? 'Working' : 'Left'}</span>
              </td>
              <td className="tbl-cell">
                <div className="flex items-center justify-end gap-1">
                  <button type="button" className="icon-btn hover:bg-blue-50 hover:text-blue-600" title="Edit" onClick={() => onEdit(employee)}>
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    className={`icon-btn ${employee.isActive ? 'hover:bg-rose-50 hover:text-rose-600' : 'hover:bg-emerald-50 hover:text-emerald-600'}`}
                    title={employee.isActive ? 'Mark as left' : 'Mark as working'}
                    onClick={() => onToggleActive(employee._id)}
                  >
                    {employee.isActive ? <UserX size={16} /> : <UserCheck size={16} />}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
