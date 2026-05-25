import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getUserFromRequest } from '@/lib/auth';
import { parseDashboardMonth } from '@/lib/dashboard-month';
import { getDashboardAnalytics } from '@/lib/dashboard-data';

export const revalidate = 60;

export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const currentUser = getUserFromRequest(request);
    const { searchParams } = new URL(request.url);

    const monthRange = parseDashboardMonth(
      searchParams.get('year'),
      searchParams.get('month')
    );

    const data = await getDashboardAnalytics(db, currentUser, monthRange);

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Dashboard API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch dashboard data',
        detail: message,
        stats: {
          totalOrders: { value: '0', change: '0%', trend: 'up' },
          pendingOrders: { value: '0', change: '0%', trend: 'up' },
          cancelledOrders: { value: '0', change: '0%', trend: 'up' },
          returnedItems: { value: '0', change: '0%', trend: 'up' },
        },
        revenueData: [],
        categoryDistribution: [],
        topProducts: [],
        recentOrders: [],
        topDeals: [],
        summary: { totalProducts: 0, totalCustomers: 0, totalVendors: 0, totalOrders: 0 },
      },
      { status: 500 }
    );
  }
}
