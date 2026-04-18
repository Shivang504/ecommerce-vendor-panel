import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    const filter: any = {};
    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    const attributes = await db.collection('attributes').find(filter).sort({ createdAt: -1, _id: -1 }).toArray();

    return NextResponse.json({
      attributes: attributes.map(attr => ({
        ...attr,
        _id: attr._id.toString(),
      })),
    });
  } catch (error) {
    console.error('[v0] Error fetching attributes:', error);
    return NextResponse.json({ error: 'Failed to fetch attributes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const body = await request.json();

    if (!body.name || !body.style) {
      return NextResponse.json({ error: 'Name and style are required' }, { status: 400 });
    }

    const attribute = {
      name: body.name.trim(),
      style: body.style,
      values: Array.isArray(body.values) ? body.values : [],
      description: body.description || '',
      createdAt: new Date(),
    };

    const result = await db.collection('attributes').insertOne(attribute);

    return NextResponse.json(
      {
        ...attribute,
        _id: result.insertedId.toString(),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('[v0] Error creating attribute:', error);
    return NextResponse.json({ error: 'Failed to create attribute' }, { status: 500 });
  }
}


