import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { NextResponse } from 'next/server';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { db } = await connectToDatabase();

    const childCategory = await db.collection('childcategories').findOne({ _id: new ObjectId(id) });

    if (!childCategory) {
      return NextResponse.json({ error: 'Child category not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...childCategory,
      _id: childCategory._id.toString(),
      subcategoryId: childCategory.subcategoryId ? childCategory.subcategoryId.toString() : null,
      categoryId: childCategory.categoryId ? childCategory.categoryId.toString() : null,
    });
  } catch (error) {
    console.error('[v0] Failed to fetch child category:', error);
    return NextResponse.json({ error: 'Failed to fetch child category' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { db } = await connectToDatabase();

    const existingChildCategory = await db.collection('childcategories').findOne({ _id: new ObjectId(id) });
    if (!existingChildCategory) {
      return NextResponse.json({ error: 'Child category not found' }, { status: 404 });
    }

    const { _id, createdAt, updatedAt, ...updateFields } = body;
    
    const updateData = {
      ...updateFields,
      subcategoryId: updateFields.subcategoryId && updateFields.subcategoryId !== 'none' ? new ObjectId(updateFields.subcategoryId) : null,
      categoryId: updateFields.categoryId && updateFields.categoryId !== 'none' ? new ObjectId(updateFields.categoryId) : null,
      updatedAt: new Date(),
    };

    await db.collection('childcategories').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    const updatedChildCategory = await db.collection('childcategories').findOne({ _id: new ObjectId(id) });

    return NextResponse.json({
      ...updatedChildCategory,
      _id: updatedChildCategory?._id.toString(),
      subcategoryId: updatedChildCategory?.subcategoryId ? updatedChildCategory.subcategoryId.toString() : null,
      categoryId: updatedChildCategory?.categoryId ? updatedChildCategory.categoryId.toString() : null,
    });
  } catch (error) {
    console.error('[v0] Failed to update child category:', error);
    return NextResponse.json({ 
      error: 'Failed to update child category',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { db } = await connectToDatabase();

    // Check if products exist
    const productCount = await db.collection('products').countDocuments({ childCategory: new ObjectId(id) });
    if (productCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete child category with products' },
        { status: 400 }
      );
    }

    const result = await db.collection('childcategories').deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Child category not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Child category deleted' });
  } catch (error) {
    console.error('[v0] Failed to delete child category:', error);
    return NextResponse.json({ error: 'Failed to delete child category' }, { status: 500 });
  }
}

