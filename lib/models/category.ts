import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export interface Category {
  _id?: ObjectId;
  name: string;
  slug: string;
  parentId?: string | null;
  description: string;
  shortDescription: string;
  image: string;
  banner: string;
  displayOnHomepage: boolean;
  displayOrder: number;
  position: number;
  status: 'active' | 'inactive';
  metaTitle: string;
  metaDescription: string;
  focusKeywords: string[];
  canonicalUrl: string;
  ogImage: string;
  commissionRate: number;
  featured: boolean;
  showProductCount: boolean;
  productCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export async function getAllCategories() {
  const { db } = await connectToDatabase();
  return db.collection('categories').find({}).sort({ displayOrder: 1 }).toArray();
}

export async function getCategoryById(id: string) {
  const { db } = await connectToDatabase();
  return db.collection('categories').findOne({ _id: new ObjectId(id) });
}

export async function getCategoryBySlug(slug: string) {
  const { db } = await connectToDatabase();
  return db.collection('categories').findOne({ slug });
}

export async function createCategory(category: Omit<Category, '_id'>) {
  const { db } = await connectToDatabase();
  const result = await db.collection('categories').insertOne({
    ...category,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return result.insertedId;
}

export async function updateCategory(id: string, category: Partial<Category>) {
  const { db } = await connectToDatabase();
  return db.collection('categories').findOneAndUpdate(
    { _id: new ObjectId(id) },
    {
      $set: {
        ...category,
        updatedAt: new Date(),
      },
    },
    { returnDocument: 'after' }
  );
}

export async function deleteCategory(id: string) {
  const { db } = await connectToDatabase();
  return db.collection('categories').deleteOne({ _id: new ObjectId(id) });
}
