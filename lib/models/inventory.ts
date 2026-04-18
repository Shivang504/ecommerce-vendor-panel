import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

/**
 * Decrement product stock (variant-wise or product-wise)
 * @param productId - Product ID
 * @param quantity - Quantity to decrement
 * @param variant - Optional variant object (e.g., { "Size": "L", "Color": "Red" })
 * @returns Success status and updated stock
 */
export async function decrementStock(
  productId: string,
  quantity: number,
  variant?: Record<string, string>
): Promise<{ success: boolean; updatedStock?: number; error?: string }> {
  try {
    const { db } = await connectToDatabase();
    
    if (!ObjectId.isValid(productId)) {
      return { success: false, error: 'Invalid product ID' };
    }

    const product = await db.collection('products').findOne({
      _id: new ObjectId(productId),
    });

    if (!product) {
      return { success: false, error: 'Product not found' };
    }

    // If variant is provided, update variant stock
    if (variant && Object.keys(variant).length > 0 && product.variants && Array.isArray(product.variants)) {
      // Find matching variant
      const variantIndex = product.variants.findIndex((v: any) => {
        if (!v.attributeCombination) return false;
        // Check if all variant attributes match
        return Object.keys(variant).every(key => 
          v.attributeCombination[key] === variant[key]
        ) && Object.keys(v.attributeCombination).length === Object.keys(variant).length;
      });

      if (variantIndex >= 0) {
        const currentVariantStock = product.variants[variantIndex].stock || 0;
        
        if (currentVariantStock < quantity) {
          return { 
            success: false, 
            error: `Insufficient stock. Available: ${currentVariantStock}, Requested: ${quantity}` 
          };
        }

        const newVariantStock = currentVariantStock - quantity;
        
        // Update variant stock in array
        const updatedVariants = [...product.variants];
        updatedVariants[variantIndex] = {
          ...updatedVariants[variantIndex],
          stock: newVariantStock,
        };

        await db.collection('products').updateOne(
          { _id: new ObjectId(productId) },
          { 
            $set: { 
              variants: updatedVariants,
              updatedAt: new Date(),
            } 
          }
        );

        return { success: true, updatedStock: newVariantStock };
      } else {
        // Variant not found, use product stock
        console.warn(`[Inventory] Variant not found for product ${productId}, using product stock`);
      }
    }

    // No variant or variant not found - use product stock
    const currentStock = product.stock || 0;
    
    if (currentStock < quantity) {
      return { 
        success: false, 
        error: `Insufficient stock. Available: ${currentStock}, Requested: ${quantity}` 
      };
    }

    const newStock = currentStock - quantity;

    await db.collection('products').updateOne(
      { _id: new ObjectId(productId) },
      { 
        $inc: { stock: -quantity },
        $set: { updatedAt: new Date() },
      }
    );

    return { success: true, updatedStock: newStock };
  } catch (error: any) {
    console.error('[Inventory] Error decrementing stock:', error);
    return { success: false, error: error.message || 'Failed to decrement stock' };
  }
}

/**
 * Increment product stock (variant-wise or product-wise)
 * @param productId - Product ID
 * @param quantity - Quantity to increment
 * @param variant - Optional variant object (e.g., { "Size": "L", "Color": "Red" })
 * @returns Success status and updated stock
 */
export async function incrementStock(
  productId: string,
  quantity: number,
  variant?: Record<string, string>
): Promise<{ success: boolean; updatedStock?: number; error?: string }> {
  try {
    const { db } = await connectToDatabase();
    
    if (!ObjectId.isValid(productId)) {
      return { success: false, error: 'Invalid product ID' };
    }

    const product = await db.collection('products').findOne({
      _id: new ObjectId(productId),
    });

    if (!product) {
      return { success: false, error: 'Product not found' };
    }

    // If variant is provided, update variant stock
    if (variant && Object.keys(variant).length > 0 && product.variants && Array.isArray(product.variants)) {
      // Find matching variant
      const variantIndex = product.variants.findIndex((v: any) => {
        if (!v.attributeCombination) return false;
        // Check if all variant attributes match
        return Object.keys(variant).every(key => 
          v.attributeCombination[key] === variant[key]
        ) && Object.keys(v.attributeCombination).length === Object.keys(variant).length;
      });

      if (variantIndex >= 0) {
        const currentVariantStock = product.variants[variantIndex].stock || 0;
        const newVariantStock = currentVariantStock + quantity;
        
        // Update variant stock in array
        const updatedVariants = [...product.variants];
        updatedVariants[variantIndex] = {
          ...updatedVariants[variantIndex],
          stock: newVariantStock,
        };

        await db.collection('products').updateOne(
          { _id: new ObjectId(productId) },
          { 
            $set: { 
              variants: updatedVariants,
              updatedAt: new Date(),
            } 
          }
        );

        return { success: true, updatedStock: newVariantStock };
      } else {
        // Variant not found, use product stock
        console.warn(`[Inventory] Variant not found for product ${productId}, using product stock`);
      }
    }

    // No variant or variant not found - use product stock
    const currentStock = product.stock || 0;
    const newStock = currentStock + quantity;

    await db.collection('products').updateOne(
      { _id: new ObjectId(productId) },
      { 
        $inc: { stock: quantity },
        $set: { updatedAt: new Date() },
      }
    );

    return { success: true, updatedStock: newStock };
  } catch (error: any) {
    console.error('[Inventory] Error incrementing stock:', error);
    return { success: false, error: error.message || 'Failed to increment stock' };
  }
}

/**
 * Get stock for a product (variant-wise or product-wise)
 * @param productId - Product ID
 * @param variant - Optional variant object
 * @returns Stock quantity
 */
export async function getStock(
  productId: string,
  variant?: Record<string, string>
): Promise<number> {
  try {
    const { db } = await connectToDatabase();
    
    if (!ObjectId.isValid(productId)) {
      return 0;
    }

    const product = await db.collection('products').findOne({
      _id: new ObjectId(productId),
    });

    if (!product) {
      return 0;
    }

    // If variant is provided, get variant stock
    if (variant && Object.keys(variant).length > 0 && product.variants && Array.isArray(product.variants)) {
      const matchingVariant = product.variants.find((v: any) => {
        if (!v.attributeCombination) return false;
        return Object.keys(variant).every(key => 
          v.attributeCombination[key] === variant[key]
        ) && Object.keys(v.attributeCombination).length === Object.keys(variant).length;
      });

      if (matchingVariant) {
        return matchingVariant.stock || 0;
      }
    }

    // No variant or variant not found - return product stock
    return product.stock || 0;
  } catch (error: any) {
    console.error('[Inventory] Error getting stock:', error);
    return 0;
  }
}

