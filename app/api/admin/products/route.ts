import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getUserFromRequest, isVendor } from '@/lib/auth';
import { sanitizeAttributeSelections } from '@/lib/product-attributes';
import { ObjectId } from 'mongodb';

const normalizeProductPayload = (payload: any) => {
  if (!payload || typeof payload !== 'object') {
    return payload;
  }

  return {
    ...payload,
    wholesalePriceType: payload.wholesalePriceType || 'Fixed',
    sizeChartImage: payload.sizeChartImage ?? '',
    jewelleryWeight: typeof payload.jewelleryWeight === 'number' ? payload.jewelleryWeight : 0,
    jewelleryPurity: payload.jewelleryPurity ?? '',
    jewelleryMakingCharges:
      typeof payload.jewelleryMakingCharges === 'number' ? payload.jewelleryMakingCharges : 0,
    jewelleryStoneDetails: payload.jewelleryStoneDetails ?? '',
    jewelleryCertification: payload.jewelleryCertification ?? '',
    attributes: sanitizeAttributeSelections(payload.attributes),
  };
};

/**
 * PERFORMANCE NOTES:
 * For optimal performance, ensure these MongoDB indexes exist:
 * 
 * db.products.createIndex({ vendorId: 1, status: 1, createdAt: -1 })
 * db.products.createIndex({ status: 1, createdAt: -1 })
 * db.products.createIndex({ createdAt: -1 })
 * db.products.createIndex({ trending: 1 })
 * db.products.createIndex({ bestSeller: 1 })
 * db.products.createIndex({ featured: 1 })
 * db.vendors.createIndex({ _id: 1, storeName: 1 })
 */

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

export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const { searchParams } = new URL(request.url);
    
    // Get current user from token
    const currentUser = getUserFromRequest(request);
    
    // Build query based on user role
    const query: any = {};
    if (currentUser && isVendor(currentUser)) {
      // Vendors only see their own products
      // Handle both string and ObjectId formats for vendorId (products are stored with string vendorId)
      const vendorId = currentUser.id;
      if (ObjectId.isValid(vendorId)) {
        // Try both ObjectId and string formats to handle database inconsistencies
        query.$or = [
          { vendorId: new ObjectId(vendorId) },
          { vendorId: vendorId.toString() }
        ];
      } else {
        query.vendorId = vendorId;
      }
      console.log('[Products API] Vendor filter applied for vendorId:', vendorId);
    }

    // Add filtering based on query parameters
    // Note: These filters will work with $or (if vendor query is active) because MongoDB
    // applies additional filters to all $or branches
    if (searchParams.get('status')) {
      query.status = searchParams.get('status');
    }

    if (searchParams.get('trending') === 'true') {
      query.trending = true;
    }

    if (searchParams.get('bestSeller') === 'true') {
      query.bestSeller = true;
    }

    if (searchParams.get('featured') === 'true') {
      query.featured = true;
    }
    
    console.log('[Products API] Final query:', JSON.stringify(query, null, 2));

    // Build sort options
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;
    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder;
    if (sortBy !== '_id') {
      sortOptions._id = -1; // Secondary sort for consistency
    }

    // Get pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Use projection to limit fields fetched from products (improves performance)
    // Only include fields needed for list view - MongoDB projection with 1 (include) only
    const projection: any = {
      name: 1,
      sku: 1,
      category: 1,
      subcategory: 1,
      brand: 1,
      vendor: 1,
      vendorId: 1,
      sellingPrice: 1,
      regularPrice: 1,
      stock: 1,
      status: 1,
      trending: 1,
      bestSeller: 1,
      featured: 1,
      mainImage: 1,
      product_type: 1,
      free_shipping: 1,
      allow_return: 1,
      createdAt: 1,
      updatedAt: 1,
      visibility: 1,
    };

    const startTime = Date.now();
    console.log('[Products API] Query:', JSON.stringify(query));
    console.log('[Products API] Sort:', JSON.stringify(sortOptions), 'Skip:', skip, 'Limit:', limit);
    
    // Fetch products with timeout and ensure index usage
    // Use hint to force MongoDB to use the createdAt index for sorting
    const findOptions: any = { projection, maxTimeMS: 8000 };
    
    // Add hint for createdAt index if sorting by createdAt
    if (sortBy === 'createdAt') {
      findOptions.hint = { createdAt: -1 };
    }
    
    const products = await db
      .collection('products')
      .find(query, findOptions)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .toArray();
    
    const queryTime = Date.now() - startTime;
    console.log(`[Products API] Query executed in ${queryTime}ms, found ${products.length} products`);
    
    // Skip countDocuments completely - it's too slow (30-50s) on large collections
    // Use smart estimate instead based on returned products
    let total: number;
    if (products.length === 0) {
      // No products on this page
      total = (page - 1) * limit;
    } else if (products.length < limit) {
      // Last page - we know exact count
      total = (page - 1) * limit + products.length;
      console.log(`[Products API] Last page - exact total: ${total}`);
    } else {
      // Not last page - estimate there are more (exact count not critical for pagination)
      total = page * limit + 1; // Show there are more products
      console.log(`[Products API] Using estimated total: ${total} (got full page of ${products.length})`);
    }
    
    // Serialize products with minimal processing for list view
    // Skip vendor lookup - use vendor field already stored in products (faster)
    const serializedProducts = products.map(p => ({
      _id: p._id?.toString(),
      name: p.name,
      sku: p.sku,
      category: p.category,
      subcategory: p.subcategory,
      brand: p.brand,
      vendor: p.vendor || 'Main Store', // Use existing vendor field (already populated when product was created)
      vendorId: p.vendorId ? (typeof p.vendorId === 'string' ? p.vendorId : p.vendorId.toString()) : undefined,
      sellingPrice: p.sellingPrice,
      regularPrice: p.regularPrice,
      stock: p.stock,
      status: p.status,
      trending: p.trending,
      bestSeller: p.bestSeller,
      featured: p.featured,
      mainImage: p.mainImage,
      product_type: p.product_type,
      free_shipping: p.free_shipping,
      allow_return: p.allow_return,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      visibility: p.visibility,
    }));
    
    const totalTime = Date.now() - startTime;
    console.log(`[Products API] Total processing time: ${totalTime}ms`);

    return NextResponse.json({
      products: serializedProducts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('[v0] Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const rawBody = await request.json();
    const body = normalizeProductPayload(rawBody);

    const jewelleryValidationError = validateJewelleryPayload(body);
    if (jewelleryValidationError) {
      return NextResponse.json({ error: jewelleryValidationError }, { status: 400 });
    }
    
    // Get current user from token
    const currentUser = getUserFromRequest(request);
    
    // If vendor, automatically set vendorId
    if (currentUser && isVendor(currentUser)) {
      body.vendorId = currentUser.id;
    }

    const productToCreate = {
      ...body,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('products').insertOne(productToCreate);

    return NextResponse.json(
      { _id: result.insertedId.toString(), ...productToCreate },
      { status: 201 }
    );
  } catch (error) {
    console.error('[v0] Error creating product:', error);
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}
