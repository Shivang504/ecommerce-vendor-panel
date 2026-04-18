# Payment System Documentation

## Overview
Complete payment system setup for e-commerce platform with Razorpay integration (not active yet). Orders can be placed directly without payment processing for now.

## System Components

### 1. Order Model (`lib/models/order.ts`)
Complete order lifecycle management with all statuses:
- **Order Statuses**: pending, confirmed, processing, packed, shipped, out_for_delivery, delivered, cancelled, returned, refunded
- **Payment Statuses**: pending, processing, paid, failed, refunded, partially_refunded, cancelled
- **Payment Methods**: razorpay, cod, stripe, paypal, bank_transfer, wallet

**Key Features:**
- Order number generation
- Complete address management (shipping & billing)
- Coupon integration
- Tracking information
- Lifecycle timestamps
- Order cancellation with refund handling

### 2. Payment Model (`lib/models/payment.ts`)
Payment tracking and management:
- Payment records linked to orders
- Razorpay-specific fields (Order ID, Payment ID, Signature)
- Refund tracking
- Multiple payment gateway support
- Transaction history

### 3. Razorpay Integration (`lib/payment/razorpay.ts`)
**Status**: Setup ready but commented out (not active)

**Functions Available:**
- `createRazorpayOrder()` - Create payment order
- `verifyRazorpaySignature()` - Verify payment signature
- `getRazorpayPayment()` - Fetch payment details
- `createRazorpayRefund()` - Process refunds
- `getRazorpayRefund()` - Get refund status

**To Activate:**
1. Uncomment all code in `lib/payment/razorpay.ts`
2. Install: `npm install razorpay`
3. Add to `.env`:
   ```
   RAZORPAY_KEY_ID=your_key_id
   RAZORPAY_KEY_SECRET=your_key_secret
   ```

### 4. Socket.io Setup (`lib/socket/server.ts`)
**Status**: Setup ready but commented out (not active)

**Real-time Features:**
- Order status updates
- Payment status updates
- Tracking information updates
- Customer-specific rooms
- Admin notification room

**To Activate:**
1. Uncomment all code in `lib/socket/server.ts`
2. Install: `npm install socket.io`
3. Initialize in server setup

### 5. Order Placement API (`app/api/orders/route.ts`)

**POST `/api/orders`** - Create Order
- Direct order placement (no payment required)
- Cart to order conversion
- Coupon validation and application
- Address validation
- Stock checking (can be added)
- Cart clearing after order

**GET `/api/orders`** - Get Customer Orders
- Returns all orders for authenticated customer
- Sorted by creation date (newest first)

### 6. Order Tracking API (`app/api/orders/track/route.ts`)

**POST `/api/orders/track`** - Track Order (No Login Required)
- Track by Order Number + Email
- Email verification
- Returns order status and tracking info

### 7. Order Detail API (`app/api/orders/[id]/route.ts`)

**GET `/api/orders/[id]`** - Get Order Details
- Full order information
- Customer authorization check
- Complete order history

## Order Lifecycle Flow

```
1. Order Placement (pending)
   ↓
2. Order Confirmation (confirmed)
   ↓
3. Processing (processing)
   ↓
4. Packaging (packed)
   ↓
5. Shipping (shipped)
   ↓
6. Out for Delivery (out_for_delivery)
   ↓
7. Delivered (delivered)

OR

Cancelled → Refund Process → Refunded
Returned → Refund Process → Refunded
```

## Payment Flow (When Activated)

### For Razorpay:
1. Create Razorpay Order → Get Order ID
2. Initiate Payment → Redirect to Razorpay
3. Payment Success → Verify Signature
4. Update Order Payment Status → paid
5. Update Order Status → confirmed

### For COD:
1. Create Order → paymentStatus: pending
2. Order Confirmation → paymentStatus: pending
3. Delivery → paymentStatus: paid

## Admin Features

### Order Management
- View all orders
- Filter by status
- Search by order number/customer
- Update order status
- Update payment status
- Add tracking information
- Process refunds

### Payment Management
- View payment history
- Filter by payment method
- Filter by payment status
- Process refunds
- View transaction details

## Customer Features

### Order Tracking (Not yet implemented)
1. **Track Order Page** - Enter Order ID + Email
2. **My Orders Page** - View all orders (logged in)
3. **Order Detail Page** - Full order details with tracking

### Payment Status
- Real-time payment updates (with Socket.io)
- Payment history
- Refund status

## Edge Cases Handled

### Payment Failures
- Failed payment tracking
- Retry payment option (future)
- Automatic order cancellation after timeout (future)

### Refunds
- Full refund
- Partial refund
- Refund status tracking
- Refund reason tracking

### Order Cancellation
- Before shipping → Easy cancellation
- After shipping → Return process
- Refund processing
- Stock restoration (future)

### Coupon Validation
- Minimum spend check
- Product restrictions
- Date validity
- Usage limits
- First order only
- Already applied check

## Database Collections

### orders
- Complete order information
- Payment details
- Tracking information
- Lifecycle timestamps

### payments
- Payment records
- Transaction details
- Refund information
- Gateway-specific data

## Environment Variables Needed (Future)

```env
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
NEXT_PUBLIC_APP_URL=https://jewellery-commrce-824e.vercel.app
```

## Next Steps to Complete

1. **Create Checkout Page** (`app/checkout/page.tsx`)
   - Address form
   - Payment method selection
   - Order summary
   - Place order button

2. **Create Track Order Page** (`app/track-order/page.tsx`)
   - Order ID input
   - Email input
   - Order status display

3. **Create My Orders Page** (`app/my-orders/page.tsx`)
   - List of all orders
   - Order status badges
   - Quick actions

4. **Create Order Detail Page** (`app/orders/[id]/page.tsx`)
   - Full order details
   - Tracking timeline
   - Payment status
   - Invoice download (future)

5. **Create Admin Order Management** (Enhance existing)
   - Status update interface
   - Tracking update form
   - Refund processing
   - Payment status management

6. **Razorpay Webhook Handler** (`app/api/payments/webhook/route.ts`)
   - Payment success callback
   - Payment failure callback
   - Refund callback

7. **Activate Socket.io** (when ready)
   - Server initialization
   - Real-time updates
   - Client connection

## Testing Checklist

- [ ] Order placement with COD
- [ ] Order placement with coupon
- [ ] Order cancellation
- [ ] Order status updates
- [ ] Payment status updates
- [ ] Tracking updates
- [ ] Refund processing
- [ ] Order tracking by ID+Email
- [ ] Customer order list
- [ ] Admin order management
- [ ] Razorpay integration (when activated)
- [ ] Socket.io updates (when activated)

## Files Created

1. `lib/models/order.ts` - Order model and functions
2. `lib/models/payment.ts` - Payment model and functions
3. `lib/payment/razorpay.ts` - Razorpay integration (inactive)
4. `lib/socket/server.ts` - Socket.io setup (inactive)
5. `app/api/orders/route.ts` - Order creation/listing API
6. `app/api/orders/[id]/route.ts` - Order detail API
7. `app/api/orders/track/route.ts` - Order tracking API

## Notes

- All payment processing is commented out for now
- Orders can be placed directly without payment
- System is ready for Razorpay activation
- Socket.io is ready for real-time updates
- All edge cases are handled in models
- Proper validation and error handling throughout

