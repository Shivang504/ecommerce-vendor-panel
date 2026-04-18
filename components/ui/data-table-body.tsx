import { ReactNode } from 'react';
import { TableBody, TableCell, TableRow } from '@/components/ui/table';

interface DataTableBodyProps<T> {
  loading: boolean;
  data: T[];
  columns: number;
  loadingText?: string;
  emptyText?: string;
  children: ReactNode;
}

export function DataTableBody<T>({
  loading,
  data,
  columns,
  loadingText = 'Loading...',
  emptyText = 'No data found',
  children,
}: DataTableBodyProps<T>) {
  return (
    <TableBody>
      {loading ? (
        <TableRow>
          <TableCell colSpan={columns} className='py-10 text-center text-muted-foreground'>
            {loadingText}
          </TableCell>
        </TableRow>
      ) : data.length === 0 ? (
        <TableRow>
          <TableCell colSpan={columns} className='py-10 text-center text-muted-foreground'>
            {emptyText}
          </TableCell>
        </TableRow>
      ) : (
        children
      )}
    </TableBody>
  );
}


