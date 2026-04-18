import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { NextResponse } from 'next/server';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { db } = await connectToDatabase();

    const subcategory = await db.collection('subcategories').findOne({ _id: new ObjectId(id) });

    if (!subcategory) {
      return NextResponse.json({ error: 'Subcategory not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...subcategory,
      _id: subcategory._id.toString(),
      categoryId: subcategory.categoryId ? subcategory.categoryId.toString() : null,
    });
  } catch (error) {
    console.error('[v0] Failed to fetch subcategory:', error);
    return NextResponse.json({ error: 'Failed to fetch subcategory' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { db } = await connectToDatabase();

    const existingSubcategory = await db.collection('subcategories').findOne({ _id: new ObjectId(id) });
    if (!existingSubcategory) {
      return NextResponse.json({ error: 'Subcategory not found' }, { status: 404 });
    }

    const { _id, createdAt, updatedAt, ...updateFields } = body;
    
    const updateData = {
      ...updateFields,
      categoryId: updateFields.categoryId && updateFields.categoryId !== 'none' ? new ObjectId(updateFields.categoryId) : null,
      updatedAt: new Date(),
    };

    await db.collection('subcategories').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    const updatedSubcategory = await db.collection('subcategories').findOne({ _id: new ObjectId(id) });

    return NextResponse.json({
      ...updatedSubcategory,
      _id: updatedSubcategory?._id.toString(),
      categoryId: updatedSubcategory?.categoryId ? updatedSubcategory.categoryId.toString() : null,
    });
  } catch (error) {
    console.error('[v0] Failed to update subcategory:', error);
    return NextResponse.json({ 
      error: 'Failed to update subcategory',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { db } = await connectToDatabase();

    // Check if child categories exist
    const childCategoryCount = await db.collection('childcategories').countDocuments({ subcategoryId: new ObjectId(id) });
    if (childCategoryCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete subcategory with child categories' },
        { status: 400 }
      );
    }

    const result = await db.collection('subcategories').deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Subcategory not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Subcategory deleted' });
  } catch (error) {
    console.error('[v0] Failed to delete subcategory:', error);
    return NextResponse.json({ error: 'Failed to delete subcategory' }, { status: 500 });
  }
}

