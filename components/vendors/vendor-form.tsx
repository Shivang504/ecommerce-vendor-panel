'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  isValidIndianGstin,
  isValidIndianPan,
  sanitizeGstinInput,
  sanitizePanInput,
} from '@/lib/india-tax-ids';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface VendorFormData {
  _id?: string;
  storeName: string;
  storeSlug: string;
  ownerName: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  whatsappNumber?: string;
  businessType: 'individual' | 'company' | 'partnership';
  gstNumber?: string;
  panNumber?: string;
  businessRegistrationNumber?: string;
  description: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  pinCode: string;
  country: string;
  bankName?: string;
  accountHolderName?: string;
  accountNumber?: string;
  ifscCode?: string;
  upiId?: string;
  logo: string;
  banner: string;
  commissionRate: number;
  allowedCategories: string[];
  facebook?: string;
  instagram?: string;
  twitter?: string;
  website?: string;
  idProof?: string;
  addressProof?: string;
  gstCertificate?: string;
  cancelledCheque?: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  approvalNotes?: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  documentsVerified: boolean;
  username: string;
  password: string;
  sendCredentialsEmail: boolean;
}

const INDIAN_STATES = [
  'Andaman and Nicobar Islands',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Puducherry',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Tripura',
  'Telangana',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
];

interface VendorFormProps {
  vendorId?: string;
}

