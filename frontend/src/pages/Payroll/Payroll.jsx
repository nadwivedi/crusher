import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import {
  Banknote, CalendarCheck, ChevronLeft, ChevronRight, HandCoins, IndianRupee, MinusCircle, PlusCircle,
  RefreshCw, ScrollText, Search, UserPlus, Users, Wallet
} from 'lucide-react';
import apiClient from '../../utils/api';
import StatCard from '../../components/StatCard';
import Segmented from '../../components/Segmented';
import SalarySheet from './component/SalarySheet';
import EmployeeList from './component/EmployeeList';
import AttendanceSheet from './component/AttendanceSheet';
import AttendanceRegister from './component/AttendanceRegister';
import PaymentList from './component/PaymentList';
import EmployeeFormPopup from './component/EmployeeFormPopup';
import PaymentPopup from './component/PaymentPopup';
import PayslipPopup from './component/PayslipPopup';
import EmployeeLedgerPopup from './component/EmployeeLedgerPopup';
import { daysInMonth, fmt, monthLabel, shiftMonth, toDateKey, toMonthKey } from './payrollUtils';

const TOAST = { position: 'top-right', autoClose: 2000 };

const TABS = [
  { key: 'salary', label: 'Salary Sheet', icon: ScrollText },
  { key: 'attendance', label: 'Attendance', icon: CalendarCheck },
  { key: 'payments', label: 'Payments', icon: Banknote },
  { key: 'employees', label: 'Employees', icon: Users }
];

const ATTENDANCE_VIEWS = [
  { key: 'day', label: 'Day' },
  { key: 'month', label: 'Month Register' }
];

const EMPTY_TOTALS = { opening: 0, earned: 0, overtimePay: 0, bonus: 0, deduction: 0, netPay: 0, advance: 0, paid: 0, balance: 0 };

// The day the attendance view opens on for a month: today in this month, else that month's last day
const defaultDayFor = (monthKey) => {
  const today = toDateKey(new Date());
  return monthKey === today.slice(0, 7) ? today : `${monthKey}-${String(daysInMonth(monthKey)).padStart(2, '0')}`;
};

// [{ employee, dateKey, status, overtimeHours }] -> { employeeId: { dateKey: mark } }
const groupMarks = (list) => list.reduce((map, mark) => {
  (map[mark.employee] ||= {})[mark.dateKey] = { status: mark.status, overtimeHours: mark.overtimeHours || 0 };
  return map;
}, {});

