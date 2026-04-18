import { NextRequest, NextResponse } from 'next/server';
import { getOrderById } from '@/lib/models/order';
import { downloadShiprocketLabel } from '@/lib/shiprocket';
import { getUserFromRequest, isAdmin, isVendor } from '@/lib/auth';

// GET - Download shipping label PDF
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('[Admin Order Label API] Request received for order:', id);
    
    let currentUser;
    try {
      currentUser = getUserFromRequest(request);
    } catch (authError: any) {
      console.error('[Admin Order Label API] Auth error:', authError);
      return NextResponse.json(
        { error: 'Authentication error: ' + (authError.message || 'Unknown error') },
        { status: 401 }
      );
    }
    
    // Check authentication
    if (!currentUser) {
      console.log('[Admin Order Label API] No user found in request');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('[Admin Order Label API] User authenticated:', { id: currentUser.id, role: currentUser.role });

    // Only allow admins and vendors
    if (!isAdmin(currentUser) && !isVendor(currentUser)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const order = await getOrderById(id);
    console.log('[Admin Order Label API] Order fetched:', { 
      orderId: id, 
      hasOrder: !!order,
      hasTracking: !!order?.tracking,
      shipmentId: (order?.tracking as any)?.shiprocketShipmentId 
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check authorization - vendors can only download labels for orders containing their products
    if (isVendor(currentUser)) {
      const hasVendorItem = order.items?.some((item: any) => 
        item.vendorId && item.vendorId.toString() === currentUser.id
      );
      
      if (!hasVendorItem) {
        return NextResponse.json(
          { error: 'Access denied. You can only download labels for orders containing your products.' },
          { status: 403 }
        );
      }
    }

    // Check if order has Shiprocket shipment ID
    const shipmentId = (order.tracking as any)?.shiprocketShipmentId;
    
    if (!shipmentId) {
      console.log('[Admin Order Label API] No shipment ID found');
      return NextResponse.json(
        { error: 'Shipping label not available. Order has not been assigned to a courier yet.' },
        { status: 400 }
      );
    }

    console.log('[Admin Order Label API] Shipment ID found:', shipmentId);

    // Check if label is already stored
    const existingLabelUrl = (order.tracking as any)?.labelPdfUrl;
    
    if (existingLabelUrl && !existingLabelUrl.startsWith('data:')) {
      // If it's a URL (not base64), return it as JSON
      if (existingLabelUrl.startsWith('http')) {
        console.log('[Admin Order Label API] Returning existing label URL');
        return NextResponse.json({
          success: true,
          labelUrl: existingLabelUrl,
          message: 'Label URL retrieved from cache'
        });
      }
      // If it's base64, convert and return as PDF
      if (existingLabelUrl.length > 100) { // Likely base64
        try {
          const pdfBuffer = Buffer.from(existingLabelUrl, 'base64');
          console.log('[Admin Order Label API] Returning cached label PDF');
          return new NextResponse(pdfBuffer, {
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `attachment; filename="shipping-label-${order.orderNumber}.pdf"`,
              'Content-Length': pdfBuffer.length.toString(),
            },
          });
        } catch (bufferError) {
          console.error('[Admin Order Label API] Error processing cached label:', bufferError);
          // Continue to download fresh label
        }
      }
    }

    // Download label from Shiprocket
    console.log('[Admin Order Label API] Downloading label from Shiprocket...');
    // Get AWB code and order ID from order tracking if available
    const orderAwbCode = (order.tracking as any)?.trackingNumber || 
                         (order.tracking as any)?.awbCode || 
                         null;
    const shiprocketOrderId = (order.tracking as any)?.shiprocketOrderId || null;
    
    console.log('[Admin Order Label API] Downloading label with details from order:', {
      shipmentId,
      orderId: shiprocketOrderId || 'Not found',
      orderAwbCode: orderAwbCode || 'Not found in order',
    });

    let labelResult;
    try {
      labelResult = await downloadShiprocketLabel(shipmentId, orderAwbCode, shiprocketOrderId || undefined);
      console.log('[Admin Order Label API] Label download result:', {
        success: labelResult.success,
        hasLabelUrl: !!labelResult.labelUrl,
        hasLabelPdf: !!labelResult.labelPdf,
        error: labelResult.error
      });
    } catch (downloadError: any) {
      console.error('[Admin Order Label API] Error in downloadShiprocketLabel:', downloadError);
      return NextResponse.json(
        { error: 'Failed to download label: ' + (downloadError.message || 'Unknown error') },
        { status: 500 }
      );
    }

    if (!labelResult.success) {
      return NextResponse.json(
        { error: labelResult.error || 'Failed to download shipping label' },
        { status: 500 }
      );
    }

    // If label URL is available, return it as JSON (client will handle redirect)
    if (labelResult.labelUrl) {
      console.log('[Admin Order Label API] Label URL available, updating order');
      try {
        const { updateTrackingInfo } = await import('@/lib/models/order');
        await updateTrackingInfo(id, {
          labelPdfUrl: labelResult.labelUrl,
          labelGeneratedAt: new Date(),
        });
      } catch (updateError) {
        console.error('[Admin Order Label API] Error updating order with label URL:', updateError);
        // Continue anyway - label URL is still valid
      }
      
      // Return JSON with label URL - client will open it in new tab
      return NextResponse.json({
        success: true,
        labelUrl: labelResult.labelUrl,
        message: 'Label URL retrieved successfully'
      });
    }

    // If label PDF is available as base64, return it as PDF
    if (labelResult.labelPdf) {
      console.log('[Admin Order Label API] Label PDF available, converting to buffer');
      try {
        const { updateTrackingInfo } = await import('@/lib/models/order');
        await updateTrackingInfo(id, {
          labelPdfUrl: labelResult.labelPdf,
          labelGeneratedAt: new Date(),
        });
      } catch (updateError) {
        console.error('[Admin Order Label API] Error updating order with label PDF:', updateError);
        // Continue anyway - can still return the PDF
      }

      try {
        // Convert base64 to buffer
        const pdfBuffer = Buffer.from(labelResult.labelPdf, 'base64');
        console.log('[Admin Order Label API] PDF buffer created, size:', pdfBuffer.length);

        // Return PDF with proper headers
        return new NextResponse(pdfBuffer, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="shipping-label-${order.orderNumber}.pdf"`,
            'Content-Length': pdfBuffer.length.toString(),
          },
        });
      } catch (bufferError: any) {
        console.error('[Admin Order Label API] Error creating PDF buffer:', bufferError);
        return NextResponse.json(
          { error: 'Failed to process label PDF: ' + (bufferError.message || 'Unknown error') },
          { status: 500 }
        );
      }
    }

    console.log('[Admin Order Label API] No label available from courier');
    return NextResponse.json(
      { error: 'Label not available from courier' },
      { status: 404 }
    );
  } catch (error: any) {
    console.error('[Admin Order Label API] Unexpected error:', error);
    console.error('[Admin Order Label API] Error stack:', error.stack);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to download shipping label',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

