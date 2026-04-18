import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getUserFromRequest } from '@/lib/auth';
import { getAllWarehouses, createOrUpdateWarehouse } from '@/lib/models/warehouse';

// GET - Get all warehouses
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
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || undefined;
    const isActive = searchParams.get('isActive') === 'true' ? true : searchParams.get('isActive') === 'false' ? false : undefined;

    const result = await getAllWarehouses(page, limit, search, isActive);

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch warehouses' },
      { status: 500 }
    );
  }
}

// POST - Create warehouse
export async function POST(request: NextRequest) {
  try {
    const admin = getUserFromRequest(request);
    if (!admin || (admin.role !== 'admin' && admin.role !== 'superadmin')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.pincode || !body.address || !body.city || !body.state) {
      return NextResponse.json(
        { error: 'Name, pincode, address, city, and state are required' },
        { status: 400 }
      );
    }

    const warehouse = await createOrUpdateWarehouse({
      name: body.name,
      code: body.code || '',
      pincode: body.pincode,
      address: body.address,
      city: body.city,
      state: body.state,
      district: body.district || '',
      country: body.country || 'India',
      contactPerson: body.contactPerson || '',
      phone: body.phone || '',
      email: body.email || '',
      isDefault: body.isDefault || false,
      isActive: body.isActive !== undefined ? body.isActive : true,
    });

    return NextResponse.json({
      success: true,
      warehouse,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create warehouse' },
      { status: 500 }
    );
  }
}

