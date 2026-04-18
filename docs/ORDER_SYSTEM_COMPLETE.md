# Complete Order System Documentation

## Overview
This document describes the complete order functionality system with email confirmations, admin notifications, and real-time updates.

## System Architecture

### Flow Diagram
```
User Places Order
    ↓
Order Saved to Database
    ↓
┌─────────────────────────┬──────────────────────────┐
│                         │                          │
Email Sent to Customer    Admin Notification Created  Socket.io Event (if enabled)
    ↓                          ↓                              ↓
Order Confirmation Email   Notification in DB         Real-time Update to Admin
    ↓                          ↓                              ↓
Customer Receives Email    Admin Bell Shows Badge     Admin Sees Notification Instantly
```

## Folder Structure

```
e-commerce/
├── lib/
│   ├── models/
│   │   ├── order.ts              # Order model and functions
│   │   ├── notification.ts       # Notification model and functions ✨ NEW
│   │   ├── payment.ts            # Payment model
│   │   └── customer.ts           # Customer model
│   ├── email.ts                  # Email service with templates ✨ UPDATED
│   └── socket/
│       └── server.ts             # Socket.io server setup ✨ UPDATED
│
├── app/
│   ├── api/
│   │   ├── orders/
│   │   │   ├── route.ts          # Order creation/listing ✨ UPDATED
│   │   │   └── [id]/route.ts     # Order details
│   │   └── notifications/
│   │       ├── route.ts          # Get/create notifications ✨ NEW
│   │       ├── [id]/route.ts     # Mark notification as read ✨ NEW
│   │       └── mark-all-read/
│   │           └── route.ts      # Mark all as read ✨ NEW
│   │
│   ├── order-success/
│   │   └── [id]/page.tsx         # Order success page ✅ EXISTS
│   │
│   └── admin/
│       └── orders/
│           └── [id]/page.tsx     # Admin order detail page ✅ EXISTS
│
└── components/
    ├── admin/
    │   └── notification-bell.tsx # Admin notification bell ✨ NEW
    └── layout/
        └── top-bar.tsx           # Admin top bar ✨ UPDATED
```

## Backend Implementation

### 1. Notification Model (`lib/models/notification.ts`)

**Features:**
- Create notifications
- Get all notifications (with unread filter)
- Get unread count
- Mark notification as read
- Mark all as read
- Get notification by ID

**Notification Types:**
- `order_placed` - New order received
- `order_confirmed` - Order confirmed
- `order_shipped` - Order shipped
- `order_delivered` - Order delivered
- `order_cancelled` - Order cancelled
- `payment_received` - Payment received
- `payment_failed` - Payment failed
- `refund_processed` - Refund processed
- `system_alert` - System alerts

### 2. Email Service (`lib/email.ts`)

**New Function:**
- `generateOrderConfirmationEmailHTML()` - Beautiful HTML email template

**Email Template Features:**
- Order number and date
- Complete order items list
- Pricing breakdown
- Shipping address
- Payment method
- Link to view order details
- Responsive design
- Brand colors

### 3. Order Creation API (`app/api/orders/route.ts`)

**Updated Flow:**
1. Create order in database
2. Create payment record
3. Clear customer cart
4. Update customer stats
5. **Send order confirmation email** (async, non-blocking)
6. **Create admin notification** (async, non-blocking)
7. **Emit Socket.io event** (if enabled)

### 4. Notification APIs

#### `GET /api/notifications`
- Get all notifications for admin
- Query params: `?unreadOnly=true&limit=50`
- Returns: `{ success, notifications, unreadCount }`

#### `POST /api/notifications`
- Create notification (internal use)
- Body: `{ type, title, message, orderId, orderNumber, customerId, customerName, metadata }`

#### `PUT /api/notifications/[id]`
- Mark notification as read
- Returns updated notification

#### `PUT /api/notifications/mark-all-read`
- Mark all notifications as read
- Returns count of marked notifications

#### `GET /api/notifications/[id]`
- Get notification by ID

### 5. Socket.io Setup (`lib/socket/server.ts`)

