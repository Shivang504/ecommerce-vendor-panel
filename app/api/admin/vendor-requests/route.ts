import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, isAdmin, isVendor } from '@/lib/auth';
import { getVendorById } from '@/lib/models/vendor';
import {
  createVendorAdminRequest,
  listVendorAdminRequests,
  type VendorAdminRequestStatus,
  type VendorAdminRequestType,
} from '@/lib/models/vendor-admin-request';
import { createNotification } from '@/lib/models/notification';

const REQUEST_TYPES: VendorAdminRequestType[] = [
  'new_category_catalog',
  'new_subcategory',
  'new_child_category',
  'new_brand',
  'catalog_change',
  'other',
];

function isValidRequestType(v: unknown): v is VendorAdminRequestType {
  return typeof v === 'string' && REQUEST_TYPES.includes(v as VendorAdminRequestType);
}

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10) || 1;
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10) || 20, 100);
    const status = searchParams.get('status') as VendorAdminRequestStatus | null;

    const allowedStatus: VendorAdminRequestStatus[] = ['open', 'in_review', 'completed', 'declined'];
    const statusFilter =
      status && allowedStatus.includes(status) ? (status as VendorAdminRequestStatus) : undefined;

    if (isVendor(user)) {
      const { items, total } = await listVendorAdminRequests({
        vendorId: user.id,
        status: statusFilter,
        page,
        limit,
      });
      return NextResponse.json({ requests: items, total, page, limit });
    }

    if (isAdmin(user)) {
      const { items, total } = await listVendorAdminRequests({
        status: statusFilter,
        page,
        limit,
      });
      return NextResponse.json({ requests: items, total, page, limit });
    }

    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  } catch (error: unknown) {
    console.error('[vendor-requests GET]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load requests' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user || !isVendor(user)) {
      return NextResponse.json({ error: 'Only vendors can submit requests' }, { status: 403 });
    }

    const body = await request.json();
    const { requestType, subject, message } = body || {};

    if (!isValidRequestType(requestType)) {
      return NextResponse.json({ error: 'Invalid request type' }, { status: 400 });
    }
    if (typeof subject !== 'string' || subject.trim().length < 3 || subject.trim().length > 200) {
      return NextResponse.json(
        { error: 'Subject must be between 3 and 200 characters' },
        { status: 400 }
      );
    }
    if (typeof message !== 'string' || message.trim().length < 10 || message.trim().length > 8000) {
      return NextResponse.json(
        { error: 'Message must be between 10 and 8000 characters' },
        { status: 400 }
      );
    }

    const vendor = await getVendorById(user.id);
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor profile not found' }, { status: 404 });
    }

    const id = await createVendorAdminRequest({
      vendorId: user.id,
      vendorEmail: typeof vendor.email === 'string' ? vendor.email : undefined,
      vendorStoreName: (vendor.storeName as string) || (vendor.ownerName as string) || undefined,
      requestType,
      subject,
      message,
    });

    try {
      await createNotification({
        type: 'vendor_admin_request',
        title: 'New vendor request',
        message: `${vendor.storeName || vendor.ownerName || 'Vendor'}: ${subject.trim().slice(0, 120)}`,
        isRead: false,
        metadata: {
          requestId: id,
          vendorId: user.id,
          vendorStoreName: vendor.storeName || vendor.ownerName,
        },
      });
    } catch (e) {
      console.error('[vendor-requests POST] notification', e);
    }

    return NextResponse.json({ success: true, id }, { status: 201 });
  } catch (error: unknown) {
    console.error('[vendor-requests POST]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to submit request' },
      { status: 500 }
    );
  }
}
