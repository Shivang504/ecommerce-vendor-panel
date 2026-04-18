import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { db } = await connectToDatabase();

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid brand ID' }, { status: 400 });
    }

    const brand = await db.collection('brands').findOne({ _id: new ObjectId(id) });

    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...brand,
      _id: brand._id.toString(),
    });
  } catch (error) {
    console.error('[v0] Error fetching brand:', error);
    return NextResponse.json({ error: 'Failed to fetch brand' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { db } = await connectToDatabase();
    const body = await request.json();
    const { _id, createdAt, updatedAt, ...updateData } = body;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid brand ID' }, { status: 400 });
    }

    // If only status is being updated, skip validation
    const isStatusOnlyUpdate = Object.keys(updateData).length === 1 && 'status' in updateData;

    if (!isStatusOnlyUpdate) {
      const { name, image, bannerImage, metaTitle, metaDescription, metaImage, status } = updateData;

      if (!name || name.trim() === '') {
        return NextResponse.json({ error: 'Brand name is required' }, { status: 400 });
      }

      // Check if brand with same name exists (excluding current brand)
      const existingBrand = await db.collection('brands').findOne({
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        _id: { $ne: new ObjectId(id) },
      });

      if (existingBrand) {
        return NextResponse.json({ error: 'Brand with this name already exists' }, { status: 400 });
      }

      const result = await db.collection('brands').updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            name: name.trim(),
            image: image || '',
            bannerImage: bannerImage || '',
            metaTitle: metaTitle || '',
            metaDescription: metaDescription || '',
            metaImage: metaImage || '',
            status: status || 'active',
            updatedAt: new Date(),
          },
        }
      );

      if (result.matchedCount === 0) {
        return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
      }
    } else {
      // Status-only update
      const result = await db.collection('brands').updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            status: updateData.status,
            updatedAt: new Date(),
          },
        }
      );

      if (result.matchedCount === 0) {
        return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
      }
    }

    return NextResponse.json({ message: 'Brand updated successfully' });
  } catch (error) {
    console.error('[v0] Error updating brand:', error);
    return NextResponse.json({ error: 'Failed to update brand' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { db } = await connectToDatabase();

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid brand ID' }, { status: 400 });
    }

    const result = await db.collection('brands').deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Brand deleted successfully' });
  } catch (error) {
    console.error('[v0] Error deleting brand:', error);
    return NextResponse.json({ error: 'Failed to delete brand' }, { status: 500 });
  }
}
