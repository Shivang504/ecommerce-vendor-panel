import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, isAdmin } from '@/lib/auth';
import {
  getVendorAdminRequestById,
  updateVendorAdminRequestById,
  type VendorAdminRequestStatus,
} from '@/lib/models/vendor-admin-request';

const ALLOWED_STATUS: VendorAdminRequestStatus[] = ['open', 'in_review', 'completed', 'declined'];

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = getUserFromRequest(request);
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await context.params;
    const existing = await getVendorAdminRequestById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    const body = await request.json();
    const { status, adminNotes } = body || {};

    const updates: { status?: VendorAdminRequestStatus; adminNotes?: string } = {};
    if (status !== undefined) {
      if (typeof status !== 'string' || !ALLOWED_STATUS.includes(status as VendorAdminRequestStatus)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      updates.status = status as VendorAdminRequestStatus;
    }
    if (adminNotes !== undefined) {
      if (typeof adminNotes !== 'string' || adminNotes.length > 4000) {
        return NextResponse.json({ error: 'Admin notes must be at most 4000 characters' }, { status: 400 });
      }
      updates.adminNotes = adminNotes;
    }

    if (updates.status === undefined && updates.adminNotes === undefined) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    await updateVendorAdminRequestById(id, updates);
    const updated = await getVendorAdminRequestById(id);
    return NextResponse.json({ success: true, request: updated });
  } catch (error: unknown) {
    console.error('[vendor-requests PATCH]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update request' },
      { status: 500 }
    );
  }
}
