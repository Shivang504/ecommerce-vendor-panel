import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { getUserFromRequest, isAdmin } from '@/lib/auth';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!isAdmin(getUserFromRequest(request as NextRequest))) {
      return Response.json({ error: 'Admin login required' }, { status: 401 });
    }
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
