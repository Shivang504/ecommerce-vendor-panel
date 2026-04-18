import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export interface ComparisonProduct {
  _id?: string | ObjectId;
  customerId: string | ObjectId;
  productIds: (string | ObjectId)[];
  createdAt?: Date;
  updatedAt?: Date;
}

const MAX_COMPARISON_PRODUCTS = 4; // Maximum products that can be compared

// Add product to comparison
export async function addToComparison(customerId: string, productId: string) {
  try {
    const { db } = await connectToDatabase();

    // Get or create comparison for customer
    let comparison = await db.collection('product_comparison').findOne({
      customerId: new ObjectId(customerId),
    });

    const productObjectId = new ObjectId(productId);

    if (!comparison) {
      // Create new comparison
      const newComparison = {
        customerId: new ObjectId(customerId),
        productIds: [productObjectId],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await db.collection('product_comparison').insertOne(newComparison);
      return { success: true, message: 'Product added to comparison', count: 1 };
    }

    // Check if product already in comparison
    const existingProductIds = comparison.productIds.map((id: any) => id.toString());
    if (existingProductIds.includes(productId)) {
      return { success: true, message: 'Product already in comparison', count: existingProductIds.length, alreadyExists: true };
    }

    // Check limit
    if (comparison.productIds.length >= MAX_COMPARISON_PRODUCTS) {
      return { success: false, message: `You can compare maximum ${MAX_COMPARISON_PRODUCTS} products`, count: comparison.productIds.length };
    }

    // Add product
    await db.collection('product_comparison').updateOne(
      { _id: comparison._id },
      {
        $push: { productIds: productObjectId },
        $set: { updatedAt: new Date() },
      }
    );

    return { success: true, message: 'Product added to comparison', count: comparison.productIds.length + 1 };
  } catch (error) {
    console.error('[Comparison] Error adding product:', error);
    throw error;
  }
}

// Remove product from comparison
export async function removeFromComparison(customerId: string, productId: string) {
  try {
    const { db } = await connectToDatabase();

    await db.collection('product_comparison').updateOne(
      { customerId: new ObjectId(customerId) },
      {
        $pull: { productIds: new ObjectId(productId) },
        $set: { updatedAt: new Date() },
      }
    );

    return { success: true, message: 'Product removed from comparison' };
  } catch (error) {
    console.error('[Comparison] Error removing product:', error);
    throw error;
  }
}

// Get comparison products for customer
export async function getComparisonProducts(customerId: string) {
  try {
    const { db } = await connectToDatabase();

    const comparison = await db.collection('product_comparison').findOne({
      customerId: new ObjectId(customerId),
    });

    if (!comparison || !comparison.productIds || comparison.productIds.length === 0) {
      return [];
    }

    // Get products
    const productIds = comparison.productIds.map((id: any) => new ObjectId(id));
    const products = await db
      .collection('products')
      .find({
        _id: { $in: productIds },
        status: 'active',
      })
      .toArray();

    // Create a map for quick lookup
    const productMap = new Map(products.map(p => [p._id.toString(), p]));

    // Return products in the order they were added
    return comparison.productIds
      .map((id: any) => {
        const product = productMap.get(id.toString());
        if (!product) return null;
        return {
          ...product,
          _id: product._id.toString(),
        };
      })
      .filter(Boolean);
  } catch (error) {
    console.error('[Comparison] Error fetching products:', error);
    return [];
  }
}

// Clear comparison for customer
export async function clearComparison(customerId: string) {
  try {
    const { db } = await connectToDatabase();
    await db.collection('product_comparison').deleteOne({
      customerId: new ObjectId(customerId),
    });
    return { success: true, message: 'Comparison cleared' };
  } catch (error) {
    console.error('[Comparison] Error clearing:', error);
    throw error;
  }
}

// Check if product is in comparison
export async function isProductInComparison(customerId: string, productId: string): Promise<boolean> {
  try {
    const { db } = await connectToDatabase();
    const comparison = await db.collection('product_comparison').findOne({
      customerId: new ObjectId(customerId),
      productIds: new ObjectId(productId),
    });
    return !!comparison;
  } catch (error) {
    console.error('[Comparison] Error checking product:', error);
    return false;
  }
}

// Get comparison count
export async function getComparisonCount(customerId: string): Promise<number> {
  try {
    const { db } = await connectToDatabase();
    const comparison = await db.collection('product_comparison').findOne({
      customerId: new ObjectId(customerId),
    });
    return comparison?.productIds?.length || 0;
  } catch (error) {
    console.error('[Comparison] Error getting count:', error);
    return 0;
  }
}

