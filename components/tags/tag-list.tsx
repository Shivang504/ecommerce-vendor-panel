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

interface Tag {
  _id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive';
  createdAt?: string;
}

export function TagList() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingStatusId, setTogglingStatusId] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    fetchTags();
  }, [search]);

  const fetchTags = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      const response = await fetch(`/api/admin/tags?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setTags(Array.isArray(data) ? data : []);
      } else {
        setTags([]);
      }
    } catch (error) {
      console.error('[v0] Failed to fetch tags:', error);
      setTags([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    try {
      setTogglingStatusId(id);
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      const response = await fetch(`/api/admin/tags/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Tag ${newStatus === 'active' ? 'activated' : 'deactivated'}`,
          variant :'success'
        });
        fetchTags();
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
      const response = await fetch(`/api/admin/tags/${deleteId}`, { method: 'DELETE' });
      if (response.ok) {
        toast({
          title: 'Deleted',
          description: 'Tag removed successfully',
          variant : 'success'
        });
        setTags(prev => prev.filter(tag => tag._id !== deleteId));
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to delete tag',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('[v0] Delete tag error:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete tag',
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
          <h1 className='text-3xl font-bold'>Tags</h1>
          <p className='text-sm text-muted-foreground'>Manage product tags and their details.</p>
        </div>
        <Button onClick={() => router.push('/admin/tags/add')} className='gap-2'>
          <Plus className='h-4 w-4' />
          Add Tag
        </Button>
      </div>

      <Card className='p-6'>
        <div className='mb-4'>
          <Input
            placeholder='Search tags...'
            value={search}
            onChange={e => setSearch(e.target.value)}
            className='max-w-sm'
          />
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className='text-right'>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <DataTableBody
            loading={loading}
            data={tags}
            columns={4}
            loadingText='Loading tags...'
            emptyText='No tags found'>
            {tags.map(tag => (
              <TableRow key={tag._id}>
                <TableCell className='font-medium py-4'>{tag.name}</TableCell>
                <TableCell className='text-sm text-muted-foreground'>
                  {tag.description || '-'}
                </TableCell>
                <TableCell>
                  {togglingStatusId === tag._id ? (
                    <Spinner className='h-4 w-4' />
                  ) : (
                    <Switch
                      checked={tag.status === 'active'}
                      onCheckedChange={() => handleToggleStatus(tag._id, tag.status)}
                      disabled={togglingStatusId === tag._id}
                    />
                  )}
                </TableCell>
                <TableCell className='text-right'>
                  <div className='flex justify-end gap-6'>
                    <button
                      onClick={() => router.push(`/admin/tags/${tag._id}`)}>
                      <Pencil className='h-5 w-5' />
                    </button>
                    <button
                      onClick={() => setDeleteId(tag._id)}
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
              This action cannot be undone. This will permanently delete the tag.
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

