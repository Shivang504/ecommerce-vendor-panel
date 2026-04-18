import { connectToDatabase } from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { trending } = await request.json();

    if (typeof trending !== 'boolean') {
      return NextResponse.json({ error: 'Trending must be a boolean value' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    
    const result = await db.collection('products').updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          trending: trending,
          updatedAt: new Date()
        } 
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Product ${trending ? 'marked as trending' : 'removed from trending'} successfully`,
      trending: trending
    });
  } catch (error) {
    console.error('[v0] Failed to update trending status:', error);
    return NextResponse.json({ error: 'Failed to update trending status' }, { status: 500 });
  }
}
