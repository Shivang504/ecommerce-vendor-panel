import { connectToDatabase } from '@/lib/mongodb';
import { NextResponse } from 'next/server';

// GET /api/admin/roles - list roles (optional search by name)
export async function GET(request: Request) {
  try {
    const { db } = await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    const filter: any = {};
    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    const roles = await db
      .collection('roles')
      .find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .toArray();

    return NextResponse.json({
      roles: roles.map(r => ({
        ...r,
        _id: r._id.toString(),
      })),
      total: roles.length,
    });
  } catch (error) {
    console.error('[v0] Failed to fetch roles:', error);
    return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 });
  }
}

// POST /api/admin/roles - create role (name only for now)
export async function POST(request: Request) {
  try {
    const { db } = await connectToDatabase();
    const body = await request.json();
    const name = (body.name || '').trim();

    if (!name) {
      return NextResponse.json({ error: 'Role name is required' }, { status: 400 });
    }

    const existing = await db.collection('roles').findOne({ name: new RegExp(`^${name}$`, 'i') });
    if (existing) {
      return NextResponse.json({ error: 'Role with this name already exists' }, { status: 400 });
    }

    const now = new Date();
    const newRole = {
      name,
      permissions: Array.isArray(body.permissions) ? body.permissions : [],
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection('roles').insertOne(newRole);

    return NextResponse.json(
      {
        ...newRole,
        _id: result.insertedId.toString(),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('[v0] Failed to create role:', error);
    return NextResponse.json({ error: 'Failed to create role' }, { status: 500 });
  }
}


