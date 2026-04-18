// Additional email templates for order and payment status updates

export function generateOrderStatusUpdateEmailHTML(orderData: {
  customerName: string;
  orderNumber: string;
  orderStatus: string;
  orderId: string;
  tracking?: {
    courierName?: string;
    trackingNumber?: string;
  };
}): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://e-commrce-xi.vercel.app';
  const orderUrl = `${baseUrl}/orders/${orderData.orderId}`;
  const invoiceUrl = `${baseUrl}/api/invoice/${orderData.orderId}`;
  
  const statusMessages: Record<string, { title: string; message: string; color: string }> = {
    confirmed: { title: 'Order Confirmed', message: 'Your order has been confirmed and is being prepared.', color: '#22c55e' },
    processing: { title: 'Order Processing', message: 'Your order is being processed and will be packed soon.', color: '#3b82f6' },
    packed: { title: 'Order Packed', message: 'Your order has been packed and is ready for shipment.', color: '#8b5cf6' },
    ready_for_pickup: { title: 'Ready for Pickup', message: 'Your order is ready for pickup and will be collected by our delivery partner soon.', color: '#3b82f6' },
    shipped: { title: 'Order Shipped', message: 'Your order has been shipped and is on its way to you.', color: '#f59e0b' },
    out_for_delivery: { title: 'Out for Delivery', message: 'Your order is out for delivery and will reach you soon.', color: '#ef4444' },
    delivered: { title: 'Order Delivered', message: 'Your order has been delivered successfully!', color: '#22c55e' },
    cancelled: { title: 'Order Cancelled', message: 'Your order has been cancelled.', color: '#ef4444' },
  };

  const statusInfo = statusMessages[orderData.orderStatus.toLowerCase()] || {
    title: 'Order Status Updated',
    message: `Your order status has been updated to ${orderData.orderStatus}.`,
    color: '#666666',
  };

  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'Ecommerce Store';
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>Order Status Update - ${orderData.orderNumber}</title>
</head>
<body style="margin:0;padding:0;width:100%;word-wrap:break-word;-webkit-font-smoothing:antialiased;background-color:#f4f4f4;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
<tr>
<td style="padding:20px 0;text-align:center;background-color:${statusInfo.color};">
<h1 style="color:#fff;margin:0;font-size:24px;font-weight:bold;">${statusInfo.title}</h1>
</td>
</tr>
<tr>
<td style="padding:40px 20px;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;margin:0 auto;background-color:#fff;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
<tr>
<td style="padding:40px 30px;">
<h2 style="color:#333;margin-top:0;font-size:22px;">Hello ${orderData.customerName},</h2>
<p style="color:#666;font-size:16px;line-height:1.6;margin:20px 0;">${statusInfo.message}</p>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;background-color:#f9f9f9;border-radius:8px;margin:30px 0;">
<tr><td style="padding:20px;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
<tr><td style="padding:10px 0;"><strong style="color:#333;">Order Number:</strong></td><td style="padding:10px 0;text-align:right;"><span style="color:#401d5d;font-weight:bold;font-size:16px;">${orderData.orderNumber}</span></td></tr>
<tr><td style="padding:10px 0;"><strong style="color:#333;">Status:</strong></td><td style="padding:10px 0;text-align:right;color:#666;font-weight:500;">${orderData.orderStatus.toUpperCase().replace(/_/g, ' ')}</td></tr>
${orderData.tracking?.trackingNumber ? `<tr><td style="padding:10px 0;"><strong style="color:#333;">Tracking Number:</strong></td><td style="padding:10px 0;text-align:right;color:#666;font-family:monospace;font-size:14px;">${orderData.tracking.trackingNumber}</td></tr>` : ''}
${orderData.tracking?.courierName ? `<tr><td style="padding:10px 0;"><strong style="color:#333;">Courier:</strong></td><td style="padding:10px 0;text-align:right;color:#666;">${orderData.tracking.courierName}</td></tr>` : ''}
</table>
</td></tr>
</table>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin:30px 0;">
<tr><td style="text-align:center;">
<a href="${orderUrl}" style="display:inline-block;padding:14px 30px;background-color:#401d5d;color:#fff;text-decoration:none;border-radius:5px;font-weight:bold;font-size:16px;margin:5px;">View Order Details</a>
${orderData.orderStatus.toLowerCase() === 'delivered' ? `<a href="${invoiceUrl}" style="display:inline-block;padding:14px 30px;background-color:#22c55e;color:#fff;text-decoration:none;border-radius:5px;font-weight:bold;font-size:16px;margin:5px;">Download Invoice</a>` : ''}
</td></tr>
</table>
<p style="color:#666;font-size:14px;line-height:1.6;margin-top:30px;">If you have any questions or concerns, please don't hesitate to contact our support team.</p>
<p style="color:#666;font-size:14px;line-height:1.6;margin-top:20px;">Thank you for shopping with us!</p>
</td>
</tr>
</table>
</td>
</tr>
</table>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin:30px 0;">
<tr><td style="border-top:1px solid #eee;"></td></tr>
</table>
<p style="color:#999;font-size:12px;text-align:center;margin:0;">© ${new Date().getFullYear()} ${siteName}. All rights reserved.</p>
</body>
</html>`;
}

export function generatePaymentStatusUpdateEmailHTML(orderData: {
  customerName: string;
  orderNumber: string;
  paymentStatus: string;
  paymentMethod: string;
  actualPaymentMethod?: string; // Actual payment method for display (Card, UPI, etc.)
  amount: number;
  orderId: string;
  paymentId?: string;
}): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://e-commrce-xi.vercel.app';
  const orderUrl = `${baseUrl}/orders/${orderData.orderId}`;
  const receiptUrl = `${baseUrl}/api/receipt/${orderData.orderId}`;
  
  const isPaid = orderData.paymentStatus.toLowerCase() === 'paid';
  const statusColor = isPaid ? '#22c55e' : orderData.paymentStatus.toLowerCase() === 'failed' ? '#ef4444' : '#f59e0b';

  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'Ecommerce Store';
  
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Payment Status Update</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f4;">
<tr><td style="padding:20px 0;text-align:center;background-color:${statusColor};"><h1 style="color:#fff;margin:0;font-size:24px;font-weight:bold;">Payment ${isPaid ? 'Successful' : 'Status Updated'}</h1></td></tr>
<tr><td style="padding:20px;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;margin:0 auto;background-color:#fff;border-radius:8px;">
<tr><td style="padding:30px;">
<h2 style="color:#333;margin:0 0 15px 0;font-size:20px;">Hello ${orderData.customerName},</h2>
<p style="color:#666;font-size:14px;line-height:1.5;margin:0 0 20px 0;">${isPaid ? 'Your payment has been successfully processed. Your order will be confirmed shortly.' : `Your payment status has been updated to ${orderData.paymentStatus}.`}</p>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f9f9f9;border-radius:6px;margin:20px 0;">
<tr><td style="padding:15px;">
<table width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td style="padding:6px 0;font-size:13px;"><strong>Order:</strong></td><td style="padding:6px 0;text-align:right;font-size:13px;color:#401d5d;font-weight:bold;">${orderData.orderNumber}</td></tr>
<tr><td style="padding:6px 0;font-size:13px;"><strong>Status:</strong></td><td style="padding:6px 0;text-align:right;font-size:13px;color:#666;font-weight:500;">${orderData.paymentStatus.toUpperCase()}</td></tr>
<tr><td style="padding:6px 0;font-size:13px;"><strong>Method:</strong></td><td style="padding:6px 0;text-align:right;font-size:13px;color:#666;">${orderData.actualPaymentMethod || orderData.paymentMethod.toUpperCase().replace(/_/g, ' ')}</td></tr>
<tr><td style="padding:6px 0;font-size:13px;"><strong>Amount:</strong></td><td style="padding:6px 0;text-align:right;font-size:13px;color:#401d5d;font-weight:bold;font-size:16px;">₹${orderData.amount.toLocaleString('en-IN')}</td></tr>
${orderData.paymentId?`<tr><td style="padding:6px 0;font-size:13px;"><strong>Payment ID:</strong></td><td style="padding:6px 0;text-align:right;font-size:13px;color:#666;font-family:monospace;font-size:12px;">${orderData.paymentId}</td></tr>`:''}
</table>
</td></tr>
</table>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
<tr><td style="text-align:center;">
<a href="${orderUrl}" style="display:inline-block;padding:12px 25px;background-color:#401d5d;color:#fff;text-decoration:none;border-radius:5px;font-weight:bold;font-size:14px;margin:5px;">View Order</a>
${isPaid?`<a href="${receiptUrl}" style="display:inline-block;padding:12px 25px;background-color:#22c55e;color:#fff;text-decoration:none;border-radius:5px;font-weight:bold;font-size:14px;margin:5px;">Download Receipt</a>`:''}
</td></tr>
</table>
<p style="color:#666;font-size:12px;line-height:1.5;margin:20px 0 0 0;">If you have any questions, please contact our support team.</p>
<p style="color:#999;font-size:11px;text-align:center;margin:25px 0 0 0;">© ${new Date().getFullYear()} ${siteName}. All rights reserved.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

// Support Ticket Email Templates
export function generateTicketCreatedEmailHTML(ticketData: {
  customerName: string;
  ticketNumber: string;
  subject: string;
  category: string;
  priority: string;
  ticketId: string;
}): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://e-commrce-xi.vercel.app';
  const ticketUrl = `${baseUrl}/support/tickets/${ticketData.ticketId}`;

  const priorityColors: Record<string, string> = {
    urgent: '#ef4444',
    high: '#f59e0b',
    medium: '#3b82f6',
    low: '#22c55e',
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Support Ticket Created - ${ticketData.ticketNumber}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 20px 0; text-align: center; background-color: #401d5d;">
            <h1 style="color: #ffffff; margin: 0;">Support Ticket Created</h1>
          </td>
        </tr>
        <tr>
          <td style="padding: 40px 20px;">
            <table role="presentation" style="width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <tr>
                <td style="padding: 40px 30px;">
                  <h2 style="color: #333333; margin-top: 0;">Hello ${ticketData.customerName},</h2>
                  <p style="color: #666666; font-size: 16px; line-height: 1.6;">
                    Thank you for contacting our support team. We have received your support request and will get back to you as soon as possible.
                  </p>
                  
                  <div style="background-color: #f9f9f9; border-radius: 8px; padding: 20px; margin: 30px 0;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0;">
                          <strong style="color: #333333;">Ticket Number:</strong>
                        </td>
                        <td style="padding: 8px 0; text-align: right;">
                          <span style="color: #401d5d; font-weight: bold; font-size: 18px;">${ticketData.ticketNumber}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <strong style="color: #333333;">Subject:</strong>
                        </td>
                        <td style="padding: 8px 0; text-align: right; color: #666666;">
                          ${ticketData.subject}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <strong style="color: #333333;">Category:</strong>
                        </td>
                        <td style="padding: 8px 0; text-align: right; color: #666666; text-transform: capitalize;">
                          ${ticketData.category}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <strong style="color: #333333;">Priority:</strong>
                        </td>
                        <td style="padding: 8px 0; text-align: right;">
                          <span style="background-color: ${priorityColors[ticketData.priority.toLowerCase()] || '#666666'}; color: #ffffff; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; text-transform: uppercase;">
                            ${ticketData.priority}
                          </span>
                        </td>
                      </tr>
                    </table>
                  </div>

                  <table role="presentation" style="width: 100%; margin: 30px 0;">
                    <tr>
                      <td style="text-align: center;">
                        <a href="${ticketUrl}" style="display: inline-block; padding: 14px 30px; background-color: #401d5d; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">View Ticket</a>
                      </td>
                    </tr>
                  </table>

                  <p style="color: #666666; font-size: 14px; line-height: 1.6; margin-top: 30px;">
                    Our support team typically responds within 24 hours. You will receive an email notification when we reply to your ticket.
                  </p>
                  
                  <p style="color: #666666; font-size: 14px; line-height: 1.6; margin-top: 20px;">
                    Thank you for your patience!
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

export function generateTicketStatusUpdateEmailHTML(ticketData: {
  customerName: string;
  ticketNumber: string;
  subject: string;
  status: string;
  ticketId: string;
}): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://e-commrce-xi.vercel.app';
  const ticketUrl = `${baseUrl}/support/tickets/${ticketData.ticketId}`;

  const statusColors: Record<string, string> = {
    open: '#3b82f6',
    'in-progress': '#f59e0b',
    resolved: '#22c55e',
    closed: '#666666',
  };

  const statusMessages: Record<string, string> = {
    open: 'Your ticket has been opened and is awaiting review.',
    'in-progress': 'Your ticket is now being actively worked on by our support team.',
    resolved: 'Your ticket has been resolved. If you need further assistance, please reply to reopen it.',
    closed: 'Your ticket has been closed.',
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Ticket Status Update - ${ticketData.ticketNumber}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 20px 0; text-align: center; background-color: ${statusColors[ticketData.status.toLowerCase()] || '#401d5d'};">
            <h1 style="color: #ffffff; margin: 0;">Ticket Status Updated</h1>
          </td>
        </tr>
        <tr>
          <td style="padding: 40px 20px;">
            <table role="presentation" style="width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <tr>
                <td style="padding: 40px 30px;">
                  <h2 style="color: #333333; margin-top: 0;">Hello ${ticketData.customerName},</h2>
                  <p style="color: #666666; font-size: 16px; line-height: 1.6;">
                    ${statusMessages[ticketData.status.toLowerCase()] || 'Your ticket status has been updated.'}
                  </p>
                  
                  <div style="background-color: #f9f9f9; border-radius: 8px; padding: 20px; margin: 30px 0;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0;">
                          <strong style="color: #333333;">Ticket Number:</strong>
                        </td>
                        <td style="padding: 8px 0; text-align: right;">
                          <span style="color: #401d5d; font-weight: bold;">${ticketData.ticketNumber}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <strong style="color: #333333;">Subject:</strong>
                        </td>
                        <td style="padding: 8px 0; text-align: right; color: #666666;">
                          ${ticketData.subject}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <strong style="color: #333333;">Status:</strong>
                        </td>
                        <td style="padding: 8px 0; text-align: right;">
                          <span style="background-color: ${statusColors[ticketData.status.toLowerCase()] || '#666666'}; color: #ffffff; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; text-transform: uppercase;">
                            ${ticketData.status.replace('-', ' ')}
                          </span>
                        </td>
                      </tr>
                    </table>
                  </div>

                  <table role="presentation" style="width: 100%; margin: 30px 0;">
                    <tr>
                      <td style="text-align: center;">
                        <a href="${ticketUrl}" style="display: inline-block; padding: 14px 30px; background-color: #401d5d; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">View Ticket</a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

export function generateTicketReplyEmailHTML(ticketData: {
  customerName: string;
  ticketNumber: string;
  subject: string;
  message: string;
  adminName?: string;
  ticketId: string;
}): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://e-commrce-xi.vercel.app';
  const ticketUrl = `${baseUrl}/support/tickets/${ticketData.ticketId}`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Reply on Ticket - ${ticketData.ticketNumber}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 20px 0; text-align: center; background-color: #401d5d;">
            <h1 style="color: #ffffff; margin: 0;">New Reply on Your Ticket</h1>
          </td>
        </tr>
        <tr>
          <td style="padding: 40px 20px;">
            <table role="presentation" style="width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <tr>
                <td style="padding: 40px 30px;">
                  <h2 style="color: #333333; margin-top: 0;">Hello ${ticketData.customerName},</h2>
                  <p style="color: #666666; font-size: 16px; line-height: 1.6;">
                    You have received a new reply on your support ticket.
                  </p>
                  
                  <div style="background-color: #f9f9f9; border-radius: 8px; padding: 20px; margin: 30px 0;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0;">
                          <strong style="color: #333333;">Ticket Number:</strong>
                        </td>
                        <td style="padding: 8px 0; text-align: right;">
                          <span style="color: #401d5d; font-weight: bold;">${ticketData.ticketNumber}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <strong style="color: #333333;">Subject:</strong>
                        </td>
                        <td style="padding: 8px 0; text-align: right; color: #666666;">
                          ${ticketData.subject}
                        </td>
                      </tr>
                      ${ticketData.adminName ? `
                      <tr>
                        <td style="padding: 8px 0;">
                          <strong style="color: #333333;">Replied by:</strong>
                        </td>
                        <td style="padding: 8px 0; text-align: right; color: #666666;">
                          ${ticketData.adminName}
                        </td>
                      </tr>
                      ` : ''}
                    </table>
                  </div>

                  <div style="background-color: #f0f0f0; border-left: 4px solid #401d5d; padding: 20px; margin: 30px 0; border-radius: 4px;">
                    <p style="color: #333333; font-size: 16px; line-height: 1.8; margin: 0; white-space: pre-wrap;">${ticketData.message}</p>
                  </div>

                  <table role="presentation" style="width: 100%; margin: 30px 0;">
                    <tr>
                      <td style="text-align: center;">
                        <a href="${ticketUrl}" style="display: inline-block; padding: 14px 30px; background-color: #401d5d; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Reply to Ticket</a>
                      </td>
                    </tr>
                  </table>

                  <p style="color: #666666; font-size: 14px; line-height: 1.6; margin-top: 30px;">
                    You can reply to this ticket by clicking the button above or visiting your support tickets page.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

// Cancel/Return Request Email Template
export function generateCancelReturnRequestEmailHTML(data: {
  customerName: string;
  orderNumber: string;
  type: 'cancel' | 'return';
  itemName?: string;
  reason: string;
  returnType?: 'refund' | 'replacement';
  orderId: string;
}): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://e-commrce-xi.vercel.app';
  const orderUrl = `${baseUrl}/orders/${data.orderId}`;
  const isCancel = data.type === 'cancel';
  const title = isCancel ? 'Cancellation Request Submitted' : 'Return Request Submitted';
  const color = isCancel ? '#f59e0b' : '#3b82f6';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title} - ${data.orderNumber}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 20px 0; text-align: center; background-color: ${color};">
            <h1 style="color: #ffffff; margin: 0;">${title}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding: 40px 20px;">
            <table role="presentation" style="width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <tr>
                <td style="padding: 40px 30px;">
                  <h2 style="color: #333333; margin-top: 0;">Hello ${data.customerName},</h2>
                  <p style="color: #666666; font-size: 16px; line-height: 1.6;">
                    Your ${isCancel ? 'cancellation' : 'return'} request has been submitted successfully and is under review.
                  </p>
                  
                  <div style="background-color: #f9f9f9; border-radius: 8px; padding: 20px; margin: 30px 0;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0;">
                          <strong style="color: #333333;">Order Number:</strong>
                        </td>
                        <td style="padding: 8px 0; text-align: right;">
                          <span style="color: #401d5d; font-weight: bold;">${data.orderNumber}</span>
                        </td>
                      </tr>
                      ${data.itemName ? `
                      <tr>
                        <td style="padding: 8px 0;">
                          <strong style="color: #333333;">Item:</strong>
                        </td>
                        <td style="padding: 8px 0; text-align: right; color: #666666;">
                          ${data.itemName}
                        </td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="padding: 8px 0;">
                          <strong style="color: #333333;">Reason:</strong>
                        </td>
                        <td style="padding: 8px 0; text-align: right; color: #666666;">
                          ${data.reason}
                        </td>
                      </tr>
                      ${!isCancel && data.returnType ? `
                      <tr>
                        <td style="padding: 8px 0;">
                          <strong style="color: #333333;">Return Type:</strong>
                        </td>
                        <td style="padding: 8px 0; text-align: right; color: #666666;">
                          ${data.returnType === 'refund' ? 'Refund' : 'Replacement'}
                        </td>
                      </tr>
                      ` : ''}
                    </table>
                  </div>

                  <div style="background-color: #fff3cd; border-left: 4px solid ${color}; padding: 15px; margin: 20px 0; border-radius: 4px;">
                    <p style="color: #856404; margin: 0; font-size: 14px;">
                      <strong>Next Steps:</strong> Your request is being reviewed by our team. You will receive an email notification once it's processed. ${!isCancel ? 'If approved, we will schedule a pickup for your item.' : ''}
                    </p>
                  </div>

                  <table role="presentation" style="width: 100%; margin: 30px 0;">
                    <tr>
                      <td style="text-align: center;">
                        <a href="${orderUrl}" style="display: inline-block; padding: 14px 30px; background-color: #401d5d; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">View Order Details</a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

