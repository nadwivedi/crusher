// Sample data for the payroll design preview. Nothing here is saved.
// The shapes are what the payroll API will return once the screen is wired up.
import { shiftMonth, toDateKey, toMonthKey } from './payrollUtils';

export const ROLES = ['Supervisor', 'Munshi', 'Machine Operator', 'JCB Operator', 'Driver', 'Loader', 'Helper', 'Security Guard'];

export const SAMPLE_EMPLOYEES = [
  { _id: 'e1', name: 'Ramesh Sahu', mobile: '9826012345', role: 'Supervisor', salaryType: 'monthly', rate: 22000, joiningDate: '2023-04-10', isActive: true },
  { _id: 'e2', name: 'Dinesh Verma', mobile: '9893054321', role: 'Munshi', salaryType: 'monthly', rate: 15000, joiningDate: '2024-01-15', isActive: true },
  { _id: 'e3', name: 'Santosh Yadav', mobile: '9755067890', role: 'Machine Operator', salaryType: 'monthly', rate: 18000, joiningDate: '2023-08-01', isActive: true },
  { _id: 'e4', name: 'Mukesh Nishad', mobile: '9340011223', role: 'JCB Operator', salaryType: 'monthly', rate: 17000, joiningDate: '2024-06-20', isActive: true },
  { _id: 'e5', name: 'Raju Dhruw', mobile: '9770044556', role: 'Driver', salaryType: 'daily', rate: 650, joiningDate: '2025-02-03', isActive: true },
  { _id: 'e6', name: 'Bhola Netam', mobile: '9109077889', role: 'Loader', salaryType: 'daily', rate: 450, joiningDate: '2025-05-12', isActive: true },
  { _id: 'e7', name: 'Sunil Markam', mobile: '9302099001', role: 'Helper', salaryType: 'daily', rate: 400, joiningDate: '2025-09-01', isActive: true },
  { _id: 'e8', name: 'Kishan Patel', mobile: '9424033445', role: 'Security Guard', salaryType: 'monthly', rate: 11000, joiningDate: '2022-11-05', isActive: false }
];

// Attendance for the last two months up to yesterday, so today can be marked by hand in the preview.
export const buildSampleAttendance = (today = new Date()) => {
  const attendance = {};
  const cursor = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);

  while (cursor <= yesterday) {
    const day = {};
    SAMPLE_EMPLOYEES.forEach((employee, index) => {
      if (!employee.isActive) return;
      const pattern = (index * 7 + cursor.getDate() * 3 + cursor.getMonth()) % 11;
      day[employee._id] = pattern === 0 ? 'absent' : pattern === 1 ? 'half' : 'present';
    });
    attendance[toDateKey(cursor)] = day;
    cursor.setDate(cursor.getDate() + 1);
  }

  return attendance;
};

export const buildSamplePayments = (today = new Date()) => {
  const thisMonth = toMonthKey(today);
  const lastMonth = shiftMonth(thisMonth, -1);
  // Keeps sample dates inside the month and not in the future
  const dayThisMonth = (day) => `${thisMonth}-${String(Math.min(day, today.getDate())).padStart(2, '0')}`;

  return [
    { _id: 'p1', employeeId: 'e5', type: 'advance', amount: 2000, date: dayThisMonth(2), month: thisMonth, mode: 'Cash', notes: 'Festival advance' },
    { _id: 'p2', employeeId: 'e3', type: 'advance', amount: 3000, date: dayThisMonth(3), month: thisMonth, mode: 'Cash', notes: '' },
    { _id: 'p3', employeeId: 'e6', type: 'advance', amount: 500, date: dayThisMonth(4), month: thisMonth, mode: 'Cash', notes: 'Ration' },
    { _id: 'p4', employeeId: 'e1', type: 'salary', amount: 21000, date: dayThisMonth(1), month: lastMonth, mode: 'Bank', notes: '' },
    { _id: 'p5', employeeId: 'e2', type: 'salary', amount: 14500, date: dayThisMonth(1), month: lastMonth, mode: 'Bank', notes: '' },
    { _id: 'p6', employeeId: 'e3', type: 'salary', amount: 17000, date: dayThisMonth(1), month: lastMonth, mode: 'Cash', notes: '' },
    { _id: 'p7', employeeId: 'e5', type: 'salary', amount: 15000, date: `${lastMonth}-28`, month: lastMonth, mode: 'Cash', notes: 'Part payment' }
  ];
};
