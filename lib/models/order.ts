import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { isShiprocketEnabled } from '@/lib/shiprocket-env';

export type OrderStatus = 
  | 'pending' // Order Placed
  | 'processing' 
  | 'packed' 
  | 'ready_for_pickup' 
  | 'shipped' 
  | 'out_for_delivery' 
  | 'delivered' 
  | 'completed'
  | 'cancellation_requested'
  | 'return_requested'
  | 'cancelled' 
  | 'returned' 
  | 'refunded';

export type PaymentStatus = 
  | 'pending' 
  | 'processing' 
  | 'paid' 
  | 'failed' 
  | 'refunded' 
  | 'partially_refunded' 
  | 'cancelled';

export type PaymentMethod = 
  | 'razorpay' 
  | 'cod' 
  | 'stripe' 
  | 'paypal' 
  | 'bank_transfer' 
  | 'wallet';

export type ItemStatus = 
  | 'ordered'
  | 'processing'
  | 'packed'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancellation_requested'
  | 'return_requested'
  | 'cancelled'
  | 'returned'
  | 'refunded';

export interface OrderRatingFeedback {
  rating: number;
  comment?: string;
  productIds: string[];
  awardedPoints?: number;
  awardedAt?: Date;
}

export interface ItemCancelReturnInfo {
  status: 'pending' | 'approved' | 'rejected' | 'pickup_scheduled' | 'pickup_completed' | 'refund_processed';
  reason?: string;
  returnType?: 'refund' | 'replacement';
  requestedAt?: Date;
  approvedAt?: Date;
  rejectedAt?: Date;
  rejectionReason?: string;
  pickupScheduledDate?: Date;
  pickupScheduledTime?: string;
  pickupCompletedAt?: Date;
  pickupTrackingNumber?: string;
  refundProcessedAt?: Date;
  refundAmount?: number;
}

export interface OrderItem {
  productId: string | ObjectId;
  productName: string;
  productImage?: string;
  productSlug?: string;
  variant?: {
    size?: string;
    color?: string;
    [key: string]: any;
  };
  quantity: number;
  price: number;
  total: number;
  vendorId?: string;
  sku?: string;
  itemStatus?: ItemStatus;
  cancelReturnInfo?: ItemCancelReturnInfo;
}

export interface ShippingAddress {
  name: string;
  phone: string;
  email: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  landmark?: string;
}

export interface BillingAddress {
  name: string;
  phone: string;
  email: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  landmark?: string;
}

export interface CouponInfo {
  code: string;
  title?: string;
  discountAmount: number;
  type: 'percentage' | 'fixed';
  couponId?: string;
}

export interface PaymentInfo {
  paymentId?: string;
  paymentMethod: PaymentMethod;
  actualPaymentMethod?: string; // Actual payment method for display (Card, UPI, Netbanking, etc.)
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  transactionId?: string;
  bankName?: string;
  chequeNumber?: string;
  paidAt?: Date;
  refundAmount?: number;
  refundReason?: string;
  refundedAt?: Date;
}

export interface TrackingInfo {
  courierName?: string;
  trackingNumber?: string;
  estimatedDelivery?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
  currentStatus?: string;
  trackingUrl?: string;
  shiprocketShipmentId?: number;
  shiprocketOrderId?: number;
  labelPdfUrl?: string; // URL to shipping label PDF
  labelGeneratedAt?: Date; // When the label was generated
  trackingEvents?: Array<{
    status: string;
    location?: string;
    timestamp: Date;
    description?: string;
  }>;
}

export interface Order {
  _id?: string | ObjectId;
  orderNumber: string;
  customerId: string | ObjectId;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  
  items: OrderItem[];
  
  shippingAddress: ShippingAddress;
  billingAddress: BillingAddress;
  
  pricing: {
    subtotal: number;
    discount: number;
    shipping: number;
    tax: number;
    total: number;
  };
  
  ratingFeedback?: OrderRatingFeedback;
  
  coupon?: CouponInfo;
  
  payment: PaymentInfo;
  paymentStatus: PaymentStatus;
  
  orderStatus: OrderStatus;
  tracking?: TrackingInfo;
  
  notes?: string;
  adminNotes?: string;
  
  // Estimated delivery information
  estimatedDeliveryDays?: number; // Estimated delivery days from pincode serviceability check
  
  createdAt: Date;
  updatedAt: Date;
  
  // Timestamps for lifecycle
  confirmedAt?: Date;
  processingAt?: Date;
  packedAt?: Date;
  readyForPickupAt?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;
  returnedAt?: Date;
  refundedAt?: Date;
  
