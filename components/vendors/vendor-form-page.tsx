'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  ArrowLeft,
  Store,
  Briefcase,
  MapPin,
  CreditCard,
  ImageIcon,
  FileText,
  Share2,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import FormField from '@/components/formField/formField';
import Dropdown from '../customDropdown/customDropdown';
import { MainImageUpload } from '@/components/media/main-image-upload';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { cn } from '@/lib/utils';
import {
  isValidIndianGstin,
  isValidIndianPan,
  sanitizeGstinInput,
  sanitizePanInput,
} from '@/lib/india-tax-ids';
import { reverseGeocodeToIndianPincode } from '@/lib/reverse-geocode-nominatim';
import { INDIAN_STATES, COUNTRY_OPTIONS, matchApiStateToIndianState } from '@/lib/indian-address';

type VendorTabId =
  | 'basic'
  | 'business'
  | 'address'
  | 'bank'
  | 'media'
  | 'documents'
  | 'social'
  | 'status';

interface VendorFormData {
  storeName: string;
  storeSlug: string;
  ownerName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  alternatePhone: string;
  whatsappNumber: string;
  businessType: 'individual' | 'company' | 'partnership';
  gstNumber: string;
  panNumber: string;
  businessRegistrationNumber: string;
  description: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  pinCode: string;
  country: string;
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;
  logo: string;
  banner: string;
  commissionRate: number;
  facebook: string;
  instagram: string;
  twitter: string;
  website: string;
  idProof: string;
  addressProof: string;
  gstCertificate: string;
  cancelledCheque: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  approvalNotes: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  documentsVerified: boolean;
}

/** Digits only; if more than 10 (e.g. pasted +91…), keep the last 10. */
function sanitizeTenDigitPhoneInput(raw: string): string {
  const d = raw.replace(/\D/g, '');
  if (d.length <= 10) return d;
  return d.slice(-10);
}

function isExactlyTenDigits(value: string): boolean {
  return /^\d{10}$/.test(value.trim());
}

const TEN_DIGIT_PHONE_FIELDS = new Set(['phone', 'alternatePhone', 'whatsappNumber']);

function sanitizePinCodeInput(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 6);
}

function isExactlySixDigits(value: string): boolean {
  return /^\d{6}$/.test(value.trim());
}

/** IFSC: 4 letters + 0 + 6 alphanumeric (admin vendor profile API) */
const INDIAN_IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const INDIAN_BANK_ACCOUNT_REGEX = /^[0-9]{6,18}$/;

function sanitizeIfscInput(raw: string): string {
  return raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 11);
}

function sanitizeAccountNumberInput(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 18);
}

function isValidUpiId(value: string): boolean {
  const v = value.trim();
  return v.length >= 3 && /^[^\s@]+@[^\s@]+$/.test(v);
}

interface VendorFormProps {
  vendorId?: string;
}

const VENDOR_FIELD_TAB_MAP: Record<string, VendorTabId> = {
  storeName: 'basic',
  storeSlug: 'basic',
  ownerName: 'basic',
  email: 'basic',
  password: 'basic',
  confirmPassword: 'basic',
  phone: 'basic',
  alternatePhone: 'basic',
  whatsappNumber: 'basic',
  description: 'basic',
  businessType: 'business',
  gstNumber: 'business',
  panNumber: 'business',
  businessRegistrationNumber: 'business',
  address1: 'address',
  city: 'address',
  state: 'address',
  pinCode: 'address',
  bankName: 'bank',
  accountHolderName: 'bank',
  accountNumber: 'bank',
  ifscCode: 'bank',
  upiId: 'bank',
  commissionRate: 'media',
  logo: 'media',
  banner: 'media',
  idProof: 'documents',
  addressProof: 'documents',
  gstCertificate: 'documents',
  cancelledCheque: 'documents',
  facebook: 'social',
  instagram: 'social',
  twitter: 'social',
  website: 'social',
  status: 'status',
  approvalNotes: 'status',
};

function getTabsWithErrors(errorFields: Record<string, string>): Set<VendorTabId> {
  const tabs = new Set<VendorTabId>();
  Object.keys(errorFields).forEach(field => {
    const tab = VENDOR_FIELD_TAB_MAP[field];
    if (tab) tabs.add(tab);
  });
  return tabs;
}

