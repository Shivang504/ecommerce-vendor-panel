import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getUserFromRequest, isVendor } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import {
  getWorkflowStatus,
  resolveApprovalStatus,
  type CouponListItem,
} from '@/lib/coupon-display';

function buildApprovalStatusOnSave(options: {
  isDraftSave: boolean;
  isVendorUser: boolean;
  existingApprovalStatus?: string;
}): 'draft' | 'pending' | 'approved' {
  if (options.isDraftSave) return 'draft';
  if (options.isVendorUser) return 'pending';
  return 'approved';
}

export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const currentUser = getUserFromRequest(request);

    if (!currentUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const workflowStatus = searchParams.get('workflowStatus');
    const couponType = searchParams.get('couponType');
    const approvalStatus = searchParams.get('approvalStatus');

    const filter: Record<string, unknown> = {};

    if (isVendor(currentUser)) {
      filter.vendorId = currentUser.id;
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
      ];
    }

    if (couponType === 'product') {
      filter.applyToAllProducts = false;
    } else if (couponType === 'sitewide') {
      filter.applyToAllProducts = true;
    }

    let coupons = await db.collection('coupons').find(filter).sort({ createdAt: -1 }).toArray();

    if (workflowStatus && workflowStatus !== 'all') {
      coupons = coupons.filter(coupon => getWorkflowStatus(coupon as CouponListItem) === workflowStatus);
    }

    if (approvalStatus && approvalStatus !== 'all') {
      coupons = coupons.filter(
        coupon => resolveApprovalStatus(coupon as CouponListItem) === approvalStatus
      );
    }

    const vendorObjectIds = coupons
      .map(coupon => coupon.vendorId)
      .filter((vendorId): vendorId is string | ObjectId => !!vendorId)
      .map(vendorId => vendorId.toString())
      .filter(vendorId => ObjectId.isValid(vendorId))
      .map(vendorId => new ObjectId(vendorId));

    const vendors = vendorObjectIds.length
      ? await db
          .collection('vendors')
          .find(
            { _id: { $in: vendorObjectIds } },
            { projection: { storeName: 1, ownerName: 1, email: 1 } }
          )
          .toArray()
      : [];

    const vendorNames = new Map(
      vendors.map(vendor => [
        vendor._id.toString(),
        vendor.storeName || vendor.ownerName || vendor.email || 'Vendor',
      ])
    );

    return NextResponse.json(
      coupons.map(coupon => ({
        ...coupon,
        _id: coupon._id.toString(),
        vendorName: coupon.vendorId
          ? vendorNames.get(coupon.vendorId.toString()) || 'Vendor'
          : 'Admin',
      }))
    );
  } catch (error) {
    console.error('[Coupon] Error fetching coupons:', error);
    return NextResponse.json({ error: 'Failed to fetch coupons' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const currentUser = getUserFromRequest(request);

    if (!currentUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

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
      isDraft,
      formProgressTab,
    } = body;

    const isDraftSave = isDraft === true;
    const vendorUser = isVendor(currentUser);

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

    const existingCoupon = await db.collection('coupons').findOne({
      code: { $regex: new RegExp(`^${code}$`, 'i') },
    });

    if (existingCoupon) {
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
    });

    const canBeActive = approvalStatus === 'approved' && status === true;

    const newCoupon = {
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
      applyToAllProducts: vendorUser ? true : isDraftSave ? (applyToAllProducts ?? true) : applyToAllProducts || false,
      products: Array.isArray(products) ? products : [],
      minimumSpend: isDraftSave ? parseFloat(minimumSpend) || 0 : parseFloat(minimumSpend) || 0,
      isUnlimited: isDraftSave ? (isUnlimited ?? true) : isUnlimited || false,
      usagePerCoupon: isDraftSave ? 0 : isUnlimited ? 0 : parseInt(usagePerCoupon) || 0,
      usagePerCustomer: isDraftSave ? 0 : isUnlimited ? 0 : parseInt(usagePerCustomer) || 0,
      usageCount: 0,
      isDraft: isDraftSave,
      formProgressTab: isDraftSave ? formProgressTab || 'restriction' : null,
      approvalStatus,
      vendorId: vendorUser ? currentUser.id : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('coupons').insertOne(newCoupon);

    return NextResponse.json(
      {
        ...newCoupon,
        _id: result.insertedId.toString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Coupon] Error creating coupon:', error);
    return NextResponse.json({ error: 'Failed to create coupon' }, { status: 500 });
  }
}
