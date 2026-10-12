// Shared by the Meter Reading page and the entry popup

export const formatNumber = (value) => Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

// Local calendar date as YYYY-MM-DD ('' when the value is not a date)
export const toDateKey = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

export const daysAgoKey = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return toDateKey(date);
};

export const formatDayKey = (key) => {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const DG_KEY = 'dg';
export const machineKeyOf = (reading) => (reading.machine === 'dg' ? DG_KEY : String(reading.vehicle || reading.vehicleNo));

export const hasValue = (value) => value !== null && value !== undefined && value !== '';
export const runOf = (reading) => (hasValue(reading.closingReading) ? Number(reading.closingReading) - Number(reading.openingReading) : null);

// Oldest first; same-day entries in the order they were made
export const byOldest = (a, b) => a.dateKey.localeCompare(b.dateKey) || new Date(a.createdAt) - new Date(b.createdAt);

export const unitText = (unit) => (unit === 'hr' ? 'hr' : 'km');
export const runLabel = (unit) => (unit === 'hr' ? 'Hours Run' : 'KM Run');

// Readings from the API with their local date key and run (null until closed)
export const withDateKeys = (readings) => readings.map((reading) => ({ ...reading, dateKey: toDateKey(reading.readingDate), run: runOf(reading) }));
