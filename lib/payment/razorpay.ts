// Razorpay Payment Integration
import Razorpay from 'razorpay';
import crypto from 'crypto';

// Test Keys (hardcoded as requested)
const razorpayKeyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_RpOGb8GwTO1dmp';
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || '3iw3508rzN2moTDNhyJD9fUh';

export const razorpay = new Razorpay({
  key_id: razorpayKeyId,
  key_secret: razorpayKeySecret,
});

export interface RazorpayOrderOptions {
  amount: number; // Amount in paise (e.g., 50000 = ₹500)
  currency: string;
  receipt?: string;
  notes?: Record<string, string>;
  customer?: {
    name: string;
    email: string;
    contact: string;
  };
}

// Create Razorpay order
export async function createRazorpayOrder(options: RazorpayOrderOptions) {
  try {
    if (!razorpayKeyId || !razorpayKeySecret) {
      throw new Error('Razorpay credentials not configured');
    }

    const order = await razorpay.orders.create({
      amount: options.amount,
      currency: options.currency || 'INR',
      receipt: options.receipt,
      notes: options.notes,
    });

    return order;
  } catch (error: any) {
    console.error('[Razorpay] Error creating order:', error);
    throw new Error(error.message || 'Failed to create Razorpay order');
  }
}

// Verify Razorpay payment signature
export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  try {
    if (!razorpayKeySecret) {
      throw new Error('Razorpay key secret not configured');
    }

    const text = `${orderId}|${paymentId}`;
    const generatedSignature = crypto
      .createHmac('sha256', razorpayKeySecret)
      .update(text)
      .digest('hex');

    return generatedSignature === signature;
  } catch (error) {
    console.error('[Razorpay] Error verifying signature:', error);
    return false;
  }
}

// Get Razorpay payment details
export async function getRazorpayPayment(paymentId: string) {
  try {
    if (!razorpayKeyId || !razorpayKeySecret) {
      throw new Error('Razorpay credentials not configured');
    }

    const payment = await razorpay.payments.fetch(paymentId);
    return payment;
  } catch (error: any) {
    console.error('[Razorpay] Error fetching payment:', error);
    throw new Error(error.message || 'Failed to fetch Razorpay payment');
  }
}

// Create Razorpay refund
export async function createRazorpayRefund(
  paymentId: string,
  amount: number,
  notes?: Record<string, string>
) {
  try {
    if (!razorpayKeyId || !razorpayKeySecret) {
      throw new Error('Razorpay credentials not configured');
    }

    const refund = await razorpay.payments.refund(paymentId, {
      amount: amount, // Amount in paise
      notes: notes,
    });

    return refund;
  } catch (error: any) {
    console.error('[Razorpay] Error creating refund:', error);
    throw new Error(error.message || 'Failed to create Razorpay refund');
  }
}

// Get Razorpay refund details
export async function getRazorpayRefund(refundId: string) {
  try {
    if (!razorpayKeyId || !razorpayKeySecret) {
      throw new Error('Razorpay credentials not configured');
    }

    const refund = await razorpay.refunds.fetch(refundId);
    return refund;
  } catch (error: any) {
    console.error('[Razorpay] Error fetching refund:', error);
    throw new Error(error.message || 'Failed to fetch Razorpay refund');
  }
}

