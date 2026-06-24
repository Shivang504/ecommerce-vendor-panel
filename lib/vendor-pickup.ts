import { ObjectId } from 'mongodb';
import type { ShiprocketPickupAddressInput } from '@/lib/shiprocket';
import { getVendorById } from '@/lib/models/vendor';

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
}

/** Shiprocket needs address line >= 10 characters */
export function formatPickupAddressLine(
  address1: string,
  address2?: string,
  city?: string,
  state?: string
): string {
  const primary = (address1 || '').trim();
  if (primary.length >= 10) {
    return primary.slice(0, 80);
  }
  const combined = [primary, address2, city, state].filter(Boolean).join(', ').trim();
  const line = combined.length >= 10 ? combined : combined.padEnd(10, '.');
  return line.slice(0, 80);
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

export function toShiprocketPickupInput(
  vendor: Record<string, any>,
  address: VendorPickupAddress
): ShiprocketPickupAddressInput | null {
  const phone = (address.phone || vendor.phone || vendor.whatsappNumber || '').replace(/\D/g, '').slice(-10);
  const email = (address.email || vendor.email || '').trim();
  const label = (address.label || vendor.storeName || 'Vendor Pickup').trim();

  if (!label || !address.address1 || !address.city || !address.state || !/^\d{6}$/.test(address.pinCode) || phone.length !== 10 || !email) {
    return null;
  }

  return {
    pickupLocation: label.slice(0, 50),
    address: formatPickupAddressLine(address.address1, address.address2, address.city, address.state),
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

export function validatePickupAddressInput(
  input: Partial<VendorPickupAddress>,
  vendor?: Record<string, any>
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!input.label?.trim() || input.label.trim().length < 3) {
    errors.label = 'Location name must be at least 3 characters';
  }
  if (!input.address1?.trim() || input.address1.trim().length < 5) {
    errors.address1 = 'Street address must be at least 5 characters';
  }
  if (!input.city?.trim()) {
    errors.city = 'City is required';
  }
  if (!input.state?.trim()) {
    errors.state = 'State is required';
  }
  if (!input.pinCode?.trim() || !/^\d{6}$/.test(input.pinCode.replace(/\D/g, ''))) {
    errors.pinCode = 'Enter a valid 6-digit pincode';
  }

  const phone = (input.phone || vendor?.phone || '').replace(/\D/g, '');
  if (phone && phone.length !== 10) {
    errors.phone = 'Enter a valid 10-digit phone number';
  }

  const email = (input.email || vendor?.email || '').trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Enter a valid email address';
  }

  return errors;
}

export async function resolveVendorPickupAddress(
  db: any,
  items: Array<{ vendorId?: string }>,
  preferredVendorId?: string
): Promise<{ vendorId?: string; pickupAddress: ShiprocketPickupAddressInput | null }> {
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

      const defaultAddress = getDefaultPickupAddress(vendor);
      if (!defaultAddress) {
        console.warn('[Vendor Pickup] No pickup address on vendor profile:', vendorId);
        continue;
      }

      const pickupAddress = toShiprocketPickupInput(vendor, defaultAddress);
      if (pickupAddress) {
        return { vendorId, pickupAddress };
      }

      console.warn('[Vendor Pickup] Pickup address incomplete for Shiprocket:', {
        vendorId,
        label: defaultAddress.label,
        pinCode: defaultAddress.pinCode,
        hasPhone: !!(defaultAddress.phone || vendor.phone),
        hasEmail: !!(defaultAddress.email || vendor.email),
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
