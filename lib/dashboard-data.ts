import type { Db } from 'mongodb';
import { ObjectId } from 'mongodb';
import type { DashboardMonthRange } from '@/lib/dashboard-month';

export interface DashboardUserContext {
  id?: string;
  role?: string;
}

export interface DashboardAnalytics {
  stats: {
    totalOrders: { value: string; change: string; trend: 'up' | 'down' };
    pendingOrders: { value: string; change: string; trend: 'up' | 'down' };
    cancelledOrders: { value: string; change: string; trend: 'up' | 'down' };
    returnedItems: { value: string; change: string; trend: 'up' | 'down' };
  };
  revenueData: Array<{ month: string; income: number; expense: number }>;
  categoryDistribution: Array<{ name: string; value: number; color: string; count?: number }>;
  topProducts: Array<{
    supplier: string;
    products: string;
    nextShipment: string;
    contact: string;
    rating: number;
    revenue?: number;
  }>;
  recentOrders: Array<{ id: string; customer: string; product: string; price: number; status: string }>;
  topDeals: Array<{ name: string; category: string; price: string; icon?: string; sales?: number }>;
  summary: {
    totalProducts: number;
    totalCustomers: number;
    totalVendors: number;
    totalOrders: number;
  };
  period: { year: number; month: number; label: string };
}

function isVendorUser(user: DashboardUserContext | null | undefined) {
  return user?.role === 'vendor';
}

function formatChange(current: number, previous: number, suffix: string) {
  if (previous <= 0) {
    return { change: 'No prior data', trend: 'up' as const };
  }
  const pct = ((current - previous) / previous) * 100;
  const sign = pct >= 0 ? '+' : '';
  return {
    change: `${sign}${pct.toFixed(1)}% ${suffix}`,
    trend: (pct >= 0 ? 'up' : 'down') as 'up' | 'down',
  };
}

