'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/layout/admin-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Package, CreditCard, Truck, MapPin, User, Calendar, Tag, Download } from 'lucide-react';
import { formatIndianDate } from '@/app/utils/helper';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface Order {
  _id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: Array<{
    productId: string;
    productName: string;
    productImage?: string;
    quantity: number;
    price: number;
    total: number;
    variant?: any;
  }>;
  shippingAddress: any;
  billingAddress: any;
  pricing: {
    subtotal: number;
    discount: number;
    shipping: number;
    tax: number;
    total: number;
  };
  coupon?: {
    code: string;
    discountAmount: number;
  };
  payment: {
    paymentMethod: string;
    actualPaymentMethod?: string;
    razorpayOrderId?: string;
    transactionId?: string;
  };
  paymentStatus: string;
  orderStatus: string;
  tracking?: {
    courierName?: string;
    trackingNumber?: string;
    estimatedDelivery?: string;
    shippedAt?: string;
    deliveredAt?: string;
    shiprocketShipmentId?: number;
    labelPdfUrl?: string;
    labelGeneratedAt?: string | Date;
  };
  notes?: string;
  adminNotes?: string;
  returnReason?: string;
  returnType?: 'refund' | 'replacement';
  pickupScheduledDate?: string | Date;
  pickupScheduledTime?: string;
  readyForPickupAt?: string | Date;
  createdAt: string;
  updatedAt: string;
}

// Forward-only order status flow
const ORDER_STATUS_FLOW = [
  'pending',           // Order Placed
  'processing',        // Processing
  'packed',            // Packed
  'ready_for_pickup',  // Ready for Pickup
  'shipped',           // Shipped
  'out_for_delivery',  // Out for Delivery
  'delivered'          // Delivered
] as const;

// Get status display name
const getStatusDisplayName = (status: string): string => {
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
  return statusMap[status] || status;
};

