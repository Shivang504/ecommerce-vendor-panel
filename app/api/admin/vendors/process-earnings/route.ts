import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, isAdmin, isVendor } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { processVendorEarningsFromOrder } from '@/lib/models/vendor-earnings';

/**
 * POST - Process earnings for existing delivered/completed orders that haven't been processed yet
 * Can be called by admin (for all vendors) or vendor (for their own orders only)
 */
export async function POST(request: NextRequest) {
  try {
    const currentUser = getUserFromRequest(request);
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { orderId, vendorId } = await request.json().catch(() => ({}));

    const { db } = await connectToDatabase();

    // If orderId is provided, process that specific order
    if (orderId) {
      if (!ObjectId.isValid(orderId)) {
        return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
      }

      // Check if order exists and has vendor's products (if vendor is calling)
      const order = await db.collection('orders').findOne({ _id: new ObjectId(orderId) });
      if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      // If vendor, check if order has their products
      if (isVendor(currentUser) && order.items) {
        const hasVendorProducts = order.items.some((item: any) => {
          const itemVendorId = item.vendorId?.toString();
          return itemVendorId === currentUser.id;
        });
        
        if (!hasVendorProducts) {
          return NextResponse.json(
            { error: 'Access denied. This order does not contain your products.' },
            { status: 403 }
          );
        }
      }

      // Process earnings for this order
      await processVendorEarningsFromOrder(orderId);
      
      return NextResponse.json({
        success: true,
        message: 'Earnings processed for order',
        orderId,
      });
    }

    // If vendorId is provided (admin only), process all unprocessed orders for that vendor
    if (vendorId) {
      if (!isAdmin(currentUser)) {
        return NextResponse.json(
          { error: 'Access denied. Admin access required to process earnings for specific vendor.' },
          { status: 403 }
        );
      }

      if (!ObjectId.isValid(vendorId)) {
        return NextResponse.json({ error: 'Invalid vendor ID' }, { status: 400 });
      }

      // Find all delivered/completed orders with this vendor's products that haven't been processed
      const orders = await db.collection('orders').find({
        orderStatus: { $in: ['delivered', 'completed'] },
        $or: [
          { vendorEarningsProcessed: { $ne: true } },
          { vendorEarningsProcessed: { $exists: false } },
        ],
        'items.vendorId': new ObjectId(vendorId),
      }).toArray();

      let processedCount = 0;
      for (const order of orders) {
        try {
          await processVendorEarningsFromOrder(order._id.toString());
          processedCount++;
        } catch (error) {
          console.error(`[Process Earnings] Error processing order ${order._id}:`, error);
        }
      }

      return NextResponse.json({
        success: true,
        message: `Processed earnings for ${processedCount} orders`,
        processedCount,
        totalOrders: orders.length,
      });
    }

    // If no orderId or vendorId, process all unprocessed orders
    // If vendor, only process their own orders
    // If admin, process all orders
    
    if (!isAdmin(currentUser) && !isVendor(currentUser)) {
      return NextResponse.json(
        { error: 'Access denied. Admin or Vendor access required.' },
        { status: 403 }
      );
    }

    let query: any = {
      orderStatus: { $in: ['delivered', 'completed'] },
      $or: [
        { vendorEarningsProcessed: { $ne: true } },
        { vendorEarningsProcessed: { $exists: false } },
      ],
    };

    // If vendor, filter to only their orders
    if (isVendor(currentUser)) {
      // Match orders where any item has this vendor's ID (handling both ObjectId and string)
      query['items.vendorId'] = { 
        $in: [new ObjectId(currentUser.id), currentUser.id] 
      };
    }

    // Find all delivered/completed orders that haven't been processed
    const orders = await db.collection('orders').find(query).toArray();
    
    // Additional filtering for vendors: ensure orders actually have their products
    // (in case vendorId wasn't set in items, we'll check from products)
    let filteredOrders = orders;
    if (isVendor(currentUser)) {
      filteredOrders = orders.filter(order => {
        if (!order.items || !Array.isArray(order.items)) return false;
        return order.items.some((item: any) => {
          const itemVendorId = item.vendorId?.toString();
          return itemVendorId === currentUser.id;
        });
      });
    }

    let processedCount = 0;
    for (const order of filteredOrders) {
      try {
        await processVendorEarningsFromOrder(order._id.toString());
        processedCount++;
      } catch (error) {
        console.error(`[Process Earnings] Error processing order ${order._id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed earnings for ${processedCount} orders`,
      processedCount,
      totalOrders: filteredOrders.length,
    });

  } catch (error: any) {
    console.error('[Process Earnings API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process earnings', details: error.message },
      { status: 500 }
    );
  }
}

