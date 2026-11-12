import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { getUserFromRequest, isAdmin } from '@/lib/auth';
import { sendVendorApprovedEmail } from '@/lib/email-notices';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!isAdmin(getUserFromRequest(request as NextRequest))) {
      return Response.json({ error: 'Admin login required' }, { status: 401 });
    }
    const { id } = await params;
    const { db } = await connectToDatabase();
    
    const before = await db.collection('vendors').findOne({ _id: new ObjectId(id) }, { projection: { status: 1 } });
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

    if (before?.status !== 'approved') {
      try {
        await sendVendorApprovedEmail(result);
      } catch (emailError) {
        console.error('[Vendors] Approval email failed:', emailError);
      }
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
