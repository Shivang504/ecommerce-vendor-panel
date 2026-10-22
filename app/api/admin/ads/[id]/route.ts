import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, isVendor } from '@/lib/auth';
import { cancelVendorBooking } from '@/lib/ads';

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = getUserFromRequest(request);
    if (!user || !isVendor(user)) return NextResponse.json({ error: 'Vendor login required' }, { status: 401 });
    const { id } = await context.params;
    await cancelVendorBooking(user.id, id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Cancel failed' }, { status: 400 });
  }
}
