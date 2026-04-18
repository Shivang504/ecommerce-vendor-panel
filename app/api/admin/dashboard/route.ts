import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getUserFromRequest, isVendor } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export const revalidate = 60; // Cache for 60 seconds

/**
 * Optimized Dashboard API
 * Fetches all dashboard data in a single request with proper projections and aggregations
 */
export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const currentUser = getUserFromRequest(request);
    
    // Build filters based on user role
    const productFilter: any = { status: { $in: ['active', 'Active', 'Published'] } };
    const orderFilter: any = {};
    const vendorFilter: any = {};
    
    if (currentUser && isVendor(currentUser)) {
      productFilter.vendorId = currentUser.id;
      orderFilter['items.vendorId'] = currentUser.id;
      vendorFilter._id = new ObjectId(currentUser.id);
    }

    // Get current date for calculations
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const startOfLastQuarter = new Date(now.getFullYear(), now.getMonth() - 3, 1);

    // Execute all queries in parallel for better performance
    const [
      // Basic stats
      totalOrders,
      pendingOrders,
      cancelledOrders,
      returnedItems,
      totalProducts,
      totalCustomers,
      totalVendors,
      
      // Revenue data (last 7 months)
      revenueData,
      
      // Category distribution
      categoryDistribution,
      
      // Top vendors/suppliers
      topVendors,
      
      // Recent orders
      recentOrders,
      
      // Top products by sales
      topProducts,
      
      // Comparison with previous period
      lastMonthStats,
      lastQuarterStats,
    ] = await Promise.all([
      // Total orders
      db.collection('orders').countDocuments(orderFilter),
      
      // Pending orders
      db.collection('orders').countDocuments({
        ...orderFilter,
        orderStatus: { $in: ['pending', 'processing', 'confirmed'] }
      }),
      
      // Cancelled orders
      db.collection('orders').countDocuments({
        ...orderFilter,
        orderStatus: 'cancelled'
      }),
      
      // Returned items (orders with returned items)
      db.collection('orders').countDocuments({
        ...orderFilter,
        'items.itemStatus': 'returned'
      }),
      
      // Total products
      db.collection('products').countDocuments(productFilter),
      
      // Total customers (only for admins)
      currentUser && isVendor(currentUser)
        ? Promise.resolve(0)
        : db.collection('users').countDocuments({ role: 'customer' }).catch(() => 0),
      
      // Total vendors (only for admins)
      currentUser && isVendor(currentUser)
        ? Promise.resolve(0)
        : db.collection('users').countDocuments({ role: 'vendor' }).catch(() => 0),
      
      // Revenue data for last 7 months
      (async () => {
        const months = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
          const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
          
          const monthRevenue = await db.collection('orders')
            .aggregate([
              {
                $match: {
                  ...orderFilter,
                  createdAt: { $gte: monthStart, $lte: monthEnd },
                  orderStatus: { $ne: 'cancelled' }
                }
              },
              {
                $group: {
                  _id: null,
                  income: { $sum: '$total' },
                  expense: { $sum: { $ifNull: ['$shipping', 0] } }
                }
              }
            ])
            .toArray();
          
          const monthName = date.toLocaleDateString('en-US', { month: 'short' });
          months.push({
            month: monthName,
            income: monthRevenue[0]?.income || 0,
            expense: monthRevenue[0]?.expense || 0
          });
        }
        return months;
      })(),
      
      // Category distribution (products by category)
      db.collection('products')
        .aggregate([
          { $match: productFilter },
          {
            $group: {
              _id: '$category',
              count: { $sum: 1 }
            }
          },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ])
        .toArray()
        .then(async (categories) => {
          // Get category names
          const categoryIds = categories
            .map(c => c._id)
            .filter(id => id)
            .map(id => ObjectId.isValid(id) ? new ObjectId(id) : id);
          
          if (categoryIds.length === 0) return [];
          
          const categoryDocs = await db.collection('categories')
            .find({ _id: { $in: categoryIds } })
            .project({ _id: 1, name: 1 })
            .toArray();
          
          const categoryMap = new Map(categoryDocs.map(c => [c._id.toString(), c.name]));
          
          const total = categories.reduce((sum, c) => sum + c.count, 0);
          const colors = ['#a5f3fc', '#86efac', '#16a34a', '#fbbf24', '#f87171', '#a78bfa', '#60a5fa', '#34d399', '#fbbf24', '#fb7185'];
          
          return categories.map((cat, index) => ({
            name: categoryMap.get(cat._id?.toString() || '') || 'Uncategorized',
            value: total > 0 ? Math.round((cat.count / total) * 100) : 0,
            color: colors[index % colors.length],
            count: cat.count
          }));
        }),
      
      // Top vendors/suppliers (by order count or revenue)
      db.collection('orders')
        .aggregate([
          {
            $match: {
              ...orderFilter,
              orderStatus: { $ne: 'cancelled' },
              createdAt: { $gte: startOfMonth }
            }
          },
          { $unwind: '$items' },
          {
            $group: {
              _id: '$items.vendorId',
              orderCount: { $sum: 1 },
              revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
            }
          },
          { $sort: { revenue: -1 } },
          { $limit: 5 }
        ])
        .toArray()
        .then(async (vendors) => {
          if (vendors.length === 0) return [];
          
          const vendorIds = vendors
            .map(v => v._id)
            .filter(id => id && ObjectId.isValid(id))
            .map(id => new ObjectId(id));
          
          if (vendorIds.length === 0) return [];
          
          const vendorDocs = await db.collection('users')
            .find({ _id: { $in: vendorIds }, role: 'vendor' })
            .project({ _id: 1, name: 1, email: 1 })
            .toArray();
          
          const vendorMap = new Map(vendorDocs.map(v => [v._id.toString(), v]));
          
          return vendors.map(v => {
            const vendor = vendorMap.get(v._id?.toString() || '');
            return {
              supplier: vendor?.name || 'Unknown Vendor',
              products: `${v.orderCount} orders`,
              nextShipment: 'N/A', // Can be calculated from pending orders
              contact: vendor?.email || 'N/A',
              rating: 5, // Can be fetched from reviews
              revenue: v.revenue || 0
            };
          });
        }),
      
      // Recent orders (last 10)
      db.collection('orders')
        .find(orderFilter)
        .sort({ createdAt: -1 })
        .limit(10)
        .project({
          _id: 1,
          orderNumber: 1,
          customerName: 1,
          customerEmail: 1,
          items: { $slice: ['$items', 1] },
          total: 1,
          orderStatus: 1,
          createdAt: 1
        })
        .toArray()
        .then(orders => orders.map(order => ({
          id: order.orderNumber || order._id.toString().slice(-6).toUpperCase(),
          customer: order.customerName || order.customerEmail || 'Unknown',
          product: order.items?.[0]?.name || 'Multiple items',
          price: order.total || 0,
          status: order.orderStatus || 'pending'
        }))),
      
      // Top products by sales (last month)
      db.collection('orders')
        .aggregate([
          {
            $match: {
              ...orderFilter,
              orderStatus: { $ne: 'cancelled' },
              createdAt: { $gte: startOfMonth }
            }
          },
          { $unwind: '$items' },
          {
            $group: {
              _id: '$items.productId',
              name: { $first: '$items.name' },
              totalSold: { $sum: '$items.quantity' },
              revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
            }
          },
          { $sort: { totalSold: -1 } },
          { $limit: 5 }
        ])
        .toArray()
        .then(products => products.map(p => ({
          name: p.name || 'Unknown Product',
          category: 'Product', // Can be fetched from product document
          price: `₹${(p.revenue / p.totalSold).toFixed(2)}`,
          icon: '📦',
          sales: p.totalSold
        }))),
      
      // Last month stats for comparison
      db.collection('orders')
        .aggregate([
          {
            $match: {
              ...orderFilter,
              createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
            }
          },
          {
            $group: {
              _id: null,
              totalOrders: { $sum: 1 },
              pendingOrders: {
                $sum: { $cond: [{ $in: ['$orderStatus', ['pending', 'processing', 'confirmed']] }, 1, 0] }
              },
              cancelledOrders: {
                $sum: { $cond: [{ $eq: ['$orderStatus', 'cancelled'] }, 1, 0] }
              }
            }
          }
        ])
        .toArray()
        .then(result => result[0] || { totalOrders: 0, pendingOrders: 0, cancelledOrders: 0 }),
      
      // Last quarter stats for comparison
      db.collection('orders')
        .aggregate([
          {
            $match: {
              ...orderFilter,
              createdAt: { $gte: startOfLastQuarter, $lt: startOfMonth }
            }
          },
          {
            $group: {
              _id: null,
              totalOrders: { $sum: 1 },
              returnedItems: {
                $sum: {
                  $size: {
                    $filter: {
                      input: '$items',
                      as: 'item',
                      cond: { $eq: ['$$item.itemStatus', 'returned'] }
                    }
                  }
                }
              }
            }
          }
        ])
        .toArray()
        .then(result => result[0] || { totalOrders: 0, returnedItems: 0 })
    ]);

    // Calculate percentage changes
    const ordersChange = lastMonthStats.totalOrders > 0
      ? ((totalOrders - lastMonthStats.totalOrders) / lastMonthStats.totalOrders * 100).toFixed(1)
      : '0';
    
    const pendingChange = lastMonthStats.pendingOrders > 0
      ? ((pendingOrders - lastMonthStats.pendingOrders) / lastMonthStats.pendingOrders * 100).toFixed(1)
      : '0';
    
    const cancelledChange = lastMonthStats.cancelledOrders > 0
      ? ((cancelledOrders - lastMonthStats.cancelledOrders) / lastMonthStats.cancelledOrders * 100).toFixed(1)
      : '0';
    
    const returnedChange = lastQuarterStats.returnedItems > 0
      ? ((returnedItems - lastQuarterStats.returnedItems) / lastQuarterStats.returnedItems * 100).toFixed(1)
      : '0';

    // Format stats with changes
    const stats = {
      totalOrders: {
        value: totalOrders.toLocaleString('en-IN'),
        change: `${ordersChange.startsWith('-') ? '' : '+'}${ordersChange}% from last month`,
        trend: parseFloat(ordersChange) >= 0 ? 'up' : 'down'
      },
      pendingOrders: {
        value: pendingOrders.toLocaleString('en-IN'),
        change: `${pendingChange.startsWith('-') ? '' : '+'}${pendingChange}% vs last month`,
        trend: parseFloat(pendingChange) >= 0 ? 'up' : 'down'
      },
      cancelledOrders: {
        value: cancelledOrders.toLocaleString('en-IN'),
        change: `${cancelledChange.startsWith('-') ? '' : '+'}${cancelledChange}% from last month`,
        trend: parseFloat(cancelledChange) >= 0 ? 'up' : 'down'
      },
      returnedItems: {
        value: returnedItems.toLocaleString('en-IN'),
        change: `${returnedChange.startsWith('-') ? '' : '+'}${returnedChange}% vs last month`,
        trend: parseFloat(returnedChange) >= 0 ? 'up' : 'down'
      }
    };

    return NextResponse.json({
      stats,
      revenueData,
      categoryDistribution,
      topProducts: topVendors, // Using vendors as suppliers
      recentOrders,
      topDeals: topProducts, // Top products as deals
      summary: {
        totalProducts,
        totalCustomers,
        totalVendors,
        totalOrders
      }
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
      }
    });
  } catch (error: any) {
    console.error('[Dashboard API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch dashboard data',
        detail: error?.message || String(error),
        stats: {
          totalOrders: { value: '0', change: '0%', trend: 'up' },
          pendingOrders: { value: '0', change: '0%', trend: 'up' },
          cancelledOrders: { value: '0', change: '0%', trend: 'up' },
          returnedItems: { value: '0', change: '0%', trend: 'up' }
        },
        revenueData: [],
        categoryDistribution: [],
        topProducts: [],
        recentOrders: [],
        topDeals: [],
        summary: { totalProducts: 0, totalCustomers: 0, totalVendors: 0, totalOrders: 0 }
      },
      { status: 500 }
    );
  }
}
