import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/mongodb';
import { getUserFromRequest, isVendor } from '@/lib/auth';

function allow(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) return null;
  if (user.role === 'admin' || user.role === 'superadmin' || user.role === 'vendor') return user;
  return null;
}

function vendorMatch(vendorId: string) {
  if (ObjectId.isValid(vendorId)) {
    return { $or: [{ vendorId }, { vendorId: new ObjectId(vendorId) }] };
  }
  return { vendorId };
}

export async function GET(request: NextRequest) {
  try {
    const user = allow(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { db } = await connectToDatabase();
    const vendorFilter = isVendor(user) ? vendorMatch(user.id) : {};

    const products = await db
      .collection('products')
      .find({ ...vendorFilter, lowStockThreshold: { $gt: 0 } })
      .project({ name: 1, sku: 1, stock: 1, lowStockThreshold: 1, reorderLevel: 1, variants: 1, vendorId: 1 })
      .limit(500)
      .toArray();

    const lowStock: Array<Record<string, unknown>> = [];
    for (const product of products) {
      const threshold = Number(product.lowStockThreshold || 0);
      const reorderLevel = Number(product.reorderLevel || 0);
      if (Number(product.stock || 0) <= threshold) {
        lowStock.push({
          productId: product._id.toString(),
          name: product.name,
          sku: product.sku || '',
          stock: Number(product.stock || 0),
          threshold,
          reorderLevel,
          variant: '',
        });
      }
      if (Array.isArray(product.variants)) {
        for (const variant of product.variants) {
          if (Number(variant?.stock || 0) > threshold) continue;
          const combo = variant?.attributeCombination || {};
          const label = Object.entries(combo)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ');
          if (!label) continue;
          lowStock.push({
            productId: product._id.toString(),
            name: product.name,
            sku: variant?.sku || product.sku || '',
            stock: Number(variant?.stock || 0),
            threshold,
            reorderLevel,
            variant: label,
          });
        }
      }
    }

    const movements = await db
      .collection('inventory_movements')
      .find(vendorFilter)
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    const purchaseOrders = await db
      .collection('purchase_orders')
      .find(vendorFilter)
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    return NextResponse.json({
      lowStock,
      movements: movements.map(serialize),
      purchaseOrders: purchaseOrders.map(serialize),
    });
  } catch (error: any) {
    console.error('[Inventory] List failed:', error);
    return NextResponse.json({ error: error?.message || 'Failed to load inventory' }, { status: 500 });
  }
}

function serialize(doc: any) {
  return {
    ...doc,
    _id: doc._id?.toString(),
    productId: doc.productId?.toString?.() || doc.productId || '',
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : null,
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : null,
    receivedAt: doc.receivedAt ? new Date(doc.receivedAt).toISOString() : null,
  };
}
