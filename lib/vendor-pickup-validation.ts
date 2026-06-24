import { INDIAN_STATES } from '@/lib/indian-address';

export interface PickupAddressFormInput {
  label?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  country?: string;
  phone?: string;
  email?: string;
  contactPerson?: string;
  isDefault?: boolean;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_REGEX = /^[6-9]\d{9}$/;
const PINCODE_REGEX = /^[1-9]\d{5}$/;
const CITY_REGEX = /^[a-zA-Z\s.'()-]+$/;
const PERSON_NAME_REGEX = /^[a-zA-Z\s.'-]+$/;

export function validatePickupAddressInput(
  input: Partial<PickupAddressFormInput>,
  vendor?: Record<string, unknown>
): Record<string, string> {
  const errors: Record<string, string> = {};

  const label = input.label?.trim() || '';
  if (!label) {
    errors.label = 'Location name is required';
  } else if (label.length < 3) {
    errors.label = 'Location name must be at least 3 characters';
  } else if (label.length > 50) {
    errors.label = 'Location name cannot exceed 50 characters';
  }

  const contactPerson = input.contactPerson?.trim() || '';
  if (!contactPerson) {
    errors.contactPerson = 'Contact person is required';
  } else if (contactPerson.length < 2) {
    errors.contactPerson = 'Contact person name must be at least 2 characters';
  } else if (contactPerson.length > 50) {
    errors.contactPerson = 'Contact person name cannot exceed 50 characters';
  } else if (!PERSON_NAME_REGEX.test(contactPerson)) {
    errors.contactPerson = 'Contact person name can only contain letters and spaces';
  }

  const address1 = input.address1?.trim() || '';
  const address2 = input.address2?.trim() || '';
  if (!address1) {
    errors.address1 = 'Street address is required';
  } else if (address1.length < 10) {
    errors.address1 = 'Enter complete address with house/flat/road number (min 10 characters)';
  } else if (address1.length > 80) {
    errors.address1 = 'Street address cannot exceed 80 characters';
  } else if (!/\d/.test(address1) && !/\d/.test(address2)) {
    errors.address1 =
      'Street address must include house/flat/road number with digits (e.g. House No 12, MG Road)';
  }

  if (address2 && address2.length > 80) {
    errors.address2 = 'Landmark cannot exceed 80 characters';
  }

  const city = input.city?.trim() || '';
  if (!city) {
    errors.city = 'City is required';
  } else if (city.length < 2) {
    errors.city = 'City must be at least 2 characters';
  } else if (city.length > 50) {
    errors.city = 'City cannot exceed 50 characters';
  } else if (!CITY_REGEX.test(city)) {
    errors.city = 'Enter a valid city name';
  }

  const state = input.state?.trim() || '';
  if (!state) {
    errors.state = 'State is required';
  } else if (!INDIAN_STATES.includes(state)) {
    errors.state = 'Select a valid state from the list';
  }

  const pinCode = input.pinCode?.replace(/\D/g, '') || '';
  if (!pinCode) {
    errors.pinCode = 'Pincode is required';
  } else if (!PINCODE_REGEX.test(pinCode)) {
    errors.pinCode = 'Enter a valid 6-digit pincode';
  }

  const phone = (input.phone || '').replace(/\D/g, '').slice(-10);
  const vendorPhone = (vendor?.phone as string | undefined)?.replace(/\D/g, '').slice(-10) || '';
  const resolvedPhone = phone || vendorPhone;
  if (!resolvedPhone) {
    errors.phone = 'Phone number is required';
  } else if (!MOBILE_REGEX.test(resolvedPhone)) {
    errors.phone = 'Enter a valid 10-digit Indian mobile number';
  }

  const email = (input.email || (vendor?.email as string | undefined) || '').trim().toLowerCase();
  if (!email) {
    errors.email = 'Email is required';
  } else if (!EMAIL_REGEX.test(email)) {
    errors.email = 'Enter a valid email address';
  } else if (email.length > 100) {
    errors.email = 'Email cannot exceed 100 characters';
  }

  return errors;
}
