import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getAllTickets, getTicketStats } from '@/lib/models/support-ticket';

// GET - Get all tickets (admin)
export async function GET(request: NextRequest) {
  try {
    const admin = getUserFromRequest(request);
    if (!admin || (admin.role !== 'admin' && admin.role !== 'superadmin')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status') as any;
    const priority = searchParams.get('priority') as any;
    const category = searchParams.get('category') as any;
    const assignedTo = searchParams.get('assignedTo') || undefined;
    const search = searchParams.get('search') || undefined;

    const result = await getAllTickets(
      { status, priority, category, assignedTo, search },
      page,
      limit
    );

    // Get stats if requested
    const includeStats = searchParams.get('stats') === 'true';
    let stats = null;
    if (includeStats) {
      stats = await getTicketStats();
    }

    return NextResponse.json({
      success: true,
      tickets: result.tickets,
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
      ...(stats && { stats }),
    });
  } catch (error: any) {
    console.error('[Admin Support API] Error fetching tickets:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch tickets' },
      { status: 500 }
    );
  }
}

