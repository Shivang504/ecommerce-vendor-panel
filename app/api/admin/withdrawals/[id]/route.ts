import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { getUserFromRequest, isAdmin } from '@/lib/auth';
import { getWithdrawalById, updateWithdrawalStatus } from '@/lib/models/withdrawal';
import { getVendorById } from '@/lib/models/vendor';
import { createNotification } from '@/lib/models/notification';

// PUT - Approve or reject withdrawal
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = getUserFromRequest(request);
    
    if (!currentUser || !isAdmin(currentUser)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { status, adminNote } = body;

    if (!status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be "approved" or "rejected"' },
        { status: 400 }
      );
    }

    // Get withdrawal
    const withdrawal = await getWithdrawalById(id);
    if (!withdrawal) {
      return NextResponse.json(
        { error: 'Withdrawal not found' },
        { status: 404 }
      );
    }

    if (withdrawal.status !== 'pending') {
      return NextResponse.json(
        { error: `Withdrawal is already ${withdrawal.status}` },
        { status: 400 }
      );
    }

    // Update withdrawal status
    await updateWithdrawalStatus(id, status, adminNote, currentUser.id);

    // If approved, deduct from vendor wallet
    if (status === 'approved') {
      const { db } = await connectToDatabase();
      const vendor = await getVendorById(withdrawal.vendorId.toString());
      
      if (vendor) {
        // Deduct from wallet and add to totalWithdrawn
        await db.collection('vendors').updateOne(
          { _id: new ObjectId(withdrawal.vendorId.toString()) },
          {
            $inc: {
              walletBalance: -withdrawal.amount,
              totalWithdrawn: withdrawal.amount,
            },
            $set: {
              updatedAt: new Date(),
            },
          }
        );

        // Create notification for vendor
        try {
          await createNotification({
            type: 'withdrawal_approved',
            title: 'Withdrawal Approved',
            message: `Your withdrawal request of ₹${withdrawal.amount} has been approved`,
            metadata: {
              withdrawalId: id,
              amount: withdrawal.amount,
              vendorId: withdrawal.vendorId.toString(),
            },
          });
        } catch (notifError) {
          console.error('[Withdrawal] Error creating vendor notification:', notifError);
        }
      }
    } else {
      // Rejected - create notification for vendor
      try {
        await createNotification({
          type: 'withdrawal_rejected',
          title: 'Withdrawal Rejected',
          message: `Your withdrawal request of ₹${withdrawal.amount} has been rejected. ${adminNote || ''}`,
          metadata: {
            withdrawalId: id,
            amount: withdrawal.amount,
            vendorId: withdrawal.vendorId.toString(),
          },
        });
      } catch (notifError) {
        console.error('[Withdrawal] Error creating vendor notification:', notifError);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Withdrawal ${status} successfully`,
    });
  } catch (error: any) {
    console.error('[Withdrawal API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update withdrawal', details: error.message },
      { status: 500 }
    );
  }
}