// Cancel/Return Status Update Email Template
export function generateCancelReturnStatusEmailHTML(data: {
  customerName: string;
  orderNumber: string;
  type: 'cancel' | 'return';
  status: 'approved' | 'rejected' | 'pickup_scheduled' | 'pickup_completed' | 'refund_processed';
  itemName?: string;
  rejectionReason?: string;
  pickupDate?: Date;
  pickupTime?: string;
  trackingNumber?: string;
  refundAmount?: number;
  orderId: string;
  adminNotes?: string;
}): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://e-commrce-xi.vercel.app';
  const orderUrl = `${baseUrl}/orders/${data.orderId}`;
  const isCancel = data.type === 'cancel';
  
  let title = '';
  let color = '';
  let message = '';
  
  switch (data.status) {
    case 'approved':
      title = isCancel ? 'Order Cancelled' : 'Return Approved';
      color = '#22c55e';
      if (isCancel) {
        // Check if it's customer cancellation or admin cancellation based on adminNotes
        const isCustomerCancel = data.adminNotes?.toLowerCase().includes('cancelled by customer') || 
                                 data.adminNotes?.toLowerCase().includes('order cancelled by customer');
        const refundMsg = data.refundAmount 
          ? ' Refund will be processed within 5-7 business days to your original payment method.'
          : '';
        message = isCustomerCancel
          ? `Your order has been cancelled successfully.${refundMsg}`
          : `Your order has been cancelled by admin.${refundMsg}`;
      } else {
        message = 'Your return request has been approved. We will schedule a pickup for your item.';
      }
      break;
    case 'rejected':
      title = isCancel ? 'Cancellation Rejected' : 'Return Rejected';
      color = '#ef4444';
      message = `Your ${isCancel ? 'cancellation' : 'return'} request has been rejected.`;
      break;
    case 'pickup_scheduled':
      title = 'Pickup Scheduled';
      color = '#3b82f6';
      message = `Your return pickup has been scheduled. Our team will collect the item on the scheduled date.`;
      break;
    case 'pickup_completed':
      title = 'Pickup Completed';
      color = '#22c55e';
      message = 'Your item has been picked up successfully. Refund will be processed soon.';
      break;
    case 'refund_processed':
      title = 'Refund Processed';
      color = '#22c55e';
      message = `Your refund of ₹${data.refundAmount?.toLocaleString('en-IN') || '0'} has been processed successfully.`;
      break;
  }

  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'Ecommerce Store';
  
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f4;">
<tr><td style="padding:20px 0;text-align:center;background-color:${color};"><h1 style="color:#fff;margin:0;font-size:24px;font-weight:bold;">${title}</h1></td></tr>
<tr><td style="padding:20px;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;margin:0 auto;background-color:#fff;border-radius:8px;">
<tr><td style="padding:30px;">
<h2 style="color:#333;margin:0 0 15px 0;font-size:20px;">Hello ${data.customerName},</h2>
<p style="color:#666;font-size:14px;line-height:1.5;margin:0 0 20px 0;">${message}</p>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f9f9f9;border-radius:6px;margin:20px 0;">
<tr><td style="padding:15px;">
<table width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td style="padding:6px 0;font-size:13px;"><strong>Order:</strong></td><td style="padding:6px 0;text-align:right;font-size:13px;color:#401d5d;font-weight:bold;">${data.orderNumber}</td></tr>
${data.itemName?`<tr><td style="padding:6px 0;font-size:13px;"><strong>Item:</strong></td><td style="padding:6px 0;text-align:right;font-size:13px;color:#666;">${data.itemName}</td></tr>`:''}
${data.pickupDate?`<tr><td style="padding:6px 0;font-size:13px;"><strong>Pickup Date:</strong></td><td style="padding:6px 0;text-align:right;font-size:13px;color:#666;">${new Date(data.pickupDate).toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'})}</td></tr>`:''}
${data.pickupTime?`<tr><td style="padding:6px 0;font-size:13px;"><strong>Pickup Time:</strong></td><td style="padding:6px 0;text-align:right;font-size:13px;color:#666;">${data.pickupTime}</td></tr>`:''}
${data.trackingNumber?`<tr><td style="padding:6px 0;font-size:13px;"><strong>Tracking:</strong></td><td style="padding:6px 0;text-align:right;font-size:13px;color:#666;font-family:monospace;">${data.trackingNumber}</td></tr>`:''}
${data.refundAmount?`<tr><td style="padding:6px 0;font-size:13px;"><strong>Refund:</strong></td><td style="padding:6px 0;text-align:right;font-size:13px;color:#22c55e;font-weight:bold;">₹${data.refundAmount.toLocaleString('en-IN')}</td></tr>`:''}
${data.rejectionReason?`<tr><td colspan="2" style="padding:6px 0;font-size:13px;"><strong>Reason:</strong><br><span style="color:#666;">${data.rejectionReason}</span></td></tr>`:''}
${data.adminNotes?`<tr><td colspan="2" style="padding:6px 0;font-size:13px;"><strong>${isCancel?'Cancellation':'Return'} Reason:</strong><br><span style="color:#666;">${data.adminNotes}</span></td></tr>`:''}
</table>
</td></tr>
</table>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
<tr><td style="text-align:center;"><a href="${orderUrl}" style="display:inline-block;padding:12px 25px;background-color:#401d5d;color:#fff;text-decoration:none;border-radius:5px;font-weight:bold;font-size:14px;">View Order</a></td></tr>
</table>
<p style="color:#666;font-size:12px;line-height:1.5;margin:20px 0 0 0;">If you have any questions, please contact our support team.</p>
<p style="color:#999;font-size:11px;text-align:center;margin:25px 0 0 0;">© ${new Date().getFullYear()} ${siteName}. All rights reserved.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

