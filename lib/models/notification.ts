import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export type NotificationType = 
  | 'order_placed'
  | 'order_confirmed'
  | 'order_shipped'
  | 'order_delivered'
  | 'order_cancelled'
  | 'payment_received'
  | 'payment_failed'
  | 'refund_processed'
  | 'system_alert'
  | 'withdrawal_request'
  | 'withdrawal_approved'
  | 'withdrawal_rejected';

export interface Notification {
  _id?: string | ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  orderId?: string | ObjectId;
  orderNumber?: string;
  customerId?: string | ObjectId;
  customerName?: string;
  isRead: boolean;
  readAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt?: Date;
}

// Create notification
export async function createNotification(notificationData: Omit<Notification, '_id' | 'createdAt' | 'updatedAt'>) {
  try {
    const { db } = await connectToDatabase();
    
    const notification: Notification = {
      ...notificationData,
      isRead: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('notifications').insertOne(notification);
    
    const createdNotification = {
      ...notification,
      _id: result.insertedId.toString(),
    };

    // Send push notification (async, don't wait)
    try {
      const { sendPushNotification, sendPushNotificationToAdmins } = await import('@/lib/push-sender');
      
      // If customerId is provided, send to customer
      if (notificationData.customerId) {
        const customerId = typeof notificationData.customerId === 'string' 
          ? notificationData.customerId 
          : notificationData.customerId.toString();
        
        sendPushNotification(customerId, 'customer', {
          title: notificationData.title,
          message: notificationData.message,
          orderId: notificationData.orderId?.toString(),
          orderNumber: notificationData.orderNumber,
          customerId: customerId,
          type: notificationData.type,
          data: notificationData.metadata,
        }).catch((error) => {
          console.error('[Notification] Error sending push to customer:', error);
        });
      } else {
        // Send to all admins for admin notifications
        sendPushNotificationToAdmins({
          title: notificationData.title,
          message: notificationData.message,
          orderId: notificationData.orderId?.toString(),
          orderNumber: notificationData.orderNumber,
          customerId: notificationData.customerId?.toString(),
          type: notificationData.type,
          data: notificationData.metadata,
        }).catch((error) => {
          console.error('[Notification] Error sending push to admins:', error);
        });
      }
    } catch (pushError) {
      // Push notification is optional, don't fail if it errors
      console.log('[Notification] Push notification not available:', pushError);
    }
    
    return createdNotification;
  } catch (error) {
    console.error('[Notification] Error creating notification:', error);
    throw error;
  }
}

// Get all notifications (for admin and vendors)
export async function getAllNotifications(limit: number = 50, unreadOnly: boolean = false, vendorId?: string) {
  try {
    const { db } = await connectToDatabase();
    
    const filter: any = {};
    if (unreadOnly) {
      filter.isRead = false;
    }
    
    // If vendorId is provided, filter notifications by orders containing vendor's products
    // OR withdrawal notifications for this vendor
    if (vendorId) {
      // First, get all order IDs that contain this vendor's products
      const vendorOrders = await db.collection('orders')
        .find({ 'items.vendorId': vendorId })
        .project({ _id: 1 })
        .toArray();
      
      const vendorOrderIds = vendorOrders.map(order => order._id);
      
      // Build filter: either order-based notifications OR withdrawal notifications for this vendor
      const orConditions: any[] = [];
      
      // Order-based notifications
      if (vendorOrderIds.length > 0) {
        orConditions.push(
          { orderId: { $in: vendorOrderIds } }, // ObjectId format
          { orderId: { $in: vendorOrderIds.map(id => id.toString()) } } // String format
        );
      }
      
      // Withdrawal notifications (check metadata.vendorId)
      orConditions.push(
        { 'metadata.vendorId': vendorId }
      );
      
      if (orConditions.length > 0) {
        filter.$or = orConditions;
      } else {
        // No orders or withdrawals for this vendor, return empty array
        return [];
      }
    }
    
    const notifications = await db
      .collection('notifications')
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return notifications.map(notif => ({
      ...notif,
      _id: notif._id.toString(),
      orderId: notif.orderId?.toString(),
      customerId: notif.customerId?.toString(),
    })) as Notification[];
  } catch (error) {
    console.error('[Notification] Error fetching notifications:', error);
    throw error;
  }
}

// Get unread count
export async function getUnreadNotificationCount(vendorId?: string) {
  try {
    const { db } = await connectToDatabase();
    
    const filter: any = { isRead: false };
    
    // If vendorId is provided, filter notifications by orders containing vendor's products
    // OR withdrawal notifications for this vendor
    if (vendorId) {
      // Get all order IDs that contain this vendor's products
      const vendorOrders = await db.collection('orders')
        .find({ 'items.vendorId': vendorId })
        .project({ _id: 1 })
        .toArray();
      
      const vendorOrderIds = vendorOrders.map(order => order._id);
      
      // Build filter: either order-based notifications OR withdrawal notifications for this vendor
      const orConditions: any[] = [];
      
      // Order-based notifications
      if (vendorOrderIds.length > 0) {
        orConditions.push(
          { orderId: { $in: vendorOrderIds } }, // ObjectId format
          { orderId: { $in: vendorOrderIds.map(id => id.toString()) } } // String format
        );
      }
      
      // Withdrawal notifications (check metadata.vendorId)
      orConditions.push(
        { 'metadata.vendorId': vendorId }
      );
      
      if (orConditions.length > 0) {
        filter.$or = orConditions;
      } else {
        // No orders or withdrawals for this vendor, return 0
        return 0;
      }
    }
    
    const count = await db.collection('notifications').countDocuments(filter);
    
    return count;
  } catch (error) {
    console.error('[Notification] Error counting unread notifications:', error);
    throw error;
  }
}

// Mark notification as read
export async function markNotificationAsRead(notificationId: string) {
  try {
    const { db } = await connectToDatabase();
    
    if (!ObjectId.isValid(notificationId)) {
      throw new Error('Invalid notification ID');
    }

    const result = await db.collection('notifications').findOneAndUpdate(
      { _id: new ObjectId(notificationId) },
      { 
        $set: { 
          isRead: true,
          readAt: new Date(),
          updatedAt: new Date(),
        } 
      },
      { returnDocument: 'after' }
    );

    return result?.value as Notification | null;
  } catch (error) {
    console.error('[Notification] Error marking notification as read:', error);
    throw error;
  }
}

// Mark all notifications as read
export async function markAllNotificationsAsRead() {
  try {
    const { db } = await connectToDatabase();
    
    const result = await db.collection('notifications').updateMany(
      { isRead: false },
      { 
        $set: { 
          isRead: true,
          readAt: new Date(),
          updatedAt: new Date(),
        } 
      }
    );

    return result.modifiedCount;
  } catch (error) {
    console.error('[Notification] Error marking all notifications as read:', error);
    throw error;
  }
}

// Get notification by ID
export async function getNotificationById(notificationId: string) {
  try {
    const { db } = await connectToDatabase();
    
    if (!ObjectId.isValid(notificationId)) {
      return null;
    }

    const notification = await db.collection('notifications').findOne({
      _id: new ObjectId(notificationId),
    });

    if (!notification) {
      return null;
    }

    return {
      ...notification,
      _id: notification._id.toString(),
      orderId: notification.orderId?.toString(),
      customerId: notification.customerId?.toString(),
    } as Notification;
  } catch (error) {
    console.error('[Notification] Error fetching notification:', error);
    throw error;
  }
}


