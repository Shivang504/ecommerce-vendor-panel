import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { getUserFromRequest, isVendor } from '@/lib/auth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { db } = await connectToDatabase();
    const currentUser = getUserFromRequest(request);

    // Check authentication
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid coupon ID' }, { status: 400 });
    }

    const coupon = await db.collection('coupons').findOne({ _id: new ObjectId(id) });

    if (!coupon) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }

    // Check authorization - vendors can only access their own coupons
    if (isVendor(currentUser)) {
      if (coupon.vendorId !== currentUser.id) {
        return NextResponse.json(
          { error: 'Access denied. You can only access your own coupons.' },
          { status: 403 }
        );
      }
    }
    // Admins can access all coupons

    return NextResponse.json({
      ...coupon,
      _id: coupon._id.toString(),
    });
  } catch (error) {
    console.error('[v0] Error fetching coupon:', error);
    return NextResponse.json({ error: 'Failed to fetch coupon' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { db } = await connectToDatabase();
    const currentUser = getUserFromRequest(request);

    // Check authentication
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid coupon ID' }, { status: 400 });
    }

    // Check if coupon exists and user has permission
    const existingCoupon = await db.collection('coupons').findOne({ _id: new ObjectId(id) });
    
    if (!existingCoupon) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }

    // Check authorization - vendors can only modify their own coupons
    if (isVendor(currentUser)) {
      if (existingCoupon.vendorId !== currentUser.id) {
        return NextResponse.json(
          { error: 'Access denied. You can only modify your own coupons.' },
          { status: 403 }
        );
      }
    }
    // Admins can modify all coupons

    const body = await request.json();
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
    } = body;

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

    // Check if coupon with same code exists (excluding current coupon)
    // Coupon codes must be unique across the entire system (both admin and vendor coupons)
    const codeConflict = await db.collection('coupons').findOne({
      code: { $regex: new RegExp(`^${code}$`, 'i') },
      _id: { $ne: new ObjectId(id) },
    });

    if (codeConflict) {
      return NextResponse.json({ error: 'Coupon with this code already exists' }, { status: 400 });
    }

    // Validation for restriction tab
    if (!applyToAllProducts && (!products || products.length === 0)) {
      return NextResponse.json({ error: 'Products are required when not applying to all products' }, { status: 400 });
    }
    if (!minimumSpend || minimumSpend <= 0) {
      return NextResponse.json({ error: 'Minimum spend is required and must be greater than 0' }, { status: 400 });
    }

    // Validation for usage tab
    if (!isUnlimited) {
      if (!usagePerCoupon || usagePerCoupon <= 0) {
        return NextResponse.json({ error: 'Usage per coupon is required and must be greater than 0' }, { status: 400 });
      }
      if (!usagePerCustomer || usagePerCustomer <= 0) {
        return NextResponse.json({ error: 'Usage per customer is required and must be greater than 0' }, { status: 400 });
      }
    }

    // Validate dates
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    
    if (end && start && end < start) {
      return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 });
    }

    const updateData: any = {
      title: title.trim(),
      description: description.trim(),
      code: code.trim().toUpperCase(),
      type: type,
      amount: parseFloat(amount),
      maxDiscountAmount: type === 'percentage' && maxDiscountAmount ? parseFloat(maxDiscountAmount) : null,
      startDate: start || null,
      endDate: end || null,
      isExpired: isExpired || false,
      isFirstOrder: isFirstOrder || false,
      status: status !== undefined ? status : true,
      applyToAllProducts: applyToAllProducts || false,
      products: Array.isArray(products) ? products : [],
      minimumSpend: parseFloat(minimumSpend) || 0,
      isUnlimited: isUnlimited || false,
      usagePerCoupon: isUnlimited ? 0 : (parseInt(usagePerCoupon) || 0),
      usagePerCustomer: isUnlimited ? 0 : (parseInt(usagePerCustomer) || 0),
      updatedAt: new Date(),
    };
    
    // Preserve vendorId - don't allow changing it
    // If it's a vendor's coupon, ensure vendorId stays the same
    if (existingCoupon.vendorId) {
      updateData.vendorId = existingCoupon.vendorId;
    } else if (isVendor(currentUser)) {
      // If admin coupon being edited by vendor, this shouldn't happen (already checked above)
      // But just in case, set vendorId
      updateData.vendorId = currentUser.id;
    }

    const result = await db.collection('coupons').updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }

    const updated = await db.collection('coupons').findOne({ _id: new ObjectId(id) });

    return NextResponse.json({
      ...updated,
      _id: updated?._id.toString(),
    });
  } catch (error) {
    console.error('[v0] Error updating coupon:', error);
    return NextResponse.json({ error: 'Failed to update coupon' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { db } = await connectToDatabase();
    const currentUser = getUserFromRequest(request);

    // Check authentication
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid coupon ID' }, { status: 400 });
    }

    // Check if coupon exists and user has permission
    const coupon = await db.collection('coupons').findOne({ _id: new ObjectId(id) });
    
    if (!coupon) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }

    // Check authorization - vendors can only delete their own coupons
    if (isVendor(currentUser)) {
      if (coupon.vendorId !== currentUser.id) {
        return NextResponse.json(
          { error: 'Access denied. You can only delete your own coupons.' },
          { status: 403 }
        );
      }
    }
    // Admins can delete all coupons

    const result = await db.collection('coupons').deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Coupon deleted successfully' });
  } catch (error) {
    console.error('[v0] Error deleting coupon:', error);
    return NextResponse.json({ error: 'Failed to delete coupon' }, { status: 500 });
  }
}