// Login/Signup OTP Email Template - Enhanced with professional branding
export function generateOTPEmailHTML(data: {
  customerName: string;
  otp: string;
  purpose: 'login' | 'signup';
  expiryMinutes?: number;
}): string {
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'Ecommerce Store';
  const supportEmail = process.env.SMTP_FROM_EMAIL || process.env.SUPPORT_EMAIL || 'support@example.com';
  const supportPhone = process.env.SUPPORT_PHONE || '';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://e-commrce-xi.vercel.app';
  const isLogin = data.purpose === 'login';
  const expiryMinutes = data.expiryMinutes || 10;

  
  // Get logo URL - use base URL logo or placeholder
  // Note: For dynamic logo from site settings, it should be passed as a parameter
  // For now, use a standard logo path that can be configured
  const logoUrl = process.env.EMAIL_LOGO_URL || `${baseUrl}/icon.svg`;
  
  // Split OTP into individual digits for better display
  const otpDigits = data.otp.split('');
  
  // Brand colors
  const primaryColor = '#401d5d';
  const primaryGradient = 'linear-gradient(135deg, #401d5d 0%, #5a2a7a 100%)';
  const secondaryColor = '#f59e0b';
  const textColor = '#333333';
  const textSecondary = '#666666';
  const textMuted = '#999999';
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${isLogin ? 'Login' : 'Signup'} Verification Code - ${siteName}</title>
  <!--[if mso]>
  <style type="text/css">
    table {border-collapse:collapse;border-spacing:0;margin:0;}
    div, td {padding:0;}
    div {margin:0 !important;}
    .otp-digit {mso-padding-alt:20px 24px !important;}
  </style>
  <![endif]-->
  <style type="text/css">
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .content-padding { padding: 30px 20px !important; }
      .header-padding { padding: 30px 20px !important; }
      .footer-padding { padding: 25px 20px !important; }
      .otp-container { padding: 25px 15px !important; }
      .otp-digit-cell { padding: 15px 18px !important; min-width: 40px !important; }
      .otp-digit { font-size: 32px !important; }
      .otp-full { font-size: 20px !important; letter-spacing: 4px !important; }
      h1 { font-size: 24px !important; }
      .header-subtitle { font-size: 14px !important; }
      .greeting { font-size: 16px !important; }
      .body-text { font-size: 15px !important; }
      .info-box { padding: 15px 20px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;width:100%;word-wrap:break-word;-webkit-font-smoothing:antialiased;background-color:#f4f4f4;font-family:'Segoe UI',Tahoma,Geneva,Verdana,'Helvetica Neue',Arial,sans-serif;">
  <!-- Email Container -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;background-color:#f4f4f4;">
    <tr>
      <td align="center" style="padding:30px 15px;">
        <!-- Main Content Table -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="email-container" style="max-width:600px;margin:0 auto;background-color:#ffffff;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,0.08);overflow:hidden;">
          
          <!-- Header with Logo -->
          <tr>
            <td style="background:${primaryGradient};padding:35px 30px;text-align:center;" class="header-padding">
              <!-- Logo -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
                <tr>
                  <td align="center" style="padding:0;">
                    <img src="${logoUrl}" alt="${siteName}" style="max-width:180px;height:auto;display:block;margin:0 auto;" />
                  </td>
                </tr>
              </table>
              <!-- Title -->
              <h1 style="color:#ffffff;margin:0 0 8px 0;font-size:32px;font-weight:700;letter-spacing:-0.5px;line-height:1.2;">
                ${isLogin ? 'Login Verification' : 'Welcome to ${siteName}'}
              </h1>
              <p style="color:#ffffff;margin:0;font-size:16px;opacity:0.95;font-weight:400;" class="header-subtitle">
                ${isLogin ? 'Your secure access code' : 'Complete your registration'}
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding:50px 40px;" class="content-padding">
              <!-- Greeting -->
              <p style="color:${textColor};font-size:18px;font-weight:600;margin:0 0 24px 0;line-height:1.5;" class="greeting">
                Hello ${data.customerName || 'User'},
              </p>
              
              <p style="color:${textSecondary};font-size:16px;line-height:1.7;margin:0 0 40px 0;" class="body-text">
                ${isLogin 
                  ? 'You requested a login verification code. Use the code below to securely sign in to your account:'
                  : 'Thank you for signing up! Use the verification code below to complete your registration and get started:'
                }
              </p>
              
              <!-- OTP Display Box - Enhanced -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin:0 0 40px 0;">
                <tr>
                  <td align="center" style="padding:0;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="otp-container" style="border-radius:16px;padding:40px 30px;box-shadow:0 4px 12px rgba(64,29,93,0.1);">
                      <tr>
                        <td align="center" style="padding:0;">
                          <!-- OTP Label -->
                          <p style="color:${primaryColor};font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin:0 0 20px 0;">
                            Your Verification Code
                          </p>
                          
                          <!-- OTP Digits - Large and Prominent -->
                          <table role="presentation" cellpadding="0" cellspacing="14" border="0" style="border-collapse:separate;margin:0 auto 25px auto;">
                            <tr>
                              ${otpDigits.map(digit => `
                                <td class="otp-digit-cell" style="background-color:#ffffff;border:3px solid ${primaryColor};border-radius:12px;padding:20px 24px;min-width:55px;text-align:center;box-shadow:0 2px 8px rgba(64,29,93,0.15);">
                                  <span class="otp-digit" style="color:${primaryColor};font-size:42px;font-weight:800;letter-spacing:0;font-family:'Courier New',Courier,'Lucida Console',monospace;display:block;line-height:1;">${digit}</span>
                                </td>
                              `).join('')}
                            </tr>
                          </table>
                          
                          <!-- OTP as Single Code (for copy-paste) -->
                          <div style="background-color:#ffffff;border:2px dashed ${primaryColor};border-radius:10px;padding:18px 24px;margin-top:20px;">
                            <p style="color:${textSecondary};font-size:12px;font-weight:500;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 8px 0;text-align:center;">
                              Or copy this code:
                            </p>
                            <p style="color:${primaryColor};font-size:28px;font-weight:700;letter-spacing:8px;margin:0;font-family:'Courier New',Courier,'Lucida Console',monospace;text-align:center;word-break:break-all;" class="otp-full">
                              ${data.otp}
                            </p>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Important Info Box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;background-color:#fff8e1;border-left:5px solid ${secondaryColor};border-radius:8px;margin:0 0 35px 0;box-shadow:0 2px 8px rgba(245,158,11,0.1);">
                <tr>
                  <td style="padding:22px 28px;" class="info-box">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding:0;">
                          <p style="color:#856404;font-size:15px;line-height:1.7;margin:0;">
                            <strong style="display:block;margin-bottom:10px;font-size:16px;color:#b45309;">⏱️ Code Expires in ${expiryMinutes} Minutes</strong>
                            <span style="display:block;margin-top:8px;">For your security, please do not share this code with anyone. Our team will never ask for your verification code via phone, email, or any other method.</span>
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Security Notice -->
              <div style="background-color:#f9fafb;border-radius:8px;padding:18px 24px;margin:0 0 35px 0;">
                <p style="color:${textMuted};font-size:14px;line-height:1.7;margin:0;">
                  <strong style="color:${textSecondary};display:block;margin-bottom:6px;">🔒 Security Notice</strong>
                  ${isLogin 
                    ? 'If you didn\'t request this login code, please ignore this email or contact our support team immediately if you have concerns about your account security.'
                    : 'If you didn\'t create an account with us, please ignore this email. No account will be created without verification.'
                  }
                </p>
              </div>
              
            </td>
          </tr>
          
          <!-- Support Section -->
          <tr>
            <td style="background-color:#f9fafb;padding:35px 40px;border-top:2px solid #eeeeee;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:0;text-align:center;">
                    <p style="color:${textSecondary};font-size:15px;font-weight:600;margin:0 0 16px 0;">
                      Need Help?
                    </p>
                    <p style="color:${textSecondary};font-size:14px;line-height:1.7;margin:0 0 12px 0;">
                      Our support team is here to assist you
                    </p>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                      <tr>
                        <td style="padding:8px 0;">
                          <a href="mailto:${supportEmail}" style="color:${primaryColor};text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">
                            📧 ${supportEmail}
                          </a>
                        </td>
                      </tr>
                      ${supportPhone ? `
                      <tr>
                        <td style="padding:8px 0;">
                          <a href="tel:${supportPhone}" style="color:${primaryColor};text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">
                            📞 ${supportPhone}
                          </a>
                        </td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color:#ffffff;padding:30px 40px;text-align:center;border-top:1px solid #eeeeee;" class="footer-padding">
              <!-- Brand Name -->
              <p style="color:${textColor};font-size:16px;font-weight:700;margin:0 0 12px 0;letter-spacing:0.5px;">
                ${siteName}
              </p>
              
              <!-- Website Link -->
              <p style="margin:0 0 20px 0;">
                <a href="${baseUrl}" style="color:${primaryColor};text-decoration:none;font-weight:500;font-size:14px;display:inline-block;padding:8px 16px;border:1px solid ${primaryColor};border-radius:6px;">
                  Visit Our Website
                </a>
              </p>
              
              <!-- Footer Text -->
              <p style="color:${textMuted};font-size:12px;line-height:1.6;margin:20px 0 0 0;padding-top:20px;border-top:1px solid #eeeeee;">
                This is an automated email. Please do not reply to this message.<br>
                If you have any questions, please contact our support team using the information above.
              </p>
              
              <!-- Copyright -->
              <p style="color:#bbbbbb;font-size:11px;line-height:1.6;margin:15px 0 0 0;">
                © ${new Date().getFullYear()} ${siteName}. All rights reserved.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}