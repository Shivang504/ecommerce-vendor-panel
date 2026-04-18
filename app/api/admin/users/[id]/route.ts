import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { getUserFromRequest, isAdmin, isVendor } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    
    if (!id || id.length !== 24) {
      return NextResponse.json(
        { error: 'Invalid user ID format' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const admin = await db.collection('admins').findOne({ _id: new ObjectId(id) });

    if (!admin) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check ownership: Each admin/vendor can only view their own employees
    // Superadmin can view all users except other superadmins
    if (currentUser.role !== 'superadmin') {
      // Check if this user was created by the current user
      if (admin.createdBy !== currentUser.id) {
        // Allow viewing own account even if not created by self
        if (admin._id.toString() !== currentUser.id) {
          return NextResponse.json(
            { error: 'Access denied. You can only view your own employees.' },
            { status: 403 }
          );
        }
      }
    } else {
      // Superadmin cannot view other superadmins
      if (admin.role === 'superadmin' && admin._id.toString() !== currentUser.id) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
    }

    const { password, ...adminWithoutPassword } = admin;
    return NextResponse.json({
      user: {
        ...adminWithoutPassword,
        _id: admin._id?.toString(),
      },
    });
  } catch (error) {
    console.error('[v0] Error fetching admin:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const { db } = await connectToDatabase();
    const body = await request.json();
    const { _id, createdAt, updatedAt, ...updateData } = body;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await db.collection('admins').findOne({ _id: new ObjectId(id) });
    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check ownership: Each admin/vendor can only update their own employees
    // Superadmin can update all users except other superadmins
    if (currentUser.role !== 'superadmin') {
      // Check if this user was created by the current user
      if (existingUser.createdBy !== currentUser.id) {
        // Allow updating own account even if not created by self
        if (existingUser._id.toString() !== currentUser.id) {
          return NextResponse.json(
            { error: 'Access denied. You can only update your own employees.' },
            { status: 403 }
          );
        }
      }
    } else {
      // Superadmin cannot update other superadmins
      if (existingUser.role === 'superadmin' && existingUser._id.toString() !== currentUser.id) {
        return NextResponse.json(
          { error: 'Access denied. You cannot update other superadmin users.' },
          { status: 403 }
        );
      }
    }

    // Prevent non-superadmins from changing role to superadmin
    if (currentUser.role !== 'superadmin' && body.role === 'superadmin') {
      return NextResponse.json(
        { error: 'Access denied. You cannot set role to superadmin.' },
        { status: 403 }
      );
    }

    // Prevent changing role of superadmin
    if (existingUser.role === 'superadmin' && body.role && body.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Access denied. Cannot change superadmin role.' },
        { status: 403 }
      );
    }

    // If only status is being updated, skip validation
    const isStatusOnlyUpdate = Object.keys(updateData).length === 1 && 'status' in updateData;

    if (isStatusOnlyUpdate) {
      // Status-only update
      const result = await db.collection('admins').updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            status: updateData.status,
            updatedAt: new Date(),
          },
        }
      );

      if (result.matchedCount === 0) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'User updated successfully',
      });
    }

    // Full update - construct name from firstName/lastName if provided
    const name = body.name || (body.firstName && body.lastName ? `${body.firstName} ${body.lastName}`.trim() : body.firstName || body.lastName || '');

    const fullUpdateData: any = {
      name: name,
      email: body.email,
      phone: body.phone || '',
      status: body.status || 'active',
      role: body.role || 'admin',
      updatedAt: new Date(),
    };

    // Vendors cannot set role to superadmin
    if (isVendor(currentUser) && fullUpdateData.role === 'superadmin') {
      fullUpdateData.role = 'admin'; // Default to admin
    }

    if (body.password && body.password.trim()) {
      fullUpdateData.password = await bcrypt.hash(body.password, 10);
    }

    const result = await db.collection('admins').updateOne(
      { _id: new ObjectId(id) },
      { $set: fullUpdateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'User updated successfully',
    });
  } catch (error) {
    console.error('[v0] Error updating admin:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication - only admins can delete users
    const currentUser = getUserFromRequest(request);
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Only admins can delete users
    if (!isAdmin(currentUser)) {
      return NextResponse.json(
        { error: 'Access denied. Only admins can delete users.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const { db } = await connectToDatabase();

    // Check if user exists
    const userToDelete = await db.collection('admins').findOne({ _id: new ObjectId(id) });
    if (!userToDelete) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check ownership: Each admin/vendor can only delete their own employees
    // Superadmin can delete all users except other superadmins
    if (currentUser.role !== 'superadmin') {
      // Check if this user was created by the current user
      if (userToDelete.createdBy !== currentUser.id) {
        return NextResponse.json(
          { error: 'Access denied. You can only delete your own employees.' },
          { status: 403 }
        );
      }
    } else {
      // Superadmin cannot delete other superadmins
      if (userToDelete.role === 'superadmin' && userToDelete._id.toString() !== currentUser.id) {
        return NextResponse.json(
          { error: 'Cannot delete superadmin user' },
          { status: 403 }
        );
      }
    }

    const result = await db.collection('admins').deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('[v0] Error deleting admin:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
