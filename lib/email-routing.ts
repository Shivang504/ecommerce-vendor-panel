import { connectToDatabase } from '@/lib/mongodb';

/**
 * Every email the platform sends belongs to one category. Each category maps to a sender identity
 * (from address, display name, CC list). Defaults live here; admins override them in
 * Admin → Settings → Email Routing, which writes the `email_settings` document read below.
 * Keep this file identical in the shop, admin and vendor apps.
 */
export type EmailCategory =
  | 'order'
  | 'customer_support'
  | 'account'
  | 'password_reset'
  | 'vendor_order'
  | 'vendor_inventory'
  | 'vendor_support'
  | 'vendor_onboarding'
  | 'admin_alert';

export type EmailRoute = {
  fromEmail: string;
  fromName: string;
  cc: string[];
  replyTo?: string;
};

export const EMAIL_CATEGORIES: Record<EmailCategory, { label: string; description: string; defaults: EmailRoute }> = {
  order: {
    label: 'Customer orders',
    description: 'Order confirmation, dispatch, delivery, cancellation, return and refund emails to customers.',
    defaults: { fromEmail: 'orders@tryvvo.com', fromName: 'Tryvvo Orders', cc: [] },
  },
  customer_support: {
    label: 'Customer support',
    description: 'Support tickets raised by customers and replies to them.',
    defaults: { fromEmail: 'support@tryvvo.com', fromName: 'Tryvvo Support', cc: [] },
  },
  account: {
    label: 'Customer account',
    description: 'Login/signup OTP and email verification for customers.',
    defaults: { fromEmail: 'support@tryvvo.com', fromName: 'Tryvvo', cc: [] },
  },
  password_reset: {
    label: 'Password reset',
    description: 'Reset password links for customers, vendors and admins.',
    defaults: { fromEmail: 'info@tryvvo.com', fromName: 'Tryvvo', cc: [] },
  },
  vendor_order: {
    label: 'Vendor order notifications',
    description: 'New order and order status emails sent to the vendor who sells the items.',
    defaults: { fromEmail: 'vendor-orders@tryvvo.com', fromName: 'Tryvvo Vendor Orders', cc: ['admin@tryvvo.com'] },
  },
  vendor_inventory: {
    label: 'Vendor inventory alerts',
    description: 'Low-stock and out-of-stock alerts sent to the vendor who owns the product.',
    defaults: { fromEmail: 'vendor-orders@tryvvo.com', fromName: 'Tryvvo Vendor Orders', cc: ['admin@tryvvo.com'] },
  },
  vendor_support: {
    label: 'Vendor support',
    description: 'Support tickets raised by vendors and replies to them.',
    defaults: { fromEmail: 'vendor-support@tryvvo.com', fromName: 'Tryvvo Vendor Support', cc: ['admin@tryvvo.com'] },
  },
  vendor_onboarding: {
    label: 'Vendor onboarding',
    description: 'Welcome email when a new vendor registers on the portal.',
    defaults: { fromEmail: 'partner-onboarding@tryvvo.com', fromName: 'Tryvvo Partner Onboarding', cc: ['admin@tryvvo.com'] },
  },
  admin_alert: {
    label: 'Admin alerts',
    description: 'Internal notifications sent to the Tryvvo team.',
    defaults: { fromEmail: 'support@tryvvo.com', fromName: 'Tryvvo Alerts', cc: [] },
  },
};

export const DEFAULT_ADMIN_EMAILS = ['admin@tryvvo.com'];

const CACHE_MS = 60_000;
let cached: { at: number; routes: Partial<Record<EmailCategory, Partial<EmailRoute>>>; adminEmails: string[] } | null = null;

export function cleanEmailList(value: unknown): string[] {
  const list = Array.isArray(value) ? value : typeof value === 'string' ? value.split(/[,;\s]+/) : [];
  return [...new Set(list.map(item => String(item).trim().toLowerCase()).filter(item => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item)))];
}

async function loadOverrides() {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached;
  try {
    const { db } = await connectToDatabase();
    const doc = await db.collection('email_settings').findOne({ key: 'routes' });
    const adminEmails = cleanEmailList(doc?.adminEmails);
    cached = {
      at: Date.now(),
      routes: (doc?.routes as Partial<Record<EmailCategory, Partial<EmailRoute>>>) || {},
      adminEmails: adminEmails.length ? adminEmails : DEFAULT_ADMIN_EMAILS,
    };
  } catch (error) {
    console.error('[EmailRouting] Could not load overrides, using defaults:', error);
    cached = { at: Date.now(), routes: {}, adminEmails: DEFAULT_ADMIN_EMAILS };
  }
  return cached;
}

/** Where internal alerts go when there is no vendor to notify (e.g. Tryvvo's own products). */
export async function getAdminEmails(): Promise<string[]> {
  return (await loadOverrides()).adminEmails;
}

/** Drops the cached overrides so the next email uses freshly saved settings. */
export function clearEmailRouteCache() {
  cached = null;
}

export async function getEmailRoute(category: EmailCategory): Promise<EmailRoute> {
  const base = EMAIL_CATEGORIES[category]?.defaults || EMAIL_CATEGORIES.account.defaults;
  const override = (await loadOverrides()).routes[category] || {};
  const fromEmail = cleanEmailList(override.fromEmail)[0] || base.fromEmail;
  return {
    fromEmail,
    fromName: (override.fromName || base.fromName).trim(),
    cc: override.cc !== undefined ? cleanEmailList(override.cc) : base.cc,
    replyTo: cleanEmailList(override.replyTo)[0] || undefined,
  };
}

export async function getAllEmailRoutes(): Promise<Record<EmailCategory, EmailRoute>> {
  const entries = await Promise.all((Object.keys(EMAIL_CATEGORIES) as EmailCategory[]).map(async key => [key, await getEmailRoute(key)] as const));
  return Object.fromEntries(entries) as Record<EmailCategory, EmailRoute>;
}
