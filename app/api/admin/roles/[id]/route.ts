import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { NextResponse } from 'next/server';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { db } = await connectToDatabase();

    const role = await db.collection('roles').findOne({ _id: new ObjectId(id) });
    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...role,
      _id: role._id.toString(),
    });
  } catch (error) {
    console.error('[v0] Failed to fetch role:', error);
    return NextResponse.json({ error: 'Failed to fetch role' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { db } = await connectToDatabase();

    const name = (body.name || '').trim();
    if (!name) {
      return NextResponse.json({ error: 'Role name is required' }, { status: 400 });
    }

    const existing = await db
      .collection('roles')
      .findOne({ _id: { $ne: new ObjectId(id) }, name: new RegExp(`^${name}$`, 'i') });
    if (existing) {
      return NextResponse.json({ error: 'Role with this name already exists' }, { status: 400 });
    }

    const updateData: any = {
      name,
      updatedAt: new Date(),
    };

    if (Array.isArray(body.permissions)) {
      updateData.permissions = body.permissions;
    }

    const result = await db
      .collection('roles')
      .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    const updatedRole = await db.collection('roles').findOne({ _id: new ObjectId(id) });

    return NextResponse.json({
      ...updatedRole,
      _id: updatedRole?._id.toString(),
    });
  } catch (error) {
    console.error('[v0] Failed to update role:', error);
    return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { db } = await connectToDatabase();

    const result = await db.collection('roles').deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Role deleted' });
  } catch (error) {
    console.error('[v0] Failed to delete role:', error);
    return NextResponse.json({ error: 'Failed to delete role' }, { status: 500 });
  }
}


