import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/mongodb';
import { getUserFromRequest, isVendor } from '@/lib/auth';
import { incrementStock } from '@/lib/models/inventory';

const STATUSES = new Set(['draft', 'ordered', 'received']);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getUserFromRequest(request);
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin' && user.role !== 'vendor')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid purchase order' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const status = String(body?.status || '');
    if (!STATUSES.has(status)) {
      return NextResponse.json({ error: 'Status must be draft, ordered, or received' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const po = await db.collection('purchase_orders').findOne({ _id: new ObjectId(id) });
    if (!po) return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 });
    if (isVendor(user) && String(po.vendorId || '') !== String(user.id)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    if (po.status === 'received') {
      return NextResponse.json({ error: 'This purchase order is already received' }, { status: 400 });
    }
    if (status === 'draft' && po.status !== 'draft') {
      return NextResponse.json({ error: 'Ordered purchase orders cannot go back to draft' }, { status: 400 });
    }

    if (status === 'received') {
      const variant =
        po.variant && typeof po.variant === 'object' && Object.keys(po.variant).length > 0 ? po.variant : undefined;
      const stockResult = await incrementStock(String(po.productId), Number(po.quantity || 0), variant, {
        reason: 'purchase_order',
        orderId: id,
      });
      if (!stockResult.success) {
        return NextResponse.json({ error: stockResult.error || 'Could not add stock' }, { status: 400 });
      }
    }

    await db.collection('purchase_orders').updateOne(
      { _id: po._id },
      {
        $set: {
          status,
          updatedAt: new Date(),
          ...(status === 'received' ? { receivedAt: new Date() } : {}),
        },
      }
    );

    return NextResponse.json({ success: true, status });
  } catch (error: any) {
    console.error('[Inventory] Purchase order update failed:', error);
    return NextResponse.json({ error: error?.message || 'Failed to update purchase order' }, { status: 500 });
  }
}