**Features:**
- Real-time notification delivery
- Admin room for notifications
- Customer rooms for order updates
- Order-specific rooms

**Events:**
- `notification:new` - New notification created
- `notification:read` - Notification marked as read
- `order:status:update` - Order status changed
- `payment:status:update` - Payment status changed

## Frontend Implementation

### 1. Admin Notification Bell (`components/admin/notification-bell.tsx`)

**Features:**
- Notification bell icon with unread count badge
- Dropdown with notification list
- Click notification to open order detail
- Mark as read on click
- Mark all as read button
- Auto-refresh every 10 seconds (polling)
- Real-time updates via Socket.io (if enabled)
- Color-coded notification types
- Time ago formatting

**Integration:**
- Added to `components/layout/top-bar.tsx`
- Replaces existing notification dropdown

### 2. Order Success Page (`app/order-success/[id]/page.tsx`)

**Features:**
- ✅ Already exists and working
- Shows order confirmation
- Displays order details
- Shows shipping/billing addresses
- Payment information
- Links to continue shopping or view orders

### 3. Admin Order Detail Page (`app/admin/orders/[id]/page.tsx`)

**Features:**
- ✅ Already exists
- Can be opened from notification click
- Shows full order details
- Allows status updates

## Real-time Notification Options

### Option 1: Polling (Current Implementation)
- ✅ Simple and reliable
- ✅ Works without additional setup
- ✅ No server configuration needed
- Polls every 10 seconds
- **Status: ACTIVE**

### Option 2: Socket.io (Available)
- ⚡ Real-time updates
- ⚡ No polling overhead
- Requires custom server setup
- **Status: READY (needs activation)**

### Option 3: Server-Sent Events (SSE)
- Alternative to Socket.io
- Simpler than WebSockets
- Can be implemented if needed

## Installation & Setup

### 1. Dependencies

All required packages are already installed:
- ✅ `nodemailer` - Email sending
- ✅ `date-fns` - Date formatting
- ✅ `socket.io` - Real-time (optional)

### 2. Environment Variables

Add to `.env`:
```env
# Email Configuration (already configured in lib/email.ts)
# SMTP settings are in the code - update if needed

# Socket.io (optional)
NEXT_PUBLIC_ENABLE_SOCKET=false  # Set to true to enable Socket.io
NEXT_PUBLIC_APP_URL=https://jewellery-commrce-824e.vercel.app
```

### 3. Database

The system automatically creates the `notifications` collection in MongoDB when first notification is created.

**Collection Structure:**
```javascript
{
  _id: ObjectId,
  type: 'order_placed',
  title: 'New Order Placed',
  message: 'New order ORD-123 placed by John Doe for ₹1,500',
  orderId: ObjectId,
  orderNumber: 'ORD-123',
  customerId: ObjectId,
  customerName: 'John Doe',
  isRead: false,
  readAt: Date,
  metadata: { amount: 1500, itemCount: 2 },
  createdAt: Date,
  updatedAt: Date
}
```

## Usage Guide

### For Customers

1. **Place Order:**
   - Add items to cart
   - Go to checkout
   - Fill shipping/billing addresses
   - Click "Place Order"
   - Redirected to order success page
   - Receives confirmation email

2. **View Orders:**
   - Go to `/orders` or `/account`
   - See all their orders
   - Click to view order details

### For Admins

1. **View Notifications:**
   - Click notification bell in top bar
   - See unread count badge
   - View notification list
   - Click notification to open order

2. **Mark as Read:**
   - Click notification (auto-marks as read)
   - Or click "Mark all read" button

3. **Order Management:**
   - Click notification to open order detail
   - Update order status
   - Update payment status
   - Add tracking information

## API Endpoints Summary

### Order APIs
- `POST /api/orders` - Create order (sends email + creates notification)
- `GET /api/orders` - Get customer orders
- `GET /api/orders/[id]` - Get order details

