'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DataTableBody } from '@/components/ui/data-table-body';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Shapes } from 'lucide-react';

interface Attribute {
  _id: string;
  name: string;
  style: string;
  values: string[];
  createdAt?: string;
}

export function AttributeList() {
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    fetchAttributes();
  }, [search]);

  const fetchAttributes = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      const response = await fetch(`/api/admin/attributes?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setAttributes(Array.isArray(data.attributes) ? data.attributes : []);
      } else {
        setAttributes([]);
      }
    } catch (error) {
      console.error('[v0] Failed to fetch attributes:', error);
      setAttributes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const response = await fetch(`/api/admin/attributes/${deleteId}`, { method: 'DELETE' });
      if (response.ok) {
        toast({
          title: 'Deleted',
          description: 'Attribute removed successfully',
          variant:'success'
        });
        setAttributes(prev => prev.filter(attr => attr._id !== deleteId));
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to delete attribute',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('[v0] Delete attribute error:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete attribute',
        variant: 'destructive',
      });
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold'>Attributes</h1>
          <p className='text-sm text-muted-foreground'>Define attribute sets for product variants.</p>
        </div>
        <Button className='gap-2 bg-[#22c55e]' onClick={() => router.push('/admin/attributes/add')}>
          <Plus className='w-4 h-4' />
          Add Attribute
        </Button>
      </div>

      <Card className='p-6 shadow-sm border border-gray-200'>
        <div className='flex flex-wrap gap-3 mb-4'>
          <Input
            placeholder='Search attributes...'
            value={search}
            onChange={e => setSearch(e.target.value)}
            className='max-w-sm'
          />
        </div>

        <div className='overflow-x-auto'>
          <Table>
            <TableHeader>
              <TableRow className='bg-gray-50 border-b border-gray-200'>
                <TableHead className='font-semibold text-gray-700 py-4'>Name</TableHead>
                <TableHead className='font-semibold text-gray-700 py-4'>Style</TableHead>
                <TableHead className='font-semibold text-gray-700 py-4'>Values</TableHead>
                <TableHead className='font-semibold text-gray-700 py-4 text-right'>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <DataTableBody loading={loading} data={attributes} columns={4} loadingText='Loading attributes...' emptyText='No attributes found'>
              {attributes.map(attribute => (
                <TableRow key={attribute._id} className='border-b border-gray-200 hover:bg-green-50 transition-colors duration-150'>
                  <TableCell className='font-semibold text-gray-900 py-4 flex items-center gap-2'>
                    <Shapes className='w-4 h-4 text-muted-foreground' />
                    {attribute.name}
                  </TableCell>
                  <TableCell className='text-gray-600 py-4 capitalize'>{attribute.style}</TableCell>
                  <TableCell className='py-4'>
                    <div className='flex flex-wrap gap-2'>
                      {attribute.values.slice(0, 4).map(value => (
                        <Badge key={value} variant='secondary'>
                          {value}
                        </Badge>
                      ))}
                      {attribute.values.length > 4 && (
                        <span className='text-xs text-muted-foreground'>+{attribute.values.length - 4} more</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className='py-4'>
                    <div className='flex justify-end gap-6'>
                      <button
                        onClick={() => router.push(`/admin/attributes/${attribute._id}`)}
                        className='text-gray-600 hover:text-gray-900 cursor-pointer'>
                        <Pencil className='h-5 w-5' />
                      </button>
                      <button onClick={() => setDeleteId(attribute._id)} className='text-red-500 hover:text-red-700 cursor-pointer'>
                        <Trash2 className='h-5 w-5' />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </DataTableBody>
          </Table>
        </div>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete attribute?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className='bg-destructive' onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


