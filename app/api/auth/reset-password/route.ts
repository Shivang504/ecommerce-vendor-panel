import { NextRequest, NextResponse } from 'next/server';
import { resetVendorPasswordWithToken, verifyVendorResetPasswordToken } from '@/lib/models/vendor';

const MIN_LEN = 8;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = typeof body.token === 'string' ? body.token.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!token || !password) {
      return NextResponse.json({ error: 'Token and new password are required' }, { status: 400 });
    }

    if (password.length < MIN_LEN) {
      return NextResponse.json(
        { error: `Password must be at least ${MIN_LEN} characters` },
        { status: 400 }
      );
    }

    const verified = await verifyVendorResetPasswordToken(token);
    if (!verified.success || !verified.vendorId) {
      return NextResponse.json(
        { error: verified.error || 'Invalid or expired reset link' },
        { status: 400 }
      );
    }

    await resetVendorPasswordWithToken(verified.vendorId, password);

    return NextResponse.json({ success: true, message: 'Password updated. You can sign in now.' });
  } catch (err) {
    console.error('[auth/reset-password]', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
