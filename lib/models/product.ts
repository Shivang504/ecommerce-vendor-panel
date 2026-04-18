import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { AttributeSelectionMap } from '@/lib/product-attributes';

export type ProductType = 'Physical Product' | 'Digital Product' | 'External / Affiliate Product';

export interface Product {
  _id?: ObjectId;
  name: string;
  sku: string;
  shortDescription: string;
  longDescription: string;
  category: string;
  subcategory: string;
  brand: string;
  tags: string[]; // Added tags field
  regularPrice: number;
  sellingPrice: number;
  costPrice: number;
  taxRate: number;
  stock: number;
  lowStockThreshold: number;
  allowBackorders: boolean;
  barcode: string;
  weight: number;
  dimensions: string;
  shippingClass: string;
  processingTime: string;
  product_type: ProductType;
  free_shipping: boolean;
  allow_return: boolean;
  return_policy: string;
  metaTitle: string;
  metaDescription: string;
  urlSlug: string; // Added SEO fields
  focusKeyword: string;
  mainImage: string; // Added image and media fields
  galleryImages: string[];
  productVideo: string;
  attributes: AttributeSelectionMap;
  relatedProducts: string[]; // Added related products field
  status: string;
  visibility: string;
  featured: boolean;
  allowReviews: boolean;
  returnPolicyDays: number;
  warrantyPeriod: string;
  vendor: string;
  vendorId?: string;
  createdAt?: Date;
  updatedAt?: Date;
  // New pricing and GST fields
  productCost?: number; // Product Cost (Actual cost that vendor gets)
  forwardLogisticsCost?: number; // Forward Logistics Cost
  paymentGatewayCost?: number; // Payment Gateway Cost
  expectedLoss?: number; // Expected Loss
  targetProfit?: number; // Target Profit
  basePrice?: number; // Base Price (Excl. GST) - auto calculated
  sellingPriceInclGST?: number; // Selling Price (Incl. GST) - final price shown to customer
  bankSettlementAmount?: number; // Estimation Amount for bank Settlement - auto calculated
  hsnSac?: string; // HSN / SAC per product (visible only to vendor)
  cgst?: number; // CGST (auto-calculated)
  sgst?: number; // SGST (auto-calculated)
  igst?: number; // IGST (auto-calculated)
  vendorState?: string; // Vendor state for GST calculation
}

export async function getAllProducts() {
  const { db } = await connectToDatabase();
  return db.collection('products').find({}).toArray();
}

export async function getProductById(id: string) {
  const { db } = await connectToDatabase();
  return db.collection('products').findOne({ _id: new ObjectId(id) });
}

export async function createProduct(product: Omit<Product, '_id'>) {
  const { db } = await connectToDatabase();
  const result = await db.collection('products').insertOne({
    ...product,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return result.insertedId;
}

export async function updateProduct(id: string, product: Partial<Product>) {
  const { db } = await connectToDatabase();
  return db.collection('products').findOneAndUpdate(
    { _id: new ObjectId(id) },
    {
      $set: {
        ...product,
        updatedAt: new Date(),
      },
    },
    { returnDocument: 'after' }
  );
}

export async function deleteProduct(id: string) {
  const { db } = await connectToDatabase();
  return db.collection('products').deleteOne({ _id: new ObjectId(id) });
}
