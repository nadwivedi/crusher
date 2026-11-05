export const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Math.round(Number(n) || 0));
export const fmtNum = (n) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 }).format(n || 0);

export const toDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
export const toMonthKey = (date) => toDateKey(date).slice(0, 7);

export const shiftMonth = (monthKey, delta) => {
  const [year, month] = monthKey.split('-').map(Number);
  return toMonthKey(new Date(year, month - 1 + delta, 1));
};

export const daysInMonth = (monthKey) => {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year, month, 0).getDate();
};

export const monthLabel = (monthKey) => new Date(`${monthKey}-01T00:00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
export const shortMonthLabel = (monthKey) => new Date(`${monthKey}-01T00:00:00`).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
export const formatDate = (dateKey) => (dateKey
  ? new Date(`${dateKey}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  : '-');

export const ROLES = ['Supervisor', 'Munshi', 'Manager', 'Machine Operator', 'JCB Operator', 'Driver', 'Loader', 'Helper', 'Mechanic', 'Security Guard'];

export const SALARY_TYPES = {
  monthly: { label: 'Monthly Salary', unit: 'month' },
  daily: { label: 'Daily Wage', unit: 'day' }
};
export const rateLabel = (employee) => `${fmt(employee.rate)} / ${SALARY_TYPES[employee.salaryType]?.unit || 'month'}`;

// days = how much of a day's pay each mark earns (the server counts it the same way)
export const ATTENDANCE = [
  { key: 'present', label: 'Present', short: 'P', days: 1, active: 'bg-emerald-600 text-white ring-emerald-600', cell: 'bg-emerald-100 text-emerald-800', text: 'text-emerald-700' },
  { key: 'half', label: 'Half Day', short: 'H', days: 0.5, active: 'bg-amber-500 text-white ring-amber-500', cell: 'bg-amber-100 text-amber-800', text: 'text-amber-700' },
  { key: 'leave', label: 'Paid Leave', short: 'L', days: 1, active: 'bg-sky-600 text-white ring-sky-600', cell: 'bg-sky-100 text-sky-800', text: 'text-sky-700' },
  { key: 'absent', label: 'Absent', short: 'A', days: 0, active: 'bg-rose-600 text-white ring-rose-600', cell: 'bg-rose-100 text-rose-700', text: 'text-rose-700' }
];
export const ATTENDANCE_BY_KEY = Object.fromEntries(ATTENDANCE.map((status) => [status.key, status]));
// Clicking a register cell moves to the next mark, then back to empty
export const nextStatus = (status) => {
  const order = ['present', 'half', 'leave', 'absent', ''];
  return order[(order.indexOf(status || '') + 1) % order.length];
};

// salary / advance move money out of an account; bonus / deduction only change what the month earned
export const ENTRY_TYPES = {
  salary: { label: 'Salary Paid', short: 'Salary', badge: 'badge-green', money: true, sign: '−' },
  advance: { label: 'Advance', short: 'Advance', badge: 'badge-orange', money: true, sign: '−' },
  bonus: { label: 'Bonus / Incentive', short: 'Bonus', badge: 'badge-blue', money: false, sign: '+' },
  deduction: { label: 'Deduction / Fine', short: 'Deduction', badge: 'badge-red', money: false, sign: '−' }
};

export const dayLabel = (dateKey) => new Date(`${dateKey}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short' });
export const isSunday = (dateKey) => new Date(`${dateKey}T00:00:00`).getDay() === 0;

export const whatsappUrl = (mobile, text) => {
  let phone = String(mobile || '').replace(/\D/g, '');
  if (phone.length === 10) phone = `91${phone}`;
  return phone ? `whatsapp://send?phone=${phone}&text=${encodeURIComponent(text)}` : `whatsapp://send?text=${encodeURIComponent(text)}`;
};
