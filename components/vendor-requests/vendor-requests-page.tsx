'use client';

import { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, MessageSquarePlus } from 'lucide-react';
import type { VendorAdminRequestStatus, VendorAdminRequestType } from '@/lib/models/vendor-admin-request';

const REQUEST_TYPE_OPTIONS: { value: VendorAdminRequestType; label: string }[] = [
  { value: 'new_catalogue_category', label: 'New catalogue or category' },
  { value: 'brand_or_tag', label: 'New brand or tag' },
  { value: 'listing_merchandising', label: 'Listing or merchandising' },
  { value: 'account_billing', label: 'Account or billing' },
  { value: 'technical', label: 'Technical issue' },
  { value: 'other', label: 'Other' },
];

const STATUS_OPTIONS: { value: VendorAdminRequestStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

function typeLabel(type: VendorAdminRequestType) {
  return REQUEST_TYPE_OPTIONS.find(o => o.value === type)?.label ?? type;
}

function statusBadgeClass(status: VendorAdminRequestStatus) {
  switch (status) {
    case 'open':
      return 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200';
    case 'in_progress':
      return 'bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-200';
    case 'resolved':
      return 'bg-green-100 text-green-900 dark:bg-green-900/30 dark:text-green-200';
    case 'closed':
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

export interface SerializedVendorRequest {
  _id: string;
  vendorId: string;
  vendorName?: string;
  vendorEmail?: string;
  requestType: VendorAdminRequestType;
  subject: string;
  message: string;
  status: VendorAdminRequestStatus;
  adminReply?: string;
  createdAt: string;
  updatedAt: string;
}

export function VendorRequestsPage() {
  const { toast } = useToast();
  /** `undefined` = not read from storage yet (avoid racing effects). */
  const [role, setRole] = useState<'vendor' | 'admin' | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<SerializedVendorRequest[]>([]);
  const [filterStatus, setFilterStatus] = useState<VendorAdminRequestStatus | 'all'>('all');

  const [requestType, setRequestType] = useState<VendorAdminRequestType>('new_catalogue_category');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [manageOpen, setManageOpen] = useState(false);
  const [selected, setSelected] = useState<SerializedVendorRequest | null>(null);
  const [adminStatus, setAdminStatus] = useState<VendorAdminRequestStatus>('open');
  const [adminReply, setAdminReply] = useState('');
  const [savingAdmin, setSavingAdmin] = useState(false);

  const authHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      const qs =
        role === 'admin' && filterStatus !== 'all' ? `?status=${encodeURIComponent(filterStatus)}` : '';
      const res = await fetch(`/api/admin/vendor-requests${qs}`, {
        headers: authHeaders(),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: 'Error', description: data.error || 'Failed to load', variant: 'destructive' });
        return;
      }
      setRequests(Array.isArray(data.requests) ? data.requests : []);
    } catch {
      toast({ title: 'Error', description: 'Failed to load requests', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [role, filterStatus, toast]);

  useEffect(() => {
    const raw = localStorage.getItem('adminUser');
    if (!raw) {
      setRole(null);
      setLoading(false);
      return;
    }
    try {
      const u = JSON.parse(raw);
      if (u?.role === 'vendor') setRole('vendor');
      else if (u?.role === 'admin' || u?.role === 'superadmin') setRole('admin');
      else {
        setRole(null);
        setLoading(false);
      }
    } catch {
      setRole(null);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (role === undefined) return;
    if (role === null) {
      setLoading(false);
      return;
    }
    loadRequests();
  }, [role, loadRequests]);

  const handleSubmitVendor = async (e: React.FormEvent) => {
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
        toast({ title: 'Error', description: data.error || 'Submit failed', variant: 'destructive' });
        return;
      }
      toast({ title: 'Sent', description: 'Your request was submitted to the admin team.', variant: 'success' });
      setSubject('');
      setMessage('');
      setRequestType('new_catalogue_category');
      await loadRequests();
    } catch {
      toast({ title: 'Error', description: 'Submit failed', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const openManage = (row: SerializedVendorRequest) => {
    setSelected(row);
    setAdminStatus(row.status);
    setAdminReply(row.adminReply || '');
    setManageOpen(true);
  };

  const saveAdmin = async () => {
    if (!selected) return;
    setSavingAdmin(true);
    try {
      const res = await fetch(`/api/admin/vendor-requests/${selected._id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          status: adminStatus,
          adminReply,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: 'Error', description: data.error || 'Update failed', variant: 'destructive' });
        return;
      }
      toast({ title: 'Saved', description: 'Request updated.', variant: 'success' });
      setManageOpen(false);
      setSelected(null);
      await loadRequests();
    } catch {
      toast({ title: 'Error', description: 'Update failed', variant: 'destructive' });
    } finally {
      setSavingAdmin(false);
    }
  };

  if (role === null) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
        <p className="text-slate-600 dark:text-slate-400">This page is available to vendors and administrators.</p>
      </div>
    );
  }

  if (role === undefined) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {role === 'vendor' ? 'Requests to admin' : 'Vendor requests'}
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {role === 'vendor'
            ? 'Ask the marketplace team for catalogue changes, new categories, or anything else you need.'
            : 'Review and respond to requests raised by vendors.'}
        </p>
      </div>

      {role === 'vendor' && (
        <Card className="border-slate-200 p-6 dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-4 flex items-center gap-2">
            <MessageSquarePlus className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">New request</h2>
          </div>
          <form onSubmit={handleSubmitVendor} className="space-y-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={requestType} onValueChange={v => setRequestType(v as VendorAdminRequestType)}>
                <SelectTrigger className="w-full max-w-md bg-white dark:bg-slate-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REQUEST_TYPE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vq-subject">Subject</Label>
              <Input
                id="vq-subject"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Short summary, e.g. Request new subcategory under Gold"
                className="max-w-xl bg-white dark:bg-slate-800"
                maxLength={200}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vq-message">Details</Label>
              <Textarea
                id="vq-message"
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Describe what you need, links, examples, or SKU context."
                rows={6}
                className="max-w-2xl bg-white dark:bg-slate-800"
                maxLength={8000}
              />
              <p className="text-xs text-slate-500">10–8000 characters.</p>
            </div>
            <Button type="submit" disabled={submitting} className="bg-primary text-primary-foreground">
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting…
                </>
              ) : (
                'Submit request'
              )}
            </Button>
          </form>
        </Card>
      )}

      <Card className="border-slate-200 p-6 dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {role === 'vendor' ? 'Your requests' : 'All requests'}
          </h2>
          {role === 'admin' && (
            <div className="flex items-center gap-2">
              <Label className="text-xs text-slate-500">Status</Label>
              <Select
                value={filterStatus}
                onValueChange={v => setFilterStatus(v as VendorAdminRequestStatus | 'all')}>
                <SelectTrigger className="w-[180px] bg-white dark:bg-slate-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
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

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : requests.length === 0 ? (
          <p className="py-8 text-center text-slate-500">No requests yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-slate-200 dark:border-slate-700">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  {role === 'admin' && <TableHead>Vendor</TableHead>}
                  <TableHead>Type</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  {role === 'vendor' && <TableHead>Admin reply</TableHead>}
                  {role === 'admin' && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map(row => (
                  <TableRow key={row._id}>
                    <TableCell className="whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                      {format(new Date(row.createdAt), 'dd MMM yyyy, HH:mm')}
                    </TableCell>
                    {role === 'admin' && (
                      <TableCell className="max-w-[160px] truncate text-sm" title={row.vendorName}>
                        {row.vendorName || '—'}
                      </TableCell>
                    )}
                    <TableCell className="text-sm">{typeLabel(row.requestType)}</TableCell>
                    <TableCell className="max-w-[240px]">
                      <div className="truncate font-medium text-slate-900 dark:text-white" title={row.subject}>
                        {row.subject}
                      </div>
                      <p className="line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{row.message}</p>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(row.status)}`}>
                        {STATUS_OPTIONS.find(s => s.value === row.status)?.label ?? row.status}
                      </span>
                    </TableCell>
                    {role === 'vendor' && (
                      <TableCell className="max-w-[200px] text-sm text-slate-600 dark:text-slate-400">
                        {row.adminReply ? (
                          <span className="line-clamp-3 whitespace-pre-wrap" title={row.adminReply}>
                            {row.adminReply}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>
                    )}
                    {role === 'admin' && (
                      <TableCell className="text-right">
                        <Button type="button" variant="outline" size="sm" onClick={() => openManage(row)}>
                          Manage
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

      </Card>

      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Update request</DialogTitle>
            <DialogDescription>{selected?.subject}</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 py-2">
              <div className="rounded-md bg-slate-50 p-3 text-sm dark:bg-slate-800">
                <p className="text-xs font-medium text-slate-500">Vendor</p>
                <p className="text-slate-900 dark:text-white">{selected.vendorName}</p>
                {selected.vendorEmail && <p className="text-xs text-slate-600">{selected.vendorEmail}</p>}
              </div>
              <div className="text-sm text-slate-700 dark:text-slate-300">
                <p className="text-xs font-medium text-slate-500">Message</p>
                <p className="whitespace-pre-wrap">{selected.message}</p>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={adminStatus} onValueChange={v => setAdminStatus(v as VendorAdminRequestStatus)}>
                  <SelectTrigger className="bg-white dark:bg-slate-800">
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
              <div className="space-y-2">
                <Label htmlFor="admin-reply">Reply to vendor</Label>
                <Textarea
                  id="admin-reply"
                  value={adminReply}
                  onChange={e => setAdminReply(e.target.value)}
                  rows={5}
                  className="bg-white dark:bg-slate-800"
                  maxLength={8000}
                  placeholder="Optional note visible in the admin workflow; vendors see replies in their list below the table."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setManageOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={saveAdmin} disabled={savingAdmin}>
              {savingAdmin ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
