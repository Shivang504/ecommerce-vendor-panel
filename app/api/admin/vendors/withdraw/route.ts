import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { getUserFromRequest, isVendor } from '@/lib/auth';
import { createWithdrawal, getVendorWithdrawals } from '@/lib/models/withdrawal';
import { getVendorById } from '@/lib/models/vendor';
import { getAllNotifications, createNotification } from '@/lib/models/notification';

// POST - Request withdrawal
export async function POST(request: NextRequest) {
  try {
    const currentUser = getUserFromRequest(request);
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Only vendors can request withdrawal
    if (!isVendor(currentUser)) {
      return NextResponse.json(
        { error: 'Access denied. Vendor access required.' },
        { status: 403 }
      );
    }

    const { db } = await connectToDatabase();
    const body = await request.json();
    const { amount, requestNote, paymentMethod } = body;

    // Validation
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid withdrawal amount' },
        { status: 400 }
      );
    }

    // Get vendor details
    const vendor = await getVendorById(currentUser.id);
    if (!vendor) {
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      );
    }

    // Check wallet balance
    const walletBalance = vendor.walletBalance || 0;
    
    // Get pending withdrawals
    const withdrawals = await getVendorWithdrawals(currentUser.id);
    const pendingWithdrawals = withdrawals
      .filter(w => w.status === 'pending')
      .reduce((sum, w) => sum + w.amount, 0);

    const availableBalance = walletBalance - pendingWithdrawals;

    if (amount > availableBalance) {
      return NextResponse.json(
        { error: `Insufficient balance. Available: ₹${availableBalance.toFixed(2)}` },
        { status: 400 }
      );
    }

    // Minimum withdrawal amount
    const minWithdrawal = 100; // Minimum ₹100
    if (amount < minWithdrawal) {
      return NextResponse.json(
        { error: `Minimum withdrawal amount is ₹${minWithdrawal}` },
        { status: 400 }
      );
    }

    // Get account details from vendor
    const accountDetails: any = {};
    if (vendor.bankName) accountDetails.bankName = vendor.bankName;
    if (vendor.accountNumber) accountDetails.accountNumber = vendor.accountNumber;
    if (vendor.ifscCode) accountDetails.ifscCode = vendor.ifscCode;
    if (vendor.accountHolderName) accountDetails.accountHolderName = vendor.accountHolderName;
    if (vendor.upiId) accountDetails.upiId = vendor.upiId;

    // Create withdrawal request
    const withdrawalId = await createWithdrawal({
      vendorId: currentUser.id,
      vendorName: vendor.storeName || vendor.ownerName,
      amount,
      status: 'pending',
      requestNote: requestNote || '',
      paymentMethod: paymentMethod || (accountDetails.upiId ? 'upi' : 'bank'),
      accountDetails,
    });

    // Create notification for admin (admin notifications don't need orderId)
    try {
      await createNotification({
        type: 'withdrawal_request',
        title: 'New Withdrawal Request',
        message: `${vendor.storeName || vendor.ownerName} requested withdrawal of ₹${amount}`,
        metadata: {
          withdrawalId: withdrawalId.toString(),
          amount,
          vendorId: currentUser.id,
          vendorName: vendor.storeName || vendor.ownerName,
        },
      });
    } catch (notifError) {
      console.error('[Withdrawal] Error creating notification:', notifError);
      // Don't fail withdrawal request if notification fails
    }

    return NextResponse.json({
      success: true,
      message: 'Withdrawal request submitted successfully',
      withdrawalId: withdrawalId.toString(),
    }, { status: 201 });
  } catch (error: any) {
    console.error('[Withdrawal API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process withdrawal request', details: error.message },
      { status: 500 }
    );
  }
}

