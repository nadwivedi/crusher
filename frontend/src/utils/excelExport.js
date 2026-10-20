import { formatDisplayDate } from '../components/CustomRangePopup';

const HEADER_STYLE = { fontWeight: 'bold', backgroundColor: '#E2E8F0' };
const TOTAL_STYLE = { fontWeight: 'bold', backgroundColor: '#F1F5F9' };

// Excel keeps dates without a time zone, so the local calendar day is written as is
// (a sale at 00:30 IST would otherwise land on the previous day)
const toExcelDay = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
};

const toCell = (column, value, style = {}) => {
  if (value === null || value === undefined || value === '') return null;
  if (column.type === 'number') {
    const number = Number(value);
    return Number.isFinite(number) ? { value: number, type: Number, format: column.format || '#,##0.00', ...style } : null;
  }
  if (column.type === 'date') {
    const day = toExcelDay(value);
    return day ? { value: day, type: Date, format: 'dd/mm/yyyy', ...style } : null;
  }
  return { value: String(value), type: String, ...style };
};

/**
 * Download rows as an .xlsx file.
 * columns: [{ key, header, width, type: 'text' | 'number' | 'date', format, value: (row) => any }]
 * totals: { [column key]: value } for a bold last row; the first column reads "Total" unless given
 */
export const downloadExcel = async ({ fileName, sheet, columns, rows, totals }) => {
  // Loaded only when someone exports, so it stays out of the app's first load
  const { default: writeExcelFile } = await import('write-excel-file/browser');

  const data = [
    columns.map((column) => ({ value: column.header, ...HEADER_STYLE })),
    ...rows.map((row) => columns.map((column) => toCell(column, column.value(row))))
  ];
  if (totals) {
    data.push(columns.map((column, index) => {
      const value = totals[column.key];
      if (index === 0 && value === undefined) return { value: 'Total', type: String, ...TOTAL_STYLE };
      return toCell(column, value, TOTAL_STYLE);
    }));
  }

  await writeExcelFile(data, {
    sheet,
    columns: columns.map((column) => ({ width: column.width || 14 })),
    stickyRowsCount: 1
  }).toFile(fileName);
};

// "Sales 01 Apr 2026 to 20 Oct 2026.xlsx"
export const getExportFileName = (name, from, to) => (
  `${name} ${from === to ? formatDisplayDate(from) : `${formatDisplayDate(from)} to ${formatDisplayDate(to)}`}.xlsx`
);
