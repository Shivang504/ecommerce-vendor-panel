import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { db } = await connectToDatabase();
    
    const result = await db.collection('vendors').findOneAndUpdate(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          status: 'approved',
          updatedAt: new Date() 
        } 
      },
      { returnDocument: 'after' }
    );

    if (!result) {
      return Response.json({ error: 'Vendor not found' }, { status: 404 });
    }

    return Response.json({
      ...result,
      _id: result._id.toString()
    });
  } catch (error) {
    console.error('[v0] Error approving vendor:', error);
    return Response.json({ error: 'Failed to approve vendor' }, { status: 500 });
  }
}
