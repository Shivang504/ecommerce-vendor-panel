import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getOrderById, updateOrderStatus, updatePaymentStatus, updateTrackingInfo, cancelOrder, approveReturn, rejectReturn } from '@/lib/models/order';
import { getPaymentByOrderId } from '@/lib/models/payment';
import { sendEmail } from '@/lib/email';
import { generateOrderStatusUpdateEmailHTML, generatePaymentStatusUpdateEmailHTML, generateCancelReturnStatusEmailHTML } from '@/lib/email-templates';
import { ObjectId } from 'mongodb';
import { getUserFromRequest, isVendor, isAdmin } from '@/lib/auth';
import { isShiprocketEnabled } from '@/lib/shiprocket-env';

// GET - Get order details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUser = getUserFromRequest(request);
    
    // Check authentication
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
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

    // Check authorization
    // Vendors can only view orders containing their products
    if (isVendor(currentUser)) {
      const hasVendorItem = order.items?.some((item: any) => 
        item.vendorId && item.vendorId.toString() === currentUser.id
      );
      
      if (!hasVendorItem) {
        return NextResponse.json(
          { error: 'Access denied. You can only view orders containing your products.' },
          { status: 403 }
        );
      }
    } else if (!isAdmin(currentUser)) {
      // Not admin or vendor
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }
    // Admins can view all orders

    return NextResponse.json({
      success: true,
      order: {
        ...order,
        _id: order._id?.toString(),
      },
    });
  } catch (error: any) {
    console.error('[Admin Order API] Error fetching order:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch order' },
      { status: 500 }
    );
  }
}

