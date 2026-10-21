import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, isVendor } from '@/lib/auth';
import { getBusinessReports } from '@/lib/reports';

function todayKey(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin' && user.role !== 'vendor')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const from = request.nextUrl.searchParams.get('from') || todayKey(-29);
    const to = request.nextUrl.searchParams.get('to') || todayKey(0);
    const report = await getBusinessReports({
      from,
      to,
      vendorId: isVendor(user) ? user.id : undefined,
    });
    return NextResponse.json(report);
  } catch (error: any) {
    console.error('[Reports]', error);
    return NextResponse.json({ error: error?.message || 'Failed to load reports' }, { status: 500 });
  }
}
