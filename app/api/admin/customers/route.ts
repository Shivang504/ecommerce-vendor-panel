import { connectToDatabase } from '@/lib/mongodb';
import { getUserFromRequest, isVendor } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    // Get current user from token
    const currentUser = getUserFromRequest(request as any);
    
    // Allow access if no user (for development) or if admin/superadmin
    // Only block vendors
    if (currentUser && isVendor(currentUser)) {
      return Response.json({ error: 'Access denied. Vendors cannot access customer data.' }, { status: 403 });
    }
    
    // For now, allow access even without auth for development
    // In production, uncomment below lines:
    // if (currentUser && currentUser.role !== 'admin' && currentUser.role !== 'superadmin') {
    //   return Response.json({ error: 'Access denied. Admin authentication required.' }, { status: 403 });
    // }
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const { db } = await connectToDatabase();
    
    const filter: any = {};
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }
    
    if (status && status !== 'all') {
      filter.status = status;
    }

    const customers = await db
      .collection('customers')
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    const formattedCustomers = customers.map(customer => ({
      _id: customer._id.toString(),
      name: customer.name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      orders: customer.orders || 0,
      spent: customer.spent || 0,
      status: customer.status || 'active',
      registrationDate: customer.registrationDate || customer.createdAt ? new Date(customer.createdAt).toISOString().split('T')[0] : '',
      emailVerified: customer.emailVerified || false,
      ...customer,
    }));

    return Response.json({
      customers: formattedCustomers,
      total: formattedCustomers.length,
    });
  } catch (error) {
    console.error('[v0] Failed to fetch customers:', error);
    return Response.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // Get current user from token
    const currentUser = getUserFromRequest(request as any);
    
    // Vendors cannot create customers
    if (currentUser && isVendor(currentUser)) {
      return Response.json({ error: 'Access denied' }, { status: 403 });
    }
    
    const body = await request.json();
    
    const { db } = await connectToDatabase();
    
    const newCustomer = {
      ...body,
      orders: 0,
      spent: 0,
      registrationDate: new Date().toISOString().split('T')[0],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('customers').insertOne(newCustomer);
    
    return Response.json({ 
      _id: result.insertedId.toString(),
      ...newCustomer 
    }, { status: 201 });
  } catch (error) {
    console.error('[v0] Failed to create customer:', error);
    return Response.json({ error: 'Failed to create customer' }, { status: 500 });
  }
}
