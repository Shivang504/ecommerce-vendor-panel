import { NextRequest, NextResponse } from 'next/server';
import { getAdminByEmail } from '@/lib/models/admin';
import { getVendorByEmail, verifyVendorPassword } from '@/lib/models/vendor';
import { generateToken } from '@/lib/auth';

/** Vendor Panel: approved vendors only. Staff admins must use the Admin Panel app. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const admin = await getAdminByEmail(email);
    if (admin) {
      return NextResponse.json(
        {
          error:
            'This account is an administrator. Please sign in through the Admin Panel application.',
        },
        { status: 403 }
      );
    }

    const vendor = await getVendorByEmail(email);
    if (!vendor) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (vendor.status === 'suspended' || vendor.status === 'rejected') {
      return NextResponse.json(
        { error: `Your account is ${vendor.status}. Please contact administrator.` },
        { status: 401 }
      );
    }

    if (vendor.status === 'pending') {
      return NextResponse.json(
        { error: 'Your account is pending approval. Please wait for admin approval.' },
        { status: 401 }
      );
    }

    const passwordMatch = await verifyVendorPassword(password, vendor.password);
    if (!passwordMatch) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = generateToken({
      _id: vendor._id?.toString(),
      email: vendor.email,
      role: 'vendor',
    });

    const response = NextResponse.json({
      success: true,
      token,
      admin: { email: vendor.email, name: vendor.ownerName, role: 'vendor', storeName: vendor.storeName },
    });

    response.cookies.set('adminToken', token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400 * 7,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[v0] Login error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal server error', details: errorMessage }, { status: 500 });
  }
}
