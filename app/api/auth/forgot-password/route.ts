import { NextRequest, NextResponse } from 'next/server';
import { getCustomerByEmailOrPhone, generateResetPasswordToken, setResetPasswordToken } from '@/lib/models/customer';
import { generatePasswordResetEmailHTML, sendEmail } from '@/lib/email';

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * POST /api/auth/forgot-password
 * Body: { identifier: string } where identifier can be email or mobile number
 *
 * Security note: This endpoint intentionally returns a 404 for unknown users
 * to satisfy product requirements ("validate at user level before sending reset communication").
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const identifier = (body?.identifier ?? '').toString().trim();

    if (!identifier) {
      return NextResponse.json({ error: 'Email or mobile number is required' }, { status: 400 });
    }

    const customer = await getCustomerByEmailOrPhone(identifier);
    if (!customer?._id) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!customer.email) {
      return NextResponse.json({ error: 'No email found for this user' }, { status: 400 });
    }

    const token = generateResetPasswordToken();
    await setResetPasswordToken(customer._id.toString(), token);

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const resetLink = `${baseUrl.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}`;

    const requestedVia = isEmail(identifier) ? 'email' : 'mobile number';
    const html = generatePasswordResetEmailHTML(customer.name || 'Customer', resetLink).replace(
      'You requested to reset your password.',
      `You requested to reset your password using your ${requestedVia}.`
    );

    await sendEmail({
      to: customer.email,
      subject: 'Reset your password',
      html,
      text: `Reset your password: ${resetLink}`,
    });

    return NextResponse.json({ success: true, message: 'Password reset link sent' });
  } catch (error: any) {
    console.error('[Forgot Password] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to process password reset request' },
      { status: 500 }
    );
  }
}

