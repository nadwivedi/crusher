import { useMemo, useState } from 'react';
import {
  Banknote, CalendarCheck, ChevronLeft, ChevronRight, HandCoins, IndianRupee, Info,
  ScrollText, Search, UserPlus, Users, Wallet
} from 'lucide-react';
import StatCard from '../../components/StatCard';
import Segmented from '../../components/Segmented';
import SalarySheet from './component/SalarySheet';
import EmployeeList from './component/EmployeeList';
import AttendanceSheet from './component/AttendanceSheet';
import PaymentList from './component/PaymentList';
import EmployeeFormPopup from './component/EmployeeFormPopup';
import PaymentPopup from './component/PaymentPopup';
import { SAMPLE_EMPLOYEES, buildSampleAttendance, buildSamplePayments } from './sampleData';
import { buildSalaryRows, daysInMonth, fmt, monthLabel, shiftMonth, toDateKey, toMonthKey } from './payrollUtils';

const TABS = [
  { key: 'salary', label: 'Salary Sheet', icon: ScrollText },
  { key: 'employees', label: 'Employees', icon: Users },
  { key: 'attendance', label: 'Attendance', icon: CalendarCheck },
  { key: 'payments', label: 'Payments', icon: Banknote }
];

// Design preview: everything below runs on sample data held in this page's state. Nothing is saved.
export default function Payroll() {
  const currentMonth = useMemo(() => toMonthKey(new Date()), []);
  const [tab, setTab] = useState('salary');
  const [monthKey, setMonthKey] = useState(currentMonth);
  const [attendanceDate, setAttendanceDate] = useState(() => toDateKey(new Date()));
  const [employees, setEmployees] = useState(SAMPLE_EMPLOYEES);
  const [attendance, setAttendance] = useState(() => buildSampleAttendance());
  const [payments, setPayments] = useState(() => buildSamplePayments());
  const [search, setSearch] = useState('');
  // null | { kind: 'employee', employee? } | { kind: 'salary' | 'advance', employeeId? }
  const [popup, setPopup] = useState(null);

  const monthName = monthLabel(monthKey);
  const workingEmployees = useMemo(() => employees.filter((employee) => employee.isActive), [employees]);
  const employeesById = useMemo(() => Object.fromEntries(employees.map((employee) => [employee._id, employee])), [employees]);

  const salaryRows = useMemo(
    () => buildSalaryRows(employees, attendance, payments, monthKey),
    [employees, attendance, payments, monthKey]
  );
  const totals = useMemo(() => salaryRows.reduce((sum, row) => ({
    earned: sum.earned + row.earned,
    advance: sum.advance + row.advance,
    paid: sum.paid + row.paid,
    balance: sum.balance + row.balance
  }), { earned: 0, advance: 0, paid: 0, balance: 0 }), [salaryRows]);

  const monthPayments = useMemo(() => payments
    .filter((payment) => payment.month === monthKey || payment.date.startsWith(monthKey))
    .sort((a, b) => b.date.localeCompare(a.date)), [payments, monthKey]);

  const visibleEmployees = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return employees;
    return employees.filter((employee) => [employee.name, employee.mobile, employee.role].some((value) => String(value || '').toLowerCase().includes(term)));
  }, [employees, search]);

  const saveEmployee = (data) => {
    setEmployees((current) => (data._id
      ? current.map((employee) => (employee._id === data._id ? data : employee))
      : [...current, { ...data, _id: `e${Date.now()}` }]));
    setPopup(null);
  };

  const toggleActive = (id) => {
    setEmployees((current) => current.map((employee) => (employee._id === id ? { ...employee, isActive: !employee.isActive } : employee)));
  };

  // Clicking the status that is already selected clears it
  const markAttendance = (employeeId, status) => {
    setAttendance((current) => {
      const day = { ...(current[attendanceDate] || {}) };
      if (day[employeeId] === status) delete day[employeeId];
      else day[employeeId] = status;
      return { ...current, [attendanceDate]: day };
    });
  };

  const markAllPresent = () => {
    setAttendance((current) => {
      const day = { ...(current[attendanceDate] || {}) };
      workingEmployees.forEach((employee) => { if (!day[employee._id]) day[employee._id] = 'present'; });
      return { ...current, [attendanceDate]: day };
    });
  };

  const savePayment = (payment) => {
    setPayments((current) => [...current, { ...payment, _id: `p${Date.now()}` }]);
    setPopup(null);
  };

  const stats = [
    { icon: Users, label: 'Employees', tone: 'blue', value: String(workingEmployees.length), hint: `${employees.length - workingEmployees.length} left · ${employees.length} total` },
    { icon: IndianRupee, label: 'Salary Earned', tone: 'emerald', value: fmt(totals.earned), hint: `By attendance · ${monthName}` },
    { icon: HandCoins, label: 'Advance + Paid', tone: 'amber', value: fmt(totals.advance + totals.paid), hint: `${fmt(totals.advance)} advance · ${fmt(totals.paid)} salary` },
    { icon: Wallet, label: 'Balance to Pay', tone: 'rose', value: fmt(totals.balance), hint: `Still to be paid · ${monthName}` }
  ];

  return (
    <div className="page-fade-in space-y-4 px-3 pb-8 pt-4 md:space-y-5 lg:px-6 lg:pt-5">
      {/* Header + month switcher */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Payroll</h1>
          <p className="page-subtitle">Employees, attendance, advances and salary · {monthName}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg bg-white shadow-xs ring-1 ring-slate-200">
            <button type="button" className="rounded-l-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800" aria-label="Previous month" onClick={() => setMonthKey(shiftMonth(monthKey, -1))}>
              <ChevronLeft size={18} />
            </button>
            <span className="min-w-[8.5rem] px-1 text-center text-sm font-semibold text-slate-800">{monthName}</span>
            <button
              type="button"
              className="rounded-r-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-30 disabled:hover:bg-transparent"
              aria-label="Next month"
              disabled={monthKey >= currentMonth}
              onClick={() => setMonthKey(shiftMonth(monthKey, 1))}
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <button type="button" className="btn-primary" onClick={() => setPopup({ kind: 'employee' })}>
            <UserPlus size={18} /> Add Employee
          </button>
        </div>
      </div>

      <div className="flex items-start gap-2.5 rounded-xl border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3">
        <Info size={18} className="mt-0.5 shrink-0 text-amber-600" />
        <p className="text-sm text-slate-700">
          <span className="font-bold text-slate-900">Design preview.</span> This screen runs on sample employees so you can try it.
          Nothing you add here is saved yet, and it resets when the page is refreshed.
        </p>
      </div>

      {/* Month summary */}
      <section className="grid grid-cols-2 gap-2.5 md:gap-4 xl:grid-cols-4">
        {stats.map((stat) => <StatCard key={stat.label} {...stat} />)}
      </section>

      <Segmented options={TABS} value={tab} onChange={setTab} />

      <section className="panel">
        {tab === 'salary' && (
          <>
            <div className="panel-header flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Salary Sheet · {monthName}</h3>
                <p className="text-xs text-slate-500">What each employee earned, took as advance and is still owed</p>
              </div>
              <span className="badge-gray">{salaryRows.length} employees</span>
            </div>
            <SalarySheet
              rows={salaryRows}
              totals={totals}
              monthName={monthName}
              daysInMonth={daysInMonth(monthKey)}
              onPay={(employeeId) => setPopup({ kind: 'salary', employeeId })}
              onAdvance={(employeeId) => setPopup({ kind: 'advance', employeeId })}
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
            <EmployeeList employees={visibleEmployees} onEdit={(employee) => setPopup({ kind: 'employee', employee })} onToggleActive={toggleActive} />
          </>
        )}

        {tab === 'attendance' && (
          <>
            <div className="panel-header">
              <h3 className="text-sm font-bold text-slate-900">Attendance</h3>
              <p className="text-xs text-slate-500">Mark each day once. Salary is worked out from these marks.</p>
            </div>
            <AttendanceSheet
              employees={workingEmployees}
              date={attendanceDate}
              dayAttendance={attendance[attendanceDate] || {}}
              onDateChange={setAttendanceDate}
              onMark={markAttendance}
              onMarkAllPresent={markAllPresent}
            />
          </>
        )}

        {tab === 'payments' && (
          <>
            <div className="panel-header flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Payments · {monthName}</h3>
                <p className="text-xs text-slate-500">Salary paid and advances given</p>
              </div>
              <div className="flex gap-2">
                <button type="button" className="btn-secondary" onClick={() => setPopup({ kind: 'advance' })}>
                  <HandCoins size={16} /> Give Advance
                </button>
                <button type="button" className="btn-primary" onClick={() => setPopup({ kind: 'salary' })}>
                  <Banknote size={16} /> Pay Salary
                </button>
              </div>
            </div>
            <PaymentList payments={monthPayments} employeesById={employeesById} />
          </>
        )}
      </section>

      {popup?.kind === 'employee' && (
        <EmployeeFormPopup employee={popup.employee} onSave={saveEmployee} onClose={() => setPopup(null)} />
      )}
      {(popup?.kind === 'salary' || popup?.kind === 'advance') && (
        <PaymentPopup
          type={popup.kind}
          salaryRows={salaryRows}
          monthKey={monthKey}
          defaultEmployeeId={popup.employeeId}
          onSave={savePayment}
          onClose={() => setPopup(null)}
        />
      )}
    </div>
  );
}
