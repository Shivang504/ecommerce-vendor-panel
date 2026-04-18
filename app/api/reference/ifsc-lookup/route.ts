import { NextRequest, NextResponse } from 'next/server';

/** Public IFSC metadata (Razorpay community API, no key). */
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('ifsc')?.trim().toUpperCase().replace(/\s/g, '') ?? '';
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(raw)) {
    return NextResponse.json({ error: 'Invalid IFSC format' }, { status: 400 });
  }

  try {
    const res = await fetch(`https://ifsc.razorpay.com/${raw}`, {
      next: { revalidate: 604_800 },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: res.status === 404 ? 'IFSC not found' : 'Lookup failed' },
        { status: res.status === 404 ? 404 : 502 }
      );
    }
    const data = await res.json();
    if (!data?.BANK || !data?.IFSC) {
      return NextResponse.json({ error: 'Invalid lookup response' }, { status: 502 });
    }
    return NextResponse.json(
      {
        ifsc: data.IFSC as string,
        bank: data.BANK as string,
        bankcode: data.BANKCODE as string,
        branch: (data.BRANCH as string) || '',
        city: (data.CITY as string) || '',
        state: (data.STATE as string) || '',
        address: (data.ADDRESS as string) || '',
      },
      {
        headers: { 'Cache-Control': 'public, s-maxage=604800, stale-while-revalidate=86400' },
      }
    );
  } catch {
    return NextResponse.json({ error: 'IFSC lookup failed' }, { status: 502 });
  }
}
