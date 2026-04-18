import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getUserFromRequest, isVendor } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    
    // Get current user from token
    const currentUser = getUserFromRequest(request);
    
    // Build filter based on user role
    const productFilter: any = {};
    const orderFilter: any = {};
    
    if (currentUser && isVendor(currentUser)) {
      // Vendors only see their own stats
      productFilter.vendorId = currentUser.id;
      orderFilter['items.vendorId'] = currentUser.id;
    }

    // Get total products
    const totalProducts = await db.collection('products').countDocuments(productFilter);

    // Get total orders (if exists)
    const totalOrders = await db.collection('orders').countDocuments(orderFilter).catch(() => 0);

    // Get revenue from orders
    const revenueAggregation = [
      ...(Object.keys(orderFilter).length > 0 ? [{ $match: orderFilter }] : []),
      { $group: { _id: null, total: { $sum: '$total' } } }
    ];
    
    const revenueResult = await db.collection('orders')
      .aggregate(revenueAggregation)
      .toArray()
      .catch(() => []);

    const revenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

    // Get total customers (only for admins, vendors don't need this)
    const customers = currentUser && isVendor(currentUser) 
      ? 0 
      : await db.collection('users').countDocuments().catch(() => 0);

    return NextResponse.json({
      totalProducts,
      totalOrders,
      revenue,
      customers,
    });
  } catch (error) {
    console.error('[v0] Error fetching stats:', error);
    return NextResponse.json(
      { totalProducts: 0, totalOrders: 0, revenue: 0, customers: 0 }
    );
  }
}
