'use client';

import { useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { AdminLayout } from '@/components/layout/admin-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { isValidIndianGstin, isValidIndianPan } from '@/lib/india-tax-ids';

type FieldErrors = Record<string, string>;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^[0-9]{10}$/;
const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const accountNumberRegex = /^[0-9]{6,18}$/;

export function ProfileClient() {
  const { toast } = useToast();
  const [isVendorUser, setIsVendorUser] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);

  const [personalForm, setPersonalForm] = useState({
    ownerName: '',
    email: '',
    phone: '',
  });
  const [businessForm, setBusinessForm] = useState({
    panNumber: '',
    gstNumber: '',
  });
  const [bankForm, setBankForm] = useState({
    accountHolderName: '',
    accountNumber: '',
    ifscCode: '',
  });
  const [pickupForm, setPickupForm] = useState({
    pickupLocation: '',
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [personalErrors, setPersonalErrors] = useState<FieldErrors>({});
  const [businessErrors, setBusinessErrors] = useState<FieldErrors>({});
  const [bankErrors, setBankErrors] = useState<FieldErrors>({});
  const [pickupErrors, setPickupErrors] = useState<FieldErrors>({});
  const [passwordErrors, setPasswordErrors] = useState<FieldErrors>({});

  const [savingPersonal, setSavingPersonal] = useState(false);
  const [savingBusiness, setSavingBusiness] = useState(false);
  const [savingBank, setSavingBank] = useState(false);
  const [savingPickup, setSavingPickup] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  useEffect(() => {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) return;

      const payload = token.split('.')[1];
      if (!payload) return;
      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = JSON.parse(atob(normalized));
      setIsVendorUser(decoded?.role === 'vendor');
    } catch {
      setIsVendorUser(false);
    }
  }, []);

  useEffect(() => {
    if (!isVendorUser || profileLoaded) {
      setProfileLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        setProfileLoading(true);
        const token = localStorage.getItem('adminToken');
        const response = await fetch('/api/admin/vendor/profile', {
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to load vendor profile');
        }

        const data = await response.json();
        setPersonalForm({
          ownerName: data.ownerName || '',
          email: data.email || '',
          phone: data.phone || '',
        });
        setBusinessForm({
          panNumber: data.panNumber || '',
          gstNumber: data.gstNumber || '',
        });
        setBankForm({
          accountHolderName: data.accountHolderName || '',
          accountNumber: data.accountNumber || '',
          ifscCode: data.ifscCode || '',
        });
        setPickupForm({
          pickupLocation: data.pickupLocation || '',
        });
        setProfileLoaded(true);
      } catch (error) {
        console.error('[v0] Failed to load vendor profile:', error);
        toast({
          title: 'Failed to load profile',
          description: 'Please refresh and try again.',
          variant: 'destructive',
        });
      } finally {
        setProfileLoading(false);
      }
    };

    fetchProfile();
  }, [isVendorUser, profileLoaded, toast]);

  const brandNote = useMemo(
    () => (isVendorUser ? null : 'This section is available for vendor accounts only.'),
    [isVendorUser]
  );

  const validatePersonal = () => {
    const errors: FieldErrors = {};
    if (!personalForm.ownerName.trim() || personalForm.ownerName.trim().length < 2) {
      errors.ownerName = 'Full name must be at least 2 characters';
    }
    if (!personalForm.email.trim() || !emailRegex.test(personalForm.email.trim())) {
      errors.email = 'Enter a valid email address';
    }
    if (!personalForm.phone.trim() || !phoneRegex.test(personalForm.phone.trim())) {
      errors.phone = 'Enter a valid 10-digit phone number';
    }
    setPersonalErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateBusiness = () => {
    const errors: FieldErrors = {};
    if (!businessForm.panNumber.trim() || !isValidIndianPan(businessForm.panNumber)) {
      errors.panNumber = 'Enter a valid PAN (e.g., ABCDE1234F)';
    }
    if (!businessForm.gstNumber.trim() || !isValidIndianGstin(businessForm.gstNumber)) {
      errors.gstNumber = 'Enter a valid GSTIN';
    }
    setBusinessErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateBank = () => {
    const errors: FieldErrors = {};
    if (!bankForm.accountHolderName.trim()) {
      errors.accountHolderName = 'Account holder name is required';
    }
    if (!bankForm.accountNumber.trim() || !accountNumberRegex.test(bankForm.accountNumber.trim())) {
      errors.accountNumber = 'Enter a valid account number';
    }
    if (!bankForm.ifscCode.trim() || !ifscRegex.test(bankForm.ifscCode.trim().toUpperCase())) {
      errors.ifscCode = 'Enter a valid IFSC code';
    }
    setBankErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validatePickup = () => {
    const errors: FieldErrors = {};
    if (!pickupForm.pickupLocation.trim() || pickupForm.pickupLocation.trim().length < 3) {
      errors.pickupLocation = 'Pickup location is required';
    }
    setPickupErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validatePassword = () => {
    const errors: FieldErrors = {};
    if (!passwordForm.currentPassword) {
      errors.currentPassword = 'Current password is required';
    }
    if (!passwordForm.newPassword) {
      errors.newPassword = 'New password is required';
    }
    if (passwordForm.newPassword && passwordForm.newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters';
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async (
    section: 'personal' | 'business' | 'bank' | 'pickup',
    payload: Record<string, string>,
    setSaving: (value: boolean) => void,
    onValidate: () => boolean
  ) => {
    if (!isVendorUser) return;
    if (!onValidate()) return;

    try {
      setSaving(true);
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/vendor/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        if (data?.fieldErrors) {
          if (section === 'personal') setPersonalErrors(data.fieldErrors);
          if (section === 'business') setBusinessErrors(data.fieldErrors);
          if (section === 'bank') setBankErrors(data.fieldErrors);
          if (section === 'pickup') setPickupErrors(data.fieldErrors);
        }
        throw new Error(data?.error || 'Failed to update profile');
      }

      toast({
        title: 'Profile updated',
        description: 'Your information has been saved successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Update failed',
        description: error?.message || 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!isVendorUser) return;
    if (!validatePassword()) return;

    try {
      setSavingPassword(true);
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/vendor/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to update password');
      }

      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast({
        title: 'Password updated',
        description: 'Your password has been updated successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Password update failed',
        description: error?.message || 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Profile</h1>
          <p className="text-muted-foreground mt-1">Manage your profile information and preferences</p>
        </div>

        {profileLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading profile data...
          </div>
        )}

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Full Name</label>
                  <Input
                    type="text"
                    placeholder="Enter your full name"
                    className="mt-1"
                    value={personalForm.ownerName}
                    onChange={event =>
                      setPersonalForm(prev => ({ ...prev, ownerName: event.target.value }))
                    }
                    disabled={!isVendorUser}
                  />
                  {personalErrors.ownerName && (
                    <p className="text-xs text-red-600 mt-1">{personalErrors.ownerName}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">Email Address</label>
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    className="mt-1"
                    value={personalForm.email}
                    onChange={event =>
                      setPersonalForm(prev => ({ ...prev, email: event.target.value }))
                    }
                    disabled={!isVendorUser}
                  />
                  {personalErrors.email && (
                    <p className="text-xs text-red-600 mt-1">{personalErrors.email}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">Phone Number</label>
                  <Input
                    type="tel"
                    inputMode="numeric"
                    placeholder="Enter your phone number"
                    className="mt-1"
                    value={personalForm.phone}
                    onChange={event =>
                      setPersonalForm(prev => ({
                        ...prev,
                        phone: event.target.value.replace(/\D/g, '').slice(0, 10),
                      }))
                    }
                    disabled={!isVendorUser}
                  />
                  {personalErrors.phone && (
                    <p className="text-xs text-red-600 mt-1">{personalErrors.phone}</p>
                  )}
                </div>
              </div>
              {brandNote && <p className="text-xs text-muted-foreground">{brandNote}</p>}
              <Button
                className="bg-green-600 hover:bg-green-700"
                disabled={!isVendorUser || savingPersonal}
                onClick={() =>
                  handleSave(
                    'personal',
                    {
                      ownerName: personalForm.ownerName,
                      email: personalForm.email,
                      phone: personalForm.phone,
                    },
                    setSavingPersonal,
                    validatePersonal
                  )
                }
              >
                {savingPersonal ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </CardContent>
          </Card>

          {isVendorUser && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Business & Compliance</CardTitle>
                  <CardDescription>Add your PAN and GSTIN details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium">PAN</label>
                      <Input
                        type="text"
                        placeholder="Enter PAN"
                        className="mt-1"
                        value={businessForm.panNumber}
                        onChange={event =>
                          setBusinessForm(prev => ({
                            ...prev,
                            panNumber: event.target.value.toUpperCase(),
                          }))
                        }
                      />
                      {businessErrors.panNumber && (
                        <p className="text-xs text-red-600 mt-1">{businessErrors.panNumber}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium">GSTIN</label>
                      <Input
                        type="text"
                        placeholder="Enter GSTIN"
                        className="mt-1"
                        value={businessForm.gstNumber}
                        onChange={event =>
                          setBusinessForm(prev => ({
                            ...prev,
                            gstNumber: event.target.value.toUpperCase(),
                          }))
                        }
                      />
                      {businessErrors.gstNumber && (
                        <p className="text-xs text-red-600 mt-1">{businessErrors.gstNumber}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    disabled={savingBusiness}
                    onClick={() =>
                      handleSave(
                        'business',
                        {
                          panNumber: businessForm.panNumber,
                          gstNumber: businessForm.gstNumber,
                        },
                        setSavingBusiness,
                        validateBusiness
                      )
                    }
                  >
                    {savingBusiness ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      'Save Business Details'
                    )}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Bank Details</CardTitle>
                  <CardDescription>Provide account information for payouts</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium">Account Holder Name</label>
                      <Input
                        type="text"
                        placeholder="Enter account holder name"
                        className="mt-1"
                        value={bankForm.accountHolderName}
                        onChange={event =>
                          setBankForm(prev => ({ ...prev, accountHolderName: event.target.value }))
                        }
                      />
                      {bankErrors.accountHolderName && (
                        <p className="text-xs text-red-600 mt-1">{bankErrors.accountHolderName}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium">Account Number</label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="Enter account number"
                        className="mt-1"
                        value={bankForm.accountNumber}
                        onChange={event =>
                          setBankForm(prev => ({
                            ...prev,
                            accountNumber: event.target.value.replace(/\D/g, ''),
                          }))
                        }
                      />
                      {bankErrors.accountNumber && (
                        <p className="text-xs text-red-600 mt-1">{bankErrors.accountNumber}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium">IFSC Code</label>
                      <Input
                        type="text"
                        placeholder="Enter IFSC code"
                        className="mt-1"
                        value={bankForm.ifscCode}
                        onChange={event =>
                          setBankForm(prev => ({
                            ...prev,
                            ifscCode: event.target.value.toUpperCase(),
                          }))
                        }
                      />
                      {bankErrors.ifscCode && (
                        <p className="text-xs text-red-600 mt-1">{bankErrors.ifscCode}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    disabled={savingBank}
                    onClick={() =>
                      handleSave(
                        'bank',
                        {
                          accountHolderName: bankForm.accountHolderName,
                          accountNumber: bankForm.accountNumber,
                          ifscCode: bankForm.ifscCode,
                        },
                        setSavingBank,
                        validateBank
                      )
                    }
                  >
                    {savingBank ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      'Save Bank Details'
                    )}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Pickup / Warehouse Location</CardTitle>
                  <CardDescription>Set the pickup or warehouse location for dispatch</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Pickup Location / Warehouse Location</label>
                    <Input
                      type="text"
                      placeholder="Enter pickup/warehouse location"
                      className="mt-1"
                      value={pickupForm.pickupLocation}
                      onChange={event =>
                        setPickupForm(prev => ({ ...prev, pickupLocation: event.target.value }))
                      }
                    />
                    {pickupErrors.pickupLocation && (
                      <p className="text-xs text-red-600 mt-1">{pickupErrors.pickupLocation}</p>
                    )}
                  </div>
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    disabled={savingPickup}
                    onClick={() =>
                      handleSave(
                        'pickup',
                        { pickupLocation: pickupForm.pickupLocation },
                        setSavingPickup,
                        validatePickup
                      )
                    }
                  >
                    {savingPickup ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      'Save Location'
                    )}
                  </Button>
                </CardContent>
              </Card>
            </>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Update your password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <label className="text-sm font-medium">Current Password</label>
                  <div className="relative mt-1">
                    <Input
                      type={showPassword.current ? 'text' : 'password'}
                      placeholder="Enter current password"
                      value={passwordForm.currentPassword}
                      onChange={event =>
                        setPasswordForm(prev => ({ ...prev, currentPassword: event.target.value }))
                      }
                      disabled={!isVendorUser}
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
                      onClick={() => setShowPassword(prev => ({ ...prev, current: !prev.current }))}
                    >
                      {showPassword.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {passwordErrors.currentPassword && (
                    <p className="text-xs text-red-600 mt-1">{passwordErrors.currentPassword}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">New Password</label>
                  <div className="relative mt-1">
                    <Input
                      type={showPassword.new ? 'text' : 'password'}
                      placeholder="Enter new password"
                      value={passwordForm.newPassword}
                      onChange={event =>
                        setPasswordForm(prev => ({ ...prev, newPassword: event.target.value }))
                      }
                      disabled={!isVendorUser}
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
                      onClick={() => setShowPassword(prev => ({ ...prev, new: !prev.new }))}
                    >
                      {showPassword.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {passwordErrors.newPassword && (
                    <p className="text-xs text-red-600 mt-1">{passwordErrors.newPassword}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">Confirm Password</label>
                  <div className="relative mt-1">
                    <Input
                      type={showPassword.confirm ? 'text' : 'password'}
                      placeholder="Confirm new password"
                      value={passwordForm.confirmPassword}
                      onChange={event =>
                        setPasswordForm(prev => ({ ...prev, confirmPassword: event.target.value }))
                      }
                      disabled={!isVendorUser}
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
                      onClick={() => setShowPassword(prev => ({ ...prev, confirm: !prev.confirm }))}
                    >
                      {showPassword.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {passwordErrors.confirmPassword && (
                    <p className="text-xs text-red-600 mt-1">{passwordErrors.confirmPassword}</p>
                  )}
                </div>
              </div>
              {brandNote && <p className="text-xs text-muted-foreground">{brandNote}</p>}
              <Button
                className="bg-green-600 hover:bg-green-700"
                disabled={!isVendorUser || savingPassword}
                onClick={handleChangePassword}
              >
                {savingPassword ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Updating...
                  </>
                ) : (
                  'Update Password'
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}