// PUT - Update order
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUser = getUserFromRequest(request);
    
    // Check authentication
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Only allow admins and vendors
    if (!isAdmin(currentUser) && !isVendor(currentUser)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { 
      orderStatus, 
      paymentStatus, 
      tracking, 
      adminNotes,
      refundAmount,
      refundReason,
      action, // 'approve_return', 'reject_return'
      rejectionReason,
    } = body;

    // Get current order before updates
    const currentOrder = await getOrderById(id);
    if (!currentOrder) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check authorization - vendors can only update orders containing their products
    if (isVendor(currentUser)) {
      const hasVendorItem = currentOrder.items?.some((item: any) => 
        item.vendorId && item.vendorId.toString() === currentUser.id
      );
      
      if (!hasVendorItem) {
        return NextResponse.json(
          { error: 'Access denied. You can only update orders containing your products.' },
          { status: 403 }
        );
      }
      // Vendors can do everything for their orders (status, payment, tracking, cancel, returns, etc.)
    }

    // Handle approval/rejection actions (only for returns now, cancellations are direct)
    if (action === 'approve_return') {
      const approvedOrder = await approveReturn(id, adminNotes);
      
      // Send email notification
      try {
        if (approvedOrder) {
          const emailHTML = generateCancelReturnStatusEmailHTML({
            customerName: approvedOrder.customerName,
            orderNumber: approvedOrder.orderNumber,
            type: 'return',
            status: 'approved',
            orderId: id,
          });

          await sendEmail({
            to: approvedOrder.customerEmail,
            subject: `Return Approved - ${approvedOrder.orderNumber}`,
            html: emailHTML,
          });
        }
      } catch (emailError) {
        console.error('[Admin Order API] Error sending return approval email:', emailError);
      }

      return NextResponse.json({
        success: true,
        order: {
          ...approvedOrder,
          _id: approvedOrder?._id?.toString(),
        },
        message: 'Return approved successfully',
      });
    }

    if (action === 'reject_return') {
      if (!rejectionReason) {
        return NextResponse.json(
          { error: 'Rejection reason is required' },
          { status: 400 }
        );
      }
      const rejectedOrder = await rejectReturn(id, rejectionReason);
      
      // Send email notification
      try {
        if (rejectedOrder) {
          const emailHTML = generateCancelReturnStatusEmailHTML({
            customerName: rejectedOrder.customerName,
            orderNumber: rejectedOrder.orderNumber,
            type: 'return',
            status: 'rejected',
            rejectionReason: rejectionReason,
            orderId: id,
          });

          await sendEmail({
            to: rejectedOrder.customerEmail,
            subject: `Return Request Rejected - ${rejectedOrder.orderNumber}`,
            html: emailHTML,
          });
        }
      } catch (emailError) {
        console.error('[Admin Order API] Error sending return rejection email:', emailError);
      }

      return NextResponse.json({
        success: true,
        order: {
          ...rejectedOrder,
          _id: rejectedOrder?._id?.toString(),
        },
        message: 'Return rejected',
      });
    }

    // Update order status - prevent changes for cancelled orders
    if (orderStatus && orderStatus !== currentOrder.orderStatus) {
      if (currentOrder.orderStatus === 'cancelled') {
        return NextResponse.json(
          { error: 'Cannot update status for cancelled orders' },
          { status: 400 }
        );
      }
      
      // Handle cancellation - use cancelOrder function which handles Shiprocket cancellation
      if (orderStatus.toLowerCase() === 'cancelled') {
        const cancelledOrder = await cancelOrder(id, adminNotes);
        
        // Send email notification to customer
        try {
          if (cancelledOrder && cancelledOrder.customerEmail) {
            const isPaid = cancelledOrder.paymentStatus === 'paid';
            const emailHTML = generateCancelReturnStatusEmailHTML({
              customerName: cancelledOrder.customerName,
              orderNumber: cancelledOrder.orderNumber,
              type: 'cancel',
              status: 'approved',
              orderId: id,
              adminNotes: cancelledOrder.adminNotes || adminNotes || 'Order cancelled by admin',
              refundAmount: isPaid ? cancelledOrder.pricing?.total : undefined,
            });

            console.log('[Admin Order API] 📧 Sending cancellation email to customer:', cancelledOrder.customerEmail);
            
            const emailSent = await sendEmail({
              to: cancelledOrder.customerEmail,
              subject: `Order Cancelled - ${cancelledOrder.orderNumber}`,
              html: emailHTML,
            });

            if (emailSent) {
              console.log('[Admin Order API] ✅ Cancellation email sent successfully to:', cancelledOrder.customerEmail);
            } else {
              console.error('[Admin Order API] ❌ Failed to send cancellation email to:', cancelledOrder.customerEmail);
            }
          } else {
            console.warn('[Admin Order API] ⚠️ Cannot send email: cancelledOrder or customerEmail is missing', {
              hasOrder: !!cancelledOrder,
              customerEmail: cancelledOrder?.customerEmail,
            });
          }
        } catch (emailError: any) {
          console.error('[Admin Order API] ❌ Error sending cancellation email:', {
            error: emailError.message,
            stack: emailError.stack,
            customerEmail: cancelledOrder?.customerEmail,
          });
          // Don't fail the request if email fails
        }

        return NextResponse.json({
          success: true,
          order: {
            ...cancelledOrder,
            _id: cancelledOrder?._id?.toString(),
          },
          message: 'Order cancelled successfully',
        });
      }
      
      await updateOrderStatus(id, orderStatus, adminNotes);

      const statusNormalized = String(orderStatus || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_');
      const isReadyForPickup = statusNormalized === 'ready_for_pickup';
      const shiprocketOn = isShiprocketEnabled();

      if (isReadyForPickup && !shiprocketOn) {
        console.warn(
          '[Shiprocket] Status is Ready for Pickup but integration is OFF. Set SHIPROCKET_ENABLED=true in .env (e.g. Vercel → Settings → Environment Variables), plus SHIPROCKET_EMAIL and SHIPROCKET_API_KEY, then redeploy. Order saved in DB only — nothing is sent to Shiprocket until this is on.'
        );
      }

      // Handle "Ready for Pickup" status - Create Shiprocket order and schedule pickup
      if (isReadyForPickup && shiprocketOn) {
        const pickupStartTime = Date.now();
        console.log('[Ready for Pickup] ========== PICKUP GENERATION START ==========');
        console.log('[Ready for Pickup] Timestamp:', new Date().toISOString());
        console.log('[Ready for Pickup] 📦 Order Details:', {
          orderId: id,
          orderNumber: currentOrder.orderNumber,
          customerName: currentOrder.customerName,
          customerEmail: currentOrder.customerEmail,
          paymentMethod: currentOrder.payment?.paymentMethod,
          total: `₹${currentOrder.pricing?.total?.toLocaleString('en-IN')}`,
        });
        console.log('[Ready for Pickup] 📍 Shipping Address:', {
          name: currentOrder.shippingAddress?.name,
          city: currentOrder.shippingAddress?.city,
          state: currentOrder.shippingAddress?.state,
          pincode: currentOrder.shippingAddress?.postalCode,
          phone: currentOrder.shippingAddress?.phone,
        });
        
        try {
          const { createShiprocketOrder, requestShiprocketPickup } = await import('@/lib/shiprocket');
          const { db } = await connectToDatabase();
          
          // Check if Shiprocket order already exists
          const existingShipmentId = (currentOrder.tracking as any)?.shiprocketShipmentId;
          console.log('[Ready for Pickup] Existing Shipment ID:', existingShipmentId || 'None (New Order)');
          
          if (!existingShipmentId) {
            // Fetch product details for items
            const { db } = await connectToDatabase();
            const itemsWithProducts = await Promise.all(
              currentOrder.items.map(async (item: any) => {
                let product = null;
                if (item.productId) {
                  try {
                    product = await db.collection('products').findOne({
                      _id: new ObjectId(item.productId),
                    });
                  } catch (error) {
                    // Product not found, use defaults
                  }
                }
                
                return {
                  productName: item.productName,
                  sku: item.sku || product?.sku,
                  quantity: item.quantity,
                  price: item.price,
                  total: item.price * item.quantity,
                  weight: product?.weight || item.weight || 0.5,
                  dimensions: product?.dimensions || item.dimensions,
                  length: product?.length || item.length || 10,
                  breadth: product?.breadth || item.breadth || 10,
                  height: product?.height || item.height || 10,
                  hsn: product?.hsn || item.hsn,
                };
              })
            );
            
            console.log('[Ready for Pickup] 🛒 Order Items:', {
              itemsCount: itemsWithProducts.length,
              items: itemsWithProducts.map(item => ({
                name: item.productName,
                sku: item.sku,
                qty: item.quantity,
                price: item.price,
                weight: item.weight,
                dimensions: `${item.length}x${item.breadth}x${item.height} cm`,
              })),
            });
            
            // Check serviceability to get fastest courier
            const { checkShiprocketServiceability, generateShiprocketAWB } = await import('@/lib/shiprocket');
            
            // Calculate total weight
            const totalWeight = itemsWithProducts.reduce((sum, item) => {
              let itemWeight = item.weight || 0.5;
              if (itemWeight > 1000) itemWeight = itemWeight / 1000;
              if (itemWeight < 0.5) itemWeight = 0.5;
              return sum + (itemWeight * item.quantity);
            }, 0);
            
            console.log('[Ready for Pickup] ⚖️ Total Package Weight:', `${totalWeight.toFixed(2)} kg`);
            
            // Get warehouse ID from first product
            let warehouseId: string | undefined = undefined;
            if (itemsWithProducts.length > 0 && currentOrder.items[0]?.productId) {
              const firstProduct = await db.collection('products').findOne({
                _id: new ObjectId(currentOrder.items[0].productId),
              });
              warehouseId = firstProduct?.warehouseId;
            }
            
            console.log('[Ready for Pickup] 🏭 Warehouse ID:', warehouseId || 'Default');
            
            // Check serviceability to get fastest courier
            console.log('[Ready for Pickup] 🔍 Checking courier serviceability...', {
              pincode: currentOrder.shippingAddress.postalCode,
              weight: totalWeight,
              codAmount: currentOrder.payment.paymentMethod === 'cod' ? currentOrder.pricing.total : 0,
              warehouseId,
            });
            
            const serviceabilityResult = await checkShiprocketServiceability(
              currentOrder.shippingAddress.postalCode,
              undefined,
              totalWeight,
              currentOrder.payment.paymentMethod === 'cod' ? currentOrder.pricing.total : 0,
              warehouseId
            );
            
            console.log('[Ready for Pickup] 📋 Serviceability Result:', {
              isServiceable: serviceabilityResult.isServiceable,
              couriersAvailable: serviceabilityResult.couriers.length,
              couriers: serviceabilityResult.couriers.slice(0, 5).map(c => ({
                id: c.courierId,
                name: c.courierName,
                days: c.estimatedDays,
                rate: `₹${c.rate}`,
              })),
              ...(serviceabilityResult.couriers.length > 5 && { moreAvailable: serviceabilityResult.couriers.length - 5 }),
            });
            
            // Get fastest courier (lowest estimatedDays, then lowest rate)
            let fastestCourierId: number | undefined = undefined;
            let fastestCourierName: string | undefined = undefined;
            if (serviceabilityResult.isServiceable && serviceabilityResult.couriers.length > 0) {
              const fastestCourier = serviceabilityResult.couriers.reduce((best, current) => {
                if (current.estimatedDays < best.estimatedDays) return current;
                if (current.estimatedDays === best.estimatedDays && current.rate < best.rate) return current;
                return best;
              });
              fastestCourierId = fastestCourier.courierId;
              fastestCourierName = fastestCourier.courierName;
              console.log('[Ready for Pickup] 🚚 Fastest Courier Selected:', {
                courierId: fastestCourierId,
                courierName: fastestCourierName,
                estimatedDays: fastestCourier.estimatedDays,
                rate: `₹${fastestCourier.rate}`,
              });
            } else {
              console.warn('[Ready for Pickup] ⚠️ No serviceable couriers found!');
            }
            
            // Create Shiprocket order
            console.log('[Ready for Pickup] 📤 Creating Shiprocket order...');
            const shiprocketResult = await createShiprocketOrder({
              orderId: id,
              orderNumber: currentOrder.orderNumber,
              orderDate: currentOrder.createdAt,
              items: itemsWithProducts,
              shippingAddress: currentOrder.shippingAddress,
              billingAddress: currentOrder.billingAddress,
              pricing: currentOrder.pricing,
              paymentMethod: currentOrder.payment.paymentMethod,
              warehouseId,
            });
            
            if (shiprocketResult.success) {
              console.log('[Ready for Pickup] ✅ Shiprocket Order Created:', {
                shipmentId: shiprocketResult.shipmentId,
                shiprocketOrderId: shiprocketResult.shiprocketOrderId,
                courierName: shiprocketResult.courierName || 'Not assigned yet',
                awbCode: shiprocketResult.awbCode || 'Not assigned yet',
              });
            } else {
              console.error('[Ready for Pickup] ❌ Shiprocket Order Creation Failed:', {
                error: shiprocketResult.error,
              });
            }
            
            if (shiprocketResult.success && shiprocketResult.shipmentId) {
              // Automatically assign fastest courier
              let assignedCourierName = shiprocketResult.courierName || fastestCourierName;
              let awbCode = shiprocketResult.awbCode;
              
              // Always try to assign courier if we have a courier ID
              let awbResult: any = null;
              if (fastestCourierId) {
                console.log('[Ready for Pickup] 🎫 Generating AWB (Air Waybill)...', {
                  shipmentId: shiprocketResult.shipmentId,
                  courierId: fastestCourierId,
                  courierName: fastestCourierName,
                });
                
                const awbStartTime = Date.now();
                awbResult = await generateShiprocketAWB(shiprocketResult.shipmentId, fastestCourierId);
                const awbEndTime = Date.now();
                const awbDuration = awbEndTime - awbStartTime;
                
                if (awbResult.success) {
                  if (awbResult.courierName) {
                    assignedCourierName = awbResult.courierName;
                  }
                  if (awbResult.awbCode) {
                    awbCode = awbResult.awbCode;
                  }
                  console.log('[Ready for Pickup] ✅ AWB Generated Successfully:', {
                    awbCode: awbCode,
                    courierName: assignedCourierName,
                    courierId: fastestCourierId,
                    duration: `${awbDuration}ms`,
                  });
                } else {
                  console.error('[Ready for Pickup] ❌ AWB Generation Failed:', {
                    error: awbResult.error,
                    shipmentId: shiprocketResult.shipmentId,
                    courierId: fastestCourierId,
                    duration: `${awbDuration}ms`,
                  });
                }
              } else {
                console.warn('[Ready for Pickup] ⚠️ No courier ID available for auto-assignment');
              }
              
              // Download and store shipping label PDF
              let labelPdfUrl: string | undefined = undefined;
              console.log('[Ready for Pickup] 🏷️ Downloading shipping label...');
              try {
                const { downloadShiprocketLabel } = await import('@/lib/shiprocket');
                // Pass AWB code if available
                const labelResult = await downloadShiprocketLabel(
                  shiprocketResult.shipmentId,
                  awbCode || undefined
                );
                
                if (labelResult.success) {
                  if (labelResult.labelUrl) {
                    labelPdfUrl = labelResult.labelUrl;
                  } else if (labelResult.labelPdf) {
                    // Store base64 PDF in database or convert to URL
                    // For now, we'll store the URL if available, otherwise we'll generate it on-demand
                    labelPdfUrl = labelResult.labelPdf; // Store as base64 for now
                  }
                  console.log('[Ready for Pickup] ✅ Shipping label downloaded');
                } else {
                  console.warn('[Ready for Pickup] ⚠️ Label download failed:', labelResult.error);
                }
              } catch (labelError) {
                console.error('[Ready for Pickup] ⚠️ Label download error (non-critical):', labelError);
                // Don't fail the update if label download fails - can be generated later
              }

              // Update tracking with Shiprocket shipment ID, order ID, courier, AWB, and label
              await updateTrackingInfo(id, {
                ...currentOrder.tracking,
                shiprocketShipmentId: shiprocketResult.shipmentId,
                shiprocketOrderId: awbResult?.orderId || shiprocketResult.shiprocketOrderId, // Store numeric order_id for cancellation
                courierName: assignedCourierName,
                trackingNumber: awbCode,
                labelPdfUrl: labelPdfUrl,
                labelGeneratedAt: labelPdfUrl ? new Date() : undefined,
              });
              
              // Request pickup
              console.log('[Ready for Pickup] 📅 Scheduling pickup...');
              const pickupResult = await requestShiprocketPickup(shiprocketResult.shipmentId);
              
              if (pickupResult.success) {
                // Store pickup schedule in order and ensure tracking info is updated
                await db.collection('orders').updateOne(
                  { _id: new ObjectId(id) },
                  {
                    $set: {
                      pickupScheduledDate: pickupResult.pickupScheduledDate,
                      pickupScheduledTime: pickupResult.pickupScheduledTime,
                      readyForPickupAt: new Date(),
                      'tracking.shiprocketShipmentId': shiprocketResult.shipmentId,
                      'tracking.shiprocketOrderId': awbResult?.orderId || shiprocketResult.shiprocketOrderId, // Store numeric order_id for cancellation
                      'tracking.courierName': assignedCourierName || pickupResult.courierName,
                      'tracking.trackingNumber': awbCode,
                      'tracking.labelPdfUrl': labelPdfUrl,
                      'tracking.labelGeneratedAt': labelPdfUrl ? new Date() : undefined,
                      updatedAt: new Date(),
                    },
                  }
                );
                
                const pickupEndTime = Date.now();
                const pickupDuration = pickupEndTime - pickupStartTime;
                
                console.log('[Ready for Pickup] 🎉 PICKUP GENERATION COMPLETE:', {
                  orderNumber: currentOrder.orderNumber,
                  shipmentId: shiprocketResult.shipmentId,
                  awbCode: awbCode,
                  courierName: assignedCourierName,
                  pickupDate: pickupResult.pickupScheduledDate,
                  pickupTime: pickupResult.pickupScheduledTime,
                  labelGenerated: !!labelPdfUrl,
                  duration: `${pickupDuration}ms`,
                });
                console.log('[Ready for Pickup] ==========================================');
                
                // Fetch initial tracking data after pickup is scheduled
                setImmediate(async () => {
                  try {
                    console.log('[Ready for Pickup] 📡 Fetching initial tracking data...');
                    const { trackShiprocketShipment } = await import('@/lib/shiprocket');
                    const trackingResult = await trackShiprocketShipment(shiprocketResult.shipmentId);
                    if (trackingResult.success && trackingResult.trackingData) {
                      await updateTrackingInfo(id, {
                        currentStatus: trackingResult.currentStatus || trackingResult.status,
                        trackingEvents: trackingResult.trackingData.events,
                        estimatedDelivery: trackingResult.trackingData.estimatedDelivery 
                          ? new Date(trackingResult.trackingData.estimatedDelivery) 
                          : undefined,
                      });
                      console.log('[Ready for Pickup] ✅ Initial tracking data updated');
                    }
                  } catch (trackingError) {
                    console.error('[Ready for Pickup] ⚠️ Error fetching initial tracking (non-critical):', trackingError);
                    // Don't fail the update if tracking fetch fails
                  }
                });
              } else {
                const pickupEndTime = Date.now();
                console.error('[Ready for Pickup] ❌ Pickup Scheduling Failed:', {
                  error: pickupResult.error,
                  shipmentId: shiprocketResult.shipmentId,
                  duration: `${pickupEndTime - pickupStartTime}ms`,
                });
                console.log('[Ready for Pickup] ==========================================');
              }
            } else {
              const pickupEndTime = Date.now();
              console.error('[Ready for Pickup] ❌ Shiprocket order creation failed - cannot proceed:', {
                error: shiprocketResult.error,
                duration: `${pickupEndTime - pickupStartTime}ms`,
              });
              console.log('[Ready for Pickup] ==========================================');
            }
          } else {
            // Shipment already exists, just request pickup
            console.log('[Ready for Pickup] ℹ️ Shipment already exists, scheduling pickup only...');
            const pickupResult = await requestShiprocketPickup(existingShipmentId);
            
            if (pickupResult.success) {
              await db.collection('orders').updateOne(
                { _id: new ObjectId(id) },
                {
                  $set: {
                    pickupScheduledDate: pickupResult.pickupScheduledDate,
                    pickupScheduledTime: pickupResult.pickupScheduledTime,
                    readyForPickupAt: new Date(),
                    updatedAt: new Date(),
                  },
                }
              );
              
              const pickupEndTime = Date.now();
              console.log('[Ready for Pickup] ✅ Existing Shipment - Pickup Rescheduled:', {
                shipmentId: existingShipmentId,
                pickupDate: pickupResult.pickupScheduledDate,
                pickupTime: pickupResult.pickupScheduledTime,
                duration: `${pickupEndTime - pickupStartTime}ms`,
              });
              console.log('[Ready for Pickup] ==========================================');
            } else {
              const pickupEndTime = Date.now();
              console.error('[Ready for Pickup] ❌ Pickup Rescheduling Failed:', {
                error: pickupResult.error,
                shipmentId: existingShipmentId,
                duration: `${pickupEndTime - pickupStartTime}ms`,
              });
              console.log('[Ready for Pickup] ==========================================');
            }
          }
        } catch (shiprocketError: any) {
          const pickupEndTime = Date.now();
          console.error('[Ready for Pickup] ❌ PICKUP GENERATION ERROR:', {
            error: shiprocketError.message,
            stack: shiprocketError.stack,
            orderNumber: currentOrder.orderNumber,
            duration: `${pickupEndTime - pickupStartTime}ms`,
          });
          console.log('[Ready for Pickup] ==========================================');
          // Don't fail the status update if Shiprocket call fails
        }
      }
      
      // Auto-generate AWB when order is packed or shipped (if Shiprocket enabled and AWB not yet generated)
      if ((orderStatus === 'packed' || orderStatus === 'shipped') && isShiprocketEnabled()) {
        try {
          const shipmentId = (currentOrder.tracking as any)?.shiprocketShipmentId;
          const existingAwbCode = (currentOrder.tracking as any)?.awbCode || currentOrder.tracking?.trackingNumber;
          
          // Generate AWB only if shipment_id exists but AWB is not yet generated
          if (shipmentId && !existingAwbCode) {
            console.log('[Admin Order API] 🔄 Auto-generating AWB for order status change', {
              orderId: params.id,
              shipmentId,
              newStatus: updatedData.status,
              existingAwbCode: existingAwbCode || 'None',
              timestamp: new Date().toISOString(),
            });
            
            const { generateShiprocketAWB } = await import('@/lib/shiprocket');
            const awbAutoStartTime = Date.now();
            const awbResult = await generateShiprocketAWB(shipmentId);
            const awbAutoEndTime = Date.now();
            const awbAutoDuration = awbAutoEndTime - awbAutoStartTime;
            
            console.log('[Admin Order API] 📊 Auto AWB generation result', {
              orderId: params.id,
              success: awbResult.success,
              awbCode: awbResult.awbCode,
              courierId: awbResult.courierId,
              courierName: awbResult.courierName,
              error: awbResult.error,
              duration: `${awbAutoDuration}ms`,
              timestamp: new Date().toISOString(),
            });
            
            if (awbResult.success && awbResult.awbCode) {
              console.log('[Admin Order API] ✅ Auto AWB generated successfully, updating order tracking', {
                orderId: params.id,
                awbCode: awbResult.awbCode,
              });
              // Update tracking with AWB details
              await updateTrackingInfo(id, {
                trackingNumber: awbResult.awbCode,
                courierName: awbResult.courierName,
                estimatedDelivery: currentOrder.tracking?.estimatedDelivery,
                shippedAt: orderStatus === 'shipped' ? new Date() : currentOrder.tracking?.shippedAt,
                deliveredAt: currentOrder.tracking?.deliveredAt,
              });
              
              // Also update Shiprocket-specific fields
              const { db } = await connectToDatabase();
              await db.collection('orders').updateOne(
                { _id: new ObjectId(id) },
                {
                  $set: {
                    'tracking.awbCode': awbResult.awbCode,
                    'tracking.courierId': awbResult.courierId,
                    'tracking.courierName': awbResult.courierName,
                    updatedAt: new Date(),
                  },
                }
              );
            }
          }
        } catch (awbError) {
          console.error('[Admin Order API] ❌ Error auto-generating AWB:', {
            orderId: params.id,
            error: awbError,
            shipmentId,
            timestamp: new Date().toISOString(),
          });
          // Don't fail the status update if AWB generation fails
        }
      }
      
      // Send email notification for status change (fire and forget)
      // Note: Cancellation emails are already sent in the cancellation handler above
      setImmediate(async () => {
      try {
        const updatedOrderForEmail = await getOrderById(id);
        if (updatedOrderForEmail) {
          // Skip email for cancelled status (already sent in cancellation handler)
          if (orderStatus && orderStatus.toLowerCase() === 'cancelled') {
            return;
          }
          
          // For other status changes, send regular status update email
          if (orderStatus) {
            // For other status changes, send regular status update email
            const emailHTML = generateOrderStatusUpdateEmailHTML({
              customerName: updatedOrderForEmail.customerName,
              orderNumber: updatedOrderForEmail.orderNumber,
              orderStatus: orderStatus,
              orderId: id,
              tracking: updatedOrderForEmail.tracking,
            });

              // Invoice is available as HTML at /api/invoice/[orderId] for shipped/delivered orders
              // Email already contains link to download invoice, no PDF attachment needed

            await sendEmail({
              to: updatedOrderForEmail.customerEmail,
              subject: `Order Status Update - ${updatedOrderForEmail.orderNumber}`,
              html: emailHTML,
            });

            console.log('[Admin Order API] Status update email sent to:', updatedOrderForEmail.customerEmail);
          }
        }
      } catch (emailError) {
        console.error('[Admin Order API] Error sending status update email:', emailError);
        // Don't fail the update if email fails
      }
      });
    }

    // Update payment status
    if (paymentStatus && paymentStatus !== currentOrder.paymentStatus) {
      const paymentInfo: any = {};
      if (refundAmount) paymentInfo.refundAmount = refundAmount;
      if (refundReason) paymentInfo.refundReason = refundReason;
      
      await updatePaymentStatus(id, paymentStatus, paymentInfo);
      
      // Send email notification for payment status change (fire and forget)
      setImmediate(async () => {
      try {
        const updatedOrderForEmail = await getOrderById(id);
        const payment = await getPaymentByOrderId(id);
        
        if (updatedOrderForEmail) {
          const emailHTML = generatePaymentStatusUpdateEmailHTML({
            customerName: updatedOrderForEmail.customerName,
            orderNumber: updatedOrderForEmail.orderNumber,
            paymentStatus: paymentStatus,
            paymentMethod: updatedOrderForEmail.payment?.paymentMethod || 'cod',
              actualPaymentMethod: updatedOrderForEmail.payment?.actualPaymentMethod || (updatedOrderForEmail.payment?.paymentMethod === 'cod' ? 'Cash on Delivery' : 'COD'),
            amount: updatedOrderForEmail.pricing.total,
            orderId: id,
            paymentId: payment?.razorpayPaymentId || payment?.transactionId,
          });

          await sendEmail({
            to: updatedOrderForEmail.customerEmail,
            subject: `Payment Status Update - ${updatedOrderForEmail.orderNumber}`,
            html: emailHTML,
          });

          console.log('[Admin Order API] Payment status update email sent to:', updatedOrderForEmail.customerEmail);
        }
      } catch (emailError) {
        console.error('[Admin Order API] Error sending payment status update email:', emailError);
        // Don't fail the update if email fails
      }
      });
    }

    // Update tracking info
    if (tracking) {
      await updateTrackingInfo(id, tracking);
    }

    // Update admin notes if provided
    if (adminNotes !== undefined) {
      const { db } = await connectToDatabase();
      await db.collection('orders').updateOne(
        { _id: new ObjectId(id) },
        { 
          $set: { 
            adminNotes,
            updatedAt: new Date(),
          } 
        }
      );
    }

    // Fetch updated order
    const updatedOrder = await getOrderById(id);

    return NextResponse.json({
      success: true,
      order: {
        ...updatedOrder,
        _id: updatedOrder?._id?.toString(),
      },
      message: 'Order updated successfully',
    });
  } catch (error: any) {
    console.error('[Admin Order API] Error updating order:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update order' },
      { status: 500 }
    );
  }
}

