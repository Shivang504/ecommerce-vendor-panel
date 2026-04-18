import { NextRequest, NextResponse } from 'next/server';

/** Proxies api.postalpincode.in (public India PIN directory, no API key). */
export async function GET(req: NextRequest) {
  const pincode =
    req.nextUrl.searchParams.get('pincode')?.replace(/\D/g, '').slice(0, 6) ?? '';
  if (!/^\d{6}$/.test(pincode)) {
    return NextResponse.json({ error: 'Enter a valid 6-digit PIN code' }, { status: 400 });
  }

  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`, {
      next: { revalidate: 604_800 },
    });
    if (!res.ok) {
      return NextResponse.json({ error: 'PIN lookup service unavailable' }, { status: 502 });
    }
    const raw = await res.json();
    const root = Array.isArray(raw) ? raw[0] : raw;
    if (
      !root ||
      root.Status !== 'Success' ||
      !Array.isArray(root.PostOffice) ||
      root.PostOffice.length === 0
    ) {
      const msg =
        typeof root?.Message === 'string' ? root.Message : 'PIN code not found';
      return NextResponse.json({ error: msg }, { status: 404 });
    }

    const postOffices = root.PostOffice.map((po: Record<string, unknown>) => ({
      name: String(po.Name ?? '').trim(),
      district: String(po.District ?? '').trim(),
      state: String(po.State ?? '').trim(),
    })).filter((o: { name: string }) => o.name.length > 0);

    if (postOffices.length === 0) {
      return NextResponse.json({ error: 'No post office data for this PIN' }, { status: 404 });
    }

    return NextResponse.json(
      { pincode, postOffices },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=604800, stale-while-revalidate=86400',
        },
      }
    );
  } catch {
    return NextResponse.json({ error: 'PIN lookup failed' }, { status: 502 });
  }
}