### Notification APIs
- `GET /api/notifications` - Get all notifications (admin)
- `POST /api/notifications` - Create notification (internal)
- `GET /api/notifications/[id]` - Get notification by ID
- `PUT /api/notifications/[id]` - Mark as read
- `PUT /api/notifications/mark-all-read` - Mark all as read

## Testing Checklist

- [x] Order creation saves to database
- [x] Order confirmation email sent to customer
- [x] Admin notification created on order placement
- [x] Notification bell shows unread count
- [x] Clicking notification opens order detail
- [x] Marking notification as read works
- [x] Mark all as read works
- [x] Polling updates notifications every 10 seconds
- [ ] Socket.io real-time updates (optional)
- [x] Order success page displays correctly
- [x] Email template renders correctly

## Email Template Preview

The order confirmation email includes:
- ✅ Order number and date
- ✅ Complete item list with quantities
- ✅ Pricing breakdown (subtotal, discount, shipping, tax, total)
- ✅ Shipping address
- ✅ Payment method
- ✅ Link to view order details
- ✅ Responsive design
- ✅ Brand colors

## Socket.io Activation (Optional)

To enable real-time notifications via Socket.io:

1. **Install Socket.io client:**
   ```bash
   npm install socket.io-client
   ```

2. **Create custom server** (`server.js`):
   ```javascript
   const { createServer } = require('http');
   const { parse } = require('url');
   const next = require('next');
   const { initializeSocket } = require('./lib/socket/server');

   const dev = process.env.NODE_ENV !== 'production';
   const app = next({ dev });
   const handle = app.getRequestHandler();

   app.prepare().then(() => {
     const server = createServer((req, res) => {
       const parsedUrl = parse(req.url, true);
       handle(req, res, parsedUrl);
     });

     // Initialize Socket.io
     initializeSocket(server);

     server.listen(3000, (err) => {
       if (err) throw err;
       console.log('> Ready on https://jewellery-commrce-824e.vercel.app');
     });
   });
   ```

3. **Update package.json:**
   ```json
   "scripts": {
     "dev": "node server.js",
     "start": "node server.js"
   }
   ```

4. **Set environment variable:**
   ```env
   NEXT_PUBLIC_ENABLE_SOCKET=true
   ```

5. **Update notification bell** to use Socket.io hook (already prepared)

## Troubleshooting

### Email Not Sending
- Check SMTP credentials in `lib/email.ts`
- Verify email server connection
- Check spam folder
- Review server logs

### Notifications Not Showing
- Verify admin is logged in
- Check API authentication
- Review browser console for errors
- Verify database connection

### Socket.io Not Working
- Ensure custom server is running
- Check Socket.io client connection
- Verify environment variables
- Review server logs
- Fallback to polling if needed

## Performance Considerations

1. **Email Sending:**
   - Done asynchronously (non-blocking)
   - Won't delay order creation
   - Errors logged but don't fail order

2. **Notification Creation:**
   - Done asynchronously (non-blocking)
   - Won't delay order creation
   - Errors logged but don't fail order

3. **Polling:**
   - 10-second interval (configurable)
   - Stops when component unmounts
   - Can be adjusted based on needs

4. **Socket.io:**
   - Real-time (no polling overhead)
   - Better for high-traffic sites
   - Requires additional setup

## Security

- ✅ All APIs require authentication
- ✅ Admin-only notification access
- ✅ Customer can only see their orders
- ✅ Order ownership verification
- ✅ Email contains no sensitive data
- ✅ Notifications don't expose sensitive info

## Future Enhancements

- [ ] Email templates customization
- [ ] Notification preferences
- [ ] Push notifications (browser)
- [ ] SMS notifications
- [ ] WhatsApp notifications
- [ ] Notification categories/filters
- [ ] Notification history archive
- [ ] Bulk notification actions

## Support

For issues or questions:
1. Check server logs
2. Review browser console
3. Verify database connectivity
4. Check email service status
5. Review API responses

---

**Status: ✅ COMPLETE AND READY TO USE**

All features are implemented and tested. The system uses polling by default (reliable and simple) with Socket.io available as an optional enhancement for real-time updates.


