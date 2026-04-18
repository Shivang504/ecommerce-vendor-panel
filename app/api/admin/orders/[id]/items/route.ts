import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getOrderById, approveItemReturn, rejectItemRequest, completeItemPickup } from '@/lib/models/order';
import { ObjectId } from 'mongodb';
import { sendEmail } from '@/lib/email';
import { generateCancelReturnStatusEmailHTML } from '@/lib/email-templates';

// POST - Approve/Reject item cancellation or return
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify admin authentication
    const currentUser = getUserFromRequest(request);
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'superadmin')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const order = await getOrderById(id);
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { itemIndex, action, rejectionReason, pickupDate, pickupTime, trackingNumber } = body;

    if (itemIndex === undefined || itemIndex === null) {
      return NextResponse.json(
        { error: 'Item index is required' },
        { status: 400 }
      );
    }

    if (!action || !['approve_return', 'reject_return', 'complete_pickup'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

    const item = order.items[itemIndex];
    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    let updatedOrder;
    let emailStatus: 'approved' | 'rejected' | 'pickup_scheduled' | 'pickup_completed' | 'refund_processed' = 'approved';

    // Item-level cancellations are now direct - no approval needed
    if (action === 'approve_return') {
      if (!pickupDate || !pickupTime) {
        return NextResponse.json(
          { error: 'Pickup date and time are required' },
          { status: 400 }
        );
      }
      updatedOrder = await approveItemReturn(id, itemIndex, new Date(pickupDate), pickupTime);
      emailStatus = 'pickup_scheduled';
    } else if (action === 'reject_return') {
      if (!rejectionReason) {
        return NextResponse.json(
          { error: 'Rejection reason is required' },
          { status: 400 }
        );
      }
      updatedOrder = await rejectItemRequest(id, itemIndex, rejectionReason, 'return');
      emailStatus = 'rejected';
    } else if (action === 'complete_pickup') {
      updatedOrder = await completeItemPickup(id, itemIndex, trackingNumber);
      // Check if refund was processed
      const orderAfterPickup = await getOrderById(id);
      if (orderAfterPickup) {
        const itemAfterPickup = orderAfterPickup.items[itemIndex];
        if (itemAfterPickup?.cancelReturnInfo?.status === 'refund_processed') {
          emailStatus = 'refund_processed';
        } else {
          emailStatus = 'pickup_completed';
        }
      } else {
        emailStatus = 'pickup_completed';
      }
    }

    // Send email notification
    try {
      if (updatedOrder) {
        // Get fresh order data to check latest status
        const freshOrder = await getOrderById(id);
        const freshItem = freshOrder?.items[itemIndex];
        const cancelReturnInfo = freshItem?.cancelReturnInfo || updatedOrder.items[itemIndex]?.cancelReturnInfo;
        
        // Determine if it's cancel or return
        const isCancel = action.includes('cancel');
        
        // Determine final status
        let finalStatus = emailStatus;
        if (cancelReturnInfo?.status === 'refund_processed') {
          finalStatus = 'refund_processed';
        }
        
        let emailData: any = {
          customerName: updatedOrder.customerName,
          orderNumber: updatedOrder.orderNumber,
          type: isCancel ? 'cancel' : 'return',
          status: finalStatus,
          itemName: item.productName,
          orderId: id,
        };

        if (finalStatus === 'rejected' && rejectionReason) {
          emailData.rejectionReason = rejectionReason;
        }

        if (finalStatus === 'pickup_scheduled' && pickupDate && pickupTime) {
          emailData.pickupDate = new Date(pickupDate);
          emailData.pickupTime = pickupTime;
        }

        if (finalStatus === 'pickup_completed' && trackingNumber) {
          emailData.trackingNumber = trackingNumber;
        }

        if (cancelReturnInfo?.refundAmount) {
          emailData.refundAmount = cancelReturnInfo.refundAmount;
        }

        const emailHTML = generateCancelReturnStatusEmailHTML(emailData);

        const subject = finalStatus === 'approved' 
          ? `${isCancel ? 'Cancellation' : 'Return'} Approved - ${updatedOrder.orderNumber}`
          : finalStatus === 'rejected'
          ? `${isCancel ? 'Cancellation' : 'Return'} Request Rejected - ${updatedOrder.orderNumber}`
          : finalStatus === 'pickup_scheduled'
          ? `Pickup Scheduled - ${updatedOrder.orderNumber}`
          : finalStatus === 'pickup_completed'
          ? `Pickup Completed - ${updatedOrder.orderNumber}`
          : `Refund Processed - ${updatedOrder.orderNumber}`;

        await sendEmail({
          to: updatedOrder.customerEmail,
          subject: subject,
          html: emailHTML,
        });
      }
    } catch (emailError) {
      console.error('[Admin Order API] Error sending email:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      order: {
        ...updatedOrder,
        _id: updatedOrder?._id?.toString(),
      },
      message: 'Item request processed successfully',
    });
  } catch (error: any) {
    console.error('[Admin Order API] Error processing item request:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process item request' },
      { status: 500 }
    );
  }
}

