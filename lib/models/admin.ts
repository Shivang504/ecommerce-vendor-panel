import { connectToDatabase } from '@/lib/mongodb';
import bcrypt from 'bcryptjs';

export interface AdminUser {
  _id?: string;
  email: string;
  password: string;
  name: string;
  role: 'superadmin' | 'admin' | 'vendor';
  phone?: string;
  status?: 'active' | 'inactive';
  createdBy?: string; // ID of the admin/vendor who created this user (for employee management)
  createdAt?: Date;
}

export async function getAdminByEmail(email: string) {
  try {
    const { db } = await connectToDatabase();
    const admin = await db.collection('admins').findOne({ email });
    console.log('[v0] Admin lookup for', email, ':', admin ? 'found' : 'not found');
    return admin as AdminUser | null;
  } catch (error) {
    console.error('[v0] Error fetching admin:', error);
    throw error;
  }
}

export async function createDefaultAdmin() {
  try {
    const { db } = await connectToDatabase();
    const admin = await getAdminByEmail('admin@grocify.com');
    
    if (admin) {
      console.log('[v0] Default admin already exists');
      return admin;
    }

    console.log('[v0] Creating default admin user');
    const hashedPassword = await bcrypt.hash('Admin@123456', 10);
    const result = await db.collection('admins').insertOne({
      email: 'admin@grocify.com',
      password: hashedPassword,
      name: 'Super Admin',
      role: 'superadmin',
      createdAt: new Date(),
    });

    console.log('[v0] Default admin created with ID:', result.insertedId);
    return { _id: result.insertedId, email: 'admin@grocify.com', name: 'Super Admin' };
  } catch (error) {
    console.error('[v0] Error creating default admin:', error);
    throw error;
  }
}

export async function verifyPassword(password: string, hashedPassword: string) {
  try {
    const match = await bcrypt.compare(password, hashedPassword);
    console.log('[v0] Password verification result:', match);
    return match;
  } catch (error) {
    console.error('[v0] Error verifying password:', error);
    throw error;
  }
}
