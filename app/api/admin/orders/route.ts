import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getUserFromRequest, isVendor } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const { searchParams } = new URL(request.url);

    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    
    // Get current user from token
    const currentUser = getUserFromRequest(request);

    const filter: any = {};

    if (search) {
      filter.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { customerEmail: { $regex: search, $options: 'i' } },
        { 'shippingAddress.phone': { $regex: search, $options: 'i' } },
      ];
    }

    if (status && status !== 'all') {
      // Support both payment status and order status filters
      if (['pending', 'paid', 'failed', 'refunded', 'cancelled'].includes(status)) {
        filter.paymentStatus = status;
      } else {
        filter.orderStatus = status;
      }
    }
    
    // If vendor, only show orders containing their products
    if (currentUser && isVendor(currentUser)) {
      filter['items.vendorId'] = currentUser.id;
    }

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      db
        .collection('orders')
        .find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection('orders').countDocuments(filter),
    ]);

    const serializedOrders = orders.map(order => {
      // Use actual status from database - no fallback to 'pending'
      return {
        ...order,
        _id: order._id?.toString(),
        // Keep original orderStatus and paymentStatus from database - don't override
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
      };
    });

    return NextResponse.json({
      orders: serializedOrders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('[v0] Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 },
    );
  }
}


