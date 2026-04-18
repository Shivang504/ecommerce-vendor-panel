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
import { Eye } from 'lucide-react';

interface Order {
  _id: string;
  orderNumber?: string;
  createdAt?: string;
  customerName?: string;
  customerEmail?: string;
  total?: number;
  pricing?: {
    subtotal: number;
    discount: number;
    shipping: number;
    tax: number;
    total: number;
  };
  paymentStatus?: string;
  payment?: {
    paymentMethod?: string;
  };
  orderStatus?: string;
  tracking?: {
    courierName?: string;
    trackingNumber?: string;
  };
}

export function OrderList() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid' | 'cancelled' | 'processing' | 'shipped' | 'delivered'>('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const router = useRouter();

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, search, statusFilter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (search) params.append('search', search);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const res = await fetch(`/api/admin/orders?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const ordersList = Array.isArray(data.orders) ? data.orders : [];
        
        setOrders(ordersList);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      } else {
        setOrders([]);
        setTotal(0);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('[v0] Failed to fetch orders:', error);
      setOrders([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1); // Reset to first page on search
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxPagesToShow = 5;
    
    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (page <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (page >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = page - 1; i <= page + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const getStatusDisplayName = (status?: string): string => {
    const statusMap: Record<string, string> = {
      'pending': 'Order Placed',
      'processing': 'Processing',
      'packed': 'Packed',
      'ready_for_pickup': 'Ready for Pickup',
      'shipped': 'Shipped',
      'out_for_delivery': 'Out for Delivery',
      'delivered': 'Delivered',
      'completed': 'Delivered',
      'cancelled': 'Cancelled',
    };
    return statusMap[status?.toLowerCase() || ''] || (status || 'Pending');
  };

  const getStatusBadgeVariant = (status?: string) => {
    switch ((status || '').toLowerCase()) {
      case 'paid':
      case 'completed':
      case 'delivered':
        return 'default';
      case 'cancelled':
      case 'failed':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-3xl font-bold'>Orders</h1>
      </div>

      <Card className='p-6 shadow-md border border-gray-200 overflow-hidden'>
        <div className='flex flex-row gap-3 mb-4 items-center justify-between'>
          <div className='flex flex-row  gap-3'>
            <Input
              placeholder='Search by order number or customer...'
              value={search}
              onChange={e => handleSearchChange(e.target.value)}
              className='max-w-xs'
            />
            <Select value={statusFilter} onValueChange={v => setStatusFilter(v as any)}>
              <SelectTrigger className='w-40'>
                <SelectValue placeholder='Status' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All Orders</SelectItem>
                <SelectItem value='pending'>Pending Payment</SelectItem>
                <SelectItem value='paid'>Paid</SelectItem>
                <SelectItem value='processing'>Processing</SelectItem>
                <SelectItem value='shipped'>Shipped</SelectItem>
                <SelectItem value='delivered'>Delivered</SelectItem>
                <SelectItem value='cancelled'>Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Placeholder date filters for future */}
          {/* <div className='flex gap-2'>
            <Input type='date' className='w-40' />
            <Input type='date' className='w-40' />
          </div> */}
        </div>

        <div className='overflow-x-auto'>
          <Table>
            <TableHeader>
              <TableRow className='bg-gray-50 border-b border-gray-200 hover:bg-gray-50'>
                <TableHead className='font-semibold text-gray-700 py-4'>Order Number</TableHead>
                <TableHead className='font-semibold text-gray-700 py-4'>Order Date</TableHead>
                <TableHead className='font-semibold text-gray-700 py-4'>Customer</TableHead>
                <TableHead className='font-semibold text-gray-700 py-4'>Total Amount</TableHead>
                <TableHead className='font-semibold text-gray-700 py-4'>Order Status</TableHead>
                <TableHead className='font-semibold text-gray-700 py-4'>Payment Status</TableHead>
                <TableHead className='font-semibold text-gray-700 py-4'>Payment Mode</TableHead>
                <TableHead className='font-semibold text-gray-700 py-4 text-right'>Action</TableHead>
              </TableRow>
            </TableHeader>
            <DataTableBody
              loading={loading}
              data={orders}
              columns={8}
              loadingText='Loading orders...'
              emptyText='No orders found'>
              {orders.map(order => (
                  <TableRow
                    key={order._id}
                    className='border-b border-gray-200 hover:bg-green-50 transition-colors duration-150'>
                    <TableCell className='font-semibold text-gray-900 py-4'>
                      {order.orderNumber || `#${order._id.slice(-6)}`}
                    </TableCell>
                    <TableCell className='text-gray-600 py-4'>
                      {order.createdAt ? formatIndianDate(order.createdAt) : '-'}
                    </TableCell>
                    <TableCell className='text-gray-600 py-4'>
                      <div>
                        <div className='font-medium'>{order.customerName || '-'}</div>
                        {order.customerEmail && (
                          <div className='text-xs text-gray-500'>{order.customerEmail}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className='text-gray-900 py-4'>
                      {order.pricing?.total 
                        ? `₹${order.pricing.total.toFixed(2)}`
                        : typeof order.total === 'number' 
                        ? `₹${order.total.toFixed(2)}` 
                        : '-'}
                    </TableCell>
                    <TableCell className='py-4'>
                      {(() => {
                        const status = order.orderStatus?.toLowerCase() || '';
                        const displayStatus = getStatusDisplayName(order.orderStatus);
                        const variant = getStatusBadgeVariant(order.orderStatus);
                        
                        return (
                          <Badge variant={variant} className='px-3'>
                            {displayStatus}
                          </Badge>
                        );
                      })()}
                    </TableCell>
                    <TableCell className='py-4'>
                      <Badge variant={getStatusBadgeVariant(order.paymentStatus)} className='px-3'>
                        {(order.paymentStatus || 'Pending').toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className='text-gray-600 py-4 text-sm'>
                      {order.payment?.paymentMethod 
                        ? order.payment.paymentMethod.toUpperCase().replace('_', ' ')
                        : '-'}
                    </TableCell>
                    <TableCell className='py-4 text-right'>
                      <button
                        onClick={() => router.push(`/admin/orders/${order._id}`)}
                        className='text-gray-600 hover:text-gray-900 hover:bg-gray-100 p-2 rounded transition'>
                        <Eye className='h-5 w-5' />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
            </DataTableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className='px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50'>
            <div className='flex items-center gap-2'>
              <span className='text-sm text-gray-600'>
                Showing <span className='font-medium'>{(page - 1) * limit + 1}</span> to{' '}
                <span className='font-medium'>{Math.min(page * limit, total)}</span> of{' '}
                <span className='font-medium'>{total}</span> orders
              </span>
            </div>
            <div className='flex items-center gap-2'>
              <span className='text-sm text-gray-600'>Items per page:</span>
              <select
                value={limit}
                onChange={e => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className='border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-web'>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div className='flex items-center gap-1'>
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className='px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 text-sm font-medium'>
                First
              </button>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className='px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 text-sm font-medium'>
                Previous
              </button>
              {getPageNumbers().map((pageNum, index) => (
                <button
                  key={index}
                  onClick={() => typeof pageNum === 'number' && setPage(pageNum)}
                  disabled={typeof pageNum === 'string' || pageNum === page}
                  className={`px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium min-w-[40px] ${
                    pageNum === page
                      ? 'bg-web text-white border-web'
                      : typeof pageNum === 'string'
                      ? 'cursor-default border-transparent'
                      : 'hover:bg-gray-100 disabled:opacity-50'
                  }`}>
                  {pageNum}
                </button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className='px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 text-sm font-medium'>
                Next
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className='px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 text-sm font-medium'>
                Last
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}


