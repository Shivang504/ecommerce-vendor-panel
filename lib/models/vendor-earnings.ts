import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

/**
 * Calculate vendor earnings from an order
 * Earnings = (Product Cost - Commission %) for vendor's products
 */
export async function processVendorEarningsFromOrder(orderId: string) {
  try {
    const { db } = await connectToDatabase();
    const order = await db.collection('orders').findOne({ _id: new ObjectId(orderId) });
    
    if (!order || !order.items || order.items.length === 0) {
      console.log('[Vendor Earnings] Order not found or has no items:', orderId);
      return;
    }

    // Check if earnings already processed for this order
    if (order.vendorEarningsProcessed) {
      console.log('[Vendor Earnings] Earnings already processed for order:', orderId);
      return;
    }

    // Group items by vendor
    const vendorEarnings: Record<string, number> = {};

    // Process each item
    for (const item of order.items) {
      // Check if item has vendorId directly (preferred method)
      let vendorId: string | null = null;
      
      if (item.vendorId) {
        vendorId = typeof item.vendorId === 'string' ? item.vendorId : item.vendorId.toString();
      } else {
        // Fallback: Get vendor from product
        const productId = typeof item.productId === 'string' 
          ? item.productId 
          : item.productId?.toString();
        
        if (!productId) continue;

        const product = await db.collection('products').findOne({ 
          _id: new ObjectId(productId) 
        });

        if (!product || !product.vendorId) continue;
        vendorId = product.vendorId.toString();
      }

      if (!vendorId) continue;

      // Get vendor to find commission rate
      const vendor = await db.collection('vendors').findOne({ 
        _id: new ObjectId(vendorId) 
      });

      if (!vendor) {
        console.log(`[Vendor Earnings] Vendor not found: ${vendorId}`);
        continue;
      }

      // Get product for cost price (if needed)
      const productId = typeof item.productId === 'string' 
        ? item.productId 
        : item.productId?.toString();
      
      let productCost = 0;
      if (productId) {
        const product = await db.collection('products').findOne({ 
          _id: new ObjectId(productId) 
        });
        if (product) {
          productCost = product.productCost || product.costPrice || 0;
        }
      }

      // Calculate vendor earnings
      // Use the item price from the order (what customer actually paid)
      const itemPrice = item.price || 0;
      const quantity = item.quantity || 1;
      
      // Get vendor commission rate (platform's commission percentage)
      const commissionRate = vendor.commissionRate || 0; // Platform commission rate (e.g., 10 means 10%)
      
      // Calculate vendor earnings:
      // Vendor gets: Selling Price - Platform Commission
      // If productCost is set and higher than (selling price - commission), use productCost to ensure vendor doesn't lose money
      const commissionAmount = (itemPrice * commissionRate) / 100;
      const vendorSharePerUnit = itemPrice - commissionAmount;
      
      // Ensure vendor at least gets their cost back (if productCost is set)
      const vendorEarningPerUnit = productCost > 0 
        ? Math.max(productCost, vendorSharePerUnit) 
        : vendorSharePerUnit;
      
      const vendorEarning = vendorEarningPerUnit * quantity;

      // Initialize vendor earnings if not exists
      if (!vendorEarnings[vendorId]) {
        vendorEarnings[vendorId] = 0;
      }

      vendorEarnings[vendorId] += vendorEarning;
      
      console.log(`[Vendor Earnings] Item: ${item.productName || productId}, Price: ₹${itemPrice}, Quantity: ${quantity}, Commission: ${commissionRate}%, Vendor Earning: ₹${vendorEarning}`);
    }

    // Update vendor wallets
    const vendorUpdates = Object.entries(vendorEarnings).map(async ([vendorId, earningsAmount]) => {
      try {
        // Update vendor wallet
        await db.collection('vendors').updateOne(
          { _id: new ObjectId(vendorId) },
          {
            $inc: {
              walletBalance: earningsAmount,
              totalEarnings: earningsAmount,
            },
            $set: {
              updatedAt: new Date(),
            },
          }
        );

        console.log(`[Vendor Earnings] Updated wallet for vendor ${vendorId}: +₹${earningsAmount.toFixed(2)}`);
      } catch (error) {
        console.error(`[Vendor Earnings] Error updating vendor ${vendorId}:`, error);
      }
    });

    await Promise.all(vendorUpdates);

    // Mark order as processed
    await db.collection('orders').updateOne(
      { _id: new ObjectId(orderId) },
      {
        $set: {
          vendorEarningsProcessed: true,
          vendorEarningsProcessedAt: new Date(),
        },
      }
    );

    console.log('[Vendor Earnings] Processed earnings for order:', orderId);
  } catch (error) {
    console.error('[Vendor Earnings] Error processing vendor earnings:', error);
    // Don't throw - we don't want to break order flow if earnings processing fails
  }
}

/**
 * Get vendor earnings summary
 */
export async function getVendorEarningsSummary(vendorId: string) {
  try {
    const { db } = await connectToDatabase();
    
    // Get vendor
    const vendor = await db.collection('vendors').findOne({ _id: new ObjectId(vendorId) });
    if (!vendor) {
      throw new Error('Vendor not found');
    }

    // Get all orders with vendor's products
    const orders = await db.collection('orders').find({
      'items.productId': { $exists: true },
      orderStatus: { $in: ['delivered', 'completed'] },
      vendorEarningsProcessed: true,
    }).toArray();

    // Calculate total orders and earnings
    let totalOrders = 0;
    let totalEarnings = 0;

    for (const order of orders) {
      if (!order.items) continue;

      let hasVendorProduct = false;
      let orderEarning = 0;

      for (const item of order.items) {
        const productId = typeof item.productId === 'string' 
          ? item.productId 
          : item.productId?.toString();
        
        if (!productId) continue;

        const product = await db.collection('products').findOne({ 
          _id: new ObjectId(productId) 
        });

        if (product && product.vendorId === vendorId) {
          hasVendorProduct = true;
          const productCost = product.productCost || product.costPrice || 0;
          const quantity = item.quantity || 1;
          orderEarning += productCost * quantity;
        }
      }

      if (hasVendorProduct) {
        totalOrders++;
        totalEarnings += orderEarning;
      }
    }

    return {
      walletBalance: vendor.walletBalance || 0,
      totalEarnings: vendor.totalEarnings || 0,
      totalWithdrawn: vendor.totalWithdrawn || 0,
      pendingWithdrawals: 0, // Will be calculated from withdrawals collection
      totalOrders,
    };
  } catch (error) {
    console.error('[Vendor Earnings] Error getting earnings summary:', error);
    throw error;
  }
}