export async function getDashboardAnalytics(
  db: Db,
  currentUser: DashboardUserContext | null | undefined,
  monthRange: DashboardMonthRange
): Promise<DashboardAnalytics> {
  const { startOfMonth, endOfMonth, startOfLastMonth, endOfLastMonth, year, month, label } =
    monthRange;

  const productFilter: Record<string, unknown> = {
    status: { $in: ['active', 'Active', 'Published'] },
  };
  const orderFilter: Record<string, unknown> = {};

  if (currentUser && isVendorUser(currentUser)) {
    productFilter.vendorId = currentUser.id;
    orderFilter['items.vendorId'] = currentUser.id;
  }

  const monthOrderFilter = {
    ...orderFilter,
    createdAt: { $gte: startOfMonth, $lte: endOfMonth },
  };

  const lastMonthOrderFilter = {
    ...orderFilter,
    createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
  };

  const [
    totalOrders,
    pendingOrders,
    cancelledOrders,
    returnedItems,
    totalProducts,
    totalCustomers,
    totalVendors,
    revenueData,
    categoryDistribution,
    topVendors,
    recentOrders,
    topProducts,
    lastMonthStats,
    lastMonthReturned,
  ] = await Promise.all([
    db.collection('orders').countDocuments(monthOrderFilter),

    db.collection('orders').countDocuments({
      ...monthOrderFilter,
      orderStatus: { $in: ['pending', 'processing', 'confirmed'] },
    }),

    db.collection('orders').countDocuments({
      ...monthOrderFilter,
      orderStatus: 'cancelled',
    }),

    db.collection('orders').countDocuments({
      ...monthOrderFilter,
      'items.itemStatus': 'returned',
    }),

    db.collection('products').countDocuments(productFilter),

    currentUser && isVendorUser(currentUser)
      ? Promise.resolve(0)
      : db.collection('users').countDocuments({ role: 'customer' }).catch(() => 0),

    currentUser && isVendorUser(currentUser)
      ? Promise.resolve(0)
      : db.collection('users').countDocuments({ role: 'vendor' }).catch(() => 0),

    (async () => {
      const months = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(year, month - 1 - i, 1);
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

        const monthRevenue = await db
          .collection('orders')
          .aggregate([
            {
              $match: {
                ...orderFilter,
                createdAt: { $gte: monthStart, $lte: monthEnd },
                orderStatus: { $ne: 'cancelled' },
              },
            },
            {
              $group: {
                _id: null,
                income: { $sum: '$total' },
                expense: { $sum: { $ifNull: ['$shipping', 0] } },
              },
            },
          ])
          .toArray();

        months.push({
          month: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          income: monthRevenue[0]?.income || 0,
          expense: monthRevenue[0]?.expense || 0,
        });
      }
      return months;
    })(),

    db
      .collection('orders')
      .aggregate([
        {
          $match: {
            ...orderFilter,
            createdAt: { $gte: startOfMonth, $lte: endOfMonth },
            orderStatus: { $ne: 'cancelled' },
          },
        },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.productId',
            quantity: { $sum: '$items.quantity' },
          },
        },
        { $sort: { quantity: -1 } },
        { $limit: 20 },
      ])
      .toArray()
      .then(async (salesByProduct) => {
        if (salesByProduct.length === 0) {
          return db
            .collection('products')
            .aggregate([
              { $match: productFilter },
              { $group: { _id: '$category', count: { $sum: 1 } } },
              { $sort: { count: -1 } },
              { $limit: 10 },
            ])
            .toArray()
            .then((categories) => buildCategoryDistribution(db, categories));
        }

        const productIds = salesByProduct
          .map((p) => p._id)
          .filter((id) => id && ObjectId.isValid(String(id)))
          .map((id) => new ObjectId(String(id)));

        if (productIds.length === 0) return [];

        const products = await db
          .collection('products')
          .find({ _id: { $in: productIds } })
          .project({ _id: 1, category: 1 })
          .toArray();

        const qtyByProduct = new Map(
          salesByProduct.map((p) => [String(p._id), p.quantity as number])
        );

        const categoryCounts = new Map<string, number>();
        for (const product of products) {
          const catId = product.category?.toString() || 'uncategorized';
          const qty = qtyByProduct.get(product._id.toString()) || 0;
          categoryCounts.set(catId, (categoryCounts.get(catId) || 0) + qty);
        }

        const categories = Array.from(categoryCounts.entries()).map(([id, count]) => ({
          _id: id,
          count,
        }));
        categories.sort((a, b) => b.count - a.count);
        return buildCategoryDistribution(db, categories.slice(0, 10));
      }),

    db
      .collection('orders')
      .aggregate([
        {
          $match: {
            ...orderFilter,
            orderStatus: { $ne: 'cancelled' },
            createdAt: { $gte: startOfMonth, $lte: endOfMonth },
          },
        },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.vendorId',
            orderCount: { $sum: 1 },
            revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 5 },
      ])
      .toArray()
      .then(async (vendors) => {
        if (vendors.length === 0) return [];

        const vendorIds = vendors
          .map((v) => v._id)
          .filter((id) => id && ObjectId.isValid(String(id)))
          .map((id) => new ObjectId(String(id)));

        if (vendorIds.length === 0) return [];

        const vendorDocs = await db
          .collection('users')
          .find({ _id: { $in: vendorIds }, role: 'vendor' })
          .project({ _id: 1, name: 1, email: 1 })
          .toArray();

        const vendorMap = new Map(vendorDocs.map((v) => [v._id.toString(), v]));

        return vendors.map((v) => {
          const vendor = vendorMap.get(v._id?.toString() || '');
          return {
            supplier: vendor?.name || 'Unknown Vendor',
            products: `${v.orderCount} orders`,
            nextShipment: 'N/A',
            contact: vendor?.email || 'N/A',
            rating: 5,
            revenue: v.revenue || 0,
          };
        });
      }),

    db
      .collection('orders')
      .find(monthOrderFilter)
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
        createdAt: 1,
      })
      .toArray()
      .then((orders) =>
        orders.map((order) => ({
          id: order.orderNumber || order._id.toString().slice(-6).toUpperCase(),
          customer: order.customerName || order.customerEmail || 'Unknown',
          product: order.items?.[0]?.name || 'Multiple items',
          price: order.total || 0,
          status: order.orderStatus || 'pending',
        }))
      ),

    db
      .collection('orders')
      .aggregate([
        {
          $match: {
            ...orderFilter,
            orderStatus: { $ne: 'cancelled' },
            createdAt: { $gte: startOfMonth, $lte: endOfMonth },
          },
        },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.productId',
            name: { $first: '$items.name' },
            totalSold: { $sum: '$items.quantity' },
            revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          },
        },
        { $sort: { totalSold: -1 } },
        { $limit: 5 },
      ])
      .toArray()
      .then((products) =>
        products.map((p) => ({
          name: p.name || 'Unknown Product',
          category: 'Product',
          price: p.totalSold > 0 ? `₹${(p.revenue / p.totalSold).toFixed(2)}` : '₹0',
          icon: '📦',
          sales: p.totalSold,
        }))
      ),

    db
      .collection('orders')
      .aggregate([
        { $match: lastMonthOrderFilter },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            pendingOrders: {
              $sum: {
                $cond: [{ $in: ['$orderStatus', ['pending', 'processing', 'confirmed']] }, 1, 0],
              },
            },
            cancelledOrders: {
              $sum: { $cond: [{ $eq: ['$orderStatus', 'cancelled'] }, 1, 0] },
            },
          },
        },
      ])
      .toArray()
      .then((result) => result[0] || { totalOrders: 0, pendingOrders: 0, cancelledOrders: 0 }),

    db.collection('orders').countDocuments({
      ...lastMonthOrderFilter,
      'items.itemStatus': 'returned',
    }),
  ]);

  const ordersChange = formatChange(totalOrders, lastMonthStats.totalOrders, 'vs last month');
  const pendingChange = formatChange(
    pendingOrders,
    lastMonthStats.pendingOrders,
    'vs last month'
  );
  const cancelledChange = formatChange(
    cancelledOrders,
    lastMonthStats.cancelledOrders,
    'vs last month'
  );
  const returnedChange = formatChange(returnedItems, lastMonthReturned, 'vs last month');

  return {
    stats: {
      totalOrders: {
        value: totalOrders.toLocaleString('en-IN'),
        change: ordersChange.change,
        trend: ordersChange.trend,
      },
      pendingOrders: {
        value: pendingOrders.toLocaleString('en-IN'),
        change: pendingChange.change,
        trend: pendingChange.trend,
      },
      cancelledOrders: {
        value: cancelledOrders.toLocaleString('en-IN'),
        change: cancelledChange.change,
        trend: cancelledChange.trend,
      },
      returnedItems: {
        value: returnedItems.toLocaleString('en-IN'),
        change: returnedChange.change,
        trend: returnedChange.trend,
      },
    },
    revenueData,
    categoryDistribution,
    topProducts: topVendors,
    recentOrders,
    topDeals: topProducts,
    summary: {
      totalProducts,
      totalCustomers,
      totalVendors,
      totalOrders,
    },
    period: { year, month, label },
  };
}

