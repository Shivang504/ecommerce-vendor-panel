import { connectToDatabase } from '@/lib/mongodb';
import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';
import crypto from 'crypto';

export interface Customer {
  _id?: string | ObjectId;
  name: string;
  email: string;
  phone: string;
  password?: string;
  avatar?: string;
  emailVerified?: boolean;
  verificationToken?: string;
  verificationTokenExpiry?: Date;
  resetPasswordToken?: string;
  resetPasswordTokenExpiry?: Date;
  provider?: 'local' | 'google' | 'facebook';
  providerId?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  billingAddress?: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  orders: number;
  spent: number;
  rewardPoints?: number;
  status: 'active' | 'blocked';
  registrationDate: string;
  lastLogin?: string;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export async function getCustomerByEmail(email: string) {
  try {
    const { db } = await connectToDatabase();
    const customer = await db.collection('customers').findOne({ email });
    return customer as Customer | null;
  } catch (error) {
    console.error('[v0] Error fetching customer:', error);
    throw error;
  }
}

export async function getCustomerByPhone(phone: string) {
  try {
    const { db } = await connectToDatabase();
    const customer = await db.collection('customers').findOne({ phone });
    return customer as Customer | null;
  } catch (error) {
    console.error('[v0] Error fetching customer by phone:', error);
    throw error;
  }
}

export async function getCustomerByEmailOrPhone(emailOrPhone: string) {
  try {
    const { db } = await connectToDatabase();
    // Check if it's an email or phone
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailOrPhone);
    
    if (isEmail) {
      return await getCustomerByEmail(emailOrPhone);
    } else {
      return await getCustomerByPhone(emailOrPhone);
    }
  } catch (error) {
    console.error('[v0] Error fetching customer by email or phone:', error);
    throw error;
  }
}

export async function getCustomerById(id: string) {
  try {
    const { db } = await connectToDatabase();
    const customer = await db.collection('customers').findOne({ _id: new ObjectId(id) });
    return customer as Customer | null;
  } catch (error) {
    console.error('[v0] Error fetching customer by ID:', error);
    throw error;
  }
}

export async function hashCustomerPassword(password: string): Promise<string> {
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    return hashedPassword;
  } catch (error) {
    console.error('[v0] Error hashing password:', error);
    throw error;
  }
}

export async function verifyCustomerPassword(password: string, hashedPassword: string): Promise<boolean> {
  try {
    const match = await bcrypt.compare(password, hashedPassword);
    return match;
  } catch (error) {
    console.error('[v0] Error verifying password:', error);
    throw error;
  }
}

export async function createCustomer(customerData: Omit<Customer, '_id' | 'createdAt' | 'updatedAt' | 'orders' | 'spent' | 'registrationDate'>) {
  try {
    const { db } = await connectToDatabase();
    
    // Check if customer already exists
    const existingCustomer = await getCustomerByEmail(customerData.email);
    if (existingCustomer) {
      throw new Error('Customer with this email already exists');
    }

    // Hash password if provided
    let hashedPassword = customerData.password;
    if (customerData.password) {
      hashedPassword = await hashCustomerPassword(customerData.password);
    }

    const newCustomer = {
      ...customerData,
      password: hashedPassword,
      provider: customerData.provider || 'local',
      orders: 0,
      spent: 0,
      status: 'active' as const,
      emailVerified: customerData.emailVerified || false,
      registrationDate: new Date().toISOString().split('T')[0],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('customers').insertOne(newCustomer);
    return { _id: result.insertedId.toString(), ...newCustomer, password: undefined };
  } catch (error) {
    console.error('[v0] Error creating customer:', error);
    throw error;
  }
}

export async function updateCustomerLastLogin(customerId: string) {
  try {
    const { db } = await connectToDatabase();
    await db.collection('customers').updateOne(
      { _id: new ObjectId(customerId) },
      { 
        $set: { 
          lastLogin: new Date().toISOString(),
          updatedAt: new Date()
        } 
      }
    );
  } catch (error) {
    console.error('[v0] Error updating customer last login:', error);
    throw error;
  }
}

export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function setVerificationToken(customerId: string, token: string) {
  try {
    const { db } = await connectToDatabase();
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + 24); // 24 hours expiry

    await db.collection('customers').updateOne(
      { _id: new ObjectId(customerId) },
      {
        $set: {
          verificationToken: token,
          verificationTokenExpiry: expiryDate,
          updatedAt: new Date(),
        },
      }
    );
  } catch (error) {
    console.error('[v0] Error setting verification token:', error);
    throw error;
  }
}

