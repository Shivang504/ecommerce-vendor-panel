import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';

// Cache categories for 1 minute (reduced for faster position updates)
export const revalidate = 60;

export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'active';

    // Fetch main categories
    const categories = await db
      .collection('categories')
      .find({ status, parentId: { $in: [null, '', undefined] } })
      .sort({ position: 1, displayOrder: 1 })
      .toArray();

    // Fetch all subcategories and child categories in parallel for better performance
    const categoryIds = categories.map(cat => cat._id);
    
    const [subcategories, childCategories] = await Promise.all([
      // Fetch all subcategories for these categories
      categoryIds.length > 0
        ? db
            .collection('subcategories')
            .find({ 
              categoryId: { $in: categoryIds },
              status: status 
            })
            .sort({ position: 1 })
            .toArray()
        : Promise.resolve([]),
      // Pre-fetch child categories (we'll filter by subcategoryIds later)
      db
        .collection('childcategories')
        .find({ status })
        .sort({ position: 1 })
        .toArray(),
    ]);

    // Filter child categories by subcategoryIds after fetching
    const subcategoryIds = subcategories.map(sub => sub._id);
    const filteredChildCategories = childCategories.filter(child => 
      subcategoryIds.some(subId => subId.toString() === child.subcategoryId?.toString())
    );

    // Build hierarchy
    const categoryMap = new Map();
    const subcategoryMap = new Map();

    // Map categories
    categories.forEach(cat => {
      categoryMap.set(cat._id.toString(), {
        _id: cat._id.toString(),
        name: cat.name,
        slug: cat.slug,
        subcategories: [],
      });
    });

    // Map subcategories to categories
    subcategories.forEach(sub => {
      const categoryId = sub.categoryId?.toString();
      if (categoryMap.has(categoryId)) {
        const subcatData = {
          _id: sub._id.toString(),
          name: sub.name,
          slug: sub.slug,
          categoryId: categoryId,
          position: sub.position || 0,
          childCategories: [],
        };
        categoryMap.get(categoryId).subcategories.push(subcatData);
        subcategoryMap.set(sub._id.toString(), subcatData);
      }
    });

    // Map child categories to subcategories
    filteredChildCategories.forEach(child => {
      const subcategoryId = child.subcategoryId?.toString();
      if (subcategoryMap.has(subcategoryId)) {
        subcategoryMap.get(subcategoryId).childCategories.push({
          _id: child._id.toString(),
          name: child.name,
          slug: child.slug,
          subcategoryId: subcategoryId,
          categoryId: child.categoryId?.toString(),
          position: child.position || 0,
        });
      }
    });

    // Sort subcategories by position within each category
    categoryMap.forEach(category => {
      category.subcategories.sort((a: any, b: any) => (a.position || 0) - (b.position || 0));
      
      // Sort child categories by position within each subcategory
      category.subcategories.forEach((subcat: any) => {
        subcat.childCategories.sort((a: any, b: any) => (a.position || 0) - (b.position || 0));
      });
    });

    // Convert map to array and ensure categories are sorted by position
    const result = Array.from(categoryMap.values()).sort((a: any, b: any) => {
      // Get position from original categories array
      const aPos = categories.find(cat => cat._id.toString() === a._id)?.position || 0;
      const bPos = categories.find(cat => cat._id.toString() === b._id)?.position || 0;
      return aPos - bPos;
    });

    const response = NextResponse.json({ categories: result });
    
    // Reduced cache time for faster position updates (1 minute cache, 2 minutes stale-while-revalidate)
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
    
    return response;
  } catch (error: any) {
    console.error('[v0] Failed to fetch category hierarchy:', error?.stack || error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch categories', categories: [] },
      { status: 500 }
    );
  }
}

