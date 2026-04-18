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
import { Download, Plus, Pencil, Trash2, Shield } from 'lucide-react';
import { formatIndianDate } from '@/app/utils/helper';

interface Role {
  _id: string;
  name: string;
  createdAt?: string;
}

export function RoleList() {
  const router = useRouter();
  const { toast } = useToast();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchRoles();
  }, [searchTerm]);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`/api/admin/roles?${params}`);
      if (response.ok) {
        const data = await response.json();
        setRoles(Array.isArray(data.roles) ? data.roles : []);
      } else {
        setRoles([]);
      }
    } catch (error) {
      console.error('[v0] Failed to fetch roles:', error);
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const response = await fetch(`/api/admin/roles/${deleteId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Role deleted successfully',
        });
        fetchRoles();
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to delete role',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred while deleting the role',
        variant: 'destructive',
      });
    } finally {
      setDeleteId(null);
    }
  };

  const handleExport = () => {
    const csvContent = [['Name', 'Created At'], ...roles.map(role => [role.name, role.createdAt ? formatIndianDate(role.createdAt) : ''])]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roles-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <Shield className='h-7 w-7 text-[#22c55e]' />
          <h1 className='text-3xl font-bold'>Roles</h1>
        </div>
        <div className='flex gap-2'>
          <Button variant='outline' onClick={handleExport} className='gap-2'>
            <Download className='h-4 w-4' />
            Export
          </Button>
          <Button onClick={() => router.push('/admin/roles/add')} className='gap-2 bg-[#22c55e]'>
            <Plus className='h-4 w-4' />
            Add Role
          </Button>
        </div>
      </div>

      <Card className='shadow-md border border-gray-200 overflow-hidden'>
        <div className='flex flex-row gap-2 flex-wrap px-5 py-4'>
          <Input
            placeholder='Search roles...'
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className='border-gray-300 focus:ring-green-500 max-w-[300px]'
          />
        </div>
        {loading ? (
          <div className='text-center py-12'>Loading roles...</div>
        ) : roles.length === 0 ? (
          <div className='text-center py-12 text-muted-foreground'>No roles found</div>
        ) : (
          <div className='overflow-x-auto px-5 pb-4'>
            <Table>
              <TableHeader>
                <TableRow className='bg-gray-50 border-b border-gray-200 hover:bg-gray-50'>
                  <TableHead className='font-semibold text-gray-700 py-4'>Name</TableHead>
                  <TableHead className='font-semibold text-gray-700 py-4'>Created At</TableHead>
                  <TableHead className='font-semibold text-gray-700 py-4 text-right'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map(role => (
                  <TableRow key={role._id} className='border-b border-gray-200 hover:bg-green-50 transition-colors duration-150'>
                    <TableCell className='font-semibold text-gray-900 py-4'>{role.name}</TableCell>
                    <TableCell className='text-sm text-gray-600 py-4'>
                      {role.createdAt ? formatIndianDate(role.createdAt) : '-'}
                    </TableCell>
                    <TableCell className='py-4'>
                      <div className='flex justify-end gap-6'>
                        <button
                          onClick={() => router.push(`/admin/roles/${role._id}`)}
                          title='Edit role'
                          className='text-gray-600 hover:text-gray-900 hover:bg-gray-100 cursor-pointer'>
                          <Pencil className='h-5 w-5' />
                        </button>
                        <button
                          onClick={() => setDeleteId(role._id)}
                          className='text-red-500 hover:text-red-700 hover:bg-red-50'
                          title='Delete role'>
                          <Trash2 className='h-5 w-5' />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the role.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className='bg-destructive'>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


