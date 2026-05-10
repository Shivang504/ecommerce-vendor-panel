import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getUserFromRequest, isAdmin, isVendor } from '@/lib/auth';
import {
  createVendorAdminRequest,
  listAllVendorAdminRequests,
  listVendorAdminRequestsForVendor,
  type VendorAdminRequest,
  type VendorAdminRequestType,
} from '@/lib/models/vendor-admin-request';
import { getVendorById } from '@/lib/models/vendor';
import { createNotification } from '@/lib/models/notification';

const ALLOWED_TYPES: VendorAdminRequestType[] = [
  'new_catalogue_category',
  'brand_or_tag',
  'listing_merchandising',
  'account_billing',
  'technical',
  'other',
];

function serializeRequest(doc: VendorAdminRequest & { _id: ObjectId }) {
  return {
    _id: doc._id.toString(),
    vendorId: doc.vendorId && typeof doc.vendorId === 'object' && 'toString' in doc.vendorId ? doc.vendorId.toString() : String(doc.vendorId),
    vendorName: doc.vendorName,
    vendorEmail: doc.vendorEmail,
    requestType: doc.requestType,
    subject: doc.subject,
    message: doc.message,
    status: doc.status,
    adminReply: doc.adminReply,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : doc.updatedAt,
    updatedBy:
      doc.updatedBy && typeof doc.updatedBy === 'object' && 'toString' in doc.updatedBy
        ? doc.updatedBy.toString()
        : doc.updatedBy
          ? String(doc.updatedBy)
          : undefined,
  };
}

/** GET: vendors see their requests; admins see all (optional filters). */
export async function GET(request: NextRequest) {
  try {
    const currentUser = getUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (isVendor(currentUser)) {
      const rows = await listVendorAdminRequestsForVendor(currentUser.id);
      return NextResponse.json({
        requests: rows.map(r => serializeRequest(r as VendorAdminRequest & { _id: ObjectId })),
      });
    }

    if (isAdmin(currentUser)) {
      const { searchParams } = new URL(request.url);
      const status = searchParams.get('status') as VendorAdminRequest['status'] | null;
      const vendorId = searchParams.get('vendorId') || undefined;
      const filters: { status?: VendorAdminRequest['status']; vendorId?: string } = {};
      if (status && ['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
        filters.status = status;
      }
      if (vendorId && ObjectId.isValid(vendorId)) filters.vendorId = vendorId;
      const rows = await listAllVendorAdminRequests(filters);
      return NextResponse.json({
        requests: rows.map(r => serializeRequest(r as VendorAdminRequest & { _id: ObjectId })),
      });
    }

    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  } catch (error: unknown) {
    console.error('[vendor-requests GET]', error);
    return NextResponse.json({ error: 'Failed to load requests' }, { status: 500 });
  }
}

/** POST: vendor creates a request. */
export async function POST(request: NextRequest) {
  try {
    const currentUser = getUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!isVendor(currentUser)) {
      return NextResponse.json({ error: 'Only vendors can create requests' }, { status: 403 });
    }

    const vendor = await getVendorById(currentUser.id);
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    const body = await request.json();
    const requestType = body.requestType as VendorAdminRequestType;
    const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
    const message = typeof body.message === 'string' ? body.message.trim() : '';

    if (!ALLOWED_TYPES.includes(requestType)) {
      return NextResponse.json({ error: 'Invalid request type' }, { status: 400 });
    }
    if (subject.length < 3 || subject.length > 200) {
      return NextResponse.json({ error: 'Subject must be between 3 and 200 characters' }, { status: 400 });
    }
    if (message.length < 10 || message.length > 8000) {
      return NextResponse.json({ error: 'Message must be between 10 and 8000 characters' }, { status: 400 });
    }

    const insertedId = await createVendorAdminRequest({
      vendorId: currentUser.id,
      vendorName: (vendor.storeName as string) || (vendor.ownerName as string) || '',
      vendorEmail: (vendor.email as string) || '',
      requestType,
      subject,
      message,
    });

    try {
      await createNotification({
        type: 'vendor_admin_request',
        title: 'New vendor request',
        message: `${vendor.storeName || vendor.ownerName}: ${subject}`,
        metadata: {
          requestId: insertedId.toString(),
          vendorId: currentUser.id,
          requestType,
        },
      });
    } catch (e) {
      console.error('[vendor-requests POST] notification', e);
    }

    return NextResponse.json(
      {
        success: true,
        id: insertedId.toString(),
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('[vendor-requests POST]', error);
    return NextResponse.json({ error: 'Failed to submit request' }, { status: 500 });
  }
}
