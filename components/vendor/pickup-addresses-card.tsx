'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, MapPin, Plus, Star, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { INDIAN_STATES } from '@/lib/indian-address';

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
  isDefault: true,
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

  const saveAddress = async () => {
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
      toast({ title: 'Pickup address saved', description: 'This address will be used for Shiprocket pickup.' });
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
      toast({ title: 'Default pickup address updated' });
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
          Add warehouse/pickup locations. The default address is sent to Shiprocket when you mark orders Ready for Pickup.
          If the address is not in Shiprocket, it will be added automatically.
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
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{address.address1}</p>
                      {address.address2 && <p className="text-sm text-gray-600">{address.address2}</p>}
                      <p className="text-sm text-gray-600">
                        {address.city}, {address.state} - {address.pinCode}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      {!address.isDefault && (
                        <Button size="sm" variant="outline" disabled={saving} onClick={() => setDefault(address.id)}>
                          Make Default
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
                  setForm({ ...emptyForm, isDefault: addresses.length === 0 });
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
                      onChange={e => setForm(prev => ({ ...prev, label: e.target.value }))}
                    />
                    {fieldErrors.label && <p className="text-xs text-red-600 mt-1">{fieldErrors.label}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-medium">Contact Person</label>
                    <Input
                      className="mt-1"
                      value={form.contactPerson}
                      onChange={e => setForm(prev => ({ ...prev, contactPerson: e.target.value }))}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium">Street Address *</label>
                    <Input
                      className="mt-1"
                      placeholder="Building, street, area"
                      value={form.address1}
                      onChange={e => setForm(prev => ({ ...prev, address1: e.target.value }))}
                    />
                    {fieldErrors.address1 && <p className="text-xs text-red-600 mt-1">{fieldErrors.address1}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium">Landmark / Address Line 2</label>
                    <Input
                      className="mt-1"
                      value={form.address2}
                      onChange={e => setForm(prev => ({ ...prev, address2: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">City *</label>
                    <Input
                      className="mt-1"
                      value={form.city}
                      onChange={e => setForm(prev => ({ ...prev, city: e.target.value }))}
                    />
                    {fieldErrors.city && <p className="text-xs text-red-600 mt-1">{fieldErrors.city}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-medium">State *</label>
                    <select
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={form.state}
                      onChange={e => setForm(prev => ({ ...prev, state: e.target.value }))}>
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
                      onChange={e => setForm(prev => ({ ...prev, pinCode: e.target.value.replace(/\D/g, '') }))}
                    />
                    {fieldErrors.pinCode && <p className="text-xs text-red-600 mt-1">{fieldErrors.pinCode}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-medium">Phone</label>
                    <Input
                      className="mt-1"
                      maxLength={10}
                      value={form.phone}
                      onChange={e => setForm(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, '') }))}
                    />
                    {fieldErrors.phone && <p className="text-xs text-red-600 mt-1">{fieldErrors.phone}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <Input
                      className="mt-1"
                      value={form.email}
                      onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
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
