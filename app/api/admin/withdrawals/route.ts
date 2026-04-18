import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, isAdmin } from '@/lib/auth';
import { getAllWithdrawals } from '@/lib/models/withdrawal';

// GET - Get all withdrawals (admin only)
export async function GET(request: NextRequest) {
  try {
    const currentUser = getUserFromRequest(request);
    
    if (!currentUser || !isAdmin(currentUser)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as 'pending' | 'approved' | 'rejected' | null;
    const vendorId = searchParams.get('vendorId');

    const filters: any = {};
    if (status) filters.status = status;
    if (vendorId) filters.vendorId = vendorId;

    const withdrawals = await getAllWithdrawals(filters);

    // Calculate summary statistics
    const pendingAmount = withdrawals
      .filter(w => w.status === 'pending')
      .reduce((sum, w) => sum + w.amount, 0);

    const approvedAmount = withdrawals
      .filter(w => w.status === 'approved')
      .reduce((sum, w) => sum + w.amount, 0);

    return NextResponse.json({
      withdrawals,
      summary: {
        total: withdrawals.length,
        pending: withdrawals.filter(w => w.status === 'pending').length,
        approved: withdrawals.filter(w => w.status === 'approved').length,
        rejected: withdrawals.filter(w => w.status === 'rejected').length,
        pendingAmount,
        approvedAmount,
      },
    });
  } catch (error: any) {
    console.error('[Withdrawals API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch withdrawals', details: error.message },
      { status: 500 }
    );
  }
}

