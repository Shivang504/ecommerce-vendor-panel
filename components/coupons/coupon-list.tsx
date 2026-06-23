'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
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
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTableBody } from '@/components/ui/data-table-body';
import { useToast } from '@/hooks/use-toast';
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  Search,
  RotateCcw,
  Lock,
  Info,
  ArrowRight,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Spinner } from '@/components/ui/spinner';
import {
  canActivateCoupon,
  formatCouponDate,
  formatCouponDiscount,
  getCouponScopeType,
  resolveApprovalStatus,
  type CouponListItem,
} from '@/lib/coupon-display';

interface CouponListProps {
  variant?: 'admin' | 'vendor';
}

const STATUS_LEGEND = [
  { key: 'draft', label: 'Draft', color: 'bg-slate-400', description: 'Not submitted' },
  { key: 'pending', label: 'Pending', color: 'bg-amber-400', description: 'Awaiting approval' },
  { key: 'active', label: 'Active', color: 'bg-emerald-500', description: 'Live on store' },
  { key: 'rejected', label: 'Rejected', color: 'bg-rose-500', description: 'Approval declined' },
] as const;

function ApprovalBadge({ status }: { status: ReturnType<typeof resolveApprovalStatus> }) {
  if (status === 'draft') {
    return <Badge variant='outline' className='text-slate-600 border-slate-300'>Draft</Badge>;
  }
  if (status === 'pending') {
    return <Badge className='bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200'>Pending</Badge>;
  }
  if (status === 'approved') {
    return <Badge className='bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200'>Approved</Badge>;
  }
  return <Badge className='bg-rose-100 text-rose-800 hover:bg-rose-100 border-rose-200'>Rejected</Badge>;
}

function CouponTypeBadge({ coupon }: { coupon: CouponListItem }) {
  const scope = getCouponScopeType(coupon);
  if (scope === 'product') {
    return <Badge className='bg-violet-100 text-violet-800 hover:bg-violet-100 border-violet-200'>Product</Badge>;
  }
  return <Badge className='bg-sky-100 text-sky-800 hover:bg-sky-100 border-sky-200'>Sitewide</Badge>;
}

