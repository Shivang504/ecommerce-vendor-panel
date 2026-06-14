'use client';

import * as React from 'react';
import * as XLSX from 'xlsx';
import { Upload, Download, FileSpreadsheet } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Spinner } from '@/components/ui/spinner';
import {
  ALLOWED_IMPORT_EXTENSIONS,
  MAX_IMPORT_ROWS,
  PRODUCT_IMPORT_TEMPLATE_ROWS,
  ProductImportRow,
  ProductImportRowSchema,
  mapRawRowToImportRow,
  validateFileMeta,
} from '@/lib/product-bulk-import';

interface ProductBulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: () => void;
  isVendor?: boolean;
}

export function ProductBulkImportDialog({
  open,
  onOpenChange,
  onImportComplete,
  isVendor = false,
}: ProductBulkImportDialogProps) {
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<ProductImportRow[]>([]);
  const [rowErrors, setRowErrors] = React.useState<Array<{ rowNumber: number; message: string }>>([]);
  const [isParsing, setIsParsing] = React.useState(false);
  const [isImporting, setIsImporting] = React.useState(false);
  const [updateExisting, setUpdateExisting] = React.useState(false);

  const resetState = () => {
    setFileName(null);
    setRows([]);
    setRowErrors([]);
    setUpdateExisting(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  React.useEffect(() => {
    if (!open) {
      resetState();
    }
  }, [open]);

  const parseFile = async (file: File) => {
    const fileError = validateFileMeta(file);
    if (fileError) {
      setRowErrors([{ rowNumber: 0, message: fileError }]);
      toast({ title: 'Invalid file', description: fileError, variant: 'destructive' });
      return;
    }

    setIsParsing(true);
    setFileName(file.name);
    setRows([]);
    setRowErrors([]);

    try {
      const buffer = await file.arrayBuffer();
      const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
      const workbook =
        ext === '.csv'
          ? XLSX.read(new TextDecoder('utf-8').decode(buffer), { type: 'string' })
          : XLSX.read(buffer, { type: 'array' });

      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        setRowErrors([{ rowNumber: 0, message: 'No sheets found in the uploaded file' }]);
        return;
      }

      const sheet = workbook.Sheets[sheetName];
      const raw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (raw.length === 0) {
        setRowErrors([{ rowNumber: 0, message: 'The file contains no data rows' }]);
        return;
      }

      if (raw.length > MAX_IMPORT_ROWS) {
        setRowErrors([
          { rowNumber: 0, message: `Too many rows (${raw.length}). Maximum allowed is ${MAX_IMPORT_ROWS}` },
        ]);
        return;
      }

      const mapped: ProductImportRow[] = [];
      const errors: Array<{ rowNumber: number; message: string }> = [];

      for (let i = 0; i < raw.length; i++) {
        const rowNumber = i + 2;
        const candidate = mapRawRowToImportRow(raw[i] ?? {}, rowNumber);

        if (!candidate.name && !candidate.sku && !candidate.category) {
          continue;
        }

        const parsed = ProductImportRowSchema.safeParse(candidate);
        if (!parsed.success) {
          errors.push({
            rowNumber,
            message: parsed.error.issues.map(x => x.message).join('; '),
          });
          continue;
        }

        mapped.push(parsed.data);
      }

      setRows(mapped);
      setRowErrors(errors);

      if (mapped.length === 0) {
        toast({
          title: 'No valid rows found',
          description: 'Please check your file columns and data against the template.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'File parsed',
          description: `${mapped.length} valid row(s) ready to import${errors.length ? `, ${errors.length} row(s) with errors` : ''}.`,
          variant: errors.length ? 'destructive' : 'success',
        });
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to parse file';
      setRowErrors([{ rowNumber: 0, message }]);
      toast({ title: 'Parse failed', description: message, variant: 'destructive' });
    } finally {
      setIsParsing(false);
    }
  };

  const downloadTemplate = (format: 'xlsx' | 'csv') => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(PRODUCT_IMPORT_TEMPLATE_ROWS);
    XLSX.utils.book_append_sheet(wb, ws, 'Products');

    if (format === 'csv') {
      XLSX.writeFile(wb, 'product-import-template.csv', { bookType: 'csv' });
    } else {
      XLSX.writeFile(wb, 'product-import-template.xlsx');
    }
  };

  const handleImport = async () => {
    if (rows.length === 0) return;
    setIsImporting(true);

    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch('/api/admin/products/bulk-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ rows, options: { updateExisting } }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast({
          title: 'Import failed',
          description: data?.error || 'Failed to import products.',
          variant: 'destructive',
        });
        return;
      }

      const errCount = Array.isArray(data?.errors) ? data.errors.length : 0;
      toast({
        title: errCount ? 'Imported with warnings' : 'Import complete',
        description: `Created: ${data.created || 0}, Updated: ${data.updated || 0}, Skipped: ${data.skipped || 0}.`,
        variant: errCount ? 'destructive' : 'success',
      });

      if (errCount) {
        setRowErrors(data.errors);
      } else {
        onImportComplete?.();
        onOpenChange(false);
      }
    } catch (e: unknown) {
      toast({
        title: 'Import failed',
        description: e instanceof Error ? e.message : 'Something went wrong.',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-4xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <FileSpreadsheet className='h-5 w-5' />
            Bulk Product Import
          </DialogTitle>
          <DialogDescription>
            Upload an Excel or CSV file to create multiple products at once. Download the sample template to get started.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          <div className='flex flex-wrap gap-2'>
            <Button variant='outline' size='sm' onClick={() => downloadTemplate('xlsx')}>
              <Download className='h-4 w-4 mr-2' />
              Excel Template
            </Button>
            <Button variant='outline' size='sm' onClick={() => downloadTemplate('csv')}>
              <Download className='h-4 w-4 mr-2' />
              CSV Template
            </Button>
          </div>

          <div className='rounded-lg border border-dashed border-slate-300 p-4 space-y-3'>
            <div className='text-sm font-medium'>Upload file</div>
            <Input
              ref={fileInputRef}
              type='file'
              accept={ALLOWED_IMPORT_EXTENSIONS.join(',')}
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) void parseFile(f);
              }}
              disabled={isParsing || isImporting}
            />
            {fileName ? <div className='text-xs text-muted-foreground'>Selected: {fileName}</div> : null}
            <div className='text-xs text-muted-foreground'>
              Accepted formats: {ALLOWED_IMPORT_EXTENSIONS.join(', ')}. Max {MAX_IMPORT_ROWS} rows per import.
            </div>
          </div>

          <div className='text-xs text-muted-foreground'>
            Required: <Badge variant='secondary'>Name</Badge> <Badge variant='secondary'>SKU</Badge>{' '}
            <Badge variant='secondary'>Category</Badge> <Badge variant='secondary'>Short Description</Badge>{' '}
            <Badge variant='secondary'>Long Description</Badge>. For non-jewellery:{' '}
            <Badge variant='secondary'>Regular Price</Badge> <Badge variant='secondary'>Selling Price</Badge>. For
            jewellery: <Badge variant='secondary'>Weight (gm)</Badge> <Badge variant='secondary'>Purity</Badge>{' '}
            <Badge variant='secondary'>Making Charges</Badge>.
            {!isVendor && (
              <>
                {' '}
                Admin: optional <Badge variant='secondary'>Vendor</Badge> column (defaults to Main Store).
              </>
            )}
          </div>

          <div className='flex items-center justify-between gap-3'>
            <label className='text-sm text-muted-foreground flex items-center gap-2'>
              <input
                type='checkbox'
                checked={updateExisting}
                onChange={e => setUpdateExisting(e.target.checked)}
                disabled={isParsing || isImporting}
              />
              Update existing products (match by SKU)
            </label>
            <div className='flex gap-2'>
              <Button variant='outline' onClick={() => onOpenChange(false)} disabled={isImporting}>
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={isParsing || isImporting || rows.length === 0}
                className='bg-[#22c55e] text-white gap-2'
              >
                {isImporting ? <Spinner className='h-4 w-4' /> : <Upload className='h-4 w-4' />}
                Import {rows.length > 0 ? `(${rows.length})` : ''}
              </Button>
            </div>
          </div>

          {rowErrors.length > 0 && (
            <div className='rounded-lg border border-red-200 bg-red-50 p-4 space-y-2'>
              <div className='font-semibold text-red-700 text-sm'>Validation / Import Issues</div>
              <div className='space-y-1 text-sm text-red-700/90 max-h-32 overflow-y-auto'>
                {rowErrors.slice(0, 20).map((e, idx) => (
                  <div key={`${e.rowNumber}-${idx}`}>
                    {e.rowNumber > 0 ? `Row ${e.rowNumber}: ` : ''}
                    {e.message}
                  </div>
                ))}
                {rowErrors.length > 20 && (
                  <div className='text-xs text-red-700/80'>Showing first 20 of {rowErrors.length} issues.</div>
                )}
              </div>
            </div>
          )}

          <div className='rounded-lg border overflow-hidden'>
            <div className='p-3 border-b bg-slate-50 flex items-center justify-between'>
              <div className='font-semibold text-sm'>Preview</div>
              <div className='text-sm text-muted-foreground'>
                {isParsing ? 'Parsing…' : `${rows.length} valid row(s)`}
              </div>
            </div>
            <div className='overflow-x-auto p-3'>
              {isParsing ? (
                <div className='flex items-center justify-center py-8'>
                  <Spinner className='h-6 w-6' />
                  <span className='ml-2 text-sm'>Parsing file…</span>
                </div>
              ) : rows.length === 0 ? (
                <div className='py-8 text-center text-gray-500 text-sm'>
                  Upload a template-filled file to preview rows.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Row</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Stock</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.slice(0, 10).map(r => (
                      <TableRow key={r.rowNumber}>
                        <TableCell>{r.rowNumber}</TableCell>
                        <TableCell className='font-medium max-w-[160px] truncate'>{r.name}</TableCell>
                        <TableCell>{r.sku}</TableCell>
                        <TableCell>{r.category}</TableCell>
                        <TableCell>{r.product_type}</TableCell>
                        <TableCell>{r.status}</TableCell>
                        <TableCell>₹{r.sellingPrice}</TableCell>
                        <TableCell>{r.stock}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {rows.length > 10 && (
                <div className='pt-2 text-xs text-muted-foreground'>Showing first 10 of {rows.length} rows.</div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
