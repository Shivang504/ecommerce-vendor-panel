import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getUserFromRequest, isVendor } from '@/lib/auth';
import { getMonthRangeByOffset } from '@/lib/dashboard-month-range';

function csvEscape(value: unknown): string {
  const s = value == null ? '' : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Draft CSV: orders + summary for the selected calendar month (vendor-scoped). */
export async function GET(request: NextRequest) {
  try {
    const currentUser = getUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const monthOffset = Math.max(0, Math.min(120, parseInt(searchParams.get('monthOffset') || '0', 10) || 0));

    const { db } = await connectToDatabase();
    const { start, end, label, y, m } = getMonthRangeByOffset(monthOffset);

    const orderFilter: Record<string, unknown> = {
      createdAt: { $gte: start, $lte: end },
    };
    if (isVendor(currentUser)) {
      orderFilter['items.vendorId'] = currentUser.id;
    }

    const [orders, totalInMonth, pendingInMonth, cancelledInMonth, returnedInMonth, revenueAgg] = await Promise.all([
      db
        .collection('orders')
        .find(orderFilter)
        .sort({ createdAt: -1 })
        .project({
          orderNumber: 1,
          createdAt: 1,
          customerName: 1,
          customerEmail: 1,
          total: 1,
          orderStatus: 1,
          paymentStatus: 1,
        })
        .limit(5000)
        .toArray(),
      db.collection('orders').countDocuments(orderFilter),
      db.collection('orders').countDocuments({
        ...orderFilter,
        orderStatus: { $in: ['pending', 'processing', 'confirmed'] },
      }),
      db.collection('orders').countDocuments({
        ...orderFilter,
        orderStatus: 'cancelled',
      }),
      db.collection('orders').countDocuments({
        ...orderFilter,
        'items.itemStatus': 'returned',
      }),
      db
        .collection('orders')
        .aggregate([
          { $match: { ...orderFilter, orderStatus: { $ne: 'cancelled' } } },
          { $group: { _id: null, sum: { $sum: { $ifNull: ['$total', 0] } } } },
        ])
        .toArray(),
    ]);

    const gross = revenueAgg[0]?.sum ?? 0;
    const lines: string[] = [];
    lines.push('Section,Field,Value');
    lines.push(`Summary,Period,"${label.replace(/"/g, '""')}"`);
    lines.push(`Summary,Total orders (in period),${totalInMonth}`);
    lines.push(`Summary,Pending pipeline (in period),${pendingInMonth}`);
    lines.push(`Summary,Cancelled (in period),${cancelledInMonth}`);
    lines.push(`Summary,Orders with returned lines (in period),${returnedInMonth}`);
    lines.push(`Summary,Gross order value excl. cancelled (₹),${gross}`);
    lines.push('');
    lines.push('OrderNumber,CreatedAt,CustomerName,CustomerEmail,Total,OrderStatus,PaymentStatus');

    for (const o of orders) {
      const created = o.createdAt instanceof Date ? o.createdAt.toISOString() : String(o.createdAt ?? '');
      lines.push(
        [
          csvEscape(o.orderNumber ?? o._id?.toString().slice(-8)),
          csvEscape(created),
          csvEscape(o.customerName),
          csvEscape(o.customerEmail),
          csvEscape(o.total ?? ''),
          csvEscape(o.orderStatus),
          csvEscape(o.paymentStatus),
        ].join(',')
      );
    }

    const csv = `\ufeff${lines.join('\r\n')}`;
    const fname = `dashboard-draft-${y}-${String(m).padStart(2, '0')}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fname}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[dashboard/export]', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
