import { sendEmail } from '@/lib/email';

/**
 * Small transactional notices with a shared Tryvvo layout (vendor onboarding and vendor support).
 * Keep this file identical in the shop, admin and vendor apps.
 */
const escapeHtml = (value: unknown) =>
  String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] as string);

const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.tryvvo.com').replace(/\/$/, '');
const supplierUrl = () => (process.env.NEXT_PUBLIC_SUPPLIER_APP_URL || 'https://supplier.tryvvo.com').replace(/\/$/, '');

function renderNotice(options: { heading: string; greeting: string; paragraphs: string[]; details?: Array<[string, string]>; quote?: string; cta?: { label: string; url: string } }) {
  const green = '#066A2B';
  const font = "font-family:'Poppins',Arial,Helvetica,sans-serif;";
  const details = (options.details || [])
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 0;font-size:13px;color:#6B6C70;width:140px;${font}">${escapeHtml(label)}</td><td style="padding:6px 0;font-size:14px;color:#1F2025;font-weight:600;${font}">${escapeHtml(value)}</td></tr>`,
    )
    .join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F2F4F2;${font}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F2F4F2;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;background:#ffffff;border-radius:16px;">
<tr><td style="padding:24px 28px 8px 28px;"><img src="${siteUrl()}/email/tryvvo-logo.png" alt="Tryvvo" width="150" style="display:block;width:150px;height:auto;border:0;" /></td></tr>
<tr><td style="padding:12px 28px 0 28px;${font}">
<h1 style="margin:0 0 12px 0;font-size:22px;color:#0B1220;">${escapeHtml(options.heading)}</h1>
<p style="margin:0 0 12px 0;font-size:15px;color:#1F2025;">${escapeHtml(options.greeting)}</p>
${options.paragraphs.map(text => `<p style="margin:0 0 12px 0;font-size:14.5px;line-height:23px;color:#3B3C40;">${escapeHtml(text)}</p>`).join('')}
</td></tr>
${details ? `<tr><td style="padding:4px 28px 8px 28px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F6F9F6;border:1px solid #E6EEE7;border-radius:12px;"><tr><td style="padding:12px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${details}</table></td></tr></table></td></tr>` : ''}
${options.quote ? `<tr><td style="padding:8px 28px;${font}"><div style="border-left:3px solid ${green};background:#FAFAF8;padding:12px 16px;font-size:14px;line-height:22px;color:#1F2025;white-space:pre-line;">${escapeHtml(options.quote)}</div></td></tr>` : ''}
${options.cta ? `<tr><td style="padding:16px 28px 4px 28px;"><a href="${escapeHtml(options.cta.url)}" style="display:inline-block;background:${green};color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 22px;border-radius:8px;${font}">${escapeHtml(options.cta.label)}</a></td></tr>` : ''}
<tr><td style="padding:22px 28px 26px 28px;${font}"><p style="margin:0;font-size:12px;color:#8A8B90;">&copy; ${new Date().getFullYear()} Tryvvo. This is an automated message from the Tryvvo partner team.</p></td></tr>
</table></td></tr></table></body></html>`;
}

type VendorLike = { email?: string; storeName?: string; ownerName?: string; status?: string };

export const VENDOR_REGISTERED_MESSAGE =
  'Thank you for registering with Tryvvo! Your account registration has been successful. Your account is currently pending approval from our admin team. Once your details are verified and your account is approved, you will receive a confirmation email, after which you can log in to the Tryvvo Vendor Portal and start managing your business.';

/** Email to a newly registered vendor (sent from the vendor onboarding identity, CC admin). */
export async function sendVendorOnboardingEmail(vendor: VendorLike) {
  const to = String(vendor.email || '').trim();
  if (!to) return false;
  if (vendor.status === 'approved') return sendVendorApprovedEmail(vendor);
  const html = renderNotice({
    heading: 'Thank you for registering with Tryvvo!',
    greeting: `Hi ${vendor.ownerName || vendor.storeName || 'there'},`,
    paragraphs: [VENDOR_REGISTERED_MESSAGE],
    details: [
      ['Store name', vendor.storeName || '-'],
      ['Registered email', to],
      ['Status', 'Pending approval'],
    ],
  });
  return sendEmail({ category: 'vendor_onboarding', to, subject: 'Your Tryvvo vendor registration is successful', html });
}

/** Confirmation email once an admin approves a vendor (vendor onboarding identity, CC admin). */
export async function sendVendorApprovedEmail(vendor: VendorLike) {
  const to = String(vendor.email || '').trim();
  if (!to) return false;
  const html = renderNotice({
    heading: 'Your Tryvvo vendor account is approved',
    greeting: `Hi ${vendor.ownerName || vendor.storeName || 'there'},`,
    paragraphs: [
      'Good news! Your details have been verified and your vendor account has been approved.',
      'You can now log in to the Tryvvo Vendor Portal and start managing your business.',
    ],
    details: [
      ['Store name', vendor.storeName || '-'],
      ['Login email', to],
      ['Status', 'Approved'],
    ],
    cta: { label: 'Log in to Vendor Portal', url: `${supplierUrl()}/login` },
  });
  return sendEmail({ category: 'vendor_onboarding', to, subject: 'Your Tryvvo vendor account is approved', html });
}

type VendorRequestLike = { vendorEmail?: string; vendorName?: string; subject?: string; message?: string; requestType?: string; status?: string; adminReply?: string };

/** Acknowledgement when a vendor raises a support request (vendor support identity, CC admin). */
export async function sendVendorRequestReceivedEmail(request: VendorRequestLike & { id: string }) {
  const to = String(request.vendorEmail || '').trim();
  if (!to) return false;
  const html = renderNotice({
    heading: 'We have received your request',
    greeting: `Hi ${request.vendorName || 'there'},`,
    paragraphs: ['Thank you for contacting Tryvvo vendor support. Our team will look into your request and reply in the supplier portal.'],
    details: [
      ['Request ID', request.id.slice(-8).toUpperCase()],
      ['Type', String(request.requestType || 'General').replace(/_/g, ' ')],
      ['Subject', request.subject || '-'],
    ],
    quote: request.message,
    cta: { label: 'View in Supplier Portal', url: `${supplierUrl()}/supplier/vendor-requests` },
  });
  return sendEmail({ category: 'vendor_support', to, subject: `Request received: ${request.subject || 'Vendor support'}`, html });
}

/** Update when admin replies to or changes the status of a vendor request. */
export async function sendVendorRequestUpdateEmail(request: VendorRequestLike & { id: string }) {
  const to = String(request.vendorEmail || '').trim();
  if (!to) return false;
  const html = renderNotice({
    heading: 'Update on your request',
    greeting: `Hi ${request.vendorName || 'there'},`,
    paragraphs: ['There is an update on your request to the Tryvvo team.'],
    details: [
      ['Request ID', request.id.slice(-8).toUpperCase()],
      ['Subject', request.subject || '-'],
      ['Status', String(request.status || 'open').replace(/_/g, ' ')],
    ],
    quote: request.adminReply ? `Reply from Tryvvo:\n${request.adminReply}` : undefined,
    cta: { label: 'View in Supplier Portal', url: `${supplierUrl()}/supplier/vendor-requests` },
  });
  return sendEmail({ category: 'vendor_support', to, subject: `Update on your request: ${request.subject || 'Vendor support'}`, html });
}
