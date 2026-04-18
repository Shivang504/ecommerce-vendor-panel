import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export interface RecentlyViewedProduct {
  _id?: string | ObjectId;
  customerId: string | ObjectId;
  productId: string | ObjectId;
  viewedAt: Date;
  createdAt?: Date;
}

// Add product to recently viewed
export async function addToRecentlyViewed(customerId: string, productId: string) {
  try {
    const { db } = await connectToDatabase();

    // Remove existing entry if exists
    await db.collection('recently_viewed').deleteOne({
      customerId: new ObjectId(customerId),
      productId: new ObjectId(productId),
    });

    // Add new entry
    const entry = {
      customerId: new ObjectId(customerId),
      productId: new ObjectId(productId),
      viewedAt: new Date(),
      createdAt: new Date(),
    };

    await db.collection('recently_viewed').insertOne(entry);
  } catch (error) {
    console.error('[Recently Viewed] Error adding product:', error);
    // Don't throw - this is a non-critical feature
  }
}

// Get recently viewed products for customer
export async function getRecentlyViewedProducts(customerId: string, limit: number = 20) {
  try {
    const { db } = await connectToDatabase();

    const entries = await db
      .collection('recently_viewed')
      .find({ customerId: new ObjectId(customerId) })
      .sort({ viewedAt: -1 })
      .limit(limit)
      .toArray();

    // Get product IDs
    const productIds = entries.map(e => new ObjectId(e.productId));

    // Fetch products
    const products = await db
      .collection('products')
      .find({
        _id: { $in: productIds },
        status: 'active',
      })
      .toArray();

    // Create a map for quick lookup
    const productMap = new Map(products.map(p => [p._id.toString(), p]));

    // Return products in the order they were viewed
    return entries
      .map(entry => {
        const product = productMap.get(entry.productId.toString());
        if (!product) return null;
        return {
          ...product,
          _id: product._id.toString(),
          viewedAt: entry.viewedAt,
        };
      })
      .filter(Boolean);
  } catch (error) {
    console.error('[Recently Viewed] Error fetching products:', error);
    return [];
  }
}

// Clear recently viewed for customer
export async function clearRecentlyViewed(customerId: string) {
  try {
    const { db } = await connectToDatabase();
    await db.collection('recently_viewed').deleteMany({
      customerId: new ObjectId(customerId),
    });
  } catch (error) {
    console.error('[Recently Viewed] Error clearing:', error);
    throw error;
  }
}

