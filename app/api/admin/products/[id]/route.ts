import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { getUserFromRequest, isVendor } from '@/lib/auth';
import { mongoWriteErrorMessage, normalizeProductPayload } from '@/lib/product-payload';
import { sanitizeAttributeSelections } from '@/lib/product-attributes';

const normalizeId = (value: unknown): string => {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (value instanceof ObjectId) return value.toString();
  return String(value);
};

const vendorOwnsProduct = (productVendorId: unknown, userId: string): boolean => {
  const normalizedProductVendorId = normalizeId(productVendorId);
  const normalizedUserId = normalizeId(userId);
  if (!normalizedProductVendorId || !normalizedUserId) return true;
  return normalizedProductVendorId === normalizedUserId;
};

const serializeProductForResponse = (product: Record<string, unknown>) => ({
  ...JSON.parse(
    JSON.stringify(product, (_key, value) => {
      if (value instanceof ObjectId) return value.toString();
      if (value instanceof Date) return value.toISOString();
      return value;
    })
  ),
  _id: normalizeId(product._id),
  vendorId: product.vendorId != null ? normalizeId(product.vendorId) : undefined,
  tags: Array.isArray(product.tags) ? product.tags : [],
  galleryImages: Array.isArray(product.galleryImages) ? product.galleryImages : [],
  relatedProducts: Array.isArray(product.relatedProducts)
    ? product.relatedProducts.map(item => normalizeId(item))
    : [],
  attributes: sanitizeAttributeSelections(product.attributes),
});

const validateJewelleryPayload = (payload: any) => {
  if (!payload || payload.product_type !== 'Jewellery') {
    return null;
  }

  const errors: string[] = [];
  if (!(typeof payload.jewelleryWeight === 'number' && payload.jewelleryWeight > 0)) {
    errors.push('weight (grams)');
  }
  if (!payload.jewelleryPurity) {
    errors.push('purity');
  }
  if (!(typeof payload.jewelleryMakingCharges === 'number' && payload.jewelleryMakingCharges > 0)) {
    errors.push('making charges');
  }

  if (errors.length) {
    return `Jewellery products require: ${errors.join(', ')}`;
  }

  return null;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    
    // Get current user from token
    const currentUser = getUserFromRequest(request);
    
    const product = await db.collection('products').findOne({ _id: new ObjectId(id) });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    
    // Check if vendor is trying to access another vendor's product
    if (currentUser && isVendor(currentUser) && !vendorOwnsProduct(product.vendorId, currentUser.id)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const productData = serializeProductForResponse(product as Record<string, unknown>);
    
    console.log('[v0] Returning product data for id:', id);

    return NextResponse.json(productData);
  } catch (error) {
    console.error('[v0] Error fetching product:', error);
    const details = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Failed to fetch product',
        ...(process.env.NODE_ENV === 'development' ? { details } : {}),
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    console.log('[v0] PUT request for product ID:', id);
    
    if (!ObjectId.isValid(id)) {
      console.log('[v0] Invalid product ID format:', id);
      return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const body = await request.json();
    
    console.log('[v0] Update data received:', body);

    const { _id, id: bodyId, createdAt, updatedAt, ...updateData } = body;
    
    // If only status is being updated, skip validation
    const isStatusOnlyUpdate = Object.keys(updateData).length === 1 && 'status' in updateData;
    const normalizedUpdateData = isStatusOnlyUpdate ? updateData : normalizeProductPayload(updateData);
    const isDraftSave = normalizedUpdateData.status === 'draft';
    
    if (!isStatusOnlyUpdate && !isDraftSave) {
      const requiredFields = ['name', 'sku', 'shortDescription', 'longDescription', 'category'];
      const missingFields = requiredFields.filter(field => !normalizedUpdateData[field]);
      if (missingFields.length > 0) {
        console.log('[v0] Missing required fields:', missingFields);
        return NextResponse.json(
          { error: `Missing required fields: ${missingFields.join(', ')}` },
          { status: 400 }
        );
      }
      
      const jewelleryValidationError = validateJewelleryPayload(normalizedUpdateData);
      if (jewelleryValidationError) {
        return NextResponse.json({ error: jewelleryValidationError }, { status: 400 });
      }
    }

    const existingProduct = await db.collection('products').findOne({ _id: new ObjectId(id) });
    
    if (!existingProduct) {
      console.log('[v0] Product not found with ID:', id);
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    
    // Get current user and check vendor access
    const currentUser = getUserFromRequest(request);
    if (currentUser && isVendor(currentUser) && !vendorOwnsProduct(existingProduct.vendorId, currentUser.id)) {
      console.log('[v0] Vendor trying to update another vendor\'s product');
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    

    const result = await db.collection('products').updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...normalizedUpdateData, updatedAt: new Date() } }
    );

    console.log('[v0] Update result:', result);

    if (result.matchedCount === 0) {
      console.log('[v0] No product matched for update');
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const updatedProduct = await db.collection('products').findOne({ _id: new ObjectId(id) });
    
    console.log('[v0] Successfully updated product');

    return NextResponse.json({ 
      _id: updatedProduct!._id.toString(), 
      ...updatedProduct 
    });
  } catch (error) {
    console.error('[v0] Error updating product:', error);
    const duplicateMsg = mongoWriteErrorMessage(error);
    if (duplicateMsg) {
      return NextResponse.json({ error: duplicateMsg }, { status: 409 });
    }
    const errorMessage = error instanceof Error ? error.message : 'Failed to update product';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { db } = await connectToDatabase();
    
    // Get current user and check vendor access
    const currentUser = getUserFromRequest(request);
    
    // Check if product exists and vendor owns it
    const existingProduct = await db.collection('products').findOne({ _id: new ObjectId(id) });
    if (!existingProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    
    if (currentUser && isVendor(currentUser) && !vendorOwnsProduct(existingProduct.vendorId, currentUser.id)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const result = await db.collection('products').deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Product deleted' });
  } catch (error) {
    console.error('[v0] Error deleting product:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
