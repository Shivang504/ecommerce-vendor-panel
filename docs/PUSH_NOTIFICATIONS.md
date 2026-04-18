# Browser Push Notifications Setup Guide

## Overview
This e-commerce platform now supports browser push notifications for real-time updates about orders, payments, and account activity.

## Features
- ✅ Browser push notifications (Chrome, Firefox, Edge, Safari)
- ✅ Service Worker for background notifications
- ✅ Automatic notification sending when orders are created/updated
- ✅ User-friendly enable/disable interface
- ✅ Support for both customers and admins

## Setup Instructions

### 1. Generate VAPID Keys

VAPID (Voluntary Application Server Identification) keys are required for push notifications. Generate them using:

```bash
npx web-push generate-vapid-keys
```

This will output:
- **Public Key**: Add to `.env` as `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- **Private Key**: Add to `.env` as `VAPID_PRIVATE_KEY`
- **Subject**: Add to `.env` as `VAPID_SUBJECT` (usually your email, e.g., `mailto:admin@example.com`)

### 2. Environment Variables

Add these to your `.env` file:

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_key_here
VAPID_PRIVATE_KEY=your_private_key_here
VAPID_SUBJECT=mailto:admin@example.com
```

### 3. Service Worker

The service worker is located at `public/sw.js` and is automatically registered when users enable push notifications.

### 4. Database Collection

The system automatically creates a `push_subscriptions` collection in MongoDB to store user subscriptions.

## How It Works

### For Customers

1. **Enable Notifications**: 
   - Go to Account → Notifications section
   - Click "Enable Notifications"
   - Allow browser permission when prompted

2. **Receive Notifications**:
   - Order confirmations
   - Order status updates (shipped, delivered, etc.)
   - Payment confirmations
   - Refund notifications

### For Admins

1. **Enable Notifications**:
   - Same process as customers
   - Notifications appear in browser even when admin panel is closed

2. **Receive Notifications**:
   - New order alerts
   - Payment received notifications
   - System alerts

## API Endpoints

### POST `/api/push/subscribe`
Register a push subscription for a user.

**Request Body:**
```json
{
  "subscription": {
    "endpoint": "https://...",
    "keys": {
      "p256dh": "...",
      "auth": "..."
    }
  },
  "userId": "optional",
  "userType": "customer" | "admin"
}
```

### DELETE `/api/push/subscribe`
Unregister a push subscription.

**Request Body:**
```json
{
  "endpoint": "https://..."
}
```

### POST `/api/push/send` (Admin Only)
Manually send push notifications.

**Request Body:**
```json
{
  "userId": "optional",
  "userType": "customer" | "admin",
  "title": "Notification Title",
  "message": "Notification Message",
  "data": {},
  "icon": "optional",
  "badge": "optional",
  "tag": "optional"
}
```

## Integration

Push notifications are automatically sent when:
- Orders are created (`app/api/orders/route.ts`)
- Payments are verified (`app/api/payments/verify/route.ts`)
- Order status is updated (`app/api/admin/orders/[id]/route.ts`)
- Notifications are created via `createNotification()` function

## Components

### PushNotificationManager
Location: `components/notifications/push-notification-manager.tsx`

A React component that handles:
- Requesting notification permission
- Registering/unregistering service worker
- Subscribing/unsubscribing to push notifications
- Displaying enable/disable button

## Browser Support

- ✅ Chrome/Edge (Windows, Mac, Android)
- ✅ Firefox (Windows, Mac, Android)
- ✅ Safari (Mac, iOS 16.4+)
- ❌ Internet Explorer (not supported)

## Troubleshooting

### Notifications Not Working

1. **Check VAPID Keys**: Ensure they're set in `.env`
2. **Check Browser Permission**: User must grant notification permission
3. **Check HTTPS**: Push notifications require HTTPS (or localhost for development)
4. **Check Service Worker**: Open DevTools → Application → Service Workers
5. **Check Console**: Look for `[Push]` prefixed logs

### Common Issues

**"VAPID keys not configured"**
- Add VAPID keys to `.env` file
- Restart the development server

**"Permission denied"**
- User needs to allow notifications in browser settings
- Clear browser cache and try again

**"Service Worker registration failed"**
- Check browser console for errors
- Ensure `public/sw.js` exists
- Check HTTPS requirement

## Testing

1. Enable notifications in Account page
2. Create a test order
3. Check browser for push notification
4. Click notification to verify it opens correct page

## Security

- VAPID keys authenticate the server
- Subscriptions are user-specific
- Invalid subscriptions are automatically removed
- All API endpoints require authentication

## Future Enhancements

- [ ] Notification preferences (what to receive)
- [ ] Notification history
- [ ] Rich notifications with images
- [ ] Action buttons in notifications
- [ ] Notification grouping

