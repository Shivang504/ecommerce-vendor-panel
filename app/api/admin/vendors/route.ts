import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { hashVendorPassword } from '@/lib/models/vendor';
import { verifyVendorDetails } from '@/lib/cashfree-secure-id';

export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    let query: any = {};

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { storeName: { $regex: search, $options: 'i' } },
      ];
    }

    const vendors = await db.collection('vendors').find(query).sort({ createdAt: -1, _id: -1 }).toArray();

    const serializedVendors = vendors.map(v => {
      const { password, ...vendorWithoutPassword } = v;
      return {
        ...vendorWithoutPassword,
        _id: v._id?.toString(),
      };
    });

    return NextResponse.json({
      vendors: serializedVendors,
      total: serializedVendors.length,
      pending: serializedVendors.filter((v: any) => v.status === 'pending').length,
    });
  } catch (error) {
    console.error('[v0] Error fetching vendors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vendors' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const body = await request.json();

    // Hash the password if provided
    if (body.password) {
      body.password = await hashVendorPassword(body.password);
    }

    // Prepare vendor data with verification placeholder
    const vendorData = {
      ...body,
      status: body.status || 'pending',
      registrationDate: new Date().toISOString().split('T')[0],
      createdAt: new Date(),
      updatedAt: new Date(),
      verification: {
        bank: null,
        pan: null,
        gst: null,
        panGst: null,
        verified: false,
        reference_id: null,
      },
    };

    const result = await db.collection('vendors').insertOne(vendorData);
    const vendorId = result.insertedId.toString();

    // Trigger Cashfree verification asynchronously (don't block vendor creation)
    // Verification will be updated via webhook or can be checked later
    if (body.accountNumber || body.panNumber || body.gstNumber) {
      verifyVendorDetails({
        accountNumber: body.accountNumber,
        ifscCode: body.ifscCode,
        accountHolderName: body.accountHolderName,
        panNumber: body.panNumber,
        gstNumber: body.gstNumber,
      })
        .then(async (verificationResults) => {
          try {
            const updateData: any = {
              $set: {
                'verification.bank': verificationResults.bank || null,
                'verification.pan': verificationResults.pan || null,
                'verification.gst': verificationResults.gst || null,
                'verification.panGst': verificationResults.panGst || null,
                'verification.verified': !verificationResults.errors || verificationResults.errors.length === 0,
                'verification.verified_at': new Date(),
                updatedAt: new Date(),
              },
            };

            // Store reference IDs if available
            if (verificationResults.bank?.reference_id) {
              updateData.$set['verification.reference_id'] = verificationResults.bank.reference_id;
            } else if (verificationResults.pan?.reference_id) {
              updateData.$set['verification.reference_id'] = verificationResults.pan.reference_id;
            } else if (verificationResults.gst?.reference_id) {
              updateData.$set['verification.reference_id'] = verificationResults.gst.reference_id;
            }

            await db.collection('vendors').updateOne(
              { _id: result.insertedId },
              updateData
            );

            console.log('[Cashfree] Vendor verification completed:', {
              vendorId,
              verificationResults,
            });
          } catch (updateError) {
            console.error('[Cashfree] Error updating verification status:', updateError);
          }
        })
        .catch((verificationError) => {
          console.error('[Cashfree] Verification error (non-blocking):', verificationError);
          // Don't fail vendor creation if verification fails
        });
    }

    return NextResponse.json(
      { _id: vendorId, ...vendorData },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('[v0] Error creating vendor:', error);

    // Handle duplicate email (MongoDB E11000)
    const mongoError = error as { code?: number; keyPattern?: Record<string, unknown> };
    if (mongoError?.code === 11000) {
      const isEmail = mongoError?.keyPattern && 'email' in (mongoError.keyPattern ?? {});
      return NextResponse.json(
        {
          error: isEmail
            ? 'A vendor with this email is already registered. Please use a different email or sign in.'
            : 'A vendor record already exists with these details.',
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create vendor' },
      { status: 500 }
    );
  }
}
