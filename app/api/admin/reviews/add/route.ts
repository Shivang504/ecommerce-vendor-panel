import { NextRequest, NextResponse } from 'next/server';
import { createReview } from '@/lib/models/review';
import { getUserFromRequest, isAdmin, isVendor } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// POST - Admin/Vendor can create reviews without customer ID
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const currentUser = getUserFromRequest(request);
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Allow both admin and vendor access
    if (!isAdmin(currentUser) && !isVendor(currentUser)) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { 
      productId, 
      customerName, 
      customerEmail, 
      customerAvatar, 
      rating, 
      title, 
      description, 
      photos = [],
      verifiedPurchase = false,
      status = 'approved' // Admin/Vendor reviews can be auto-approved
    } = body;

    // Validation
    if (!productId || !rating || !description || !customerName || !customerEmail) {
      return NextResponse.json(
        { error: 'Product ID, rating, description, customer name, and email are required' },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    // If vendor, verify that the product belongs to them
    if (isVendor(currentUser)) {
      const { db } = await connectToDatabase();
      const product = await db.collection('products').findOne({ 
        _id: new ObjectId(productId) 
      });

      if (!product) {
        return NextResponse.json(
          { error: 'Product not found' },
          { status: 404 }
        );
      }

      // Check if product belongs to this vendor
      if (product.vendorId !== currentUser.id) {
        return NextResponse.json(
          { error: 'Access denied. You can only add reviews for your own products.' },
          { status: 403 }
        );
      }
    }

    // Create review (no customerId required for admin/vendor-created reviews)
    const review = await createReview({
      productId,
      customerName,
      customerEmail,
      customerAvatar: customerAvatar || '',
      rating,
      title: title || '',
      description,
      photos: Array.isArray(photos) ? photos : [],
      likes: [],
      verifiedPurchase,
      helpfulCount: 0,
      status: status || 'approved',
      isAdminCreated: isAdmin(currentUser), // Mark as admin-created only for admins
      isVendorCreated: isVendor(currentUser), // Mark as vendor-created for vendors
    });

    return NextResponse.json({
      success: true,
      review,
      message: 'Review created successfully'
    }, { status: 201 });
  } catch (error: any) {
    console.error('[Admin Review API] Error creating review:', error);
    return NextResponse.json(
      { error: 'Failed to create review', details: error.message },
      { status: 500 }
    );
  }
}

