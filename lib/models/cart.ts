import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export interface CartItem {
  _id?: string | ObjectId;
  customerId: string | ObjectId;
  productId: string | ObjectId;
  quantity: number;
  variant?: {
    size?: string;
    color?: string;
    [key: string]: any;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CartItemWithProduct extends CartItem {
  product?: {
    _id: string;
    name: string;
    mainImage?: string;
    sellingPrice?: number;
    price?: number;
    regularPrice?: number;
    stock?: number;
    status?: string;
    urlSlug?: string;
    description?: string;
    shortDescription?: string;
    weight?: number; // Product weight in kg (or grams if > 1000)
    dimensions?: string; // Product dimensions (e.g., "100x100x100")
    taxRate?: number; // Tax rate (GST percentage)
  };
}

export async function getCartByCustomerId(customerId: string) {
  try {
    const { db } = await connectToDatabase();
    const cartItems = await db
      .collection('cart')
      .find({ customerId: new ObjectId(customerId) })
      .sort({ updatedAt: -1 })
      .toArray();
    return cartItems;
  } catch (error) {
    console.error('[v0] Error fetching cart:', error);
    throw error;
  }
}

export async function getCartWithProducts(customerId: string) {
  try {
    const { db } = await connectToDatabase();
    const cartItems = await db
      .collection('cart')
      .aggregate([
        { $match: { customerId: new ObjectId(customerId) } },
        {
          $lookup: {
            from: 'products',
            localField: 'productId',
            foreignField: '_id',
            as: 'product',
          },
        },
        { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            customerId: 1,
            productId: 1,
            quantity: 1,
            variant: 1,
            createdAt: 1,
            updatedAt: 1,
            product: {
              _id: { $toString: '$product._id' },
              name: '$product.name',
              mainImage: '$product.mainImage',
              sellingPrice: '$product.sellingPrice',
              price: '$product.price',
              regularPrice: '$product.regularPrice',
              stock: '$product.stock',
              status: '$product.status',
              urlSlug: '$product.urlSlug',
              description: '$product.description',
              shortDescription: '$product.shortDescription',
              weight: '$product.weight',
              dimensions: '$product.dimensions',
              taxRate: '$product.taxRate', // Tax rate (GST percentage)
              variants: '$product.variants', // Include variants array to check for variant prices
            },
          },
        },
        { $sort: { updatedAt: -1 } },
      ])
      .toArray();

    // Process cart items to use variant price if variant is selected
    const processedItems = cartItems.map((item: any) => {
      const cartItem = item as CartItemWithProduct;
      
      // If cart item has a variant, find matching variant in product and use its price
      if (cartItem.variant && Object.keys(cartItem.variant).length > 0 && cartItem.product && Array.isArray((cartItem.product as any).variants)) {
        const productVariants = (cartItem.product as any).variants;
        const cartVariant = cartItem.variant;
        
        // Find variant that matches all selected attributes (same logic as frontend)
        const matchingVariant = productVariants.find((v: any) => {
          if (!v.attributeCombination) return false;
          
          const variantComb = v.attributeCombination;
          const variantKeys = Object.keys(cartVariant);
          const variantCombKeys = Object.keys(variantComb);
          
          // Must have same number of attributes and all must match
          return (
            variantKeys.length === variantCombKeys.length &&
            variantKeys.every(key => variantComb[key] === cartVariant[key])
          );
        });
        
        // If matching variant found and it has a price, use variant price
        if (matchingVariant && matchingVariant.price !== undefined && matchingVariant.price > 0) {
          // Override sellingPrice with variant price (GST-inclusive)
          cartItem.product.sellingPrice = matchingVariant.price;
          cartItem.product.price = matchingVariant.price;
        }
      }
      
      // Remove variants array from product (not needed in response)
      if (cartItem.product && 'variants' in cartItem.product) {
        delete (cartItem.product as any).variants;
      }
      
      return cartItem;
    });

    return processedItems;
  } catch (error) {
    console.error('[v0] Error fetching cart with products:', error);
    throw error;
  }
}

export async function addToCart(
  customerId: string,
  productId: string,
  quantity: number = 1,
  variant?: { size?: string; color?: string; [key: string]: any }
) {
  try {
    const { db } = await connectToDatabase();

    // Check if product already exists in cart
    // First, find all items for this customer and product
    const allItems = await db.collection('cart').find({
      customerId: new ObjectId(customerId),
      productId: new ObjectId(productId),
    }).toArray();

    // Find matching item based on variant
    let existingItem = null;
    if (variant && Object.keys(variant).length > 0) {
      // If variant is provided, find exact match
      existingItem = allItems.find(item => {
        const itemVariant = item.variant || {};
        return JSON.stringify(itemVariant) === JSON.stringify(variant);
      });
    } else {
      // If no variant, find item with no variant or empty variant
      existingItem = allItems.find(item => {
        const itemVariant = item.variant;
        return !itemVariant || 
               Object.keys(itemVariant).length === 0 || 
               JSON.stringify(itemVariant) === '{}';
      });
    }

    if (existingItem) {
      // Update quantity if item already exists
      const newQuantity = (existingItem.quantity || 1) + quantity;
      await db.collection('cart').updateOne(
        { _id: existingItem._id },
        {
          $set: {
            quantity: newQuantity,
            updatedAt: new Date(),
          },
        }
      );
      return { success: true, updated: true, _id: existingItem._id };
    }

    // Add new item to cart
    const cartItem: any = {
      customerId: new ObjectId(customerId),
      productId: new ObjectId(productId),
      quantity,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // Only add variant field if it has values
    if (variant && Object.keys(variant).length > 0) {
      cartItem.variant = variant;
    }

    const result = await db.collection('cart').insertOne(cartItem);
    return { success: true, updated: false, _id: result.insertedId };
  } catch (error) {
    console.error('[v0] Error adding to cart:', error);
    throw error;
  }
}

export async function updateCartItem(
  customerId: string,
  cartItemId: string,
  quantity: number
) {
  try {
    const { db } = await connectToDatabase();

    if (quantity <= 0) {
      // Remove item if quantity is 0 or less
      await db.collection('cart').deleteOne({
        _id: new ObjectId(cartItemId),
        customerId: new ObjectId(customerId),
      });
      return { success: true, deleted: true };
    }

    const result = await db.collection('cart').updateOne(
      {
        _id: new ObjectId(cartItemId),
        customerId: new ObjectId(customerId),
      },
      {
        $set: {
          quantity,
          updatedAt: new Date(),
        },
      }
    );

    return { success: true, updated: result.modifiedCount > 0 };
  } catch (error) {
    console.error('[v0] Error updating cart item:', error);
    throw error;
  }
}

export async function removeFromCart(customerId: string, cartItemId: string) {
  try {
    const { db } = await connectToDatabase();
    const result = await db.collection('cart').deleteOne({
      _id: new ObjectId(cartItemId),
      customerId: new ObjectId(customerId),
    });

    return { success: true, deletedCount: result.deletedCount };
  } catch (error) {
    console.error('[v0] Error removing from cart:', error);
    throw error;
  }
}

export async function clearCart(customerId: string) {
  try {
    const { db } = await connectToDatabase();
    const result = await db.collection('cart').deleteMany({
      customerId: new ObjectId(customerId),
    });

    return { success: true, deletedCount: result.deletedCount };
  } catch (error) {
    console.error('[v0] Error clearing cart:', error);
    throw error;
  }
}

export async function getCartCount(customerId: string): Promise<number> {
  try {
    const { db } = await connectToDatabase();
    const result = await db
      .collection('cart')
      .aggregate([
        { $match: { customerId: new ObjectId(customerId) } },
        { $group: { _id: null, totalQuantity: { $sum: '$quantity' } } },
      ])
      .toArray();

    return result.length > 0 ? result[0].totalQuantity : 0;
  } catch (error) {
    console.error('[v0] Error getting cart count:', error);
    return 0;
  }
}

export async function getCartItem(customerId: string, productId: string, variant?: any) {
  try {
    const { db } = await connectToDatabase();
    
    // Find all items for this customer and product
    const allItems = await db.collection('cart').find({
      customerId: new ObjectId(customerId),
      productId: new ObjectId(productId),
    }).toArray();

    // Find matching item based on variant
    if (variant && Object.keys(variant).length > 0) {
      // If variant is provided, find exact match
      return allItems.find(item => {
        const itemVariant = item.variant || {};
        return JSON.stringify(itemVariant) === JSON.stringify(variant);
      }) || null;
    } else {
      // If no variant, find item with no variant or empty variant
      return allItems.find(item => {
        const itemVariant = item.variant;
        return !itemVariant || 
               Object.keys(itemVariant).length === 0 || 
               JSON.stringify(itemVariant) === '{}';
      }) || null;
    }
  } catch (error) {
    console.error('[v0] Error getting cart item:', error);
    return null;
  }
}

