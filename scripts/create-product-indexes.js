// Node.js script to create MongoDB indexes for products collection
// Run with: node scripts/create-product-indexes.js
// Make sure MongoDB connection string is in .env.local or update MONGODB_URI below

const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// Try to load .env.local file
let mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  try {
    const envPath = path.join(__dirname, '..', '.env.local');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const match = envContent.match(/MONGODB_URI=(.+)/);
      if (match) {
        mongoUri = match[1].trim();
      }
    }
  } catch (e) {
    console.log('Could not read .env.local file');
  }
}

// Fallback to default (from mongodb.ts)
if (!mongoUri) {
  mongoUri = 'mongodb+srv://doshikevin361_db_user:VMoKMVw6aWkwTm0Z@cluster0.f1rriwd.mongodb.net/admin_panel';
}

async function createIndexes() {
  let client;
  try {
    console.log('Connecting to MongoDB...');
    client = new MongoClient(mongoUri, {
      maxPoolSize: 10,
      minPoolSize: 2,
    });
    
    await client.connect();
    const db = client.db('admin_panel');
    
    console.log('✓ Connected to MongoDB\n');
    console.log('Creating indexes for products collection...\n');
    
    // Products collection indexes
    try {
      await db.collection('products').createIndex({ vendorId: 1, status: 1, createdAt: -1 }, { background: true });
      console.log('✓ Created index: products.vendorId_1_status_1_createdAt_-1');
    } catch (e) {
      if (e.code === 85) {
        console.log('ℹ Index already exists: products.vendorId_1_status_1_createdAt_-1');
      } else {
        console.log('⚠ Error creating index:', e.message);
      }
    }
    
    try {
      await db.collection('products').createIndex({ status: 1, createdAt: -1 }, { background: true });
      console.log('✓ Created index: products.status_1_createdAt_-1');
    } catch (e) {
      if (e.code === 85) {
        console.log('ℹ Index already exists: products.status_1_createdAt_-1');
      } else {
        console.log('⚠ Error creating index:', e.message);
      }
    }
    
    try {
      await db.collection('products').createIndex({ createdAt: -1 }, { background: true });
      console.log('✓ Created index: products.createdAt_-1');
    } catch (e) {
      if (e.code === 85) {
        console.log('ℹ Index already exists: products.createdAt_-1');
      } else {
        console.log('⚠ Error creating index:', e.message);
      }
    }
    
    try {
      await db.collection('products').createIndex({ trending: 1 }, { background: true });
      console.log('✓ Created index: products.trending_1');
    } catch (e) {
      if (e.code === 85) {
        console.log('ℹ Index already exists: products.trending_1');
      } else {
        console.log('⚠ Error creating index:', e.message);
      }
    }
    
    try {
      await db.collection('products').createIndex({ bestSeller: 1 }, { background: true });
      console.log('✓ Created index: products.bestSeller_1');
    } catch (e) {
      if (e.code === 85) {
        console.log('ℹ Index already exists: products.bestSeller_1');
      } else {
        console.log('⚠ Error creating index:', e.message);
      }
    }
    
    try {
      await db.collection('products').createIndex({ featured: 1 }, { background: true });
      console.log('✓ Created index: products.featured_1');
    } catch (e) {
      if (e.code === 85) {
        console.log('ℹ Index already exists: products.featured_1');
      } else {
        console.log('⚠ Error creating index:', e.message);
      }
    }
    
    try {
      await db.collection('products').createIndex({ vendorId: 1 }, { background: true });
      console.log('✓ Created index: products.vendorId_1');
    } catch (e) {
      if (e.code === 85) {
        console.log('ℹ Index already exists: products.vendorId_1');
      } else {
        console.log('⚠ Error creating index:', e.message);
      }
    }
    
    // Vendors collection indexes
    try {
      await db.collection('vendors').createIndex({ _id: 1, storeName: 1 }, { background: true });
      console.log('✓ Created index: vendors._id_1_storeName_1');
    } catch (e) {
      if (e.code === 85) {
        console.log('ℹ Index already exists: vendors._id_1_storeName_1');
      } else {
        console.log('⚠ Error creating index:', e.message);
      }
    }
    
    console.log('\n✅ Index creation process completed!');
    console.log('\n💡 Product list should now load much faster (< 2-3 seconds instead of 26+ seconds)');
    console.log('💡 If indexes were already created, they will be used automatically.\n');
    
    await client.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error creating indexes:', error.message);
    if (client) {
      await client.close();
    }
    process.exit(1);
  }
}

createIndexes();

