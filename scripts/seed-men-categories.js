const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb+srv://doshikevin361_db_user:VMoKMVw6aWkwTm0Z@cluster0.f1rriwd.mongodb.net/admin_panel';

// Subcategories for Men
const subcategories = [
  {
    name: 'Topwear',
    slug: 'topwear',
    status: 'active',
    position: 1,
  },
  {
    name: 'Bottomwear',
    slug: 'bottomwear',
    status: 'active',
    position: 2,
  },
  {
    name: 'Footwear',
    slug: 'footwear',
    status: 'active',
    position: 3,
  },
];

// Child categories for each subcategory
const childCategories = {
  'topwear': [
    'T-Shirts',
    'Casual Shirts',
    'Formal Shirts',
    'Sweatshirts',
    'Sweaters',
    'Jackets',
    'Blazers & Coats',
    'Suits',
    'Rain Jackets',
  ],
  'bottomwear': [
    'Jeans',
    'Casual Trousers',
    'Formal Trousers',
    'Shorts',
    'Track Pants & Joggers',
  ],
  'footwear': [
    'Casual Shoes',
    'Sports Shoes',
    'Formal Shoes',
    'Sneakers',
    'Sandals & Floaters',
    'Flip Flops',
    'Socks',
  ],
};

async function seedMenCategories() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db('admin_panel');
    const categoriesCollection = db.collection('categories');
    const subcategoriesCollection = db.collection('subcategories');
    const childCategoriesCollection = db.collection('childcategories');

    // Find Men category
    const menCategory = await categoriesCollection.findOne({ slug: 'men' });
    
    if (!menCategory) {
      console.error('❌ Men category not found! Please create it first.');
      return;
    }

    const menCategoryId = menCategory._id;
    console.log(`✅ Found Men category: ${menCategory.name} (${menCategoryId})`);

    // Delete existing subcategories under Men
    const existingSubcats = await subcategoriesCollection.find({ categoryId: menCategoryId }).toArray();
    if (existingSubcats.length > 0) {
      console.log(`\n🗑️  Deleting ${existingSubcats.length} existing subcategories under Men...`);
      
      // First delete child categories under these subcategories
      for (const subcat of existingSubcats) {
        await childCategoriesCollection.deleteMany({ subcategoryId: subcat._id });
        console.log(`   Deleted child categories under: ${subcat.name}`);
      }
      
      // Then delete subcategories
      await subcategoriesCollection.deleteMany({ categoryId: menCategoryId });
      console.log(`✅ Deleted all existing subcategories under Men\n`);
    }

    // Insert subcategories
    console.log('📦 Creating subcategories...');
    const insertedSubcategories = {};
    
    for (const subcat of subcategories) {
      const subcategoryDoc = {
        ...subcat,
        categoryId: menCategoryId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await subcategoriesCollection.insertOne(subcategoryDoc);
      insertedSubcategories[subcat.slug] = {
        _id: result.insertedId,
        name: subcat.name,
      };
      console.log(`   ✅ Created: ${subcat.name} (${subcat.slug})`);
    }

    // Insert child categories
    console.log('\n📦 Creating child categories...');
    let totalChildCount = 0;

    for (const [subcatSlug, children] of Object.entries(childCategories)) {
      const subcategory = insertedSubcategories[subcatSlug];
      if (!subcategory) {
        console.log(`   ⚠️  Subcategory ${subcatSlug} not found, skipping children`);
        continue;
      }

      console.log(`\n   📂 ${subcategory.name}:`);
      
      for (let i = 0; i < children.length; i++) {
        const childName = children[i];
        const childSlug = childName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        
        const childCategoryDoc = {
          name: childName,
          slug: childSlug,
          categoryId: menCategoryId,
          subcategoryId: subcategory._id,
          status: 'active',
          position: i + 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await childCategoriesCollection.insertOne(childCategoryDoc);
        console.log(`      ✅ ${childName} (${childSlug})`);
        totalChildCount++;
      }
    }

    console.log(`\n✅ Summary:`);
    console.log(`   - Subcategories created: ${subcategories.length}`);
    console.log(`   - Child categories created: ${totalChildCount}`);
    console.log(`   - All under Men category`);

  } catch (error) {
    console.error('❌ Error seeding Men categories:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\n✅ Database connection closed');
  }
}

// Run the seed function
seedMenCategories()
  .then(() => {
    console.log('\n🎉 Men categories seed completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Seed failed:', error);
    process.exit(1);
  });

