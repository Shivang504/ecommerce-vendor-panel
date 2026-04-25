import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export interface Vendor {
  _id?: ObjectId;
  storeName: string;
  storeSlug: string;
  ownerName: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  whatsappNumber?: string;
  businessType: 'individual' | 'company' | 'partnership';
  gstNumber?: string;
  panNumber?: string;
  businessRegistrationNumber?: string;
  description: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  pinCode: string;
  country: string;
  pickupLocation?: string;
  bankName?: string;
  accountHolderName?: string;
  accountNumber?: string;
  ifscCode?: string;
  upiId?: string;
  logo: string;
  banner: string;
  commissionRate: number;
  allowedCategories: string[];
  facebook?: string;
  instagram?: string;
  twitter?: string;
  website?: string;
  idProof?: string;
  addressProof?: string;
  gstCertificate?: string;
  cancelledCheque?: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  approvalNotes?: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  documentsVerified: boolean;
  username: string;
  password: string;
  sendCredentialsEmail: boolean;
  resetPasswordToken?: string;
  resetPasswordTokenExpiry?: Date;
  // Wallet & Earnings fields
  walletBalance?: number; // Current available balance in wallet
  totalEarnings?: number; // Total earnings from all orders
  totalWithdrawn?: number; // Total amount withdrawn
  createdAt?: Date;
  updatedAt?: Date;
}

export async function getAllVendors() {
  const { db } = await connectToDatabase();
  return db.collection('vendors').find({}).toArray();
}

export async function getVendorById(id: string) {
  const { db } = await connectToDatabase();
  return db.collection('vendors').findOne({ _id: new ObjectId(id) });
}

export async function getVendorByEmail(email: string) {
  const { db } = await connectToDatabase();
  const trimmed = email.trim();
  return db.collection('vendors').findOne(
    { email: trimmed },
    { collation: { locale: 'en', strength: 2 } }
  );
}

export async function createVendor(vendor: Omit<Vendor, '_id'>) {
  const { db } = await connectToDatabase();
  const result = await db.collection('vendors').insertOne({
    ...vendor,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return result.insertedId;
}

export async function updateVendor(id: string, vendor: Partial<Vendor>) {
  const { db } = await connectToDatabase();
  return db.collection('vendors').findOneAndUpdate(
    { _id: new ObjectId(id) },
    {
      $set: {
        ...vendor,
        updatedAt: new Date(),
      },
    },
    { returnDocument: 'after' }
  );
}

export async function deleteVendor(id: string) {
  const { db } = await connectToDatabase();
  return db.collection('vendors').deleteOne({ _id: new ObjectId(id) });
}

export async function verifyVendorPassword(password: string, hashedPassword: string) {
  try {
    const match = await bcrypt.compare(password, hashedPassword);
    console.log('[v0] Vendor password verification result:', match);
    return match;
  } catch (error) {
    console.error('[v0] Error verifying vendor password:', error);
    throw error;
  }
}

export async function hashVendorPassword(password: string) {
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    return hashedPassword;
  } catch (error) {
    console.error('[v0] Error hashing vendor password:', error);
    throw error;
  }
}

export function generateVendorResetPasswordToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function setVendorResetPasswordToken(vendorId: string, token: string) {
  const { db } = await connectToDatabase();
  const expiryDate = new Date();
  expiryDate.setHours(expiryDate.getHours() + 1);

  await db.collection('vendors').updateOne(
    { _id: new ObjectId(vendorId) },
    {
      $set: {
        resetPasswordToken: token,
        resetPasswordTokenExpiry: expiryDate,
        updatedAt: new Date(),
      },
    }
  );
}

export async function verifyVendorResetPasswordToken(
  token: string
): Promise<{ success: boolean; vendorId?: string; error?: string; expired?: boolean }> {
  try {
    const { db } = await connectToDatabase();
    const vendor = await db.collection('vendors').findOne({ resetPasswordToken: token });

    if (!vendor) {
      return { success: false, error: 'Invalid or expired reset link. Please request a new one.' };
    }

    const now = new Date();
    if (vendor.resetPasswordTokenExpiry && vendor.resetPasswordTokenExpiry < now) {
      return {
        success: false,
        error: 'This reset link has expired. Please request a new password reset.',
        expired: true,
      };
    }

    return { success: true, vendorId: vendor._id.toString() };
  } catch (error) {
    console.error('[v0] verifyVendorResetPasswordToken:', error);
    return { success: false, error: 'Could not verify reset link. Please try again.' };
  }
}

export async function resetVendorPasswordWithToken(vendorId: string, newPassword: string) {
  const { db } = await connectToDatabase();
  const hashedPassword = await hashVendorPassword(newPassword);

  await db.collection('vendors').updateOne(
    { _id: new ObjectId(vendorId) },
    {
      $set: {
        password: hashedPassword,
        updatedAt: new Date(),
      },
      $unset: { resetPasswordToken: '', resetPasswordTokenExpiry: '' },
    }
  );
}
