import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { db } = await connectToDatabase();

    const attribute = await db.collection('attributes').findOne({ _id: new ObjectId(id) });
    if (!attribute) {
      return NextResponse.json({ error: 'Attribute not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...attribute,
      _id: attribute._id.toString(),
    });
  } catch (error) {
    console.error('[v0] Error fetching attribute:', error);
    return NextResponse.json({ error: 'Failed to fetch attribute' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { db } = await connectToDatabase();

    if (!body.name || !body.style) {
      return NextResponse.json({ error: 'Name and style are required' }, { status: 400 });
    }

    const updateData = {
      name: body.name.trim(),
      style: body.style,
      values: Array.isArray(body.values) ? body.values : [],
      description: body.description || '',
      updatedAt: new Date(),
    };

    const result = await db.collection('attributes').updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Attribute not found' }, { status: 404 });
    }

    const updated = await db.collection('attributes').findOne({ _id: new ObjectId(id) });

    return NextResponse.json({
      ...updated,
      _id: updated?._id.toString(),
    });
  } catch (error) {
    console.error('[v0] Error updating attribute:', error);
    return NextResponse.json({ error: 'Failed to update attribute' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { db } = await connectToDatabase();

    const result = await db.collection('attributes').deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Attribute not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[v0] Error deleting attribute:', error);
    return NextResponse.json({ error: 'Failed to delete attribute' }, { status: 500 });
  }
}


