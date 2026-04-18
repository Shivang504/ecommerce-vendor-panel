import { NextRequest, NextResponse } from 'next/server';
import { getActiveWarehouses } from '@/lib/models/warehouse';

// GET - Get all active warehouses (public endpoint for dropdowns)
export async function GET(request: NextRequest) {
  try {
    const warehouses = await getActiveWarehouses();

    return NextResponse.json({
      success: true,
      warehouses,
    });
  } catch (error: any) {
    console.error('[Warehouse API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch warehouses' },
      { status: 500 }
    );
  }
}

