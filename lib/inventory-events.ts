import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export type StockChangeReason = 'sale' | 'restock' | 'adjustment' | 'purchase_order';

type StockChangeInput = {
  productId: string;
  previousStock: number;
  newStock: number;
  variant?: Record<string, string>;
  reason?: string;
  orderId?: string;
};

function variantKey(variant?: Record<string, string>) {
  if (!variant || Object.keys(variant).length === 0) return '';
  return Object.keys(variant)
    .sort()
    .map(key => `${key}:${variant[key]}`)
    .join('|');
}

function variantLabel(variant?: Record<string, string>) {
  const key = variantKey(variant);
  return key ? ` (${key.replace(/\|/g, ', ')})` : '';
}

function sameVariant(a?: Record<string, string>, b?: Record<string, string>) {
  return variantKey(a) === variantKey(b);
}

export async function recordStockChange(input: StockChangeInput) {
  if (!ObjectId.isValid(input.productId)) return;
  const previousStock = Number(input.previousStock || 0);
  const newStock = Number(input.newStock || 0);
  if (previousStock === newStock) return;

  const { db } = await connectToDatabase();
  const product = await db.collection('products').findOne({ _id: new ObjectId(input.productId) });
  if (!product) return;

  const key = variantKey(input.variant);
  const reason = input.reason || 'adjustment';
  const name = `${product.name || 'Product'}${variantLabel(input.variant)}`;
  const threshold = Number(product.lowStockThreshold || 0);
  const reorderLevel = Number(product.reorderLevel || 0);

  await db.collection('inventory_movements').insertOne({
    productId: product._id,
    productName: product.name || '',
    sku: product.sku || '',
    vendorId: product.vendorId ? String(product.vendorId) : '',
    variant: input.variant || null,
    variantKey: key,
    previousStock,
    newStock,
    delta: newStock - previousStock,
    reason,
    orderId: input.orderId || '',
    createdAt: new Date(),
  });

  if (threshold > 0 && newStock <= threshold) {
    const active = await db.collection('inventory_alerts').findOne({
      productId: product._id,
      variantKey: key,
      kind: 'low_stock',
      active: true,
    });
    if (!active) {
      await db.collection('inventory_alerts').insertOne({
        productId: product._id,
        productName: product.name || '',
        variantKey: key,
        kind: 'low_stock',
        active: true,
        stock: newStock,
        threshold,
        createdAt: new Date(),
      });
      await notifyWatchers(
        product,
        'Low stock',
        `${name} is at ${newStock}. Threshold is ${threshold}.`
      );
    }
  } else if (threshold > 0 && newStock > threshold) {
    await db.collection('inventory_alerts').updateMany(
      { productId: product._id, variantKey: key, kind: 'low_stock', active: true },
      { $set: { active: false, resolvedAt: new Date(), stock: newStock } }
    );
  }

  if (reorderLevel > 0 && newStock <= reorderLevel && newStock < previousStock) {
    const openPo = await db.collection('purchase_orders').findOne({
      productId: product._id,
      variantKey: key,
      status: { $in: ['draft', 'ordered'] },
    });
    if (!openPo) {
      const quantity = Math.max(1, reorderLevel - newStock);
      const poNumber = `PO-${Date.now().toString().slice(-8)}`;
      await db.collection('purchase_orders').insertOne({
        poNumber,
        productId: product._id,
        productName: product.name || '',
        sku: product.sku || '',
        vendorId: product.vendorId ? String(product.vendorId) : '',
        variant: input.variant || null,
        variantKey: key,
        currentStock: newStock,
        reorderLevel,
        quantity,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await notifyWatchers(
        product,
        'Purchase order drafted',
        `${poNumber} for ${name}. Qty ${quantity}. Stock is ${newStock}, reorder level is ${reorderLevel}.`
      );
    }
  }

  if (previousStock <= 0 && newStock > 0) {
    await notifyBackInStock(product, name);
  }
}

export async function recordManualStockEdits(productId: string, before: any, after: any) {
  if (!before || !after) return;
  if (after.stock !== undefined && Number(before.stock || 0) !== Number(after.stock || 0)) {
    await recordStockChange({
      productId,
      previousStock: Number(before.stock || 0),
      newStock: Number(after.stock || 0),
      reason: 'adjustment',
    });
  }

  if (!Array.isArray(after.variants) || !Array.isArray(before.variants)) return;
  for (const variant of after.variants) {
    const combo = variant?.attributeCombination;
    if (!combo || typeof combo !== 'object') continue;
    const prev = before.variants.find((item: any) => sameVariant(item?.attributeCombination, combo));
    if (!prev) continue;
    if (Number(prev.stock || 0) === Number(variant.stock || 0)) continue;
    await recordStockChange({
      productId,
      previousStock: Number(prev.stock || 0),
      newStock: Number(variant.stock || 0),
      variant: combo,
      reason: 'adjustment',
    });
  }
}

async function notifyWatchers(product: any, title: string, message: string) {
  const vendorId = product?.vendorId ? String(product.vendorId) : '';
  try {
    const { createNotification } = await import('@/lib/models/notification');
    await createNotification({
      type: 'system_alert',
      title,
      message,
      isRead: false,
    });
    if (vendorId) {
      await createNotification({
        type: 'system_alert',
        title,
        message,
        isRead: false,
        metadata: { vendorId },
      });
    }
  } catch (error) {
    console.error('[Inventory] Notification failed:', error);
  }

  try {
    const { db } = await connectToDatabase();
    const { sendEmail } = await import('@/lib/email');
    const admins = await db
      .collection('admins')
      .find({ status: { $ne: 'inactive' }, email: { $exists: true, $ne: '' } })
      .project({ email: 1 })
      .limit(20)
      .toArray();
    const emails = new Set(admins.map(admin => String(admin.email || '').trim()).filter(Boolean));

    if (vendorId && ObjectId.isValid(vendorId)) {
      const vendor = await db.collection('vendors').findOne({ _id: new ObjectId(vendorId) });
      const vendorEmail = String(vendor?.email || '').trim();
      if (vendorEmail) emails.add(vendorEmail);
    }

    await Promise.all(
      Array.from(emails).map(email =>
        sendEmail({
          to: email,
          subject: title,
          html: `<p>${message}</p>`,
          text: message,
        }).catch(error => {
          console.error('[Inventory] Alert email failed:', error);
          return false;
        })
      )
    );
  } catch (error) {
    console.error('[Inventory] Alert email lookup failed:', error);
  }
}

async function notifyBackInStock(product: any, name: string) {
  try {
    const { db } = await connectToDatabase();
    const alerts = await db
      .collection('stock_alerts')
      .find({ productId: product._id, notified: { $ne: true } })
      .toArray();
    if (alerts.length === 0) return;

    const { sendEmail } = await import('@/lib/email');
    for (const alert of alerts) {
      const email = String(alert.email || '').trim();
      if (!email) continue;
      try {
        await sendEmail({
          to: email,
          subject: `${product.name || 'A product'} is back in stock`,
          html: `<p>${name} is back in stock. You can order it now.</p>`,
          text: `${name} is back in stock.`,
        });
        await db.collection('stock_alerts').updateOne(
          { _id: alert._id },
          { $set: { notified: true, notifiedAt: new Date() } }
        );
      } catch (error) {
        console.error('[Inventory] Back-in-stock email failed:', error);
      }
    }
  } catch (error) {
    console.error('[Inventory] Back-in-stock lookup failed:', error);
  }
}
