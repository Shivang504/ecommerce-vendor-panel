// Helper function to send push notifications when notifications are created
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// Dynamic import for web-push (optional dependency)
let webpush: any;
try {
  webpush = require('web-push');
} catch (e) {
  console.warn('[Push] web-push not installed');
}

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';

if (webpush && VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export interface PushNotificationData {
  title: string;
  message: string;
  orderId?: string;
  orderNumber?: string;
  customerId?: string;
  type?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
}

// Send push notification to specific user
export async function sendPushNotification(
  userId: string,
  userType: 'customer' | 'admin',
  notificationData: PushNotificationData
): Promise<{ sent: number; failed: number }> {
  if (!webpush) {
    console.log('[Push] web-push not available, skipping push notification');
    return { sent: 0, failed: 0 };
  }

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.log('[Push] VAPID keys not configured, skipping push notification');
    return { sent: 0, failed: 0 };
  }

  try {
    const { db } = await connectToDatabase();

    // Get subscriptions for user
    const subscriptions = await db.collection('push_subscriptions').find({
      userId: new ObjectId(userId),
      userType: userType,
    }).toArray();

    if (subscriptions.length === 0) {
      return { sent: 0, failed: 0 };
    }

    // Prepare payload
    const payload = JSON.stringify({
      title: notificationData.title,
      message: notificationData.message,
      icon: notificationData.icon || '/icon-192x192.png',
      badge: notificationData.badge || '/icon-192x192.png',
      tag: notificationData.tag || notificationData.type || 'notification',
      data: {
        orderId: notificationData.orderId,
        orderNumber: notificationData.orderNumber,
        customerId: notificationData.customerId,
        type: notificationData.type,
        ...notificationData.data,
      },
      requireInteraction: false,
    });

    // Send to all subscriptions
    const results = await Promise.allSettled(
      subscriptions.map(async (subscription) => {
        try {
          const pushSubscription = {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.keys.p256dh,
              auth: subscription.keys.auth,
            },
          };

          await webpush.sendNotification(pushSubscription, payload);
          return { success: true };
        } catch (error: any) {
          // If subscription is invalid, remove it
          if (error.statusCode === 410 || error.statusCode === 404) {
            await db.collection('push_subscriptions').deleteOne({
              _id: subscription._id,
            });
          }
          throw error;
        }
      })
    );

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.length - successful;

    return { sent: successful, failed };
  } catch (error) {
    console.error('[Push] Error sending push notification:', error);
    return { sent: 0, failed: 0 };
  }
}

// Send push notification to all admins
export async function sendPushNotificationToAdmins(
  notificationData: PushNotificationData
): Promise<{ sent: number; failed: number }> {
  if (!webpush) {
    console.log('[Push] web-push not available, skipping push notification');
    return { sent: 0, failed: 0 };
  }

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.log('[Push] VAPID keys not configured, skipping push notification');
    return { sent: 0, failed: 0 };
  }

  try {
    const { db } = await connectToDatabase();

    // Get all admin subscriptions
    const subscriptions = await db.collection('push_subscriptions').find({
      userType: 'admin',
    }).toArray();

    if (subscriptions.length === 0) {
      return { sent: 0, failed: 0 };
    }

    // Prepare payload
    const payload = JSON.stringify({
      title: notificationData.title,
      message: notificationData.message,
      icon: notificationData.icon || '/icon-192x192.png',
      badge: notificationData.badge || '/icon-192x192.png',
      tag: notificationData.tag || notificationData.type || 'notification',
      data: {
        orderId: notificationData.orderId,
        orderNumber: notificationData.orderNumber,
        customerId: notificationData.customerId,
        type: notificationData.type,
        ...notificationData.data,
      },
      requireInteraction: false,
    });

    // Send to all subscriptions
    const results = await Promise.allSettled(
      subscriptions.map(async (subscription) => {
        try {
          const pushSubscription = {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.keys.p256dh,
              auth: subscription.keys.auth,
            },
          };

          await webpush.sendNotification(pushSubscription, payload);
          return { success: true };
        } catch (error: any) {
          // If subscription is invalid, remove it
          if (error.statusCode === 410 || error.statusCode === 404) {
            await db.collection('push_subscriptions').deleteOne({
              _id: subscription._id,
            });
          }
          throw error;
        }
      })
    );

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.length - successful;

    return { sent: successful, failed };
  } catch (error) {
    console.error('[Push] Error sending push notification to admins:', error);
    return { sent: 0, failed: 0 };
  }
}

