'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, MapPin, Plus, Star, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { INDIAN_STATES } from '@/lib/indian-address';
import { validatePickupAddressInput } from '@/lib/vendor-pickup-validation';

type PickupAddress = {
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
};

const emptyForm = {
  label: '',
  address1: '',
  address2: '',
  city: '',
  state: '',
  pinCode: '',
  phone: '',
  email: '',
  contactPerson: '',
  isDefault: false,
};

export function PickupAddressesCard({ enabled }: { enabled: boolean }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addresses, setAddresses] = useState<PickupAddress[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [vendorDefaults, setVendorDefaults] = useState<{ phone?: string; email?: string; ownerName?: string }>({});

  const authHeaders = () => {
    const token = localStorage.getItem('adminToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  };

  const loadAddresses = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const response = await fetch('/api/admin/vendor/pickup-addresses', {
        headers: authHeaders(),
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to load pickup addresses');
      const data = await response.json();
      setAddresses(data.addresses || []);
      setVendorDefaults({
        phone: data.phone || '',
        email: data.email || '',
        ownerName: data.ownerName || '',
      });
    } catch {
      toast({
        title: 'Failed to load pickup addresses',
        description: 'Please refresh and try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [enabled, toast]);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
    setFieldErrors({});
  };

  const startEdit = (address: PickupAddress) => {
    setEditingId(address.id);
    setForm({
      label: address.label,
      address1: address.address1,
      address2: address.address2 || '',
      city: address.city,
      state: address.state,
      pinCode: address.pinCode,
      phone: address.phone || '',
      email: address.email || '',
      contactPerson: address.contactPerson || '',
      isDefault: address.isDefault,
    });
    setShowForm(true);
    setFieldErrors({});
  };

  const updateFormField = (field: keyof typeof emptyForm, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setFieldErrors(prev => {
      if (!prev[field as string]) return prev;
      const next = { ...prev };
      delete next[field as string];
      return next;
    });
  };

  const saveAddress = async () => {
    const validationErrors = validatePickupAddressInput(form, vendorDefaults);
    const duplicateLabel = addresses.find(
      addr =>
        addr.label.trim().toLowerCase() === form.label.trim().toLowerCase() &&
        addr.id !== editingId
    );
    if (duplicateLabel) {
      validationErrors.label = 'A pickup address with this name already exists';
    }

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      toast({
        title: 'Please fix the highlighted fields',
        description: 'Check required fields and correct any errors before saving.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);
      const response = await fetch('/api/admin/vendor/pickup-addresses', {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          action: editingId ? 'update' : 'add',
          id: editingId || undefined,
          address: form,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.fieldErrors) setFieldErrors(data.fieldErrors);
        throw new Error(data.error || 'Failed to save address');
      }
      setAddresses(data.addresses || []);
      resetForm();
      if (data.shiprocket?.verificationRequired) {
        toast({
          title: 'Saved — Shiprocket verification needed',
          description:
            data.message ||
            data.shiprocket.error ||
            'Verify this address in Shiprocket panel (OTP on registered phone).',
          variant: 'destructive',
        });
      } else if (data.shiprocket && !data.shiprocket.success) {
        toast({
          title: 'Address saved — Shiprocket sync failed',
          description: data.shiprocket.error || data.message || 'Could not sync to Shiprocket.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Pickup address saved',
          description: data.shiprocket?.success
            ? 'Synced and verified in Shiprocket.'
            : 'This address will be used for Shiprocket pickup.',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Save failed',
        description: error.message || 'Could not save pickup address',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const setDefault = async (id: string) => {
    try {
      setSaving(true);
      const response = await fetch('/api/admin/vendor/pickup-addresses', {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify({ action: 'setDefault', id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update default address');
      setAddresses(data.addresses || []);
      toast({ title: 'Primary pickup address updated' });
    } catch (error: any) {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const deleteAddress = async (id: string) => {
    try {
      setSaving(true);
      const response = await fetch('/api/admin/vendor/pickup-addresses', {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify({ action: 'delete', id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete address');
      setAddresses(data.addresses || []);
      toast({ title: 'Pickup address removed' });
    } catch (error: any) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (!enabled) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Pickup Addresses
        </CardTitle>
        <CardDescription>
          Add warehouse/pickup locations. Addresses sync to Shiprocket on save using your account verified phone.
          New addresses must be verified once in Shiprocket (Settings → Pickup Addresses → OTP).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading pickup addresses...
          </div>
        ) : (
          <>
            {addresses.length === 0 && (
              <p className="text-sm text-orange-600">
                No pickup address yet. Add one before using Ready for Pickup.
              </p>
            )}

            <div className="space-y-3">
              {addresses.map(address => (
                <div
                  key={address.id}
                  className={`rounded-lg border p-4 ${address.isDefault ? 'border-green-500 bg-green-50/40' : 'border-gray-200'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">{address.label}</p>
                        {address.isDefault && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                            <Star className="h-3 w-3 fill-current" />
                            Primary
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{address.address1}</p>
                      {address.address2 && <p className="text-sm text-gray-600">{address.address2}</p>}
                      <p className="text-sm text-gray-600">
                        {address.city}, {address.state} - {address.pinCode}
                      </p>
                      {address.shiprocketSyncedAt && (
                        <p
                          className={`text-xs mt-2 ${
                            address.shiprocketVerified ? 'text-green-700' : 'text-amber-700'
                          }`}>
                          {address.shiprocketVerified
                            ? 'Shiprocket: Verified'
                            : `Shiprocket: Pending verification${address.shiprocketSyncError ? ` — ${address.shiprocketSyncError}` : ''}`}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      {!address.isDefault && (
                        <Button size="sm" variant="outline" disabled={saving} onClick={() => setDefault(address.id)}>
                          Make Primary
                        </Button>
                      )}
                      <Button size="sm" variant="outline" disabled={saving} onClick={() => startEdit(address)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600"
                        disabled={saving || addresses.length <= 1}
                        onClick={() => deleteAddress(address.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {!showForm ? (
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => {
                  setShowForm(true);
                  setEditingId(null);
                  setFieldErrors({});
                  setForm({
                    ...emptyForm,
                    isDefault: addresses.length === 0,
                    contactPerson: vendorDefaults.ownerName || '',
                    phone: vendorDefaults.phone || '',
                    email: vendorDefaults.email || '',
                  });
                }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Pickup Address
              </Button>
            ) : (
              <div className="rounded-lg border border-gray-200 p-4 space-y-4">
                <p className="font-medium">{editingId ? 'Edit Pickup Address' : 'Add Pickup Address'}</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium">Location Name *</label>
                    <Input
                      className="mt-1"
                      placeholder="e.g. Ahmedabad Warehouse"
                      value={form.label}
                      onChange={e => updateFormField('label', e.target.value)}
                    />
                    {fieldErrors.label && <p className="text-xs text-red-600 mt-1">{fieldErrors.label}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-medium">Contact Person *</label>
                    <Input
                      className="mt-1"
                      placeholder="Full name"
                      value={form.contactPerson}
                      onChange={e => updateFormField('contactPerson', e.target.value)}
                    />
                    {fieldErrors.contactPerson && (
                      <p className="text-xs text-red-600 mt-1">{fieldErrors.contactPerson}</p>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium">Street Address *</label>
                    <p className="text-xs text-gray-500 mb-1">
                      Must include house/flat/road number with digits (e.g. House No 12, MG Road)
                    </p>
                    <Input
                      className="mt-1"
                      placeholder="House No 12, Street name, area"
                      value={form.address1}
                      onChange={e => updateFormField('address1', e.target.value)}
                    />
                    {fieldErrors.address1 && <p className="text-xs text-red-600 mt-1">{fieldErrors.address1}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium">Landmark / Address Line 2</label>
                    <Input
                      className="mt-1"
                      value={form.address2}
                      onChange={e => updateFormField('address2', e.target.value)}
                    />
                    {fieldErrors.address2 && <p className="text-xs text-red-600 mt-1">{fieldErrors.address2}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-medium">City *</label>
                    <Input
                      className="mt-1"
                      value={form.city}
                      onChange={e => updateFormField('city', e.target.value)}
                    />
                    {fieldErrors.city && <p className="text-xs text-red-600 mt-1">{fieldErrors.city}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-medium">State *</label>
                    <select
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={form.state}
                      onChange={e => updateFormField('state', e.target.value)}>
                      <option value="">Select state</option>
                      {INDIAN_STATES.map(state => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                    {fieldErrors.state && <p className="text-xs text-red-600 mt-1">{fieldErrors.state}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-medium">Pincode *</label>
                    <Input
                      className="mt-1"
                      maxLength={6}
                      value={form.pinCode}
                      onChange={e => updateFormField('pinCode', e.target.value.replace(/\D/g, ''))}
                    />
                    {fieldErrors.pinCode && <p className="text-xs text-red-600 mt-1">{fieldErrors.pinCode}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-medium">Phone *</label>
                    <Input
                      className="mt-1"
                      maxLength={10}
                      placeholder="10-digit mobile"
                      value={form.phone}
                      onChange={e => updateFormField('phone', e.target.value.replace(/\D/g, ''))}
                    />
                    {fieldErrors.phone && <p className="text-xs text-red-600 mt-1">{fieldErrors.phone}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email *</label>
                    <Input
                      className="mt-1"
                      type="email"
                      placeholder="name@example.com"
                      value={form.email}
                      onChange={e => updateFormField('email', e.target.value)}
                    />
                    {fieldErrors.email && <p className="text-xs text-red-600 mt-1">{fieldErrors.email}</p>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button className="bg-green-600 hover:bg-green-700" disabled={saving} onClick={saveAddress}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {editingId ? 'Update Address' : 'Save Address'}
                  </Button>
                  <Button variant="outline" disabled={saving} onClick={resetForm}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
