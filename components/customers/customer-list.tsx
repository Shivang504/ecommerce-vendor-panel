'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Plus, Download, Eye, Pencil, Trash2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { CommonDialog } from '../dialog/dialog';
import { formatIndianDate } from '@/app/utils/helper';
import { Spinner } from '@/components/ui/spinner';

interface Customer {
  _id: string;
  name: string;
  email: string;
  phone: string;
  orders: number;
  spent: number;
  registrationDate: string;
  status: string;
}

interface CustomerDetails extends Customer {
  address?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  country?: string;
  gender?: string;
  dateOfBirth?: string;
  lastOrderDate?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export function CustomerList() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingStatusId, setTogglingStatusId] = useState<string | null>(null);
  const [viewCustomerId, setViewCustomerId] = useState<string | null>(null);
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails | null>(null);
  const [loadingCustomerDetails, setLoadingCustomerDetails] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, [searchTerm, statusFilter]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/admin/customers?${params}`, {
        credentials: 'include', // Include cookies for admin token
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('[v0] Failed to fetch customers:', data);
        throw new Error(data.error || 'Failed to fetch customers');
      }
      
      console.log('[v0] Customers fetched:', data.customers?.length || 0);
      setCustomers(Array.isArray(data.customers) ? data.customers : []);
    } catch (error: any) {
      console.error('[v0] Failed to fetch customers:', error);
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to load customers', 
        variant: 'destructive' 
      });
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    try {
      setTogglingStatusId(id);
      const newStatus = currentStatus === 'active' ? 'blocked' : 'active';
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/admin/customers/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        toast({ title: 'Success', description: `Customer ${newStatus === 'active' ? 'activated' : 'blocked'}`, variant:'success' });
        fetchCustomers();
      } else {
        toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
    } finally {
      setTogglingStatusId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      setDeletingId(deleteId);
      const response = await fetch(`/api/admin/customers/${deleteId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Customer deleted successfully', variant: 'success' });
        fetchCustomers();
      } else {
        toast({ title: 'Error', description: 'Failed to delete customer', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete customer', variant: 'destructive' });
    } finally {
      setDeleteId(null);
      setDeletingId(null);
    }
  };

  const exportToCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'Orders', 'Total Spent', 'Status', 'Registration Date'];
    const csvData = customers.map(customer => [
      customer.name,
      customer.email,
      customer.phone,
      customer.orders,
      customer.spent.toFixed(2),
      customer.status,
      customer.registrationDate,
    ]);

    const csvContent = [headers.join(','), ...csvData.map(row => row.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customers-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formatCurrency = (value?: number) => {
    if (typeof value !== 'number') return '-';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value);
  };

  const fetchCustomerDetails = async (id: string) => {
    try {
      setLoadingCustomerDetails(true);
      const response = await fetch(`/api/admin/customers/${id}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error?.error || 'Failed to fetch customer details');
      }
      const data = await response.json();
      setCustomerDetails(data);
    } catch (error) {
      console.error('[v0] Failed to fetch customer details:', error);
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to fetch customer details', variant: 'destructive' });
    } finally {
      setLoadingCustomerDetails(false);
    }
  };

  const handleViewCustomer = (id: string) => {
    setViewCustomerId(id);
    setCustomerDetails(null);
    fetchCustomerDetails(id);
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
        <h1 className='text-3xl font-bold'>Customers</h1>
        <div className='flex flex-row gap-2'>
          <Button variant='outline' onClick={exportToCSV} className='gap-2'>
            <Download className='h-4 w-4' />
            Export CSV
          </Button>
          <Button onClick={() => router.push('/admin/customers/add')} className='bg-[#22c55e]'>
            <Plus className='h-4 w-4 ' />
            Add Customer
          </Button>
        </div>
      </div>

      <Card className='p-4'>
        <div className='flex flex-row flex-wrap gap-2'>
          <Input
            placeholder='Search by name, email, or phone...'
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className='md:col-span-2 max-w-[300px]'
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder='Filter by status' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All Statuses</SelectItem>
              <SelectItem value='active'>Active</SelectItem>
              <SelectItem value='blocked'>Blocked</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className='text-center py-8'>Loading customers...</div>
        ) : (
          <div className='overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow className='bg-gray-50 border-b border-gray-200 hover:bg-gray-50'>
                  <TableHead className='font-semibold text-gray-700 py-4'>Name</TableHead>
                  <TableHead className='font-semibold text-gray-700 py-4'>Email</TableHead>
                  <TableHead className='font-semibold text-gray-700 py-4'>Phone</TableHead>
                  <TableHead className='font-semibold text-gray-700 py-4'>Orders</TableHead>
                  <TableHead className='font-semibold text-gray-700 py-4'>Total Spent</TableHead>
                  <TableHead className='font-semibold text-gray-700 py-4 text-center'>Status</TableHead>
                  <TableHead className='font-semibold text-gray-700 py-4'>Registration Date</TableHead>
                  <TableHead className='font-semibold text-gray-700 py-4 text-right'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className='text-center py-8 text-muted-foreground'>
                      No customers found
                    </TableCell>
                  </TableRow>
                ) : (
                  customers.map(customer => (
                    <TableRow key={customer._id} className='border-b border-gray-200 hover:bg-green-50 transition-colors duration-150'>
                      <TableCell className='font-semibold text-gray-900 py-4'>{customer.name}</TableCell>
                      <TableCell className='text-gray-600 py-4'>{customer.email}</TableCell>
                      <TableCell className='text-gray-600 py-4'>{customer.phone}</TableCell>
                      <TableCell className='text-gray-900 font-medium py-4'>{customer.orders}</TableCell>
                      <TableCell className='font-semibold text-gray-900 py-4'>₹{customer.spent.toFixed(2)}</TableCell>
                      <TableCell className='py-4 text-center'>
                        {togglingStatusId === customer._id ? (
                          <Spinner className='h-4 w-4 mx-auto' />
                        ) : (
                          <Switch
                            size='md'
                            checked={customer.status === 'active'}
                            onCheckedChange={() => handleToggleStatus(customer._id, customer.status)}
                            disabled={togglingStatusId === customer._id}
                          />
                        )}
                      </TableCell>
                      <TableCell className='text-gray-600 py-4'>{customer.registrationDate}</TableCell>
                      <TableCell className='py-4'>
                        <div className='flex justify-end gap-6'>
                          <button
                            onClick={() => handleViewCustomer(customer._id)}
                            title='View'
                            disabled={togglingStatusId === customer._id || deletingId === customer._id}
                            className='text-gray-600 hover:text-gray-900 cursor-pointer hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed'>
                            <Eye className='h-5 w-5' />
                          </button>
                          <button
                            onClick={() => router.push(`/admin/customers/${customer._id}/edit`)}
                            title='Edit'
                            disabled={togglingStatusId === customer._id || deletingId === customer._id}
                            className='text-gray-600 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed'>
                            <Pencil className='h-5 w-5' />
                          </button>
                          <button
                            onClick={() => setDeleteId(customer._id)}
                            title='Delete'
                            disabled={togglingStatusId === customer._id || deletingId === customer._id}
                            className='text-red-500 hover:text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed'>
                            {deletingId === customer._id ? (
                              <Spinner className='h-5 w-5' />
                            ) : (
                              <Trash2 className='h-5 w-5' />
                            )}
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. This will permanently delete the customer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletingId}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={!!deletingId}>
              {deletingId ? <Spinner className='h-4 w-4 mr-2' /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CommonDialog
        open={!!viewCustomerId}
        onOpenChange={open => {
          if (!open) {
            setViewCustomerId(null);
            setCustomerDetails(null);
          }
        }}
        title='Customer Details'
        description={customerDetails?.email}
        cancelText='Close'
        loading={loadingCustomerDetails}>
        {customerDetails && (
          <div className='mt-1 space-y-6 text-sm text-gray-700'>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              <DetailItem label='Name' value={customerDetails.name} />
              <DetailItem label='Email' value={customerDetails.email} />
              <DetailItem label='Phone' value={customerDetails.phone} />
              <DetailItem label='Status' value={customerDetails.status} />
              <DetailItem label='Orders' value={customerDetails.orders} />
              <DetailItem label='Total Spent' value={formatCurrency(customerDetails.spent)} />
              <DetailItem label='Registration Date' value={customerDetails.registrationDate ? formatIndianDate(customerDetails.registrationDate) : '-'} />
              <DetailItem label='Last Order Date' value={customerDetails.lastOrderDate ? formatIndianDate(customerDetails.lastOrderDate) : '-'} />
              <DetailItem label='Created' value={customerDetails.createdAt ? formatIndianDate(customerDetails.createdAt) : '-'} />
              <DetailItem label='Updated' value={customerDetails.updatedAt ? formatIndianDate(customerDetails.updatedAt) : '-'} />
            </div>

            {(customerDetails.address ||
              customerDetails.address1 ||
              customerDetails.address2 ||
              customerDetails.city ||
              customerDetails.state ||
              customerDetails.pinCode) && (
              <div>
                <strong>Address:</strong>
                <p className='mt-1 text-gray-800'>
                  {[
                    customerDetails.address,
                    customerDetails.address1,
                    customerDetails.address2,
                    customerDetails.city,
                    customerDetails.state,
                    customerDetails.pinCode,
                    customerDetails.country,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              </div>
            )}

            {customerDetails.notes && (
              <div>
                <strong>Notes:</strong>
                <p className='mt-1 whitespace-pre-line text-gray-800'>{customerDetails.notes}</p>
              </div>
            )}
          </div>
        )}
      </CommonDialog>
    </div>
  );
}
