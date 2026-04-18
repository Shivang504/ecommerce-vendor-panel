import { NextResponse } from 'next/server';

/** Razorpay IFSC open dataset (MIT) — bank code → display name */
const BANKNAMES_JSON =
  'https://raw.githubusercontent.com/razorpay/ifsc/master/src/banknames.json';

export async function GET() {
  try {
    const res = await fetch(BANKNAMES_JSON, {
      next: { revalidate: 86_400 },
    });
    if (!res.ok) {
      return NextResponse.json(
        { banks: [], error: `Upstream returned ${res.status}` },
        { status: 502 }
      );
    }
    const data = (await res.json()) as Record<string, string>;
    const unique = new Set<string>();
    for (const name of Object.values(data)) {
      const t = typeof name === 'string' ? name.trim() : '';
      if (t) unique.add(t);
    }
    const banks = [...unique].sort((a, b) => a.localeCompare(b, 'en-IN'));
    return NextResponse.json(
      { banks },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200',
        },
      }
    );
  } catch {
    return NextResponse.json(
      { banks: [], error: 'Failed to load bank list' },
      { status: 502 }
    );
  }
}
