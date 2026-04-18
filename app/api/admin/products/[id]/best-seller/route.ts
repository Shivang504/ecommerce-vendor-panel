import { connectToDatabase } from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { bestSeller } = await request.json();

    if (typeof bestSeller !== 'boolean') {
      return NextResponse.json({ error: 'bestSeller must be a boolean value' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    
    const result = await db.collection('products').updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          bestSeller: bestSeller,
          updatedAt: new Date()
        } 
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Product ${bestSeller ? 'marked as best seller' : 'removed from best seller'} successfully`,
      bestSeller: bestSeller
    });
  } catch (error) {
    console.error('[v0] Failed to update best seller status:', error);
    return NextResponse.json({ error: 'Failed to update best seller status' }, { status: 500 });
  }
}
