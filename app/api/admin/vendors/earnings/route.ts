import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { getUserFromRequest, isAdmin } from '@/lib/auth';
import { getAllVendors } from '@/lib/models/vendor';

// GET - Get vendor earnings summary for admin dashboard
export async function GET(request: NextRequest) {
  try {
    const currentUser = getUserFromRequest(request);
    
    if (!currentUser || !isAdmin(currentUser)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { db } = await connectToDatabase();

    // Get all vendors
    const vendors = await getAllVendors();

    // Get all delivered/completed orders
    const orders = await db.collection('orders').find({
      orderStatus: { $in: ['delivered', 'completed'] },
      vendorEarningsProcessed: true,
    }).toArray();

    // Calculate vendor-wise statistics
    const vendorStats: Record<string, {
      vendorId: string;
      vendorName: string;
      totalOrders: number;
      totalEarnings: number;
      walletBalance: number;
      totalWithdrawn: number;
      pendingWithdrawals: number;
      pendingAmount: number;
    }> = {};

    // Initialize vendor stats
    for (const vendor of vendors) {
      const vendorId = vendor._id.toString();
      vendorStats[vendorId] = {
        vendorId,
        vendorName: vendor.storeName || vendor.ownerName || 'Unknown',
        totalOrders: 0,
        totalEarnings: vendor.totalEarnings || 0,
        walletBalance: vendor.walletBalance || 0,
        totalWithdrawn: vendor.totalWithdrawn || 0,
        pendingWithdrawals: 0,
        pendingAmount: 0,
      };
    }

    // Count orders per vendor
    for (const order of orders) {
      if (!order.items) continue;

      const vendorOrders: Record<string, boolean> = {};

      for (const item of order.items) {
        const productId = typeof item.productId === 'string' 
          ? item.productId 
          : item.productId?.toString();
        
        if (!productId) continue;

        const product = await db.collection('products').findOne({ 
          _id: new ObjectId(productId) 
        });

        if (product && product.vendorId) {
          const vendorId = product.vendorId.toString();
          if (!vendorOrders[vendorId]) {
            vendorOrders[vendorId] = true;
            if (vendorStats[vendorId]) {
              vendorStats[vendorId].totalOrders++;
            }
          }
        }
      }
    }

    // Get pending withdrawals
    const pendingWithdrawals = await db.collection('withdrawals').find({
      status: 'pending',
    }).toArray();

    for (const withdrawal of pendingWithdrawals) {
      const vendorId = withdrawal.vendorId.toString();
      if (vendorStats[vendorId]) {
        vendorStats[vendorId].pendingWithdrawals++;
        vendorStats[vendorId].pendingAmount += withdrawal.amount;
      }
    }

    // Convert to array and calculate totals
    const vendorList = Object.values(vendorStats);
    
    const totals = {
      totalVendors: vendorList.length,
      totalPendingAmount: vendorList.reduce((sum, v) => sum + v.pendingAmount, 0),
      totalWalletBalance: vendorList.reduce((sum, v) => sum + v.walletBalance, 0),
      totalEarnings: vendorList.reduce((sum, v) => sum + v.totalEarnings, 0),
      totalWithdrawn: vendorList.reduce((sum, v) => sum + v.totalWithdrawn, 0),
      totalOrders: vendorList.reduce((sum, v) => sum + v.totalOrders, 0),
    };

    return NextResponse.json({
      vendors: vendorList,
      totals,
    });
  } catch (error: any) {
    console.error('[Vendor Earnings API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vendor earnings', details: error.message },
      { status: 500 }
    );
  }
}

