import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getUserFromRequest } from '@/lib/auth';
import { parseDashboardMonth } from '@/lib/dashboard-month';
import { getDashboardAnalytics } from '@/lib/dashboard-data';
import { generateDashboardReportHTML, renderDashboardPdf } from '@/lib/dashboard-pdf';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const currentUser = getUserFromRequest(request);
    const { searchParams } = new URL(request.url);

    const monthRange = parseDashboardMonth(
      searchParams.get('year'),
      searchParams.get('month')
    );

    const [data, settings] = await Promise.all([
      getDashboardAnalytics(db, currentUser, monthRange),
      db.collection('settings').findOne({}),
    ]);

    const siteName = (settings?.siteName as string)?.trim() || 'E-commerce Dashboard';
    const html = generateDashboardReportHTML(data, siteName);
    const pdfBuffer = await renderDashboardPdf(html);

    const filename = `dashboard-${monthRange.year}-${String(monthRange.month).padStart(2, '0')}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Dashboard Export] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate dashboard PDF', detail: message },
      { status: 500 }
    );
  }
}
