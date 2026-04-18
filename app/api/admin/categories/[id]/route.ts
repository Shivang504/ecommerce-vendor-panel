import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { NextResponse } from 'next/server';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { db } = await connectToDatabase();

    console.log('[v0] Fetching category with ID:', id);

    const category = await db.collection('categories').findOne({ _id: new ObjectId(id) });

    if (!category) {
      console.log('[v0] Category not found:', id);
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    console.log('[v0] Category found:', category.name);

    return NextResponse.json({
      ...category,
      _id: category._id.toString(),
    });
  } catch (error) {
    console.error('[v0] Failed to fetch category:', error);
    return NextResponse.json({ error: 'Failed to fetch category' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { db } = await connectToDatabase();

    console.log('[v0] Updating category with ID:', id);
    console.log('[v0] Request body:', body);

    const existingCategory = await db.collection('categories').findOne({ _id: new ObjectId(id) });
    if (!existingCategory) {
      console.log('[v0] Category not found for update:', id);
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const { _id, createdAt, updatedAt, ...updateFields } = body;
    
    const updateData = {
      ...updateFields,
      parentId: updateFields.parentId === 'none' ? '' : updateFields.parentId,
      updatedAt: new Date(),
    };

    console.log('[v0] Sanitized update data:', updateData);

    await db.collection('categories').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    const updatedCategory = await db.collection('categories').findOne({ _id: new ObjectId(id) });

    console.log('[v0] Category updated successfully');

    return NextResponse.json({
      ...updatedCategory,
      _id: updatedCategory?._id.toString(),
    });
  } catch (error) {
    console.error('[v0] Failed to update category:', error);
    return NextResponse.json({ 
      error: 'Failed to update category',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { db } = await connectToDatabase();

    console.log('[v0] Deleting category with ID:', id);

    const productCount = await db.collection('products').countDocuments({ category: id });
    if (productCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete category with products' },
        { status: 400 }
      );
    }

    const result = await db.collection('categories').deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      console.log('[v0] Category not found for deletion:', id);
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    console.log('[v0] Category deleted successfully');

    return NextResponse.json({ message: 'Category deleted' });
  } catch (error) {
    console.error('[v0] Failed to delete category:', error);
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
}
