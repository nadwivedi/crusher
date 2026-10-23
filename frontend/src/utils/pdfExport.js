const HEADER_FILL = [226, 232, 240];
const TOTAL_FILL = [241, 245, 249];

// Decimals for a number column, read from its Excel format: '#,##0' none, '#,##0.000' three, otherwise up to two
const decimalsOf = (column) => {
  const match = /\.(0+)$/.exec(column.format || '');
  if (match) return { minimumFractionDigits: match[1].length, maximumFractionDigits: match[1].length };
  if (column.format === '#,##0') return { maximumFractionDigits: 0 };
  return { maximumFractionDigits: 2 };
};

const toText = (column, value) => {
  if (value === null || value === undefined || value === '') return '';
  if (column.type === 'number') {
    const number = Number(value);
    return Number.isFinite(number) ? number.toLocaleString('en-IN', decimalsOf(column)) : '';
  }
  if (column.type === 'date') {
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime())
      ? ''
      : date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
  return String(value);
};

/**
 * Download rows as a printable A4 landscape PDF table.
 * Takes the same columns, rows and totals as downloadExcel; a column with pdf: false is left out to fit the page.
 * title and subtitle are printed above the table on the first page.
 */
export const downloadPdf = async ({ fileName, title, subtitle, columns, rows, totals }) => {
  // Loaded only when someone exports, so it stays out of the app's first load
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);

  const pdfColumns = columns.filter((column) => column.pdf !== false);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(title, 8, 12);
  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(90);
    doc.text(subtitle, 8, 17.5);
    doc.setTextColor(0);
  }

  const foot = totals
    ? [pdfColumns.map((column, index) => {
      const value = totals[column.key];
      if (index === 0 && value === undefined) return 'Total';
      return typeof value === 'string' ? value : toText(column, value);
    })]
    : undefined;

  autoTable(doc, {
    head: [pdfColumns.map((column) => column.header)],
    body: rows.map((row) => pdfColumns.map((column) => toText(column, column.value(row)))),
    foot,
    showHead: 'everyPage',
    showFoot: 'lastPage',
    startY: subtitle ? 21 : 16,
    margin: { top: 10, right: 8, bottom: 12, left: 8 },
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 7.5, cellPadding: 1.2, textColor: 20, lineColor: 170, lineWidth: 0.1, overflow: 'linebreak', valign: 'middle' },
    headStyles: { fillColor: HEADER_FILL, textColor: 20, fontStyle: 'bold' },
    footStyles: { fillColor: TOTAL_FILL, textColor: 20, fontStyle: 'bold' },
    // Numbers line up on the right, in the header and total row too
    didParseCell: ({ cell, column }) => {
      if (pdfColumns[column.index]?.type === 'number') cell.styles.halign = 'right';
    }
  });

  const pageCount = doc.getNumberOfPages();
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(110);
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.text(`Page ${page} of ${pageCount}`, pageWidth - 8, pageHeight - 5, { align: 'right' });
  }

  doc.save(fileName);
};