export function VendorForm({ vendorId }: VendorFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [formData, setFormData] = useState<VendorFormData>({
    storeName: '',
    storeSlug: '',
    ownerName: '',
    email: '',
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
    allowedCategories: [],
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
    username: '',
    password: '',
    sendCredentialsEmail: false,
  });

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(vendorId ? true : false);

  const isValidIndianMobile = (value: string) => {
    const digits = value.replace(/[^\d]/g, '');
    if (!digits) return false;
    if (digits.length === 10) return true;
    if (digits.length === 11 && digits.startsWith('0')) return true;
    if (digits.length === 12 && digits.startsWith('91')) return true;
    return false;
  };

  useEffect(() => {
    if (vendorId) {
      const fetchVendor = async () => {
        try {
          const response = await fetch(`/api/admin/vendors/${vendorId}`);
          if (response.ok) {
            const data = await response.json();
            setFormData(data.vendor);
          }
        } catch (error) {
          console.error('Failed to fetch vendor:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchVendor();
    }
  }, [vendorId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value: raw } = e.target;
    let value = raw;
    if (name === 'gstNumber') value = sanitizeGstinInput(raw);
    if (name === 'panNumber') value = sanitizePanInput(raw);
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    if (name === 'storeName' && !vendorId) {
      setFormData(prev => ({
        ...prev,
        storeSlug: value
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^\w\-]+/g, ''),
        username: value.toLowerCase().replace(/\s+/g, '_'),
      }));
    }
  };

  const handleSave = async () => {
    if (!formData.storeName || !formData.ownerName || !formData.email || !formData.phone) {
      toast({
        title: "Validation Error",
        description: 'Please fill in all required fields: Store Name, Owner Name, Email, and Phone',
        variant: "destructive",
      });
      return;
    }

    if (!isValidIndianMobile(formData.phone)) {
      toast({
        title: "Validation Error",
        description: 'Phone Number must be a valid 10-digit mobile (optionally with +91).',
        variant: "destructive",
      });
      return;
    }

    if (formData.alternatePhone && !isValidIndianMobile(formData.alternatePhone)) {
      toast({
        title: "Validation Error",
        description: 'Alternate Phone must be a valid 10-digit mobile (optionally with +91).',
        variant: "destructive",
      });
      return;
    }

    if (formData.whatsappNumber && !isValidIndianMobile(formData.whatsappNumber)) {
      toast({
        title: "Validation Error",
        description: 'WhatsApp Number must be a valid 10-digit mobile (optionally with +91).',
        variant: "destructive",
      });
      return;
    }

    if (formData.gstNumber?.trim() && !isValidIndianGstin(formData.gstNumber)) {
      toast({
        title: "Validation Error",
        description: 'GST Number must be a valid 15-character GSTIN.',
        variant: "destructive",
      });
      return;
    }

    if (formData.panNumber?.trim() && !isValidIndianPan(formData.panNumber)) {
      toast({
        title: "Validation Error",
        description: 'PAN must be valid (e.g., ABCDE1234F).',
        variant: "destructive",
      });
      return;
    }

    if (!formData.address1 || !formData.city || !formData.state || !formData.pinCode) {
      toast({
        title: "Validation Error",
        description: 'Please fill in all address fields: Address, City, State, and PIN Code',
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const method = vendorId ? 'PUT' : 'POST';
      const url = vendorId ? `/api/admin/vendors/${vendorId}` : '/api/admin/vendors';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: vendorId ? 'Vendor updated successfully' : 'Vendor created successfully',
        });
        router.push('/admin/vendors');
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || 'Failed to save vendor',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('[v0] Save error:', error);
      toast({
        title: "Error",
        description: 'An error occurred while saving the vendor',
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/admin/vendors');
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/vendors/${vendorId}`, { method: 'DELETE' });
      if (response.ok) {
        toast({
          title: "Success",
          description: 'Vendor deleted successfully',
        });
        router.push('/admin/vendors');
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || 'Failed to delete vendor',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('[v0] Delete error:', error);
      toast({
        title: "Error",
        description: 'An error occurred while deleting the vendor',
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading vendor...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{vendorId ? 'Edit Vendor' : 'Add New Vendor'}</h1>
        <Button variant="outline" onClick={handleCancel}>
          Back
        </Button>
      </div>

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="basic">Basic</TabsTrigger>
          <TabsTrigger value="address">Address</TabsTrigger>
          <TabsTrigger value="bank">Bank</TabsTrigger>
          <TabsTrigger value="docs">Documents</TabsTrigger>
          <TabsTrigger value="social">Social</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>

        {/* BASIC INFORMATION */}
        <TabsContent value="basic" className="space-y-4">
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Basic Information</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="storeName">Store/Vendor Name *</Label>
                  <Input
                    id="storeName"
                    name="storeName"
                    value={formData.storeName}
                    onChange={handleInputChange}
                    placeholder="Store name"
                  />
                </div>
                <div>
                  <Label htmlFor="storeSlug">Store Slug *</Label>
                  <Input
                    id="storeSlug"
                    name="storeSlug"
                    value={formData.storeSlug}
                    onChange={handleInputChange}
                    placeholder="auto-generated"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ownerName">Owner/Contact Person Name *</Label>
                  <Input
                    id="ownerName"
                    name="ownerName"
                    value={formData.ownerName}
                    onChange={handleInputChange}
                    placeholder="Full name"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="email@example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+91 XXXXXXXXXX"
                  />
                </div>
                <div>
                  <Label htmlFor="alternatePhone">Alternate Phone</Label>
                  <Input
                    id="alternatePhone"
                    name="alternatePhone"
                    value={formData.alternatePhone}
                    onChange={handleInputChange}
                    placeholder="Alternate number"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="whatsappNumber">WhatsApp Number</Label>
                <Input
                  id="whatsappNumber"
                  name="whatsappNumber"
                  value={formData.whatsappNumber}
                  onChange={handleInputChange}
                  placeholder="+91 XXXXXXXXXX"
                />
              </div>

              <h3 className="font-semibold mb-4 mt-6">Business Details</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="businessType">Business Type *</Label>
                  <Select value={formData.businessType} onValueChange={val => setFormData(prev => ({ ...prev, businessType: val as any }))}>
                    <SelectTrigger>
                      <SelectValue placeholder={formData.businessType || 'Select business type'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="company">Company</SelectItem>
                      <SelectItem value="partnership">Partnership</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="gstNumber">GST Number (optional)</Label>
                    <Input
                      id="gstNumber"
                      name="gstNumber"
                      value={formData.gstNumber}
                      onChange={handleInputChange}
                      placeholder="15-character GSTIN"
                      maxLength={15}
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <p className="text-xs text-slate-500 mt-1">Example: 22AAAAA0000A1Z5</p>
                  </div>
                  <div>
                    <Label htmlFor="panNumber">PAN Number (optional)</Label>
                    <Input
                      id="panNumber"
                      name="panNumber"
                      value={formData.panNumber}
                      onChange={handleInputChange}
                      placeholder="e.g. ABCDE1234F"
                      maxLength={10}
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="businessRegistrationNumber">Business Registration Number</Label>
                  <Input
                    id="businessRegistrationNumber"
                    name="businessRegistrationNumber"
                    value={formData.businessRegistrationNumber}
                    onChange={handleInputChange}
                    placeholder="Registration number"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Store Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="About vendor's business"
                    rows={4}
                  />
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* ADDRESS */}
        <TabsContent value="address" className="space-y-4">
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Address Details</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="address1">Address Line 1 *</Label>
                <Input
                  id="address1"
                  name="address1"
                  value={formData.address1}
                  onChange={handleInputChange}
                  placeholder="Street address"
                />
              </div>

              <div>
                <Label htmlFor="address2">Address Line 2</Label>
                <Input
                  id="address2"
                  name="address2"
                  value={formData.address2}
                  onChange={handleInputChange}
                  placeholder="Apartment, suite, etc."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="City"
                  />
                </div>
                <div>
                  <Label htmlFor="state">State *</Label>
                  <Select value={formData.state} onValueChange={val => setFormData(prev => ({ ...prev, state: val }))}>
                    <SelectTrigger>
                      <SelectValue placeholder={formData.state || 'Select state'} />
                    </SelectTrigger>
                    <SelectContent>
                      {INDIAN_STATES.map(state => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="pinCode">PIN Code *</Label>
                  <Input
                    id="pinCode"
                    name="pinCode"
                    value={formData.pinCode}
                    onChange={handleInputChange}
                    placeholder="PIN code"
                  />
                </div>
                <div>
                  <Label htmlFor="country">Country *</Label>
                  <Select value={formData.country} onValueChange={val => setFormData(prev => ({ ...prev, country: val }))}>
                    <SelectTrigger>
                      <SelectValue placeholder={formData.country || 'Select country'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="India">India</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* BANK DETAILS */}
        <TabsContent value="bank" className="space-y-4">
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Bank Details (for payments)</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="bankName">Bank Name</Label>
                <Input
                  id="bankName"
                  name="bankName"
                  value={formData.bankName}
                  onChange={handleInputChange}
                  placeholder="Bank name"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="accountHolderName">Account Holder Name</Label>
                  <Input
                    id="accountHolderName"
                    name="accountHolderName"
                    value={formData.accountHolderName}
                    onChange={handleInputChange}
                    placeholder="Name"
                  />
                </div>
                <div>
                  <Label htmlFor="accountNumber">Account Number</Label>
                  <Input
                    id="accountNumber"
                    name="accountNumber"
                    value={formData.accountNumber}
                    onChange={handleInputChange}
                    placeholder="Account number"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ifscCode">IFSC Code</Label>
                  <Input
                    id="ifscCode"
                    name="ifscCode"
                    value={formData.ifscCode}
                    onChange={handleInputChange}
                    placeholder="IFSC code"
                  />
                </div>
                <div>
                  <Label htmlFor="upiId">UPI ID (optional)</Label>
                  <Input
                    id="upiId"
                    name="upiId"
                    value={formData.upiId}
                    onChange={handleInputChange}
                    placeholder="upi@handle"
                  />
                </div>
              </div>

              <h3 className="font-semibold mb-4 mt-6">Store Media</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="logo">Store Logo (200×200px)</Label>
                  <Input
                    id="logo"
                    name="logo"
                    value={formData.logo}
                    onChange={handleInputChange}
                    placeholder="Logo URL"
                  />
                </div>
                <div>
                  <Label htmlFor="banner">Store Banner (1920×400px)</Label>
                  <Input
                    id="banner"
                    name="banner"
                    value={formData.banner}
                    onChange={handleInputChange}
                    placeholder="Banner URL"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="commissionRate">Commission Rate (%)*</Label>
                  <Input
                    id="commissionRate"
                    name="commissionRate"
                    type="number"
                    value={formData.commissionRate}
                    onChange={handleInputChange}
                    placeholder="0"
                    step="0.1"
                  />
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* DOCUMENTS */}
        <TabsContent value="docs" className="space-y-4">
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Documents</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="idProof">ID Proof (Aadhaar/Passport)</Label>
                <Input
                  id="idProof"
                  name="idProof"
                  value={formData.idProof}
                  onChange={handleInputChange}
                  placeholder="Document URL"
                />
              </div>

              <div>
                <Label htmlFor="addressProof">Address Proof</Label>
                <Input
                  id="addressProof"
                  name="addressProof"
                  value={formData.addressProof}
                  onChange={handleInputChange}
                  placeholder="Document URL"
                />
              </div>

              <div>
                <Label htmlFor="gstCertificate">GST Certificate (if applicable)</Label>
                <Input
                  id="gstCertificate"
                  name="gstCertificate"
                  value={formData.gstCertificate}
                  onChange={handleInputChange}
                  placeholder="Certificate URL"
                />
              </div>

              <div>
                <Label htmlFor="cancelledCheque">Cancelled Cheque/Passbook</Label>
                <Input
                  id="cancelledCheque"
                  name="cancelledCheque"
                  value={formData.cancelledCheque}
                  onChange={handleInputChange}
                  placeholder="Document URL"
                />
              </div>

              <h3 className="font-semibold mb-4 mt-6">Account Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status">Vendor Status *</Label>
                  <Select value={formData.status} onValueChange={val => setFormData(prev => ({ ...prev, status: val as any }))}>
                    <SelectTrigger>
                      <SelectValue placeholder={formData.status || 'Select status'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending Approval</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="approvalNotes">Approval/Rejection Notes</Label>
                <Textarea
                  id="approvalNotes"
                  name="approvalNotes"
                  value={formData.approvalNotes}
                  onChange={handleInputChange}
                  placeholder="Notes"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="emailVerified"
                    checked={formData.emailVerified}
                    onCheckedChange={val => setFormData(prev => ({ ...prev, emailVerified: !!val }))}
                  />
                  <Label htmlFor="emailVerified">Email Verified</Label>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="phoneVerified"
                    checked={formData.phoneVerified}
                    onCheckedChange={val => setFormData(prev => ({ ...prev, phoneVerified: !!val }))}
                  />
                  <Label htmlFor="phoneVerified">Phone Verified</Label>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="documentsVerified"
                    checked={formData.documentsVerified}
                    onCheckedChange={val => setFormData(prev => ({ ...prev, documentsVerified: !!val }))}
                  />
                  <Label htmlFor="documentsVerified">Documents Verified</Label>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* SOCIAL MEDIA */}
        <TabsContent value="social" className="space-y-4">
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Social Media (optional)</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="facebook">Facebook URL</Label>
                <Input
                  id="facebook"
                  name="facebook"
                  value={formData.facebook}
                  onChange={handleInputChange}
                  placeholder="https://facebook.com/..."
                />
              </div>

              <div>
                <Label htmlFor="instagram">Instagram URL</Label>
                <Input
                  id="instagram"
                  name="instagram"
                  value={formData.instagram}
                  onChange={handleInputChange}
                  placeholder="https://instagram.com/..."
                />
              </div>

              <div>
                <Label htmlFor="twitter">Twitter URL</Label>
                <Input
                  id="twitter"
                  name="twitter"
                  value={formData.twitter}
                  onChange={handleInputChange}
                  placeholder="https://twitter.com/..."
                />
              </div>

              <div>
                <Label htmlFor="website">Website URL</Label>
                <Input
                  id="website"
                  name="website"
                  value={formData.website}
                  onChange={handleInputChange}
                  placeholder="https://example.com"
                />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* ACCOUNT */}
        <TabsContent value="account" className="space-y-4">
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Login Credentials</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="username">Username/Email</Label>
                <Input
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder="Auto-generated"
                  disabled
                />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Leave empty to keep current"
                />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="sendCredentialsEmail"
                  checked={formData.sendCredentialsEmail}
                  onCheckedChange={val => setFormData(prev => ({ ...prev, sendCredentialsEmail: !!val }))}
                />
                <Label htmlFor="sendCredentialsEmail">Send credentials via email</Label>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex items-center justify-between gap-4 pt-4">
        <div>
          {vendorId && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  Delete Vendor
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Vendor</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this vendor? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="flex justify-end gap-2">
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                    Delete
                  </AlertDialogAction>
                </div>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleCancel} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : vendorId ? 'Update Vendor' : 'Create Vendor'}
          </Button>
        </div>
      </div>
    </div>
  );
}
