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
import { Switch } from '@/components/ui/switch';
import { DataTableBody } from '@/components/ui/data-table-body';
import { Spinner } from '@/components/ui/spinner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Product {
  id: number | string | null;
  category: string;
  name: string;
  price: string;
  image: string;
}

interface TestimonialSlide {
  _id: string;
  quote: string;
  author: string;
  location: string;
  product: Product;
  leftBanner: string;
  rightBanner: string;
  order: number;
  status: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}

export function TestimonialSlideList() {
  const router = useRouter();
  const { toast } = useToast();
  const [slides, setSlides] = useState<TestimonialSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingStatusId, setTogglingStatusId] = useState<string | null>(null);

  useEffect(() => {
    fetchSlides();
  }, [searchTerm, statusFilter]);

  const fetchSlides = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await fetch(`/api/admin/cms/testimonial-slides?${params}`);
      if (response.ok) {
        const data = await response.json();
        setSlides(Array.isArray(data) ? data : []);
      } else {
        setSlides([]);
      }
    } catch (error) {
      console.error('[v0] Failed to fetch testimonial slides:', error);
      setSlides([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      setDeletingId(deleteId);
      const response = await fetch(`/api/admin/cms/testimonial-slides/${deleteId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Testimonial slide deleted successfully',
          variant: 'success',
        });
        fetchSlides();
      } else {
        toast({
          title: 'Error',
          description: 'Failed to delete testimonial slide',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred while deleting the testimonial slide',
        variant: 'destructive',
      });
    } finally {
      setDeleteId(null);
      setDeletingId(null);
    }
  };

  const handleToggleStatus = async (slideId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      setTogglingStatusId(slideId);
      const response = await fetch(`/api/admin/cms/testimonial-slides/${slideId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Testimonial slide ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`,
          variant: 'success',
        });
        fetchSlides();
      } else {
        toast({
          title: 'Error',
          description: 'Failed to update testimonial slide status',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setTogglingStatusId(null);
    }
  };

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-3xl font-bold'>Testimonial Slides</h1>
        <Button onClick={() => router.push('/admin/cms/testimonial-slides/add')} className='gap-2 bg-[#22c55e]'>
          <Plus className='h-4 w-4' />
          Add Testimonial Slide
        </Button>
      </div>

      <Card className='shadow-md border border-gray-200 overflow-hidden'>
        <div className='flex flex-row gap-2 flex-wrap px-5 py-4'>
          <Input
            placeholder='Search slides...'
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
              <SelectItem value='active'>Active</SelectItem>
              <SelectItem value='inactive'>Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className='overflow-x-auto px-5'>
          <Table>
            <TableHeader>
              <TableRow className='bg-gray-50 border-b border-gray-200 hover:bg-gray-50'>
                <TableHead className='font-semibold text-gray-700 py-4'>Author</TableHead>
                <TableHead className='font-semibold text-gray-700 py-4'>Quote</TableHead>
                <TableHead className='font-semibold text-gray-700 py-4'>Product</TableHead>
                <TableHead className='font-semibold text-gray-700 py-4'>Order</TableHead>
                <TableHead className='font-semibold text-gray-700 py-4 text-center'>Status</TableHead>
                <TableHead className='font-semibold text-gray-700 py-4 text-right'>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <DataTableBody
              loading={loading}
              data={slides}
              columns={6}
              loadingText='Loading testimonial slides...'
              emptyText='No testimonial slides found'>
              {slides.map(slide => (
                <TableRow key={slide._id} className='border-b border-gray-200 hover:bg-green-50 transition-colors duration-150'>
                  <TableCell className='font-semibold text-gray-900 py-4'>
                    <div>
                      <div>{slide.author}</div>
                      <div className='text-sm text-gray-500'>{slide.location}</div>
                    </div>
                  </TableCell>
                  <TableCell className='text-sm text-gray-600 py-4 max-w-md truncate'>{slide.quote}</TableCell>
                  <TableCell className='text-sm text-gray-600 py-4'>{slide.product?.name || 'N/A'}</TableCell>
                  <TableCell className='text-sm text-gray-600 py-4'>{slide.order}</TableCell>
                  <TableCell className='py-4 text-center'>
                    {togglingStatusId === slide._id ? (
                      <Spinner className='h-4 w-4 mx-auto' />
                    ) : (
                      <Switch
                        size='md'
                        checked={slide.status === 'active'}
                        onCheckedChange={() => handleToggleStatus(slide._id, slide.status)}
                        disabled={togglingStatusId === slide._id}
                      />
                    )}
                  </TableCell>
                  <TableCell className='py-4'>
                    <div className='flex justify-end gap-6'>
                      <button
                        onClick={() => router.push(`/admin/cms/testimonial-slides/edit/${slide._id}`)}
                        title='Edit testimonial slide'
                        disabled={togglingStatusId === slide._id || deletingId === slide._id}
                        className='text-gray-600 hover:text-gray-900 hover:bg-gray-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'>
                        <Pencil className='h-5 w-5' />
                      </button>
                      <button
                        onClick={() => setDeleteId(slide._id)}
                        disabled={togglingStatusId === slide._id || deletingId === slide._id}
                        className='text-red-500 hover:text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed'
                        title='Delete testimonial slide'>
                        {deletingId === slide._id ? (
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
            <AlertDialogDescription>This action cannot be undone. This will permanently delete the testimonial slide.</AlertDialogDescription>
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