export function CouponList({ variant = 'vendor' }: CouponListProps) {
  const isAdminView = variant === 'admin';
  const basePath = isAdminView ? '/admin/coupons' : '/supplier/coupons';
  const columnCount = isAdminView ? 11 : 10;

  const [coupons, setCoupons] = useState<CouponListItem[]>([]);
  const [search, setSearch] = useState('');
  const [workflowStatus, setWorkflowStatus] = useState('all');
  const [couponType, setCouponType] = useState('all');
  const [approvalStatus, setApprovalStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingStatusId, setTogglingStatusId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    fetchCoupons();
  }, [search, workflowStatus, couponType, approvalStatus]);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (workflowStatus !== 'all') params.append('workflowStatus', workflowStatus);
      if (couponType !== 'all') params.append('couponType', couponType);
      if (approvalStatus !== 'all') params.append('approvalStatus', approvalStatus);

      const response = await fetch(`/api/admin/coupons?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setCoupons(Array.isArray(data) ? data : []);
      } else {
        setCoupons([]);
      }
    } catch (error) {
      console.error('[Coupon] Failed to fetch coupons:', error);
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setSearch('');
    setWorkflowStatus('all');
    setCouponType('all');
    setApprovalStatus('all');
  };

  const paginationLabel = useMemo(() => {
    const total = coupons.length;
    if (total === 0) return 'Showing 0 coupons';
    return `Showing 1 to ${total} of ${total} coupon${total === 1 ? '' : 's'}`;
  }, [coupons.length]);

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    const coupon = coupons.find(c => c._id === id);
    if (!coupon) return;

    if (!currentStatus && !canActivateCoupon(coupon)) {
      toast({
        title: 'Approval required',
        description: 'Only approved coupons can be turned on.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setTogglingStatusId(id);
      const response = await fetch(`/api/admin/coupons/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: !currentStatus }),
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
      console.error('[Coupon] Toggle status error:', error);
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive',
      });
    } finally {
      setTogglingStatusId(null);
    }
  };

  const handleApprove = async (id: string, action: 'approve' | 'reject') => {
    try {
      setApprovingId(id);
      const response = await fetch(`/api/admin/coupons/${id}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: action === 'approve' ? 'Coupon approved' : 'Coupon rejected',
          variant: 'success',
        });
        fetchCoupons();
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to update approval status',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('[Coupon] Approve error:', error);
      toast({
        title: 'Error',
        description: 'Failed to update approval status',
        variant: 'destructive',
      });
    } finally {
      setApprovingId(null);
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
      console.error('[Coupon] Delete error:', error);
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
        <Button onClick={() => router.push(`${basePath}/add`)} className='gap-2 bg-[#22c55e] text-white hover:bg-[#16a34a]'>
          <Plus className='h-4 w-4' />
          Add Coupon
        </Button>
      </div>

      <div className='rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900 flex items-start gap-2'>
        <Info className='h-4 w-4 mt-0.5 shrink-0' />
        <p>Coupons will go LIVE only after admin approval. Product coupons are admin controlled.</p>
      </div>

      <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
        {STATUS_LEGEND.map(item => (
          <div key={item.key} className='rounded-lg border bg-white px-4 py-3'>
            <div className='flex items-center gap-2'>
              <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
              <span className='font-medium text-sm'>{item.label}</span>
            </div>
            <p className='text-xs text-muted-foreground mt-1'>{item.description}</p>
          </div>
        ))}
      </div>

      <Card className='p-6'>
        <div className='mb-4 flex flex-wrap items-center gap-3'>
          <div className='relative flex-1 min-w-[220px] max-w-sm'>
            <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              placeholder='Search coupons...'
              value={search}
              onChange={e => setSearch(e.target.value)}
              className='pl-10'
            />
          </div>
          <Select value={workflowStatus} onValueChange={setWorkflowStatus}>
            <SelectTrigger className='w-[160px]'>
              <SelectValue placeholder='Status' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All</SelectItem>
              <SelectItem value='draft'>Draft</SelectItem>
              <SelectItem value='pending'>Pending</SelectItem>
              <SelectItem value='active'>Active</SelectItem>
              <SelectItem value='rejected'>Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Select value={couponType} onValueChange={setCouponType}>
            <SelectTrigger className='w-[160px]'>
              <SelectValue placeholder='Coupon Type' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All</SelectItem>
              <SelectItem value='product'>Product</SelectItem>
              <SelectItem value='sitewide'>Sitewide</SelectItem>
            </SelectContent>
          </Select>
          <Select value={approvalStatus} onValueChange={setApprovalStatus}>
            <SelectTrigger className='w-[180px]'>
              <SelectValue placeholder='Approval Status' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All</SelectItem>
              <SelectItem value='pending'>Pending</SelectItem>
              <SelectItem value='approved'>Approved</SelectItem>
              <SelectItem value='rejected'>Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Button variant='outline' onClick={resetFilters} className='gap-2'>
            <RotateCcw className='h-4 w-4' />
            Reset
          </Button>
        </div>

        <div className='overflow-x-auto'>
          <Table>
            <TableHeader>
              <TableRow className='bg-gray-50'>
                <TableHead>Title</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Coupon Type</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Expiry Date</TableHead>
                {isAdminView && <TableHead>Vendor Name</TableHead>}
                <TableHead>Approval Status</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Create At</TableHead>
                <TableHead className='text-right'>Action</TableHead>
                {isAdminView && <TableHead>Admin Action</TableHead>}
              </TableRow>
            </TableHeader>
            <DataTableBody
              loading={loading}
              data={coupons}
              columns={columnCount}
              loadingText='Loading coupons...'
              emptyText='No coupons found'>
              {coupons.map(coupon => {
                const approval = resolveApprovalStatus(coupon);
                const canToggle = canActivateCoupon(coupon) || coupon.status;
                const showApprove = approval === 'pending' || approval === 'rejected';

                return (
                  <TableRow key={coupon._id}>
                    <TableCell className='font-medium py-4'>{coupon.title}</TableCell>
                    <TableCell>{coupon.code}</TableCell>
                    <TableCell>
                      <CouponTypeBadge coupon={coupon} />
                    </TableCell>
                    <TableCell>{formatCouponDiscount(coupon)}</TableCell>
                    <TableCell>{formatCouponDate(coupon.endDate, false)}</TableCell>
                    {isAdminView && <TableCell>{coupon.vendorName || 'Admin'}</TableCell>}
                    <TableCell>
                      <ApprovalBadge status={approval} />
                    </TableCell>
                    <TableCell>
                      {togglingStatusId === coupon._id ? (
                        <Spinner className='h-4 w-4' />
                      ) : (
                        <Switch
                          checked={coupon.status}
                          onCheckedChange={() => handleToggleStatus(coupon._id, coupon.status)}
                          disabled={!canToggle || togglingStatusId === coupon._id}
                        />
                      )}
                    </TableCell>
                    <TableCell>{formatCouponDate(coupon.createdAt, true)}</TableCell>
                    <TableCell className='text-right'>
                      <div className='flex justify-end gap-3'>
                        <button
                          onClick={() => router.push(`${basePath}/${coupon._id}`)}
                          disabled={togglingStatusId === coupon._id || deletingId === coupon._id}
                          className='text-gray-600 hover:text-gray-900 hover:bg-gray-100 p-1 rounded cursor-pointer'
                          title='View'>
                          <Eye className='h-5 w-5' />
                        </button>
                        <button
                          onClick={() => router.push(`${basePath}/${coupon._id}`)}
                          disabled={togglingStatusId === coupon._id || deletingId === coupon._id}
                          className='text-gray-600 hover:text-gray-900 hover:bg-gray-100 p-1 rounded cursor-pointer'
                          title='Edit'>
                          <Pencil className='h-5 w-5' />
                        </button>
                        <button
                          onClick={() => setDeleteId(coupon._id)}
                          disabled={togglingStatusId === coupon._id || deletingId === coupon._id}
                          className='text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded cursor-pointer'
                          title='Delete'>
                          <Trash2 className='h-5 w-5' />
                        </button>
                      </div>
                    </TableCell>
                    {isAdminView && (
                      <TableCell>
                        {showApprove ? (
                          <Button
                            size='sm'
                            variant='outline'
                            className='border-emerald-500 text-emerald-700 hover:bg-emerald-50'
                            disabled={approvingId === coupon._id}
                            onClick={() => handleApprove(coupon._id, 'approve')}>
                            {approvingId === coupon._id ? <Spinner className='h-4 w-4' /> : 'Approve'}
                          </Button>
                        ) : (
                          <span className='text-xs text-muted-foreground'>—</span>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </DataTableBody>
          </Table>
        </div>

        <p className='text-sm text-muted-foreground mt-4'>{paginationLabel}</p>
      </Card>

      <div className='grid gap-4 lg:grid-cols-2'>
        <Card className='p-5'>
          <h3 className='font-semibold mb-3'>Coupon Types</h3>
          <div className='space-y-2 text-sm'>
            <div className='flex items-center gap-2'>
              <Badge className='bg-violet-100 text-violet-800 hover:bg-violet-100'>Product</Badge>
              <span className='text-muted-foreground'>Applicable to selected products only (admin controlled).</span>
            </div>
            <div className='flex items-center gap-2'>
              <Badge className='bg-sky-100 text-sky-800 hover:bg-sky-100'>Sitewide</Badge>
              <span className='text-muted-foreground'>Applicable to entire store.</span>
            </div>
          </div>
        </Card>

        <Card className='p-5'>
          <h3 className='font-semibold mb-3'>Approval Workflow</h3>
          <div className='flex flex-wrap items-center gap-2 text-sm'>
            <Badge variant='outline'>Draft</Badge>
            <ArrowRight className='h-4 w-4 text-muted-foreground' />
            <Badge className='bg-amber-100 text-amber-800 hover:bg-amber-100'>Pending</Badge>
            <ArrowRight className='h-4 w-4 text-muted-foreground' />
            <Badge className='bg-emerald-100 text-emerald-800 hover:bg-emerald-100'>Approved</Badge>
            <ArrowRight className='h-4 w-4 text-muted-foreground' />
            <span className='text-muted-foreground'>Active (toggle)</span>
          </div>
        </Card>
      </div>

      <div className='rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5'>
        <h3 className='font-semibold mb-3'>How it works?</h3>
        <ol className='list-decimal list-inside space-y-1 text-sm text-muted-foreground'>
          <li>Admin/Vendor creates coupon → Saved as <strong>Draft</strong>.</li>
          <li>Submit for approval → <strong>Pending</strong>.</li>
          <li>Admin approves → Coupon goes <strong>Live</strong>.</li>
          <li>Only <strong>Approved</strong> coupons can be turned <strong>ON (Active)</strong>.</li>
        </ol>
      </div>

      <div className='flex items-center gap-2 text-sm text-muted-foreground'>
        <Lock className='h-4 w-4' />
        <span>Only Admin can approve or reject coupons.</span>
      </div>

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
