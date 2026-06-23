import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, isVendor } from '@/lib/auth';
import { getVendorById, updateVendor } from '@/lib/models/vendor';
import {
  createPickupAddressId,
  normalizePickupAddresses,
  validatePickupAddressInput,
  type VendorPickupAddress,
} from '@/lib/vendor-pickup';

function syncLegacyVendorFields(addresses: VendorPickupAddress[]) {
  const defaultAddress = addresses.find(a => a.isDefault) || addresses[0];
  if (!defaultAddress) return {};

  return {
    pickupLocation: defaultAddress.label,
    address1: defaultAddress.address1,
    address2: defaultAddress.address2 || '',
    city: defaultAddress.city,
    state: defaultAddress.state,
    pinCode: defaultAddress.pinCode,
    country: defaultAddress.country || 'India',
  };
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = getUserFromRequest(request);
    if (!currentUser || !isVendor(currentUser)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const vendor = await getVendorById(currentUser.id);
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    return NextResponse.json({
      addresses: normalizePickupAddresses(vendor),
      storeName: vendor.storeName || '',
      ownerName: vendor.ownerName || '',
      phone: vendor.phone || '',
      email: vendor.email || '',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch pickup addresses' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = getUserFromRequest(request);
    if (!currentUser || !isVendor(currentUser)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const vendor = await getVendorById(currentUser.id);
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    const body = await request.json();
    const action = body.action as 'add' | 'update' | 'delete' | 'setDefault';
    let addresses = normalizePickupAddresses(vendor).filter(a => a.id !== 'legacy');

    if (action === 'add' || action === 'update') {
      const input = body.address || {};
      const errors = validatePickupAddressInput(input, vendor);
      if (Object.keys(errors).length > 0) {
        return NextResponse.json({ error: 'Validation failed', fieldErrors: errors }, { status: 400 });
      }

      const normalized: VendorPickupAddress = {
        id: action === 'update' && body.id && body.id !== 'legacy' ? String(body.id) : createPickupAddressId(),
        label: input.label.trim(),
        address1: input.address1.trim(),
        address2: input.address2?.trim() || undefined,
        city: input.city.trim(),
        state: input.state.trim(),
        pinCode: input.pinCode.replace(/\D/g, '').slice(0, 6),
        country: input.country?.trim() || 'India',
        phone: (input.phone || vendor.phone || '').replace(/\D/g, '').slice(-10) || undefined,
        email: (input.email || vendor.email || '').trim().toLowerCase() || undefined,
        contactPerson: input.contactPerson?.trim() || vendor.ownerName || undefined,
        isDefault: addresses.length === 0 ? true : !!input.isDefault,
      };

      if (action === 'update') {
        const index = addresses.findIndex(a => a.id === body.id);
        if (index === -1) {
          if (body.id !== 'legacy') {
            return NextResponse.json({ error: 'Address not found' }, { status: 404 });
          }
          addresses.push({ ...normalized, isDefault: true });
        } else {
          if (normalized.isDefault) {
            addresses = addresses.map(a => ({ ...a, isDefault: false }));
          }
          addresses[index] = { ...addresses[index], ...normalized, id: addresses[index].id };
        }
      } else {
        if (normalized.isDefault) {
          addresses = addresses.map(a => ({ ...a, isDefault: false }));
        }
        addresses.push(normalized);
      }
    } else if (action === 'delete') {
      if (!body.id) {
        return NextResponse.json({ error: 'Address id is required' }, { status: 400 });
      }
      const deletingDefault = addresses.find(a => a.id === body.id)?.isDefault;
      addresses = addresses.filter(a => a.id !== body.id);
      if (addresses.length === 0) {
        return NextResponse.json(
          { error: 'At least one pickup address is required for shipping' },
          { status: 400 }
        );
      }
      if (deletingDefault) {
        addresses[0].isDefault = true;
      }
    } else if (action === 'setDefault') {
      if (!body.id) {
        return NextResponse.json({ error: 'Address id is required' }, { status: 400 });
      }
      addresses = addresses.map(a => ({ ...a, isDefault: a.id === body.id }));
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    await updateVendor(currentUser.id, {
      pickupAddresses: addresses,
      ...syncLegacyVendorFields(addresses),
    } as any);

    return NextResponse.json({ success: true, addresses });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to save pickup address' }, { status: 500 });
  }
}
