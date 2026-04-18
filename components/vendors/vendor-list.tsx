'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
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
import { Download, Edit, Eye, Plus, Search, Trash2, Store, Clock, CheckCircle2, XCircle, AlertCircle, Pencil } from 'lucide-react';
import { CommonDialog } from '../dialog/dialog';
import { formatIndianDate } from '@/app/utils/helper';
import { Spinner } from '@/components/ui/spinner';

interface Vendor {
  _id: string;
  storeName: string;
  email: string;
  phone: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  registrationDate?: string;
}

interface VendorDetails extends Vendor {
  storeSlug?: string;
  ownerName?: string;
  alternatePhone?: string;
  whatsappNumber?: string;
  businessType?: string;
  gstNumber?: string;
  panNumber?: string;
  businessRegistrationNumber?: string;
  description?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  country?: string;
  bankName?: string;
  accountHolderName?: string;
  accountNumber?: string;
  ifscCode?: string;
  upiId?: string;
  logo?: string;
  banner?: string;
  commissionRate?: number;
  allowedCategories?: string[];
  facebook?: string;
  instagram?: string;
  twitter?: string;
  website?: string;
  idProof?: string;
  addressProof?: string;
  gstCertificate?: string;
  cancelledCheque?: string;
  approvalNotes?: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  documentsVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface StatusCounts {
  all: number;
  pending: number;
  approved: number;
  rejected: number;
  suspended: number;
}

interface VendorListProps {
  initialStatus?: string;
}

export function VendorList({ initialStatus }: VendorListProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialStatus || 'all');
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({
    all: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    suspended: 0,
  });
  const [viewVendorId, setViewVendorId] = useState<string | null>(null);
  const [vendorDetails, setVendorDetails] = useState<VendorDetails | null>(null);
  const [loadingVendorDetails, setLoadingVendorDetails] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (initialStatus) {
      setStatusFilter(initialStatus);
    } else {
      setStatusFilter('all');
    }
  }, [initialStatus]);

  useEffect(() => {
    fetchVendors();
  }, [searchTerm, statusFilter]);

  const fetchVendors = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await fetch(`/api/admin/vendors?${params}`);
      const data = await response.json();
      const vendorList = Array.isArray(data.vendors) ? data.vendors : [];
      setVendors(vendorList);

      const counts: StatusCounts = {
        all: vendorList.length,
        pending: vendorList.filter((v: Vendor) => v.status === 'pending').length,
        approved: vendorList.filter((v: Vendor) => v.status === 'approved').length,
        rejected: vendorList.filter((v: Vendor) => v.status === 'rejected').length,
        suspended: vendorList.filter((v: Vendor) => v.status === 'suspended').length,
      };
      setStatusCounts(counts);
    } catch (error) {
      console.error('[v0] Failed to fetch vendors:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch vendors',
        variant: 'destructive',
      });
      setVendors([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (vendorId: string, vendorName: string) => {
    try {
      setDeletingId(vendorId);
      const response = await fetch(`/api/admin/vendors/${vendorId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setVendors(vendors.filter(v => v._id !== vendorId));
        toast({
          title: 'Success',
          description: `Vendor "${vendorName}" deleted successfully`,
          variant : 'success'
        });
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to delete vendor',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('[v0] Delete error:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while deleting the vendor',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleExport = () => {
    const csv = [
      ['Store Name', 'Email', 'Phone', 'Status', 'Registration Date'],
      ...vendors.map(v => [v.storeName, v.email, v.phone, v.status, v.registrationDate || 'N/A']),
    ]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vendors-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const fetchVendorDetails = async (id: string) => {
    try {
      setLoadingVendorDetails(true);
      const response = await fetch(`/api/admin/vendors/${id}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error?.error || 'Failed to fetch vendor details');
      }
      const data = await response.json();
      setVendorDetails(data.vendor);
    } catch (error) {
      console.error('[v0] Failed to fetch vendor details:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch vendor details',
        variant: 'destructive',
      });
    } finally {
      setLoadingVendorDetails(false);
    }
  };

  const handleViewVendor = (id: string) => {
    setViewVendorId(id);
    setVendorDetails(null);
    fetchVendorDetails(id);
  };

  const DetailItem = ({ label, value }: { label: string; value?: ReactNode }) => (
    <div>
      <strong>{label}:</strong>
      <p className='mt-0.5 text-gray-900'>{value ?? '-'}</p>
    </div>
  );

  const handleStatusChange = async (vendorId: string, currentStatus: string) => {
    // Cycle through statuses: pending -> approved -> suspended -> rejected -> pending
    const statusCycle: Record<string, string> = {
      pending: 'approved',
      approved: 'suspended',
      suspended: 'rejected',
      rejected: 'pending',
    };
    const newStatus = statusCycle[currentStatus] || 'pending';

    try {
      const response = await fetch(`/api/admin/vendors/${vendorId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Vendor status updated to ${newStatus}`,
          variant:'success'
        });
        fetchVendors();
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to update status',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred while updating status',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      approved: 'default',
      pending: 'outline',
      rejected: 'destructive',
      suspended: 'secondary',
    };
    return variants[status] || 'outline';
  };

  const getStatusIcon = (status: string) => {
    const iconClass = 'h-8 w-8';
    if (status === 'all') return <Store className={`${iconClass} text-blue-600`} />;
    if (status === 'pending') return <Clock className={`${iconClass} text-amber-600`} />;
    if (status === 'approved') return <CheckCircle2 className={`${iconClass} text-emerald-600`} />;
    if (status === 'rejected') return <XCircle className={`${iconClass} text-rose-600`} />;
    if (status === 'suspended') return <AlertCircle className={`${iconClass} text-slate-600`} />;
  };

  const getStatusCountColor = (status: string) => {
    if (status === 'all') return 'text-blue-700';
    if (status === 'pending') return 'text-amber-700';
    if (status === 'approved') return 'text-emerald-700';
    if (status === 'rejected') return 'text-rose-700';
    if (status === 'suspended') return 'text-slate-700';
  };

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-3xl font-bold'>Vendors</h1>
        <div className='flex flex-row gap-2'>
          <Button variant='outline' onClick={handleExport} className='gap-2'>
            <Download className='h-4 w-4' />
            Export
          </Button>
          <Button onClick={() => router.push('/admin/vendors/add')} className='gap-2 bg-[#22c55e]'>
            <Plus className='h-5 w-5' />
            Add Vendor
          </Button>
        </div>
      </div>

      <Card className='p-6 bg-white border border-gray-200 shadow-md'>
        <div className='space-y-4'>
          <div className='flex flex-row flex-wrap gap-2'>
            <div className='flex relative'>
              <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
              <Input
                placeholder='Search by name, email, or phone...'
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className='pl-10 max-w-[300px]'
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className='w-full md:w-[200px]'>
                <SelectValue placeholder='Filter by status' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All Statuses</SelectItem>
                <SelectItem value='approved'>Approved</SelectItem>
                <SelectItem value='pending'>Pending</SelectItem>
                <SelectItem value='rejected'>Rejected</SelectItem>
                <SelectItem value='suspended'>Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className='text-center py-12'>
              <div className='inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
              <p className='mt-4 text-muted-foreground'>Loading vendors...</p>
            </div>
          ) : vendors.length === 0 ? (
            <div className='text-center py-12'>
              <Store className='h-12 w-12 mx-auto text-muted-foreground mb-4' />
              <p className='text-muted-foreground'>No vendors found</p>
            </div>
          ) : (
            <div className='overflow-x-auto'>
              <Table>
                <TableHeader>
                  <TableRow className='bg-gray-50 border-b border-gray-200 hover:bg-gray-50'>
                    <TableHead className='font-semibold text-gray-700 py-4'>Store Name</TableHead>
                    <TableHead className='font-semibold text-gray-700 py-4'>Email</TableHead>
                    <TableHead className='font-semibold text-gray-700 py-4'>Phone</TableHead>
                    <TableHead className='font-semibold text-gray-700 py-4 text-center'>Status</TableHead>
                    <TableHead className='font-semibold text-gray-700 py-4'>Registration Date</TableHead>
                    <TableHead className='font-semibold text-gray-700 py-4 text-right'>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendors.map(vendor => (
                    <TableRow key={vendor._id} className='border-b border-gray-200 hover:bg-green-50 transition-colors duration-150'>
                      <TableCell className='font-semibold text-gray-900 py-4'>{vendor.storeName}</TableCell>
                      <TableCell className='text-gray-600 py-4'>{vendor.email}</TableCell>
                      <TableCell className='text-gray-600 py-4'>{vendor.phone}</TableCell>
                      <TableCell className='py-4 text-center'>
                        <div className='flex flex-col items-center gap-1'>
                          <Badge
                            variant={getStatusBadge(vendor.status)}
                            onClick={() => handleStatusChange(vendor._id, vendor.status)}
                            className={`cursor-pointer ${
                              vendor.status === 'approved'
                                ? 'bg-green-100 text-green-800 border border-green-300'
                                : vendor.status === 'pending'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : vendor.status === 'rejected'
                                ? 'bg-red-100 text-red-800 border border-red-300'
                                : 'bg-gray-100 text-gray-800 border border-gray-300'
                            }`}>
                            {vendor.status.charAt(0).toUpperCase() + vendor.status.slice(1)}
                          </Badge>
                          <span className='text-xs text-gray-500'>Click to change</span>
                        </div>
                      </TableCell>
                      <TableCell className='text-gray-600 py-4'>{vendor.registrationDate || 'N/A'}</TableCell>
                      <TableCell className='py-4'>
                        <div className='flex justify-end gap-6'>
                          <button
                            onClick={() => handleViewVendor(vendor._id)}
                            title='View vendor'
                            className='text-gray-600 hover:text-gray-900 hover:bg-gray-100 cursor-pointer'>
                            <Eye className='h-5 w-5' />
                          </button>
                          <button
                            onClick={() => router.push(`/admin/vendors/${vendor._id}/edit`)}
                            title='Edit vendor'
                            className='text-gray-600 hover:text-gray-900 hover:bg-gray-100'>
                            <Pencil className='h-5 w-5' />
                          </button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button 
                                title='Delete vendor' 
                                disabled={deletingId === vendor._id}
                                className='text-red-500 hover:text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed'>
                                {deletingId === vendor._id ? (
                                  <Spinner className='h-5 w-5' />
                                ) : (
                                  <Trash2 className='h-5 w-5' />
                                )}
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Vendor</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{vendor.storeName}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel disabled={!!deletingId}>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(vendor._id, vendor.storeName)}
                                  className='bg-red-600 text-white hover:bg-red-700'
                                  disabled={deletingId === vendor._id}>
                                  {deletingId === vendor._id ? <Spinner className='h-4 w-4 mr-2' /> : null}
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </Card>
      <CommonDialog
        open={!!viewVendorId}
        onOpenChange={open => {
          if (!open) {
            setViewVendorId(null);
            setVendorDetails(null);
          }
        }}
        title='Vendor Details'
        description={vendorDetails?.storeName}
        cancelText='Close'
        loading={loadingVendorDetails}>
        {vendorDetails && (
          <div className='mt-1 space-y-6 text-sm text-gray-700'>
            <div className='flex flex-wrap gap-4'>
              {vendorDetails.logo && (
                <div>
                  <strong>Logo:</strong>
                  <img src={vendorDetails.logo} alt='Vendor Logo' className='mt-2 w-24 h-24 object-cover rounded-md border shadow-sm' />
                </div>
              )}
              {vendorDetails.banner && (
                <div className='flex-1'>
                  <strong>Banner:</strong>
                  <img src={vendorDetails.banner} alt='Vendor Banner' className='mt-2 w-full max-w-md h-24 object-cover rounded-md border shadow-sm' />
                </div>
              )}
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              <DetailItem label='Store Name' value={vendorDetails.storeName} />
              <DetailItem label='Owner' value={vendorDetails.ownerName} />
              <DetailItem label='Email' value={vendorDetails.email} />
              <DetailItem label='Phone' value={vendorDetails.phone} />
              <DetailItem label='Alternate Phone' value={vendorDetails.alternatePhone} />
              <DetailItem label='WhatsApp' value={vendorDetails.whatsappNumber} />
              <DetailItem label='Business Type' value={vendorDetails.businessType} />
              <DetailItem label='Status' value={vendorDetails.status} />
              <DetailItem label='Commission Rate' value={vendorDetails.commissionRate != null ? `${vendorDetails.commissionRate}%` : '-'} />
              <DetailItem label='Registration Date' value={vendorDetails.registrationDate ? formatIndianDate(vendorDetails.registrationDate) : '-'} />
              <DetailItem label='Created' value={vendorDetails.createdAt ? formatIndianDate(vendorDetails.createdAt) : '-'} />
              <DetailItem label='Updated' value={vendorDetails.updatedAt ? formatIndianDate(vendorDetails.updatedAt) : '-'} />
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              <DetailItem label='GST Number' value={vendorDetails.gstNumber} />
              <DetailItem label='PAN Number' value={vendorDetails.panNumber} />
              <DetailItem label='Business Registration' value={vendorDetails.businessRegistrationNumber} />
              <DetailItem label='Allowed Categories' value={Array.isArray(vendorDetails.allowedCategories) && vendorDetails.allowedCategories.length ? vendorDetails.allowedCategories.join(', ') : '-'} />
            </div>

            {(vendorDetails.address1 || vendorDetails.address2 || vendorDetails.city || vendorDetails.state || vendorDetails.pinCode) && (
              <div>
                <strong>Address:</strong>
                <p className='mt-1 text-gray-800'>
                  {[
                    vendorDetails.address1,
                    vendorDetails.address2,
                    vendorDetails.city,
                    vendorDetails.state,
                    vendorDetails.pinCode,
                    vendorDetails.country,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              </div>
            )}

            {vendorDetails.description && (
              <div>
                <strong>Description:</strong>
                <p className='mt-1 whitespace-pre-line text-gray-800'>{vendorDetails.description}</p>
              </div>
            )}

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              <DetailItem label='Bank Name' value={vendorDetails.bankName} />
              <DetailItem label='Account Holder' value={vendorDetails.accountHolderName} />
              <DetailItem label='Account Number' value={vendorDetails.accountNumber} />
              <DetailItem label='IFSC' value={vendorDetails.ifscCode} />
              <DetailItem label='UPI ID' value={vendorDetails.upiId} />
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              <DetailItem label='Email Verified' value={vendorDetails.emailVerified ? 'Yes' : 'No'} />
              <DetailItem label='Phone Verified' value={vendorDetails.phoneVerified ? 'Yes' : 'No'} />
              <DetailItem label='Documents Verified' value={vendorDetails.documentsVerified ? 'Yes' : 'No'} />
            </div>

            {(vendorDetails.idProof || vendorDetails.addressProof || vendorDetails.gstCertificate || vendorDetails.cancelledCheque) && (
              <div>
                <strong>Documents:</strong>
                <ul className='list-disc list-inside mt-1 text-gray-800 space-y-1'>
                  {vendorDetails.idProof && <li>ID Proof: {vendorDetails.idProof}</li>}
                  {vendorDetails.addressProof && <li>Address Proof: {vendorDetails.addressProof}</li>}
                  {vendorDetails.gstCertificate && <li>GST Certificate: {vendorDetails.gstCertificate}</li>}
                  {vendorDetails.cancelledCheque && <li>Cancelled Cheque: {vendorDetails.cancelledCheque}</li>}
                </ul>
              </div>
            )}

            {(vendorDetails.facebook || vendorDetails.instagram || vendorDetails.twitter || vendorDetails.website) && (
              <div>
                <strong>Links:</strong>
                <ul className='list-disc list-inside mt-1 text-gray-800 space-y-1'>
                  {vendorDetails.facebook && <li>Facebook: {vendorDetails.facebook}</li>}
                  {vendorDetails.instagram && <li>Instagram: {vendorDetails.instagram}</li>}
                  {vendorDetails.twitter && <li>Twitter: {vendorDetails.twitter}</li>}
                  {vendorDetails.website && <li>Website: {vendorDetails.website}</li>}
                </ul>
              </div>
            )}

            {vendorDetails.approvalNotes && (
              <div>
                <strong>Approval Notes:</strong>
                <p className='mt-1 whitespace-pre-line text-gray-800'>{vendorDetails.approvalNotes}</p>
              </div>
            )}
          </div>
        )}
      </CommonDialog>
    </div>
  );
}
