import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId, Filter } from 'mongodb';

export type VendorAdminRequestType =
  | 'new_category_catalog'
  | 'new_subcategory'
  | 'new_child_category'
  | 'new_brand'
  | 'catalog_change'
  | 'other';

export type VendorAdminRequestStatus = 'open' | 'in_review' | 'completed' | 'declined';

export interface VendorAdminRequestDoc {
  _id?: ObjectId;
  vendorId: string;
  vendorEmail?: string;
  vendorStoreName?: string;
  requestType: VendorAdminRequestType;
  subject: string;
  message: string;
  status: VendorAdminRequestStatus;
  adminNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const COLLECTION = 'vendor_admin_requests';

function serialize(doc: VendorAdminRequestDoc & { _id: ObjectId }) {
  return {
    ...doc,
    _id: doc._id.toString(),
  };
}

export async function createVendorAdminRequest(data: {
  vendorId: string;
  vendorEmail?: string;
  vendorStoreName?: string;
  requestType: VendorAdminRequestType;
  subject: string;
  message: string;
}): Promise<string> {
  const { db } = await connectToDatabase();
  const now = new Date();
  const doc: VendorAdminRequestDoc = {
    vendorId: data.vendorId,
    vendorEmail: data.vendorEmail,
    vendorStoreName: data.vendorStoreName,
    requestType: data.requestType,
    subject: data.subject.trim(),
    message: data.message.trim(),
    status: 'open',
    createdAt: now,
    updatedAt: now,
  };
  const result = await db.collection(COLLECTION).insertOne(doc);
  return result.insertedId.toString();
}

export async function listVendorAdminRequests(options: {
  vendorId?: string;
  status?: VendorAdminRequestStatus;
  page: number;
  limit: number;
}): Promise<{ items: ReturnType<typeof serialize>[]; total: number }> {
  const { db } = await connectToDatabase();
  const filter: Filter<VendorAdminRequestDoc> = {};
  if (options.vendorId) {
    filter.vendorId = options.vendorId;
  }
  if (options.status) {
    filter.status = options.status;
  }
  const skip = (Math.max(1, options.page) - 1) * options.limit;
  const col = db.collection<VendorAdminRequestDoc>(COLLECTION);
  const [items, total] = await Promise.all([
    col.find(filter).sort({ createdAt: -1 }).skip(skip).limit(options.limit).toArray(),
    col.countDocuments(filter),
  ]);
  return {
    items: items.map(d => serialize(d as VendorAdminRequestDoc & { _id: ObjectId })),
    total,
  };
}

export async function getVendorAdminRequestById(id: string): Promise<ReturnType<typeof serialize> | null> {
  if (!ObjectId.isValid(id)) return null;
  const { db } = await connectToDatabase();
  const doc = await db.collection<VendorAdminRequestDoc>(COLLECTION).findOne({ _id: new ObjectId(id) });
  if (!doc?._id) return null;
  return serialize(doc as VendorAdminRequestDoc & { _id: ObjectId });
}

export async function updateVendorAdminRequestById(
  id: string,
  updates: { status?: VendorAdminRequestStatus; adminNotes?: string }
): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const { db } = await connectToDatabase();
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (updates.status !== undefined) set.status = updates.status;
  if (updates.adminNotes !== undefined) set.adminNotes = updates.adminNotes.trim();
  const result = await db.collection(COLLECTION).updateOne({ _id: new ObjectId(id) }, { $set: set });
  return result.modifiedCount > 0 || result.matchedCount > 0;
}
