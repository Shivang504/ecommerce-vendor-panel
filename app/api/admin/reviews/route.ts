import { NextRequest, NextResponse } from 'next/server';
import { getAllReviews, updateReviewStatus, deleteReview, getProductReviewStats } from '@/lib/models/review';
import { getUserFromRequest, isAdmin, isVendor } from '@/lib/auth';

// GET - Get all reviews (admin/vendor)
export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') as 'pending' | 'approved' | 'rejected' | null;
    const productId = searchParams.get('productId');
    const customerId = searchParams.get('customerId');

    const filters: any = {};
    if (status) filters.status = status;
    if (productId) filters.productId = productId;
    if (customerId) filters.customerId = customerId;
    
    // If vendor, only show reviews for their products
    if (isVendor(currentUser)) {
      filters.vendorId = currentUser.id;
    }

    const reviews = await getAllReviews(filters);

    return NextResponse.json({
      reviews,
      count: reviews.length
    });
  } catch (error: any) {
    console.error('[Admin Review API] Error fetching reviews:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reviews', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete review (admin only, vendors cannot delete reviews)
export async function DELETE(request: NextRequest) {
  try {
    // Verify admin authentication (vendors cannot delete reviews)
    const currentUser = getUserFromRequest(request);
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Only admins can delete reviews
    if (!isAdmin(currentUser)) {
      return NextResponse.json(
        { error: 'Access denied. Admin access required to delete reviews.' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const reviewId = searchParams.get('reviewId');

    if (!reviewId) {
      return NextResponse.json(
        { error: 'Review ID is required' },
        { status: 400 }
      );
    }

    await deleteReview(reviewId);

    return NextResponse.json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error: any) {
    console.error('[Admin Review API] Error deleting review:', error);
    return NextResponse.json(
      { error: 'Failed to delete review', details: error.message },
      { status: 500 }
    );
  }
}

