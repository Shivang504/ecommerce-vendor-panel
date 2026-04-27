import type { Db } from 'mongodb';
import { ObjectId } from 'mongodb';

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function asIdString(v: unknown): string {
  if (v == null || v === '') return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'object' && v !== null && 'toString' in v) {
    return (v as { toString: () => string }).toString().trim();
  }
  return String(v).trim();
}

/**
 * Ensures vendor product payloads only reference existing catalog rows
 * (brands + category hierarchy). Call for vendor role on create/update.
 */
export async function assertVendorCatalogSelections(db: Db, body: Record<string, unknown>): Promise<string | null> {
  const brand = typeof body.brand === 'string' ? body.brand.trim() : '';
  if (brand) {
    const found = await db.collection('brands').findOne({
      name: { $regex: new RegExp(`^${escapeRegex(brand)}$`, 'i') },
      status: { $ne: 'inactive' },
    });
    if (!found) {
      return 'Invalid brand. Choose a brand from the list created by the store admin.';
    }
  }

  const childId = asIdString(body.childCategoryId ?? body.childCategory);
  const subId = asIdString(body.subcategoryId ?? body.subcategory);
  const mainId = asIdString(body.categoryId ?? body.category);

  const notInactive = { status: { $nin: ['inactive', 'Inactive'] } };

  if (childId && ObjectId.isValid(childId)) {
    const doc = await db.collection('childcategories').findOne({ _id: new ObjectId(childId), ...notInactive });
    if (!doc) {
      return 'Invalid category. Choose a category / subcategory / child category from the admin catalog.';
    }
    return null;
  }

  if (subId && ObjectId.isValid(subId)) {
    const doc = await db.collection('subcategories').findOne({ _id: new ObjectId(subId), ...notInactive });
    if (!doc) {
      return 'Invalid category. Choose a category / subcategory / child category from the admin catalog.';
    }
    return null;
  }

  if (mainId && ObjectId.isValid(mainId)) {
    const doc = await db.collection('categories').findOne({ _id: new ObjectId(mainId), ...notInactive });
    if (!doc) {
      return 'Invalid category. Choose a category / subcategory / child category from the admin catalog.';
    }
    return null;
  }

  if (!mainId && !subId && !childId) {
    return 'Category is required.';
  }

  return 'Invalid category selection.';
}
