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

interface Brand {
  _id: string;
  name: string;
  image: string;
  bannerImage: string;
  metaTitle: string;
  metaDescription: string;
  metaImage: string;
  status: 'active' | 'inactive';
  createdAt?: string;
}

export function BrandList() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingStatusId, setTogglingStatusId] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    fetchBrands();
  }, [search]);

  const fetchBrands = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      const response = await fetch(`/api/admin/brands?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setBrands(Array.isArray(data) ? data : []);
      } else {
        setBrands([]);
      }
    } catch (error) {
      console.error('[v0] Failed to fetch brands:', error);
      setBrands([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    try {
      setTogglingStatusId(id);
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      const response = await fetch(`/api/admin/brands/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Brand ${newStatus === 'active' ? 'activated' : 'deactivated'}`,
          variant :'success'
        });
        fetchBrands();
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
      const response = await fetch(`/api/admin/brands/${deleteId}`, { method: 'DELETE' });
      if (response.ok) {
        toast({
          title: 'Deleted',
          description: 'Brand removed successfully',
          variant:'success'
        });
        setBrands(prev => prev.filter(brand => brand._id !== deleteId));
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to delete brand',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('[v0] Delete brand error:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete brand',
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
          <h1 className='text-3xl font-bold'>Brands</h1>
          <p className='text-sm text-muted-foreground'>Manage product brands and their details.</p>
        </div>
        <Button onClick={() => router.push('/admin/brands/add')} className='gap-2'>
          <Plus className='h-4 w-4' />
          Add Brand
        </Button>
      </div>

      <Card className='p-6'>
        <div className='mb-4'>
          <Input
            placeholder='Search brands...'
            value={search}
            onChange={e => setSearch(e.target.value)}
            className='max-w-sm'
          />
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Image</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className='text-right'>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <DataTableBody
            loading={loading}
            data={brands}
            columns={4}
            loadingText='Loading brands...'
            emptyText='No brands found'>
            {brands.map(brand => (
              <TableRow key={brand._id}>
                <TableCell className='font-medium'>{brand.name}</TableCell>
                <TableCell>
                  {brand.image ? (
                    <img src={brand.image} alt={brand.name} className='w-12 h-12 object-cover rounded' />
                  ) : (
                    <span className='text-muted-foreground text-sm'>No image</span>
                  )}
                </TableCell>
                <TableCell>
                  {togglingStatusId === brand._id ? (
                    <Spinner className='h-4 w-4' />
                  ) : (
                    <Switch
                      checked={brand.status === 'active'}
                      onCheckedChange={() => handleToggleStatus(brand._id, brand.status)}
                      disabled={togglingStatusId === brand._id}
                    />
                  )}
                </TableCell>
                <TableCell className='text-right'>
                  <div className='flex justify-end gap-6'>
                    <button
                      onClick={() => router.push(`/admin/brands/${brand._id}`)}>
                      <Pencil className='h-5 w-5' />
                    </button>
                    <button
                      onClick={() => setDeleteId(brand._id)}
                      className='text-destructive'>
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
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the brand.
            </AlertDialogDescription>
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

