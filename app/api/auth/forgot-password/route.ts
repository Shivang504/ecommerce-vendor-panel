import { NextRequest, NextResponse } from 'next/server';
import { getAdminByEmail } from '@/lib/models/admin';
import {
  generateVendorResetPasswordToken,
  getVendorByEmail,
  setVendorResetPasswordToken,
} from '@/lib/models/vendor';
import { generatePasswordResetEmailHTML, sendEmail } from '@/lib/email';

function publicOrigin(request: NextRequest): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const proto = request.headers.get('x-forwarded-proto') || 'http';
  if (host) return `${proto}://${host}`;
  return new URL(request.url).origin.replace(/\/$/, '');
}

/** Vendor panel: request password reset email (approved or pending vendors only). */
export async function POST(request: NextRequest) {
  const genericMessage = {
    message: 'If an account exists for this email, you will receive password reset instructions shortly.',
  };

  try {
    const body = await request.json();
    const rawEmail = typeof body.email === 'string' ? body.email.trim() : '';

    if (!rawEmail) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const admin = await getAdminByEmail(rawEmail);
    if (admin) {
      return NextResponse.json(genericMessage);
    }

    const vendor = await getVendorByEmail(rawEmail);
    if (!vendor || !vendor._id) {
      return NextResponse.json(genericMessage);
    }

    if (vendor.status === 'suspended' || vendor.status === 'rejected') {
      return NextResponse.json(genericMessage);
    }

    const token = generateVendorResetPasswordToken();
    await setVendorResetPasswordToken(vendor._id.toString(), token);

    const base = publicOrigin(request);
    const resetLink = `${base}/reset-password?token=${encodeURIComponent(token)}`;
    const name = vendor.ownerName || vendor.storeName || 'Vendor';
    const toEmail = typeof vendor.email === 'string' ? vendor.email.trim() : rawEmail;

    await sendEmail({
      to: toEmail,
      subject: 'Reset your vendor password',
      html: generatePasswordResetEmailHTML(name, resetLink),
    });

    return NextResponse.json(genericMessage);
  } catch (err) {
    console.error('[auth/forgot-password]', err);
    return NextResponse.json(
      { error: 'Could not send reset email. Please try again later or contact support.' },
      { status: 502 }
    );
  }
}
