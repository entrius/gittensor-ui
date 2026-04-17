import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export type ExportCellValue = string | number | null | undefined;

export interface ExportColumn<T> {
  label: string;
  accessor: (row: T) => ExportCellValue;
  width?: number;
}

export interface ExportOptions {
  slug: string;
  title: string;
}

const SHEET_NAME_MAX = 31;

const PDF_HEADER_FILL: [number, number, number] = [30, 30, 30];
const PDF_ALT_ROW_FILL: [number, number, number] = [245, 245, 245];
const PDF_HEADER_TEXT = 255;
const PDF_MUTED_TEXT = 120;
const PDF_PRIMARY_TEXT = 0;

const sanitizeSheetName = (title: string): string =>
  title.replace(/[\\/?*[\]:]/g, '').slice(0, SHEET_NAME_MAX) || 'Sheet1';

export const buildExportFilename = (slug: string, extension: string): string =>
  `gittensor-${slug}-${format(new Date(), 'yyyy-MM-dd')}.${extension}`;

const buildHeaderRow = <T>(columns: ExportColumn<T>[]): string[] =>
  columns.map((column) => column.label);

const rowsToMatrix = <T>(
  rows: T[],
  columns: ExportColumn<T>[],
): ExportCellValue[][] =>
  rows.map((row) => columns.map((column) => column.accessor(row)));

const stringifyCell = (cell: ExportCellValue): string =>
  cell === null || cell === undefined ? '' : String(cell);

const renderPdfHeader = (
  doc: jsPDF,
  title: string,
  exportedAt: string,
): void => {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Gittensor', 40, 40);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.text(title, 40, 58);
  doc.setFontSize(9);
  doc.setTextColor(PDF_MUTED_TEXT);
  doc.text(`Exported ${exportedAt}`, 40, 74);
  doc.setTextColor(PDF_PRIMARY_TEXT);
};

const buildColumnWidths = <T>(columns: ExportColumn<T>[]): { wch: number }[] =>
  columns.map((column) => ({
    wch: Math.max(column.width ?? column.label.length, column.label.length) + 2,
  }));

export const exportRowsToExcel = <T>(
  rows: T[],
  columns: ExportColumn<T>[],
  options: ExportOptions,
): void => {
  const worksheet = XLSX.utils.aoa_to_sheet([
    buildHeaderRow(columns),
    ...rowsToMatrix(rows, columns),
  ]);
  worksheet['!cols'] = buildColumnWidths(columns);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    sanitizeSheetName(options.title),
  );
  XLSX.writeFile(workbook, buildExportFilename(options.slug, 'xlsx'));
};

export const exportRowsToPdf = <T>(
  rows: T[],
  columns: ExportColumn<T>[],
  options: ExportOptions,
): void => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const exportedAt = format(new Date(), "yyyy-MM-dd HH:mm 'UTC'xxx");
  renderPdfHeader(doc, options.title, exportedAt);

  const body = rowsToMatrix(rows, columns).map((cells) =>
    cells.map(stringifyCell),
  );

  autoTable(doc, {
    head: [buildHeaderRow(columns)],
    body,
    startY: 90,
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: PDF_HEADER_FILL, textColor: PDF_HEADER_TEXT },
    alternateRowStyles: { fillColor: PDF_ALT_ROW_FILL },
    margin: { left: 40, right: 40 },
  });

  doc.save(buildExportFilename(options.slug, 'pdf'));
};
