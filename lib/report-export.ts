import * as XLSX from 'xlsx';

export function downloadExcelCsv(filename: string, rows: Array<Record<string, string | number>>) {
  const sheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Note: 'No rows' }]);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Report');
  const name = filename.replace(/\.csv$/i, '');
  XLSX.writeFile(book, name.endsWith('.xlsx') ? name : `${name}.xlsx`);
}

function pdfEscape(value: string) {
  return value.replace(/[^\x20-\x7E]/g, ' ').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function buildPdf(lines: string[]) {
  const wrapped: string[] = [];
  for (const line of lines) {
    const text = pdfEscape(line);
    if (!text) {
      wrapped.push('');
      continue;
    }
    for (let index = 0; index < text.length; index += 95) wrapped.push(text.slice(index, index + 95));
  }
  const chunks: string[][] = [];
  for (let index = 0; index < Math.max(wrapped.length, 1); index += 42) {
    chunks.push(wrapped.slice(index, index + 42));
  }

  const objects: string[] = [];
  const pageIds: number[] = [];
  let nextId = 4;
  const contentIds: number[] = [];
  for (const chunk of chunks) {
    const contentId = nextId++;
    const pageId = nextId++;
    contentIds.push(contentId);
    pageIds.push(pageId);
    const commands = ['BT', '/F1 10 Tf', '40 800 Td', '14 TL'];
    chunk.forEach((line, index) => {
      commands.push(index === 0 ? `(${line}) Tj` : `T* (${line}) Tj`);
    });
    commands.push('ET');
    const stream = commands.join('\n');
    objects[contentId - 1] = `${contentId} 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`;
    objects[pageId - 1] = `${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents ${contentId} 0 R /Resources << /Font << /F1 3 0 R >> >> >>\nendobj\n`;
  }

  objects[0] = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`;
  objects[1] = `2 0 obj\n<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] >>\nendobj\n`;
  objects[2] = `3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`;

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (let index = 0; index < objects.length; index++) {
    offsets.push(pdf.length);
    pdf += objects[index];
  }
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let index = 1; index < offsets.length; index++) {
    pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

export function downloadPdf(filename: string, title: string, rows: Array<Record<string, string | number>>) {
  const headers = Object.keys(rows[0] || { Note: 'No rows' });
  const lines = [title, '', headers.join(' | ')];
  for (const row of rows) {
    lines.push(headers.map(header => String(row[header] ?? '')).join(' | '));
  }
  const blob = new Blob([buildPdf(lines)], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}
