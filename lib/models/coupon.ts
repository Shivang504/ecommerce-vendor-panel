import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export interface Coupon {
  _id?: string | ObjectId;
  title: string;
  description: string;
  code: string;
  type: 'percentage' | 'fixed';
  amount: number;
  maxDiscountAmount?: number | null;
  startDate?: Date | null;
  endDate?: Date | null;
  isExpired?: boolean;
  isFirstOrder?: boolean;
  status: boolean;
  applyToAllProducts: boolean;
  products: string[];
  minimumSpend: number;
  isUnlimited: boolean;
  usagePerCoupon: number;
  usagePerCustomer: number;
  usageCount?: number;
  vendorId?: string | null; // null for admin-created coupons, vendor ID for vendor-created coupons
  createdAt?: Date;
  updatedAt?: Date;
}

// Get coupon by code
export async function getCouponByCode(code: string) {
  try {
    const { db } = await connectToDatabase();
    const coupon = await db.collection('coupons').findOne({
      code: { $regex: new RegExp(`^${code}$`, 'i') },
    });

    if (!coupon) {
      return null;
    }

    return {
      ...coupon,
      _id: coupon._id.toString(),
    } as Coupon;
  } catch (error) {
    console.error('[Coupon] Error fetching coupon:', error);
    throw error;
  }
}

// Get coupon by ID
export async function getCouponById(couponId: string) {
  try {
    const { db } = await connectToDatabase();
    
    if (!ObjectId.isValid(couponId)) {
      return null;
    }

    const coupon = await db.collection('coupons').findOne({
      _id: new ObjectId(couponId),
    });

    if (!coupon) {
      return null;
    }

    return {
      ...coupon,
      _id: coupon._id.toString(),
    } as Coupon;
  } catch (error) {
    console.error('[Coupon] Error fetching coupon:', error);
    throw error;
  }
}

// Get customer's order count
export async function getCustomerOrderCount(customerId: string) {
  try {
    const { db } = await connectToDatabase();
    const count = await db.collection('orders').countDocuments({
      customerId: customerId,
      paymentStatus: { $in: ['paid', 'completed'] },
    });
    return count;
  } catch (error) {
    console.error('[Coupon] Error fetching customer order count:', error);
    return 0;
  }
}

// Get customer's usage count for a coupon
export async function getCustomerCouponUsage(customerId: string, couponCode: string) {
  try {
    const { db } = await connectToDatabase();
    const count = await db.collection('orders').countDocuments({
      customerId: customerId,
      'coupon.code': { $regex: new RegExp(`^${couponCode}$`, 'i') },
      paymentStatus: { $in: ['paid', 'completed'] },
    });
    return count;
  } catch (error) {
    console.error('[Coupon] Error fetching customer coupon usage:', error);
    return 0;
  }
}

// Get coupon usage count
export async function getCouponUsageCount(couponCode: string) {
  try {
    const { db } = await connectToDatabase();
    const count = await db.collection('orders').countDocuments({
      'coupon.code': { $regex: new RegExp(`^${couponCode}$`, 'i') },
      paymentStatus: { $in: ['paid', 'completed'] },
    });
    return count;
  } catch (error) {
    console.error('[Coupon] Error fetching coupon usage count:', error);
    return 0;
  }
}

// Validate coupon for a cart
export interface CouponValidationResult {
  valid: boolean;
  error?: string;
  coupon?: Coupon;
  discount?: number;
  discountAmount?: number;
}

export async function validateCoupon(
  code: string,
  cartItems: Array<{ productId: string; quantity: number; price: number }>,
  customerId?: string,
  subtotal: number = 0
): Promise<CouponValidationResult> {
  try {
    // Get coupon
    const coupon = await getCouponByCode(code);
    
    if (!coupon) {
      return {
        valid: false,
        error: 'Invalid coupon code',
      };
    }

    // Check if coupon is active
    if (!coupon.status) {
      return {
        valid: false,
        error: 'This coupon is not active',
      };
    }

    if (coupon.isExpired) {
      return {
        valid: false,
        error: 'This coupon has expired',
      };
    }

    // Check date validity
    const now = new Date();
    if (coupon.startDate && new Date(coupon.startDate) > now) {
      return {
        valid: false,
        error: 'This coupon is not yet valid',
      };
    }

    if (coupon.endDate && new Date(coupon.endDate) < now) {
      return {
        valid: false,
        error: 'This coupon has expired',
      };
    }

    // Check minimum spend
    if (subtotal < coupon.minimumSpend) {
      return {
        valid: false,
        error: `Minimum order value of ₹${coupon.minimumSpend} is required for this coupon`,
      };
    }

    // Check first order restriction
    if (coupon.isFirstOrder && customerId) {
      const orderCount = await getCustomerOrderCount(customerId);
      if (orderCount > 0) {
        return {
          valid: false,
          error: 'This coupon is only valid for first-time customers',
        };
      }
    }

    // Check product restrictions
    if (!coupon.applyToAllProducts && coupon.products.length > 0) {
      const cartProductIds = cartItems.map(item => item.productId);
      const hasValidProduct = cartProductIds.some(productId => 
        coupon.products.some(cp => cp.toString() === productId.toString())
      );

      if (!hasValidProduct) {
        return {
          valid: false,
          error: 'This coupon is not applicable to products in your cart',
        };
      }
    }

    // Check usage limits
    if (!coupon.isUnlimited) {
      // Check total coupon usage
      const usageCount = await getCouponUsageCount(coupon.code);
      if (usageCount >= coupon.usagePerCoupon) {
        return {
          valid: false,
          error: 'This coupon has reached its usage limit',
        };
      }

      // Check customer-specific usage
      if (customerId) {
        const customerUsage = await getCustomerCouponUsage(customerId, coupon.code);
        if (customerUsage >= coupon.usagePerCustomer) {
          return {
            valid: false,
            error: 'You have already used this coupon the maximum number of times',
          };
        }
      }
    }

    // Calculate discount
    let discountAmount = 0;
    
    // Determine applicable subtotal (all products or specific products)
    let applicableSubtotal = subtotal;
    if (!coupon.applyToAllProducts && coupon.products.length > 0) {
      applicableSubtotal = cartItems
        .filter(item => coupon.products.some(cp => cp.toString() === item.productId.toString()))
        .reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }

    if (coupon.type === 'percentage') {
      discountAmount = (applicableSubtotal * coupon.amount) / 100;
      // Apply maximum discount limit for percentage coupons
      if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
        discountAmount = coupon.maxDiscountAmount;
      }
    } else {
      discountAmount = coupon.amount;
      // Fixed amount discount cannot exceed subtotal
      if (discountAmount > applicableSubtotal) {
        discountAmount = applicableSubtotal;
      }
    }

    return {
      valid: true,
      coupon,
      discount: coupon.type === 'percentage' ? coupon.amount : undefined,
      discountAmount: Math.round(discountAmount * 100) / 100, // Round to 2 decimal places
    };
  } catch (error) {
    console.error('[Coupon] Error validating coupon:', error);
    return {
      valid: false,
      error: 'An error occurred while validating the coupon',
    };
  }
}

// Increment coupon usage count
export async function incrementCouponUsage(couponId: string) {
  try {
    const { db } = await connectToDatabase();
    
    if (!ObjectId.isValid(couponId)) {
      return;
    }

    await db.collection('coupons').updateOne(
      { _id: new ObjectId(couponId) },
      {
        $inc: { usageCount: 1 },
        $set: { updatedAt: new Date() },
      }
    );
  } catch (error) {
    console.error('[Coupon] Error incrementing coupon usage:', error);
  }
}
