import nodemailer from 'nodemailer';
import { cleanEmailList, getEmailRoute, type EmailCategory } from '@/lib/email-routing';

/**
 * Email delivery. Sender identities (from/CC per email category) come from lib/email-routing.ts.
 * Transport: Zoho email API (ZOHO_EMAIL_API_KEY overrides the built-in key).
 */
const ZOHO_API_URL = process.env.ZOHO_EMAIL_API_URL || 'https://cpaas.zoho.com/v1.1/email';
const ZOHO_API_KEY = process.env.ZOHO_EMAIL_API_KEY || 'wSsVR60k+xWmDK4um2CpIO1pzV0DBl6lQER531an7H+tSP/F9Mc8kk2YBg+uHfQfEGU7HGNAobotyU1V12da2okqw1wJCCiF9mqRe1U4J3x17qnvhDzMXWlekReKKY0AwAVqn2JoFson+g==';

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
  /** Picks the sender identity and default CC. Defaults to 'account'. */
  category?: EmailCategory;
  /** Extra CC recipients on top of the category's CC list. */
  cc?: string[];
  replyTo?: string;
}

function zohoAuthHeader(key: string) {
  return key.startsWith('Zoho-enczapikey') ? key : `Zoho-enczapikey ${key}`;
}

async function sendViaZoho(payload: {
  from: { address: string; name: string };
  to: string[];
  cc: string[];
  replyTo?: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
}) {
  const body = {
    from: payload.from,
    to: payload.to.map(address => ({ email_address: { address } })),
    ...(payload.cc.length ? { cc: payload.cc.map(address => ({ email_address: { address } })) } : {}),
    ...(payload.replyTo ? { reply_to: [{ address: payload.replyTo }] } : {}),
    subject: payload.subject,
    htmlbody: payload.html,
    ...(payload.text ? { textbody: payload.text } : {}),
    ...(payload.attachments?.length
      ? {
          attachments: payload.attachments.map(att => ({
            name: att.filename,
            mime_type: att.contentType || 'application/pdf',
            content: att.content.toString('base64'),
          })),
        }
      : {}),
  };

  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(ZOHO_API_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: zohoAuthHeader(ZOHO_API_KEY),
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(20000),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) return data;
      const error = new Error(`Zoho email API ${response.status}: ${JSON.stringify(data?.error || data).slice(0, 300)}`);
      if (response.status < 500 && response.status !== 429) throw Object.assign(error, { retryable: false });
      lastError = error;
    } catch (error: any) {
      if (error?.retryable === false) throw error;
      lastError = error;
    }
    await new Promise(resolve => setTimeout(resolve, Math.min(1000 * 2 ** (attempt - 1), 5000)));
  }
  throw lastError;
}

let smtpTransport: nodemailer.Transporter | null = null;
function getSmtpTransport() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  if (!smtpTransport) {
    smtpTransport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      tls: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
      connectionTimeout: 30000,
      socketTimeout: 60000,
      requireTLS: true,
    });
  }
  return smtpTransport;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const category = options.category || 'account';
  const route = await getEmailRoute(category);
  const to = cleanEmailList(options.to);
  if (to.length === 0) throw new Error('No valid recipient email address');
  const cc = cleanEmailList([...route.cc, ...(options.cc || [])]).filter(address => !to.includes(address));
  const replyTo = options.replyTo || route.replyTo;

  try {
    if (ZOHO_API_KEY) {
      await sendViaZoho({
        from: { address: route.fromEmail, name: route.fromName },
        to,
        cc,
        replyTo,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: options.attachments,
      });
    } else {
      const transport = getSmtpTransport();
      if (!transport) throw new Error('Email is not configured: set ZOHO_EMAIL_API_KEY (or SMTP_HOST/SMTP_USER/SMTP_PASS)');
      const info = await transport.sendMail({
        from: `"${route.fromName}" <${route.fromEmail}>`,
        to: to.join(', '),
        ...(cc.length ? { cc: cc.join(', ') } : {}),
        ...(replyTo ? { replyTo } : {}),
        subject: options.subject,
        html: options.html,
        text: options.text || options.subject,
        attachments: options.attachments?.map(att => ({ filename: att.filename, content: att.content, contentType: att.contentType || 'application/pdf' })),
      });
      if (info.rejected?.length) throw new Error(`Email rejected for recipients: ${info.rejected.join(', ')}`);
    }
    console.log('[Email] Sent', { category, from: route.fromEmail, to: to.length, cc: cc.length });
    return true;
  } catch (error: any) {
    console.error('[Email] Send failed', { category, from: route.fromEmail, message: error?.message });
    throw error;
  }
}

