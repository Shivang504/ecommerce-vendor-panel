import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export interface Withdrawal {
  _id?: string | ObjectId;
  vendorId: string | ObjectId;
  vendorName?: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  requestNote?: string; // Optional note from vendor
  adminNote?: string; // Admin's note when approving/rejecting
  requestedAt: Date;
  processedAt?: Date;
  processedBy?: string | ObjectId; // Admin who processed it
  paymentMethod?: 'bank' | 'upi'; // Payment method for withdrawal
  accountDetails?: {
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    accountHolderName?: string;
    upiId?: string;
  };
}

// Create withdrawal request
export async function createWithdrawal(withdrawal: Omit<Withdrawal, '_id' | 'requestedAt'>) {
  try {
    const { db } = await connectToDatabase();
    const result = await db.collection('withdrawals').insertOne({
      ...withdrawal,
      vendorId: new ObjectId(withdrawal.vendorId),
      requestedAt: new Date(),
      status: 'pending',
    });
    return result.insertedId;
  } catch (error) {
    console.error('[Withdrawal] Error creating withdrawal:', error);
    throw error;
  }
}

// Get all withdrawals (with filters)
export async function getAllWithdrawals(filters?: {
  vendorId?: string;
  status?: 'pending' | 'approved' | 'rejected';
}) {
  try {
    const { db } = await connectToDatabase();
    const query: any = {};
    
    if (filters?.vendorId) {
      query.vendorId = new ObjectId(filters.vendorId);
    }
    
    if (filters?.status) {
      query.status = filters.status;
    }

    const withdrawals = await db
      .collection('withdrawals')
      .find(query)
      .sort({ requestedAt: -1 })
      .toArray();
    
    return withdrawals as Withdrawal[];
  } catch (error) {
    console.error('[Withdrawal] Error fetching withdrawals:', error);
    return [];
  }
}

// Get withdrawal by ID
export async function getWithdrawalById(id: string) {
  try {
    const { db } = await connectToDatabase();
    const withdrawal = await db
      .collection('withdrawals')
      .findOne({ _id: new ObjectId(id) });
    return withdrawal as Withdrawal | null;
  } catch (error) {
    console.error('[Withdrawal] Error fetching withdrawal:', error);
    return null;
  }
}

// Update withdrawal status
export async function updateWithdrawalStatus(
  id: string,
  status: 'approved' | 'rejected',
  adminNote?: string,
  processedBy?: string
) {
  try {
    const { db } = await connectToDatabase();
    const update: any = {
      status,
      processedAt: new Date(),
    };
    
    if (adminNote) {
      update.adminNote = adminNote;
    }
    
    if (processedBy) {
      update.processedBy = new ObjectId(processedBy);
    }

    const result = await db
      .collection('withdrawals')
      .findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: update },
        { returnDocument: 'after' }
      );
    
    return result?.value as Withdrawal | null;
  } catch (error) {
    console.error('[Withdrawal] Error updating withdrawal:', error);
    throw error;
  }
}

// Get vendor's withdrawal history
export async function getVendorWithdrawals(vendorId: string) {
  try {
    const { db } = await connectToDatabase();
    const withdrawals = await db
      .collection('withdrawals')
      .find({ vendorId: new ObjectId(vendorId) })
      .sort({ requestedAt: -1 })
      .toArray();
    
    return withdrawals as Withdrawal[];
  } catch (error) {
    console.error('[Withdrawal] Error fetching vendor withdrawals:', error);
    return [];
  }
}

// Get pending withdrawals count (for admin)
export async function getPendingWithdrawalsCount() {
  try {
    const { db } = await connectToDatabase();
    const count = await db
      .collection('withdrawals')
      .countDocuments({ status: 'pending' });
    
    return count;
  } catch (error) {
    console.error('[Withdrawal] Error counting pending withdrawals:', error);
    return 0;
  }
}

