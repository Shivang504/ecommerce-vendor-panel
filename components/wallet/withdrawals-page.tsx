'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Wallet,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Search,
} from 'lucide-react';
import { format } from 'date-fns';

interface Withdrawal {
  _id: string;
  vendorId: string;
  vendorName?: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  requestNote?: string;
  adminNote?: string;
  requestedAt: string;
  processedAt?: string;
  processedBy?: string;
  accountDetails?: {
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    accountHolderName?: string;
    upiId?: string;
  };
}

interface WithdrawalsSummary {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  pendingAmount: number;
  approvedAmount: number;
}

export function WithdrawalsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [summary, setSummary] = useState<WithdrawalsSummary | null>(null);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [adminNote, setAdminNote] = useState('');
  const [processing, setProcessing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchWithdrawals();
  }, [statusFilter]);

  const fetchWithdrawals = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const url = statusFilter === 'all' 
        ? '/api/admin/withdrawals'
        : `/api/admin/withdrawals?status=${statusFilter}`;
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setWithdrawals(data.withdrawals || []);
        setSummary(data.summary || null);
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to fetch withdrawals',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch withdrawals',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (!selectedWithdrawal) return;

    setProcessing(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/admin/withdrawals/${selectedWithdrawal._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        credentials: 'include',
        body: JSON.stringify({
          status: actionType === 'approve' ? 'approved' : 'rejected',
          adminNote: adminNote.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Withdrawal ${actionType}ed successfully`,
        });
        setActionDialogOpen(false);
        setSelectedWithdrawal(null);
        setAdminNote('');
        fetchWithdrawals();
      } else {
        toast({
          title: 'Error',
          description: data.error || `Failed to ${actionType} withdrawal`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error(`Error ${actionType}ing withdrawal:`, error);
      toast({
        title: 'Error',
        description: `Failed to ${actionType} withdrawal`,
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const openActionDialog = (withdrawal: Withdrawal, action: 'approve' | 'reject') => {
    setSelectedWithdrawal(withdrawal);
    setActionType(action);
    setAdminNote('');
    setActionDialogOpen(true);
  };

  const filteredWithdrawals = withdrawals.filter(w => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        w.vendorName?.toLowerCase().includes(query) ||
        w.vendorId.toLowerCase().includes(query) ||
        w.amount.toString().includes(query)
      );
    }
    return true;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const classes = {
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${classes[status as keyof typeof classes] || ''}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Withdrawals</h1>
        <p className="text-gray-500 mt-1">Manage vendor withdrawal requests</p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6">
            <p className="text-sm text-gray-500">Total Requests</p>
            <p className="text-2xl font-bold mt-1">{summary.total}</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-gray-500">Pending</p>
            <p className="text-2xl font-bold mt-1 text-yellow-600">{summary.pending}</p>
            <p className="text-sm text-gray-500 mt-1">₹{summary.pendingAmount.toFixed(2)}</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-gray-500">Approved</p>
            <p className="text-2xl font-bold mt-1 text-green-600">{summary.approved}</p>
            <p className="text-sm text-gray-500 mt-1">₹{summary.approvedAmount.toFixed(2)}</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-gray-500">Rejected</p>
            <p className="text-2xl font-bold mt-1 text-red-600">{summary.rejected}</p>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by vendor name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('all')}>
              All
            </Button>
            <Button
              variant={statusFilter === 'pending' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('pending')}>
              Pending
            </Button>
            <Button
              variant={statusFilter === 'approved' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('approved')}>
              Approved
            </Button>
            <Button
              variant={statusFilter === 'rejected' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('rejected')}>
              Rejected
            </Button>
          </div>
        </div>
      </Card>

      {/* Withdrawals Table */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Withdrawal Requests</h2>
        {filteredWithdrawals.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No withdrawals found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Vendor</th>
                  <th className="text-left py-3 px-4">Amount</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4">Requested</th>
                  <th className="text-left py-3 px-4">Account Details</th>
                  <th className="text-left py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredWithdrawals.map((withdrawal) => (
                  <tr key={withdrawal._id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <p className="font-semibold">{withdrawal.vendorName || 'Unknown'}</p>
                      <p className="text-sm text-gray-500">{withdrawal.vendorId}</p>
                    </td>
                    <td className="py-3 px-4 font-semibold">₹{withdrawal.amount.toFixed(2)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(withdrawal.status)}
                        {getStatusBadge(withdrawal.status)}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {format(new Date(withdrawal.requestedAt), 'MMM dd, yyyy HH:mm')}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {withdrawal.accountDetails?.bankName && (
                        <div>
                          <p>{withdrawal.accountDetails.bankName}</p>
                          <p className="text-xs">***{withdrawal.accountDetails.accountNumber?.slice(-4)}</p>
                        </div>
                      )}
                      {withdrawal.accountDetails?.upiId && (
                        <p>{withdrawal.accountDetails.upiId}</p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {withdrawal.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => openActionDialog(withdrawal, 'approve')}
                            className="bg-green-600 hover:bg-green-700">
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => openActionDialog(withdrawal, 'reject')}>
                            Reject
                          </Button>
                        </div>
                      )}
                      {withdrawal.status !== 'pending' && (
                        <p className="text-sm text-gray-500">
                          {withdrawal.processedAt
                            ? format(new Date(withdrawal.processedAt), 'MMM dd, yyyy')
                            : '-'}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Approve' : 'Reject'} Withdrawal
            </DialogTitle>
            <DialogDescription>
              {selectedWithdrawal && (
                <>
                  {actionType === 'approve' 
                    ? `Approve withdrawal of ₹${selectedWithdrawal.amount.toFixed(2)} for ${selectedWithdrawal.vendorName}?`
                    : `Reject withdrawal request of ₹${selectedWithdrawal.amount.toFixed(2)}?`}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Note (Optional)</label>
              <Textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder={`Add a note for this ${actionType}...`}
                rows={3}
              />
            </div>
            {selectedWithdrawal?.requestNote && (
              <div>
                <label className="text-sm font-medium">Vendor's Note</label>
                <p className="text-sm text-gray-600 mt-1 p-2 bg-gray-50 rounded">
                  {selectedWithdrawal.requestNote}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setActionDialogOpen(false);
                setAdminNote('');
              }}>
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={processing}
              className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}>
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                `${actionType === 'approve' ? 'Approve' : 'Reject'}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

