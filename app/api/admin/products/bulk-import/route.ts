import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/mongodb';
import { getUserFromRequest, isVendor } from '@/lib/auth';
import { sanitizeAttributeSelections } from '@/lib/product-attributes';
import {
  buildProductDocument,
  MAX_IMPORT_ROWS,
  ProductImportRow,
  ProductImportRowSchema,
} from '@/lib/product-bulk-import';

const normalizeProductPayload = (payload: Record<string, unknown>) => ({
  ...payload,
  wholesalePriceType: payload.wholesalePriceType || 'Fixed',
  sizeChartImage: payload.sizeChartImage ?? '',
  jewelleryWeight: typeof payload.jewelleryWeight === 'number' ? payload.jewelleryWeight : 0,
  jewelleryPurity: payload.jewelleryPurity ?? '',
  jewelleryMakingCharges:
    typeof payload.jewelleryMakingCharges === 'number' ? payload.jewelleryMakingCharges : 0,
  jewelleryStoneDetails: payload.jewelleryStoneDetails ?? '',
  jewelleryCertification: payload.jewelleryCertification ?? '',
  attributes: sanitizeAttributeSelections(payload.attributes),
});

export async function POST(request: NextRequest) {
  try {
    const currentUser = getUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const rows: ProductImportRow[] = Array.isArray(body?.rows) ? body.rows : [];
    const updateExisting: boolean = !!body?.options?.updateExisting;

    if (!rows.length) {
      return NextResponse.json({ error: 'No rows provided' }, { status: 400 });
    }

    if (rows.length > MAX_IMPORT_ROWS) {
      return NextResponse.json(
        { error: `Too many rows. Maximum allowed is ${MAX_IMPORT_ROWS}` },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const errors: Array<{ rowNumber: number; message: string }> = [];
    let created = 0;
    let updated = 0;
    let skipped = 0;

    let vendorName = 'Main Store';
    let vendorId: string | undefined;

    if (isVendor(currentUser)) {
      vendorId = currentUser.id;
      const vendorDoc = await db.collection('vendors').findOne(
        ObjectId.isValid(currentUser.id)
          ? { $or: [{ _id: new ObjectId(currentUser.id) }, { _id: currentUser.id }] }
          : { _id: currentUser.id },
        { projection: { storeName: 1 } }
      );
      vendorName = vendorDoc?.storeName || currentUser.email || 'Vendor Store';
    }

    const vendorCache = new Map<string, { vendorId: string; storeName: string }>();

    for (const rawRow of rows) {
      const parsed = ProductImportRowSchema.safeParse(rawRow);
      if (!parsed.success) {
        errors.push({
          rowNumber: rawRow?.rowNumber || 0,
          message: parsed.error.issues.map(i => i.message).join('; '),
        });
        continue;
      }

      const row = parsed.data;
      let rowVendorName = vendorName;
      let rowVendorId = vendorId;

      if (!isVendor(currentUser)) {
        const vendorKey = (row.vendor || 'Main Store').trim();
        if (!vendorCache.has(vendorKey)) {
          const vendorDoc = await db.collection('vendors').findOne(
            { storeName: vendorKey },
            { projection: { _id: 1, storeName: 1 } }
          );
          if (!vendorDoc) {
            errors.push({ rowNumber: row.rowNumber, message: `Vendor "${vendorKey}" not found` });
            continue;
          }
          vendorCache.set(vendorKey, {
            vendorId: vendorDoc._id.toString(),
            storeName: vendorDoc.storeName,
          });
        }
        const cached = vendorCache.get(vendorKey)!;
        rowVendorName = cached.storeName;
        rowVendorId = cached.vendorId;
      }

      const existingQuery: Record<string, unknown> = { sku: row.sku };
      if (isVendor(currentUser)) {
        existingQuery.$or = [
          { vendorId: currentUser.id },
          ...(ObjectId.isValid(currentUser.id) ? [{ vendorId: new ObjectId(currentUser.id) }] : []),
        ];
      }

      const existing = await db.collection('products').findOne(existingQuery, { projection: { _id: 1 } });

      if (existing) {
        if (!updateExisting) {
          skipped += 1;
          errors.push({ rowNumber: row.rowNumber, message: `SKU "${row.sku}" already exists` });
          continue;
        }

        const productDoc = normalizeProductPayload(
          buildProductDocument(row, { vendorName: rowVendorName, vendorId: rowVendorId }) as Record<string, unknown>
        );
        delete (productDoc as Record<string, unknown>).createdAt;

        await db.collection('products').updateOne(
          { _id: existing._id },
          { $set: { ...productDoc, updatedAt: new Date() } }
        );
        updated += 1;
        continue;
      }

      const productDoc = normalizeProductPayload(
        buildProductDocument(row, { vendorName: rowVendorName, vendorId: rowVendorId }) as Record<string, unknown>
      );

      await db.collection('products').insertOne(productDoc);
      created += 1;
    }

    return NextResponse.json({ created, updated, skipped, errors });
  } catch (error) {
    console.error('[v0] Product bulk import failed:', error);
    return NextResponse.json({ error: 'Bulk import failed' }, { status: 500 });
  }
}
