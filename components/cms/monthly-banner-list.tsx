'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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

interface MonthlyBanner {
  _id: string;
  title: string;
  description: string;
  month: number;
  year: number;
  categories: string[];
  products: Array<{
    id: number | string;
    name: string;
    price: string;
    image: string;
  }>;
  order: number;
  status: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function MonthlyBannerList() {
  const router = useRouter();
  const { toast } = useToast();
  const [banners, setBanners] = useState<MonthlyBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingStatusId, setTogglingStatusId] = useState<string | null>(null);

  useEffect(() => {
    fetchBanners();
  }, [statusFilter]);

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await fetch(`/api/admin/cms/monthly-banners?${params}`);
      if (response.ok) {
        const data = await response.json();
        setBanners(Array.isArray(data) ? data : []);
      } else {
        setBanners([]);
      }
    } catch (error) {
      console.error('[v0] Failed to fetch monthly banners:', error);
      setBanners([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      setDeletingId(deleteId);
      const response = await fetch(`/api/admin/cms/monthly-banners/${deleteId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Monthly banner deleted successfully',
          variant: 'success',
        });
        fetchBanners();
      } else {
        toast({
          title: 'Error',
          description: 'Failed to delete monthly banner',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred while deleting the monthly banner',
        variant: 'destructive',
      });
    } finally {
      setDeleteId(null);
      setDeletingId(null);
    }
  };

  const handleToggleStatus = async (bannerId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      setTogglingStatusId(bannerId);
      const response = await fetch(`/api/admin/cms/monthly-banners/${bannerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Monthly banner ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`,
          variant: 'success',
        });
        fetchBanners();
      } else {
        toast({
          title: 'Error',
          description: 'Failed to update monthly banner status',
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
        <h1 className='text-3xl font-bold'>Monthly Banners</h1>
        <Button onClick={() => router.push('/admin/cms/monthly-banners/add')} className='gap-2 bg-[#22c55e]'>
          <Plus className='h-4 w-4' />
          Add Monthly Banner
        </Button>
      </div>

      <Card className='shadow-md border border-gray-200 overflow-hidden'>
        <div className='flex flex-row gap-2 flex-wrap px-5 py-4'>
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
                <TableHead className='font-semibold text-gray-700 py-4'>Title</TableHead>
                <TableHead className='font-semibold text-gray-700 py-4'>Month/Year</TableHead>
                <TableHead className='font-semibold text-gray-700 py-4'>Products</TableHead>
                <TableHead className='font-semibold text-gray-700 py-4'>Order</TableHead>
                <TableHead className='font-semibold text-gray-700 py-4 text-center'>Status</TableHead>
                <TableHead className='font-semibold text-gray-700 py-4 text-right'>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <DataTableBody
              loading={loading}
              data={banners}
              columns={6}
              loadingText='Loading monthly banners...'
              emptyText='No monthly banners found'>
              {banners.map(banner => (
                <TableRow key={banner._id} className='border-b border-gray-200 hover:bg-green-50 transition-colors duration-150'>
                  <TableCell className='font-semibold text-gray-900 py-4'>{banner.title}</TableCell>
                  <TableCell className='text-sm text-gray-600 py-4'>
                    {monthNames[banner.month - 1]} {banner.year}
                  </TableCell>
                  <TableCell className='text-sm text-gray-600 py-4'>{banner.products?.length || 0} products</TableCell>
                  <TableCell className='text-sm text-gray-600 py-4'>{banner.order}</TableCell>
                  <TableCell className='py-4 text-center'>
                    {togglingStatusId === banner._id ? (
                      <Spinner className='h-4 w-4 mx-auto' />
                    ) : (
                      <Switch
                        size='md'
                        checked={banner.status === 'active'}
                        onCheckedChange={() => handleToggleStatus(banner._id, banner.status)}
                        disabled={togglingStatusId === banner._id}
                      />
                    )}
                  </TableCell>
                  <TableCell className='py-4'>
                    <div className='flex justify-end gap-6'>
                      <button
                        onClick={() => router.push(`/admin/cms/monthly-banners/edit/${banner._id}`)}
                        title='Edit monthly banner'
                        disabled={togglingStatusId === banner._id || deletingId === banner._id}
                        className='text-gray-600 hover:text-gray-900 hover:bg-gray-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'>
                        <Pencil className='h-5 w-5' />
                      </button>
                      <button
                        onClick={() => setDeleteId(banner._id)}
                        disabled={togglingStatusId === banner._id || deletingId === banner._id}
                        className='text-red-500 hover:text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed'
                        title='Delete monthly banner'>
                        {deletingId === banner._id ? (
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
            <AlertDialogDescription>This action cannot be undone. This will permanently delete the monthly banner.</AlertDialogDescription>
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

