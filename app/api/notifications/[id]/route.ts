import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, isVendor } from '@/lib/auth';
import { markNotificationAsRead, getNotificationById } from '@/lib/models/notification';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

async function vendorCanAccessNotification(
  vendorId: string,
  notification: Awaited<ReturnType<typeof getNotificationById>>
) {
  if (!notification) return false;
  if (notification.metadata?.vendorId === vendorId) return true;
  if (!notification.orderId) return false;

  const { db } = await connectToDatabase();
  const order = await db.collection('orders').findOne({
    _id: new ObjectId(notification.orderId),
    'items.vendorId': vendorId,
  });
  return !!order;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const existing = await getNotificationById(id);

    if (!existing) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }

    const allowed = await vendorCanAccessNotification(currentUser.id, existing);
    if (!allowed) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const notification = await markNotificationAsRead(id);

    return NextResponse.json({
      success: true,
      notification: {
        ...notification,
        _id: notification?._id?.toString(),
      },
    });
  } catch (error: any) {
    console.error('[Notification API] Error marking notification as read:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to mark notification as read' },
      { status: 500 }
    );
  }
}