export default function Payroll() {
  const currentMonth = useMemo(() => toMonthKey(new Date()), []);
  const [tab, setTab] = useState('salary');
  const [attendanceView, setAttendanceView] = useState('day');
  const [monthKey, setMonthKey] = useState(currentMonth);
  const [attendanceDate, setAttendanceDate] = useState(() => toDateKey(new Date()));
  const [employees, setEmployees] = useState([]);
  const [sheet, setSheet] = useState({ rows: [], totals: EMPTY_TOTALS, daysInMonth: daysInMonth(currentMonth) });
  const [marks, setMarks] = useState({});
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  // null | { kind: 'employee', employee? } | { kind: 'entry', type, employeeId?, entry? } | { kind: 'payslip', row } | { kind: 'ledger', employee }
  const [popup, setPopup] = useState(null);
  const sheetTimer = useRef(null);

  const monthName = monthLabel(monthKey);

  const loadSheet = useCallback(async (month) => {
    const response = await apiClient.get('/payroll/sheet', { params: { month } });
    setSheet({ rows: response.rows || [], totals: response.totals || EMPTY_TOTALS, daysInMonth: response.daysInMonth });
  }, []);

  const loadAll = useCallback(async (month) => {
    setLoading(true);
    setError('');
    try {
      const [employeeResponse, attendanceResponse, entryResponse] = await Promise.all([
        apiClient.get('/payroll/employees'),
        apiClient.get('/payroll/attendance', { params: { month } }),
        apiClient.get('/payroll/entries', { params: { month } }),
        loadSheet(month)
      ]);
      setEmployees(employeeResponse.data || []);
      setMarks(groupMarks(attendanceResponse.data || []));
      setEntries(entryResponse.data || []);
    } catch (err) {
      setError(err?.message || 'Failed to load payroll');
    } finally {
      setLoading(false);
    }
  }, [loadSheet]);

  useEffect(() => { loadAll(monthKey); }, [loadAll, monthKey]);
  useEffect(() => () => clearTimeout(sheetTimer.current), []);

  // Totals follow attendance marks without reloading on every tap
  const refreshSheetSoon = () => {
    clearTimeout(sheetTimer.current);
    sheetTimer.current = setTimeout(() => { loadSheet(monthKey).catch(() => {}); }, 700);
  };

  const changeMonth = (next) => {
    setMonthKey(next);
    setAttendanceDate(defaultDayFor(next));
  };

  const changeAttendanceDate = (dateKey) => {
    setAttendanceDate(dateKey);
    if (dateKey.slice(0, 7) !== monthKey) setMonthKey(dateKey.slice(0, 7));
  };

  const workingEmployees = useMemo(() => employees.filter((employee) => employee.isActive), [employees]);
  const employeesById = useMemo(() => Object.fromEntries(employees.map((employee) => [employee._id, employee])), [employees]);
  // The register lists everyone working, plus anyone who left but has marks this month
  const registerEmployees = useMemo(() => employees.filter((employee) => employee.isActive || marks[employee._id]), [employees, marks]);

  const visibleEmployees = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return employees;
    return employees.filter((employee) => [employee.name, employee.mobile, employee.role].some((value) => String(value || '').toLowerCase().includes(term)));
  }, [employees, search]);

  // ---------------------------------------------------------------- attendance

  const saveMarks = async (dateKey, list) => {
    const previous = marks;
    setMarks((current) => {
      const next = { ...current };
      list.forEach(({ employee, status, overtimeHours }) => {
        const row = { ...(next[employee] || {}) };
        if (status) row[dateKey] = { status, overtimeHours: overtimeHours ?? row[dateKey]?.overtimeHours ?? 0 };
        else delete row[dateKey];
        next[employee] = row;
      });
      return next;
    });
    try {
      await apiClient.put('/payroll/attendance', { dateKey, marks: list });
      refreshSheetSoon();
    } catch (err) {
      setMarks(previous);
      toast.error(err?.message || 'Could not save attendance', TOAST);
    }
  };

  const dayMarks = useMemo(() => Object.fromEntries(
    Object.entries(marks).map(([employeeId, row]) => [employeeId, row[attendanceDate]]).filter(([, mark]) => mark)
  ), [marks, attendanceDate]);

  const markDay = (employeeId, status) => {
    const current = dayMarks[employeeId];
    const keepsOvertime = status === 'present' || status === 'half';
    saveMarks(attendanceDate, [{ employee: employeeId, status, overtimeHours: keepsOvertime ? current?.overtimeHours || 0 : 0 }]);
  };

  const setOvertime = (employeeId, hours) => {
    const current = dayMarks[employeeId];
    if (!current) return;
    saveMarks(attendanceDate, [{ employee: employeeId, status: current.status, overtimeHours: hours }]);
  };

  const markRestPresent = () => {
    const list = workingEmployees
      .filter((employee) => !dayMarks[employee._id])
      .map((employee) => ({ employee: employee._id, status: 'present', overtimeHours: 0 }));
    if (list.length) saveMarks(attendanceDate, list);
  };

  const markRegister = (employeeId, dateKey, status) => {
    const current = marks[employeeId]?.[dateKey];
    const keepsOvertime = status === 'present' || status === 'half';
    saveMarks(dateKey, [{ employee: employeeId, status, overtimeHours: keepsOvertime ? current?.overtimeHours || 0 : 0 }]);
  };

  // ---------------------------------------------------------------- employees

  const saveEmployee = async (data) => {
    setSaving(true);
    try {
      if (popup?.employee) {
        await apiClient.put(`/payroll/employees/${popup.employee._id}`, data);
        toast.success('Employee updated', TOAST);
      } else {
        await apiClient.post('/payroll/employees', data);
        toast.success('Employee added', TOAST);
      }
      setPopup(null);
      loadAll(monthKey);
    } catch (err) {
      toast.error(err?.message || 'Could not save employee', TOAST);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (employee) => {
    let leftDate;
    if (employee.isActive) {
      const answer = window.prompt(`Mark ${employee.name} as left? Enter the last working day (YYYY-MM-DD):`, toDateKey(new Date()));
      if (answer === null) return;
      leftDate = answer.trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(leftDate)) {
        toast.error('Enter the date as YYYY-MM-DD', TOAST);
        return;
      }
    }
    try {
      await apiClient.patch(`/payroll/employees/${employee._id}/status`, { isActive: !employee.isActive, leftDate });
      toast.success(employee.isActive ? `${employee.name} marked as left` : `${employee.name} is working again`, TOAST);
      loadAll(monthKey);
    } catch (err) {
      toast.error(err?.message || 'Could not change status', TOAST);
    }
  };

  const deleteEmployee = async (employee) => {
    if (!window.confirm(`Delete ${employee.name}? This works only when they have no attendance or payments.`)) return;
    try {
      await apiClient.delete(`/payroll/employees/${employee._id}`);
      toast.success('Employee deleted', TOAST);
      loadAll(monthKey);
    } catch (err) {
      toast.error(err?.message || 'Could not delete employee', TOAST);
    }
  };

  // ---------------------------------------------------------------- payments

  const saveEntry = async (data) => {
    setSaving(true);
    try {
      if (popup?.entry) {
        await apiClient.put(`/payroll/entries/${popup.entry._id}`, data);
        toast.success('Updated', TOAST);
      } else {
        await apiClient.post('/payroll/entries', data);
        toast.success({ salary: 'Salary paid', advance: 'Advance given', bonus: 'Bonus added', deduction: 'Deduction added' }[data.type], TOAST);
      }
      setPopup(null);
      loadAll(monthKey);
    } catch (err) {
      toast.error(err?.message || 'Could not save', TOAST);
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = async (entry) => {
    const name = employeesById[entry.employee]?.name || entry.employeeName || 'this employee';
    if (!window.confirm(`Delete this ${entry.type} of ${fmt(entry.amount)} for ${name}?`)) return;
    try {
      await apiClient.delete(`/payroll/entries/${entry._id}`);
      toast.success('Deleted', TOAST);
      loadAll(monthKey);
    } catch (err) {
      toast.error(err?.message || 'Could not delete', TOAST);
    }
  };

  const openEntry = (type, employeeId = '') => setPopup({ kind: 'entry', type, employeeId });

  // ---------------------------------------------------------------- page

  const { totals } = sheet;
  const stats = [
    { icon: Users, label: 'Employees', tone: 'blue', value: String(workingEmployees.length), hint: `${employees.length - workingEmployees.length} left · ${employees.length} total` },
    { icon: IndianRupee, label: 'Net Salary', tone: 'emerald', value: fmt(totals.netPay), hint: `Earned${totals.overtimePay ? ' incl. OT' : ''} · ${monthName}` },
    { icon: HandCoins, label: 'Advance + Paid', tone: 'amber', value: fmt(totals.advance + totals.paid), hint: `${fmt(totals.advance)} advance · ${fmt(totals.paid)} salary` },
    { icon: Wallet, label: 'Balance to Pay', tone: 'rose', value: fmt(totals.balance), hint: totals.opening ? `Incl. ${fmt(totals.opening)} brought forward` : `Still to be paid · ${monthName}` }
  ];

  const payslipEntries = popup?.kind === 'payslip'
    ? entries.filter((entry) => entry.employee === popup.row.employee._id)
    : [];

  return (
    <div className="page-fade-in space-y-4 px-3 pb-8 pt-4 md:space-y-5 lg:px-6 lg:pt-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Payroll</h1>
          <p className="page-subtitle">Employees, attendance, advances and salary · {monthName}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg bg-white shadow-xs ring-1 ring-slate-200">
            <button type="button" className="rounded-l-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800" aria-label="Previous month" onClick={() => changeMonth(shiftMonth(monthKey, -1))}>
              <ChevronLeft size={18} />
            </button>
            <span className="min-w-[8.5rem] px-1 text-center text-sm font-semibold text-slate-800">{monthName}</span>
            <button
              type="button"
              className="rounded-r-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-30 disabled:hover:bg-transparent"
              aria-label="Next month"
              disabled={monthKey >= currentMonth}
              onClick={() => changeMonth(shiftMonth(monthKey, 1))}
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <button type="button" className="icon-btn" title="Refresh" aria-label="Refresh" onClick={() => loadAll(monthKey)}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button type="button" className="btn-primary" onClick={() => setPopup({ kind: 'employee' })}>
            <UserPlus size={18} /> Add Employee
          </button>
        </div>
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div>}

      <section className="grid grid-cols-2 gap-2.5 md:gap-4 xl:grid-cols-4">
        {stats.map((stat) => <StatCard key={stat.label} {...stat} />)}
      </section>

      <Segmented options={TABS} value={tab} onChange={setTab} />

      <section className={`panel transition-opacity ${loading && employees.length ? 'opacity-60' : ''}`}>
        {loading && employees.length === 0 && !error ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="h-9 w-9 animate-spin rounded-full border-4 border-primary-600 border-r-transparent" />
            <p className="text-sm text-slate-400">Loading payroll…</p>
          </div>
        ) : (
          <>
            {tab === 'salary' && (
              <>
                <div className="panel-header flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Salary Sheet · {monthName}</h3>
                    <p className="text-xs text-slate-500">What each employee earned, took as advance and is still owed</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="btn-secondary btn-sm" onClick={() => openEntry('bonus')}><PlusCircle size={14} /> Bonus</button>
                    <button type="button" className="btn-secondary btn-sm" onClick={() => openEntry('deduction')}><MinusCircle size={14} /> Deduction</button>
                  </div>
                </div>
                <SalarySheet
                  rows={sheet.rows}
                  totals={totals}
                  monthName={monthName}
                  daysInMonth={sheet.daysInMonth}
                  onPay={(employeeId) => openEntry('salary', employeeId)}
                  onAdvance={(employeeId) => openEntry('advance', employeeId)}
                  onPayslip={(row) => setPopup({ kind: 'payslip', row })}
                  onLedger={(employee) => setPopup({ kind: 'ledger', employee })}
                />
              </>
            )}

            {tab === 'attendance' && (
              <>
                <div className="panel-header flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Attendance</h3>
                    <p className="text-xs text-slate-500">Mark each day; it saves at once and salary is worked out from these marks.</p>
                  </div>
                  <Segmented options={ATTENDANCE_VIEWS} value={attendanceView} onChange={setAttendanceView} />
                </div>
                {attendanceView === 'day' ? (
                  <AttendanceSheet
                    employees={workingEmployees}
                    date={attendanceDate}
                    dayMarks={dayMarks}
                    onDateChange={changeAttendanceDate}
                    onMark={markDay}
                    onOvertime={setOvertime}
                    onMarkAllPresent={markRestPresent}
                  />
                ) : (
                  <AttendanceRegister employees={registerEmployees} monthKey={monthKey} marks={marks} onMark={markRegister} />
                )}
              </>
            )}

            {tab === 'payments' && (
              <>
                <div className="panel-header flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Payments · {monthName}</h3>
                    <p className="text-xs text-slate-500">Salary paid, advances, bonuses and deductions for this salary month</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="btn-secondary" onClick={() => openEntry('advance')}>
                      <HandCoins size={16} /> Give Advance
                    </button>
                    <button type="button" className="btn-primary" onClick={() => openEntry('salary')}>
                      <Banknote size={16} /> Pay Salary
                    </button>
                  </div>
                </div>
                <PaymentList
                  entries={entries}
                  employeesById={employeesById}
                  onEdit={(entry) => setPopup({ kind: 'entry', type: entry.type, entry })}
                  onDelete={deleteEntry}
                />
              </>
            )}

            {tab === 'employees' && (
              <>
                <div className="panel-header flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Employees</h3>
                    <p className="text-xs text-slate-500">Workers on your payroll and their salary</p>
                  </div>
                  <div className="relative md:w-72">
                    <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input className="input pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, mobile, work..." />
                  </div>
                </div>
                <EmployeeList
                  employees={visibleEmployees}
                  onEdit={(employee) => setPopup({ kind: 'employee', employee })}
                  onToggleActive={toggleActive}
                  onDelete={deleteEmployee}
                  onLedger={(employee) => setPopup({ kind: 'ledger', employee })}
                />
              </>
            )}
          </>
        )}
      </section>

      {popup?.kind === 'employee' && (
        <EmployeeFormPopup employee={popup.employee} saving={saving} onSave={saveEmployee} onClose={() => setPopup(null)} />
      )}
      {popup?.kind === 'entry' && (
        <PaymentPopup
          type={popup.type}
          entry={popup.entry || null}
          employees={employees}
          rows={sheet.rows}
          monthKey={monthKey}
          defaultEmployeeId={popup.employeeId}
          saving={saving}
          onSave={saveEntry}
          onClose={() => setPopup(null)}
        />
      )}
      {popup?.kind === 'payslip' && (
        <PayslipPopup row={popup.row} entries={payslipEntries} monthKey={monthKey} daysInMonth={sheet.daysInMonth} onClose={() => setPopup(null)} />
      )}
      {popup?.kind === 'ledger' && (
        <EmployeeLedgerPopup employee={popup.employee} onClose={() => setPopup(null)} />
      )}
    </div>
  );
}