export async function verifyCustomerEmail(token: string): Promise<{ success: boolean; customerId?: string; error?: string; expired?: boolean; email?: string }> {
  try {
    const { db } = await connectToDatabase();
    
    // First check if token exists (even if expired)
    const customerWithToken = await db.collection('customers').findOne({
      verificationToken: token,
    });

    if (!customerWithToken) {
      return { success: false, error: 'Invalid verification token. Please check your email link and try again.' };
    }

    // Check if token is expired
    const now = new Date();
    if (customerWithToken.verificationTokenExpiry && customerWithToken.verificationTokenExpiry < now) {
      return { 
        success: false, 
        error: 'This verification link has expired. Please request a new verification email.',
        expired: true,
        email: customerWithToken.email
      };
    }

    // Token is valid, verify the email
    await db.collection('customers').updateOne(
      { _id: customerWithToken._id },
      {
        $set: {
          emailVerified: true,
          verificationToken: undefined,
          verificationTokenExpiry: undefined,
          updatedAt: new Date(),
        },
      }
    );

    return { success: true, customerId: customerWithToken._id.toString() };
  } catch (error) {
    console.error('[v0] Error verifying customer email:', error);
    return { success: false, error: 'Failed to verify email. Please try again.' };
  }
}

export async function resendVerificationToken(customerId: string): Promise<{ token: string } | null> {
  try {
    const token = generateVerificationToken();
    await setVerificationToken(customerId, token);
    return { token };
  } catch (error) {
    console.error('[v0] Error generating new verification token:', error);
    return null;
  }
}

// Password Reset Functions
export function generateResetPasswordToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function setResetPasswordToken(customerId: string, token: string) {
  try {
    const { db } = await connectToDatabase();
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + 1); // 1 hour expiry

    await db.collection('customers').updateOne(
      { _id: new ObjectId(customerId) },
      {
        $set: {
          resetPasswordToken: token,
          resetPasswordTokenExpiry: expiryDate,
          updatedAt: new Date(),
        },
      }
    );
  } catch (error) {
    console.error('[v0] Error setting reset password token:', error);
    throw error;
  }
}

export async function verifyResetPasswordToken(token: string): Promise<{ success: boolean; customerId?: string; error?: string; expired?: boolean }> {
  try {
    const { db } = await connectToDatabase();
    
    // First check if token exists (even if expired)
    const customerWithToken = await db.collection('customers').findOne({
      resetPasswordToken: token,
    });

    if (!customerWithToken) {
      return { success: false, error: 'Invalid reset password token. Please request a new password reset link.' };
    }

    // Check if token is expired
    const now = new Date();
    if (customerWithToken.resetPasswordTokenExpiry && customerWithToken.resetPasswordTokenExpiry < now) {
      return { 
        success: false, 
        error: 'This password reset link has expired. Please request a new one.',
        expired: true
      };
    }

    return { success: true, customerId: customerWithToken._id.toString() };
  } catch (error) {
    console.error('[v0] Error verifying reset password token:', error);
    return { success: false, error: 'Failed to verify reset password token. Please try again.' };
  }
}

export async function resetCustomerPassword(customerId: string, newPassword: string) {
  try {
    const { db } = await connectToDatabase();
    const hashedPassword = await hashCustomerPassword(newPassword);

    await db.collection('customers').updateOne(
      { _id: new ObjectId(customerId) },
      {
        $set: {
          password: hashedPassword,
          resetPasswordToken: undefined,
          resetPasswordTokenExpiry: undefined,
          updatedAt: new Date(),
        },
      }
    );
  } catch (error) {
    console.error('[v0] Error resetting customer password:', error);
    throw error;
  }
}

export async function updateCustomerPassword(customerId: string, newPassword: string) {
  try {
    const { db } = await connectToDatabase();
    const hashedPassword = await hashCustomerPassword(newPassword);

    await db.collection('customers').updateOne(
      { _id: new ObjectId(customerId) },
      {
        $set: {
          password: hashedPassword,
          updatedAt: new Date(),
        },
      }
    );
  } catch (error) {
    console.error('[v0] Error updating customer password:', error);
    throw error;
  }
}
