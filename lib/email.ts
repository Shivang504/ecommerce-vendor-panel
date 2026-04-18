import nodemailer from 'nodemailer';

// Email configuration - ZeptoMail SMTP
// Server: smtp.zeptomail.com
// Port: 587 (TLS) or 465 (SSL)
// Template Key: 2d6f.25736a8c4a229c18.k1.3ded67d1-df4d-11f0-abf8-525400d4bb1c.19b46bcaeca
// Login Template: 2d6f.25736a8c4a229c18.k1.5bc62200-df4e-11f0-abf8-525400d4bb1c.19b46c40020
const mailConfig = {
  host: process.env.SMTP_HOST || 'smtp.zeptomail.com', // ZeptoMail SMTP host
  port: parseInt(process.env.SMTP_PORT || '587'), // 587 for TLS, 465 for SSL
  secure: process.env.SMTP_SECURE === 'true', // true for 465 (SSL), false for 587 (TLS)
  auth: {
    user: process.env.SMTP_USER || 'emailapikey',
    pass: process.env.SMTP_PASS || 'wSsVR60nr0OhBv97lTaoIuswygxdBQylQ0p+0VSo6iSoGfqT8cc5lETPUw/zG/dLRGFpEjpEpOohnhcG0zAMi498zlsDCiiF9mqRe1U4J3x17qnvhDzIV2tYmxKAKYMJxQ9pmmNmFMwm+g==',
  },
  // ZeptoMail requires TLS 1.2 or higher (does not support older TLS versions)
  tls: {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true,
  },
};

// Template IDs for email templates
export const EMAIL_TEMPLATES = {
  SIGNUP: process.env.EMAIL_TEMPLATE_SIGNUP || '2d6f.25736a8c4a229c18.k1.3ded67d1-df4d-11f0-abf8-525400d4bb1c.19b46bcaeca',
  LOGIN: process.env.EMAIL_TEMPLATE_LOGIN || '2d6f.25736a8c4a229c18.k1.5bc62200-df4e-11f0-abf8-525400d4bb1c.19b46c40020',
};


// Create transporter with retry and better connection handling
const transporter = nodemailer.createTransport({
  host: mailConfig.host,
  port: mailConfig.port,
  secure: mailConfig.secure, // false for 587 (TLS), true for 465 (SSL)
  auth: mailConfig.auth,
  tls: {
    ...mailConfig.tls,
    // Additional TLS options for better connection stability
    rejectUnauthorized: true,
  },
  // Increase timeout values to handle slow connections
  connectionTimeout: 30000, // 30 seconds
  greetingTimeout: 30000, // 30 seconds
  socketTimeout: 60000, // 60 seconds (keep connection alive longer)
  // Connection pooling for better reliability
  pool: true,
  maxConnections: 3, // Reduced to avoid overwhelming server
  maxMessages: 50,
  rateDelta: 1000,
  rateLimit: 14,
  // Keep connection alive
  requireTLS: true,
  // Disable connection reuse to avoid stale connections
  disableFileAccess: false,
  disableUrlAccess: false,
});

// Verify connection on startup (non-blocking)
transporter.verify(function (error, success) {
  if (error) {
    console.error('[Email] Email server connection error:', {
      message: error.message,
      code: error.code,
      command: error.command,
    });
    console.error('[Email] Please check:');
    console.error('[Email] 1. SMTP_HOST is correct');
    console.error('[Email] 2. SMTP_USER and SMTP_PASS are correct');
    console.error('[Email] 3. API key is valid and not expired');
    console.error('[Email] 4. From email is verified in your email service');
  } else {
    console.log('[Email] Email server is ready to send messages');
  }
});

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
}

// Retry function with exponential backoff
async function sendEmailWithRetry(mailOptions: any, maxRetries: number = 3): Promise<any> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Create a fresh transporter for each retry to avoid stale connections
      const freshTransporter = attempt === 1 
        ? transporter 
        : nodemailer.createTransport({
            host: mailConfig.host,
            port: mailConfig.port,
            secure: mailConfig.secure,
            auth: mailConfig.auth,
            tls: {
              ...mailConfig.tls,
              rejectUnauthorized: true,
            },
            connectionTimeout: 30000,
            greetingTimeout: 30000,
            socketTimeout: 60000,
            requireTLS: true,
          });

      // Send email with timeout handling
      const sendPromise = freshTransporter.sendMail(mailOptions);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Email sending timeout after 25 seconds')), 25000);
      });

      const info = await Promise.race([sendPromise, timeoutPromise]);
      
      // Close the transporter if we created a fresh one
      if (attempt > 1 && freshTransporter.close) {
        freshTransporter.close();
      }
      
      return info;
    } catch (error: any) {
      lastError = error;
      
      // Check if error is retryable
      const isRetryable = error.code === 'ECONNECTION' || 
                         error.code === 'ETIMEDOUT' || 
                         error.message?.includes('timeout') ||
                         error.message?.includes('Connection closed');
      
      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      console.log(`[Email] Retry attempt ${attempt}/${maxRetries} after ${waitTime}ms for error:`, error.code || error.message);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw lastError;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    // Use the verified sender email from ZeptoMail
    // This should be the Domain/Sender Address from your ZeptoMail configuration
    const fromEmail = process.env.SMTP_FROM_EMAIL || 'support@meelyt.com';
    
    if (fromEmail === 'noreply@yourdomain.com') {
      console.warn('[Email] WARNING: Using default from email. Please set SMTP_FROM_EMAIL environment variable with your verified ZeptoMail sender email.');
    }
    
    const mailOptions: any = {
      from: `"Ecommerce Store" <${fromEmail}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.subject,
    };

    // Add attachments if provided
    if (options.attachments && options.attachments.length > 0) {
      mailOptions.attachments = options.attachments.map(att => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType || 'application/pdf',
      }));
    }

    console.log('[Email] Attempting to send email to:', options.to);
    console.log('[Email] SMTP Config:', {
      host: mailConfig.host,
      port: mailConfig.port,
      secure: mailConfig.secure,
      user: mailConfig.auth.user,
      fromEmail: fromEmail,
      passwordLength: mailConfig.auth.pass?.length || 0, // Log length, not actual password
    });

    // Send email with retry logic
    const info = await sendEmailWithRetry(mailOptions, 3);
    
    console.log('[Email] Email sent successfully:', {
      messageId: info.messageId,
      response: info.response,
      accepted: info.accepted,
      rejected: info.rejected,
    });
    
    if (info.rejected && info.rejected.length > 0) {
      console.error('[Email] Some recipients were rejected:', info.rejected);
      throw new Error(`Email rejected for recipients: ${info.rejected.join(', ')}`);
    }
    
    return true;
  } catch (error: any) {
    console.error('[Email] Error sending email:', {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode,
      stack: error.stack,
    });
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

