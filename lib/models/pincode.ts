import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export interface PincodeServiceability {
  _id?: string | ObjectId;
  pincode: string;
  city: string;
  state: string;
  district?: string;
  isServiceable: boolean;
  deliveryDays: number; // Estimated delivery days
  deliveryCharges?: number;
  codAvailable: boolean; // Cash on Delivery available
  expressDeliveryAvailable: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Check pincode serviceability
export async function checkPincodeServiceability(pincode: string): Promise<PincodeServiceability | null> {
  try {
    const { db } = await connectToDatabase();

    // Remove any spaces and ensure 6 digits
    const cleanPincode = pincode.replace(/\s/g, '').trim();
    
    if (cleanPincode.length !== 6 || !/^\d{6}$/.test(cleanPincode)) {
      return null;
    }

    const serviceability = await db.collection('pincode_serviceability').findOne({
      pincode: cleanPincode,
    });

    if (!serviceability) {
      // Return non-serviceable entry if not found in database
      // Only pincodes added by admin are deliverable
      return {
        pincode: cleanPincode,
        city: 'Unknown',
        state: 'Unknown',
        isServiceable: false, // Not serviceable if not in admin list
        deliveryDays: 0,
        codAvailable: false,
        expressDeliveryAvailable: false,
      } as PincodeServiceability;
    }

    return {
      ...serviceability,
      _id: serviceability._id.toString(),
    } as PincodeServiceability;
  } catch (error) {
    console.error('[Pincode] Error checking serviceability:', error);
    return null;
  }
}

// Add or update pincode serviceability (Admin function)
export async function addOrUpdatePincodeServiceability(data: Omit<PincodeServiceability, '_id' | 'createdAt' | 'updatedAt'>) {
  try {
    const { db } = await connectToDatabase();

    const cleanPincode = data.pincode.replace(/\s/g, '').trim();
    
    if (cleanPincode.length !== 6 || !/^\d{6}$/.test(cleanPincode)) {
      throw new Error('Invalid pincode format. Must be 6 digits.');
    }

    const updateData = {
      ...data,
      pincode: cleanPincode,
      updatedAt: new Date(),
    };

    const result = await db.collection('pincode_serviceability').findOneAndUpdate(
      { pincode: cleanPincode },
      {
        $set: updateData,
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true, returnDocument: 'after' }
    );

    if (!result.value) {
      // If result.value is null, fetch the document we just created/updated
      const savedPincode = await db.collection('pincode_serviceability').findOne({
        pincode: cleanPincode,
      });
      
      if (!savedPincode) {
        throw new Error('Failed to save pincode serviceability');
      }

      return {
        ...savedPincode,
        _id: savedPincode._id.toString(),
      } as PincodeServiceability;
    }

    return {
      ...result.value,
      _id: result.value._id.toString(),
    } as PincodeServiceability;
  } catch (error) {
    console.error('[Pincode] Error adding/updating serviceability:', error);
    throw error;
  }
}

// Get all pincodes (Admin function)
export async function getAllPincodes(page: number = 1, limit: number = 50, search?: string) {
  try {
    const { db } = await connectToDatabase();

    const skip = (page - 1) * limit;
    const query: any = {};

    if (search) {
      query.$or = [
        { pincode: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
        { state: { $regex: search, $options: 'i' } },
        { district: { $regex: search, $options: 'i' } },
      ];
    }

    const [pincodes, total] = await Promise.all([
      db
        .collection('pincode_serviceability')
        .find(query)
        .sort({ pincode: 1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection('pincode_serviceability').countDocuments(query),
    ]);

    return {
      pincodes: pincodes.map(p => ({
        ...p,
        _id: p._id.toString(),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    console.error('[Pincode] Error fetching pincodes:', error);
    throw error;
  }
}

// Delete pincode (Admin function)
export async function deletePincode(pincodeId: string) {
  try {
    const { db } = await connectToDatabase();

    if (!ObjectId.isValid(pincodeId)) {
      throw new Error('Invalid pincode ID');
    }

    await db.collection('pincode_serviceability').deleteOne({
      _id: new ObjectId(pincodeId),
    });

    return { success: true };
  } catch (error) {
    console.error('[Pincode] Error deleting pincode:', error);
    throw error;
  }
}

// Bulk import pincodes (Admin function)
export async function bulkImportPincodes(pincodes: Omit<PincodeServiceability, '_id' | 'createdAt' | 'updatedAt'>[]) {
  try {
    const { db } = await connectToDatabase();

    const operations = pincodes.map(pincode => {
      const cleanPincode = pincode.pincode.replace(/\s/g, '').trim();
      
      if (cleanPincode.length !== 6 || !/^\d{6}$/.test(cleanPincode)) {
        return null; // Skip invalid pincodes
      }

      return {
        updateOne: {
          filter: { pincode: cleanPincode },
          update: {
            $set: {
              ...pincode,
              pincode: cleanPincode,
              updatedAt: new Date(),
            },
            $setOnInsert: {
              createdAt: new Date(),
            },
          },
          upsert: true,
        },
      };
    }).filter(Boolean);

    if (operations.length === 0) {
      throw new Error('No valid pincodes to import');
    }

    const result = await db.collection('pincode_serviceability').bulkWrite(operations);

    return {
      success: true,
      inserted: result.upsertedCount,
      modified: result.modifiedCount,
      total: operations.length,
    };
  } catch (error) {
    console.error('[Pincode] Error bulk importing pincodes:', error);
    throw error;
  }
}

