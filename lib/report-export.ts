import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export type ReportRow = Record<string, string | number>;

export type ReportSheet = {
  name: string;
  rows: ReportRow[];
};

const GREEN: [number, number, number] = [11, 138, 106];

export function downloadExcel(filename: string, sheets: ReportSheet[]) {
  const book = XLSX.utils.book_new();
  const usable = sheets.filter(sheet => sheet.rows.length > 0);
  const source = usable.length ? usable : [{ name: 'Report', rows: [{ Note: 'No rows' }] }];
  for (const sheet of source) {
    const table = XLSX.utils.json_to_sheet(sheet.rows);
    XLSX.utils.book_append_sheet(book, table, sheet.name.slice(0, 31));
  }
  const name = filename.replace(/\.csv$/i, '');
  XLSX.writeFile(book, name.endsWith('.xlsx') ? name : `${name}.xlsx`);
}

export function downloadPdf(filename: string, options: { title: string; range: string; summary: ReportRow[]; sheets: ReportSheet[] }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(...GREEN);
  doc.rect(0, 0, pageWidth, 72, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Tryvvo', 40, 32);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(options.title, 40, 52);

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.text(options.range, 40, 96);

  let cursor = 112;
  if (options.summary.length) {
    autoTable(doc, {
      startY: cursor,
      head: [Object.keys(options.summary[0])],
      body: options.summary.map(row => Object.values(row).map(value => String(value))),
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [232, 247, 241], textColor: GREEN, fontStyle: 'bold' },
      margin: { left: 40, right: 40 },
    });
    cursor = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || cursor + 40;
    cursor += 18;
  }

  for (const sheet of options.sheets) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...GREEN);
    doc.text(sheet.name, 40, cursor);
    cursor += 8;
    const headers = Object.keys(sheet.rows[0] || { Note: 'No rows' });
    const body = sheet.rows.length
      ? sheet.rows.map(row => headers.map(header => String(row[header] ?? '')))
      : [['No rows in this date range']];
    autoTable(doc, {
      startY: cursor,
      head: [headers],
      body,
      styles: { fontSize: 9, cellPadding: 5, textColor: [30, 41, 59] },
      headStyles: { fillColor: GREEN, textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [243, 250, 246] },
      margin: { left: 40, right: 40 },
    });
    cursor = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || cursor) + 28;
  }

  doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
}