// Get next available statuses (forward-only)
const getNextAvailableStatuses = (currentStatus: string): Array<{ value: string; label: string }> => {
  const normalizedStatus = currentStatus.toLowerCase();
  
  // If current status is cancelled or delivered, return empty array (no next statuses)
  if (normalizedStatus === 'cancelled' || normalizedStatus === 'delivered' || normalizedStatus === 'completed') {
    return [];
  }
  
  const currentIndex = ORDER_STATUS_FLOW.findIndex(status => status === normalizedStatus);
  
  // If current status is not in the flow, return empty array
  if (currentIndex === -1) {
    return [];
  }
  
  // Return all statuses after the current one
  return ORDER_STATUS_FLOW.slice(currentIndex + 1).map(status => ({
    value: status,
    label: getStatusDisplayName(status),
  }));
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [payment, setPayment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showTrackingDialog, setShowTrackingDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionType, setRejectionType] = useState<'cancel' | 'return'>('cancel');
  const [showItemApprovalDialog, setShowItemApprovalDialog] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);
  const [itemActionType, setItemActionType] = useState<'approve_return' | 'complete_pickup' | 'reject_return' | null>(null);
  const [pickupDate, setPickupDate] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [pickupTracking, setPickupTracking] = useState('');

  const [orderStatus, setOrderStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  const [trackingInfo, setTrackingInfo] = useState({
    courierName: '',
    trackingNumber: '',
    estimatedDelivery: '',
  });

  useEffect(() => {
    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setOrder(data.order);
        setOrderStatus(data.order.orderStatus);
        setPaymentStatus(data.order.paymentStatus);
        setAdminNotes(data.order.adminNotes || '');
        if (data.order.tracking) {
          setTrackingInfo({
            courierName: data.order.tracking.courierName || '',
            trackingNumber: data.order.tracking.trackingNumber || '',
            estimatedDelivery: data.order.tracking.estimatedDelivery || '',
          });
        }
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load order',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      toast({
        title: 'Error',
        description: 'Failed to load order',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    // Prevent status updates for cancelled orders
    if (order?.orderStatus === 'cancelled') {
      toast({
        title: 'Error',
        description: 'Cannot update status for cancelled orders',
        variant: 'destructive',
      });
      return;
    }

    // Prevent status updates for delivered orders
    if (['delivered', 'completed'].includes(order?.orderStatus?.toLowerCase() || '')) {
      toast({
        title: 'Error',
        description: 'Cannot update status for delivered orders',
        variant: 'destructive',
      });
      return;
    }

    // Handle cancelled status separately (special case)
    if (orderStatus === 'cancelled') {
      // Allow cancelling orders that are not already cancelled or delivered
      if (order?.orderStatus === 'cancelled') {
        toast({
          title: 'Error',
          description: 'Order is already cancelled',
          variant: 'destructive',
        });
        return;
      }
      if (['delivered', 'completed'].includes(order?.orderStatus?.toLowerCase() || '')) {
        toast({
          title: 'Error',
          description: 'Cannot cancel a delivered order',
          variant: 'destructive',
        });
        return;
      }
      // Proceed with cancellation
    } else {
      // Validate forward-only status flow for other statuses
    if (order) {
      const currentIndex = ORDER_STATUS_FLOW.findIndex(status => status === order.orderStatus?.toLowerCase());
      const newIndex = ORDER_STATUS_FLOW.findIndex(status => status === orderStatus?.toLowerCase());
      
      // Check if new status is in the forward flow
      if (newIndex === -1) {
        toast({
          title: 'Error',
          description: 'Invalid status selected. Only forward status progression is allowed.',
          variant: 'destructive',
        });
        return;
      }
      
      // Check if new status is not backward
      if (currentIndex !== -1 && newIndex <= currentIndex) {
        toast({
          title: 'Error',
          description: 'Cannot move backward in order status. Only forward progression is allowed.',
          variant: 'destructive',
        });
        return;
        }
      }
    }

    if (!orderStatus) {
      toast({
        title: 'Error',
        description: 'Please select a status',
        variant: 'destructive',
      });
      return;
    }

    try {
      setUpdating(true);
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        credentials: 'include',
        body: JSON.stringify({
          orderStatus,
          adminNotes,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Order status updated successfully',
          variant: 'success',
        });
        setShowStatusDialog(false);
        fetchOrder();
      } else {
        const data = await response.json();
        toast({
          title: 'Error',
          description: data.error || 'Failed to update status',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdatePayment = async () => {
    // For cancelled orders: prevent all payment status updates (use Initiate Refund button instead)
    if (order?.orderStatus === 'cancelled') {
      toast({
        title: 'Error',
        description: 'Cannot update payment status for cancelled orders. Use "Initiate Refund" button instead.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setUpdating(true);
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        credentials: 'include',
        body: JSON.stringify({
          paymentStatus,
          adminNotes,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Payment status updated successfully',
          variant: 'success',
        });
        setShowPaymentDialog(false);
        fetchOrder();
      } else {
        const data = await response.json();
        toast({
          title: 'Error',
          description: data.error || 'Failed to update payment status',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update payment status',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateTracking = async () => {
    try {
      setUpdating(true);
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        credentials: 'include',
        body: JSON.stringify({
          tracking: trackingInfo,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Tracking information updated successfully',
          variant: 'success',
        });
        setShowTrackingDialog(false);
        fetchOrder();
      } else {
        const data = await response.json();
        toast({
          title: 'Error',
          description: data.error || 'Failed to update tracking',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update tracking',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };


  const handleApproveReturn = async () => {
    try {
      setUpdating(true);
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'approve_return',
          adminNotes: adminNotes,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Return approved successfully',
          variant: 'success',
        });
        fetchOrder();
      } else {
        const data = await response.json();
        toast({
          title: 'Error',
          description: data.error || 'Failed to approve return',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to approve return',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleRejectRequest = async () => {
    if (!rejectionReason.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a rejection reason',
        variant: 'destructive',
      });
      return;
    }

    try {
      setUpdating(true);
      const token = localStorage.getItem('adminToken');
      // Only handle return rejections now (cancellations are direct)
      const action = 'reject_return';
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        credentials: 'include',
        body: JSON.stringify({
          action,
          rejectionReason: rejectionReason,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Request rejected successfully',
          variant: 'success',
        });
        setShowRejectDialog(false);
        setRejectionReason('');
        fetchOrder();
      } else {
        const data = await response.json();
        toast({
          title: 'Error',
          description: data.error || 'Failed to reject request',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reject request',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleItemAction = async () => {
    if (selectedItemIndex === null || !itemActionType) {
      return;
    }

    try {
      setUpdating(true);
      let action = '';
      let body: any = { itemIndex: selectedItemIndex };

      // Item-level cancellations are now direct - no approval needed
      if (itemActionType === 'approve_return') {
        if (!pickupDate || !pickupTime) {
          toast({
            title: 'Error',
            description: 'Please provide pickup date and time',
            variant: 'destructive',
          });
          setUpdating(false);
          return;
        }
        action = 'approve_return';
        body.pickupDate = pickupDate;
        body.pickupTime = pickupTime;
      } else if (itemActionType === 'complete_pickup') {
        action = 'complete_pickup';
        if (pickupTracking) {
          body.trackingNumber = pickupTracking;
        }
      }

      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/admin/orders/${orderId}/items`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        credentials: 'include',
        body: JSON.stringify({ action, ...body }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Item request processed successfully',
          variant: 'success',
        });
        setShowItemApprovalDialog(false);
        setSelectedItemIndex(null);
        setItemActionType(null);
        setPickupDate('');
        setPickupTime('');
        setPickupTracking('');
        fetchOrder();
      } else {
        const data = await response.json();
        toast({
          title: 'Error',
          description: data.error || 'Failed to process item request',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to process item request',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleItemRejection = async (action: string) => {
    if (selectedItemIndex === null || !rejectionReason.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a rejection reason',
        variant: 'destructive',
      });
      return;
    }

    try {
      setUpdating(true);
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/admin/orders/${orderId}/items`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        credentials: 'include',
        body: JSON.stringify({
          itemIndex: selectedItemIndex,
          action,
          rejectionReason: rejectionReason,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Item request rejected successfully',
          variant: 'success',
        });
        setShowRejectDialog(false);
        setSelectedItemIndex(null);
        setItemActionType(null);
        setRejectionReason('');
        fetchOrder();
      } else {
        const data = await response.json();
        toast({
          title: 'Error',
          description: data.error || 'Failed to reject item request',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reject item request',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'delivered':
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
      case 'failed':
      case 'refunded':
        return 'bg-red-100 text-red-800';
      case 'processing':
      case 'packed':
      case 'shipped':
        return 'bg-blue-100 text-blue-800';
      case 'cancellation_requested':
      case 'return_requested':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className='flex items-center justify-center min-h-screen'>
          <Loader2 className='w-8 h-8 animate-spin' />
        </div>
      </AdminLayout>
    );
  }

  if (!order) {
    return (
      <AdminLayout>
        <div className='flex items-center justify-center min-h-screen'>
          <p>Order not found</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className='space-y-6 p-6'>
        {/* Header */}
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-4'>
            <Button variant='outline' size='icon' onClick={() => router.push('/admin/orders')}>
              <ArrowLeft className='h-4 w-4' />
            </Button>
            <div>
              <h1 className='text-3xl font-bold'>Order Details</h1>
              <p className='text-gray-500'>Order #{order.orderNumber}</p>
            </div>
          </div>
          <div className='flex gap-2 flex-wrap'>
            {/* Cancellations are now direct - no approval needed */}
            {order.orderStatus === 'return_requested' && (
              <>
                <Button 
                  onClick={handleApproveReturn} 
                  disabled={updating}
                  className='gap-2 bg-green-600 hover:bg-green-700'
                >
                  {updating ? <Loader2 className='h-4 w-4 animate-spin' /> : '✓ Approve Return'}
                </Button>
                <Button 
                  onClick={() => {
                    setRejectionType('return');
                    setShowRejectDialog(true);
                  }} 
                  disabled={updating}
                  variant='destructive'
                  className='gap-2'
                >
                  ✗ Reject Return
                </Button>
              </>
            )}
            {/* For cancelled orders: restrict modifications based on payment method */}
            {(order.orderStatus?.toLowerCase() === 'cancelled' || order.orderStatus?.toLowerCase() === 'cancellation_requested') ? (
              <>
                {/* COD cancelled orders: no modifications allowed */}
                {order.payment?.paymentMethod === 'cod' && (
                  <div className='text-sm text-gray-600 italic'>
                    This COD order has been cancelled. No modifications are allowed.
                  </div>
                )}
                {/* Paid cancelled orders: only allow refund initiation */}
                {order.paymentStatus === 'paid' && (
                  <Button 
                    onClick={async () => {
                      try {
                        setUpdating(true);
                        const token = localStorage.getItem('adminToken');
                        const response = await fetch(`/api/admin/orders/${orderId}`, {
                          method: 'PUT',
                          headers: { 
                            'Content-Type': 'application/json',
                            ...(token && { Authorization: `Bearer ${token}` }),
                          },
                          credentials: 'include',
                          body: JSON.stringify({
                            paymentStatus: 'refunded',
                            adminNotes: adminNotes || 'Refund initiated for cancelled order.',
                          }),
                        });

                        if (response.ok) {
                          toast({
                            title: 'Success',
                            description: 'Refund initiated successfully',
                            variant: 'success',
                          });
                          fetchOrder();
                        } else {
                          const data = await response.json();
                          toast({
                            title: 'Error',
                            description: data.error || 'Failed to initiate refund',
                            variant: 'destructive',
                          });
                        }
                      } catch (error) {
                        toast({
                          title: 'Error',
                          description: 'Failed to initiate refund',
                          variant: 'destructive',
                        });
                      } finally {
                        setUpdating(false);
                      }
                    }}
                    disabled={updating}
                    className='gap-2 bg-blue-600 hover:bg-blue-700'
                    title='Initiate refund process for this cancelled order'
                  >
                    {updating ? <Loader2 className='h-4 w-4 animate-spin' /> : '✓ Initiate Refund'}
                  </Button>
                )}
                {/* Already refunded: show status */}
                {order.paymentStatus === 'refunded' && (
                  <div className='text-sm text-green-600 font-medium'>
                    ✓ Refund Processed
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Hide Status and Tracking buttons if order is cancelled, cancellation requested, or delivered */}
                {order.orderStatus?.toLowerCase() !== 'cancelled' && 
                 order.orderStatus?.toLowerCase() !== 'cancellation_requested' &&
                 !['delivered', 'completed'].includes(order.orderStatus?.toLowerCase() || '') && (
                  <>
                    <Button 
                      onClick={() => {
                        setOrderStatus('');
                        setAdminNotes('');
                        setShowStatusDialog(true);
                      }} 
                      variant='outline' 
                      className='gap-2'
                    >
                      <Package className='h-4 w-4' />
                      Update Status
                    </Button>
                    <Button onClick={() => setShowTrackingDialog(true)} variant='outline' className='gap-2'>
                      <Truck className='h-4 w-4' />
                      Update Tracking
                    </Button>
                  </>
                )}
                {/* Payment button - only hide for cancelled (not cancellation_requested or delivered) */}
                {order.orderStatus?.toLowerCase() !== 'cancelled' && (
                  <Button onClick={() => setShowPaymentDialog(true)} variant='outline' className='gap-2'>
                    <CreditCard className='h-4 w-4' />
                    Update Payment
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Pending Request Alert */}
        {(order.orderStatus === 'cancellation_requested' || order.orderStatus === 'return_requested') && (
          <Card className='p-6 border-yellow-300 bg-yellow-50'>
            <div className='flex items-start gap-4'>
              <div className='flex-1'>
                <h3 className='font-bold text-yellow-800 mb-2'>
                  {order.orderStatus === 'cancellation_requested' ? 'Cancellation Request Pending' : 'Return Request Pending'}
                </h3>
                {order.adminNotes && (
                  <p className='text-sm text-yellow-700 mb-2'>
                    <strong>Reason:</strong> {order.adminNotes}
                  </p>
                )}
                {order.returnReason && (
                  <p className='text-sm text-yellow-700 mb-2'>
                    <strong>Return Reason:</strong> {order.returnReason}
                  </p>
                )}
                {order.returnType && (
                  <p className='text-sm text-yellow-700 mb-2'>
                    <strong>Return Type:</strong> {order.returnType === 'refund' ? 'Refund' : 'Replacement'}
                  </p>
                )}
                <p className='text-xs text-yellow-600'>
                  Please review and approve or reject this request.
                </p>
              </div>
            </div>
          </Card>
        )}

        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
          {/* Main Content */}
          <div className='lg:col-span-2 space-y-6'>
            {/* Order Items */}
            <Card className='p-6'>
              <h2 className='text-xl font-bold mb-4'>Order Items</h2>
              <div className='space-y-4'>
                {order.items.map((item: any, idx: number) => {
                  const itemStatus = item.itemStatus || 'ordered';
                  const cancelReturnInfo = item.cancelReturnInfo;
                  // Item-level cancellations are now direct - no approval needed
                  const hasReturnRequest = itemStatus === 'return_requested';
                  
                  return (
                    <div key={idx} className='border-b pb-4 last:border-b-0'>
                      <div className='flex gap-4'>
                        {item.productImage && <img src={item.productImage} alt={item.productName} className='w-20 h-20 object-cover rounded' />}
                        <div className='flex-1'>
                          <h3 className='font-semibold'>{item.productName}</h3>
                          <p className='text-sm text-gray-500'>Quantity: {item.quantity}</p>
                          <p className='text-sm text-gray-500'>Price: ₹{item.price.toFixed(2)}</p>
                          <Badge className={`mt-2 ${getStatusColor(itemStatus)}`}>
                            {itemStatus.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </div>
                        <div className='text-right'>
                          <p className='font-semibold'>₹{item.total.toFixed(2)}</p>
                        </div>
                      </div>
                      
                      {/* Item Return Request Info (cancellations are now direct) */}
                      {hasReturnRequest && (
                        <div className='mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg'>
                          <div className='flex items-start justify-between mb-3'>
                            <div>
                              <p className='font-semibold text-blue-800 mb-1'>Return Request Pending</p>
                              {cancelReturnInfo?.reason && (
                                <p className='text-sm text-blue-700'>Reason: {cancelReturnInfo.reason}</p>
                              )}
                              {cancelReturnInfo?.returnType && (
                                <p className='text-sm text-blue-700'>Type: {cancelReturnInfo.returnType === 'refund' ? 'Refund' : 'Replacement'}</p>
                              )}
                            </div>
                            <div className='flex gap-2'>
                              {cancelReturnInfo?.status === 'pickup_scheduled' ? (
                                <Button
                                  size='sm'
                                  onClick={() => {
                                    setSelectedItemIndex(idx);
                                    setItemActionType('complete_pickup');
                                    setShowItemApprovalDialog(true);
                                  }}
                                  className='bg-green-600 hover:bg-green-700'
                                  disabled={updating}
                                >
                                  {updating ? <Loader2 className='w-4 h-4 animate-spin' /> : 'Mark Pickup Complete'}
                                </Button>
                              ) : (
                                <>
                                  <Button
                                    size='sm'
                                    onClick={() => {
                                      setSelectedItemIndex(idx);
                                      setItemActionType('approve_return');
                                      setShowItemApprovalDialog(true);
                                    }}
                                    className='bg-green-600 hover:bg-green-700'
                                    disabled={updating}
                                  >
                                    {updating ? <Loader2 className='w-4 h-4 animate-spin' /> : 'Approve & Schedule Pickup'}
                                  </Button>
                                  <Button
                                    size='sm'
                                    variant='destructive'
                                    onClick={() => {
                                      setSelectedItemIndex(idx);
                                      setItemActionType('reject_return');
                                      setRejectionType('return');
                                      setShowRejectDialog(true);
                                    }}
                                  >
                                    Reject
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                          {cancelReturnInfo?.status === 'pickup_scheduled' && (
                            <div className='mt-3 p-3 bg-white rounded border border-blue-300'>
                              <p className='text-sm font-semibold text-blue-900 mb-1'>Pickup Scheduled</p>
                              <p className='text-xs text-blue-700'>
                                Date: {cancelReturnInfo.pickupScheduledDate ? new Date(cancelReturnInfo.pickupScheduledDate).toLocaleDateString('en-IN') : 'N/A'}
                              </p>
                              <p className='text-xs text-blue-700'>
                                Time: {cancelReturnInfo.pickupScheduledTime || 'N/A'}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Addresses */}
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <Card className='p-6'>
                <h2 className='text-xl font-bold mb-4 flex items-center gap-2'>
                  <MapPin className='h-5 w-5' />
                  Shipping Address
                </h2>
                <div className='text-sm space-y-1'>
                  <p className='font-semibold'>{order.shippingAddress.name}</p>
                  <p>{order.shippingAddress.street}</p>
                  <p>
                    {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
                  </p>
                  <p>{order.shippingAddress.country}</p>
                  <p>Phone: {order.shippingAddress.phone}</p>
                  <p>Email: {order.shippingAddress.email}</p>
                </div>
              </Card>

              <Card className='p-6'>
                <h2 className='text-xl font-bold mb-4 flex items-center gap-2'>
                  <MapPin className='h-5 w-5' />
                  Billing Address
                </h2>
                <div className='text-sm space-y-1'>
                  <p className='font-semibold'>{order.billingAddress.name}</p>
                  <p>{order.billingAddress.street}</p>
                  <p>
                    {order.billingAddress.city}, {order.billingAddress.state} {order.billingAddress.postalCode}
                  </p>
                  <p>{order.billingAddress.country}</p>
                  <p>Phone: {order.billingAddress.phone}</p>
                  <p>Email: {order.billingAddress.email}</p>
                </div>
              </Card>
            </div>
          </div>

          {/* Sidebar */}
          <div className='space-y-6'>
            {/* Order Summary */}
            <Card className='p-6'>
              <h2 className='text-xl font-bold mb-4'>Order Summary</h2>
              <div className='space-y-3'>
                <div className='flex justify-between'>
                  <span>Subtotal</span>
                  <span>₹{order.pricing.subtotal.toFixed(2)}</span>
                </div>
                {order.coupon && (
                  <div className='flex justify-between text-green-600'>
                    <span className='flex items-center gap-1'>
                      <Tag className='h-4 w-4' />
                      Discount ({order.coupon.code})
                    </span>
                    <span>-₹{order.pricing.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className='flex justify-between'>
                  <span>Shipping</span>
                  <span>₹{order.pricing.shipping.toFixed(2)}</span>
                </div>
                <div className='border-t pt-3 flex justify-between font-bold text-lg'>
                  <span>Total</span>
                  <span>₹{order.pricing.total.toFixed(2)}</span>
                </div>
              </div>
            </Card>

            {/* Order Information */}
            <Card className='p-6'>
              <h2 className='text-xl font-bold mb-4'>Order Information</h2>
              <div className='space-y-4'>
                <div>
                  <Label className='text-sm text-gray-500'>Order Status</Label>
                  {(() => {
                    // If entire order is cancelled, show "Cancelled" only
                    if (order.orderStatus === 'cancelled') {
                      return (
                        <Badge className={`mt-1 ${getStatusColor('cancelled')}`}>
                          {getStatusDisplayName('cancelled')}
                        </Badge>
                      );
                    }
                    
                    // Check if any item is cancelled (but order itself is not cancelled)
                    const hasCancelledItem = order.items?.some((item: any) => 
                      item.itemStatus === 'cancelled' || item.cancelReturnInfo?.status === 'approved'
                    );
                    
                    // If only items are cancelled (not entire order), show order status with item cancelled note
                    if (hasCancelledItem) {
                      return (
                        <Badge className={`mt-1 ${getStatusColor(order.orderStatus)}`}>
                          {getStatusDisplayName(order.orderStatus)} (Item Cancelled)
                        </Badge>
                      );
                    }
                    
                    // Normal order status
                    return (
                      <Badge className={`mt-1 ${getStatusColor(order.orderStatus)}`}>
                        {getStatusDisplayName(order.orderStatus)}
                      </Badge>
                    );
                  })()}
                </div>
                <div>
                  <Label className='text-sm text-gray-500'>Payment Status</Label>
                  <Badge className={`mt-1 ${getStatusColor(order.paymentStatus)}`}>{order.paymentStatus.toUpperCase()}</Badge>
                </div>
                <div>
                  <Label className='text-sm text-gray-500'>Payment Method</Label>
                  <p className='mt-1 font-medium'>{order.payment.actualPaymentMethod || 
                    (order.payment.paymentMethod === 'cod' ? 'Cash on Delivery' :
                     order.payment.paymentMethod.toUpperCase().replace('_', ' '))}</p>
                </div>
                <div>
                  <Label className='text-sm text-gray-500'>Order Date</Label>
                  <p className='mt-1 font-medium'>{formatIndianDate(order.createdAt)}</p>
                </div>
              </div>
            </Card>

            {/* Payment Details */}
            {payment && (
              <Card className='p-6'>
                <h2 className='text-xl font-bold mb-4 flex items-center gap-2'>
                  <CreditCard className='h-5 w-5' />
                  Payment Details
                </h2>
                <div className='space-y-3 text-sm'>
                  <div className='flex justify-between'>
                    <span className='text-gray-500'>Payment ID:</span>
                    <span className='font-mono text-xs'>{payment.razorpayPaymentId || payment.transactionId || payment._id}</span>
                  </div>
                  {payment.razorpayOrderId && (
                    <div className='flex justify-between'>
                      <span className='text-gray-500'>Razorpay Order ID:</span>
                      <span className='font-mono text-xs'>{payment.razorpayOrderId}</span>
                    </div>
                  )}
                  <div className='flex justify-between'>
                    <span className='text-gray-500'>Amount:</span>
                    <span className='font-semibold'>₹{payment.amount?.toFixed(2) || order.pricing.total.toFixed(2)}</span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-gray-500'>Currency:</span>
                    <span>{payment.currency || 'INR'}</span>
                  </div>
                  {payment.paidAt && (
                    <div className='flex justify-between'>
                      <span className='text-gray-500'>Paid At:</span>
                      <span>{formatIndianDate(payment.paidAt)}</span>
                    </div>
                  )}
                  {payment.initiatedAt && (
                    <div className='flex justify-between'>
                      <span className='text-gray-500'>Initiated At:</span>
                      <span>{formatIndianDate(payment.initiatedAt)}</span>
                    </div>
                  )}
                  {payment.refundAmount && payment.refundAmount > 0 && (
                    <>
                      <div className='flex justify-between text-red-600'>
                        <span className='text-gray-500'>Refund Amount:</span>
                        <span className='font-semibold'>₹{payment.refundAmount.toFixed(2)}</span>
                      </div>
                      {payment.refundedAt && (
                        <div className='flex justify-between'>
                          <span className='text-gray-500'>Refunded At:</span>
                          <span>{formatIndianDate(payment.refundedAt)}</span>
                        </div>
                      )}
                      {payment.refundId && (
                        <div className='flex justify-between'>
                          <span className='text-gray-500'>Refund ID:</span>
                          <span className='font-mono text-xs'>{payment.refundId}</span>
                        </div>
                      )}
                    </>
                  )}
                  {payment.failedAt && (
                    <div className='flex justify-between text-red-600'>
                      <span className='text-gray-500'>Failed At:</span>
                      <span>{formatIndianDate(payment.failedAt)}</span>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Customer Information */}
            <Card className='p-6'>
              <h2 className='text-xl font-bold mb-4 flex items-center gap-2'>
                <User className='h-5 w-5' />
                Customer
              </h2>
              <div className='space-y-2 text-sm'>
                <p className='font-semibold'>{order.customerName}</p>
                <p>{order.customerEmail}</p>
                <p>{order.customerPhone}</p>
              </div>
            </Card>

            {/* Pickup Schedule - Show when status is Ready for Pickup */}
            {order.orderStatus === 'ready_for_pickup' && (order.pickupScheduledDate || order.pickupScheduledTime) && (
              <Card className='p-6 border-blue-200 bg-blue-50'>
                <h2 className='text-xl font-bold mb-4 flex items-center gap-2 text-blue-900'>
                  <Truck className='h-5 w-5' />
                  Pickup Schedule
                </h2>
                <div className='space-y-3 text-sm'>
                  {order.pickupScheduledDate && (
                    <p>
                      <span className='font-semibold text-blue-900'>Pickup Date:</span>{' '}
                      <span className='text-blue-700'>{formatIndianDate(typeof order.pickupScheduledDate === 'string' ? order.pickupScheduledDate : order.pickupScheduledDate.toISOString())}</span>
                    </p>
                  )}
                  {order.pickupScheduledTime && (
                    <p>
                      <span className='font-semibold text-blue-900'>Pickup Time:</span>{' '}
                      <span className='text-blue-700'>{order.pickupScheduledTime}</span>
                    </p>
                  )}
                  {order.tracking?.courierName && (
                    <p>
                      <span className='font-semibold text-blue-900'>Courier:</span>{' '}
                      <span className='text-blue-700'>{order.tracking.courierName}</span>
                    </p>
                  )}
                  {(order.tracking as any)?.shiprocketShipmentId && (
                    <p>
                      <span className='font-semibold text-blue-900'>Shiprocket Shipment ID:</span>{' '}
                      <span className='text-blue-700 font-mono text-xs'>{(order.tracking as any).shiprocketShipmentId}</span>
                    </p>
                  )}
                </div>
              </Card>
            )}

            {/* Tracking */}
            {order.tracking && (
              <Card className='p-6'>
                <div className='flex items-center justify-between mb-4'>
                  <h2 className='text-xl font-bold flex items-center gap-2'>
                    <Truck className='h-5 w-5' />
                    Tracking
                  </h2>
                  {/* Download Label Button - Show when order is ready for pickup or shipped */}
                  {(order.orderStatus === 'ready_for_pickup' || 
                    order.orderStatus === 'shipped' || 
                    order.orderStatus === 'out_for_delivery' ||
                    (order.tracking as any)?.shiprocketShipmentId) && (
                    <Button
                      onClick={async () => {
                        try {
                          setUpdating(true);
                          const token = localStorage.getItem('adminToken');
                          const response = await fetch(`/api/admin/orders/${orderId}/label`, {
                            headers: {
                              ...(token && { Authorization: `Bearer ${token}` }),
                            },
                            credentials: 'include',
                          });

                          if (response.ok) {
                            // Check if response is PDF
                            const contentType = response.headers.get('content-type');
                            
                            if (contentType?.includes('application/pdf')) {
                              // Download PDF
                              const blob = await response.blob();
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `shipping-label-${order.orderNumber}.pdf`;
                              document.body.appendChild(a);
                              a.click();
                              window.URL.revokeObjectURL(url);
                              document.body.removeChild(a);
                              
                              toast({
                                title: 'Success',
                                description: 'Shipping label downloaded successfully',
                                variant: 'success',
                              });
                            } else {
                              // Parse as JSON - might contain labelUrl
                              const data = await response.json();
                              
                              if (data.labelUrl) {
                                // Open label URL in new tab
                                window.open(data.labelUrl, '_blank');
                                toast({
                                  title: 'Success',
                                  description: 'Opening shipping label...',
                                  variant: 'success',
                                });
                              } else if (data.success) {
                                toast({
                                  title: 'Success',
                                  description: data.message || 'Label retrieved successfully',
                                  variant: 'success',
                                });
                              } else {
                                toast({
                                  title: 'Error',
                                  description: data.error || 'Failed to download label',
                                  variant: 'destructive',
                                });
                              }
                            }
                          } else {
                            const data = await response.json().catch(() => ({ error: 'Unknown error' }));
                            toast({
                              title: 'Error',
                              description: data.error || 'Failed to download label',
                              variant: 'destructive',
                            });
                          }
                        } catch (error: any) {
                          console.error('Error downloading label:', error);
                          toast({
                            title: 'Error',
                            description: error.message || 'Failed to download shipping label',
                            variant: 'destructive',
                          });
                        } finally {
                          setUpdating(false);
                        }
                      }}
                      disabled={updating}
                      className='gap-2 bg-blue-600 hover:bg-blue-700'
                      size='sm'
                    >
                      {updating ? (
                        <>
                          <Loader2 className='h-4 w-4 animate-spin' />
                          Downloading...
                        </>
                      ) : (
                        <>
                          <Download className='h-4 w-4' />
                          Download Label
                        </>
                      )}
                    </Button>
                  )}
                </div>
                <div className='space-y-2 text-sm'>
                  {order.tracking.courierName && (
                    <p>
                      <span className='font-semibold'>Courier:</span> {order.tracking.courierName}
                    </p>
                  )}
                  {order.tracking.trackingNumber && (
                    <p>
                      <span className='font-semibold'>Tracking #:</span> {order.tracking.trackingNumber}
                    </p>
                  )}
                  {order.tracking.estimatedDelivery && (
                    <p>
                      <span className='font-semibold'>Est. Delivery:</span> {formatIndianDate(order.tracking.estimatedDelivery)}
                    </p>
                  )}
                  {(order.tracking as any)?.labelGeneratedAt && (
                    <p className='text-xs text-gray-500 mt-2'>
                      Label generated: {formatIndianDate((order.tracking as any).labelGeneratedAt)}
                    </p>
                  )}
                </div>
              </Card>
            )}

            {/* Notes */}
            {order.notes && (
              <Card className='p-6'>
                <h2 className='text-xl font-bold mb-4'>Customer Notes</h2>
                <p className='text-sm'>{order.notes}</p>
              </Card>
            )}
          </div>
        </div>

        {/* Update Status Dialog */}
        <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Order Status</DialogTitle>
              <DialogDescription>
                {order?.orderStatus === 'cancelled' 
                  ? 'Order status cannot be changed for cancelled orders'
                  : ['delivered', 'completed'].includes(order?.orderStatus?.toLowerCase() || '')
                  ? 'This order has been delivered. Status cannot be changed further.'
                  : 'Select the next status in the order flow'}
              </DialogDescription>
            </DialogHeader>
            <div className='space-y-4'>
              <div>
                <Label className='pb-2'>Order Status</Label>
                {(() => {
                  const nextStatuses = order ? getNextAvailableStatuses(order.orderStatus) : [];
                  const isDelivered = ['delivered', 'completed'].includes(order?.orderStatus?.toLowerCase() || '');
                  const isCancelled = order?.orderStatus === 'cancelled';
                  
                  // Show current status display for cancelled, delivered, or when no next statuses available
                  if (isCancelled || isDelivered || nextStatuses.length === 0) {
                    return (
                      <div className='space-y-2'>
                        <div className='flex items-center gap-2 p-3 border rounded-md bg-gray-50'>
                          <span className='text-sm font-medium text-gray-700'>
                            Current Status: <span className={isCancelled ? 'text-red-600' : 'text-green-600'}>{getStatusDisplayName(order?.orderStatus || '')}</span>
                          </span>
                        </div>
                        {isCancelled && (
                          <p className='text-xs text-gray-500'>
                            This order has been cancelled. Status cannot be modified.
                          </p>
                        )}
                        {isDelivered && (
                          <p className='text-xs text-gray-500'>
                            This order has been delivered. No further status updates are available.
                          </p>
                        )}
                      </div>
                    );
                  }
                  
                  // Add cancel option
                  const cancelOption = { value: 'cancelled', label: 'Cancelled' };
                  
                  return (
                    <>
                      <div className='mb-2 text-xs text-gray-500'>
                        Current: <span className='font-medium'>{getStatusDisplayName(order?.orderStatus || '')}</span>
                      </div>
                      <Select 
                        value={orderStatus} 
                        onValueChange={setOrderStatus}
                        disabled={isCancelled || isDelivered}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder='Select next status' />
                        </SelectTrigger>
                        <SelectContent>
                          {nextStatuses.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                          {/* Add Cancel option */}
                          {!isCancelled && !isDelivered && (
                            <SelectItem key="cancelled" value="cancelled" className="text-red-600">
                              {cancelOption.label}
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      {isCancelled && (
                        <p className='text-xs text-gray-500 mt-2'>
                          This order has been cancelled. Status cannot be modified.
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>
              <div>
                <Label className='pb-2'>Admin Notes</Label>
                <Textarea 
                  value={adminNotes} 
                  onChange={e => setAdminNotes(e.target.value)} 
                  placeholder='Add notes...'
                  disabled={order?.orderStatus === 'cancelled' || ['delivered', 'completed'].includes(order?.orderStatus?.toLowerCase() || '')}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant='outline' onClick={() => setShowStatusDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleUpdateStatus} 
                disabled={
                  updating || 
                  order?.orderStatus === 'cancelled' || 
                  ['delivered', 'completed'].includes(order?.orderStatus?.toLowerCase() || '') ||
                  !orderStatus ||
                  (order && getNextAvailableStatuses(order.orderStatus).length === 0)
                }
              >
                {updating ? <Loader2 className='w-4 h-4 animate-spin' /> : 'Update'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Update Payment Dialog */}
        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Payment Status</DialogTitle>
              <DialogDescription>
                {order?.orderStatus === 'cancelled'
                  ? 'Payment status cannot be updated for cancelled orders. Use "Initiate Refund" button instead.'
                  : 'Change the payment status'}
              </DialogDescription>
            </DialogHeader>
            <div className='space-y-4'>
              <div>
                <Label className='pb-2'>Payment Status</Label>
                <Select 
                  value={paymentStatus} 
                  onValueChange={setPaymentStatus}
                  disabled={order?.orderStatus === 'cancelled'}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='pending'>Pending</SelectItem>
                    <SelectItem value='processing'>Processing</SelectItem>
                    <SelectItem value='paid'>Paid</SelectItem>
                    <SelectItem value='failed'>Failed</SelectItem>
                    <SelectItem value='refunded'>Refunded</SelectItem>
                    <SelectItem value='partially_refunded'>Partially Refunded</SelectItem>
                    <SelectItem value='cancelled'>Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                {order?.orderStatus === 'cancelled' && (
                  <p className='text-xs text-gray-500 mt-2'>
                    This order has been cancelled. Use "Initiate Refund" button to process refund.
                  </p>
                )}
              </div>
              <div>
                <Label className='pb-2'>Admin Notes</Label>
                <Textarea 
                  value={adminNotes} 
                  onChange={e => setAdminNotes(e.target.value)} 
                  placeholder='Add notes...'
                  disabled={order?.orderStatus === 'cancelled'}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant='outline' onClick={() => setShowPaymentDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleUpdatePayment} 
                disabled={updating || order?.orderStatus === 'cancelled'}
              >
                {updating ? <Loader2 className='w-4 h-4 animate-spin' /> : 'Update'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Update Tracking Dialog */}
        <Dialog open={showTrackingDialog} onOpenChange={setShowTrackingDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Tracking Information</DialogTitle>
              <DialogDescription>Add or update shipping tracking details</DialogDescription>
            </DialogHeader>
            <div className='space-y-4'>
              <div>
                <Label className='pb-2'>Courier Name</Label>
                <Input
                  value={trackingInfo.courierName}
                  onChange={e => setTrackingInfo({ ...trackingInfo, courierName: e.target.value })}
                  placeholder='e.g., FedEx, UPS, DHL'
                />
              </div>
              <div>
                <Label className='pb-2'>Tracking Number</Label>
                <Input
                  value={trackingInfo.trackingNumber}
                  onChange={e => setTrackingInfo({ ...trackingInfo, trackingNumber: e.target.value })}
                  placeholder='Enter tracking number'
                />
              </div>
              <div>
                <Label className='pb-2'>Estimated Delivery</Label>
                <Input
                  type='date'
                  value={trackingInfo.estimatedDelivery}
                  onChange={e => setTrackingInfo({ ...trackingInfo, estimatedDelivery: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant='outline' onClick={() => setShowTrackingDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateTracking} disabled={updating}>
                {updating ? <Loader2 className='w-4 h-4 animate-spin' /> : 'Update'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Item Approval Dialog */}
        <Dialog open={showItemApprovalDialog} onOpenChange={setShowItemApprovalDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {itemActionType === 'approve_return' && 'Approve Return & Schedule Pickup'}
                {itemActionType === 'complete_pickup' && 'Mark Pickup Complete'}
              </DialogTitle>
              <DialogDescription>
                {itemActionType === 'approve_return' && 'Please schedule a pickup date and time for the return.'}
                {itemActionType === 'complete_pickup' && 'Mark the pickup as completed and process the refund.'}
              </DialogDescription>
            </DialogHeader>
            <div className='space-y-4 py-4'>
              {itemActionType === 'approve_return' && (
                <>
                  <div className='space-y-2'>
                    <Label htmlFor='pickup-date'>Pickup Date *</Label>
                    <Input
                      id='pickup-date'
                      type='date'
                      value={pickupDate}
                      onChange={(e) => setPickupDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='pickup-time'>Pickup Time *</Label>
                    <Input
                      id='pickup-time'
                      type='time'
                      value={pickupTime}
                      onChange={(e) => setPickupTime(e.target.value)}
                    />
                  </div>
                </>
              )}
              {itemActionType === 'complete_pickup' && (
                <div className='space-y-2'>
                  <Label htmlFor='pickup-tracking'>Tracking Number (Optional)</Label>
                  <Input
                    id='pickup-tracking'
                    placeholder='Enter tracking number for return shipment'
                    value={pickupTracking}
                    onChange={(e) => setPickupTracking(e.target.value)}
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant='outline' onClick={() => {
                setShowItemApprovalDialog(false);
                setSelectedItemIndex(null);
                setItemActionType(null);
                setPickupDate('');
                setPickupTime('');
                setPickupTracking('');
              }}>
                Cancel
              </Button>
              <Button 
                onClick={handleItemAction} 
                disabled={updating || (itemActionType === 'approve_return' && (!pickupDate || !pickupTime))}
                className={itemActionType === 'approve_return' || itemActionType === 'complete_pickup' ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                {updating ? <Loader2 className='w-4 h-4 animate-spin' /> : 
                  itemActionType === 'approve_return' ? 'Approve & Schedule Pickup' :
                  itemActionType === 'complete_pickup' ? 'Complete Pickup' :
                  'Confirm'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Request Dialog */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Reject Return Request
              </DialogTitle>
              <DialogDescription>
                Please provide a reason for rejecting this request. The customer will be notified.
              </DialogDescription>
            </DialogHeader>
            <div className='space-y-4 py-4'>
              <div className='space-y-2'>
                <Label htmlFor='rejection-reason'>Rejection Reason *</Label>
                <Textarea
                  id='rejection-reason'
                  placeholder='e.g., Order already shipped, Return window expired, etc.'
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                  className='resize-none'
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant='outline' onClick={() => {
                setShowRejectDialog(false);
                setRejectionReason('');
                setSelectedItemIndex(null);
                setItemActionType(null);
              }}>
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  if (selectedItemIndex !== null && itemActionType) {
                    // Item-level rejection (only for returns now)
                    const action = 'reject_return';
                    handleItemRejection(action);
                  } else {
                    // Whole-order rejection
                    handleRejectRequest();
                  }
                }} 
                disabled={updating || !rejectionReason.trim()} 
                variant='destructive'
              >
                {updating ? <Loader2 className='w-4 h-4 animate-spin' /> : 'Reject Request'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
