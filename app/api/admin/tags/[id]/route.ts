import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { db } = await connectToDatabase();

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid tag ID' }, { status: 400 });
    }

    const tag = await db.collection('tags').findOne({ _id: new ObjectId(id) });

    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...tag,
      _id: tag._id.toString(),
    });
  } catch (error) {
    console.error('[v0] Error fetching tag:', error);
    return NextResponse.json({ error: 'Failed to fetch tag' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { db } = await connectToDatabase();
    const body = await request.json();
    const { _id, createdAt, updatedAt, ...updateData } = body;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid tag ID' }, { status: 400 });
    }

    // If only status is being updated, skip validation
    const isStatusOnlyUpdate = Object.keys(updateData).length === 1 && 'status' in updateData;

    if (!isStatusOnlyUpdate) {
      const { name, description, status } = updateData;

      if (!name || name.trim() === '') {
        return NextResponse.json({ error: 'Tag name is required' }, { status: 400 });
      }

      // Check if tag with same name exists (excluding current tag)
      const existingTag = await db.collection('tags').findOne({
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        _id: { $ne: new ObjectId(id) },
      });

      if (existingTag) {
        return NextResponse.json({ error: 'Tag with this name already exists' }, { status: 400 });
      }

      const result = await db.collection('tags').updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            name: name.trim(),
            description: description || '',
            status: status || 'active',
            updatedAt: new Date(),
          },
        }
      );

      if (result.matchedCount === 0) {
        return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
      }
    } else {
      // Status-only update
      const result = await db.collection('tags').updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            status: updateData.status,
            updatedAt: new Date(),
          },
        }
      );

      if (result.matchedCount === 0) {
        return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
      }
    }

    return NextResponse.json({ message: 'Tag updated successfully' });
  } catch (error) {
    console.error('[v0] Error updating tag:', error);
    return NextResponse.json({ error: 'Failed to update tag' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { db } = await connectToDatabase();

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid tag ID' }, { status: 400 });
    }

    const result = await db.collection('tags').deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Tag deleted successfully' });
  } catch (error) {
    console.error('[v0] Error deleting tag:', error);
    return NextResponse.json({ error: 'Failed to delete tag' }, { status: 500 });
  }
}

