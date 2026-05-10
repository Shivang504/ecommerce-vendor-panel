import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export type VendorAdminRequestType =
  | 'new_catalogue_category'
  | 'brand_or_tag'
  | 'listing_merchandising'
  | 'account_billing'
  | 'technical'
  | 'other';

export type VendorAdminRequestStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface VendorAdminRequest {
  _id?: string | ObjectId;
  vendorId: string | ObjectId;
  vendorName?: string;
  vendorEmail?: string;
  requestType: VendorAdminRequestType;
  subject: string;
  message: string;
  status: VendorAdminRequestStatus;
  adminReply?: string;
  createdAt: Date;
  updatedAt: Date;
  updatedBy?: string | ObjectId;
}

export async function createVendorAdminRequest(
  data: Omit<VendorAdminRequest, '_id' | 'createdAt' | 'updatedAt' | 'status' | 'adminReply' | 'updatedBy'>
) {
  const { db } = await connectToDatabase();
  const now = new Date();
  const doc = {
    ...data,
    vendorId: typeof data.vendorId === 'string' ? new ObjectId(data.vendorId) : data.vendorId,
    status: 'open' as VendorAdminRequestStatus,
    createdAt: now,
    updatedAt: now,
  };
  const result = await db.collection('vendor_admin_requests').insertOne(doc);
  return result.insertedId;
}

export async function listVendorAdminRequestsForVendor(vendorId: string) {
  const { db } = await connectToDatabase();
  return db
    .collection('vendor_admin_requests')
    .find({ vendorId: new ObjectId(vendorId) })
    .sort({ createdAt: -1 })
    .toArray() as Promise<VendorAdminRequest[]>;
}

export async function listAllVendorAdminRequests(filters?: {
  status?: VendorAdminRequestStatus;
  vendorId?: string;
}) {
  const { db } = await connectToDatabase();
  const query: Record<string, unknown> = {};
  if (filters?.status) query.status = filters.status;
  if (filters?.vendorId) query.vendorId = new ObjectId(filters.vendorId);
  return db
    .collection('vendor_admin_requests')
    .find(query)
    .sort({ createdAt: -1 })
    .toArray() as Promise<VendorAdminRequest[]>;
}

export async function getVendorAdminRequestById(id: string) {
  const { db } = await connectToDatabase();
  try {
    return (await db.collection('vendor_admin_requests').findOne({ _id: new ObjectId(id) })) as VendorAdminRequest | null;
  } catch {
    return null;
  }
}

export async function updateVendorAdminRequestByAdmin(
  id: string,
  updates: {
    status?: VendorAdminRequestStatus;
    adminReply?: string;
    updatedBy: string;
  }
) {
  const { db } = await connectToDatabase();
  const $set: Record<string, unknown> = { updatedAt: new Date() };
  if (updates.status !== undefined) $set.status = updates.status;
  if (updates.adminReply !== undefined) $set.adminReply = updates.adminReply;
  if (updates.updatedBy) $set.updatedBy = new ObjectId(updates.updatedBy);

  const result = await db.collection('vendor_admin_requests').findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set },
    { returnDocument: 'after' }
  );
  return result?.value as VendorAdminRequest | null;
}