// DELETE - Cancel order
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUser = getUserFromRequest(request);
    
    // Check authentication
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Only allow admins and vendors
    if (!isAdmin(currentUser) && !isVendor(currentUser)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    // Check authorization - vendors can only cancel orders containing their products
    if (isVendor(currentUser)) {
      const currentOrder = await getOrderById(id);
      if (!currentOrder) {
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        );
      }
      
      const hasVendorItem = currentOrder.items?.some((item: any) => 
        item.vendorId && item.vendorId.toString() === currentUser.id
      );
      
      if (!hasVendorItem) {
        return NextResponse.json(
          { error: 'Access denied. You can only cancel orders containing your products.' },
          { status: 403 }
        );
      }
    }

    const body = await request.json().catch(() => ({}));
    const { reason } = body;

    const cancelledOrder = await cancelOrder(id, reason);

    // Send email notification to customer
    try {
      if (cancelledOrder && cancelledOrder.customerEmail) {
        const isPaid = cancelledOrder.paymentStatus === 'paid';
        const emailHTML = generateCancelReturnStatusEmailHTML({
          customerName: cancelledOrder.customerName,
          orderNumber: cancelledOrder.orderNumber,
          type: 'cancel',
          status: 'approved',
          orderId: id,
          adminNotes: cancelledOrder.adminNotes || reason || 'Order cancelled by admin',
          refundAmount: isPaid ? cancelledOrder.pricing?.total : undefined,
        });

        console.log('[Admin Order API] 📧 Sending cancellation email to customer:', cancelledOrder.customerEmail);
        
        const emailSent = await sendEmail({
          to: cancelledOrder.customerEmail,
          subject: `Order Cancelled - ${cancelledOrder.orderNumber}`,
          html: emailHTML,
        });

        if (emailSent) {
          console.log('[Admin Order API] ✅ Cancellation email sent successfully to:', cancelledOrder.customerEmail);
        } else {
          console.error('[Admin Order API] ❌ Failed to send cancellation email to:', cancelledOrder.customerEmail);
        }
      } else {
        console.warn('[Admin Order API] ⚠️ Cannot send email: cancelledOrder or customerEmail is missing', {
          hasOrder: !!cancelledOrder,
          customerEmail: cancelledOrder?.customerEmail,
        });
      }
    } catch (emailError: any) {
      console.error('[Admin Order API] ❌ Error sending cancellation email:', {
        error: emailError.message,
        stack: emailError.stack,
        customerEmail: cancelledOrder?.customerEmail,
      });
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      order: {
        ...cancelledOrder,
        _id: cancelledOrder?._id?.toString(),
      },
      message: 'Order cancelled successfully',
    });
  } catch (error: any) {
    console.error('[Admin Order API] Error cancelling order:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to cancel order' },
      { status: 500 }
    );
  }
}

