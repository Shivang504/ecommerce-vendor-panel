'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatIndianDate } from '@/app/utils/helper';
import { DataTableBody } from '@/components/ui/data-table-body';
import { Eye, Search, Download } from 'lucide-react';

interface Payment {
  _id: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName?: string;
  customerEmail?: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  paymentStatus: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  transactionId?: string;
  paidAt?: string;
  failedAt?: string;
  refundedAt?: string;
  refundAmount?: number;
  createdAt: string;
  updatedAt: string;
}

export function PaymentList() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'failed' | 'refunded' | 'processing'>('all');
  const [methodFilter, setMethodFilter] = useState<'all' | 'razorpay' | 'cod' | 'stripe' | 'paypal'>('all');
  const router = useRouter();

  useEffect(() => {
    fetchPayments();
  }, [search, statusFilter, methodFilter]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (methodFilter !== 'all') params.append('method', methodFilter);

      const res = await fetch(`/api/admin/payments?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPayments(Array.isArray(data.payments) ? data.payments : []);
      } else {
        setPayments([]);
      }
    } catch (error) {
      console.error('[PaymentList] Failed to fetch payments:', error);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeVariant = (status?: string) => {
    switch ((status || '').toLowerCase()) {
      case 'paid':
        return 'default';
      case 'pending':
      case 'processing':
        return 'secondary';
      case 'failed':
      case 'cancelled':
        return 'destructive';
      case 'refunded':
      case 'partially_refunded':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getMethodBadge = (method?: string) => {
    const methodName = (method || '').toUpperCase().replace('_', ' ');
    return methodName || 'N/A';
  };

  const totalAmount = payments.reduce((sum, p) => {
    if (p.paymentStatus === 'paid') {
      return sum + (p.amount || 0);
    }
    return sum;
  }, 0);

  const paidCount = payments.filter(p => p.paymentStatus === 'paid').length;
  const pendingCount = payments.filter(p => p.paymentStatus === 'pending' || p.paymentStatus === 'processing').length;
  const failedCount = payments.filter(p => p.paymentStatus === 'failed').length;

  return (
    <div className='space-y-6'>
      {/* Stats Cards */}
      <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
        <Card className='p-4'>
          <div className='text-sm text-gray-600'>Total Revenue</div>
          <div className='text-2xl font-bold text-gray-900 mt-1'>₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </Card>
        <Card className='p-4'>
          <div className='text-sm text-gray-600'>Paid Payments</div>
          <div className='text-2xl font-bold text-green-600 mt-1'>{paidCount}</div>
        </Card>
        <Card className='p-4'>
          <div className='text-sm text-gray-600'>Pending</div>
          <div className='text-2xl font-bold text-yellow-600 mt-1'>{pendingCount}</div>
        </Card>
        <Card className='p-4'>
          <div className='text-sm text-gray-600'>Failed</div>
          <div className='text-2xl font-bold text-red-600 mt-1'>{failedCount}</div>
        </Card>
      </div>

      <Card>
        <div className='p-6'>
          <div className='flex flex-col sm:flex-row gap-4 mb-6'>
            <div className='flex-1 relative'>
              <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5' />
              <Input
                placeholder='Search by order number, payment ID, customer...'
                value={search}
                onChange={e => setSearch(e.target.value)}
                className='pl-10'
              />
            </div>
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger className='w-full sm:w-[180px]'>
                <SelectValue placeholder='Payment Status' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All Status</SelectItem>
                <SelectItem value='paid'>Paid</SelectItem>
                <SelectItem value='pending'>Pending</SelectItem>
                <SelectItem value='processing'>Processing</SelectItem>
                <SelectItem value='failed'>Failed</SelectItem>
                <SelectItem value='refunded'>Refunded</SelectItem>
              </SelectContent>
            </Select>
            <Select value={methodFilter} onValueChange={(value: any) => setMethodFilter(value)}>
              <SelectTrigger className='w-full sm:w-[180px]'>
                <SelectValue placeholder='Payment Method' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All Methods</SelectItem>
                <SelectItem value='razorpay'>Razorpay</SelectItem>
                <SelectItem value='cod'>Cash on Delivery</SelectItem>
                <SelectItem value='stripe'>Stripe</SelectItem>
                <SelectItem value='paypal'>PayPal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className='text-right'>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <DataTableBody
              loading={loading}
              data={payments}
              columns={8}
              loadingText='Loading payments...'
              emptyText='No payments found'>
              {payments.map(payment => (
                <TableRow key={payment._id} className='hover:bg-gray-50'>
                  <TableCell className='font-medium'>{payment.orderNumber || 'N/A'}</TableCell>
                  <TableCell>
                    <div>
                      <p className='font-semibold text-gray-900'>{payment.customerName || 'N/A'}</p>
                      <p className='text-xs text-gray-500'>{payment.customerEmail || ''}</p>
                    </div>
                  </TableCell>
                  <TableCell className='font-semibold'>
                    ₹{payment.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    {payment.refundAmount && payment.refundAmount > 0 && (
                      <div className='text-xs text-red-600'>
                        Refunded: ₹{payment.refundAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className='text-gray-600 text-sm'>
                    {getMethodBadge(payment.paymentMethod)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(payment.paymentStatus)} className='px-3'>
                      {(payment.paymentStatus || 'Pending').toUpperCase().replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className='text-xs text-gray-500 font-mono'>
                    {payment.razorpayPaymentId || payment.transactionId || 'N/A'}
                  </TableCell>
                  <TableCell className='text-sm text-gray-600'>
                    {payment.paidAt 
                      ? formatIndianDate(payment.paidAt)
                      : payment.createdAt 
                        ? formatIndianDate(payment.createdAt)
                        : 'N/A'}
                  </TableCell>
                  <TableCell className='text-right'>
                    <button
                      onClick={() => router.push(`/admin/orders/${payment.orderId}`)}
                      className='text-gray-600 hover:text-gray-900 hover:bg-gray-100 p-2 rounded transition'>
                      <Eye className='h-5 w-5' />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </DataTableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

