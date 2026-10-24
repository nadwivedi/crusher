const HEADER_FILL = [226, 232, 240];
const TOTAL_FILL = [241, 245, 249];
const MM_PER_PT = 25.4 / 72;
const PX_PER_PT = 4;

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

// The PDF's built-in font has only Latin letters, so Hindi (or any other script) would print as junk.
// Such text is drawn by the browser, which shapes it properly, and placed in the PDF as a sharp image.
const needsImage = (text) => /[^ -ÿ]/.test(text);

const renderTextImage = (text, sizePt, bold) => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  const fontPx = sizePt * PX_PER_PT;
  const font = `${bold ? 'bold ' : ''}${fontPx}px "Noto Sans Devanagari", "Nirmala UI", Mangal, Arial, sans-serif`;
  context.font = font;
  canvas.width = Math.ceil(context.measureText(text).width) + 2;
  canvas.height = Math.ceil(fontPx * 1.5);
  context.font = font;
  context.fillStyle = '#141414';
  context.textBaseline = 'middle';
  context.fillText(text, 1, canvas.height / 2);
  return {
    dataUrl: canvas.toDataURL('image/png'),
    width: (canvas.width / PX_PER_PT) * MM_PER_PT,
    height: (canvas.height / PX_PER_PT) * MM_PER_PT
  };
};

// One line of heading text with its baseline at y
const drawLine = (doc, text, x, y, sizePt, bold) => {
  if (!needsImage(text)) {
    doc.text(text, x, y);
    return;
  }
  const image = renderTextImage(text, sizePt, bold);
  const middle = y - sizePt * MM_PER_PT * 0.35;
  doc.addImage(image.dataUrl, 'PNG', x, middle - image.height / 2, image.width, image.height);
};

/**
 * Download rows as a printable A4 PDF table, landscape unless orientation is 'portrait'.
 * Takes the same columns, rows and totals as downloadExcel; a column with pdf: false is left out to fit the page.
 * title and the subtitle line (or lines) are printed above the table on the first page.
 */
export const downloadPdf = async ({ fileName, title, subtitle, columns, rows, totals, orientation = 'landscape' }) => {
  // Loaded only when someone exports, so it stays out of the app's first load
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);

  const pdfColumns = columns.filter((column) => column.pdf !== false);
  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  drawLine(doc, title, 8, 12, 14, true);
  const subtitleLines = [].concat(subtitle || []).filter(Boolean);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(90);
  subtitleLines.forEach((line, index) => drawLine(doc, line, 8, 17.5 + index * 4.5, 9, false));
  doc.setTextColor(0);

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
    startY: 16 + subtitleLines.length * 4.5,
    margin: { top: 10, right: 8, bottom: 12, left: 8 },
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 7.5, cellPadding: 1.2, textColor: 20, lineColor: 170, lineWidth: 0.1, overflow: 'linebreak', valign: 'middle' },
    headStyles: { fillColor: HEADER_FILL, textColor: 20, fontStyle: 'bold' },
    footStyles: { fillColor: TOTAL_FILL, textColor: 20, fontStyle: 'bold' },
    didParseCell: ({ cell, column }) => {
      // Numbers line up on the right, in the header and total row too
      if (pdfColumns[column.index]?.type === 'number' || pdfColumns[column.index]?.align === 'right') cell.styles.halign = 'right';
      const text = cell.text.join(' ');
      if (needsImage(text)) {
        cell.imageText = text;
        cell.text = [''];
      }
    },
    didDrawCell: ({ cell }) => {
      if (!cell.imageText) return;
      const image = renderTextImage(cell.imageText, cell.styles.fontSize, cell.styles.fontStyle === 'bold');
      // A long name is shrunk to fit its column
      const scale = Math.min(1, (cell.width - cell.padding('horizontal')) / image.width);
      const width = image.width * scale;
      const height = image.height * scale;
      const x = cell.styles.halign === 'right' ? cell.x + cell.width - cell.padding('right') - width : cell.x + cell.padding('left');
      doc.addImage(image.dataUrl, 'PNG', x, cell.y + (cell.height - height) / 2, width, height);
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
