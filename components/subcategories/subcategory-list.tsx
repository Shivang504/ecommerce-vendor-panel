'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { Plus, Pencil, Trash2, Download, Eye } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { CommonDialog } from '../dialog/dialog';
import { DataTableBody } from '@/components/ui/data-table-body';
import { Spinner } from '@/components/ui/spinner';

export interface Subcategory {
  _id: string;
  name: string;
  slug: string;
  status: 'active' | 'inactive';
  position: number;
  categoryId?: string;
  categoryName?: string;
  banner?: string;
  image?: string;
  icon?: string;
  createdAt?: string;
  updatedAt?: string;
  description?: string;
  shortDescription?: string;
  metaTitle?: string;
  metaDescription?: string;
}

export function SubcategoryList() {
  const router = useRouter();
  const { toast } = useToast();
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingStatusId, setTogglingStatusId] = useState<string | null>(null);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [detailsData, setDetailsData] = useState<Subcategory | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchSubcategories();
  }, [searchTerm, statusFilter, categoryFilter]);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/admin/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(Array.isArray(data.categories) ? data.categories : []);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchSubcategories = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (categoryFilter !== 'all') params.append('categoryId', categoryFilter);

      const response = await fetch(`/api/admin/subcategories?${params}`);
      if (response.ok) {
        const data = await response.json();
        setSubcategories(Array.isArray(data.subcategories) ? data.subcategories : []);
      } else {
        setSubcategories([]);
      }
    } catch (error) {
      console.error('Failed to fetch subcategories:', error);
      setSubcategories([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      setDeletingId(deleteId);
      const response = await fetch(`/api/admin/subcategories/${deleteId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Subcategory deleted successfully',
          variant: 'success',
        });
        fetchSubcategories();
      } else {
        toast({
          title: 'Error',
          description: 'Failed to delete subcategory',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred while deleting the subcategory',
        variant: 'destructive',
      });
    } finally {
      setDeleteId(null);
      setDeletingId(null);
    }
  };

  const getSubcategoryDetails = async (id: string): Promise<void> => {
    try {
      setLoadingDetails(true);
      const response = await fetch(`/api/admin/subcategories/${id}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch subcategory details');
      }

      const data: Subcategory = await response.json();
      setDetailsData(data);
    } catch (error) {
      console.error('Get Subcategory Error:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleView = (id: string) => {
    setDetailsId(id);
    getSubcategoryDetails(id);
  };

  const handleToggleStatus = async (subcategoryId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      setTogglingStatusId(subcategoryId);
      const response = await fetch(`/api/admin/subcategories/${subcategoryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Subcategory ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`,
          variant: 'success'
        });
        fetchSubcategories();
      } else {
        toast({
          title: 'Error',
          description: 'Failed to update subcategory status',
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

  const handleExport = () => {
    const csvContent = [
      ['Name', 'Slug', 'Status', 'Category', 'Position'],
      ...subcategories.map(sub => [sub.name, sub.slug, sub.status, sub.categoryName || 'N/A', sub.position || 0]),
    ]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subcategories-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <h1 className='text-3xl font-bold'>Subcategories</h1>
        <div className='flex gap-2'>
          <Button variant='outline' onClick={handleExport} className='gap-2'>
            <Download className='h-4 w-4' />
            Export
          </Button>
          <Button onClick={() => router.push('/admin/subcategories/add')} className='gap-2'>
            <Plus className='h-4 w-4' />
            Add Subcategory
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className='shadow-md border border-gray-200 overflow-hidden'>
        <div className='flex flex-row gap-2 flex-wrap px-5 py-4'>
          <Input
            placeholder='Search subcategories...'
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className='border-gray-300 focus:ring-blue-500 max-w-[300px]'
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

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className='border-gray-300'>
              <SelectValue placeholder='Filter by category' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All Categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat._id} value={cat._id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className='overflow-x-auto px-5 pb-4'>
          <Table>
            <TableHeader>
              <TableRow className='bg-gray-50 border-b border-gray-200 hover:bg-gray-50'>
                <TableHead className='font-semibold text-gray-700 py-4'>Name</TableHead>
                <TableHead className='font-semibold text-gray-700 py-4'>Slug</TableHead>
                <TableHead className='font-semibold text-gray-700 py-4'>Category</TableHead>
                <TableHead className='font-semibold text-gray-700 py-4'>Position</TableHead>
                <TableHead className='font-semibold text-gray-700 py-4 text-center'>Status</TableHead>
                <TableHead className='font-semibold text-gray-700 py-4 text-right'>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <DataTableBody
              loading={loading}
              data={subcategories}
              columns={6}
              loadingText='Loading subcategories...'
              emptyText='No subcategories found'>
              {subcategories.map(subcategory => (
                <TableRow key={subcategory._id} className='border-b border-gray-200 hover:bg-blue-50 transition-colors duration-150'>
                  <TableCell className='font-semibold text-gray-900 py-4'>{subcategory.name}</TableCell>
                  <TableCell className='text-sm text-gray-600 py-4'>{subcategory.slug}</TableCell>
                  <TableCell className='text-sm text-gray-600 py-4'>{subcategory.categoryName || 'N/A'}</TableCell>
                  <TableCell className='font-medium text-gray-900 py-4'>{subcategory.position}</TableCell>
                  <TableCell className='py-4 text-center'>
                    {togglingStatusId === subcategory._id ? (
                      <Spinner className='h-4 w-4 mx-auto' />
                    ) : (
                      <Switch
                        size='md'
                        checked={subcategory.status === 'active'}
                        onCheckedChange={() => handleToggleStatus(subcategory._id, subcategory.status)}
                        disabled={togglingStatusId === subcategory._id}
                      />
                    )}
                  </TableCell>
                  <TableCell className='py-4'>
                    <div className='flex justify-end gap-6'>
                      <button
                        onClick={() => handleView(subcategory._id)}
                        title='View subcategory'
                        disabled={togglingStatusId === subcategory._id || deletingId === subcategory._id}
                        className='text-gray-600 hover:text-gray-900 cursor-pointer hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed'>
                        <Eye className='h-5 w-5' />
                      </button>
                      <button
                        onClick={() => router.push(`/admin/subcategories/edit/${subcategory._id}`)}
                        title='Edit subcategory'
                        disabled={togglingStatusId === subcategory._id || deletingId === subcategory._id}
                        className='text-gray-600 hover:text-gray-900 hover:bg-gray-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'>
                        <Pencil className='h-5 w-5' />
                      </button>
                      <button
                        onClick={() => setDeleteId(subcategory._id)}
                        disabled={togglingStatusId === subcategory._id || deletingId === subcategory._id}
                        className='text-red-500 hover:text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed'
                        title='Delete subcategory'>
                        {deletingId === subcategory._id ? (
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. This will permanently delete the subcategory.</AlertDialogDescription>
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

      <CommonDialog
        open={!!detailsId}
        onOpenChange={open => {
          if (!open) setDetailsId(null);
          setDetailsData(null);
        }}
        title='Subcategory Details'
        description={detailsData?._id}
        cancelText='Close'
        loading={loadingDetails}>
        {detailsData && (
          <div className='mt-1 space-y-6 text-sm text-gray-700'>
            <div className="flex items-center gap-6">
              <label className="w-1/4 text-sm font-medium text-gray-700 text-right pr-4">Name</label>
              <div className="flex-1"><p className="text-gray-900">{detailsData.name}</p></div>
            </div>
            {detailsData.description && (
              <div className="flex items-start gap-6">
                <label className="w-1/4 text-sm font-medium text-gray-700 text-right pr-4 pt-3">Description</label>
                <div className="flex-1"><p className="text-gray-900 whitespace-pre-line">{detailsData.description}</p></div>
              </div>
            )}
            <div className="flex items-center gap-6">
              <label className="w-1/4 text-sm font-medium text-gray-700 text-right pr-4">Category</label>
              <div className="flex-1"><p className="text-gray-900">{detailsData.categoryName || 'N/A'}</p></div>
            </div>
            {detailsData.image && (
              <div className="flex items-start gap-6">
                <label className="w-1/4 text-sm font-medium text-gray-700 text-right pr-4 pt-3">Image</label>
                <div className="flex-1"><img src={detailsData.image} alt="Subcategory" className="w-32 h-32 object-cover rounded-lg border" /></div>
              </div>
            )}
            <div className="flex items-center gap-6">
              <label className="w-1/4 text-sm font-medium text-gray-700 text-right pr-4">Position</label>
              <div className="flex-1"><p className="text-gray-900">{detailsData.position || 0}</p></div>
            </div>
            <div className="flex items-center gap-6">
              <label className="w-1/4 text-sm font-medium text-gray-700 text-right pr-4">Status</label>
              <div className="flex-1"><p className="text-gray-900 capitalize">{detailsData.status || 'active'}</p></div>
            </div>
          </div>
        )}
      </CommonDialog>
    </div>
  );
}

