import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');

    const filter: any = {};
    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }
    if (status && status !== 'all') {
      filter.status = status;
    }

    const tags = await db
      .collection('tags')
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(
      tags.map(tag => ({
        ...tag,
        _id: tag._id.toString(),
      }))
    );
  } catch (error) {
    console.error('[v0] Error fetching tags:', error);
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const body = await request.json();
    const { name, description, status } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Tag name is required' }, { status: 400 });
    }

    // Check if tag with same name exists
    const existingTag = await db.collection('tags').findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') },
    });

    if (existingTag) {
      return NextResponse.json({ error: 'Tag with this name already exists' }, { status: 400 });
    }

    const newTag = {
      name: name.trim(),
      description: description || '',
      status: status || 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('tags').insertOne(newTag);

    return NextResponse.json(
      {
        ...newTag,
        _id: result.insertedId.toString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[v0] Error creating tag:', error);
    return NextResponse.json({ error: 'Failed to create tag' }, { status: 500 });
  }
}

