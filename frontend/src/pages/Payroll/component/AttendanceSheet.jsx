import { CheckCheck } from 'lucide-react';
import { ATTENDANCE, formatDate, toDateKey } from '../payrollUtils';

/** Mark each working employee present / half day / absent for one date. */
export default function AttendanceSheet({ employees, date, dayAttendance, onDateChange, onMark, onMarkAllPresent }) {
  const counts = ATTENDANCE.map((status) => ({
    ...status,
    count: employees.filter((employee) => dayAttendance[employee._id] === status.key).length
  }));
  const notMarked = employees.filter((employee) => !dayAttendance[employee._id]).length;

  return (
    <>
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-5">
        <div className="flex items-center gap-3">
          <input
            type="date"
            className="input w-auto"
            value={date}
            max={toDateKey(new Date())}
            onChange={(event) => event.target.value && onDateChange(event.target.value)}
          />
          <p className="text-sm font-semibold text-slate-700">{formatDate(date)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="text-xs font-medium text-slate-600">
            {counts.map((status) => (
              <span key={status.key} className={`mr-3 font-semibold ${status.text}`}>{status.count} {status.label}</span>
            ))}
            {notMarked > 0 && <span className="font-semibold text-slate-400">{notMarked} Not marked</span>}
          </p>
          <button type="button" className="btn-secondary btn-sm" onClick={onMarkAllPresent}>
            <CheckCheck size={14} /> Mark all present
          </button>
        </div>
      </div>

      {employees.length === 0 ? (
        <div className="px-6 py-14 text-center">
          <p className="font-semibold text-slate-800">No working employees</p>
          <p className="text-sm text-slate-500">Add an employee to mark attendance.</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {employees.map((employee) => (
            <li key={employee._id} className="flex items-center justify-between gap-3 px-4 py-2.5 transition hover:bg-slate-50 md:px-5">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">{employee.name}</p>
                <p className="truncate text-xs text-slate-500">{employee.role}</p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                {ATTENDANCE.map((status) => {
                  const selected = dayAttendance[employee._id] === status.key;
                  return (
                    <button
                      key={status.key}
                      type="button"
                      onClick={() => onMark(employee._id, status.key)}
                      aria-pressed={selected}
                      title={status.label}
                      className={`h-9 rounded-lg px-3 text-sm font-bold ring-1 ring-inset transition ${
                        selected ? status.active : 'bg-white text-slate-500 ring-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <span className="sm:hidden">{status.short}</span>
                      <span className="hidden sm:inline">{status.label}</span>
                    </button>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
