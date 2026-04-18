'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  ArrowUpCircle,
  ArrowDownCircle,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';

interface WalletData {
  walletBalance: number;
  totalEarnings: number;
  totalWithdrawn: number;
  pendingWithdrawals: number;
  availableBalance: number;
  recentWithdrawals: Array<{
    _id: string;
    amount: number;
    status: 'pending' | 'approved' | 'rejected';
    requestedAt: string;
    processedAt?: string;
    adminNote?: string;
  }>;
}

export function WalletPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [requestNote, setRequestNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isVendor, setIsVendor] = useState(false);

  useEffect(() => {
    // Check if user is vendor
    const adminUserStr = localStorage.getItem('adminUser');
    if (adminUserStr) {
      try {
        const adminUser = JSON.parse(adminUserStr);
        if (adminUser?.role === 'vendor') {
          setIsVendor(true);
          fetchWalletData();
        } else {
          // Not a vendor, show error and redirect
          toast({
            title: 'Access Denied',
            description: 'Wallet is only available for vendors',
            variant: 'destructive',
          });
          setTimeout(() => {
            router.push('/admin');
          }, 1500);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error parsing adminUser:', error);
        setTimeout(() => {
          router.push('/admin');
        }, 1500);
        setLoading(false);
      }
    } else {
      setTimeout(() => {
        router.push('/admin');
      }, 1500);
      setLoading(false);
    }
  }, [router, toast]);

  const fetchWalletData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/vendors/wallet', {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setWalletData({
          ...data.wallet,
          recentWithdrawals: data.wallet?.recentWithdrawals || data.recentWithdrawals || [],
        });
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to fetch wallet data',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching wallet:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch wallet data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid withdrawal amount',
        variant: 'destructive',
      });
      return;
    }

    if (!walletData) return;

    const amount = parseFloat(withdrawAmount);
    if (amount > walletData.availableBalance) {
      toast({
        title: 'Insufficient Balance',
        description: `Available balance: ₹${walletData.availableBalance.toFixed(2)}`,
        variant: 'destructive',
      });
      return;
    }

    if (amount < 100) {
      toast({
        title: 'Minimum Amount',
        description: 'Minimum withdrawal amount is ₹100',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/vendors/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        credentials: 'include',
        body: JSON.stringify({
          amount,
          requestNote: requestNote.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Withdrawal request submitted successfully',
        });
        setWithdrawDialogOpen(false);
        setWithdrawAmount('');
        setRequestNote('');
        fetchWalletData(); // Refresh wallet data
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to submit withdrawal request',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error submitting withdrawal:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit withdrawal request',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

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

  // Show loading or access denied for non-vendors
  if (!isVendor) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-700">Access Denied</p>
          <p className="text-gray-500 mt-2">Wallet is only available for vendors</p>
          <p className="text-sm text-gray-400 mt-1">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!walletData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Failed to load wallet data</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Wallet</h1>
          <p className="text-gray-500 mt-1">Manage your earnings and withdrawals</p>
        </div>
        <Button
          onClick={() => setWithdrawDialogOpen(true)}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
          disabled={walletData.availableBalance < 100}>
          <ArrowUpCircle className="w-5 h-5" />
          Request Withdrawal
        </Button>
      </div>

      {/* Wallet Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Available Balance</p>
              <p className="text-2xl font-bold mt-1">₹{walletData.availableBalance.toFixed(2)}</p>
            </div>
            <Wallet className="w-10 h-10 text-green-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Earnings</p>
              <p className="text-2xl font-bold mt-1">₹{walletData.totalEarnings.toFixed(2)}</p>
            </div>
            <TrendingUp className="w-10 h-10 text-blue-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Withdrawn</p>
              <p className="text-2xl font-bold mt-1">₹{walletData.totalWithdrawn.toFixed(2)}</p>
            </div>
            <ArrowDownCircle className="w-10 h-10 text-purple-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending Withdrawals</p>
              <p className="text-2xl font-bold mt-1">₹{walletData.pendingWithdrawals.toFixed(2)}</p>
            </div>
            <Clock className="w-10 h-10 text-yellow-600" />
          </div>
        </Card>
      </div>

      {/* Recent Withdrawals */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Recent Withdrawals</h2>
        {!walletData.recentWithdrawals || walletData.recentWithdrawals.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No withdrawals yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Amount</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4">Requested</th>
                  <th className="text-left py-3 px-4">Processed</th>
                  <th className="text-left py-3 px-4">Notes</th>
                </tr>
              </thead>
              <tbody>
                {walletData.recentWithdrawals.map((withdrawal) => (
                  <tr key={withdrawal._id} className="border-b hover:bg-gray-50">
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
                      {withdrawal.processedAt
                        ? format(new Date(withdrawal.processedAt), 'MMM dd, yyyy HH:mm')
                        : '-'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {withdrawal.adminNote || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Withdrawal Dialog */}
      <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Withdrawal</DialogTitle>
            <DialogDescription>
              Enter the amount you want to withdraw from your wallet
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="amount">Amount (₹)</Label>
              <Input
                id="amount"
                type="number"
                min="100"
                max={walletData.availableBalance}
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="Enter amount"
              />
              <p className="text-sm text-gray-500 mt-1">
                Available: ₹{walletData.availableBalance.toFixed(2)} | Minimum: ₹100
              </p>
            </div>
            <div>
              <Label htmlFor="note">Note (Optional)</Label>
              <Textarea
                id="note"
                value={requestNote}
                onChange={(e) => setRequestNote(e.target.value)}
                placeholder="Add any additional notes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setWithdrawDialogOpen(false);
                setWithdrawAmount('');
                setRequestNote('');
              }}>
              Cancel
            </Button>
            <Button onClick={handleWithdraw} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Request'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