export function generateVerificationEmailHTML(name: string, verificationLink: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Email</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 20px 0; text-align: center; background-color: #401d5d;">
            <h1 style="color: #ffffff; margin: 0;">Ecommerce Store</h1>
          </td>
        </tr>
        <tr>
          <td style="padding: 40px 20px;">
            <table role="presentation" style="width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <tr>
                <td style="padding: 40px 30px;">
                  <h2 style="color: #333333; margin-top: 0;">Verify Your Email Address</h2>
                  <p style="color: #666666; font-size: 16px; line-height: 1.6;">
                    Hello ${name},
                  </p>
                  <p style="color: #666666; font-size: 16px; line-height: 1.6;">
                    Thank you for signing up! Please verify your email address by clicking the button below:
                  </p>
                  <table role="presentation" style="width: 100%; margin: 30px 0;">
                    <tr>
                      <td style="text-align: center;">
                        <a href="${verificationLink}" style="display: inline-block; padding: 14px 30px; background-color: #401d5d; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Verify Email Address</a>
                      </td>
                    </tr>
                  </table>
                  <p style="color: #666666; font-size: 14px; line-height: 1.6;">
                    Or copy and paste this link into your browser:
                  </p>
                  <p style="color: #401d5d; font-size: 14px; word-break: break-all;">
                    ${verificationLink}
                  </p>
                  <p style="color: #666666; font-size: 14px; line-height: 1.6; margin-top: 30px;">
                    This link will expire in 24 hours. If you didn't create an account, please ignore this email.
                  </p>
                  <hr style="border: none; border-top: 1px solid #eeeeee; margin: 30px 0;">
                  <p style="color: #999999; font-size: 12px; text-align: center; margin: 0;">
                    © ${new Date().getFullYear()} Ecommerce Store. All rights reserved.
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

export function generateVerificationResendEmailHTML(name: string, verificationLink: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Email</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 20px 0; text-align: center; background-color: #401d5d;">
            <h1 style="color: #ffffff; margin: 0;">Ecommerce Store</h1>
          </td>
        </tr>
        <tr>
          <td style="padding: 40px 20px;">
            <table role="presentation" style="width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <tr>
                <td style="padding: 40px 30px;">
                  <h2 style="color: #333333; margin-top: 0;">Verify Your Email Address</h2>
                  <p style="color: #666666; font-size: 16px; line-height: 1.6;">
                    Hello ${name},
                  </p>
                  <p style="color: #666666; font-size: 16px; line-height: 1.6;">
                    You requested a new verification email. Please click the button below to verify your email address:
                  </p>
                  <table role="presentation" style="width: 100%; margin: 30px 0;">
                    <tr>
                      <td style="text-align: center;">
                        <a href="${verificationLink}" style="display: inline-block; padding: 14px 30px; background-color: #401d5d; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Verify Email Address</a>
                      </td>
                    </tr>
                  </table>
                  <p style="color: #666666; font-size: 14px; line-height: 1.6; margin-top: 30px;">
                    This link will expire in 24 hours. If you didn't request this, please ignore this email.
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

export function generatePasswordResetEmailHTML(name: string, resetLink: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 20px 0; text-align: center; background-color: #401d5d;">
            <h1 style="color: #ffffff; margin: 0;">Ecommerce Store</h1>
          </td>
        </tr>
        <tr>
          <td style="padding: 40px 20px;">
            <table role="presentation" style="width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <tr>
                <td style="padding: 40px 30px;">
                  <h2 style="color: #333333; margin-top: 0;">Reset Your Password</h2>
                  <p style="color: #666666; font-size: 16px; line-height: 1.6;">
                    Hello ${name},
                  </p>
                  <p style="color: #666666; font-size: 16px; line-height: 1.6;">
                    You requested to reset your password. Please click the button below to reset it:
                  </p>
                  <table role="presentation" style="width: 100%; margin: 30px 0;">
                    <tr>
                      <td style="text-align: center;">
                        <a href="${resetLink}" style="display: inline-block; padding: 14px 30px; background-color: #401d5d; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Reset Password</a>
                      </td>
                    </tr>
                  </table>
                  <p style="color: #666666; font-size: 14px; line-height: 1.6;">
                    Or copy and paste this link into your browser:
                  </p>
                  <p style="color: #401d5d; font-size: 14px; word-break: break-all;">
                    ${resetLink}
                  </p>
                  <p style="color: #666666; font-size: 14px; line-height: 1.6; margin-top: 30px;">
                    This link will expire in 1 hour. If you didn't request a password reset, please ignore this email and your password will remain unchanged.
                  </p>
                  <hr style="border: none; border-top: 1px solid #eeeeee; margin: 30px 0;">
                  <p style="color: #999999; font-size: 12px; text-align: center; margin: 0;">
                    © ${new Date().getFullYear()} Ecommerce Store. All rights reserved.
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

export function generateOrderConfirmationEmailHTML(orderData: {
  customerName: string;
  orderNumber: string;
  orderDate: string;
  items: Array<{
    productName: string;
    quantity: number;
    price: number;
    total: number;
    productImage?: string;
  }>;
  shippingAddress: {
    name: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    phone: string;
  };
  pricing: {
    subtotal: number;
    discount: number;
    shipping: number;
    tax: number;
    total: number;
  };
  paymentMethod: string;
  actualPaymentMethod?: string; // Actual payment method for display (Card, UPI, etc.)
  orderId: string;
  trackingUrl?: string;
  expectedDeliveryDate?: string;
  companyLogo?: string;
  siteName?: string;
}): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://e-commrce-xi.vercel.app';
  const orderUrl = `${baseUrl}/orders/${orderData.orderId}`;
  const siteName = orderData.siteName || 'Ecommerce Store';
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Order Confirmation</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f4;">
<tr><td style="padding:20px 0;text-align:center;background-color:#401d5d;"><h1 style="color:#fff;margin:0;font-size:24px;font-weight:bold;">Order Confirmed!</h1></td></tr>
<tr><td style="padding:20px;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;margin:0 auto;background-color:#fff;border-radius:8px;">
<tr><td style="padding:30px;">
<h2 style="color:#333;margin:0 0 15px 0;font-size:20px;">Thank you, ${orderData.customerName}!</h2>
<p style="color:#666;font-size:14px;line-height:1.5;margin:0 0 20px 0;">We've received your order and are preparing it for shipment.</p>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f9f9f9;border-radius:6px;margin:20px 0;">
<tr><td style="padding:15px;">
<table width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td style="padding:6px 0;font-size:13px;"><strong>Order:</strong></td><td style="padding:6px 0;text-align:right;font-size:13px;color:#401d5d;font-weight:bold;">${orderData.orderNumber}</td></tr>
<tr><td style="padding:6px 0;font-size:13px;"><strong>Date:</strong></td><td style="padding:6px 0;text-align:right;font-size:13px;color:#666;">${orderData.orderDate}</td></tr>
<tr><td style="padding:6px 0;font-size:13px;"><strong>Payment:</strong></td><td style="padding:6px 0;text-align:right;font-size:13px;color:#666;">${orderData.actualPaymentMethod || orderData.paymentMethod.toUpperCase().replace(/_/g, ' ')}</td></tr>
${orderData.expectedDeliveryDate?`<tr><td style="padding:6px 0;font-size:13px;"><strong>Delivery:</strong></td><td style="padding:6px 0;text-align:right;font-size:13px;color:#22c55e;font-weight:bold;">${orderData.expectedDeliveryDate}</td></tr>`:''}
</table>
</td></tr>
</table>
<h3 style="color:#333;margin:25px 0 10px 0;font-size:16px;">Order Items</h3>
${orderData.items.map(item=>{
  // Handle base64 data URLs and regular URLs
  let imageUrl = item.productImage || `${baseUrl}/images/placeholder-product.png`;
  
  // If base64 data URL, use it directly (most email clients support this)
  // If regular URL, ensure it's absolute
  if (imageUrl && !imageUrl.startsWith('data:') && !imageUrl.startsWith('http')) {
    imageUrl = `${baseUrl}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
  }
  
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #eee;border-radius:8px;margin-bottom:15px;background-color:#fff;">
<tr>
<td style="padding:15px;width:100px;vertical-align:top;">
<img src="${imageUrl}" alt="${item.productName}" style="width:80px;height:80px;object-fit:cover;border-radius:6px;border:1px solid #eee;display:block;" />
</td>
<td style="padding:15px;vertical-align:top;">
<table width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td style="padding:0 0 8px 0;"><strong style="color:#333;font-size:15px;">${item.productName}</strong></td></tr>
<tr><td style="padding:4px 0;color:#666;font-size:13px;">Quantity: <strong style="color:#333;">${item.quantity}</strong></td></tr>
<tr><td style="padding:4px 0;color:#666;font-size:13px;">Price: <strong style="color:#401d5d;">₹${item.price.toLocaleString('en-IN')}</strong> × ${item.quantity}</td></tr>
<tr><td style="padding:8px 0 0 0;border-top:1px solid #eee;"><strong style="color:#333;font-size:15px;">Total: ₹${item.total.toLocaleString('en-IN')}</strong></td></tr>
</table>
</td>
</tr>
</table>`;
}).join('')}
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f9f9f9;border-radius:6px;margin:15px 0;">
<tr><td style="padding:15px;">
<table width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td style="padding:5px 0;font-size:13px;color:#666;">Subtotal</td><td style="padding:5px 0;text-align:right;font-size:13px;color:#666;">₹${orderData.pricing.subtotal.toLocaleString('en-IN')}</td></tr>
${orderData.pricing.discount>0?`<tr><td style="padding:5px 0;font-size:13px;color:#666;">Discount</td><td style="padding:5px 0;text-align:right;font-size:13px;color:#22c55e;">-₹${orderData.pricing.discount.toLocaleString('en-IN')}</td></tr>`:''}
${orderData.pricing.shipping>0?`<tr><td style="padding:5px 0;font-size:13px;color:#666;">Shipping</td><td style="padding:5px 0;text-align:right;font-size:13px;color:#666;">₹${orderData.pricing.shipping.toLocaleString('en-IN')}</td></tr>`:''}
<tr><td colspan="2" style="padding:8px 0;border-top:2px solid #401d5d;"></td></tr>
<tr><td style="padding:8px 0;font-weight:bold;font-size:16px;color:#333;">Total</td><td style="padding:8px 0;text-align:right;font-weight:bold;font-size:16px;color:#401d5d;">₹${orderData.pricing.total.toLocaleString('en-IN')}</td></tr>
</table>
</td></tr>
</table>
<h3 style="color:#333;margin:20px 0 10px 0;font-size:16px;">Shipping Address</h3>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f9f9f9;border-radius:6px;margin-bottom:20px;">
<tr><td style="padding:15px;font-size:13px;color:#666;line-height:1.5;"><strong>${orderData.shippingAddress.name}</strong><br>${orderData.shippingAddress.street}<br>${orderData.shippingAddress.city}, ${orderData.shippingAddress.state} ${orderData.shippingAddress.postalCode}<br>Phone: ${orderData.shippingAddress.phone}</td></tr>
</table>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
<tr><td style="text-align:center;"><a href="${orderUrl}" style="display:inline-block;padding:12px 25px;background-color:#401d5d;color:#fff;text-decoration:none;border-radius:5px;font-weight:bold;font-size:14px;">View Order</a></td></tr>
</table>
<p style="color:#666;font-size:12px;line-height:1.5;margin:20px 0 0 0;">We'll send you another email when your order ships. Track your order status anytime from your account.</p>
<p style="color:#999;font-size:11px;text-align:center;margin:25px 0 0 0;">© ${new Date().getFullYear()} ${siteName}. All rights reserved.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

