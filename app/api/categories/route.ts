import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const { searchParams } = new URL(request.url);
    
    // Build query for public categories (only active categories by default)
    const query: any = {};
    
    // Allow filtering by status (default to active for public API)
    const status = searchParams.get('status') || 'active';
    if (status !== 'all') {
      query.status = status;
    }

    // Get limit for pagination
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 0;

    // Build sort options (default by position, then name)
    const sortBy = searchParams.get('sortBy') || 'position';
    const sortOrder = searchParams.get('sortOrder') === 'desc' ? -1 : 1;
    const sortOptions: any = {};
    
    // Always sort by position first, then by the requested field
    if (sortBy !== 'position') {
      sortOptions.position = 1;
      sortOptions[sortBy] = sortOrder;
    } else {
      sortOptions.position = sortOrder;
      sortOptions.name = 1; // Secondary sort by name
    }

    let categoriesQuery = db.collection('categories').find(query).sort(sortOptions);
    
    if (limit > 0) {
      categoriesQuery = categoriesQuery.limit(limit);
    }

    const categories = await categoriesQuery.toArray();
    
    // Serialize categories for JSON response
    const serializedCategories = categories.map(c => ({
      ...c,
      _id: c._id?.toString(),
    }));
    
    return NextResponse.json(serializedCategories);
  } catch (error) {
    console.error('[v0] Failed to fetch categories:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}
