import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export interface OTP {
  _id?: string | ObjectId;
  email?: string;
  phone?: string;
  identifier: string; // email or phone
  otp: string;
  purpose: 'login' | 'verification' | 'reset-password' | 'signup';
  expiresAt: Date;
  attempts: number;
  verified: boolean;
  createdAt: Date;
}

const OTP_EXPIRY_MINUTES = 10; // OTP expires in 10 minutes
const MAX_OTP_ATTEMPTS = 5; // Maximum verification attempts
const OTP_RESEND_COOLDOWN_SECONDS = 60; // 60 seconds cooldown between OTP sends

/**
 * Generate a random 6-digit OTP
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Store OTP in database
 */
export async function storeOTP(identifier: string, otp: string, purpose: 'login' | 'verification' | 'reset-password' | 'signup' = 'login'): Promise<string> {
  try {
    const { db } = await connectToDatabase();
    
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);

    // Determine if identifier is email or phone
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
    const query: any = { identifier, purpose, verified: false };

    // Invalidate any existing OTPs for this identifier and purpose
    await db.collection('otps').updateMany(
      query,
      { $set: { verified: true } } // Mark as verified to invalidate
    );

    const otpData: Omit<OTP, '_id'> = {
      identifier,
      otp,
      purpose,
      expiresAt,
      attempts: 0,
      verified: false,
      createdAt: new Date(),
      ...(isEmail ? { email: identifier } : { phone: identifier }),
    };

    const result = await db.collection('otps').insertOne(otpData);
    return result.insertedId.toString();
  } catch (error) {
    console.error('[OTP] Error storing OTP:', error);
    throw error;
  }
}

/**
 * Verify OTP
 */
export async function verifyOTP(identifier: string, otp: string, purpose: 'login' | 'verification' | 'reset-password' | 'signup' = 'login'): Promise<boolean> {
  try {
    const { db } = await connectToDatabase();
    
    const otpRecord = await db.collection('otps').findOne({
      identifier,
      otp,
      purpose,
      verified: false,
    });

    if (!otpRecord) {
      return false;
    }

    // Check if OTP has expired
    if (new Date() > new Date(otpRecord.expiresAt)) {
      await db.collection('otps').updateOne(
        { _id: otpRecord._id },
        { $set: { verified: true } } // Mark as verified to prevent reuse
      );
      return false;
    }

    // Check if max attempts exceeded
    if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
      await db.collection('otps').updateOne(
        { _id: otpRecord._id },
        { $set: { verified: true } } // Mark as verified to prevent further attempts
      );
      return false;
    }

    // Increment attempts
    await db.collection('otps').updateOne(
      { _id: otpRecord._id },
      { $inc: { attempts: 1 } }
    );

    // Verify OTP
    if (otpRecord.otp === otp) {
      await db.collection('otps').updateOne(
        { _id: otpRecord._id },
        { $set: { verified: true } }
      );
      return true;
    }

    return false;
  } catch (error) {
    console.error('[OTP] Error verifying OTP:', error);
    return false;
  }
}

/**
 * Check if OTP can be resent (cooldown check)
 */
export async function canResendOTP(identifier: string, purpose: 'login' | 'verification' | 'reset-password' | 'signup' = 'login'): Promise<{ canResend: boolean; remainingSeconds?: number }> {
  try {
    const { db } = await connectToDatabase();
    
    const latestOTP = await db.collection('otps').findOne(
      { identifier, purpose },
      { sort: { createdAt: -1 } }
    );

    if (!latestOTP) {
      return { canResend: true };
    }

    const now = new Date();
    const createdAt = new Date(latestOTP.createdAt);
    const secondsSinceCreation = Math.floor((now.getTime() - createdAt.getTime()) / 1000);

    if (secondsSinceCreation >= OTP_RESEND_COOLDOWN_SECONDS) {
      return { canResend: true };
    }

    return {
      canResend: false,
      remainingSeconds: OTP_RESEND_COOLDOWN_SECONDS - secondsSinceCreation,
    };
  } catch (error) {
    console.error('[OTP] Error checking resend cooldown:', error);
    return { canResend: true }; // Allow resend on error
  }
}

/**
 * Clean up expired OTPs (can be called periodically)
 */
export async function cleanupExpiredOTPs(): Promise<number> {
  try {
    const { db } = await connectToDatabase();
    
    const result = await db.collection('otps').deleteMany({
      $or: [
        { expiresAt: { $lt: new Date() } },
        { verified: true },
      ],
    });

    return result.deletedCount;
  } catch (error) {
    console.error('[OTP] Error cleaning up expired OTPs:', error);
    return 0;
  }
}





