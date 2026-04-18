import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, isVendor } from '@/lib/auth';
import { getVendorById, verifyVendorPassword, hashVendorPassword, updateVendor } from '@/lib/models/vendor';
import { validatePassword } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const currentUser = getUserFromRequest(request);
    if (!currentUser || !isVendor(currentUser)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body || {};

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      );
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { error: passwordValidation.errors.join('. ') },
        { status: 400 }
      );
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: 'New password must be different from current password' },
        { status: 400 }
      );
    }

    const vendor = await getVendorById(currentUser.id);
    if (!vendor || !vendor.password) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    const passwordMatch = await verifyVendorPassword(currentPassword, vendor.password);
    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 401 }
      );
    }

    const hashedPassword = await hashVendorPassword(newPassword);
    await updateVendor(currentUser.id, { password: hashedPassword });

    return NextResponse.json({ success: true, message: 'Password updated successfully' });
  } catch (error: any) {
    console.error('[Vendor Change Password] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to change password' },
      { status: 500 }
    );
  }
}

