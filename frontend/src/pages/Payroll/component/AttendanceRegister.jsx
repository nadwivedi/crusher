import { ATTENDANCE, ATTENDANCE_BY_KEY, daysInMonth, fmtNum, isSunday, nextStatus, toDateKey } from '../payrollUtils';

/**
 * Month register: employees down, days across. Clicking a day moves its mark P → H → L → A → empty.
 * marks: { [employeeId]: { [dateKey]: { status, overtimeHours } } }
 */
export default function AttendanceRegister({ employees, monthKey, marks, onMark, busy = false }) {
  const today = toDateKey(new Date());
  const days = Array.from({ length: daysInMonth(monthKey) }, (_, index) => `${monthKey}-${String(index + 1).padStart(2, '0')}`);

  if (employees.length === 0) {
    return (
      <div className="px-6 py-14 text-center">
        <p className="font-semibold text-slate-800">No employees</p>
        <p className="text-sm text-slate-500">Add an employee to mark attendance.</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-2.5 text-xs text-slate-600 md:px-5">
        {ATTENDANCE.map((status) => (
          <span key={status.key} className="inline-flex items-center gap-1.5">
            <span className={`inline-flex h-5 w-5 items-center justify-center rounded text-[11px] font-bold ${status.cell}`}>{status.short}</span>
            {status.label}
          </span>
        ))}
        <span className="text-slate-400">Click a day to change it · Sundays are shaded</span>
      </div>
      <div className={`overflow-x-auto ${busy ? 'opacity-70' : ''}`}>
        <table className="text-left text-xs">
          <thead>
            <tr>
              <th className="tbl-head sticky left-0 z-10 min-w-[150px] bg-white">Employee</th>
              {days.map((day) => (
                <th key={day} className={`tbl-head px-0 text-center ${isSunday(day) ? 'bg-slate-100' : ''}`}>
                  <span className="block w-7">{Number(day.slice(8))}</span>
                </th>
              ))}
              <th className="tbl-head text-right">Days</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => {
              const row = marks[employee._id] || {};
              const paidDays = Object.values(row).reduce((sum, mark) => sum + (ATTENDANCE_BY_KEY[mark.status]?.days || 0), 0);
              return (
                <tr key={employee._id} className="tbl-row">
                  <td className="tbl-cell sticky left-0 z-10 bg-white py-1.5">
                    <p className="max-w-[150px] truncate font-semibold text-slate-800">{employee.name}</p>
                    <p className="max-w-[150px] truncate text-[11px] text-slate-500">{employee.role || '-'}</p>
                  </td>
                  {days.map((day) => {
                    const mark = row[day];
                    const status = ATTENDANCE_BY_KEY[mark?.status];
                    const future = day > today;
                    return (
                      <td key={day} className={`px-0 py-1 text-center ${isSunday(day) ? 'bg-slate-50' : ''}`}>
                        <button
                          type="button"
                          disabled={future || busy}
                          onClick={() => onMark(employee._id, day, nextStatus(mark?.status))}
                          title={`${day}${status ? ` · ${status.label}` : ''}${mark?.overtimeHours ? ` · OT ${mark.overtimeHours}h` : ''}`}
                          className={`mx-auto flex h-7 w-7 items-center justify-center rounded text-[11px] font-bold transition ${
                            status ? status.cell : 'text-slate-300 hover:bg-slate-100'
                          } ${future ? 'cursor-not-allowed opacity-30' : ''} ${mark?.overtimeHours ? 'ring-2 ring-inset ring-violet-400' : ''}`}
                        >
                          {status ? status.short : '·'}
                        </button>
                      </td>
                    );
                  })}
                  <td className="tbl-cell whitespace-nowrap text-right font-semibold text-slate-800">{fmtNum(paidDays)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="border-t border-slate-100 px-4 py-2.5 text-[11px] text-slate-500 md:px-5">A violet ring means overtime was added that day (add hours in the day view).</p>
    </>
  );
}
