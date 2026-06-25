import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getUserFromRequest, isAdmin } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const currentUser = getUserFromRequest(request);

    if (!currentUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (!isAdmin(currentUser)) {
      return NextResponse.json({ error: 'Only admins can approve or reject coupons' }, { status: 403 });
    }

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid coupon ID' }, { status: 400 });
    }

    const body = await request.json();
    const action = body.action as 'approve' | 'reject';

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ error: 'Invalid action. Use approve or reject.' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const existingCoupon = await db.collection('coupons').findOne({ _id: new ObjectId(id) });

    if (!existingCoupon) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }

    if (existingCoupon.isDraft) {
      return NextResponse.json({ error: 'Draft coupons must be submitted before approval' }, { status: 400 });
    }

    const approvalStatus = action === 'approve' ? 'approved' : 'rejected';
    const updateData: Record<string, unknown> = {
      approvalStatus,
      status: action === 'approve',
      updatedAt: new Date(),
    };

    await db.collection('coupons').updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    const updated = await db.collection('coupons').findOne({ _id: new ObjectId(id) });

    return NextResponse.json({
      ...updated,
      _id: updated?._id.toString(),
    });
  } catch (error) {
    console.error('[Coupon] Approve/reject error:', error);
    return NextResponse.json({ error: 'Failed to update coupon approval status' }, { status: 500 });
  }
}
