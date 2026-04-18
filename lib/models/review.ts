import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export interface Review {
  _id?: string | ObjectId;
  productId: string | ObjectId;
  customerId?: string | ObjectId; // Optional for admin-created fake reviews
  customerName: string;
  customerEmail: string;
  customerAvatar?: string;
  rating: number; // 1-5 stars
  title?: string;
  description: string;
  photos: string[]; // Array of image URLs
  likes: string[]; // Array of customer IDs who liked this review
  verifiedPurchase: boolean; // Whether customer actually purchased the product
  helpfulCount: number; // Count of people who found this helpful
  status: 'pending' | 'approved' | 'rejected'; // Admin approval status
  isAdminCreated?: boolean; // Flag for admin-created reviews
  isVendorCreated?: boolean; // Flag for vendor-created reviews
  createdAt: Date;
  updatedAt?: Date;
}

// Get all reviews for a product
export async function getProductReviews(productId: string) {
  try {
    const { db } = await connectToDatabase();
    const reviews = await db
      .collection('reviews')
      .find({ 
        productId: new ObjectId(productId),
        status: 'approved' // Only show approved reviews
      })
      .sort({ createdAt: -1 })
      .toArray();
    return reviews as Review[];
  } catch (error) {
    console.error('[Review] Error fetching product reviews:', error);
    return [];
  }
}

// Get all reviews (admin/vendor)
export async function getAllReviews(filters?: {
  status?: 'pending' | 'approved' | 'rejected';
  productId?: string;
  customerId?: string;
  vendorId?: string; // Filter reviews by vendor (via products)
}) {
  try {
    const { db } = await connectToDatabase();
    const query: any = {};
    
    if (filters?.status) {
      query.status = filters.status;
    }
    if (filters?.productId) {
      query.productId = new ObjectId(filters.productId);
    }
    if (filters?.customerId) {
      query.customerId = new ObjectId(filters.customerId);
    }

    // If vendorId is provided, filter reviews to only show those for products belonging to that vendor
    if (filters?.vendorId) {
      const vendorObjectId = new ObjectId(filters.vendorId);
      
      // First, get all product IDs for this vendor
      const vendorProducts = await db
        .collection('products')
        .find({ vendorId: vendorObjectId.toString() })
        .project({ _id: 1 })
        .toArray();
      
      const vendorProductIds = vendorProducts.map(p => p._id);
      
      // If vendor has no products, return empty array
      if (vendorProductIds.length === 0) {
        return [];
      }
      
      // Filter reviews to only those for vendor's products
      query.productId = { $in: vendorProductIds };
    }

    const reviews = await db
      .collection('reviews')
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();
    return reviews as Review[];
  } catch (error) {
    console.error('[Review] Error fetching all reviews:', error);
    return [];
  }
}

// Get review by ID
export async function getReviewById(reviewId: string) {
  try {
    const { db } = await connectToDatabase();
    const review = await db
      .collection('reviews')
      .findOne({ _id: new ObjectId(reviewId) });
    return review as Review | null;
  } catch (error) {
    console.error('[Review] Error fetching review:', error);
    return null;
  }
}

// Check if customer already reviewed this product
export async function getCustomerReviewForProduct(productId: string, customerId: string) {
  try {
    const { db } = await connectToDatabase();
    const review = await db
      .collection('reviews')
      .findOne({ 
        productId: new ObjectId(productId),
        customerId: new ObjectId(customerId)
      });
    return review as Review | null;
  } catch (error) {
    console.error('[Review] Error fetching customer review:', error);
    return null;
  }
}

