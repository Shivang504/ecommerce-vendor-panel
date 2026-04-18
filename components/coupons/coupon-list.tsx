'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Spinner } from '@/components/ui/spinner';

interface Coupon {
  _id: string;
  title: string;
  code: string;
  createdAt?: string;
  status: boolean;
}

export function CouponList() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingStatusId, setTogglingStatusId] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    fetchCoupons();
  }, [search]);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      const response = await fetch(`/api/admin/coupons?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setCoupons(Array.isArray(data) ? data : []);
      } else {
        setCoupons([]);
      }
    } catch (error) {
      console.error('[v0] Failed to fetch coupons:', error);
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'N/A';
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      setTogglingStatusId(id);
      const coupon = coupons.find(c => c._id === id);
      if (!coupon) return;

      const response = await fetch(`/api/admin/coupons/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...coupon,
          status: !currentStatus,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Coupon ${!currentStatus ? 'activated' : 'deactivated'}`,
          variant: 'success',
        });
        fetchCoupons();
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to update status',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('[v0] Toggle status error:', error);
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive',
      });
    } finally {
      setTogglingStatusId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setDeletingId(deleteId);
      const response = await fetch(`/api/admin/coupons/${deleteId}`, { method: 'DELETE' });
      if (response.ok) {
        toast({
          title: 'Deleted',
          description: 'Coupon removed successfully',
          variant: 'success',
        });
        setCoupons(prev => prev.filter(coupon => coupon._id !== deleteId));
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to delete coupon',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('[v0] Delete coupon error:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete coupon',
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
        <div>
          <h1 className='text-3xl font-bold'>Coupons</h1>
          <p className='text-sm text-muted-foreground'>Manage discount coupons and promotional codes.</p>
        </div>
        <Button onClick={() => router.push('/admin/coupons/add')} className='gap-2 bg-[#22c55e] text-white'>
          <Plus className='h-4 w-4' />
          Add Coupon
        </Button>
      </div>

      <Card className='p-6'>
        <div className='mb-4 flex items-center justify-between'>
          <Input placeholder='Search coupons...' value={search} onChange={e => setSearch(e.target.value)} className='max-w-sm' />
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Create At</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className='text-right'>Action</TableHead>
            </TableRow>
          </TableHeader>
          <DataTableBody loading={loading} data={coupons} columns={5} loadingText='Loading coupons...' emptyText='No coupons found'>
            {coupons.map(coupon => (
              <TableRow key={coupon._id}>
                <TableCell className='font-medium py-4'>{coupon.title}</TableCell>
                <TableCell>{coupon.code}</TableCell>
                <TableCell>{formatDate(coupon.createdAt)}</TableCell>
                <TableCell>
                  {togglingStatusId === coupon._id ? (
                    <Spinner className='h-4 w-4' />
                  ) : (
                    <Switch 
                      checked={coupon.status} 
                      onCheckedChange={() => handleToggleStatus(coupon._id, coupon.status)}
                      disabled={togglingStatusId === coupon._id}
                    />
                  )}
                </TableCell>
                <TableCell className='text-right'>
                  <div className='flex justify-end gap-6'>
                    <button
                      onClick={() => router.push(`/admin/coupons/${coupon._id}`)}
                      disabled={togglingStatusId === coupon._id || deletingId === coupon._id}
                      className='text-gray-600 hover:text-gray-900 hover:bg-gray-100 cursor-pointer'>
                      <Pencil className='h-5 w-5' />
                    </button>
                    <button
                      onClick={() => setDeleteId(coupon._id)}
                      disabled={togglingStatusId === coupon._id || deletingId === coupon._id}
                      className='text-red-500 hover:text-red-700 hover:bg-red-50 cursor-pointer'>
                      <Trash2 className='h-5 w-5' />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </DataTableBody>
        </Table>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. This will permanently delete the coupon.</AlertDialogDescription>
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
