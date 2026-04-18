import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { getUserFromRequest } from '@/lib/auth';
import { getWarehouseById, createOrUpdateWarehouse, deleteWarehouse } from '@/lib/models/warehouse';

// GET - Get single warehouse
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = getUserFromRequest(request);
    if (!admin || (admin.role !== 'admin' && admin.role !== 'superadmin')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const warehouse = await getWarehouseById(id);

    if (!warehouse) {
      return NextResponse.json(
        { error: 'Warehouse not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      warehouse,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch warehouse' },
      { status: 500 }
    );
  }
}

// PUT - Update warehouse
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = getUserFromRequest(request);
    if (!admin || (admin.role !== 'admin' && admin.role !== 'superadmin')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Validate warehouse ID format
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid warehouse ID format' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!body.name || !body.pincode || !body.address || !body.city || !body.state) {
      return NextResponse.json(
        { error: 'Name, pincode, address, city, and state are required' },
        { status: 400 }
      );
    }

    // Check if warehouse exists before updating
    const existingWarehouse = await getWarehouseById(id);
    if (!existingWarehouse) {
      return NextResponse.json(
        { error: 'Warehouse not found' },
        { status: 404 }
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
    }, id);

    // Serialize warehouse properly, converting dates to ISO strings
    const serializedWarehouse = {
      _id: warehouse._id?.toString() || id,
      name: warehouse.name,
      code: warehouse.code || '',
      pincode: warehouse.pincode,
      address: warehouse.address,
      city: warehouse.city,
      state: warehouse.state,
      district: warehouse.district || '',
      country: warehouse.country || 'India',
      contactPerson: warehouse.contactPerson || '',
      phone: warehouse.phone || '',
      email: warehouse.email || '',
      isDefault: warehouse.isDefault || false,
      isActive: warehouse.isActive !== undefined ? warehouse.isActive : true,
      createdAt: warehouse.createdAt instanceof Date 
        ? warehouse.createdAt.toISOString() 
        : (warehouse.createdAt ? new Date(warehouse.createdAt).toISOString() : new Date().toISOString()),
      updatedAt: warehouse.updatedAt instanceof Date 
        ? warehouse.updatedAt.toISOString() 
        : (warehouse.updatedAt ? new Date(warehouse.updatedAt).toISOString() : new Date().toISOString()),
    };

    return NextResponse.json({
      success: true,
      warehouse: serializedWarehouse,
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { 
        error: error.message || 'Failed to update warehouse',
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete warehouse
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = getUserFromRequest(request);
    if (!admin || (admin.role !== 'admin' && admin.role !== 'superadmin')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    await deleteWarehouse(id);

    return NextResponse.json({
      success: true,
      message: 'Warehouse deleted successfully',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete warehouse' },
      { status: 500 }
    );
  }
}

