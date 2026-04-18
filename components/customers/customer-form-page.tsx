'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Upload, User, MapPin, CreditCard, StickyNote } from 'lucide-react';
import FormField from '@/components/formField/formField';

interface CustomerFormPageProps {
  customerId?: string;
  isViewMode?: boolean;
}

export function CustomerFormPage({ customerId, isViewMode = false }: CustomerFormPageProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'basic' | 'shipping' | 'billing' | 'notes'>('basic');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    avatar: '',
    address: {
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
    },
    billingAddress: {
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
    },
    status: 'active' as 'active' | 'blocked',
    notes: '',
  });

  useEffect(() => {
    // Hide scroll
    document.body.style.overflowY = 'hidden';

    // Cleanup when leaving page
    return () => {
      document.body.style.overflowY = 'auto';
    };
  }, []);

  useEffect(() => {
    if (customerId) {
      fetchCustomer();
    }
  }, [customerId]);

  const fetchCustomer = async () => {
    try {
      const response = await fetch(`/api/admin/customers/${customerId}`);
      if (response.ok) {
        const data = await response.json();
        setFormData({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          password: '',
          avatar: data.avatar || '',
          address: data.address || { street: '', city: '', state: '', postalCode: '', country: '' },
          billingAddress: data.billingAddress || { street: '', city: '', state: '', postalCode: '', country: '' },
          status: data.status || 'active',
          notes: data.notes || '',
        });
      }
    } catch (error) {
      console.error('[v0] Failed to fetch customer:', error);
      toast({ title: 'Error', description: 'Failed to load customer data', variant: 'destructive' });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Error', description: 'Please select an image file', variant: 'destructive' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Error', description: 'Image size must be less than 5MB', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setFormData(prev => ({ ...prev, avatar: data.url }));
        toast({ title: 'Success', description: 'Image uploaded successfully' });
      } else {
        toast({ title: 'Error', description: data.error || 'Upload failed', variant: 'destructive' });
      }
    } catch (error) {
      console.error('[v0] Upload error:', error);
      toast({ title: 'Error', description: 'Failed to upload image', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
    if (!customerId && !formData.password.trim()) newErrors.password = 'Password is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast({ title: 'Validation Error', description: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }

    setLoading(true);

    try {
      const url = customerId ? `/api/admin/customers/${customerId}` : '/api/admin/customers';
      const method = customerId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Customer ${customerId ? 'updated' : 'created'} successfully`,
          variant : "success"
        });
        router.push('/admin/customers');
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to save customer',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('[v0] Failed to save customer:', error);
      toast({
        title: 'Error',
        description: 'Failed to save customer',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'basic', label: 'Basic Information', icon: User },
    { id: 'shipping', label: 'Shipping Address', icon: MapPin },
    { id: 'billing', label: 'Billing Address', icon: CreditCard },
    { id: 'notes', label: 'Notes & Activity', icon: StickyNote },
  ] as const;

  return (
    <div className='min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8'>
      <div className='max-w-7xl mx-auto space-y-6'>
        <div className='bg-white rounded-lg shadow-sm p-4 md:p-6'>
          <div className='flex items-center gap-4'>
            <button
              type='button'
              onClick={() => router.back()}
              className='inline-flex items-center justify-center cursor-pointer bg-white p-2 text-slate-700 hover:bg-slate-50 rounded-lg border border-slate-200'>
              <ArrowLeft className='h-5 w-5' />
            </button>
            <div>
              <h1 className='text-2xl md:text-3xl font-bold text-slate-900'>
                {isViewMode ? 'View' : customerId ? 'Edit' : 'Add'} Customer
              </h1>
              <p className='text-sm text-slate-500'>All customer details organized by section.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className='space-y-6'>
          <div className='grid grid-cols-1 lg:grid-cols-12 gap-6'>
            <aside className='lg:col-span-3'>
              <div className='bg-white rounded-lg shadow-sm p-2 space-y-1'>
                {tabs.map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      type='button'
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition cursor-pointer ${
                        activeTab === tab.id ? 'bg-gray-100 text-primary font-medium' : 'text-gray-700 hover:bg-gray-50'
                      }`}>
                      <Icon className='w-5 h-5' />
                      <span className='text-sm md:text-base'>{tab.label}</span>
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
                        <h3 className='text-xl font-semibold text-slate-900'>Basic Information</h3>
                        <p className='text-sm text-slate-500'>Core profile details for this customer.</p>
                      </div>

                      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                        <FormField
                          label='Customer Name'
                          required
                          id='name'
                          value={formData.name}
                          onChange={e => setFormData({ ...formData, name: e.target.value })}
                          placeholder='Enter customer name'
                          disabled={isViewMode}
                          error={errors.name}
                        />

                        <FormField
                          label='Email'
                          required
                          id='email'
                          type='email'
                          value={formData.email}
                          onChange={e => setFormData({ ...formData, email: e.target.value })}
                          placeholder='Enter email address'
                          disabled={isViewMode}
                          error={errors.email}
                        />

                        <FormField
                          label='Phone Number'
                          required
                          id='phone'
                          value={formData.phone}
                          onChange={e => setFormData({ ...formData, phone: e.target.value })}
                          placeholder='Enter phone number'
                          disabled={isViewMode}
                          error={errors.phone}
                        />

                        {!customerId && (
                          <FormField
                            label='Password'
                            required
                            id='password'
                            type='password'
                            value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                            placeholder='Enter password'
                            disabled={isViewMode}
                            error={errors.password}
                          />
                        )}
                      </div>

                      <div className='space-y-2'>
                        <div className='flex flex-col md:flex-row md:items-end gap-4'>
                          <FormField
                            label='Customer Avatar'
                            value={formData.avatar}
                            onChange={e => setFormData({ ...formData, avatar: e.target.value })}
                            placeholder='Avatar URL or upload image'
                            disabled={isViewMode}
                            containerClassName='flex-1'
                          />
                          {!isViewMode && (
                            <div>
                              <input type='file' id='avatar-upload' accept='image/*' onChange={handleImageUpload} className='hidden' />
                              <Button
                                type='button'
                                variant='outline'
                                onClick={() => document.getElementById('avatar-upload')?.click()}
                                disabled={uploading}>
                                <Upload className='h-4 w-4 mr-2' />
                                {uploading ? 'Uploading...' : 'Upload'}
                              </Button>
                            </div>
                          )}
                        </div>
                        {formData.avatar && (
                          <div className='mt-4'>
                            <img
                              src={formData.avatar || '/placeholder.svg'}
                              alt='Avatar preview'
                              className='w-24 h-24 rounded-full object-cover'
                            />
                          </div>
                        )}
                      </div>

                      <div className='flex items-center justify-between p-4 border rounded-lg'>
                        <div>
                          <p className='text-sm font-medium text-slate-700'>Account Status</p>
                          <p className='text-xs text-muted-foreground'>Block or activate customer account</p>
                        </div>
                        <Switch
                          id='status'
                          size='md'
                          checked={formData.status === 'active'}
                          onCheckedChange={checked => setFormData({ ...formData, status: checked ? 'active' : 'blocked' })}
                          disabled={isViewMode}
                        />
                      </div>
                    </div>
                  )}

                  {activeTab === 'shipping' && (
                    <div className='space-y-6'>
                      <div>
                        <h3 className='text-xl font-semibold text-slate-900'>Shipping Address</h3>
                        <p className='text-sm text-slate-500'>Default shipping destination for orders.</p>
                      </div>

                      <FormField
                        label='Street Address'
                        id='street'
                        value={formData.address.street}
                        onChange={e => setFormData({ ...formData, address: { ...formData.address, street: e.target.value } })}
                        placeholder='Enter street address'
                        disabled={isViewMode}
                      />

                      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                        <FormField
                          label='City'
                          id='city'
                          value={formData.address.city}
                          onChange={e => setFormData({ ...formData, address: { ...formData.address, city: e.target.value } })}
                          placeholder='Enter city'
                          disabled={isViewMode}
                        />

                        <FormField
                          label='State'
                          id='state'
                          value={formData.address.state}
                          onChange={e => setFormData({ ...formData, address: { ...formData.address, state: e.target.value } })}
                          placeholder='Enter state'
                          disabled={isViewMode}
                        />

                        <FormField
                          label='Postal Code'
                          id='postalCode'
                          value={formData.address.postalCode}
                          onChange={e => setFormData({ ...formData, address: { ...formData.address, postalCode: e.target.value } })}
                          placeholder='Enter postal code'
                          disabled={isViewMode}
                        />

                        <FormField
                          label='Country'
                          id='country'
                          value={formData.address.country}
                          onChange={e => setFormData({ ...formData, address: { ...formData.address, country: e.target.value } })}
                          placeholder='Enter country'
                          disabled={isViewMode}
                        />
                      </div>
                    </div>
                  )}

                  {activeTab === 'billing' && (
                    <div className='space-y-6'>
                      <div>
                        <h3 className='text-xl font-semibold text-slate-900'>Billing Address</h3>
                        <p className='text-sm text-slate-500'>Address used for invoicing and tax purposes.</p>
                      </div>

                      <FormField
                        label='Street Address'
                        id='billing-street'
                        value={formData.billingAddress.street}
                        onChange={e => setFormData({ ...formData, billingAddress: { ...formData.billingAddress, street: e.target.value } })}
                        placeholder='Enter street address'
                        disabled={isViewMode}
                      />

                      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                        <FormField
                          label='City'
                          id='billing-city'
                          value={formData.billingAddress.city}
                          onChange={e => setFormData({ ...formData, billingAddress: { ...formData.billingAddress, city: e.target.value } })}
                          placeholder='Enter city'
                          disabled={isViewMode}
                        />

                        <FormField
                          label='State'
                          id='billing-state'
                          value={formData.billingAddress.state}
                          onChange={e =>
                            setFormData({ ...formData, billingAddress: { ...formData.billingAddress, state: e.target.value } })
                          }
                          placeholder='Enter state'
                          disabled={isViewMode}
                        />

                        <FormField
                          label='Postal Code'
                          id='billing-postalCode'
                          value={formData.billingAddress.postalCode}
                          onChange={e =>
                            setFormData({ ...formData, billingAddress: { ...formData.billingAddress, postalCode: e.target.value } })
                          }
                          placeholder='Enter postal code'
                          disabled={isViewMode}
                        />

                        <FormField
                          label='Country'
                          id='billing-country'
                          value={formData.billingAddress.country}
                          onChange={e =>
                            setFormData({ ...formData, billingAddress: { ...formData.billingAddress, country: e.target.value } })
                          }
                          placeholder='Enter country'
                          disabled={isViewMode}
                        />
                      </div>
                    </div>
                  )}

                  {activeTab === 'notes' && (
                    <div className='space-y-6'>
                      <div>
                        <h3 className='text-xl font-semibold text-slate-900'>Internal Notes</h3>
                        <p className='text-sm text-slate-500'>Track VIP perks, support interactions, or risk flags.</p>
                      </div>

                      <FormField
                        label='Internal Notes'
                        textarea
                        id='notes'
                        value={formData.notes}
                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                        placeholder='Add any internal notes about this customer...'
                        rows={4}
                        disabled={isViewMode}
                      />
                    </div>
                  )}
                </div>
              </Card>

              {!isViewMode && (
                <div className='flex flex-col sm:flex-row gap-3 justify-end pt-4'>
                  <Button type='button' variant='outline' className='border-slate-200' onClick={() => router.back()} disabled={loading}>
                    Cancel
                  </Button>
                  <Button type='submit' disabled={loading}>
                    {loading ? 'Saving...' : customerId ? 'Update Customer' : 'Create Customer'}
                  </Button>
                </div>
              )}
            </section>
          </div>
        </form>
      </div>
    </div>
  );
}
