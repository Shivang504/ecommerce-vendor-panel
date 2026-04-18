import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export interface StockAlert {
  _id?: string | ObjectId;
  customerId: string | ObjectId;
  productId: string | ObjectId;
  email: string;
  phone?: string;
  notified: boolean;
  notifiedAt?: Date;
  createdAt?: Date;
}

// Add stock alert
export async function addStockAlert(customerId: string, productId: string, email: string, phone?: string) {
  try {
    const { db } = await connectToDatabase();

    // Check if alert already exists
    const existing = await db.collection('stock_alerts').findOne({
      customerId: new ObjectId(customerId),
      productId: new ObjectId(productId),
    });

    if (existing) {
      return { success: true, message: 'Stock alert already exists', existing: true };
    }

    // Check product stock
    const product = await db.collection('products').findOne({
      _id: new ObjectId(productId),
    });

    if (!product) {
      throw new Error('Product not found');
    }

    // If product is in stock, don't create alert
    if (product.stock && product.stock > 0) {
      return { success: false, message: 'Product is already in stock', inStock: true };
    }

    // Create alert
    const alert = {
      customerId: new ObjectId(customerId),
      productId: new ObjectId(productId),
      email,
      phone: phone || '',
      notified: false,
      createdAt: new Date(),
    };

    await db.collection('stock_alerts').insertOne(alert);

    return { success: true, message: 'Stock alert created successfully', existing: false };
  } catch (error) {
    console.error('[Stock Alert] Error adding alert:', error);
    throw error;
  }
}

// Remove stock alert
export async function removeStockAlert(customerId: string, productId: string) {
  try {
    const { db } = await connectToDatabase();

    await db.collection('stock_alerts').deleteOne({
      customerId: new ObjectId(customerId),
      productId: new ObjectId(productId),
    });

    return { success: true, message: 'Stock alert removed' };
  } catch (error) {
    console.error('[Stock Alert] Error removing alert:', error);
    throw error;
  }
}

// Get stock alerts for customer
export async function getStockAlerts(customerId: string) {
  try {
    const { db } = await connectToDatabase();

    const alerts = await db
      .collection('stock_alerts')
      .find({ customerId: new ObjectId(customerId) })
      .sort({ createdAt: -1 })
      .toArray();

    // Get product IDs
    const productIds = alerts.map(a => new ObjectId(a.productId));

    // Fetch products
    const products = await db
      .collection('products')
      .find({
        _id: { $in: productIds },
      })
      .toArray();

    // Create a map for quick lookup
    const productMap = new Map(products.map(p => [p._id.toString(), p]));

    // Return alerts with product details
    return alerts
      .map(alert => {
        const product = productMap.get(alert.productId.toString());
        if (!product) return null;
        return {
          ...alert,
          _id: alert._id.toString(),
          productId: alert.productId.toString(),
          customerId: alert.customerId.toString(),
          product: {
            ...product,
            _id: product._id.toString(),
          },
        };
      })
      .filter(Boolean);
  } catch (error) {
    console.error('[Stock Alert] Error fetching alerts:', error);
    return [];
  }
}

// Check if product has stock alert
export async function hasStockAlert(customerId: string, productId: string): Promise<boolean> {
  try {
    const { db } = await connectToDatabase();
    const alert = await db.collection('stock_alerts').findOne({
      customerId: new ObjectId(customerId),
      productId: new ObjectId(productId),
    });
    return !!alert;
  } catch (error) {
    console.error('[Stock Alert] Error checking alert:', error);
    return false;
  }
}

// Get products that need stock alert notifications
export async function getProductsNeedingStockNotification() {
  try {
    const { db } = await connectToDatabase();

    // Get all active stock alerts
    const alerts = await db
      .collection('stock_alerts')
      .find({ notified: false })
      .toArray();

    if (alerts.length === 0) {
      return [];
    }

    // Get product IDs
    const productIds = alerts.map(a => new ObjectId(a.productId));

    // Fetch products that are now in stock
    const products = await db
      .collection('products')
      .find({
        _id: { $in: productIds },
        status: 'active',
        stock: { $gt: 0 },
      })
      .toArray();

    // Match alerts with products
    const productMap = new Map(products.map(p => [p._id.toString(), p]));

    return alerts
      .map(alert => {
        const product = productMap.get(alert.productId.toString());
        if (!product) return null;
        return {
          alert: {
            ...alert,
            _id: alert._id.toString(),
            customerId: alert.customerId.toString(),
            productId: alert.productId.toString(),
          },
          product: {
            ...product,
            _id: product._id.toString(),
          },
        };
      })
      .filter(Boolean);
  } catch (error) {
    console.error('[Stock Alert] Error fetching products needing notification:', error);
    return [];
  }
}

// Mark stock alert as notified
export async function markStockAlertAsNotified(alertId: string) {
  try {
    const { db } = await connectToDatabase();
    await db.collection('stock_alerts').updateOne(
      { _id: new ObjectId(alertId) },
      {
        $set: {
          notified: true,
          notifiedAt: new Date(),
        },
      }
    );
  } catch (error) {
    console.error('[Stock Alert] Error marking as notified:', error);
    throw error;
  }
}

