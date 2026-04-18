import { MongoClient, Db } from 'mongodb';
// Import initialization checks
import '@/lib/init';

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

const clientPromise = (async () => {
  const uri = process.env.MONGODB_URI || 'mongodb+srv://doshikevin361_db_user:VMoKMVw6aWkwTm0Z@cluster0.f1rriwd.mongodb.net/admin_panel';
  
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not defined. Please add it to .env.local');
  }

  const client = new MongoClient(uri, {
    maxPoolSize: 10,
    minPoolSize: 2,
  });
  
  await client.connect();
  return client;
})();

export async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    console.log('[v0] Using cached MongoDB connection');
    return { client: cachedClient, db: cachedDb };
  }

  const client = await clientPromise;
  const db = client.db('admin_panel') || client.db();

  cachedClient = client;
  cachedDb = db;

  console.log('[v0] MongoDB connection successful');
  return { client, db };
}

export default clientPromise;
