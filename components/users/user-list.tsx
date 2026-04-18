'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Download, Eye, Plus, Search, Trash2, Users, Pencil } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { CommonDialog } from '../dialog/dialog';
import { formatIndianDate } from '@/app/utils/helper';
import { DataTableBody } from '@/components/ui/data-table-body';
import { Spinner } from '@/components/ui/spinner';

interface Admin {
  _id: string;
  firstName?: string;
  lastName?: string;
  name: string;
  email: string;
  phone?: string;
  status?: 'active' | 'inactive';
  createdAt?: string;
  role?: string;
}

interface AdminDetails extends Admin {
  permissions?: string[];
  updatedAt?: string;
  lastLoginAt?: string;
}

export function UserList() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewAdminId, setViewAdminId] = useState<string | null>(null);
  const [adminDetails, setAdminDetails] = useState<AdminDetails | null>(null);
  const [loadingAdminDetails, setLoadingAdminDetails] = useState(false);
  const [togglingStatusId, setTogglingStatusId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    fetchAdmins();
  }, [searchTerm]);

  const fetchAdmins = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`/api/admin/users?${params}`);
      const data = await response.json();
      const adminList = Array.isArray(data.users) ? data.users : [];
      setAdmins(adminList);
    } catch (error) {
      console.error('[v0] Failed to fetch admins:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch users',
        variant: 'destructive',
      });
      setAdmins([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async (adminId: string, currentStatus: string) => {
    try {
      setTogglingStatusId(adminId);
      const admin = admins.find(a => a._id === adminId);
      if (!admin) return;

      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

      const response = await fetch(`/api/admin/users/${adminId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      if (response.ok) {
        setAdmins(admins.map(a => (a._id === adminId ? { ...a, status: newStatus as 'active' | 'inactive' } : a)));
        toast({
          title: 'Success',
          description: `User ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`,
          variant: 'success',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to update user status',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('[v0] Status toggle error:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while updating status',
        variant: 'destructive',
      });
    } finally {
      setTogglingStatusId(null);
    }
  };

  const handleDelete = async (adminId: string, adminName: string) => {
    try {
      setDeletingId(adminId);
      const response = await fetch(`/api/admin/users/${adminId}`, { method: 'DELETE' });
      if (response.ok) {
        setAdmins(admins.filter(a => a._id !== adminId));
        toast({
          title: 'Success',
          description: `User "${adminName}" deleted successfully`,
          variant: 'success',
        });
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to delete user',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('[v0] Delete error:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while deleting the user',
        variant: 'destructive',
      });
    }
  };

  const handleExport = () => {
    const csv = [['Name', 'Email', 'Phone', 'Status'], ...admins.map(a => [a.name, a.email, a.phone || '', a.status || 'active'])]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const fetchAdminDetails = async (id: string) => {
    try {
      setLoadingAdminDetails(true);
      const response = await fetch(`/api/admin/users/${id}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error?.error || 'Failed to fetch user details');
      }
      const data = await response.json();
      setAdminDetails(data.user);
    } catch (error) {
      console.error('[v0] Failed to fetch admin details:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch user details',
        variant: 'destructive',
      });
    } finally {
      setLoadingAdminDetails(false);
    }
  };

  const handleViewAdmin = (id: string) => {
    setViewAdminId(id);
    setAdminDetails(null);
    fetchAdminDetails(id);
  };

  const DetailItem = ({ label, value }: { label: string; value?: ReactNode }) => (
    <div>
      <strong>{label}:</strong>
      <p className='mt-0.5 text-gray-900'>{value ?? '-'}</p>
    </div>
  );

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-3xl font-bold'>Users</h1>
        <div className='flex flex-row gap-2'>
          <Button variant='outline' onClick={handleExport} className='gap-2'>
            <Download className='h-4 w-4' />
            Export
          </Button>
          <Button onClick={() => router.push('/admin/users/add')} className='gap-2 bg-[#22c55e]'>
            <Plus className='h-5 w-5' />
            Add User
          </Button>
        </div>
      </div>

      <Card className='p-6 shadow-md'>
        <div className='space-y-4'>
          <div className='flex flex-row flex-wrap gap-2'>
            <div className='flex relative'>
              <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
              <Input
                placeholder='Search by name or email...'
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className='pl-10 max-w-[300px]'
              />
            </div>
          </div>

          <div className='overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow className='bg-gray-50 border-b border-gray-200 hover:bg-gray-50'>
                  <TableHead className='font-semibold text-gray-700 py-4'>Name</TableHead>
                  <TableHead className='font-semibold text-gray-700 py-4'>Email</TableHead>
                  <TableHead className='font-semibold text-gray-700 py-4'>Role</TableHead>
                  <TableHead className='font-semibold text-gray-700 py-4'>Create At</TableHead>
                  <TableHead className='font-semibold text-gray-700 py-4 text-center'>Status</TableHead>
                  <TableHead className='font-semibold text-gray-700 py-4 text-right'>Action</TableHead>
                </TableRow>
              </TableHeader>
              <DataTableBody loading={loading} data={admins} columns={6} loadingText='Loading users...' emptyText='No users found'>
                {admins.map(admin => (
                  <TableRow key={admin._id} className='border-b border-gray-200 hover:bg-green-50 transition-colors duration-150'>
                    <TableCell className='font-semibold text-gray-900 py-4'>{admin.name}</TableCell>
                    <TableCell className='text-gray-600 py-4'>{admin.email}</TableCell>
                    <TableCell className='text-gray-600 py-4'>{admin.role || '-'}</TableCell>
                    <TableCell className='text-gray-600 py-4'>{admin.createdAt ? formatIndianDate(admin.createdAt) : '-'}</TableCell>
                    <TableCell className='py-4 text-center'>
                      {togglingStatusId === admin._id ? (
                        <Spinner className='h-4 w-4 mx-auto' />
                      ) : (
                        <Switch
                          size='md'
                          checked={admin.status === 'active'}
                          onCheckedChange={() => handleStatusToggle(admin._id, admin.status || 'active')}
                          disabled={togglingStatusId === admin._id}
                        />
                      )}
                    </TableCell>
                    <TableCell className='py-4'>
                      <div className='flex justify-end gap-6'>
                        {/* View button omitted as per simpler UI */}
                        <button
                          onClick={() => router.push(`/admin/users/${admin._id}`)}
                          disabled={togglingStatusId === admin._id || deletingId === admin._id}
                          className='text-gray-600 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed'>
                          <Pencil className='h-5 w-5' />
                        </button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button 
                              disabled={togglingStatusId === admin._id || deletingId === admin._id}
                              className='text-red-500 hover:text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed'>
                              {deletingId === admin._id ? (
                                <Spinner className='h-5 w-5' />
                              ) : (
                                <Trash2 className='h-5 w-5' />
                              )}
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete User</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{admin.name}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel disabled={!!deletingId}>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDelete(admin._id, admin.name)} 
                                className='bg-destructive'
                                disabled={!!deletingId}>
                                {deletingId === admin._id ? <Spinner className='h-4 w-4 mr-2' /> : null}
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </DataTableBody>
            </Table>
          </div>
        </div>
      </Card>
      <CommonDialog
        open={!!viewAdminId}
        onOpenChange={open => {
          if (!open) {
            setViewAdminId(null);
            setAdminDetails(null);
          }
        }}
        title='User Details'
        description={adminDetails?.email}
        cancelText='Close'
        loading={loadingAdminDetails}>
        {adminDetails && (
          <div className='mt-1 space-y-6 text-sm text-gray-700'>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              <DetailItem label='Name' value={adminDetails.name} />
              <DetailItem label='Email' value={adminDetails.email} />
              <DetailItem label='Phone' value={adminDetails.phone || '-'} />
              <DetailItem label='Role' value={adminDetails.role || 'Admin'} />
              <DetailItem label='Status' value={adminDetails.status === 'active' ? 'Active' : 'Inactive'} />
              <DetailItem label='Created' value={adminDetails.createdAt ? formatIndianDate(adminDetails.createdAt) : '-'} />
              <DetailItem label='Updated' value={adminDetails.updatedAt ? formatIndianDate(adminDetails.updatedAt) : '-'} />
              <DetailItem label='Last Login' value={adminDetails.lastLoginAt ? formatIndianDate(adminDetails.lastLoginAt) : '-'} />
            </div>

            {Array.isArray(adminDetails.permissions) && adminDetails.permissions.length > 0 && (
              <div>
                <strong>Permissions:</strong>
                <p className='mt-1 text-gray-800'>{adminDetails.permissions.join(', ')}</p>
              </div>
            )}
          </div>
        )}
      </CommonDialog>
    </div>
  );
}
