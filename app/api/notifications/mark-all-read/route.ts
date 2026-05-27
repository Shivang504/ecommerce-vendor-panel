import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, isVendor } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function PUT(request: NextRequest) {
  try {
    const currentUser = getUserFromRequest(request);

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!isVendor(currentUser)) {
      return NextResponse.json(
        { error: 'Access denied. Vendor access required.' },
        { status: 403 }
      );
    }

    const { db } = await connectToDatabase();
    const vendorId = currentUser.id;

    const vendorOrders = await db
      .collection('orders')
      .find({ 'items.vendorId': vendorId })
      .project({ _id: 1 })
      .toArray();

    const vendorOrderIds = vendorOrders.map((order) => order._id);
    const orConditions: Record<string, unknown>[] = [
      { 'metadata.vendorId': vendorId },
    ];

    if (vendorOrderIds.length > 0) {
      orConditions.push(
        { orderId: { $in: vendorOrderIds } },
        { orderId: { $in: vendorOrderIds.map((id) => id.toString()) } }
      );
    }

    const result = await db.collection('notifications').updateMany(
      { isRead: false, $or: orConditions },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: `Marked ${result.modifiedCount} notifications as read`,
      count: result.modifiedCount,
    });
  } catch (error: any) {
    console.error('[Notification API] Error marking all notifications as read:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to mark all notifications as read' },
      { status: 500 }
    );
  }
}