export function VendorFormPage({ vendorId }: VendorFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [formData, setFormData] = useState<VendorFormData>({
    storeName: '',
    storeSlug: '',
    ownerName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    alternatePhone: '',
    whatsappNumber: '',
    businessType: 'individual',
    gstNumber: '',
    panNumber: '',
    businessRegistrationNumber: '',
    description: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    pinCode: '',
    country: 'India',
    bankName: '',
    accountHolderName: '',
    accountNumber: '',
    ifscCode: '',
    upiId: '',
    logo: '',
    banner: '',
    commissionRate: 0,
    facebook: '',
    instagram: '',
    twitter: '',
    website: '',
    idProof: '',
    addressProof: '',
    gstCertificate: '',
    cancelledCheque: '',
    status: 'pending',
    approvalNotes: '',
    emailVerified: false,
    phoneVerified: false,
    documentsVerified: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!vendorId);
  const [tabsWithErrors, setTabsWithErrors] = useState<Set<VendorTabId>>(new Set());
  /** Sorted unique names from Razorpay IFSC open dataset (via /api/reference/indian-banks) */
  const [indianBanks, setIndianBanks] = useState<string[]>([]);
  const [indianBanksLoading, setIndianBanksLoading] = useState(true);
  const [postalOffices, setPostalOffices] = useState<
    Array<{ name: string; district: string; state: string }>
  >([]);
  const [pincodeLookupLoading, setPincodeLookupLoading] = useState(false);
  const [pincodeLookupError, setPincodeLookupError] = useState<string | null>(null);
  const [geoDetecting, setGeoDetecting] = useState(false);
  /** After loading an existing vendor, skip one auto-lookup so we do not overwrite saved address */
  const skipNextPinLookupRef = useRef(false);
  const [activeTab, setActiveTab] = useState<
    | 'basic'
    | 'business'
    | 'address'
    | 'bank'
    | 'media'
    | 'documents'
    | 'social'
    | 'status'
  >('basic');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch('/api/reference/indian-banks');
        const data = await response.json();
        if (cancelled) return;
        if (response.ok && Array.isArray(data.banks)) {
          setIndianBanks(data.banks);
        } else {
          toast({
            title: 'Bank list unavailable',
            description: 'You can still type the bank name manually.',
            variant: 'destructive',
          });
        }
      } catch {
        if (!cancelled) {
          toast({
            title: 'Bank list unavailable',
            description: 'You can still type the bank name manually.',
            variant: 'destructive',
          });
        }
      } finally {
        if (!cancelled) setIndianBanksLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const bankNameOptions = useMemo(() => {
    const opts = indianBanks.map(name => ({ value: name, label: name }));
    const current = formData.bankName.trim();
    if (
      current &&
      !opts.some(o => o.value.toLowerCase() === current.toLowerCase())
    ) {
      opts.unshift({ value: current, label: `${current} (saved)` });
    }
    return opts;
  }, [indianBanks, formData.bankName]);

  const cityDropdownOptions = useMemo(() => {
    const fromPostal = [
      ...new Set(
        postalOffices.map(o => o.district?.trim()).filter((d): d is string => Boolean(d))
      ),
    ].sort((a, b) => a.localeCompare(b, 'en-IN'));
    const opts = fromPostal.map(d => ({ value: d, label: d }));
    const current = formData.city.trim();
    if (current && !fromPostal.some(d => d.toLowerCase() === current.toLowerCase())) {
      opts.unshift({ value: current, label: `${current} (saved)` });
    }
    return opts;
  }, [postalOffices, formData.city]);

  useEffect(() => {
    if (vendorId) {
      const fetchVendor = async () => {
        try {
          const response = await fetch(`/api/admin/vendors/${vendorId}`);
          if (response.ok) {
            const data = await response.json();
            const v = data.vendor;
            skipNextPinLookupRef.current = true;
            setFormData(prev => ({
              ...prev,
              ...v,
              phone: v.phone != null ? sanitizeTenDigitPhoneInput(String(v.phone)) : prev.phone,
              alternatePhone:
                v.alternatePhone != null
                  ? sanitizeTenDigitPhoneInput(String(v.alternatePhone))
                  : prev.alternatePhone,
              whatsappNumber:
                v.whatsappNumber != null
                  ? sanitizeTenDigitPhoneInput(String(v.whatsappNumber))
                  : prev.whatsappNumber,
              gstNumber: v.gstNumber != null ? sanitizeGstinInput(String(v.gstNumber)) : prev.gstNumber,
              panNumber: v.panNumber != null ? sanitizePanInput(String(v.panNumber)) : prev.panNumber,
              pinCode: v.pinCode != null ? sanitizePinCodeInput(String(v.pinCode)) : prev.pinCode,
              ifscCode: v.ifscCode != null ? sanitizeIfscInput(String(v.ifscCode)) : prev.ifscCode,
              accountNumber:
                v.accountNumber != null ? sanitizeAccountNumberInput(String(v.accountNumber)) : prev.accountNumber,
            }));
          } else {
            toast({
              title: 'Error',
              description: 'Failed to fetch vendor',
              variant: 'destructive',
            });
          }
        } catch (error) {
          console.error('[v0] Failed to fetch vendor:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchVendor();
    }
  }, [vendorId, toast]);

  useEffect(() => {
    const pin = formData.pinCode;
    if (pin.length !== 6) {
      setPincodeLookupLoading(false);
      setPincodeLookupError(null);
      setPostalOffices([]);
      return;
    }

    if (skipNextPinLookupRef.current) {
      skipNextPinLookupRef.current = false;
      setPincodeLookupLoading(false);
      return;
    }

    setPincodeLookupLoading(true);
    setPincodeLookupError(null);
    const ac = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const r = await fetch(
          `/api/reference/postal-pincode?pincode=${encodeURIComponent(pin)}`,
          { signal: ac.signal }
        );
        const data = await r.json();
        if (!r.ok) {
          throw new Error(data.error || 'Could not verify this PIN code');
        }
        const offices = data.postOffices as Array<{
          name: string;
          district: string;
          state: string;
        }>;
        if (!offices?.length) {
          throw new Error('No data for this PIN code');
        }
        setPostalOffices(offices);
        const first = offices[0];
        const stateVal = matchApiStateToIndianState(first.state);
        setFormData(prev => ({
          ...prev,
          city: first.district || prev.city,
          state: stateVal || prev.state,
          country: 'India',
          address2:
            offices.length > 1
              ? first.name
              : prev.address2.trim()
                ? prev.address2
                : first.name,
        }));
        setErrors(prev => {
          if (!prev.city && !prev.state && !prev.pinCode) return prev;
          const next = { ...prev };
          delete next.city;
          delete next.state;
          delete next.pinCode;
          setTabsWithErrors(getTabsWithErrors(next));
          return next;
        });
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') return;
        setPostalOffices([]);
        setPincodeLookupError(e instanceof Error ? e.message : 'PIN lookup failed');
      } finally {
        if (!ac.signal.aborted) setPincodeLookupLoading(false);
      }
    }, 450);

    return () => {
      clearTimeout(timer);
      ac.abort();
    };
  }, [formData.pinCode]);

  const isFieldInActiveTab = (field: string) => {
    const tab = VENDOR_FIELD_TAB_MAP[field];
    if (!tab) return true;
    return tab === activeTab;
  };

  const clearFieldError = (field: string) => {
    setErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      setTabsWithErrors(getTabsWithErrors(next));
      return next;
    });
  };

  const updateField = (field: keyof VendorFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    clearFieldError(field as string);
  };

  const getFieldError = (field: keyof VendorFormData) =>
    isFieldInActiveTab(field as string) ? errors[field] : undefined;

  const uploadVendorAsset = async (file: File) => {
    try {
      const payload = new FormData();
      payload.append('file', file);
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: payload,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.details || data.error || 'Upload failed');
      }
      toast({
        title: 'Success',
        description: 'File uploaded successfully',
      });
      return data.url as string;
    } catch (error) {
      console.error('[v0] Upload error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to upload file',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value: raw } = e.target;
    let value = raw;
    if (TEN_DIGIT_PHONE_FIELDS.has(name)) {
      value = sanitizeTenDigitPhoneInput(raw);
    } else if (name === 'gstNumber') {
      value = sanitizeGstinInput(raw);
    } else if (name === 'panNumber') {
      value = sanitizePanInput(raw);
    } else if (name === 'pinCode') {
      value = sanitizePinCodeInput(raw);
    } else if (name === 'ifscCode') {
      value = sanitizeIfscInput(raw);
    } else if (name === 'accountNumber') {
      value = sanitizeAccountNumberInput(raw);
    }
    updateField(name as keyof VendorFormData, value);

    if (name === 'storeName' && !vendorId) {
      const slug = value
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '');
      updateField('storeSlug', slug);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator?.geolocation) {
      toast({
        variant: 'destructive',
        title: 'Not supported',
        description: 'Your browser does not support location access.',
      });
      return;
    }

    setGeoDetecting(true);
    setPincodeLookupError(null);
    navigator.geolocation.getCurrentPosition(
      async position => {
        try {
          const { latitude, longitude } = position.coords;
          const { pincode } = await reverseGeocodeToIndianPincode(latitude, longitude);
          if (!pincode || !/^\d{6}$/.test(pincode)) {
            throw new Error('Could not detect a valid 6-digit PIN. Enter it manually.');
          }
          updateField('pinCode', pincode);
          clearFieldError('pinCode');
          toast({
            description: `PIN ${pincode} detected — filling city and state from India Post.`,
          });
        } catch (e) {
          toast({
            variant: 'destructive',
            title: 'Location',
            description: e instanceof Error ? e.message : 'Unable to detect your location.',
          });
        } finally {
          setGeoDetecting(false);
        }
      },
      geoError => {
        setGeoDetecting(false);
        const description =
          geoError.code === geoError.PERMISSION_DENIED
            ? 'Location permission denied. Allow access in the browser or enter PIN manually.'
            : 'Unable to fetch your location. Try again.';
        toast({ variant: 'destructive', title: 'Location', description });
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 }
    );
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.storeName) newErrors.storeName = 'Store name is required';
    if (!formData.ownerName) newErrors.ownerName = 'Owner name is required';
    if (!formData.email) newErrors.email = 'Email is required';
    
    // Password validation - required for new vendors, optional for updates
    if (!vendorId) {
      if (!formData.password) {
        newErrors.password = 'Password is required';
      } else if (formData.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters';
      }
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Please confirm password';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    } else if (formData.password || formData.confirmPassword) {
      // If updating and password fields are filled, validate them
      if (formData.password && formData.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters';
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone is required';
    } else if (!isExactlyTenDigits(formData.phone)) {
      newErrors.phone = 'Phone must be exactly 10 digits';
    }

    if (formData.alternatePhone.trim() && !isExactlyTenDigits(formData.alternatePhone)) {
      newErrors.alternatePhone = 'Alternate phone must be exactly 10 digits';
    }

    if (formData.whatsappNumber.trim() && !isExactlyTenDigits(formData.whatsappNumber)) {
      newErrors.whatsappNumber = 'WhatsApp number must be exactly 10 digits';
    }

    if (formData.gstNumber.trim() && !isValidIndianGstin(formData.gstNumber)) {
      newErrors.gstNumber = 'Enter a valid 15-character GSTIN';
    }
    if (formData.panNumber.trim() && !isValidIndianPan(formData.panNumber)) {
      newErrors.panNumber = 'Enter a valid PAN (e.g., ABCDE1234F)';
    }

    if (!formData.address1) newErrors.address1 = 'Address is required';
    if (!formData.city) newErrors.city = 'City is required';
    if (!formData.state) newErrors.state = 'State is required';
    if (!formData.pinCode.trim()) {
      newErrors.pinCode = 'PIN code is required';
    } else if (!isExactlySixDigits(formData.pinCode)) {
      newErrors.pinCode = 'PIN code must be exactly 6 digits';
    }

    if (!formData.bankName.trim()) {
      newErrors.bankName = 'Bank name is required';
    }
    if (!formData.accountHolderName.trim()) {
      newErrors.accountHolderName = 'Account holder name is required';
    } else if (formData.accountHolderName.trim().length < 2) {
      newErrors.accountHolderName = 'Account holder name must be at least 2 characters';
    }
    if (!formData.accountNumber.trim()) {
      newErrors.accountNumber = 'Account number is required';
    } else if (!INDIAN_BANK_ACCOUNT_REGEX.test(formData.accountNumber.trim())) {
      newErrors.accountNumber = 'Account number must be 6–18 digits';
    }
    if (!formData.ifscCode.trim()) {
      newErrors.ifscCode = 'IFSC code is required';
    } else if (!INDIAN_IFSC_REGEX.test(formData.ifscCode.trim().toUpperCase())) {
      newErrors.ifscCode = 'Enter a valid IFSC code';
    }
    if (!formData.upiId.trim()) {
      newErrors.upiId = 'UPI ID is required';
    } else if (!isValidUpiId(formData.upiId)) {
      newErrors.upiId = 'Enter a valid UPI ID (e.g. name@paytm)';
    }

    setErrors(newErrors);
    setTabsWithErrors(getTabsWithErrors(newErrors));
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const method = vendorId ? 'PUT' : 'POST';
      const url = vendorId ? `/api/admin/vendors/${vendorId}` : '/api/admin/vendors';

      const { _id, createdAt, updatedAt, confirmPassword, ...dataToSend } = formData as any;
      
      // Remove password field if empty (for updates)
      if (vendorId && !dataToSend.password) {
        delete dataToSend.password;
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: vendorId ? 'Vendor updated successfully' : 'Vendor created successfully',
          variant : 'success'
        });
        router.push('/admin/vendors');
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to save vendor',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('[v0] Save error:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while saving',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'basic', label: 'Store Information', icon: Store },
    { id: 'business', label: 'Business Details', icon: Briefcase },
    { id: 'address', label: 'Address', icon: MapPin },
    { id: 'bank', label: 'Banking', icon: CreditCard },
    { id: 'media', label: 'Media & Commission', icon: ImageIcon },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'social', label: 'Social Links', icon: Share2 },
    { id: 'status', label: 'Verification & Status', icon: ShieldCheck },
  ] as const;

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <p className='text-lg text-slate-600'>Loading vendor...</p>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8'>
      <div className='max-w-7xl mx-auto space-y-6'>
        <div className='bg-white rounded-lg shadow-sm p-4 md:p-6'>
          <div className='flex items-center gap-4'>
            <button
              type='button'
              onClick={() => router.push('/admin/vendors')}
              className='inline-flex items-center justify-center cursor-pointer bg-white p-2 text-slate-700 hover:bg-slate-50 rounded-lg border border-slate-200'
            >
              <ArrowLeft className='h-5 w-5' />
            </button>
            <div>
              <h1 className='text-2xl md:text-3xl font-bold text-slate-900'>
                {vendorId ? 'Edit Vendor' : 'Add New Vendor'}
              </h1>
              <p className='text-sm text-slate-500'>
                Keep all vendor onboarding details organized with tabbed sections.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className='space-y-6'>
          <div className='grid grid-cols-1 lg:grid-cols-12 gap-6'>
            <aside className='lg:col-span-3'>
              <div className='bg-white rounded-lg shadow-sm p-2 space-y-1'>
                {tabs.map(tab => {
                  const Icon = tab.icon;
                  const hasError = tabsWithErrors.has(tab.id);
                  return (
                    <button
                      type='button'
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition cursor-pointer',
                        activeTab === tab.id
                          ? 'bg-gray-100 text-primary font-medium'
                          : 'text-gray-700 hover:bg-gray-50',
                      )}
                    >
                      <Icon className='w-5 h-5' />
                      <span
                        className={cn('text-sm md:text-base', hasError && 'text-red-600')}
                      >
                        {tab.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </aside>

            <section className='lg:col-span-9 space-y-6'>
              <Card className='bg-white border border-slate-200'>
                <div className='space-y-6 px-6 py-6'>
                  {activeTab === 'basic' && (
                    <div className='space-y-6'>
                      <div>
                        <h3 className='text-xl font-semibold text-slate-900'>Store Information</h3>
                        <p className='text-sm text-slate-500'>Provide the vendor’s primary store details.</p>
                      </div>

                      <div className='space-y-4'>
                        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                          <FormField
                            label='Store Name'
                            required
                            id='storeName'
                            name='storeName'
                            value={formData.storeName}
                            onChange={handleInputChange}
                            placeholder='Enter store name'
                            error={getFieldError('storeName')}
                          />
                          <FormField
                            label='Store Slug'
                            required
                            id='storeSlug'
                            name='storeSlug'
                            value={formData.storeSlug}
                            onChange={handleInputChange}
                            placeholder='auto-generated-slug'
                          />
                        </div>

                        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                          <FormField
                            label='Owner Name'
                            required
                            id='ownerName'
                            name='ownerName'
                            value={formData.ownerName}
                            onChange={handleInputChange}
                            placeholder='Enter owner name'
                            error={getFieldError('ownerName')}
                          />
                          <FormField
                            label='Email'
                            required
                            id='email'
                            name='email'
                            type='email'
                            value={formData.email}
                            onChange={handleInputChange}
                            placeholder='email@example.com'
                            error={getFieldError('email')}
                          />
                        </div>

                        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                          <FormField
                            label='Password'
                            required={!vendorId}
                            id='password'
                            name='password'
                            type='password'
                            value={formData.password}
                            onChange={handleInputChange}
                            placeholder={vendorId ? 'Leave blank to keep current password' : 'Enter password'}
                            error={getFieldError('password')}
                          />
                          <FormField
                            label='Confirm Password'
                            required={!vendorId}
                            id='confirmPassword'
                            name='confirmPassword'
                            type='password'
                            value={formData.confirmPassword}
                            onChange={handleInputChange}
                            placeholder={vendorId ? 'Leave blank to keep current password' : 'Confirm password'}
                            error={getFieldError('confirmPassword')}
                          />
                        </div>

                        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                          <FormField
                            label='Phone'
                            required
                            id='phone'
                            name='phone'
                            type='tel'
                            inputMode='numeric'
                            autoComplete='tel'
                            maxLength={10}
                            value={formData.phone}
                            onChange={handleInputChange}
                            placeholder='10-digit number'
                            error={getFieldError('phone')}
                          />
                          <FormField
                            label='Alternate Phone'
                            id='alternatePhone'
                            name='alternatePhone'
                            type='tel'
                            inputMode='numeric'
                            autoComplete='tel'
                            maxLength={10}
                            value={formData.alternatePhone}
                            onChange={handleInputChange}
                            placeholder='10-digit number'
                            error={getFieldError('alternatePhone')}
                          />
                          <FormField
                            label='WhatsApp Number'
                            id='whatsappNumber'
                            name='whatsappNumber'
                            type='tel'
                            inputMode='numeric'
                            autoComplete='tel'
                            maxLength={10}
                            value={formData.whatsappNumber}
                            onChange={handleInputChange}
                            placeholder='10-digit number'
                            error={getFieldError('whatsappNumber')}
                          />
                        </div>

                        <RichTextEditor
                          label='Store Description'
                          value={formData.description}
                          onChange={val => updateField('description', val)}
                          placeholder='Describe your business...'
                        />
                      </div>
                    </div>
                  )}

                  {activeTab === 'business' && (
                    <div className='space-y-6'>
                      <div>
                        <h3 className='text-xl font-semibold text-slate-900'>Business Details</h3>
                        <p className='text-sm text-slate-500'>Capture legal business information for compliance.</p>
                      </div>

                      <div className='space-y-4'>
                        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                            <Dropdown
                              labelMain='Business Type'
                              options={[
                                { label: 'Individual', value: 'individual' },
                                { label: 'Company', value: 'company' },
                                { label: 'Partnership', value: 'partnership' },
                              ]}
                              value={formData.businessType}
                              onChange={option => updateField('businessType', option.value as any)}
                              placeholder='Select type'
                            />
                          <FormField
                            label='GST Number'
                            id='gstNumber'
                            name='gstNumber'
                            value={formData.gstNumber}
                            onChange={handleInputChange}
                            placeholder='15-character GSTIN'
                            maxLength={15}
                            autoComplete='off'
                            spellCheck={false}
                            helperText='Example: 22AAAAA0000A1Z5'
                            error={getFieldError('gstNumber')}
                          />
                          <FormField
                            label='PAN Number'
                            id='panNumber'
                            name='panNumber'
                            value={formData.panNumber}
                            onChange={handleInputChange}
                            placeholder='e.g. ABCDE1234F'
                            maxLength={10}
                            autoComplete='off'
                            spellCheck={false}
                            error={getFieldError('panNumber')}
                          />
                        </div>

                        <FormField
                          label='Business Registration Number'
                          id='businessRegistrationNumber'
                          name='businessRegistrationNumber'
                          value={formData.businessRegistrationNumber}
                          onChange={handleInputChange}
                          placeholder='Registration number'
                        />
                      </div>
                    </div>
                  )}

                  {activeTab === 'address' && (
                    <div className='space-y-6'>
                      <div>
                        <h3 className='text-xl font-semibold text-slate-900'>Address Details</h3>
                        <p className='text-sm text-slate-500'>
                          Enter PIN code or use your current location — district, state, and locality fill from India
                          Post.
                        </p>
                      </div>

                      <div className='space-y-4'>
                        <div className='space-y-1 max-w-md'>
                          <FormField
                            label='PIN Code'
                            required
                            id='pinCode'
                            name='pinCode'
                            type='tel'
                            inputMode='numeric'
                            maxLength={6}
                            value={formData.pinCode}
                            onChange={e => {
                              setPincodeLookupError(null);
                              handleInputChange(e);
                            }}
                            placeholder='6-digit PIN'
                            helperText='Type 6 digits or use location — then pick country, state, and city below.'
                            error={getFieldError('pinCode') || pincodeLookupError || undefined}
                          />
                          {pincodeLookupLoading && (
                            <p className='text-xs text-slate-500'>Looking up PIN code…</p>
                          )}
                          <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            className='mt-2 gap-2 border-slate-300'
                            disabled={geoDetecting || pincodeLookupLoading}
                            onClick={handleUseCurrentLocation}>
                            {geoDetecting ? (
                              <Loader2 className='h-4 w-4 animate-spin' aria-hidden />
                            ) : (
                              <MapPin className='h-4 w-4' aria-hidden />
                            )}
                            Use current location
                          </Button>
                          <p className='text-xs text-slate-500 mt-1'>
                            Uses device GPS, then OpenStreetMap to find PIN (same idea as store location picker).
                          </p>
                        </div>

                        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                          <Dropdown
                            labelMain='Country *'
                            options={COUNTRY_OPTIONS}
                            value={formData.country || 'India'}
                            onChange={option => updateField('country', option.value)}
                            placeholder='Select country'
                          />
                          <Dropdown
                            labelMain='State *'
                            options={INDIAN_STATES.map(state => ({ label: state, value: state }))}
                            value={formData.state}
                            onChange={option => updateField('state', option.value)}
                            placeholder='Select state'
                            error={getFieldError('state')}
                            withSearch
                          />
                          <Dropdown
                            labelMain='City / District *'
                            options={cityDropdownOptions}
                            value={formData.city}
                            onChange={option => updateField('city', option.value)}
                            placeholder={
                              cityDropdownOptions.length === 0
                                ? 'Enter PIN code first'
                                : 'Select city / district'
                            }
                            error={getFieldError('city')}
                            withSearch
                            disabled={cityDropdownOptions.length === 0}
                          />
                        </div>
                        {cityDropdownOptions.length === 0 && formData.pinCode.length === 6 && !pincodeLookupLoading && (
                          <p className='text-xs text-slate-500 -mt-2'>
                            City list appears after India Post returns data for this PIN. If the PIN is invalid, fix
                            it above.
                          </p>
                        )}

                        {postalOffices.length > 1 && (
                          <Dropdown
                            labelMain='Locality / Post office'
                            options={postalOffices.map(o => ({
                              value: o.name,
                              label: o.name,
                            }))}
                            placeholder='Select locality'
                            withSearch
                            value={formData.address2}
                            onChange={option => {
                              const office = postalOffices.find(o => o.name === option.value);
                              if (office) {
                                setFormData(prev => ({
                                  ...prev,
                                  address2: option.value,
                                  city: office.district || prev.city,
                                  state: matchApiStateToIndianState(office.state) || prev.state,
                                }));
                              } else {
                                updateField('address2', option.value);
                              }
                              clearFieldError('address2');
                            }}
                          />
                        )}

                        <FormField
                          label='Address Line 1'
                          required
                          id='address1'
                          name='address1'
                          value={formData.address1}
                          onChange={handleInputChange}
                          placeholder='Building, street, landmark'
                          error={getFieldError('address1')}
                        />

                        <FormField
                          label='Address Line 2'
                          id='address2'
                          name='address2'
                          value={formData.address2}
                          onChange={e => {
                            handleInputChange(e);
                            clearFieldError('address2');
                          }}
                          placeholder={
                            postalOffices.length > 1
                              ? 'Or pick locality from the list above'
                              : 'Area, apartment, suite (optional)'
                          }
                          disabled={postalOffices.length > 1}
                        />

                      </div>
                    </div>
                  )}

                  {activeTab === 'bank' && (
                    <div className='space-y-6'>
                      <div>
                        <h3 className='text-xl font-semibold text-slate-900'>Bank Details</h3>
                        <p className='text-sm text-slate-500'>All fields are required for payment settlement.</p>
                      </div>

                      <div className='space-y-4'>
                        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                          {indianBanksLoading ? (
                            <div>
                              <Label className='mb-2 block'>
                                Bank Name <span className='text-red-500'>*</span>
                              </Label>
                              <div className='rounded-md border border-slate-200 bg-slate-50 px-4 py-[10px] text-sm text-slate-500'>
                                Loading Indian banks…
                              </div>
                            </div>
                          ) : indianBanks.length > 0 ? (
                            <Dropdown
                              labelMain='Bank Name *'
                              options={bankNameOptions}
                              placeholder='Search and select bank'
                              withSearch
                              value={formData.bankName}
                              onChange={option => updateField('bankName', option.value)}
                              error={getFieldError('bankName')}
                            />
                          ) : (
                            <FormField
                              label='Bank Name'
                              required
                              id='bankName'
                              name='bankName'
                              value={formData.bankName}
                              onChange={handleInputChange}
                              placeholder='Enter bank name'
                              error={getFieldError('bankName')}
                            />
                          )}
                          <FormField
                            label='Account Holder Name'
                            required
                            id='accountHolderName'
                            name='accountHolderName'
                            value={formData.accountHolderName}
                            onChange={handleInputChange}
                            placeholder='Name as per bank'
                            error={getFieldError('accountHolderName')}
                          />
                        </div>

                        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                          <FormField
                            label='Account Number'
                            required
                            id='accountNumber'
                            name='accountNumber'
                            type='tel'
                            inputMode='numeric'
                            maxLength={18}
                            value={formData.accountNumber}
                            onChange={handleInputChange}
                            placeholder='6–18 digits'
                            error={getFieldError('accountNumber')}
                          />
                          <FormField
                            label='IFSC Code'
                            required
                            id='ifscCode'
                            name='ifscCode'
                            maxLength={11}
                            autoComplete='off'
                            spellCheck={false}
                            value={formData.ifscCode}
                            onChange={handleInputChange}
                            placeholder='e.g. HDFC0001234'
                            error={getFieldError('ifscCode')}
                          />
                          <FormField
                            label='UPI ID'
                            required
                            id='upiId'
                            name='upiId'
                            value={formData.upiId}
                            onChange={handleInputChange}
                            placeholder='name@paytm'
                            autoComplete='off'
                            spellCheck={false}
                            error={getFieldError('upiId')}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'media' && (
                    <div className='space-y-6'>
                      <div>
                        <h3 className='text-xl font-semibold text-slate-900'>Store Media & Commission</h3>
                        <p className='text-sm text-slate-500'>Upload branding assets and set commission rates.</p>
                      </div>

                      <div className='space-y-4'>
                        <MainImageUpload
                          label='Store Logo'
                          value={formData.logo}
                          onChange={val => updateField('logo', val)}
                          uploadHandler={uploadVendorAsset}
                          helperText='Displayed on vendor cards and listings'
                        />

                        <MainImageUpload
                          label='Store Banner'
                          value={formData.banner}
                          onChange={val => updateField('banner', val)}
                          uploadHandler={uploadVendorAsset}
                          recommendedText='Recommended: 1600×400px, JPG/PNG'
                          helperText='Shown on vendor detail header'
                        />

                        <FormField
                          label='Commission Rate (%)'
                          id='commissionRate'
                          name='commissionRate'
                          type='number'
                          value={formData.commissionRate}
                          onChange={handleInputChange}
                          placeholder='0'
                          step='0.1'
                        />
                      </div>
                    </div>
                  )}

                  {activeTab === 'documents' && (
                    <div className='space-y-6'>
                      <div>
                        <h3 className='text-xl font-semibold text-slate-900'>Documents</h3>
                        <p className='text-sm text-slate-500'>Upload KYC and compliance documents.</p>
                      </div>

                      <div className='space-y-4'>
                        <MainImageUpload
                          label='ID Proof'
                          value={formData.idProof}
                          onChange={val => updateField('idProof', val)}
                          uploadHandler={uploadVendorAsset}
                          helperText='Upload clear copy of the vendor ID'
                        />

                        <MainImageUpload
                          label='Address Proof'
                          value={formData.addressProof}
                          onChange={val => updateField('addressProof', val)}
                          uploadHandler={uploadVendorAsset}
                          helperText='Latest utility bill or government document'
                        />

                        <MainImageUpload
                          label='GST Certificate'
                          value={formData.gstCertificate}
                          onChange={val => updateField('gstCertificate', val)}
                          uploadHandler={uploadVendorAsset}
                        />

                        <MainImageUpload
                          label='Cancelled Cheque'
                          value={formData.cancelledCheque}
                          onChange={val => updateField('cancelledCheque', val)}
                          uploadHandler={uploadVendorAsset}
                        />
                      </div>
                    </div>
                  )}

                  {activeTab === 'social' && (
                    <div className='space-y-6'>
                      <div>
                        <h3 className='text-xl font-semibold text-slate-900'>Social Links</h3>
                        <p className='text-sm text-slate-500'>Let customers find the vendor online.</p>
                      </div>

                      <div className='space-y-4'>
                        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                          <FormField
                            label='Facebook URL'
                            id='facebook'
                            name='facebook'
                            value={formData.facebook}
                            onChange={handleInputChange}
                            placeholder='https://facebook.com/...'
                          />
                          <FormField
                            label='Instagram URL'
                            id='instagram'
                            name='instagram'
                            value={formData.instagram}
                            onChange={handleInputChange}
                            placeholder='https://instagram.com/...'
                          />
                        </div>

                        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                          <FormField
                            label='Twitter URL'
                            id='twitter'
                            name='twitter'
                            value={formData.twitter}
                            onChange={handleInputChange}
                            placeholder='https://twitter.com/...'
                          />
                          <FormField
                            label='Website URL'
                            id='website'
                            name='website'
                            value={formData.website}
                            onChange={handleInputChange}
                            placeholder='https://example.com'
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'status' && (
                    <div className='space-y-6'>
                      <div>
                        <h3 className='text-xl font-semibold text-slate-900'>Verification & Status</h3>
                        <p className='text-sm text-slate-500'>Manage approvals and verification states.</p>
                      </div>

                      <Dropdown
                        labelMain='Vendor Status'
                        options={[
                          { label: 'Pending Approval', value: 'pending' },
                          { label: 'Approved', value: 'approved' },
                          { label: 'Rejected', value: 'rejected' },
                          { label: 'Suspended', value: 'suspended' },
                        ]}
                        value={formData.status}
                        onChange={option => updateField('status', option.value as any)}
                        placeholder='Select status'
                      />

                      <FormField
                        label='Approval Notes'
                        textarea
                        id='approvalNotes'
                        name='approvalNotes'
                        value={formData.approvalNotes}
                        onChange={handleInputChange}
                        placeholder='Add notes about approval/rejection...'
                        rows={3}
                      />

                      <div className='space-y-3'>
                        <div className='flex items-center justify-between'>
                          <Label htmlFor='emailVerified'>Email Verified</Label>
                          <Switch
                            id='emailVerified'
                            checked={formData.emailVerified}
                            onCheckedChange={val => updateField('emailVerified', val)}
                          />
                        </div>

                        <div className='flex items-center justify-between'>
                          <Label htmlFor='phoneVerified'>Phone Verified</Label>
                          <Switch
                            id='phoneVerified'
                            checked={formData.phoneVerified}
                            onCheckedChange={val => updateField('phoneVerified', val)}
                          />
                        </div>

                        <div className='flex items-center justify-between'>
                          <Label htmlFor='documentsVerified'>Documents Verified</Label>
                          <Switch
                            id='documentsVerified'
                            checked={formData.documentsVerified}
                            onCheckedChange={val => updateField('documentsVerified', val)}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              <div className='flex flex-col sm:flex-row gap-3 justify-end pt-4'>
                <Button
                  type='button'
                  variant='outline'
                  className='border-slate-200'
                  onClick={() => router.push('/admin/vendors')}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type='submit' disabled={saving}>
                  {saving ? 'Saving...' : vendorId ? 'Update Vendor' : 'Create Vendor'}
                </Button>
              </div>
            </section>
          </div>
        </form>
      </div>
    </div>
  );
}