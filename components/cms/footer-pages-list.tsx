'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DataTableBody } from '@/components/ui/data-table-body';
import { Spinner } from '@/components/ui/spinner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface FooterPage {
  _id: string;
  title: string;
  slug: string;
  section: 'about' | 'help' | 'consumer-policy';
  status: 'draft' | 'published';
  createdAt?: string;
  updatedAt?: string;
}

const sectionLabels: Record<string, string> = {
  'about': 'About',
  'help': 'Help',
  'consumer-policy': 'Consumer Policy',
};

export function FooterPagesList() {
  const router = useRouter();
  const { toast } = useToast();
  const [pages, setPages] = useState<FooterPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPages();
  }, [searchTerm, statusFilter, sectionFilter]);

  const fetchPages = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (sectionFilter !== 'all') params.append('section', sectionFilter);

      const response = await fetch(`/api/admin/cms/footer-pages?${params}`);
      if (response.ok) {
        const data = await response.json();
        setPages(Array.isArray(data) ? data : []);
      } else {
        setPages([]);
      }
    } catch (error) {
      console.error('[v0] Failed to fetch footer pages:', error);
      setPages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      setDeletingId(deleteId);
      const response = await fetch(`/api/admin/cms/footer-pages/${deleteId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Footer page deleted successfully',
          variant: 'success',
        });
        fetchPages();
      } else {
        toast({
          title: 'Error',
          description: 'Failed to delete footer page',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred while deleting the footer page',
        variant: 'destructive',
      });
    } finally {
      setDeleteId(null);
      setDeletingId(null);
    }
  };

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-3xl font-bold'>Footer Pages</h1>
        <Button onClick={() => router.push('/admin/cms/footer-pages/add')} className='gap-2 bg-[#22c55e]'>
          <Plus className='h-4 w-4' />
          Add Footer Page
        </Button>
      </div>

      <Card className='shadow-md border border-gray-200 overflow-hidden'>
        <div className='flex flex-row gap-2 flex-wrap px-5 py-4'>
          <Input
            placeholder='Search footer pages...'
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className='border-gray-300 focus:ring-green-500 max-w-[300px]'
          />

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className='border-gray-300'>
              <SelectValue placeholder='Filter by status' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All Status</SelectItem>
              <SelectItem value='published'>Published</SelectItem>
              <SelectItem value='draft'>Draft</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sectionFilter} onValueChange={setSectionFilter}>
            <SelectTrigger className='border-gray-300'>
              <SelectValue placeholder='Filter by section' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All Sections</SelectItem>
              <SelectItem value='about'>About</SelectItem>
              <SelectItem value='help'>Help</SelectItem>
              <SelectItem value='consumer-policy'>Consumer Policy</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className='overflow-x-auto px-5'>
          <Table>
            <TableHeader>
              <TableRow className='bg-gray-50 border-b border-gray-200 hover:bg-gray-50'>
                <TableHead className='font-semibold text-gray-700 py-4'>Title</TableHead>
                <TableHead className='font-semibold text-gray-700 py-4'>Slug</TableHead>
                <TableHead className='font-semibold text-gray-700 py-4'>Section</TableHead>
                <TableHead className='font-semibold text-gray-700 py-4'>Status</TableHead>
                <TableHead className='font-semibold text-gray-700 py-4 text-right'>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <DataTableBody
              loading={loading}
              data={pages}
              columns={5}
              loadingText='Loading footer pages...'
              emptyText='No footer pages found'>
              {pages.map(page => (
                <TableRow key={page._id} className='border-b border-gray-200 hover:bg-green-50 transition-colors duration-150'>
                  <TableCell className='font-semibold text-gray-900 py-4'>{page.title}</TableCell>
                  <TableCell className='text-sm text-gray-600 py-4 font-mono'>{page.slug}</TableCell>
                  <TableCell className='py-4'>
                    <Badge variant='outline'>
                      {sectionLabels[page.section] || page.section}
                    </Badge>
                  </TableCell>
                  <TableCell className='py-4'>
                    <Badge variant={page.status === 'published' ? 'default' : 'secondary'}>
                      {page.status}
                    </Badge>
                  </TableCell>
                  <TableCell className='py-4'>
                    <div className='flex justify-end gap-6'>
                      <button
                        onClick={() => router.push(`/admin/cms/footer-pages/edit/${page._id}`)}
                        title='Edit footer page'
                        disabled={deletingId === page._id}
                        className='text-gray-600 hover:text-gray-900 hover:bg-gray-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'>
                        <Pencil className='h-5 w-5' />
                      </button>
                      <button
                        onClick={() => setDeleteId(page._id)}
                        disabled={deletingId === page._id}
                        className='text-red-500 hover:text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed'
                        title='Delete footer page'>
                        {deletingId === page._id ? (
                          <Spinner className='h-5 w-5' />
                        ) : (
                          <Trash2 className='h-5 w-5' />
                        )}
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
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. This will permanently delete the footer page.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletingId}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className='bg-destructive' disabled={!!deletingId}>
              {deletingId ? <Spinner className='h-4 w-4 mr-2' /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

