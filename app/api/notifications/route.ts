import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, isVendor } from '@/lib/auth';
import {
  getAllNotifications,
  getUnreadNotificationCount,
} from '@/lib/models/notification';

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');

    const notifications = await getAllNotifications(
      limit,
      unreadOnly,
      currentUser.id
    );
    const unreadCount = await getUnreadNotificationCount(currentUser.id);

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount,
    });
  } catch (error: any) {
    console.error('[Notification API] Error fetching notifications:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}
