import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export interface Address {
  _id?: string | ObjectId;
  customerId: string | ObjectId;
  type: 'shipping' | 'billing' | 'both';
  name: string;
  phone: string;
  email?: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  landmark?: string;
  isDefault?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export async function getCustomerAddresses(customerId: string) {
  try {
    const { db } = await connectToDatabase();
    const addresses = await db
      .collection('addresses')
      .find({ customerId: new ObjectId(customerId) })
      .sort({ isDefault: -1, createdAt: -1 })
      .toArray();
    
    return addresses.map(addr => ({
      ...addr,
      _id: addr._id.toString(),
      customerId: addr.customerId.toString(),
    })) as Address[];
  } catch (error) {
    console.error('[Address Model] Error fetching addresses:', error);
    throw error;
  }
}

export async function getAddressById(addressId: string, customerId: string) {
  try {
    const { db } = await connectToDatabase();
    const address = await db.collection('addresses').findOne({
      _id: new ObjectId(addressId),
      customerId: new ObjectId(customerId),
    });

    if (!address) return null;

    return {
      ...address,
      _id: address._id.toString(),
      customerId: address.customerId.toString(),
    } as Address;
  } catch (error) {
    console.error('[Address Model] Error fetching address:', error);
    throw error;
  }
}

export async function createAddress(addressData: Omit<Address, '_id' | 'createdAt' | 'updatedAt'>) {
  try {
    const { db } = await connectToDatabase();
    
    // If this is set as default, unset other default addresses
    if (addressData.isDefault) {
      await db.collection('addresses').updateMany(
        { 
          customerId: new ObjectId(addressData.customerId),
          isDefault: true 
        },
        { $set: { isDefault: false } }
      );
    }

    const newAddress = {
      ...addressData,
      customerId: new ObjectId(addressData.customerId),
      isDefault: addressData.isDefault || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('addresses').insertOne(newAddress);
    return {
      ...newAddress,
      _id: result.insertedId.toString(),
      customerId: newAddress.customerId.toString(),
    } as Address;
  } catch (error) {
    console.error('[Address Model] Error creating address:', error);
    throw error;
  }
}

export async function updateAddress(
  addressId: string,
  customerId: string,
  updateData: Partial<Omit<Address, '_id' | 'customerId' | 'createdAt' | 'updatedAt'>>
) {
  try {
    const { db } = await connectToDatabase();

    // If setting as default, unset other defaults
    if (updateData.isDefault) {
      await db.collection('addresses').updateMany(
        { 
          customerId: new ObjectId(customerId),
          _id: { $ne: new ObjectId(addressId) },
          isDefault: true 
        },
        { $set: { isDefault: false } }
      );
    }

    const result = await db.collection('addresses').findOneAndUpdate(
      {
        _id: new ObjectId(addressId),
        customerId: new ObjectId(customerId),
      },
      {
        $set: {
          ...updateData,
          updatedAt: new Date(),
        },
      },
      { returnDocument: 'after' }
    );

    if (!result) return null;

    return {
      ...result,
      _id: result._id.toString(),
      customerId: result.customerId.toString(),
    } as Address;
  } catch (error) {
    console.error('[Address Model] Error updating address:', error);
    throw error;
  }
}

export async function deleteAddress(addressId: string, customerId: string) {
  try {
    const { db } = await connectToDatabase();
    const result = await db.collection('addresses').deleteOne({
      _id: new ObjectId(addressId),
      customerId: new ObjectId(customerId),
    });

    return result.deletedCount > 0;
  } catch (error) {
    console.error('[Address Model] Error deleting address:', error);
    throw error;
  }
}

export async function setDefaultAddress(addressId: string, customerId: string) {
  try {
    const { db } = await connectToDatabase();
    
    // Unset all other default addresses
    await db.collection('addresses').updateMany(
      { 
        customerId: new ObjectId(customerId),
        _id: { $ne: new ObjectId(addressId) }
      },
      { $set: { isDefault: false } }
    );

    // Set this address as default
    const result = await db.collection('addresses').findOneAndUpdate(
      {
        _id: new ObjectId(addressId),
        customerId: new ObjectId(customerId),
      },
      {
        $set: {
          isDefault: true,
          updatedAt: new Date(),
        },
      },
      { returnDocument: 'after' }
    );

    if (!result) return null;

    return {
      ...result,
      _id: result._id.toString(),
      customerId: result.customerId.toString(),
    } as Address;
  } catch (error) {
    console.error('[Address Model] Error setting default address:', error);
    throw error;
  }
}

