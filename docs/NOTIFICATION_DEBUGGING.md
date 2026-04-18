# Notification System Debugging Guide

## Issue: Notifications Not Showing in Admin Panel

If you placed an order but notifications are not appearing in the admin panel, follow these debugging steps:

## Step 1: Check Browser Console

1. Open the admin panel
2. Press `F12` to open Developer Tools
3. Go to the **Console** tab
4. Look for logs starting with `[NotificationBell]` or `[Notification API]`
5. Check for any errors (red text)

**Expected logs:**
```
[NotificationBell] Fetching notifications...
[NotificationBell] Response status: 200
[NotificationBell] Received data: { success: true, notificationsCount: 1, unreadCount: 1 }
```

**If you see errors:**
- `401 Unauthorized` - Admin token is missing or invalid
- `500 Internal Server Error` - Backend issue
- `Failed to fetch` - Network issue

## Step 2: Check Server Logs

1. Check your terminal/console where the Next.js server is running
2. Look for logs when you place an order:
   - `[Order API] Creating admin notification for order: ORD-XXX`
   - `[Order API] Admin notification created successfully`
3. Look for logs when opening notification bell:
   - `[Notification API] GET request received`
   - `[Notification API] Current user: { id: ..., email: ..., role: ... }`
   - `[Notification API] Found notifications: { count: X, unreadCount: Y }`

## Step 3: Verify Admin Authentication

1. Open browser console
2. Run: `localStorage.getItem('adminToken')`
3. Should return a JWT token string
4. If `null`, you need to log in again

## Step 4: Test Notification API Directly

1. Get your admin token from localStorage
2. Open browser console
3. Run this command:

```javascript
fetch('/api/notifications?limit=20', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
    'Content-Type': 'application/json',
  },
})
  .then(res => res.json())
  .then(data => console.log('Notifications:', data))
  .catch(err => console.error('Error:', err));
```

**Expected response:**
```json
{
  "success": true,
  "notifications": [
    {
      "_id": "...",
      "type": "order_placed",
      "title": "New Order Placed",
      "message": "New order ORD-123 placed by John Doe for ₹1,500",
      "orderId": "...",
      "orderNumber": "ORD-123",
      "isRead": false,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "unreadCount": 1
}
```

## Step 5: Check Database

1. Connect to your MongoDB database
2. Check the `notifications` collection:

```javascript
db.notifications.find().sort({ createdAt: -1 }).limit(5)
```

**Should show:**
- At least one notification document
- `isRead: false` for unread notifications
- `type: "order_placed"` for order notifications

## Step 6: Verify Order Creation

1. Check if order was created successfully
2. Check server logs for:
   - `[Order API] Order created successfully`
   - `[Order API] Creating admin notification for order: ORD-XXX`
   - `[Order API] Admin notification created successfully`

## Common Issues and Solutions

### Issue 1: "Unauthorized" Error

**Cause:** Admin token is missing or invalid

**Solution:**
1. Log out and log back in to the admin panel
2. Verify token is stored: `localStorage.getItem('adminToken')`
3. Check if token is expired (tokens expire after 24 hours)

### Issue 2: Notifications Created But Not Showing

**Cause:** API returning empty array

**Solution:**
1. Check database - are notifications actually there?
2. Check API response - is `success: true`?
3. Check browser console for errors
4. Verify admin authentication is working

### Issue 3: Notification Created But Wrong Data

**Cause:** Order data not passed correctly

**Solution:**
1. Check server logs when order is placed
2. Verify `order._id` and `order.orderNumber` exist
3. Check customer data is available

### Issue 4: Polling Not Working

**Cause:** Component not polling for updates

**Solution:**
1. Check browser console for polling logs
2. Verify component is mounted
3. Check if interval is set (should poll every 10 seconds)
4. Manually trigger: Click the notification bell icon

## Manual Test: Create Test Notification

You can manually create a test notification to verify the system works:

1. Open browser console in admin panel
2. Run:

```javascript
fetch('/api/notifications', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    type: 'order_placed',
    title: 'Test Notification',
    message: 'This is a test notification',
    orderId: 'test-order-id',
    orderNumber: 'TEST-001',
    customerId: 'test-customer-id',
    customerName: 'Test Customer',
    metadata: { amount: 1000, itemCount: 1 },
  }),
})
  .then(res => res.json())
  .then(data => {
    console.log('Test notification created:', data);
    // Refresh notification bell
    window.location.reload();
  })
  .catch(err => console.error('Error:', err));
```

## Quick Fixes

### Fix 1: Clear Cache and Reload
1. Press `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac) to hard refresh
2. Or clear browser cache and reload

### Fix 2: Re-login
1. Log out of admin panel
2. Log back in
3. Check if notifications appear

### Fix 3: Check Network Tab
1. Open Developer Tools → Network tab
2. Click notification bell
3. Look for `/api/notifications` request
4. Check:
   - Status code (should be 200)
   - Response body (should contain notifications)
   - Request headers (should include Authorization)

## Still Not Working?

If none of the above works:

1. **Check server logs** for detailed error messages
2. **Verify MongoDB connection** is working
3. **Check environment variables** are set correctly
4. **Restart the Next.js server**
5. **Check for TypeScript/build errors** in terminal

## Expected Behavior

When everything works correctly:

1. ✅ Customer places order
2. ✅ Order is saved to database
3. ✅ Notification is created in database
4. ✅ Email is sent to customer
5. ✅ Admin sees notification badge (red number) on bell icon
6. ✅ Admin clicks bell → sees notification list
7. ✅ Admin clicks notification → opens order detail page
8. ✅ Notification is marked as read automatically

## Contact Support

If you've tried all steps and it's still not working, provide:
1. Browser console errors
2. Server logs
3. API response from `/api/notifications`
4. Database query results from `notifications` collection

