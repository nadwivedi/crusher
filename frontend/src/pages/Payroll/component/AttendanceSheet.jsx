import { useState } from 'react';
import { CheckCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { ATTENDANCE, formatDate, toDateKey } from '../payrollUtils';

const attendanceKey = (employeeId, dateKey) => `${employeeId}-${dateKey}`;

const shiftDay = (dateKey, delta) => {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setDate(date.getDate() + delta);
  return toDateKey(date);
};

// Overtime hours box: saves when the value is left, not on every key. Keyed on the saved value, so it starts over when that changes.
function OvertimeInput({ value, disabled, onSave }) {
  const [text, setText] = useState(value ? String(value) : '');
  const commit = () => {
    const hours = Number(text || 0);
    if (!Number.isFinite(hours) || hours < 0 || hours > 24) {
      setText(value ? String(value) : '');
      return;
    }
    if (hours !== Number(value || 0)) onSave(hours);
  };
  return (
    <input
      type="number"
      min="0"
      max="24"
      step="0.5"
      inputMode="decimal"
      className="input h-9 w-16 px-2 text-center text-sm"
      value={text}
      disabled={disabled}
      onChange={(event) => setText(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
      placeholder="OT"
      title={disabled ? 'Mark present or half day to add overtime' : 'Overtime hours'}
      aria-label="Overtime hours"
    />
  );
}

/** Mark each working employee present / half day / paid leave / absent for one date, with overtime hours. */
export default function AttendanceSheet({ employees, date, dayMarks, onDateChange, onMark, onOvertime, onMarkAllPresent, busy = false }) {
  const today = toDateKey(new Date());
  const counts = ATTENDANCE.map((status) => ({
    ...status,
    count: employees.filter((employee) => dayMarks[employee._id]?.status === status.key).length
  }));
  const notMarked = employees.filter((employee) => !dayMarks[employee._id]).length;

  return (
    <>
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-5">
        <div className="flex items-center gap-2">
          <button type="button" className="icon-btn" aria-label="Previous day" onClick={() => onDateChange(shiftDay(date, -1))}>
            <ChevronLeft size={18} />
          </button>
          <input
            type="date"
            className="input w-auto"
            value={date}
            max={today}
            onChange={(event) => event.target.value && onDateChange(event.target.value)}
          />
          <button type="button" className="icon-btn" aria-label="Next day" disabled={date >= today} onClick={() => onDateChange(shiftDay(date, 1))}>
            <ChevronRight size={18} />
          </button>
          <p className="hidden text-sm font-semibold text-slate-700 sm:block">{date === today ? 'Today' : formatDate(date)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="text-xs font-medium text-slate-600">
            {counts.map((status) => (
              <span key={status.key} className={`mr-3 font-semibold ${status.text}`}>{status.count} {status.label}</span>
            ))}
            {notMarked > 0 && <span className="font-semibold text-slate-400">{notMarked} Not marked</span>}
          </p>
          <button type="button" className="btn-secondary btn-sm" onClick={onMarkAllPresent} disabled={busy || notMarked === 0}>
            <CheckCheck size={14} /> Mark rest present
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
          {employees.map((employee) => {
            const mark = dayMarks[employee._id];
            const worked = mark?.status === 'present' || mark?.status === 'half';
            return (
              <li key={employee._id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 transition hover:bg-slate-50 md:px-5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">{employee.name}</p>
                  <p className="truncate text-xs text-slate-500">{employee.role || '-'}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {ATTENDANCE.map((status) => {
                    const selected = mark?.status === status.key;
                    return (
                      <button
                        key={status.key}
                        type="button"
                        onClick={() => onMark(employee._id, selected ? '' : status.key)}
                        aria-pressed={selected}
                        title={selected ? `${status.label} (click again to clear)` : status.label}
                        className={`h-9 min-w-9 rounded-lg px-2.5 text-sm font-bold ring-1 ring-inset transition ${
                          selected ? status.active : 'bg-white text-slate-500 ring-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        <span className="lg:hidden">{status.short}</span>
                        <span className="hidden lg:inline">{status.label}</span>
                      </button>
                    );
                  })}
                  {Number(employee.overtimeRate) > 0 && (
                    <OvertimeInput
                      key={`${attendanceKey(employee._id, date)}-${mark?.overtimeHours || 0}`}
                      value={mark?.overtimeHours || 0}
                      disabled={!worked}
                      onSave={(hours) => onOvertime(employee._id, hours)}
                    />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
