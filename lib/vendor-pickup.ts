import { ObjectId } from 'mongodb';
import type { ShiprocketPickupAddressInput } from '@/lib/shiprocket';
import { getVendorById } from '@/lib/models/vendor';

export { validatePickupAddressInput } from '@/lib/vendor-pickup-validation';

export interface VendorPickupAddress {
  id: string;
  label: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  pinCode: string;
  country: string;
  phone?: string;
  email?: string;
  contactPerson?: string;
  isDefault: boolean;
  shiprocketPickupCode?: string;
  shiprocketPickupId?: number;
  shiprocketVerified?: boolean;
  shiprocketSyncError?: string;
  shiprocketSyncedAt?: string;
}

/** Shiprocket requires a house/flat/road number (digit) in the street address */
export function hasShiprocketAddressNumber(...parts: Array<string | undefined>): boolean {
  return parts.some((part) => /\d/.test((part || '').trim()));
}

/** Pass vendor address as entered — validation happens when saving pickup addresses */
export function formatPickupAddressLine(address1: string): string {
  return (address1 || '').trim().slice(0, 80);
}

export function normalizePickupAddresses(vendor: Record<string, any> | null | undefined): VendorPickupAddress[] {
  if (!vendor) return [];

  if (Array.isArray(vendor.pickupAddresses) && vendor.pickupAddresses.length > 0) {
    return vendor.pickupAddresses.map((addr: VendorPickupAddress) => ({
      ...addr,
      country: addr.country || 'India',
    }));
  }

  if (vendor.address1 && vendor.city && vendor.state && vendor.pinCode) {
    return [
      {
        id: 'legacy',
        label: vendor.pickupLocation || vendor.storeName || 'Primary Warehouse',
        address1: String(vendor.address1),
        address2: vendor.address2 ? String(vendor.address2) : undefined,
        city: String(vendor.city),
        state: String(vendor.state),
        pinCode: String(vendor.pinCode).replace(/\D/g, '').slice(0, 6),
        country: vendor.country || 'India',
        phone: vendor.phone ? String(vendor.phone) : undefined,
        email: vendor.email ? String(vendor.email) : undefined,
        contactPerson: vendor.ownerName ? String(vendor.ownerName) : undefined,
        isDefault: true,
      },
    ];
  }

  return [];
}

export function getDefaultPickupAddress(vendor: Record<string, any> | null | undefined): VendorPickupAddress | null {
  const addresses = normalizePickupAddresses(vendor);
  return addresses.find(a => a.isDefault) || addresses[0] || null;
}

export function getPickupAddressById(
  vendor: Record<string, any> | null | undefined,
  addressId?: string | null
): VendorPickupAddress | null {
  if (!addressId) return null;
  const addresses = normalizePickupAddresses(vendor);
  return addresses.find(a => a.id === addressId) || null;
}

export function resolvePickupAddressForVendor(
  vendor: Record<string, any>,
  preferredAddressId?: string | null
): VendorPickupAddress | null {
  return (
    getPickupAddressById(vendor, preferredAddressId) ||
    getDefaultPickupAddress(vendor)
  );
}

export function toShiprocketPickupInput(
  vendor: Record<string, any>,
  address: VendorPickupAddress
): ShiprocketPickupAddressInput | null {
  const phone = (address.phone || vendor.phone || vendor.whatsappNumber || '').replace(/\D/g, '').slice(-10);
  const email = (address.email || vendor.email || '').trim();
  const label = (address.label || vendor.storeName || 'Vendor Pickup').trim();

  if (
    !label ||
    !address.address1 ||
    address.address1.trim().length < 10 ||
    !hasShiprocketAddressNumber(address.address1, address.address2) ||
    !address.city ||
    !address.state ||
    !/^\d{6}$/.test(address.pinCode) ||
    phone.length !== 10 ||
    !email
  ) {
    return null;
  }

  return {
    pickupLocation: label.slice(0, 50),
    address: formatPickupAddressLine(address.address1),
    address2: address.address2?.trim() || undefined,
    city: address.city.trim(),
    state: address.state.trim(),
    country: address.country || 'India',
    pincode: address.pinCode.replace(/\D/g, '').slice(0, 6),
    contactPerson: (address.contactPerson || vendor.ownerName || vendor.storeName || label).trim(),
    phone,
    email,
    sellerName: (vendor.storeName || vendor.ownerName || label).trim(),
  };
}

export function createPickupAddressId(): string {
  return new ObjectId().toString();
}

/** Addresses stored on vendor doc for add/update/delete (migrates legacy single address). */
export function getMutablePickupAddresses(vendor: Record<string, any> | null | undefined): VendorPickupAddress[] {
  if (!vendor) return [];

  if (Array.isArray(vendor.pickupAddresses) && vendor.pickupAddresses.length > 0) {
    return vendor.pickupAddresses.map((addr: VendorPickupAddress) => ({
      ...addr,
      country: addr.country || 'India',
    }));
  }

  const legacyAddresses = normalizePickupAddresses(vendor);
  if (legacyAddresses.length === 0) return [];

  return legacyAddresses.map((addr) =>
    addr.id === 'legacy'
      ? { ...addr, id: createPickupAddressId(), isDefault: true }
      : addr
  );
}

export async function resolveVendorPickupAddress(
  db: any,
  items: Array<{ vendorId?: string; vendorPickupAddressId?: string }>,
  preferredVendorId?: string
): Promise<{
  vendorId?: string;
  pickupAddress: ShiprocketPickupAddressInput | null;
  vendorPickupAddressId?: string;
}> {
  const vendorIds = preferredVendorId
    ? [preferredVendorId]
    : Array.from(
        new Set(
          items
            .map(item => (item.vendorId ? String(item.vendorId) : undefined))
            .filter((id): id is string => !!id)
        )
      );

  for (const vendorId of vendorIds) {
    try {
      if (!ObjectId.isValid(vendorId)) {
        console.warn('[Vendor Pickup] Invalid vendor id:', vendorId);
        continue;
      }

      const vendor = await getVendorById(vendorId);
      if (!vendor) {
        console.warn('[Vendor Pickup] Vendor not found:', vendorId);
        continue;
      }

      const preferredAddressId = items.find(
        item => item.vendorId && String(item.vendorId) === vendorId && item.vendorPickupAddressId
      )?.vendorPickupAddressId;

      const selectedAddress = resolvePickupAddressForVendor(vendor, preferredAddressId);
      if (!selectedAddress) {
        console.warn('[Vendor Pickup] No pickup address on vendor profile:', vendorId);
        continue;
      }

      const pickupAddress = toShiprocketPickupInput(vendor, selectedAddress);
      if (pickupAddress) {
        return {
          vendorId,
          pickupAddress,
          vendorPickupAddressId: selectedAddress.id,
        };
      }

      console.warn('[Vendor Pickup] Pickup address incomplete for Shiprocket:', {
        vendorId,
        label: selectedAddress.label,
        addressId: selectedAddress.id,
        pinCode: selectedAddress.pinCode,
        hasPhone: !!(selectedAddress.phone || vendor.phone),
        hasEmail: !!(selectedAddress.email || vendor.email),
      });
    } catch (error) {
      console.warn('[Vendor Pickup] Could not resolve pickup address:', {
        vendorId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { vendorId: undefined, pickupAddress: null };
}
