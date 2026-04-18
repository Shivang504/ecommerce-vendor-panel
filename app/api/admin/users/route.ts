import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { verifyPassword } from '@/lib/models/admin';
import { getUserFromRequest, isAdmin, isVendor } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const currentUser = getUserFromRequest(request);
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Allow both admin and vendor access
    if (!isAdmin(currentUser) && !isVendor(currentUser)) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const { db } = await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    let query: any = {};

    // Each admin/vendor can only see their own employees (users they created)
    // Superadmin can see all users except other superadmins
    if (currentUser.role === 'superadmin') {
      query.role = { $ne: 'superadmin' }; // Superadmin can see all except other superadmins
    } else {
      // Admin/Vendor can only see users they created (their employees)
      // For backward compatibility: if createdBy doesn't exist, only show if user is viewing themselves
      query.$or = [
        { createdBy: currentUser.id }, // Users created by current user
        { _id: new ObjectId(currentUser.id) }, // Allow viewing own account
      ];
    }

    if (search) {
      const searchQuery = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ]
      };
      if (query.$or) {
        query.$and = [
          { $or: query.$or },
          searchQuery
        ];
        delete query.$or;
      } else {
        query.$and = [
          query,
          searchQuery
        ];
      }
    }

    const admins = await db.collection('admins').find(query).sort({ createdAt: -1, _id: -1 }).toArray();

    const serializedAdmins = admins.map(a => ({
      ...a,
      _id: a._id?.toString(),
      password: undefined,
    }));

    return NextResponse.json({
      users: serializedAdmins,
      total: serializedAdmins.length,
    });
  } catch (error) {
    console.error('[v0] Error fetching admins:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admins' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const currentUser = getUserFromRequest(request);
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Allow both admin and vendor access
    if (!isAdmin(currentUser) && !isVendor(currentUser)) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const { db } = await connectToDatabase();
    const body = await request.json();

    // Vendors can only create users with 'vendor' or 'admin' role, not 'superadmin'
    if (isVendor(currentUser)) {
      if (body.role === 'superadmin') {
        return NextResponse.json(
          { error: 'Access denied. You cannot create superadmin users.' },
          { status: 403 }
        );
      }
      // If vendor is creating a user, default to 'admin' role if not specified
      if (!body.role) {
        body.role = 'admin';
      }
    }

    const existingAdmin = await db.collection('admins').findOne({ email: body.email });
    if (existingAdmin) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(body.password, 10);

    // Determine role based on creator
    let userRole = body.role || 'admin';
    
    // Vendors cannot create superadmin users
    if (isVendor(currentUser) && userRole === 'superadmin') {
      userRole = 'admin';
    }
    
    // Superadmin can create any role, but others cannot create superadmin
    if (currentUser.role !== 'superadmin' && userRole === 'superadmin') {
      return NextResponse.json(
        { error: 'Access denied. You cannot create superadmin users.' },
        { status: 403 }
      );
    }

    const result = await db.collection('admins').insertOne({
      name: body.name,
      email: body.email,
      password: hashedPassword,
      phone: body.phone || '',
      status: body.status || 'active',
      role: userRole,
      createdBy: currentUser.id, // Track who created this user (owner)
      createdAt: new Date(),
    });

    return NextResponse.json(
      { 
        _id: result.insertedId.toString(), 
        email: body.email,
        name: body.name,
        phone: body.phone || '',
        status: body.status || 'active',
        password: undefined,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[v0] Error creating admin:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
