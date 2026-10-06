export const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
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
export const formatDate = (dateKey) => new Date(`${dateKey}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

export const SALARY_TYPES = {
  monthly: { label: 'Monthly Salary', unit: 'month' },
  daily: { label: 'Daily Wage', unit: 'day' }
};
export const rateLabel = (employee) => `${fmt(employee.rate)} / ${SALARY_TYPES[employee.salaryType]?.unit || 'month'}`;

// days = how much of a day's pay each status earns
export const ATTENDANCE = [
  { key: 'present', label: 'Present', short: 'P', days: 1, active: 'bg-emerald-600 text-white ring-emerald-600', text: 'text-emerald-700' },
  { key: 'half', label: 'Half Day', short: 'H', days: 0.5, active: 'bg-amber-500 text-white ring-amber-500', text: 'text-amber-700' },
  { key: 'absent', label: 'Absent', short: 'A', days: 0, active: 'bg-rose-600 text-white ring-rose-600', text: 'text-rose-700' }
];

export const PAYMENT_MODES = ['Cash', 'Bank', 'UPI'];

/**
 * One row per employee for the month: days worked, salary earned, advance taken, salary paid and balance.
 * Monthly staff earn (salary / days in the month) per day worked; daily wage staff earn their rate per day worked.
 * Advances are taken out of the salary of the month they were given in.
 */
export const buildSalaryRows = (employees, attendance, payments, monthKey) => {
  const totalDays = daysInMonth(monthKey);

  return employees.map((employee) => {
    const counts = { present: 0, half: 0, absent: 0 };
    for (let day = 1; day <= totalDays; day += 1) {
      const status = attendance[`${monthKey}-${String(day).padStart(2, '0')}`]?.[employee._id];
      if (status) counts[status] += 1;
    }

    const daysWorked = counts.present + counts.half * 0.5;
    const perDay = employee.salaryType === 'monthly' ? employee.rate / totalDays : employee.rate;
    const earned = Math.round(perDay * daysWorked);

    const monthPayments = payments.filter((payment) => payment.employeeId === employee._id && payment.month === monthKey);
    const sumOf = (type) => monthPayments.filter((payment) => payment.type === type).reduce((total, payment) => total + payment.amount, 0);
    const advance = sumOf('advance');
    const paid = sumOf('salary');

    return { employee, ...counts, daysWorked, earned, advance, paid, balance: earned - advance - paid };
  }).filter((row) => row.employee.isActive || row.daysWorked > 0 || row.advance > 0 || row.paid > 0);
};
