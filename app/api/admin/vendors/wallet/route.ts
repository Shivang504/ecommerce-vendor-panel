import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, isVendor, isAdmin } from '@/lib/auth';
import { getVendorEarningsSummary, processVendorEarningsFromOrder } from '@/lib/models/vendor-earnings';
import { getVendorWithdrawals } from '@/lib/models/withdrawal';

// GET - Get vendor wallet details
export async function GET(request: NextRequest) {
  try {
    const currentUser = getUserFromRequest(request);
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const vendorIdParam = searchParams.get('vendorId');

    // Determine which vendor's wallet to show
    let vendorId: string;
    
    if (isVendor(currentUser)) {
      // Vendors can only see their own wallet
      vendorId = currentUser.id;
    } else if (isAdmin(currentUser) && vendorIdParam) {
      // Admins can view any vendor's wallet if vendorId is provided
      vendorId = vendorIdParam;
    } else if (isAdmin(currentUser)) {
      // If admin accesses without vendorId, show their own (if they have a vendor account) or return error
      return NextResponse.json(
        { error: 'Please specify vendorId to view vendor wallet' },
        { status: 400 }
      );
    } else {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Get earnings summary
    const earningsSummary = await getVendorEarningsSummary(vendorId);

    // Get pending withdrawals
    const withdrawals = await getVendorWithdrawals(vendorId);
    const pendingWithdrawals = withdrawals
      .filter(w => w.status === 'pending')
      .reduce((sum, w) => sum + w.amount, 0);

    return NextResponse.json({
      success: true,
      wallet: {
        ...earningsSummary,
        pendingWithdrawals,
        availableBalance: earningsSummary.walletBalance - pendingWithdrawals,
        recentWithdrawals: withdrawals.slice(0, 10), // Last 10 withdrawals
      },
    });
  } catch (error: any) {
    console.error('[Vendor Wallet API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wallet details', details: error.message },
      { status: 500 }
    );
  }
}

