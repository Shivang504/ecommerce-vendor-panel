import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { PaymentStatus, PaymentMethod } from './order';

export interface Payment {
  _id?: string | ObjectId;
  orderId: string | ObjectId;
  orderNumber: string;
  customerId: string | ObjectId;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  actualPaymentMethod?: string; // Actual payment method for display (Card, UPI, Netbanking, etc.)
  paymentStatus: PaymentStatus;
  
  // Razorpay specific fields
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  razorpayReceipt?: string;
  
  // Other payment gateway fields
  transactionId?: string;
  bankName?: string;
  chequeNumber?: string;
  upiId?: string;
  
  // Refund information
  refundAmount?: number;
  refundId?: string;
  refundReason?: string;
  refundStatus?: 'pending' | 'processed' | 'failed';
  
  // Timestamps
  initiatedAt: Date;
  paidAt?: Date;
  refundedAt?: Date;
  failedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  
  // Additional info
  notes?: string;
  metadata?: Record<string, any>;
}

// Create payment record
export async function createPayment(paymentData: Omit<Payment, '_id' | 'createdAt' | 'updatedAt'>) {
  try {
    const { db } = await connectToDatabase();
    
    const payment: Payment = {
      ...paymentData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('payments').insertOne(payment);
    
    return {
      ...payment,
      _id: result.insertedId.toString(),
    };
  } catch (error) {
    console.error('[Payment] Error creating payment:', error);
    throw error;
  }
}

// Get payment by ID
export async function getPaymentById(paymentId: string) {
  try {
    const { db } = await connectToDatabase();
    
    if (!ObjectId.isValid(paymentId)) {
      return null;
    }

    const payment = await db.collection('payments').findOne({
      _id: new ObjectId(paymentId),
    });

    if (!payment) {
      return null;
    }

    return {
      ...payment,
      _id: payment._id.toString(),
    } as Payment;
  } catch (error) {
    console.error('[Payment] Error fetching payment:', error);
    throw error;
  }
}

// Get payment by order ID
export async function getPaymentByOrderId(orderId: string) {
  try {
    const { db } = await connectToDatabase();
    
    if (!ObjectId.isValid(orderId)) {
      return null;
    }

    const payment = await db.collection('payments').findOne({
      orderId: new ObjectId(orderId),
    });

    if (!payment) {
      return null;
    }

    return {
      ...payment,
      _id: payment._id.toString(),
    } as Payment;
  } catch (error) {
    console.error('[Payment] Error fetching payment:', error);
    throw error;
  }
}

// Get payment by Razorpay order ID
export async function getPaymentByRazorpayOrderId(razorpayOrderId: string) {
  try {
    const { db } = await connectToDatabase();
    
    const payment = await db.collection('payments').findOne({
      razorpayOrderId: razorpayOrderId,
    });

    if (!payment) {
      return null;
    }

    return {
      ...payment,
      _id: payment._id.toString(),
    } as Payment;
  } catch (error) {
    console.error('[Payment] Error fetching payment:', error);
    throw error;
  }
}

// Update payment status
export async function updatePaymentStatus(
  paymentId: string,
  status: PaymentStatus,
  additionalData?: Partial<Payment>
) {
  try {
    const { db } = await connectToDatabase();
    
    if (!ObjectId.isValid(paymentId)) {
      throw new Error('Invalid payment ID');
    }

    const updateData: any = {
      paymentStatus: status,
      updatedAt: new Date(),
    };

    const now = new Date();
    switch (status) {
      case 'paid':
        updateData.paidAt = additionalData?.paidAt || now;
        break;
      case 'failed':
        updateData.failedAt = additionalData?.failedAt || now;
        break;
      case 'refunded':
      case 'partially_refunded':
        updateData.refundedAt = additionalData?.refundedAt || now;
        if (additionalData?.refundAmount) {
          updateData.refundAmount = additionalData.refundAmount;
        }
        if (additionalData?.refundId) {
          updateData.refundId = additionalData.refundId;
        }
        if (additionalData?.refundReason) {
          updateData.refundReason = additionalData.refundReason;
        }
        break;
    }

    if (additionalData) {
      Object.keys(additionalData).forEach(key => {
        if (key !== 'paidAt' && key !== 'failedAt' && key !== 'refundedAt') {
          updateData[key] = additionalData[key as keyof Payment];
        }
      });
    }

    const result = await db.collection('payments').findOneAndUpdate(
      { _id: new ObjectId(paymentId) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    return result?.value as Payment | null;
  } catch (error) {
    console.error('[Payment] Error updating payment status:', error);
    throw error;
  }
}

// Get customer payments
export async function getCustomerPayments(customerId: string, limit: number = 50) {
  try {
    const { db } = await connectToDatabase();
    
    const payments = await db
      .collection('payments')
      .find({
        customerId: new ObjectId(customerId),
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return payments.map(payment => ({
      ...payment,
      _id: payment._id.toString(),
    })) as Payment[];
  } catch (error) {
    console.error('[Payment] Error fetching customer payments:', error);
    throw error;
  }
}

