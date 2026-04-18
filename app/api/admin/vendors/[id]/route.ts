import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { hashVendorPassword } from '@/lib/models/vendor';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    console.log('[v0] Fetching vendor with ID:', id);
    
    const { db } = await connectToDatabase();
    const vendor = await db.collection('vendors').findOne({ _id: new ObjectId(id) });

    if (!vendor) {
      console.log('[v0] Vendor not found');
      return Response.json({ error: 'Vendor not found' }, { status: 404 });
    }

    // Remove password from response for security
    const { password, ...vendorWithoutPassword } = vendor;

    console.log('[v0] Vendor found:', vendor.storeName);
    return Response.json({ 
      vendor: {
        ...vendorWithoutPassword,
        _id: vendor._id.toString()
      }
    });
  } catch (error) {
    console.error('[v0] Error fetching vendor:', error);
    return Response.json({ error: 'Failed to fetch vendor' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    console.log('[v0] Updating vendor:', id);
    console.log('[v0] Update data:', body);
    
    const { _id, createdAt, updatedAt, ...dataToUpdate } = body;
    
    // Hash the password if it's being updated
    if (dataToUpdate.password) {
      dataToUpdate.password = await hashVendorPassword(dataToUpdate.password);
    }
    
    const { db } = await connectToDatabase();
    
    const existingVendor = await db.collection('vendors').findOne({ _id: new ObjectId(id) });
    
    if (!existingVendor) {
      console.log('[v0] Vendor not found for update');
      return Response.json({ error: 'Vendor not found' }, { status: 404 });
    }
    
    const result = await db.collection('vendors').updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          ...dataToUpdate, 
          updatedAt: new Date() 
        } 
      }
    );

    if (result.matchedCount === 0) {
      console.log('[v0] Vendor not found during update');
      return Response.json({ error: 'Vendor not found' }, { status: 404 });
    }
    
    const updatedVendor = await db.collection('vendors').findOne({ _id: new ObjectId(id) });

    // Remove password from response for security
    const { password, ...vendorWithoutPassword } = updatedVendor as any;

    console.log('[v0] Vendor updated successfully');
    return Response.json({
      ...vendorWithoutPassword,
      _id: updatedVendor!._id.toString()
    });
  } catch (error) {
    console.error('[v0] Error updating vendor:', error);
    return Response.json({ 
      error: 'Failed to update vendor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    console.log('[v0] Deleting vendor:', id);
    
    const { db } = await connectToDatabase();
    
    const result = await db.collection('vendors').deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      console.log('[v0] Vendor not found for deletion');
      return Response.json({ error: 'Vendor not found' }, { status: 404 });
    }

    console.log('[v0] Vendor deleted successfully');
    return Response.json({ message: 'Vendor deleted' });
  } catch (error) {
    console.error('[v0] Error deleting vendor:', error);
    return Response.json({ error: 'Failed to delete vendor' }, { status: 500 });
  }
}
