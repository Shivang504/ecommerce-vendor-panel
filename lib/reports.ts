import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/mongodb';

function startOfDay(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function endOfDay(value: string) {
  const date = new Date(`${value}T23:59:59.999`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function vendorIds(vendorId: string) {
  const ids: Array<string | ObjectId> = [vendorId];
  if (ObjectId.isValid(vendorId)) ids.push(new ObjectId(vendorId));
  return ids;
}

export async function getBusinessReports(options: { from: string; to: string; vendorId?: string }) {
  const from = startOfDay(options.from);
  const to = endOfDay(options.to);
  if (!from || !to || from > to) {
    throw new Error('Pick a valid date range');
  }
  const span = to.getTime() - from.getTime();
  if (span > 366 * 24 * 60 * 60 * 1000) {
    throw new Error('Date range cannot be longer than 366 days');
  }

  const { db } = await connectToDatabase();
  const createdAt = { $gte: from, $lte: to };
  const vendorMatch = options.vendorId ? { 'items.vendorId': { $in: vendorIds(options.vendorId) } } : {};
  const orderMatch = { createdAt, ...vendorMatch };
  const counted = { $not: [{ $in: ['$orderStatus', ['cancelled', 'refunded']] }] };

  const sales = options.vendorId
    ? await db.collection('orders').aggregate([
        { $match: orderMatch },
        { $unwind: '$items' },
        { $match: { 'items.vendorId': { $in: vendorIds(options.vendorId) } } },
        {
          $group: {
            _id: { day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, order: '$_id' },
            status: { $first: '$orderStatus' },
            units: { $sum: '$items.quantity' },
            revenue: {
              $sum: {
                $cond: [counted, { $multiply: [{ $ifNull: ['$items.price', 0] }, { $ifNull: ['$items.quantity', 0] }] }, 0],
              },
            },
          },
        },
        {
          $group: {
            _id: '$_id.day',
            orders: { $sum: 1 },
            units: { $sum: '$units' },
            revenue: { $sum: '$revenue' },
            delivered: { $sum: { $cond: [{ $in: ['$status', ['delivered', 'completed']] }, 1, 0] } },
            cancelled: { $sum: { $cond: [{ $in: ['$status', ['cancelled', 'refunded']] }, 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]).toArray()
    : await db.collection('orders').aggregate([
        { $match: orderMatch },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            orders: { $sum: 1 },
            units: {
              $sum: {
                $reduce: {
                  input: { $ifNull: ['$items', []] },
                  initialValue: 0,
                  in: { $add: ['$$value', { $ifNull: ['$$this.quantity', 0] }] },
                },
              },
            },
            revenue: { $sum: { $cond: [counted, { $ifNull: ['$pricing.total', 0] }, 0] } },
            delivered: { $sum: { $cond: [{ $in: ['$orderStatus', ['delivered', 'completed']] }, 1, 0] } },
            cancelled: { $sum: { $cond: [{ $in: ['$orderStatus', ['cancelled', 'refunded']] }, 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]).toArray();

  const payments = options.vendorId
    ? []
    : await db.collection('orders').aggregate([
        { $match: { ...orderMatch, orderStatus: { $nin: ['cancelled', 'refunded'] } } },
        {
          $group: {
            _id: { $ifNull: ['$payment.paymentMethod', 'unknown'] },
            orders: { $sum: 1 },
            revenue: { $sum: { $ifNull: ['$pricing.total', 0] } },
          },
        },
        { $sort: { revenue: -1 } },
      ]).toArray();

  const vendorRows = await db.collection('orders').aggregate([
    { $match: { createdAt, ...(options.vendorId ? vendorMatch : {}), orderStatus: { $nin: ['cancelled', 'refunded'] } } },
    { $unwind: '$items' },
    ...(options.vendorId ? [{ $match: { 'items.vendorId': { $in: vendorIds(options.vendorId) } } }] : []),
    {
      $group: {
        _id: '$items.vendorId',
        units: { $sum: { $ifNull: ['$items.quantity', 0] } },
        revenue: { $sum: { $multiply: [{ $ifNull: ['$items.price', 0] }, { $ifNull: ['$items.quantity', 0] }] } },
        orders: { $addToSet: '$_id' },
      },
    },
    { $project: { units: 1, revenue: 1, orders: { $size: '$orders' } } },
    { $sort: { revenue: -1 } },
    { $limit: 50 },
  ]).toArray();

  const vendorObjectIds = vendorRows
    .map(row => String(row._id || ''))
    .filter(id => ObjectId.isValid(id))
    .map(id => new ObjectId(id));
  const vendors = vendorObjectIds.length
    ? await db.collection('vendors').find({ _id: { $in: vendorObjectIds } }).project({ storeName: 1, email: 1 }).toArray()
    : [];
  const vendorNames = new Map(vendors.map(vendor => [vendor._id.toString(), vendor.storeName || vendor.email || 'Vendor']));

  const traffic = options.vendorId
    ? { hidden: true, days: [], topPaths: [] }
    : await (async () => {
        const days = await db.collection('page_views').aggregate([
          { $match: { createdAt } },
          { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, visits: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ]).toArray();
        const topPaths = await db.collection('page_views').aggregate([
          { $match: { createdAt } },
          { $group: { _id: '$path', visits: { $sum: 1 } } },
          { $sort: { visits: -1 } },
          { $limit: 15 },
        ]).toArray();
        return {
          hidden: false,
          days: days.map(day => ({ date: day._id, visits: day.visits })),
          topPaths: topPaths.map(row => ({ path: row._id || '/', visits: row.visits })),
        };
      })();

  const salesRows = sales.map(row => ({
    date: row._id,
    orders: row.orders || 0,
    units: row.units || 0,
    delivered: row.delivered || 0,
    cancelled: row.cancelled || 0,
    revenue: Math.round((row.revenue || 0) * 100) / 100,
  }));

  return {
    from: options.from,
    to: options.to,
    summary: {
      orders: salesRows.reduce((sum, row) => sum + row.orders, 0),
      units: salesRows.reduce((sum, row) => sum + row.units, 0),
      delivered: salesRows.reduce((sum, row) => sum + row.delivered, 0),
      cancelled: salesRows.reduce((sum, row) => sum + row.cancelled, 0),
      revenue: Math.round(salesRows.reduce((sum, row) => sum + row.revenue, 0) * 100) / 100,
      visits: traffic.hidden ? 0 : traffic.days.reduce((sum, row) => sum + row.visits, 0),
    },
    sales: salesRows,
    payments: payments.map(row => ({
      method: String(row._id || 'unknown'),
      orders: row.orders || 0,
      revenue: Math.round((row.revenue || 0) * 100) / 100,
    })),
    vendors: vendorRows.map(row => ({
      vendor: vendorNames.get(String(row._id || '')) || 'Store',
      orders: row.orders || 0,
      units: row.units || 0,
      revenue: Math.round((row.revenue || 0) * 100) / 100,
    })),
    traffic,
  };
}
