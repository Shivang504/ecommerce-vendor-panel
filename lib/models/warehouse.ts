import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export interface Warehouse {
  _id?: string | ObjectId;
  name: string;
  code?: string; // Warehouse code/identifier
  pincode: string;
  address: string;
  city: string;
  state: string;
  district?: string;
  country: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  isDefault?: boolean; // Default warehouse
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Get all warehouses
export async function getAllWarehouses(
  page: number = 1,
  limit: number = 50,
  search?: string,
  isActive?: boolean
) {
  try {
    const { db } = await connectToDatabase();

    const skip = (page - 1) * limit;
    const query: any = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { pincode: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
        { state: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
      ];
    }

    if (isActive !== undefined) {
      query.isActive = isActive;
    }

    const [warehouses, total] = await Promise.all([
      db
        .collection('warehouses')
        .find(query)
        .sort({ isDefault: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection('warehouses').countDocuments(query),
    ]);

    return {
      warehouses: warehouses.map(w => ({
        ...w,
        _id: w._id.toString(),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    throw error;
  }
}

// Get single warehouse by ID
export async function getWarehouseById(warehouseId: string): Promise<Warehouse | null> {
  try {
    const { db } = await connectToDatabase();

    if (!ObjectId.isValid(warehouseId)) {
      return null;
    }

    const warehouse = await db.collection('warehouses').findOne({
      _id: new ObjectId(warehouseId),
    });

    if (!warehouse) {
      return null;
    }

    return {
      ...warehouse,
      _id: warehouse._id.toString(),
    } as Warehouse;
  } catch (error) {
    return null;
  }
}

// Get default warehouse
export async function getDefaultWarehouse(): Promise<Warehouse | null> {
  try {
    const { db } = await connectToDatabase();

    const warehouse = await db.collection('warehouses').findOne({
      isDefault: true,
      isActive: true,
    });

    if (!warehouse) {
      // If no default, get first active warehouse
      const firstActive = await db.collection('warehouses').findOne({
        isActive: true,
      });
      
      if (firstActive) {
        return {
          ...firstActive,
          _id: firstActive._id.toString(),
        } as Warehouse;
      }
      
      return null;
    }

    return {
      ...warehouse,
      _id: warehouse._id.toString(),
    } as Warehouse;
  } catch (error) {
    return null;
  }
}

// Get warehouse by pincode
export async function getWarehouseByPincode(pincode: string): Promise<Warehouse | null> {
  try {
    const { db } = await connectToDatabase();

    const cleanPincode = pincode.replace(/\s/g, '').trim();

    const warehouse = await db.collection('warehouses').findOne({
      pincode: cleanPincode,
      isActive: true,
    });

    if (!warehouse) {
      return null;
    }

    return {
      ...warehouse,
      _id: warehouse._id.toString(),
    } as Warehouse;
  } catch (error) {
    return null;
  }
}

// Create or update warehouse
export async function createOrUpdateWarehouse(
  data: Omit<Warehouse, '_id' | 'createdAt' | 'updatedAt'>,
  warehouseId?: string
): Promise<Warehouse> {
  try {
    const { db } = await connectToDatabase();

    const cleanPincode = data.pincode.replace(/\s/g, '').trim();

    if (cleanPincode.length !== 6 || !/^\d{6}$/.test(cleanPincode)) {
      throw new Error('Invalid pincode format. Must be 6 digits.');
    }

    const updateData: any = {
      ...data,
      pincode: cleanPincode,
      updatedAt: new Date(),
    };

    // If setting as default, unset other defaults
    if (data.isDefault) {
      await db.collection('warehouses').updateMany(
        { _id: warehouseId ? { $ne: new ObjectId(warehouseId) } : {} },
        { $set: { isDefault: false } }
      );
    }

    if (warehouseId && ObjectId.isValid(warehouseId)) {
      // Check if warehouse exists first
      const existingWarehouse = await db.collection('warehouses').findOne({
        _id: new ObjectId(warehouseId),
      });

      if (!existingWarehouse) {
        throw new Error(`Warehouse not found with ID: ${warehouseId}`);
      }

      // Update existing - preserve createdAt
      const updateResult = await db.collection('warehouses').updateOne(
        { _id: new ObjectId(warehouseId) },
        {
          $set: {
            ...updateData,
            createdAt: existingWarehouse.createdAt, // Preserve original createdAt
          },
        }
      );

      if (updateResult.matchedCount === 0) {
        throw new Error(`Warehouse not found with ID: ${warehouseId}`);
      }

      // Document was matched and updated (or no changes if modifiedCount is 0)

      // Fetch the updated document
      const updatedDoc = await db.collection('warehouses').findOne({
        _id: new ObjectId(warehouseId),
      });

      if (!updatedDoc) {
        throw new Error('Failed to fetch updated warehouse');
      }

      // Ensure all fields are properly serialized
      const updatedWarehouse: Warehouse = {
        _id: updatedDoc._id.toString(),
        name: updatedDoc.name || '',
        code: updatedDoc.code || '',
        pincode: updatedDoc.pincode || '',
        address: updatedDoc.address || '',
        city: updatedDoc.city || '',
        state: updatedDoc.state || '',
        district: updatedDoc.district || '',
        country: updatedDoc.country || 'India',
        contactPerson: updatedDoc.contactPerson || '',
        phone: updatedDoc.phone || '',
        email: updatedDoc.email || '',
        isDefault: updatedDoc.isDefault === true,
        isActive: updatedDoc.isActive !== false, // Default to true if not set
        createdAt: updatedDoc.createdAt ? new Date(updatedDoc.createdAt) : new Date(),
        updatedAt: updatedDoc.updatedAt ? new Date(updatedDoc.updatedAt) : new Date(),
      };

      return updatedWarehouse;
    } else {
      // Create new
      const newWarehouse = {
        ...updateData,
        createdAt: new Date(),
      };

      const result = await db.collection('warehouses').insertOne(newWarehouse);

      const created = await db.collection('warehouses').findOne({
        _id: result.insertedId,
      });

      return {
        ...created,
        _id: created._id.toString(),
      } as Warehouse;
    }
  } catch (error) {
    throw error;
  }
}

// Delete warehouse
export async function deleteWarehouse(warehouseId: string): Promise<boolean> {
  try {
    const { db } = await connectToDatabase();

    if (!ObjectId.isValid(warehouseId)) {
      throw new Error('Invalid warehouse ID');
    }

    // Check if it's default warehouse
    const warehouse = await db.collection('warehouses').findOne({
      _id: new ObjectId(warehouseId),
    });

    if (warehouse?.isDefault) {
      throw new Error('Cannot delete default warehouse. Please set another warehouse as default first.');
    }

    const result = await db.collection('warehouses').deleteOne({
      _id: new ObjectId(warehouseId),
    });

    return result.deletedCount > 0;
  } catch (error) {
    throw error;
  }
}

// Get all active warehouses (for dropdowns)
export async function getActiveWarehouses(): Promise<Warehouse[]> {
  try {
    const { db } = await connectToDatabase();

    const warehouses = await db
      .collection('warehouses')
      .find({ isActive: true })
      .sort({ isDefault: -1, name: 1 })
      .toArray();

    return warehouses.map(w => ({
      ...w,
      _id: w._id.toString(),
    })) as Warehouse[];
  } catch (error) {
    return [];
  }
}

