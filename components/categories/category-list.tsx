'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
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
import { Plus, Pencil, Trash2, Download, Eye, GripVertical } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { formatIndianDate } from '@/app/utils/helper';
import { CommonDialog } from '../dialog/dialog';
import { Spinner } from '@/components/ui/spinner';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface Category {
  _id: string;
  name: string;
  slug: string;
  status: 'active' | 'inactive';
  productCount: number;
  displayOrder: number;
  position: number;
  featured: boolean;
  parentId?: string;
  // Optional fields used in the details view
  banner?: string;
  image?: string;
  icon?: string;
  displayOnHomepage?: boolean;
  commissionRate?: number;
  createdAt?: string;
  updatedAt?: string;
  description?: string;
  shortDescription?: string;
  metaTitle?: string;
  metaDescription?: string;
}

// Sortable Row Component
function SortableRow({ 
  category, 
  onView, 
  onEdit, 
  onDelete, 
  onToggleStatus, 
  togglingStatusId, 
  deletingId 
}: {
  category: Category;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string, status: string) => void;
  togglingStatusId: string | null;
  deletingId: string | null;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className='border-b border-gray-200 hover:bg-green-50 transition-colors duration-150'
    >
      <TableCell className='w-10 py-4'>
        <div
          {...attributes}
          {...listeners}
          className='cursor-grab active:cursor-grabbing flex items-center justify-center'
        >
          <GripVertical className='h-5 w-5 text-gray-400' />
        </div>
      </TableCell>
      <TableCell className='font-semibold text-gray-900 py-4'>{category.name}</TableCell>
      <TableCell className='text-sm text-gray-600 py-4'>{category.slug}</TableCell>
      <TableCell className='font-medium text-gray-900 py-4'>{category.position}</TableCell>
      <TableCell className='py-4 text-center'>
        {togglingStatusId === category._id ? (
          <Spinner className='h-4 w-4 mx-auto' />
        ) : (
          <Switch
            size='md'
            checked={category.status === 'active'}
            onCheckedChange={() => onToggleStatus(category._id, category.status)}
            disabled={togglingStatusId === category._id}
          />
        )}
      </TableCell>
      <TableCell className='py-4'>
        <div className='flex justify-end gap-6'>
          <button
            onClick={() => onView(category._id)}
            title='View category'
            disabled={togglingStatusId === category._id || deletingId === category._id}
            className='text-gray-600 hover:text-gray-900 cursor-pointer hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed'>
            <Eye className='h-5 w-5' />
          </button>
          <button
            onClick={() => onEdit(category._id)}
            title='Edit category'
            disabled={togglingStatusId === category._id || deletingId === category._id}
            className='text-gray-600 hover:text-gray-900 hover:bg-gray-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'>
            <Pencil className='h-5 w-5' />
          </button>
          <button
            onClick={() => onDelete(category._id)}
            disabled={togglingStatusId === category._id || deletingId === category._id}
            className='text-red-500 hover:text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed'
            title='Delete category'>
            {deletingId === category._id ? (
              <Spinner className='h-5 w-5' />
            ) : (
              <Trash2 className='h-5 w-5' />
            )}
          </button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function CategoryList() {
  const router = useRouter();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [featuredFilter, setFeaturedFilter] = useState('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingStatusId, setTogglingStatusId] = useState<string | null>(null);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [detailsData, setDetailsData] = useState<Category | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isUpdatingPositions, setIsUpdatingPositions] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchCategories();
  }, [searchTerm, statusFilter, featuredFilter]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (featuredFilter !== 'all') params.append('featured', featuredFilter);

      const response = await fetch(`/api/admin/categories?${params}`);
      if (response.ok) {
        const data = await response.json();
        setCategories(Array.isArray(data.categories) ? data.categories : []);
      } else {
        setCategories([]);
      }
    } catch (error) {
      console.error('[v0] Failed to fetch categories:', error);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      setDeletingId(deleteId);
      const response = await fetch(`/api/admin/categories/${deleteId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Category deleted successfully',
          variant: 'success',
        });
        fetchCategories();
      } else {
        toast({
          title: 'Error',
          description: 'Failed to delete category',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred while deleting the category',
        variant: 'destructive',
      });
    } finally {
      setDeleteId(null);
      setDeletingId(null);
    }
  };

  const getCategoryDetails = async (id: string): Promise<void> => {
    try {
      setLoadingDetails(true);

      const response = await fetch(`/api/admin/categories/${id}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch category details');
      }

      const data: Category = await response.json(); // typed
      setDetailsData(data);
    } catch (error) {
      console.error('Get Category Error:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleView = (id: string) => {
    setDetailsId(id);
    getCategoryDetails(id);
  };

  const handleToggleStatus = async (categoryId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      setTogglingStatusId(categoryId);
      const response = await fetch(`/api/admin/categories/${categoryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Category ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`,
          variant :'success'
        });
        fetchCategories();
      } else {
        toast({
          title: 'Error',
          description: 'Failed to update category status',
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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = categories.findIndex((cat) => cat._id === active.id);
    const newIndex = categories.findIndex((cat) => cat._id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // Update local state optimistically
    const newCategories = arrayMove(categories, oldIndex, newIndex);
    setCategories(newCategories);

    // Update positions in the database
    try {
      setIsUpdatingPositions(true);
      const positions = newCategories.map((cat, index) => ({
        id: cat._id,
        position: index,
      }));

      const response = await fetch('/api/admin/categories/update-positions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ positions }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Category positions updated successfully',
          variant: 'success',
        });
        // Refresh to get updated data
        fetchCategories();
      } else {
        // Revert on error
        setCategories(categories);
        toast({
          title: 'Error',
          description: 'Failed to update category positions',
          variant: 'destructive',
        });
      }
    } catch (error) {
      // Revert on error
      setCategories(categories);
      toast({
        title: 'Error',
        description: 'An error occurred while updating positions',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingPositions(false);
    }
  };

  const handleExport = () => {
    const csvContent = [
      ['Name', 'Slug', 'Status', 'Products', 'Featured', 'Display Order'],
      ...categories.map(cat => [cat.name, cat.slug, cat.status, cat.productCount || 0, cat.featured ? 'Yes' : 'No', cat.displayOrder]),
    ]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `categories-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className='space-y-6 relative'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <h1 className='text-3xl font-bold'>Categories</h1>
        <div className='flex gap-2'>
          <Button variant='outline' onClick={handleExport} className='gap-2'>
            <Download className='h-4 w-4' />
            Export
          </Button>
          <Button onClick={() => router.push('/admin/categories/add')} className='gap-2 bg-[#22c55e] '>
            <Plus className='h-4 w-4' />
            Add Category
          </Button>
        </div>
      </div>

      {/* Filters */}
      {/* <Card className='p-6 shadow-md border border-gray-200'>
   
      </Card> */}

      {/* Table */}
      <Card className='shadow-md border border-gray-200 overflow-hidden'>
        <div className='flex flex-row gap-2 flex-wrap px-5'>
          <Input
            placeholder='Search categories...'
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

          <Select value={featuredFilter} onValueChange={setFeaturedFilter}>
            <SelectTrigger className='border-gray-300'>
              <SelectValue placeholder='Filter by featured' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All Categories</SelectItem>
              <SelectItem value='true'>Featured Only</SelectItem>
              <SelectItem value='false'>Non-Featured</SelectItem>
            </SelectContent>
          </Select>
        </div>
          <div className='overflow-x-auto px-5 relative'>
            {loading ? (
              <div className='flex items-center justify-center py-8'>
                <Spinner className='h-6 w-6' />
                <span className='ml-2'>Loading categories...</span>
              </div>
            ) : categories.length === 0 ? (
              <div className='flex items-center justify-center py-8'>
                <span className='text-gray-500'>No categories found</span>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <Table>
                  <TableHeader>
                    <TableRow className='bg-gray-50 border-b border-gray-200 hover:bg-gray-50'>
                      <TableHead className='font-semibold text-gray-700 py-4 w-10'></TableHead>
                      <TableHead className='font-semibold text-gray-700 py-4'>Name</TableHead>
                      <TableHead className='font-semibold text-gray-700 py-4'>Slug</TableHead>
                      <TableHead className='font-semibold text-gray-700 py-4'>Position</TableHead>
                      <TableHead className='font-semibold text-gray-700 py-4 text-center'>Status</TableHead>
                      <TableHead className='font-semibold text-gray-700 py-4 text-right'>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <SortableContext
                      items={categories.map(cat => cat._id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {categories.map(category => (
                        <SortableRow
                          key={category._id}
                          category={category}
                          onView={handleView}
                          onEdit={(id) => router.push(`/admin/categories/edit/${id}`)}
                          onDelete={(id) => setDeleteId(id)}
                          onToggleStatus={handleToggleStatus}
                          togglingStatusId={togglingStatusId}
                          deletingId={deletingId}
                        />
                      ))}
                    </SortableContext>
                  </TableBody>
                </Table>
              </DndContext>
            )}
            {isUpdatingPositions && (
              <div className='absolute inset-0 bg-white/80 flex items-center justify-center z-10 rounded-md'>
                <div className='flex items-center gap-2 bg-white p-4 rounded-lg shadow-lg'>
                  <Spinner className='h-5 w-5' />
                  <span>Updating positions...</span>
                </div>
              </div>
            )}
          </div>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. This will permanently delete the category.</AlertDialogDescription>
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
        title='Category Details'
        description={detailsData?._id}
        cancelText='Close'
        loading={loadingDetails}>
        {detailsData && (
          <div className='mt-1 space-y-6 text-sm text-gray-700'>
            {/* Name */}
            <div className="flex items-center gap-6">
              <label className="w-1/4 text-sm font-medium text-gray-700 text-right pr-4">
                Name
              </label>
              <div className="flex-1">
                <p className="text-gray-900">{detailsData.name}</p>
              </div>
            </div>

            {/* Description */}
            {detailsData.description && (
              <div className="flex items-start gap-6">
                <label className="w-1/4 text-sm font-medium text-gray-700 text-right pr-4 pt-3">
                  Description
                </label>
                <div className="flex-1">
                  <p className="text-gray-900 whitespace-pre-line">{detailsData.description}</p>
                </div>
              </div>
            )}

            {/* Commission Rate */}
            <div className="flex items-center gap-6">
              <label className="w-1/4 text-sm font-medium text-gray-700 text-right pr-4">
                Commission Rate
              </label>
              <div className="flex-1">
                <p className="text-gray-900">{detailsData.commissionRate || 0}%</p>
              </div>
              </div>

            {/* Select Parent */}
            <div className="flex items-center gap-6">
              <label className="w-1/4 text-sm font-medium text-gray-700 text-right pr-4">
                Parent Category
              </label>
              <div className="flex-1">
                <p className="text-gray-900">{detailsData.parentId ? 'Has Parent' : 'No Parent (Root)'}</p>
              </div>
              </div>

            {/* Image */}
            {detailsData.image && (
              <div className="flex items-start gap-6">
                <label className="w-1/4 text-sm font-medium text-gray-700 text-right pr-4 pt-3">
                  Image
                </label>
                <div className="flex-1">
                  <img src={detailsData.image} alt="Category" className="w-32 h-32 object-cover rounded-lg border" />
                </div>
              </div>
            )}

            {/* Icon */}
            {detailsData.icon && (
              <div className="flex items-start gap-6">
                <label className="w-1/4 text-sm font-medium text-gray-700 text-right pr-4 pt-3">
                  Icon
                </label>
                <div className="flex-1">
                  <img src={detailsData.icon} alt="Category Icon" className="w-32 h-32 object-cover rounded-lg border" />
                </div>
              </div>
            )}

            {/* Meta Title */}
            {detailsData.metaTitle && (
              <div className="flex items-center gap-6">
                <label className="w-1/4 text-sm font-medium text-gray-700 text-right pr-4">
                  Meta Title
                </label>
                <div className="flex-1">
                  <p className="text-gray-900">{detailsData.metaTitle}</p>
                </div>
              </div>
            )}

            {/* Meta Description */}
            {detailsData.metaDescription && (
              <div className="flex items-start gap-6">
                <label className="w-1/4 text-sm font-medium text-gray-700 text-right pr-4 pt-3">
                  Meta Description
                </label>
                <div className="flex-1">
                  <p className="text-gray-900 whitespace-pre-line">{detailsData.metaDescription}</p>
                </div>
              </div>
            )}

            {/* Banner Image */}
            {detailsData.banner && (
              <div className="flex items-start gap-6">
                <label className="w-1/4 text-sm font-medium text-gray-700 text-right pr-4 pt-3">
                  Banner Image
                </label>
                <div className="flex-1">
                  <img src={detailsData.banner} alt="Category Banner" className="w-full max-w-md h-48 object-cover rounded-lg border" />
                </div>
              </div>
            )}

            {/* Position */}
            <div className="flex items-center gap-6">
              <label className="w-1/4 text-sm font-medium text-gray-700 text-right pr-4">
                Position
              </label>
              <div className="flex-1">
                <p className="text-gray-900">{detailsData.position || 0}</p>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center gap-6">
              <label className="w-1/4 text-sm font-medium text-gray-700 text-right pr-4">
                Status
              </label>
              <div className="flex-1">
                <p className="text-gray-900 capitalize">{detailsData.status || 'active'}</p>
            </div>
            </div>
          </div>
        )}
      </CommonDialog>
    </div>
  );
}
