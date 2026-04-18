import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

/**
 * GET /api/verify/check-vendor-email?email=xxx
 * Check if a vendor with this email already exists (for Start Selling flow)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email')?.trim();

    if (!email) {
      return NextResponse.json(
        { exists: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const escaped = email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existing = await db
      .collection('vendors')
      .findOne(
        { email: { $regex: new RegExp(`^${escaped}$`, 'i') } },
        { projection: { _id: 1 } }
      );

    return NextResponse.json({ exists: !!existing });
  } catch (error) {
    console.error('[verify] Error checking vendor email:', error);
    return NextResponse.json(
      { exists: false, error: 'Failed to check email' },
      { status: 500 }
    );
  }
}
