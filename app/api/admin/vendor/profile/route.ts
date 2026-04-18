import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { getUserFromRequest, isVendor } from '@/lib/auth';
import { getVendorById, updateVendor } from '@/lib/models/vendor';
import { isValidIndianGstin, isValidIndianPan } from '@/lib/india-tax-ids';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^[0-9]{10}$/;
const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const accountNumberRegex = /^[0-9]{6,18}$/;

export async function GET(request: NextRequest) {
  try {
    const currentUser = getUserFromRequest(request);
    if (!currentUser || !isVendor(currentUser)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const vendor = await getVendorById(currentUser.id);
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    return NextResponse.json({
      ownerName: vendor.ownerName || '',
      email: vendor.email || '',
      phone: vendor.phone || '',
      panNumber: vendor.panNumber || vendor.pan || vendor.panCard || vendor.panNo || '',
      gstNumber: vendor.gstNumber || vendor.gstinNumber || vendor.gstNo || '',
      accountHolderName:
        vendor.accountHolderName ||
        vendor.bankDetails?.accountHolderName ||
        vendor.bank?.accountHolderName ||
        '',
      accountNumber:
        vendor.accountNumber ||
        vendor.bankDetails?.accountNumber ||
        vendor.bank?.accountNumber ||
        '',
      ifscCode:
        vendor.ifscCode ||
        vendor.bankDetails?.ifscCode ||
        vendor.bank?.ifscCode ||
        '',
      pickupLocation:
        vendor.pickupLocation ||
        vendor.warehouseLocation ||
        vendor.pickupAddress?.location ||
        vendor.pickupAddress?.pickupLocation ||
        '',
    });
  } catch (error: any) {
    console.error('[Vendor Profile] Failed to fetch profile:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch vendor profile' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const currentUser = getUserFromRequest(request);
    if (!currentUser || !isVendor(currentUser)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      ownerName,
      email,
      phone,
      panNumber,
      gstNumber,
      accountHolderName,
      accountNumber,
      ifscCode,
      pickupLocation,
    } = body || {};

    const errors: Record<string, string> = {};
    const normalizedPan = typeof panNumber === 'string' ? panNumber.trim().toUpperCase() : '';
    const normalizedGst = typeof gstNumber === 'string' ? gstNumber.trim().toUpperCase() : '';
    const normalizedIfsc = typeof ifscCode === 'string' ? ifscCode.trim().toUpperCase() : '';
    const normalizedAccount = typeof accountNumber === 'string' ? accountNumber.trim() : '';

    if (ownerName !== undefined && (!ownerName || ownerName.trim().length < 2)) {
      errors.ownerName = 'Full name must be at least 2 characters';
    }
    if (email !== undefined && (!email || !emailRegex.test(email))) {
      errors.email = 'Enter a valid email address';
    }
    if (phone !== undefined && (!phone || !phoneRegex.test(phone))) {
      errors.phone = 'Enter a valid 10-digit phone number';
    }
    if (panNumber !== undefined && (!normalizedPan || !isValidIndianPan(normalizedPan))) {
      errors.panNumber = 'Enter a valid PAN (e.g., ABCDE1234F)';
    }
    if (gstNumber !== undefined && (!normalizedGst || !isValidIndianGstin(normalizedGst))) {
      errors.gstNumber = 'Enter a valid GSTIN';
    }
    if (accountHolderName !== undefined && (!accountHolderName || accountHolderName.trim().length < 2)) {
      errors.accountHolderName = 'Account holder name is required';
    }
    if (accountNumber !== undefined && (!normalizedAccount || !accountNumberRegex.test(normalizedAccount))) {
      errors.accountNumber = 'Enter a valid account number';
    }
    if (ifscCode !== undefined && (!normalizedIfsc || !ifscRegex.test(normalizedIfsc))) {
      errors.ifscCode = 'Enter a valid IFSC code';
    }
    if (pickupLocation !== undefined && (!pickupLocation || pickupLocation.trim().length < 3)) {
      errors.pickupLocation = 'Pickup location is required';
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', fieldErrors: errors },
        { status: 400 }
      );
    }

    if (email !== undefined && email) {
      const { db } = await connectToDatabase();
      const vendorId = ObjectId.isValid(currentUser.id) ? new ObjectId(currentUser.id) : currentUser.id;
      const existing = await db.collection('vendors').findOne({
        email: email,
        _id: { $ne: vendorId },
      });
      if (existing) {
        return NextResponse.json(
          { error: 'Email is already in use', fieldErrors: { email: 'Email is already in use' } },
          { status: 400 }
        );
      }
    }

    const updateData: Record<string, string> = {};
    if (ownerName !== undefined) updateData.ownerName = ownerName.trim();
    if (email !== undefined) updateData.email = email.trim().toLowerCase();
    if (phone !== undefined) updateData.phone = phone.trim();
    if (panNumber !== undefined) updateData.panNumber = normalizedPan;
    if (gstNumber !== undefined) updateData.gstNumber = normalizedGst;
    if (accountHolderName !== undefined) updateData.accountHolderName = accountHolderName.trim();
    if (accountNumber !== undefined) updateData.accountNumber = normalizedAccount;
    if (ifscCode !== undefined) updateData.ifscCode = normalizedIfsc;
    if (pickupLocation !== undefined) updateData.pickupLocation = pickupLocation.trim();

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields provided' },
        { status: 400 }
      );
    }

    await updateVendor(currentUser.id, updateData);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Vendor Profile] Failed to update profile:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update vendor profile' },
      { status: 500 }
    );
  }
}

