import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export interface WishlistItem {
  _id?: string | ObjectId;
  customerId: string | ObjectId;
  productId: string | ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export async function getWishlistByCustomerId(customerId: string) {
  try {
    const { db } = await connectToDatabase();
    const wishlistItems = await db
      .collection('wishlist')
      .find({ customerId: new ObjectId(customerId) })
      .sort({ createdAt: -1 })
      .toArray();
    return wishlistItems;
  } catch (error) {
    console.error('[v0] Error fetching wishlist:', error);
    throw error;
  }
}

export async function addToWishlist(customerId: string, productId: string) {
  try {
    const { db } = await connectToDatabase();
    
    // Check if item already exists
    const existing = await db.collection('wishlist').findOne({
      customerId: new ObjectId(customerId),
      productId: new ObjectId(productId),
    });

    if (existing) {
      return { success: true, message: 'Already in wishlist', existing: true };
    }

    const wishlistItem = {
      customerId: new ObjectId(customerId),
      productId: new ObjectId(productId),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('wishlist').insertOne(wishlistItem);
    return { success: true, _id: result.insertedId, existing: false };
  } catch (error) {
    console.error('[v0] Error adding to wishlist:', error);
    throw error;
  }
}

export async function removeFromWishlist(customerId: string, productId: string) {
  try {
    const { db } = await connectToDatabase();
    const result = await db.collection('wishlist').deleteOne({
      customerId: new ObjectId(customerId),
      productId: new ObjectId(productId),
    });

    return { success: true, deletedCount: result.deletedCount };
  } catch (error) {
    console.error('[v0] Error removing from wishlist:', error);
    throw error;
  }
}

export async function isProductInWishlist(customerId: string, productId: string): Promise<boolean> {
  try {
    const { db } = await connectToDatabase();
    const item = await db.collection('wishlist').findOne({
      customerId: new ObjectId(customerId),
      productId: new ObjectId(productId),
    });
    return !!item;
  } catch (error) {
    console.error('[v0] Error checking wishlist:', error);
    return false;
  }
}

export async function getWishlistCount(customerId: string): Promise<number> {
  try {
    const { db } = await connectToDatabase();
    const count = await db.collection('wishlist').countDocuments({
      customerId: new ObjectId(customerId),
    });
    return count;
  } catch (error) {
    console.error('[v0] Error getting wishlist count:', error);
    return 0;
  }
}
