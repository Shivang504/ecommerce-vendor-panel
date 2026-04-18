const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb+srv://doshikevin361_db_user:VMoKMVw6aWkwTm0Z@cluster0.f1rriwd.mongodb.net/admin_panel';

// Main categories from the website navigation
const mainCategories = [
  {
    name: 'Men',
    slug: 'men',
    status: 'active',
    position: 1,
    featured: true,
    displayOnHomepage: true,
    displayOrder: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'Women',
    slug: 'women',
    status: 'active',
    position: 2,
    featured: true,
    displayOnHomepage: true,
    displayOrder: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'Kids',
    slug: 'kids',
    status: 'active',
    position: 3,
    featured: true,
    displayOnHomepage: true,
    displayOrder: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'Mom & Baby',
    slug: 'mom-baby',
    status: 'active',
    position: 4,
    featured: true,
    displayOnHomepage: true,
    displayOrder: 4,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'Organic Store',
    slug: 'organic-store',
    status: 'active',
    position: 5,
    featured: true,
    displayOnHomepage: true,
    displayOrder: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'Skin & Beauty',
    slug: 'skin-beauty',
    status: 'active',
    position: 6,
    featured: true,
    displayOnHomepage: true,
    displayOrder: 6,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'Wellness',
    slug: 'wellness',
    status: 'active',
    position: 7,
    featured: true,
    displayOnHomepage: true,
    displayOrder: 7,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'Electronics',
    slug: 'electronics',
    status: 'active',
    position: 8,
    featured: true,
    displayOnHomepage: true,
    displayOrder: 8,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'Makeup',
    slug: 'makeup',
    status: 'active',
    position: 9,
    featured: true,
    displayOnHomepage: true,
    displayOrder: 9,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'Supplements',
    slug: 'supplements',
    status: 'active',
    position: 10,
    featured: true,
    displayOnHomepage: true,
    displayOrder: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'Bags',
    slug: 'bags',
    status: 'active',
    position: 11,
    featured: true,
    displayOnHomepage: true,
    displayOrder: 11,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

async function seedCategories() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db('admin_panel');
    const categoriesCollection = db.collection('categories');

    // Use upsert to insert or update categories
    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const category of mainCategories) {
      const { createdAt, ...categoryData } = category;
      
      const existingCategory = await categoriesCollection.findOne({ slug: category.slug });
      
      if (existingCategory) {
        // Update existing category
        await categoriesCollection.updateOne(
          { slug: category.slug },
          { 
            $set: {
              ...categoryData,
              updatedAt: new Date()
            }
          }
        );
        updatedCount++;
        console.log(`   🔄 Updated: ${category.name} (${category.slug})`);
      } else {
        // Insert new category
        await categoriesCollection.insertOne({
          ...category,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        insertedCount++;
        console.log(`   ✅ Inserted: ${category.name} (${category.slug})`);
      }
    }
    
    console.log(`\n✅ Summary: ${insertedCount} inserted, ${updatedCount} updated, ${skippedCount} skipped`);

  } catch (error) {
    console.error('❌ Error seeding categories:', error);
    throw error;
  } finally {
    await client.close();
    console.log('✅ Database connection closed');
  }
}

// Run the seed function
seedCategories()
  .then(() => {
    console.log('🎉 Seed completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Seed failed:', error);
    process.exit(1);
  });