// Create a new review
export async function createReview(reviewData: Omit<Review, '_id' | 'createdAt' | 'updatedAt'>) {
  try {
    const { db } = await connectToDatabase();
    const review: any = {
      ...reviewData,
      productId: new ObjectId(reviewData.productId),
      likes: [],
      helpfulCount: 0,
      status: 'approved', // All reviews go live directly - no approval needed
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // Only add customerId if provided (required for customer reviews, optional for admin)
    if (reviewData.customerId) {
      review.customerId = new ObjectId(reviewData.customerId);
    }
    
    const result = await db.collection('reviews').insertOne(review);
    return { ...review, _id: result.insertedId } as Review;
  } catch (error) {
    console.error('[Review] Error creating review:', error);
    throw error;
  }
}

// Update review
export async function updateReview(reviewId: string, updateData: Partial<Review>) {
  try {
    const { db } = await connectToDatabase();
    const update: any = { ...updateData, updatedAt: new Date() };
    
    // Convert IDs if present
    if (update.productId) update.productId = new ObjectId(update.productId);
    if (update.customerId) update.customerId = new ObjectId(update.customerId);
    
    const result = await db
      .collection('reviews')
      .findOneAndUpdate(
        { _id: new ObjectId(reviewId) },
        { $set: update },
        { returnDocument: 'after' }
      );
    return result?.value as Review | null;
  } catch (error) {
    console.error('[Review] Error updating review:', error);
    throw error;
  }
}

// Delete review
export async function deleteReview(reviewId: string) {
  try {
    const { db } = await connectToDatabase();
    const result = await db
      .collection('reviews')
      .deleteOne({ _id: new ObjectId(reviewId) });
    return result.deletedCount > 0;
  } catch (error) {
    console.error('[Review] Error deleting review:', error);
    throw error;
  }
}

// Toggle like on review
export async function toggleReviewLike(reviewId: string, customerId: string) {
  try {
    const { db } = await connectToDatabase();
    const review = await getReviewById(reviewId);
    
    if (!review) {
      throw new Error('Review not found');
    }

    const likes = review.likes || [];
    const customerIdObj = new ObjectId(customerId);
    const isLiked = likes.some(id => id.toString() === customerId);

    let update: any;
    if (isLiked) {
      // Unlike
      update = {
        $pull: { likes: customerIdObj },
        $inc: { helpfulCount: -1 },
        $set: { updatedAt: new Date() }
      };
    } else {
      // Like
      update = {
        $addToSet: { likes: customerIdObj },
        $inc: { helpfulCount: 1 },
        $set: { updatedAt: new Date() }
      };
    }

    const result = await db
      .collection('reviews')
      .findOneAndUpdate(
        { _id: new ObjectId(reviewId) },
        update,
        { returnDocument: 'after' }
      );

    return {
      isLiked: !isLiked,
      helpfulCount: (result?.value?.helpfulCount || 0),
      likesCount: (result?.value?.likes?.length || 0)
    };
  } catch (error) {
    console.error('[Review] Error toggling like:', error);
    throw error;
  }
}

// Get review statistics for a product
export async function getProductReviewStats(productId: string) {
  try {
    const { db } = await connectToDatabase();
    const reviews = await db
      .collection('reviews')
      .find({ 
        productId: new ObjectId(productId),
        status: 'approved'
      })
      .toArray();

    if (reviews.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
      };
    }

    const totalRating = reviews.reduce((sum, review) => sum + (review.rating || 0), 0);
    const averageRating = totalRating / reviews.length;

    const ratingDistribution = {
      5: reviews.filter(r => r.rating === 5).length,
      4: reviews.filter(r => r.rating === 4).length,
      3: reviews.filter(r => r.rating === 3).length,
      2: reviews.filter(r => r.rating === 2).length,
      1: reviews.filter(r => r.rating === 1).length,
    };

    return {
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      totalReviews: reviews.length,
      ratingDistribution
    };
  } catch (error) {
    console.error('[Review] Error fetching review stats:', error);
    return {
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    };
  }
}

// Update review status (approve/reject)
export async function updateReviewStatus(reviewId: string, status: 'pending' | 'approved' | 'rejected') {
  try {
    const { db } = await connectToDatabase();
    const result = await db
      .collection('reviews')
      .findOneAndUpdate(
        { _id: new ObjectId(reviewId) },
        { $set: { status, updatedAt: new Date() } },
        { returnDocument: 'after' }
      );
    return result?.value as Review | null;
  } catch (error) {
    console.error('[Review] Error updating review status:', error);
    throw error;
  }
}

// Check if customer has purchased and received (delivered) a product
export async function hasCustomerPurchasedProduct(customerId: string, productId: string): Promise<boolean> {
  try {
    const { db } = await connectToDatabase();
    const productObjectId = new ObjectId(productId);
    const customerObjectId = new ObjectId(customerId);
    
    // Find orders for this customer with delivered/completed status
    const orders = await db
      .collection('orders')
      .find({
        customerId: customerObjectId,
        orderStatus: { $in: ['delivered', 'completed'] }
      })
      .toArray();

    // Check if any order contains this product
    for (const order of orders) {
      if (order.items && Array.isArray(order.items)) {
        for (const item of order.items) {
          // Check if item is not cancelled and matches productId
          const itemStatus = item.itemStatus || 'ordered';
          const isItemCancelled = itemStatus === 'cancelled' || 
                                 item.cancelReturnInfo?.status === 'approved' ||
                                 item.cancelReturnInfo?.status === 'refund_processed';
          
          if (!isItemCancelled) {
            // Handle both ObjectId and string formats
            const itemProductId = item.productId;
            let itemProductIdStr: string;
            
            if (itemProductId instanceof ObjectId) {
              itemProductIdStr = itemProductId.toString();
            } else if (typeof itemProductId === 'string') {
              itemProductIdStr = itemProductId;
            } else {
              continue;
            }
            
            const searchProductIdStr = productObjectId.toString();
            
            // Compare as strings
            if (itemProductIdStr === searchProductIdStr) {
              return true;
            }
          }
        }
      }
    }

    return false;
  } catch (error) {
    console.error('[Review] Error checking purchase history:', error);
    return false;
  }
}

