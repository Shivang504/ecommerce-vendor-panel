import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { getUserFromRequest, isVendor } from '@/lib/auth';
import { resolveApprovalStatus } from '@/lib/coupon-display';

function buildApprovalStatusOnSave(options: {
  isDraftSave: boolean;
  isVendorUser: boolean;
  existingApprovalStatus?: string;
}): 'draft' | 'pending' | 'approved' {
  if (options.isDraftSave) return 'draft';
  if (options.isVendorUser) return 'pending';
  return 'approved';
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { db } = await connectToDatabase();
    const currentUser = getUserFromRequest(request);

    if (!currentUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid coupon ID' }, { status: 400 });
    }

    const coupon = await db.collection('coupons').findOne({ _id: new ObjectId(id) });

    if (!coupon) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }

    if (isVendor(currentUser) && coupon.vendorId !== currentUser.id) {
      return NextResponse.json({ error: 'Access denied. You can only access your own coupons.' }, { status: 403 });
    }

    return NextResponse.json({
      ...coupon,
      _id: coupon._id.toString(),
    });
  } catch (error) {
    console.error('[Coupon] Error fetching coupon:', error);
    return NextResponse.json({ error: 'Failed to fetch coupon' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { db } = await connectToDatabase();
    const currentUser = getUserFromRequest(request);

    if (!currentUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid coupon ID' }, { status: 400 });
    }

    const existingCoupon = await db.collection('coupons').findOne({ _id: new ObjectId(id) });

    if (!existingCoupon) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }

    if (isVendor(currentUser) && existingCoupon.vendorId !== currentUser.id) {
      return NextResponse.json({ error: 'Access denied. You can only modify your own coupons.' }, { status: 403 });
    }

    const body = await request.json();
    const vendorUser = isVendor(currentUser);

    if (Object.keys(body).length === 1 && typeof body.status === 'boolean') {
      if (body.status === true && resolveApprovalStatus(existingCoupon) !== 'approved') {
        return NextResponse.json(
          { error: 'Only approved coupons can be turned on. Please wait for admin approval.' },
          { status: 400 }
        );
      }

      await db.collection('coupons').updateOne(
        { _id: new ObjectId(id) },
        { $set: { status: body.status, updatedAt: new Date() } }
      );

      const updated = await db.collection('coupons').findOne({ _id: new ObjectId(id) });
      return NextResponse.json({ ...updated, _id: updated?._id.toString() });
    }

    const {
      title,
      description,
      code,
      type,
      amount,
      maxDiscountAmount,
      startDate,
      endDate,
      isExpired,
      isFirstOrder,
      status,
      applyToAllProducts,
      products,
      minimumSpend,
      isUnlimited,
      usagePerCoupon,
      usagePerCustomer,
      isDraft,
      formProgressTab,
    } = body;

    const isDraftSave = isDraft === true;

    if (!title || title.trim() === '') {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    if (!description || description.trim() === '') {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }
    if (!code || code.trim() === '') {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }
    if (!type) {
      return NextResponse.json({ error: 'Type is required' }, { status: 400 });
    }
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Amount is required and must be greater than 0' }, { status: 400 });
    }

    if (vendorUser && applyToAllProducts === false) {
      return NextResponse.json(
        { error: 'Product coupons are admin controlled. Vendors can only create sitewide coupons.' },
        { status: 400 }
      );
    }

    const codeConflict = await db.collection('coupons').findOne({
      code: { $regex: new RegExp(`^${code}$`, 'i') },
      _id: { $ne: new ObjectId(id) },
    });

    if (codeConflict) {
      return NextResponse.json({ error: 'Coupon with this code already exists' }, { status: 400 });
    }

    if (!isDraftSave) {
      const effectiveApplyToAll = vendorUser ? true : applyToAllProducts || false;
      if (!effectiveApplyToAll && (!products || products.length === 0)) {
        return NextResponse.json({ error: 'Products are required when not applying to all products' }, { status: 400 });
      }
      if (!minimumSpend || minimumSpend <= 0) {
        return NextResponse.json({ error: 'Minimum spend is required and must be greater than 0' }, { status: 400 });
      }
      if (!isUnlimited) {
        if (!usagePerCoupon || usagePerCoupon <= 0) {
          return NextResponse.json({ error: 'Usage per coupon is required and must be greater than 0' }, { status: 400 });
        }
        if (!usagePerCustomer || usagePerCustomer <= 0) {
          return NextResponse.json({ error: 'Usage per customer is required and must be greater than 0' }, { status: 400 });
        }
      }
    }

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    if (end && start && end < start) {
      return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 });
    }

    const approvalStatus = buildApprovalStatusOnSave({
      isDraftSave,
      isVendorUser: vendorUser,
      existingApprovalStatus: existingCoupon.approvalStatus,
    });

    const wantsActive = status === true;
    const canBeActive = approvalStatus === 'approved' && wantsActive;

    const updateData: Record<string, unknown> = {
      title: title.trim(),
      description: description.trim(),
      code: code.trim().toUpperCase(),
      type,
      amount: parseFloat(amount),
      maxDiscountAmount: type === 'percentage' && maxDiscountAmount ? parseFloat(maxDiscountAmount) : null,
      startDate: start || null,
      endDate: end || null,
      isExpired: isExpired || false,
      isFirstOrder: isFirstOrder || false,
      status: canBeActive,
      applyToAllProducts: vendorUser ? true : applyToAllProducts || false,
      products: Array.isArray(products) ? products : [],
      minimumSpend: parseFloat(minimumSpend) || 0,
      isUnlimited: isUnlimited || false,
      usagePerCoupon: isUnlimited ? 0 : parseInt(usagePerCoupon) || 0,
      usagePerCustomer: isUnlimited ? 0 : parseInt(usagePerCustomer) || 0,
      isDraft: isDraftSave,
      formProgressTab: isDraftSave ? formProgressTab || existingCoupon.formProgressTab || null : null,
      approvalStatus,
      updatedAt: new Date(),
    };

    if (existingCoupon.vendorId) {
      updateData.vendorId = existingCoupon.vendorId;
    } else if (vendorUser) {
      updateData.vendorId = currentUser.id;
    }

    if (vendorUser && !isDraftSave) {
      updateData.status = false;
    }

    await db.collection('coupons').updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    const updated = await db.collection('coupons').findOne({ _id: new ObjectId(id) });

    return NextResponse.json({
      ...updated,
      _id: updated?._id.toString(),
    });
  } catch (error) {
    console.error('[Coupon] Error updating coupon:', error);
    return NextResponse.json({ error: 'Failed to update coupon' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { db } = await connectToDatabase();
    const currentUser = getUserFromRequest(request);

    if (!currentUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid coupon ID' }, { status: 400 });
    }

    const coupon = await db.collection('coupons').findOne({ _id: new ObjectId(id) });

    if (!coupon) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }

    if (isVendor(currentUser) && coupon.vendorId !== currentUser.id) {
      return NextResponse.json({ error: 'Access denied. You can only delete your own coupons.' }, { status: 403 });
    }

    const result = await db.collection('coupons').deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Coupon deleted successfully' });
  } catch (error) {
    console.error('[Coupon] Error deleting coupon:', error);
    return NextResponse.json({ error: 'Failed to delete coupon' }, { status: 500 });
  }
}
