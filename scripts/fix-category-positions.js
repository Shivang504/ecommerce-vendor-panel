const { MongoClient } = require('mongodb');

// Try to load environment variables
try {
  require('dotenv').config({ path: '.env.local' });
} catch (e) {
  // dotenv not available, try .env
  try {
    require('dotenv').config();
  } catch (e2) {
    // dotenv not available, use environment variables directly
  }
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://doshikevin361_db_user:VMoKMVw6aWkwTm0Z@cluster0.f1rriwd.mongodb.net/admin_panel';

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined in environment variables');
  process.exit(1);
}

async function fixPositions() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db();

    // Fix Categories positions
    console.log('\n📦 Fixing Categories positions...');
    const categories = await db.collection('categories').find({}).sort({ createdAt: 1 }).toArray();
    console.log(`Found ${categories.length} categories`);

    const categoryUpdates = categories.map((cat, index) => ({
      updateOne: {
        filter: { _id: cat._id },
        update: { $set: { position: index, updatedAt: new Date() } }
      }
    }));

    if (categoryUpdates.length > 0) {
      await db.collection('categories').bulkWrite(categoryUpdates);
      console.log(`✅ Updated ${categoryUpdates.length} category positions`);
    }

    // Fix Subcategories positions
    console.log('\n📦 Fixing Subcategories positions...');
    const subcategories = await db.collection('subcategories').find({}).sort({ createdAt: 1 }).toArray();
    console.log(`Found ${subcategories.length} subcategories`);

    const subcategoryUpdates = subcategories.map((subcat, index) => ({
      updateOne: {
        filter: { _id: subcat._id },
        update: { $set: { position: index, updatedAt: new Date() } }
      }
    }));

    if (subcategoryUpdates.length > 0) {
      await db.collection('subcategories').bulkWrite(subcategoryUpdates);
      console.log(`✅ Updated ${subcategoryUpdates.length} subcategory positions`);
    }

    // Fix Child Categories positions
    console.log('\n📦 Fixing Child Categories positions...');
    const childCategories = await db.collection('childcategories').find({}).sort({ createdAt: 1 }).toArray();
    console.log(`Found ${childCategories.length} child categories`);

    const childCategoryUpdates = childCategories.map((child, index) => ({
      updateOne: {
        filter: { _id: child._id },
        update: { $set: { position: index, updatedAt: new Date() } }
      }
    }));

    if (childCategoryUpdates.length > 0) {
      await db.collection('childcategories').bulkWrite(childCategoryUpdates);
      console.log(`✅ Updated ${childCategoryUpdates.length} child category positions`);
    }

    console.log('\n✅ All positions have been fixed successfully!');
    console.log(`\nSummary:`);
    console.log(`- Categories: ${categories.length} updated`);
    console.log(`- Subcategories: ${subcategories.length} updated`);
    console.log(`- Child Categories: ${childCategories.length} updated`);

  } catch (error) {
    console.error('❌ Error fixing positions:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n✅ Database connection closed');
  }
}

fixPositions();