  // Pickup schedule information
  pickupScheduledDate?: Date;
  pickupScheduledTime?: string;
  
  // Return information
  returnType?: 'refund' | 'replacement';
  returnReason?: string;
  
  // Request information
  cancellationRequestedAt?: Date;
  returnRequestedAt?: Date;
  requestStatus?: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
}

// Generate unique order number
export function generateOrderNumber(): string {
  const prefix = 'ORD';
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}-${timestamp}-${random}`;
}

// Create order
export async function createOrder(orderData: Omit<Order, '_id' | 'createdAt' | 'updatedAt' | 'orderNumber'>) {
  try {
    const { db } = await connectToDatabase();
    
    const orderNumber = generateOrderNumber();
    
    // Ensure customerId is stored as ObjectId
    const customerId = typeof orderData.customerId === 'string' 
      ? (ObjectId.isValid(orderData.customerId) ? new ObjectId(orderData.customerId) : orderData.customerId)
      : orderData.customerId;
    
    const order: any = {
      ...orderData,
      customerId: customerId,
      orderNumber,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('orders').insertOne(order);
    
    console.log('[Order] Created order with customerId:', customerId.toString());
    
    return {
      ...order,
      _id: result.insertedId.toString(),
      customerId: customerId.toString(),
    };
  } catch (error) {
    console.error('[Order] Error creating order:', error);
    throw error;
  }
}

// Get order by ID
export async function getOrderById(orderId: string) {
  try {
    const { db } = await connectToDatabase();
    
    if (!ObjectId.isValid(orderId)) {
      return null;
    }

    const order = await db.collection('orders').findOne({
      _id: new ObjectId(orderId),
    });

    if (!order) {
      return null;
    }

    // Ensure tracking info is properly structured
    // MongoDB stores nested fields, so we need to check both ways
    const tracking = order.tracking || (order as any)['tracking'] || undefined;
    
    console.log('[Order] 📦 Order fetched (getOrderById):', {
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      hasTracking: !!tracking,
      trackingType: typeof tracking,
      trackingKeys: tracking ? Object.keys(tracking) : [],
      trackingShipmentId: tracking?.shiprocketShipmentId,
      trackingOrderId: tracking?.shiprocketOrderId,
    });

    const orderWithTracking = {
      ...order,
      _id: order._id.toString(),
      tracking: tracking,
    } as Order;

    return orderWithTracking;
  } catch (error) {
    console.error('[Order] Error fetching order:', error);
    throw error;
  }
}

// Get order by order number
export async function getOrderByOrderNumber(orderNumber: string) {
  try {
    const { db } = await connectToDatabase();
    
    const order = await db.collection('orders').findOne({
      orderNumber: orderNumber.toUpperCase(),
    });

    if (!order) {
      return null;
    }

    // Ensure tracking info is properly structured
    // MongoDB stores nested fields, so we need to check both ways
    const tracking = order.tracking || (order as any)['tracking'] || undefined;
    
    console.log('[Order] 📦 Order fetched (getOrderByOrderNumber):', {
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      hasTracking: !!tracking,
      trackingType: typeof tracking,
      trackingKeys: tracking ? Object.keys(tracking) : [],
      trackingShipmentId: tracking?.shiprocketShipmentId,
      trackingOrderId: tracking?.shiprocketOrderId,
    });

    const orderWithTracking = {
      ...order,
      _id: order._id.toString(),
      tracking: tracking,
    } as Order;

    return orderWithTracking;
  } catch (error) {
    console.error('[Order] Error fetching order:', error);
    throw error;
  }
}

// Get customer orders
export async function getCustomerOrders(customerId: string, limit: number = 50) {
  try {
    const { db } = await connectToDatabase();
    
    console.log(`[Order] Querying orders for customerId: ${customerId} (ObjectId valid: ${ObjectId.isValid(customerId)})`);
    
    // Handle both ObjectId and string formats for customerId
    // MongoDB can store customerId as either ObjectId or string, so we need to check both
    let customerIdFilter: any;
    
    if (ObjectId.isValid(customerId)) {
      const customerObjectId = new ObjectId(customerId);
      // Try both ObjectId and string formats to handle any data inconsistencies
      customerIdFilter = {
        $or: [
          { customerId: customerObjectId },
          { customerId: customerId }
        ]
      };
    } else {
      // If not a valid ObjectId, just use string
      customerIdFilter = { customerId: customerId };
    }
    
    const orders = await db
      .collection('orders')
      .find(customerIdFilter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    console.log(`[Order] Found ${orders.length} orders for customerId: ${customerId}`);
    
    // Log first order's customerId for debugging if no orders found
    if (orders.length === 0) {
      // Try a direct query to see what customerIds exist
      const sampleOrder = await db.collection('orders').findOne({});
      if (sampleOrder) {
        console.log(`[Order] Sample order customerId type: ${sampleOrder.customerId?.constructor?.name || typeof sampleOrder.customerId}, value: ${sampleOrder.customerId}`);
        console.log(`[Order] Looking for: ${customerId}, Sample has: ${sampleOrder.customerId?.toString()}`);
      }
    } else if (orders.length > 0) {
      console.log(`[Order] First order customerId type: ${orders[0].customerId?.constructor?.name || typeof orders[0].customerId}, value: ${orders[0].customerId}`);
    }

    return orders.map(order => ({
      ...order,
      _id: order._id.toString(),
      customerId: order.customerId?.toString() || order.customerId,
    })) as Order[];
  } catch (error) {
    console.error('[Order] Error fetching customer orders:', error);
    throw error;
  }
}

// Update order status
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  adminNotes?: string
) {
  try {
    const { db } = await connectToDatabase();
    
    if (!ObjectId.isValid(orderId)) {
      throw new Error('Invalid order ID');
    }

    const updateData: any = {
      orderStatus: status,
      updatedAt: new Date(),
    };

    // Set timestamp based on status
    const now = new Date();
    switch (status) {
      case 'pending':
        // Order Placed - no specific timestamp needed
        break;
      case 'processing':
        updateData.processingAt = now;
        break;
      case 'packed':
        updateData.packedAt = now;
        break;
      case 'ready_for_pickup':
        updateData.readyForPickupAt = now;
        break;
      case 'shipped':
        updateData.shippedAt = now;
        updateData['tracking.shippedAt'] = now;
        break;
      case 'delivered':
        updateData.deliveredAt = now;
        updateData['tracking.deliveredAt'] = now;
        // Process vendor earnings when order is delivered
        setImmediate(async () => {
          try {
            const { processVendorEarningsFromOrder } = await import('@/lib/models/vendor-earnings');
            await processVendorEarningsFromOrder(orderId);
          } catch (error) {
            console.error('[Order] Error processing vendor earnings:', error);
            // Don't fail order update if earnings processing fails
          }
        });
        break;
      case 'completed':
        // Also process earnings for completed orders
        setImmediate(async () => {
          try {
            const { processVendorEarningsFromOrder } = await import('@/lib/models/vendor-earnings');
            await processVendorEarningsFromOrder(orderId);
          } catch (error) {
            console.error('[Order] Error processing vendor earnings:', error);
            // Don't fail order update if earnings processing fails
          }
        });
        break;
      case 'cancelled':
        updateData.cancelledAt = now;
        break;
      case 'returned':
        updateData.returnedAt = now;
        break;
      case 'refunded':
        updateData.refundedAt = now;
        break;
    }

    if (adminNotes) {
      updateData.adminNotes = adminNotes;
    }

    const result = await db.collection('orders').findOneAndUpdate(
      { _id: new ObjectId(orderId) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    return result?.value as Order | null;
  } catch (error) {
    console.error('[Order] Error updating order status:', error);
    throw error;
  }
}

// Update payment status
export async function updatePaymentStatus(
  orderId: string,
  paymentStatus: PaymentStatus,
  paymentInfo?: Partial<PaymentInfo>
) {
  try {
    const { db } = await connectToDatabase();
    
    if (!ObjectId.isValid(orderId)) {
      throw new Error('Invalid order ID');
    }

    const updateData: any = {
      paymentStatus,
      updatedAt: new Date(),
    };

    if (paymentInfo) {
      Object.keys(paymentInfo).forEach(key => {
        updateData[`payment.${key}`] = paymentInfo[key as keyof PaymentInfo];
      });
    }

    if (paymentStatus === 'paid' && !paymentInfo?.paidAt) {
      updateData['payment.paidAt'] = new Date();
    }

    if ((paymentStatus === 'refunded' || paymentStatus === 'partially_refunded') && !paymentInfo?.refundedAt) {
      updateData['payment.refundedAt'] = new Date();
      updateData.refundedAt = new Date();
    }

    const result = await db.collection('orders').findOneAndUpdate(
      { _id: new ObjectId(orderId) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    return result?.value as Order | null;
  } catch (error) {
    console.error('[Order] Error updating payment status:', error);
    throw error;
  }
}

// Update tracking info
export async function updateTrackingInfo(
  orderId: string,
  trackingInfo: Partial<TrackingInfo>
) {
  try {
    const { db } = await connectToDatabase();
    
    if (!ObjectId.isValid(orderId)) {
      throw new Error('Invalid order ID');
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    Object.keys(trackingInfo).forEach(key => {
      updateData[`tracking.${key}`] = trackingInfo[key as keyof TrackingInfo];
    });

    const result = await db.collection('orders').findOneAndUpdate(
      { _id: new ObjectId(orderId) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    return result?.value as Order | null;
  } catch (error) {
    console.error('[Order] Error updating tracking info:', error);
    throw error;
  }
}

// Cancel order (customer - same as admin cancelOrder)
export async function requestCancellation(orderId: string, reason?: string) {
  try {
    const order = await getOrderById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    // Can only cancel if order is not shipped or delivered
    if (['shipped', 'out_for_delivery', 'delivered'].includes(order.orderStatus)) {
      throw new Error('Cannot cancel order that has been shipped');
    }

    // Cancel Shiprocket order if shipment exists
    const shipmentId = (order.tracking as any)?.shiprocketShipmentId;
    const shiprocketOrderId = (order.tracking as any)?.shiprocketOrderId; // Numeric order_id from Shiprocket
    
    if (shipmentId && isShiprocketEnabled()) {
      try {
        const { cancelShiprocketOrder } = await import('@/lib/shiprocket');
        // Pass shiprocketOrderId (numeric) if available, otherwise fallback to orderNumber
        const cancelResult = await cancelShiprocketOrder(shipmentId, shiprocketOrderId ? undefined : order.orderNumber, shiprocketOrderId);
        if (!cancelResult.success) {
          console.error('[Order] ❌ Failed to cancel Shiprocket order (requestCancellation):', cancelResult.error);
          // Don't fail order cancellation if Shiprocket cancel fails - log and continue
        }
      } catch (shiprocketError) {
        console.error('[Order] ❌ Error cancelling Shiprocket order (requestCancellation):', shiprocketError);
        // Don't fail order cancellation if Shiprocket cancel fails
      }
    }

    // Increment stock back for all items when order is cancelled
    const { incrementStock } = await import('@/lib/models/inventory');
    if (order.items && Array.isArray(order.items)) {
      await Promise.allSettled(
        order.items.map(async (item: any) => {
          const productId = typeof item.productId === 'string' 
            ? item.productId 
            : item.productId?.toString();
          
          if (productId) {
            const stockResult = await incrementStock(
              productId,
              item.quantity,
              item.variant
            );
            
            if (!stockResult.success) {
              console.error(`[Order] Failed to increment stock for cancelled order item:`, stockResult.error);
            }
          }
        })
      );
    }

    const updateData: any = {
      orderStatus: 'cancelled',
      cancelledAt: new Date(),
      updatedAt: new Date(),
    };

    if (reason) {
      updateData.adminNotes = reason;
    }

    // If paid, mark for refund (same as admin)
    if (order.paymentStatus === 'paid') {
      updateData.paymentStatus = 'refunded';
      updateData.refundedAt = new Date();
    } else {
      updateData.paymentStatus = 'cancelled';
    }

    const { db } = await connectToDatabase();
    
    const result = await db.collection('orders').findOneAndUpdate(
      { _id: new ObjectId(orderId) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    return result?.value as Order | null;
  } catch (error) {
    console.error('[Order] Error cancelling order (requestCancellation):', error);
    throw error;
  }
}

// Cancel order (direct - for admin)
export async function cancelOrder(orderId: string, reason?: string) {
  try {
    const order = await getOrderById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    // Can only cancel if order is not shipped or delivered
    if (['shipped', 'out_for_delivery', 'delivered'].includes(order.orderStatus)) {
      throw new Error('Cannot cancel order that has been shipped');
    }

    // Cancel Shiprocket order if shipment exists
    const shipmentId = (order.tracking as any)?.shiprocketShipmentId;
    const shiprocketOrderId = (order.tracking as any)?.shiprocketOrderId; // Numeric order_id from Shiprocket
    
    if (shipmentId && isShiprocketEnabled()) {
      try {
        const { cancelShiprocketOrder } = await import('@/lib/shiprocket');
        // Pass shiprocketOrderId (numeric) if available, otherwise fallback to orderNumber
        const cancelResult = await cancelShiprocketOrder(shipmentId, shiprocketOrderId ? undefined : order.orderNumber, shiprocketOrderId);
        if (!cancelResult.success) {
          console.error('[Order] ❌ Failed to cancel Shiprocket order:', cancelResult.error);
          // Don't fail order cancellation if Shiprocket cancel fails - log and continue
        }
      } catch (shiprocketError) {
        console.error('[Order] ❌ Error cancelling Shiprocket order:', shiprocketError);
        // Don't fail order cancellation if Shiprocket cancel fails
      }
    }

    // Increment stock back for all items when order is cancelled
    const { incrementStock } = await import('@/lib/models/inventory');
    if (order.items && Array.isArray(order.items)) {
      await Promise.allSettled(
        order.items.map(async (item: any) => {
          const productId = typeof item.productId === 'string' 
            ? item.productId 
            : item.productId?.toString();
          
          if (productId) {
            const stockResult = await incrementStock(
              productId,
              item.quantity,
              item.variant
            );
            
            if (!stockResult.success) {
              console.error(`[Order] Failed to increment stock for cancelled order item:`, stockResult.error);
            }
          }
        })
      );
    }

    const updateData: any = {
      orderStatus: 'cancelled',
      cancelledAt: new Date(),
      updatedAt: new Date(),
    };

    if (reason) {
      updateData.adminNotes = reason;
    }

    // If paid, mark for refund
    if (order.paymentStatus === 'paid') {
      updateData.paymentStatus = 'refunded';
      updateData.refundedAt = new Date();
    } else {
      updateData.paymentStatus = 'cancelled';
    }

    const { db } = await connectToDatabase();
    
    const result = await db.collection('orders').findOneAndUpdate(
      { _id: new ObjectId(orderId) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    return result?.value as Order | null;
  } catch (error) {
    console.error('[Order] Error cancelling order:', error);
    throw error;
  }
}

// Request return (customer)
export async function requestReturn(orderId: string, reason?: string, returnType: 'refund' | 'replacement' = 'refund') {
  try {
    const order = await getOrderById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    // Can only return if order is delivered
    if (order.orderStatus !== 'delivered' && order.orderStatus !== 'return_requested') {
      throw new Error('Can only return delivered orders');
    }

    if (order.orderStatus === 'return_requested') {
      throw new Error('Return request already submitted');
    }

    // Check if order was delivered within return window (e.g., 7 days)
    const deliveredDate = order.deliveredAt ? new Date(order.deliveredAt) : null;
    if (!deliveredDate) {
      throw new Error('Order delivery date not found');
    }

    const daysSinceDelivery = Math.floor((Date.now() - deliveredDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceDelivery > 7) {
      throw new Error('Return window has expired. Orders can only be returned within 7 days of delivery.');
    }

    const updateData: any = {
      orderStatus: 'return_requested',
      returnRequestedAt: new Date(),
      updatedAt: new Date(),
      returnType: returnType,
      returnReason: reason,
      requestStatus: 'pending',
    };

    const { db } = await connectToDatabase();
    const result = await db.collection('orders').findOneAndUpdate(
      { _id: new ObjectId(orderId) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    return result?.value as Order | null;
  } catch (error) {
    console.error('[Order] Error requesting return:', error);
    throw error;
  }
}

// Approve return (admin)
export async function approveReturn(orderId: string, adminNotes?: string) {
  try {
    const order = await getOrderById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    if (order.orderStatus !== 'return_requested') {
      throw new Error('Order return is not requested');
    }

    const updateData: any = {
      orderStatus: 'returned',
      returnedAt: new Date(),
      updatedAt: new Date(),
      requestStatus: 'approved',
    };

    if (adminNotes) {
      updateData.adminNotes = adminNotes;
    }

    // If paid, mark for refund
    if (order.paymentStatus === 'paid') {
      updateData.paymentStatus = 'refunded';
      updateData.refundedAt = new Date();
    }

    const { db } = await connectToDatabase();
    const result = await db.collection('orders').findOneAndUpdate(
      { _id: new ObjectId(orderId) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    return result?.value as Order | null;
  } catch (error) {
    console.error('[Order] Error approving return:', error);
    throw error;
  }
}

// Reject return (admin)
export async function rejectReturn(orderId: string, rejectionReason: string) {
  try {
    const order = await getOrderById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    if (order.orderStatus !== 'return_requested') {
      throw new Error('Order return is not requested');
    }

    // Revert to delivered status
    const updateData: any = {
      orderStatus: 'delivered',
      updatedAt: new Date(),
      requestStatus: 'rejected',
      rejectionReason: rejectionReason,
    };

    const { db } = await connectToDatabase();
    const result = await db.collection('orders').findOneAndUpdate(
      { _id: new ObjectId(orderId) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    return result?.value as Order | null;
  } catch (error) {
    console.error('[Order] Error rejecting return:', error);
    throw error;
  }
}

// Return order (direct - for admin or auto-approval)
export async function returnOrder(orderId: string, reason?: string, returnType: 'refund' | 'replacement' = 'refund') {
  try {
    const order = await getOrderById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    // Can only return if order is delivered
    if (order.orderStatus !== 'delivered') {
      throw new Error('Can only return delivered orders');
    }

    // Check if order was delivered within return window (e.g., 7 days)
    const deliveredDate = order.deliveredAt ? new Date(order.deliveredAt) : null;
    if (!deliveredDate) {
      throw new Error('Order delivery date not found');
    }

    const daysSinceDelivery = Math.floor((Date.now() - deliveredDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceDelivery > 7) {
      throw new Error('Return window has expired. Orders can only be returned within 7 days of delivery.');
    }

    const updateData: any = {
      orderStatus: 'returned',
      returnedAt: new Date(),
      updatedAt: new Date(),
      returnType: returnType,
      returnReason: reason,
    };

    // If paid, mark for refund
    if (order.paymentStatus === 'paid') {
      updateData.paymentStatus = 'refunded';
      updateData.refundedAt = new Date();
    }

    const { db } = await connectToDatabase();
    const result = await db.collection('orders').findOneAndUpdate(
      { _id: new ObjectId(orderId) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    return result?.value as Order | null;
  } catch (error) {
    console.error('[Order] Error returning order:', error);
    throw error;
  }
}

// Request item cancellation (customer) - Direct cancellation without admin approval
export async function requestItemCancellation(orderId: string, itemIndex: number, reason?: string) {
  try {
    const order = await getOrderById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    if (!order.items || itemIndex >= order.items.length) {
      throw new Error('Invalid item index');
    }

    const item = order.items[itemIndex];
    
    // Can only cancel if item is not shipped or delivered
    if (item.itemStatus && ['shipped', 'out_for_delivery', 'delivered', 'cancelled'].includes(item.itemStatus)) {
      throw new Error('Cannot cancel item that has been shipped or already cancelled');
    }

    // Increment stock back (variant-wise or product-wise)
    const { incrementStock } = await import('@/lib/models/inventory');
    const productId = typeof item.productId === 'string' 
      ? item.productId 
      : item.productId?.toString();
    
    if (productId) {
      const stockResult = await incrementStock(
        productId,
        item.quantity,
        item.variant
      );
      
      if (!stockResult.success) {
        console.error(`[Order] Failed to increment stock for cancelled item:`, stockResult.error);
        // Don't fail cancellation if stock increment fails - log and continue
      }
    }

    // Cancel Shiprocket order if shipment exists (order-wise cancellation)
    const shipmentId = (order.tracking as any)?.shiprocketShipmentId;
    const shiprocketOrderId = (order.tracking as any)?.shiprocketOrderId;
    
    if (shipmentId && isShiprocketEnabled()) {
      try {
        const { cancelShiprocketOrder } = await import('@/lib/shiprocket');
        const cancelResult = await cancelShiprocketOrder(shipmentId, shiprocketOrderId ? undefined : order.orderNumber, shiprocketOrderId);
        if (!cancelResult.success) {
          console.error('[Order] ❌ Failed to cancel Shiprocket order (requestItemCancellation):', cancelResult.error);
        }
      } catch (shiprocketError) {
        console.error('[Order] ❌ Error cancelling Shiprocket order (requestItemCancellation):', shiprocketError);
      }
    }

    const { db } = await connectToDatabase();
    const updatePath = `items.${itemIndex}.cancelReturnInfo`;
    const statusPath = `items.${itemIndex}.itemStatus`;

    // Direct cancellation - no admin approval needed
    const cancelInfo: ItemCancelReturnInfo = {
      status: 'approved',
      reason: reason,
      requestedAt: new Date(),
      approvedAt: new Date(),
    };

    // If paid, mark for refund
    if (order.paymentStatus === 'paid') {
      const refundAmount = item.total;
      cancelInfo.refundAmount = refundAmount;
      cancelInfo.status = 'refund_processed';
      cancelInfo.refundProcessedAt = new Date();
    }

    // Update order status to cancelled (order-wise cancellation)
    const updateData: any = {
      [updatePath]: cancelInfo,
      [statusPath]: 'cancelled',
      orderStatus: 'cancelled', // Order-wise cancellation
      cancelledAt: new Date(),
      updatedAt: new Date(),
    };

    // Update payment status
    if (order.paymentStatus === 'paid') {
      updateData.paymentStatus = 'refunded';
      updateData.refundedAt = new Date();
    } else {
      updateData.paymentStatus = 'cancelled';
    }

    const result = await db.collection('orders').findOneAndUpdate(
      { _id: new ObjectId(orderId) },
      { 
        $set: updateData
      },
      { returnDocument: 'after' }
    );

    return result?.value as Order | null;
  } catch (error) {
    console.error('[Order] Error cancelling item:', error);
    throw error;
  }
}

// Request item return (customer)
export async function requestItemReturn(
  orderId: string, 
  itemIndex: number, 
  reason?: string, 
  returnType: 'refund' | 'replacement' = 'refund'
) {
  try {
    const order = await getOrderById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    if (!order.items || itemIndex >= order.items.length) {
      throw new Error('Invalid item index');
    }

    const item = order.items[itemIndex];
    
    // Can only return if item is delivered
    if (item.itemStatus !== 'delivered' && order.orderStatus !== 'delivered') {
      throw new Error('Can only return delivered items');
    }

    if (item.itemStatus === 'return_requested') {
      throw new Error('Return request already submitted for this item');
    }

    // Check if order was delivered within return window (7 days)
    const deliveredDate = order.deliveredAt ? new Date(order.deliveredAt) : null;
    if (deliveredDate) {
      const daysSinceDelivery = Math.floor((Date.now() - deliveredDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceDelivery > 7) {
        throw new Error('Return window has expired. Items can only be returned within 7 days of delivery.');
      }
    }

    const returnInfo: ItemCancelReturnInfo = {
      status: 'pending',
      reason: reason,
      returnType: returnType,
      requestedAt: new Date(),
    };

    const { db } = await connectToDatabase();
    const updatePath = `items.${itemIndex}.cancelReturnInfo`;
    const statusPath = `items.${itemIndex}.itemStatus`;

    const result = await db.collection('orders').findOneAndUpdate(
      { _id: new ObjectId(orderId) },
      { 
        $set: { 
          [updatePath]: returnInfo,
          [statusPath]: 'return_requested',
          updatedAt: new Date(),
        } 
      },
      { returnDocument: 'after' }
    );

    return result?.value as Order | null;
  } catch (error) {
    console.error('[Order] Error requesting item return:', error);
    throw error;
  }
}

// Approve item cancellation (admin)
export async function approveItemCancellation(orderId: string, itemIndex: number, adminNotes?: string) {
  try {
    const order = await getOrderById(orderId);
    if (!order || !order.items || itemIndex >= order.items.length) {
      throw new Error('Order or item not found');
    }

    const item = order.items[itemIndex];
    if (item.itemStatus !== 'cancellation_requested') {
      throw new Error('Item cancellation is not requested');
    }

    const { db } = await connectToDatabase();
    const updatePath = `items.${itemIndex}.cancelReturnInfo`;
    const statusPath = `items.${itemIndex}.itemStatus`;

    const updatedInfo: ItemCancelReturnInfo = {
      ...(item.cancelReturnInfo || {}),
      status: 'approved',
      approvedAt: new Date(),
    };

    const result = await db.collection('orders').findOneAndUpdate(
      { _id: new ObjectId(orderId) },
      { 
        $set: { 
          [updatePath]: updatedInfo,
          [statusPath]: 'cancelled',
          updatedAt: new Date(),
        } 
      },
      { returnDocument: 'after' }
    );

    // If paid, mark for refund
    if (order.paymentStatus === 'paid') {
      const refundAmount = item.total;
      await db.collection('orders').updateOne(
        { _id: new ObjectId(orderId) },
        { 
          $set: { 
            [`items.${itemIndex}.cancelReturnInfo.refundAmount`]: refundAmount,
            [`items.${itemIndex}.cancelReturnInfo.status`]: 'refund_processed',
            [`items.${itemIndex}.cancelReturnInfo.refundProcessedAt`]: new Date(),
          } 
        }
      );
    }

    return result?.value as Order | null;
  } catch (error) {
    console.error('[Order] Error approving item cancellation:', error);
    throw error;
  }
}

// Approve item return (admin) - with pickup scheduling
export async function approveItemReturn(
  orderId: string, 
  itemIndex: number, 
  pickupDate: Date,
  pickupTime: string,
  adminNotes?: string
) {
  try {
    const order = await getOrderById(orderId);
    if (!order || !order.items || itemIndex >= order.items.length) {
      throw new Error('Order or item not found');
    }

    const item = order.items[itemIndex];
    if (item.itemStatus !== 'return_requested') {
      throw new Error('Item return is not requested');
    }

    const { db } = await connectToDatabase();
    const updatePath = `items.${itemIndex}.cancelReturnInfo`;
    const statusPath = `items.${itemIndex}.itemStatus`;

    const updatedInfo: ItemCancelReturnInfo = {
      ...(item.cancelReturnInfo || {}),
      status: 'pickup_scheduled',
      approvedAt: new Date(),
      pickupScheduledDate: pickupDate,
      pickupScheduledTime: pickupTime,
    };

    const result = await db.collection('orders').findOneAndUpdate(
      { _id: new ObjectId(orderId) },
      { 
        $set: { 
          [updatePath]: updatedInfo,
          updatedAt: new Date(),
        } 
      },
      { returnDocument: 'after' }
    );

    return result?.value as Order | null;
  } catch (error) {
    console.error('[Order] Error approving item return:', error);
    throw error;
  }
}

// Mark pickup as completed (admin)
export async function completeItemPickup(orderId: string, itemIndex: number, trackingNumber?: string) {
  try {
    const order = await getOrderById(orderId);
    if (!order || !order.items || itemIndex >= order.items.length) {
      throw new Error('Order or item not found');
    }

    const item = order.items[itemIndex];
    const cancelReturnInfo = item.cancelReturnInfo;
    
    if (!cancelReturnInfo || cancelReturnInfo.status !== 'pickup_scheduled') {
      throw new Error('Pickup is not scheduled for this item');
    }

    const { db } = await connectToDatabase();
    const updatePath = `items.${itemIndex}.cancelReturnInfo`;

    const updatedInfo: ItemCancelReturnInfo = {
      ...cancelReturnInfo,
      status: 'pickup_completed',
      pickupCompletedAt: new Date(),
      pickupTrackingNumber: trackingNumber,
    };

    // Increment stock back when return is completed
    const { incrementStock } = await import('@/lib/models/inventory');
    const productId = typeof item.productId === 'string' 
      ? item.productId 
      : item.productId?.toString();
    
    if (productId) {
      const stockResult = await incrementStock(
        productId,
        item.quantity,
        item.variant
      );
      
      if (!stockResult.success) {
        console.error(`[Order] Failed to increment stock for returned item:`, stockResult.error);
        // Don't fail return completion if stock increment fails - log and continue
      }
    }

    const result = await db.collection('orders').findOneAndUpdate(
      { _id: new ObjectId(orderId) },
      { 
        $set: { 
          [updatePath]: updatedInfo,
          [`items.${itemIndex}.itemStatus`]: 'returned',
          updatedAt: new Date(),
        } 
      },
      { returnDocument: 'after' }
    );

    // Process refund if return type is refund
    if (cancelReturnInfo.returnType === 'refund' && order.paymentStatus === 'paid') {
      const refundAmount = item.total;
      await db.collection('orders').updateOne(
        { _id: new ObjectId(orderId) },
        { 
          $set: { 
            [`items.${itemIndex}.cancelReturnInfo.refundAmount`]: refundAmount,
            [`items.${itemIndex}.cancelReturnInfo.status`]: 'refund_processed',
            [`items.${itemIndex}.cancelReturnInfo.refundProcessedAt`]: new Date(),
          } 
        }
      );
    }

    return result?.value as Order | null;
  } catch (error) {
    console.error('[Order] Error completing item pickup:', error);
    throw error;
  }
}

// Reject item cancellation/return (admin)
export async function rejectItemRequest(
  orderId: string, 
  itemIndex: number, 
  rejectionReason: string,
  requestType: 'cancel' | 'return'
) {
  try {
    const order = await getOrderById(orderId);
    if (!order || !order.items || itemIndex >= order.items.length) {
      throw new Error('Order or item not found');
    }

    const item = order.items[itemIndex];
    const expectedStatus = requestType === 'cancel' ? 'cancellation_requested' : 'return_requested';
    
    if (item.itemStatus !== expectedStatus) {
      throw new Error(`Item ${requestType} is not requested`);
    }

    const { db } = await connectToDatabase();
    const updatePath = `items.${itemIndex}.cancelReturnInfo`;
    
    const previousStatus = requestType === 'cancel' ? 'pending' : 'delivered';

    const updatedInfo: ItemCancelReturnInfo = {
      ...(item.cancelReturnInfo || {}),
      status: 'rejected',
      rejectedAt: new Date(),
      rejectionReason: rejectionReason,
    };

    const result = await db.collection('orders').findOneAndUpdate(
      { _id: new ObjectId(orderId) },
      { 
        $set: { 
          [updatePath]: updatedInfo,
          [`items.${itemIndex}.itemStatus`]: previousStatus,
          updatedAt: new Date(),
        } 
      },
      { returnDocument: 'after' }
    );

    return result?.value as Order | null;
  } catch (error) {
    console.error('[Order] Error rejecting item request:', error);
    throw error;
  }
}

