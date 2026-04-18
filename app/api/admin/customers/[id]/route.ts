import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    if (!ObjectId.isValid(id)) {
      return Response.json({ error: 'Invalid customer ID' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    
    const customer = await db.collection('customers').findOne({ _id: new ObjectId(id) });

    if (!customer) {
      return Response.json({ error: 'Customer not found' }, { status: 404 });
    }

    return Response.json({
      _id: customer._id.toString(),
      ...customer,
    });
  } catch (error) {
    console.error('[v0] Failed to fetch customer:', error);
    return Response.json({ error: 'Failed to fetch customer' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    if (!ObjectId.isValid(id)) {
      return Response.json({ error: 'Invalid customer ID' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    
    // Check if customer exists
    const existingCustomer = await db.collection('customers').findOne({ _id: new ObjectId(id) });
    
    if (!existingCustomer) {
      return Response.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Remove fields that shouldn't be updated
    const { _id, createdAt, orders, spent, registrationDate, ...updateData } = body;
    
    // Update customer
    await db.collection('customers').updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: {
          ...updateData,
          updatedAt: new Date(),
        }
      }
    );

    // Fetch updated customer
    const updatedCustomer = await db.collection('customers').findOne({ _id: new ObjectId(id) });

    return Response.json({
      _id: updatedCustomer!._id.toString(),
      ...updatedCustomer,
    });
  } catch (error) {
    console.error('[v0] Failed to update customer:', error);
    return Response.json({ error: 'Failed to update customer', details: error }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    if (!ObjectId.isValid(id)) {
      return Response.json({ error: 'Invalid customer ID' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    
    const result = await db.collection('customers').deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return Response.json({ error: 'Customer not found' }, { status: 404 });
    }

    return Response.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('[v0] Failed to delete customer:', error);
    return Response.json({ error: 'Failed to delete customer' }, { status: 500 });
  }
}
