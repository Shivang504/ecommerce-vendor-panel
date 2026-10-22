import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, isVendor } from '@/lib/auth';
import { createBooking, getVendorAdWallet, indiaToday, listPlacements, listVendorBookings } from '@/lib/ads';

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user || !isVendor(user)) return NextResponse.json({ error: 'Vendor login required' }, { status: 401 });
    const [placements, bookings, wallet] = await Promise.all([
      listPlacements(true),
      listVendorBookings(user.id),
      getVendorAdWallet(user.id),
    ]);
    return NextResponse.json({ placements, bookings, wallet, today: indiaToday() });
  } catch (error: any) {
    console.error('[Vendor Ads] List failed:', error);
    return NextResponse.json({ error: error?.message || 'Failed to load ads' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user || !isVendor(user)) return NextResponse.json({ error: 'Vendor login required' }, { status: 401 });
    const body = await request.json();
    const id = await createBooking(user.id, {
      placementKey: String(body.placementKey || ''),
      productId: body.productId ? String(body.productId) : undefined,
      bannerImage: body.bannerImage ? String(body.bannerImage) : undefined,
      bannerTitle: body.bannerTitle ? String(body.bannerTitle) : undefined,
      bannerLink: body.bannerLink ? String(body.bannerLink) : undefined,
      startDate: String(body.startDate || ''),
      days: Number(body.days || 0),
      paymentMethod: body.paymentMethod === 'wallet' ? 'wallet' : 'offline',
    });
    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Booking failed' }, { status: 400 });
  }
}
