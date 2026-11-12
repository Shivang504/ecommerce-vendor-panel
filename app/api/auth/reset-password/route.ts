import { NextRequest, NextResponse } from 'next/server';
import { resetVendorPassword, verifyVendorResetPasswordToken } from '@/lib/models/vendor';

export async function GET(request: NextRequest) {
  const token = (request.nextUrl.searchParams.get('token') || '').trim();
  if (!token) {
    return NextResponse.json({ error: 'Reset link is missing or invalid. Request a new one.' }, { status: 400 });
  }
  try {
    const check = await verifyVendorResetPasswordToken(token);
    if (!check.success) {
      return NextResponse.json({ error: check.error, expired: check.expired || false }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Vendor Reset Password] verify', error);
    return NextResponse.json({ error: 'Could not check the reset link' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = (body?.token ?? '').toString().trim();
    const password = (body?.password ?? '').toString();

    if (!token) {
      return NextResponse.json({ error: 'Reset token is required' }, { status: 400 });
    }
    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const check = await verifyVendorResetPasswordToken(token);
    if (!check.success || !check.vendorId) {
      return NextResponse.json({ error: check.error || 'Invalid reset link', expired: check.expired || false }, { status: 400 });
    }

    await resetVendorPassword(check.vendorId, password);
    return NextResponse.json({ success: true, message: 'Password updated' });
  } catch (error: any) {
    console.error('[Vendor Reset Password]', error);
    return NextResponse.json({ error: error?.message || 'Failed to reset password' }, { status: 500 });
  }
}
