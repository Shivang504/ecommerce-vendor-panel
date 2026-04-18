import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const { searchParams } = new URL(request.url);

    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const method = searchParams.get('method');
    
    // Get current user from token
    const currentUser = getUserFromRequest(request);

    const filter: any = {};

    if (search) {
      filter.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { razorpayOrderId: { $regex: search, $options: 'i' } },
        { razorpayPaymentId: { $regex: search, $options: 'i' } },
        { transactionId: { $regex: search, $options: 'i' } },
      ];

      // Also search in orders collection for customer info
      const orders = await db.collection('orders').find({
        $or: [
          { orderNumber: { $regex: search, $options: 'i' } },
          { customerName: { $regex: search, $options: 'i' } },
          { customerEmail: { $regex: search, $options: 'i' } },
        ],
      }).toArray();

      if (orders.length > 0) {
        const orderIds = orders.map(o => o._id);
        filter.$or.push({ orderId: { $in: orderIds } });
      }
    }

    if (status && status !== 'all') {
      filter.paymentStatus = status;
    }

    if (method && method !== 'all') {
      filter.paymentMethod = method;
    }

    const payments = await db
      .collection('payments')
      .find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .limit(500)
      .toArray();

    // Enrich payments with customer info from orders
    const enrichedPayments = await Promise.all(
      payments.map(async (payment) => {
        const order = await db.collection('orders').findOne({
          _id: payment.orderId,
        });

        return {
          ...payment,
          _id: payment._id?.toString(),
          orderId: payment.orderId?.toString(),
          customerId: payment.customerId?.toString(),
          customerName: order?.customerName || '',
          customerEmail: order?.customerEmail || '',
        };
      })
    );

    return NextResponse.json({
      payments: enrichedPayments,
      total: enrichedPayments.length,
    });
  } catch (error) {
    console.error('[Admin Payments API] Error fetching payments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 },
    );
  }
}

