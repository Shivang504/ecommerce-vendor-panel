'use client';

import { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ClipboardList, Loader2, Send } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

const REQUEST_TYPE_OPTIONS = [
  { value: 'new_category_catalog', label: 'New category / catalogue' },
  { value: 'new_subcategory', label: 'New subcategory' },
  { value: 'new_child_category', label: 'New child category' },
  { value: 'new_brand', label: 'New brand' },
  { value: 'catalog_change', label: 'Change to existing catalogue' },
  { value: 'other', label: 'Other' },
] as const;

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'in_review', label: 'In review' },
  { value: 'completed', label: 'Completed' },
  { value: 'declined', label: 'Declined' },
] as const;

type RequestTypeValue = (typeof REQUEST_TYPE_OPTIONS)[number]['value'];
type StatusValue = (typeof STATUS_OPTIONS)[number]['value'];

export interface VendorRequestRow {
  _id: string;
  vendorId: string;
  vendorEmail?: string;
  vendorStoreName?: string;
  requestType: RequestTypeValue;
  subject: string;
  message: string;
  status: StatusValue;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

function requestTypeLabel(value: string) {
  return REQUEST_TYPE_OPTIONS.find(o => o.value === value)?.label || value;
}

function statusBadgeClass(status: string) {
  switch (status) {
    case 'open':
      return 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200';
    case 'in_review':
      return 'bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-200';
    case 'completed':
      return 'bg-green-100 text-green-900 dark:bg-green-900/30 dark:text-green-200';
    case 'declined':
      return 'bg-red-100 text-red-900 dark:bg-red-900/30 dark:text-red-200';
    default:
      return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200';
  }
}

export function VendorRequestsPage() {
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [isVendor, setIsVendor] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [requests, setRequests] = useState<VendorRequestRow[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const [requestType, setRequestType] = useState<RequestTypeValue>('new_category_catalog');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const [manageOpen, setManageOpen] = useState(false);
  const [selected, setSelected] = useState<VendorRequestRow | null>(null);
  const [adminStatus, setAdminStatus] = useState<StatusValue>('open');
  const [adminNotes, setAdminNotes] = useState('');
  const [savingAdmin, setSavingAdmin] = useState(false);

  const authHeaders = useCallback(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, []);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.set('status', filterStatus);
      const res = await fetch(`/api/admin/vendor-requests?${params.toString()}`, {
        headers: authHeaders(),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load');
      }
      setRequests(data.requests || []);
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Could not load requests',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [authHeaders, filterStatus, toast]);

  useEffect(() => {
    setMounted(true);
    const raw = localStorage.getItem('adminUser');
    if (raw) {
      try {
        const u = JSON.parse(raw);
        if (u?.role === 'vendor') setIsVendor(true);
        if (u?.role === 'admin' || u?.role === 'superadmin') setIsAdmin(true);
      } catch {
        /* ignore */
      }
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    loadRequests();
  }, [mounted, loadRequests]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/vendor-requests', {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify({ requestType, subject, message }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Submit failed');
      }
      toast({ title: 'Sent', description: 'Your request was sent to the admin team.', variant: 'success' });
      setSubject('');
      setMessage('');
      setRequestType('new_category_catalog');
      loadRequests();
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Submit failed',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openManage = (row: VendorRequestRow) => {
    setSelected(row);
    setAdminStatus(row.status);
    setAdminNotes(row.adminNotes || '');
    setManageOpen(true);
  };

  const saveAdminUpdate = async () => {
    if (!selected) return;
    setSavingAdmin(true);
    try {
      const res = await fetch(`/api/admin/vendor-requests/${selected._id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify({ status: adminStatus, adminNotes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      toast({ title: 'Saved', description: 'Request updated.', variant: 'success' });
      setManageOpen(false);
      loadRequests();
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Update failed',
        variant: 'destructive',
      });
    } finally {
      setSavingAdmin(false);
    }
  };

  if (!mounted) {
    return (
      <div className='flex min-h-[40vh] items-center justify-center'>
        <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
      </div>
    );
  }

  return (
    <div className='mx-auto max-w-6xl space-y-8'>
      <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2'>
            <ClipboardList className='h-7 w-7 text-primary' />
            {isVendor ? 'Requests to admin' : 'Vendor requests'}
          </h1>
          <p className='text-sm text-slate-600 dark:text-slate-400 mt-1'>
            {isVendor
              ? 'Ask the marketplace team to add categories, brands, or other catalogue changes.'
              : 'Review and respond to requests from vendors.'}
          </p>
        </div>
        {isAdmin && (
          <div className='flex items-center gap-2'>
            <Label htmlFor='status-filter' className='text-sm whitespace-nowrap'>
              Status
            </Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger id='status-filter' className='w-[160px] bg-white dark:bg-slate-900'>
                <SelectValue placeholder='Filter' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All</SelectItem>
                {STATUS_OPTIONS.map(s => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {isVendor && (
        <Card className='border border-slate-200 dark:border-slate-700 p-6 shadow-sm'>
          <h2 className='text-lg font-semibold text-slate-900 dark:text-white mb-4'>New request</h2>
          <form onSubmit={handleSubmit} className='space-y-4'>
            <div className='space-y-2'>
              <Label>Type</Label>
              <Select value={requestType} onValueChange={v => setRequestType(v as RequestTypeValue)}>
                <SelectTrigger className='w-full max-w-md bg-white dark:bg-slate-900'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REQUEST_TYPE_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-2'>
              <Label htmlFor='req-subject'>Subject</Label>
              <Input
                id='req-subject'
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder='e.g. Request to add “Handmade pottery” category'
                maxLength={200}
                className='bg-white dark:bg-slate-900'
                required
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='req-message'>Details</Label>
              <Textarea
                id='req-message'
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder='Describe what you need, links, examples, or SKU context.'
                rows={5}
                className='bg-white dark:bg-slate-900 min-h-[120px]'
                required
              />
              <p className='text-xs text-slate-500'>Minimum 10 characters. Admin will follow up by updating this ticket.</p>
            </div>
            <Button type='submit' disabled={submitting} className='gap-2'>
              {submitting ? <Loader2 className='h-4 w-4 animate-spin' /> : <Send className='h-4 w-4' />}
              Submit request
            </Button>
          </form>
        </Card>
      )}

      <Card className='border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm'>
        <div className='border-b border-slate-200 dark:border-slate-700 px-6 py-4'>
          <h2 className='text-lg font-semibold text-slate-900 dark:text-white'>
            {isVendor ? 'Your requests' : 'All requests'}
          </h2>
        </div>
        <div className='p-0'>
          {loading ? (
            <div className='flex justify-center py-16'>
              <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
            </div>
          ) : requests.length === 0 ? (
            <p className='text-sm text-slate-500 dark:text-slate-400 py-12 text-center'>No requests yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {isAdmin && <TableHead>Vendor</TableHead>}
                  <TableHead>Type</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  {isAdmin && <TableHead className='text-right'>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map(row => (
                  <TableRow key={row._id}>
                    {isAdmin && (
                      <TableCell className='align-top text-sm'>
                        <div className='font-medium text-slate-900 dark:text-white'>
                          {row.vendorStoreName || '—'}
                        </div>
                        <div className='text-xs text-slate-500'>{row.vendorEmail || row.vendorId}</div>
                      </TableCell>
                    )}
                    <TableCell className='align-top text-sm max-w-[200px]'>{requestTypeLabel(row.requestType)}</TableCell>
                    <TableCell className='align-top text-sm max-w-[280px]'>
                      <div className='font-medium text-slate-900 dark:text-white'>{row.subject}</div>
                      <p className='text-xs text-slate-500 line-clamp-2 mt-1'>{row.message}</p>
                      {row.adminNotes && (
                        <p className='text-xs text-primary mt-2'>
                          <span className='font-semibold'>Admin: </span>
                          {row.adminNotes}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className='align-top'>
                      <Badge className={statusBadgeClass(row.status)} variant='secondary'>
                        {STATUS_OPTIONS.find(s => s.value === row.status)?.label || row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className='align-top text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap'>
                      {row.createdAt ? format(new Date(row.createdAt), 'MMM d, yyyy HH:mm') : '—'}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className='text-right align-top'>
                        <Button type='button' variant='outline' size='sm' onClick={() => openManage(row)}>
                          Manage
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>

      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>Update request</DialogTitle>
            <DialogDescription>{selected?.subject}</DialogDescription>
          </DialogHeader>
          <div className='space-y-4 py-2'>
            <div className='space-y-2'>
              <Label>Status</Label>
              <Select value={adminStatus} onValueChange={v => setAdminStatus(v as StatusValue)}>
                <SelectTrigger className='bg-white dark:bg-slate-900'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(s => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-2'>
              <Label htmlFor='admin-notes'>Notes to vendor (optional)</Label>
              <Textarea
                id='admin-notes'
                value={adminNotes}
                onChange={e => setAdminNotes(e.target.value)}
                rows={4}
                placeholder='Internal note or message visible in the vendor list…'
                className='bg-white dark:bg-slate-900'
              />
            </div>
            <p className='text-xs text-slate-500'>Message body (vendor request):</p>
            <p className='text-sm rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-3 max-h-40 overflow-y-auto'>
              {selected?.message}
            </p>
          </div>
          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => setManageOpen(false)}>
              Cancel
            </Button>
            <Button type='button' onClick={saveAdminUpdate} disabled={savingAdmin}>
              {savingAdmin ? <Loader2 className='h-4 w-4 animate-spin' /> : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
