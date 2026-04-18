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

    const brands = await db
      .collection('brands')
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(
      brands.map(brand => ({
        ...brand,
        _id: brand._id.toString(),
      }))
    );
  } catch (error) {
    console.error('[v0] Error fetching brands:', error);
    return NextResponse.json({ error: 'Failed to fetch brands' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const body = await request.json();
    const { name, image, bannerImage, metaTitle, metaDescription, metaImage, status } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Brand name is required' }, { status: 400 });
    }

    // Check if brand with same name exists
    const existingBrand = await db.collection('brands').findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') },
    });

    if (existingBrand) {
      return NextResponse.json({ error: 'Brand with this name already exists' }, { status: 400 });
    }

    const newBrand = {
      name: name.trim(),
      image: image || '',
      bannerImage: bannerImage || '',
      metaTitle: metaTitle || '',
      metaDescription: metaDescription || '',
      metaImage: metaImage || '',
      status: status || 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('brands').insertOne(newBrand);

    return NextResponse.json(
      {
        ...newBrand,
        _id: result.insertedId.toString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[v0] Error creating brand:', error);
    return NextResponse.json({ error: 'Failed to create brand' }, { status: 500 });
  }
}
