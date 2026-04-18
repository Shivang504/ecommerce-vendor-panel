import { getOrderById } from './models/order';
import { connectToDatabase } from './mongodb';

export interface InvoiceData {
  order: any;
  company: {
    name: string;
    address: string;
    gstin?: string;
    phone?: string;
    email?: string;
    logo?: string;
  };
}

export async function getInvoiceData(orderId: string): Promise<InvoiceData> {
  const order = await getOrderById(orderId);
  if (!order) {
    throw new Error('Order not found');
  }

  const { db } = await connectToDatabase();
  const settings = await db.collection('settings').findOne({});

  return {
    order,
    company: {
      name: settings?.siteName || 'Ecommerce Store',
      address: settings?.registeredOfficeAddress || settings?.mailUsAddress || '',
      gstin: settings?.gstin || '',
      phone: settings?.phoneNumber || '',
      email: settings?.email || '',
      logo: settings?.logo || '',
    },
  };
}

export function generateInvoiceHTML(data: InvoiceData): string {
  const { order, company } = data;
  const orderDate = new Date(order.createdAt).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Invoice - ${order.orderNumber}</title>
<style>
body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
.invoice { max-width: 800px; margin: 0 auto; background: white; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
.header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #401d5d; padding-bottom: 20px; }
.company-info h1 { margin: 0; color: #401d5d; font-size: 24px; }
.company-info p { margin: 5px 0; color: #666; font-size: 14px; }
.invoice-info { text-align: right; }
.invoice-info h2 { margin: 0; color: #401d5d; font-size: 20px; }
.invoice-info p { margin: 5px 0; color: #666; font-size: 14px; }
.section { margin: 20px 0; }
.section h3 { color: #333; font-size: 16px; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
.table { width: 100%; border-collapse: collapse; margin: 15px 0; }
.table th { background: #f9f9f9; padding: 12px; text-align: left; border-bottom: 2px solid #401d5d; color: #333; font-weight: bold; }
.table td { padding: 12px; border-bottom: 1px solid #eee; }
.table tr:last-child td { border-bottom: none; }
.text-right { text-align: right; }
.total-row { background: #f9f9f9; font-weight: bold; font-size: 16px; }
.footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 12px; }
</style>
</head>
<body>
<div class="invoice">
<div class="header">
<div class="company-info">
${company.logo ? `<img src="${company.logo}" alt="${company.name}" style="max-height: 60px; margin-bottom: 10px;" />` : ''}
<h1>${company.name}</h1>
${company.address ? `<p>${company.address}</p>` : ''}
${company.phone ? `<p>Phone: ${company.phone}</p>` : ''}
${company.email ? `<p>Email: ${company.email}</p>` : ''}
${company.gstin ? `<p>GSTIN: ${company.gstin}</p>` : ''}
</div>
<div class="invoice-info">
<h2>INVOICE</h2>
<p><strong>Invoice No:</strong> ${order.orderNumber}</p>
<p><strong>Date:</strong> ${orderDate}</p>
${order.tracking?.trackingNumber ? `<p><strong>Tracking:</strong> ${order.tracking.trackingNumber}</p>` : ''}
</div>
</div>

<div class="section">
<h3>Bill To</h3>
<p><strong>${order.shippingAddress.name}</strong></p>
<p>${order.shippingAddress.street}</p>
<p>${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.postalCode}</p>
<p>Phone: ${order.shippingAddress.phone}</p>
</div>

<div class="section">
<h3>Items</h3>
<table class="table">
<thead>
<tr>
<th>Item</th>
<th>Qty</th>
<th>Price</th>
<th>Total</th>
</tr>
</thead>
<tbody>
${order.items.map((item: any) => `
<tr>
<td>${item.productName}</td>
<td>${item.quantity}</td>
<td>₹${item.price.toLocaleString('en-IN')}</td>
<td>₹${item.total.toLocaleString('en-IN')}</td>
</tr>
`).join('')}
</tbody>
</table>
</div>

<div class="section">
<table class="table">
<tr>
<td class="text-right"><strong>Subtotal</strong></td>
<td class="text-right">₹${order.pricing.subtotal.toLocaleString('en-IN')}</td>
</tr>
${order.pricing.discount > 0 ? `
<tr>
<td class="text-right"><strong>Discount</strong></td>
<td class="text-right">-₹${order.pricing.discount.toLocaleString('en-IN')}</td>
</tr>
` : ''}
${order.pricing.shipping > 0 ? `
<tr>
<td class="text-right"><strong>Shipping</strong></td>
<td class="text-right">₹${order.pricing.shipping.toLocaleString('en-IN')}</td>
</tr>
` : ''}
<tr class="total-row">
<td class="text-right"><strong>Total</strong></td>
<td class="text-right">₹${order.pricing.total.toLocaleString('en-IN')}</td>
</tr>
</table>
</div>

<div class="section">
<p><strong>Payment Method:</strong> ${order.payment?.actualPaymentMethod || (order.payment?.paymentMethod === 'cod' ? 'Cash on Delivery' : order.payment?.paymentMethod?.toUpperCase() || 'N/A')}</p>
<p><strong>Payment Status:</strong> ${order.paymentStatus?.toUpperCase() || 'PENDING'}</p>
</div>

<div class="footer">
<p>Thank you for your business!</p>
<p>This is a computer-generated invoice and does not require a signature.</p>
</div>
</div>
</body>
</html>`;
}

export function generatePaymentReceiptHTML(data: InvoiceData): string {
  const { order, company } = data;
  const paymentDate = order.payment?.paidAt 
    ? new Date(order.payment.paidAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
    : new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Payment Receipt - ${order.orderNumber}</title>
<style>
body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
.receipt { max-width: 600px; margin: 0 auto; background: white; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
.header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #22c55e; padding-bottom: 20px; }
.header h1 { margin: 0; color: #22c55e; font-size: 28px; }
.header p { margin: 5px 0; color: #666; }
.info { margin: 20px 0; }
.info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
.info-row strong { color: #333; }
.amount { text-align: center; margin: 30px 0; padding: 20px; background: #f0f9ff; border-radius: 8px; }
.amount h2 { margin: 0; color: #22c55e; font-size: 32px; }
.footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
</style>
</head>
<body>
<div class="receipt">
<div class="header">
<h1>✓ Payment Receipt</h1>
<p>Receipt No: ${order.orderNumber}</p>
<p>Date: ${paymentDate}</p>
</div>

<div class="info">
<div class="info-row">
<strong>Order Number:</strong>
<span>${order.orderNumber}</span>
</div>
<div class="info-row">
<strong>Payment Method:</strong>
<span>${order.payment?.actualPaymentMethod || (order.payment?.paymentMethod === 'cod' ? 'Cash on Delivery' : order.payment?.paymentMethod?.toUpperCase() || 'N/A')}</span>
</div>
${order.payment?.razorpayPaymentId ? `
<div class="info-row">
<strong>Transaction ID:</strong>
<span>${order.payment.razorpayPaymentId}</span>
</div>
` : ''}
<div class="info-row">
<strong>Payment Status:</strong>
<span style="color: #22c55e; font-weight: bold;">PAID</span>
</div>
</div>

<div class="amount">
<h2>₹${order.pricing.total.toLocaleString('en-IN')}</h2>
<p style="margin: 5px 0; color: #666;">Amount Paid</p>
</div>

<div class="footer">
<p>Thank you for your payment!</p>
<p>This is a computer-generated receipt.</p>
</div>
</div>
</body>
</html>`;
}

export function generateCreditNoteHTML(data: InvoiceData): string {
  const { order, company } = data;
  const creditDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const cancelledItems = order.items?.filter((item: any) => 
    item.itemStatus === 'cancelled' || item.cancelReturnInfo?.status === 'approved'
  ) || [];

  const refundAmount = cancelledItems.reduce((sum: number, item: any) => sum + (item.total || 0), 0);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Credit Note - ${order.orderNumber}</title>
<style>
body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
.credit-note { max-width: 800px; margin: 0 auto; background: white; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
.header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #ef4444; padding-bottom: 20px; }
.company-info h1 { margin: 0; color: #401d5d; font-size: 24px; }
.credit-info h2 { margin: 0; color: #ef4444; font-size: 20px; }
.section { margin: 20px 0; }
.table { width: 100%; border-collapse: collapse; margin: 15px 0; }
.table th { background: #f9f9f9; padding: 12px; text-align: left; border-bottom: 2px solid #ef4444; }
.table td { padding: 12px; border-bottom: 1px solid #eee; }
.text-right { text-align: right; }
.total-row { background: #fee2e2; font-weight: bold; font-size: 16px; color: #ef4444; }
</style>
</head>
<body>
<div class="credit-note">
<div class="header">
<div class="company-info">
<h1>${company.name}</h1>
</div>
<div class="credit-info">
<h2>CREDIT NOTE</h2>
<p><strong>Credit Note No:</strong> CN-${order.orderNumber}</p>
<p><strong>Date:</strong> ${creditDate}</p>
<p><strong>Original Invoice:</strong> ${order.orderNumber}</p>
</div>
</div>

<div class="section">
<h3>Cancelled Items</h3>
<table class="table">
<thead>
<tr>
<th>Item</th>
<th>Qty</th>
<th>Amount</th>
</tr>
</thead>
<tbody>
${cancelledItems.map((item: any) => `
<tr>
<td>${item.productName}</td>
<td>${item.quantity}</td>
<td>₹${item.total.toLocaleString('en-IN')}</td>
</tr>
`).join('')}
</tbody>
</table>
</div>

<div class="section">
<table class="table">
<tr class="total-row">
<td class="text-right"><strong>Total Credit Amount</strong></td>
<td class="text-right">₹${refundAmount.toLocaleString('en-IN')}</td>
</tr>
</table>
</div>

<div class="section">
<p><strong>Note:</strong> This credit note has been issued for the cancelled items from order ${order.orderNumber}. The refund will be processed to your original payment method within 5-7 business days.</p>
</div>
</div>
</body>
</html>`;
}