async function buildCategoryDistribution(
  db: Db,
  categories: Array<{ _id: unknown; count: number }>
) {
  const categoryIds = categories
    .map((c) => c._id)
    .filter((id) => id && id !== 'uncategorized')
    .map((id) => (ObjectId.isValid(String(id)) ? new ObjectId(String(id)) : id));

  if (categoryIds.length === 0 && categories.length === 0) return [];

  const categoryDocs =
    categoryIds.length > 0
      ? await db
          .collection('categories')
          .find({ _id: { $in: categoryIds } })
          .project({ _id: 1, name: 1 })
          .toArray()
      : [];

  const categoryMap = new Map(categoryDocs.map((c) => [c._id.toString(), c.name]));
  const total = categories.reduce((sum, c) => sum + c.count, 0);
  const colors = [
    '#a5f3fc',
    '#86efac',
    '#16a34a',
    '#fbbf24',
    '#f87171',
    '#a78bfa',
    '#60a5fa',
    '#34d399',
    '#fbbf24',
    '#fb7185',
  ];

  return categories.map((cat, index) => ({
    name:
      cat._id === 'uncategorized'
        ? 'Uncategorized'
        : categoryMap.get(String(cat._id)) || 'Uncategorized',
    value: total > 0 ? Math.round((cat.count / total) * 100) : 0,
    color: colors[index % colors.length],
    count: cat.count,
  }));
}
