'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Lock, AlertCircle, Clock } from 'lucide-react';
import FormField from '@/components/formField/formField';
import Dropdown from '../customDropdown/customDropdown';
import { cn } from '@/lib/utils';

type CouponTabId = 'general' | 'restriction' | 'usage';

interface CouponFormData {
  title: string;
  description: string;
  code: string;
  type: string;
  amount: number;
  maxDiscountAmount?: number; // Maximum discount for percentage coupons
  startDate?: string; // Start date for coupon validity
  endDate?: string; // End date for coupon validity
  isExpired: boolean;
  isFirstOrder: boolean;
  status: boolean;
  applyToAllProducts: boolean;
  products: string[];
  minimumSpend: number;
  isUnlimited: boolean;
  usagePerCoupon: number;
  usagePerCustomer: number;
}

const COUPON_TYPE_OPTIONS = [
  { label: 'Percentage', value: 'percentage' },
  { label: 'Fixed Amount', value: 'fixed' },
];

const COUPON_FIELD_TAB_MAP: Record<string, CouponTabId> = {
  title: 'general',
  description: 'general',
  code: 'general',
  type: 'general',
  amount: 'general',
  maxDiscountAmount: 'general',
  startDate: 'general',
  endDate: 'general',
  isExpired: 'general',
  isFirstOrder: 'general',
  status: 'general',
  applyToAllProducts: 'restriction',
  products: 'restriction',
  minimumSpend: 'restriction',
  isUnlimited: 'usage',
  usagePerCoupon: 'usage',
  usagePerCustomer: 'usage',
};

interface CouponFormPageProps {
  couponId?: string;
}

export function CouponFormPage({ couponId }: CouponFormPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [formData, setFormData] = useState<CouponFormData>({
    title: '',
    description: '',
    code: '',
    type: '',
    amount: 0,
    maxDiscountAmount: 0,
    startDate: '',
    endDate: '',
    isExpired: false,
    isFirstOrder: false,
    status: true,
    applyToAllProducts: false,
    products: [],
    minimumSpend: 0,
    isUnlimited: false,
    usagePerCoupon: 0,
    usagePerCustomer: 0,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!couponId);
  const [tabsWithErrors, setTabsWithErrors] = useState<Set<CouponTabId>>(new Set());
  const [activeTab, setActiveTab] = useState<CouponTabId>('general');
  const [availableProducts, setAvailableProducts] = useState<Array<{ _id: string; name: string }>>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');

  useEffect(() => {
    if (couponId) {
      fetchCoupon();
    }
    fetchProducts();
  }, [couponId]);

    useEffect(() => {
      // Hide scroll
      document.body.style.overflowY = 'hidden';
  
      // Cleanup when leaving page
      return () => {
        document.body.style.overflowY = 'auto';
      };
    }, []);

  const fetchCoupon = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/coupons/${couponId}`);
      if (response.ok) {
        const data = await response.json();
        // Format dates for input fields (YYYY-MM-DD format)
        const formatDateForInput = (date: Date | string | undefined) => {
          if (!date) return '';
          const d = typeof date === 'string' ? new Date(date) : date;
          if (isNaN(d.getTime())) return '';
          return d.toISOString().split('T')[0];
        };

        setFormData({
          title: data.title || '',
          description: data.description || '',
          code: data.code || '',
          type: data.type || '',
          amount: data.amount || 0,
          maxDiscountAmount: data.maxDiscountAmount || 0,
          startDate: formatDateForInput(data.startDate),
          endDate: formatDateForInput(data.endDate),
          isExpired: data.isExpired || false,
          isFirstOrder: data.isFirstOrder || false,
          status: data.status !== undefined ? data.status : true,
          applyToAllProducts: data.applyToAllProducts || false,
          products: Array.isArray(data.products) ? data.products : [],
          minimumSpend: data.minimumSpend || 0,
          isUnlimited: data.isUnlimited || false,
          usagePerCoupon: data.usagePerCoupon || 0,
          usagePerCustomer: data.usagePerCustomer || 0,
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load coupon',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('[v0] Failed to fetch coupon:', error);
      toast({
        title: 'Error',
        description: 'Failed to load coupon',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/admin/products');
      if (response.ok) {
        const data = await response.json();
        setAvailableProducts(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('[v0] Failed to fetch products:', error);
    }
  };

  const getTabsWithErrors = (errorFields: Record<string, string>) => {
    const tabs = new Set<CouponTabId>();
    Object.keys(errorFields).forEach(field => {
      const tab = COUPON_FIELD_TAB_MAP[field];
      if (tab) {
        tabs.add(tab);
      }
    });
    return tabs;
  };

  const isFieldInActiveTab = (field: string) => {
    const tab = COUPON_FIELD_TAB_MAP[field];
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

  const updateField = (field: keyof CouponFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    clearFieldError(field as string);
  };

  const getFieldError = (field: keyof CouponFormData) =>
    isFieldInActiveTab(field as string) ? errors[field] : undefined;

  const handleAddProduct = () => {
    if (selectedProduct && !formData.products.includes(selectedProduct)) {
      updateField('products', [...formData.products, selectedProduct]);
      setSelectedProduct('');
    }
  };

  const handleRemoveProduct = (product: string) => {
    updateField(
      'products',
      formData.products.filter(p => p !== product)
    );
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.code.trim()) newErrors.code = 'Code is required';
    if (!formData.type) newErrors.type = 'Type is required';
    if (!formData.amount || formData.amount <= 0) newErrors.amount = 'Amount is required and must be greater than 0';
    
    if (formData.type === 'percentage') {
      if (formData.amount > 100) {
        newErrors.amount = 'Percentage cannot exceed 100%';
      }
    }

    // Validate dates
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (end < start) {
        newErrors.endDate = 'End date must be after start date';
      }
    }
    if (formData.endDate && !formData.startDate) {
      const end = new Date(formData.endDate);
      const now = new Date();
      if (end < now) {
        newErrors.endDate = 'End date cannot be in the past';
      }
    }

    if (!formData.applyToAllProducts && formData.products.length === 0) {
      newErrors.products = 'At least one product is required when not applying to all products';
    }
    if (!formData.minimumSpend || formData.minimumSpend <= 0) {
      newErrors.minimumSpend = 'Minimum spend is required and must be greater than 0';
    }

    if (!formData.isUnlimited) {
      if (!formData.usagePerCoupon || formData.usagePerCoupon <= 0) {
        newErrors.usagePerCoupon = 'Usage per coupon is required and must be greater than 0';
      }
      if (!formData.usagePerCustomer || formData.usagePerCustomer <= 0) {
        newErrors.usagePerCustomer = 'Usage per customer is required and must be greater than 0';
      }
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
      const method = couponId ? 'PUT' : 'POST';
      const url = couponId ? `/api/admin/coupons/${couponId}` : '/api/admin/coupons';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: couponId ? 'Coupon updated successfully' : 'Coupon created successfully',
          varient: 'success'
        });
        router.push('/admin/coupons');
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to save coupon',
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
    { id: 'general', label: 'General', icon: Lock },
    { id: 'restriction', label: 'Restriction', icon: AlertCircle },
    { id: 'usage', label: 'Usage', icon: Clock },
  ] as const;

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <p className='text-lg text-slate-600'>Loading coupon...</p>
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
              onClick={() => router.push('/admin/coupons')}
              className='inline-flex items-center justify-center cursor-pointer bg-white p-2 text-slate-700 hover:bg-slate-50 rounded-lg border border-slate-200'>
              <ArrowLeft className='h-5 w-5' />
            </button>
            <div>
              <h1 className='text-2xl md:text-3xl font-bold text-slate-900'>
                {couponId ? 'Edit Coupon' : 'Create Coupon'}
              </h1>
              <p className='text-sm text-slate-500'>Manage coupon details and settings.</p>
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
                        hasError && activeTab !== tab.id && 'text-red-600'
                      )}>
                      <Icon className='w-5 h-5' />
                      <span className={cn('text-sm md:text-base', hasError && activeTab === tab.id && 'text-red-600')}>
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
                  {activeTab === 'general' && (
                    <div className='space-y-6'>
                      <div>
                        <h3 className='text-xl font-semibold text-slate-900'>General Information</h3>
                        <p className='text-sm text-slate-500'>Provide the coupon's basic details.</p>
                      </div>

                      <FormField
                        label='Title'
                        required
                        placeholder='Enter Title'
                        value={formData.title}
                        onChange={e => updateField('title', e.target.value)}
                        error={getFieldError('title')}
                      />

                      <FormField
                        label='Description'
                        required
                        textarea
                        placeholder='Enter Description'
                        value={formData.description}
                        onChange={e => updateField('description', e.target.value)}
                        error={getFieldError('description')}
                      />

                      <FormField
                        label='Code'
                        required
                        placeholder='Enter Code'
                        value={formData.code}
                        onChange={e => updateField('code', e.target.value.toUpperCase())}
                        error={getFieldError('code')}
                      />

                      <Dropdown
                        options={[
                          { label: 'Select', value: '' },
                          ...COUPON_TYPE_OPTIONS,
                        ]}
                        placeholder='Select'
                        withSearch={false}
                        labelMain='Type *'
                        value={formData.type}
                        onChange={option => updateField('type', option.value)}
                        error={getFieldError('type')}
                      />

                      <div className='space-y-2'>
                        <label className='text-sm font-medium text-gray-700 dark:text-slate-300'>
                          Amount <span className='text-red-500'>*</span>
                        </label>
                        <div className='relative'>
                          <span className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500'>
                            {formData.type === 'percentage' ? '%' : '₹'}
                          </span>
                          <input
                            type='number'
                            step='0.01'
                            placeholder={formData.type === 'percentage' ? 'Enter Percentage (e.g., 10 for 10%)' : 'Enter Amount'}
                            value={formData.amount || ''}
                            onChange={e => updateField('amount', parseFloat(e.target.value) || 0)}
                            className='w-full border rounded-md pl-8 pr-3 py-3 text-sm bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition'
                          />
                        </div>
                        {formData.type === 'percentage' && (
                          <p className='text-xs text-slate-500 mt-1'>Enter the discount percentage (e.g., 10 for 10% off)</p>
                        )}
                        {getFieldError('amount') && <p className='text-red-500 text-xs mt-1'>{getFieldError('amount')}</p>}
                      </div>

                      {formData.type === 'percentage' && (
                        <div className='space-y-2'>
                          <label className='text-sm font-medium text-gray-700 dark:text-slate-300'>
                            Maximum Discount Amount (₹)
                          </label>
                          <div className='relative'>
                            <span className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500'>₹</span>
                            <input
                              type='number'
                              step='0.01'
                              placeholder='Enter Maximum Discount (Optional)'
                              value={formData.maxDiscountAmount || ''}
                              onChange={e => updateField('maxDiscountAmount', parseFloat(e.target.value) || 0)}
                              className='w-full border rounded-md pl-8 pr-3 py-3 text-sm bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition'
                            />
                          </div>
                          <p className='text-xs text-slate-500 mt-1'>
                            Maximum discount amount for percentage coupons (e.g., ₹500 max discount)
                          </p>
                        </div>
                      )}

                      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                        <div className='space-y-2'>
                          <label className='text-sm font-medium text-gray-700 dark:text-slate-300'>
                            Start Date
                          </label>
                          <input
                            type='date'
                            value={formData.startDate || ''}
                            onChange={e => updateField('startDate', e.target.value)}
                            className='w-full border rounded-md px-3 py-3 text-sm bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition'
                          />
                          <p className='text-xs text-slate-500 mt-1'>When the coupon becomes active</p>
                        </div>
                        <div className='space-y-2'>
                          <label className='text-sm font-medium text-gray-700 dark:text-slate-300'>
                            End Date <span className='text-red-500'>*</span>
                          </label>
                          <input
                            type='date'
                            value={formData.endDate || ''}
                            onChange={e => updateField('endDate', e.target.value)}
                            min={formData.startDate || undefined}
                            className='w-full border rounded-md px-3 py-3 text-sm bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition'
                          />
                          <p className='text-xs text-slate-500 mt-1'>When the coupon expires</p>
                        </div>
                      </div>

                      <div className='flex items-center justify-between p-4 border rounded-lg'>
                        <div>
                          <Label htmlFor='isExpired' className='text-sm font-medium'>
                            Is Expired
                          </Label>
                        </div>
                        <Switch
                          id='isExpired'
                          checked={formData.isExpired}
                          onCheckedChange={checked => updateField('isExpired', checked)}
                        />
                      </div>

                      <div className='flex items-center justify-between p-4 border rounded-lg'>
                        <div>
                          <Label htmlFor='isFirstOrder' className='text-sm font-medium'>
                            Is First Order
                          </Label>
                        </div>
                        <Switch
                          id='isFirstOrder'
                          checked={formData.isFirstOrder}
                          onCheckedChange={checked => updateField('isFirstOrder', checked)}
                        />
                      </div>

                      <div className='flex items-center justify-between p-4 border rounded-lg'>
                        <div>
                          <Label htmlFor='status' className='text-sm font-medium'>
                            Status
                          </Label>
                        </div>
                        <Switch
                          id='status'
                          checked={formData.status}
                          onCheckedChange={checked => updateField('status', checked)}
                        />
                      </div>
                    </div>
                  )}

                  {activeTab === 'restriction' && (
                    <div className='space-y-6'>
                      <div>
                        <h3 className='text-xl font-semibold text-slate-900'>Restriction Settings</h3>
                        <p className='text-sm text-slate-500'>Define coupon application rules.</p>
                      </div>

                      <div className='flex items-center justify-between p-4 border rounded-lg'>
                        <div>
                          <Label htmlFor='applyToAllProducts' className='text-sm font-medium'>
                            Apply To All Products
                          </Label>
                        </div>
                        <Switch
                          id='applyToAllProducts'
                          checked={formData.applyToAllProducts}
                          onCheckedChange={checked => {
                            updateField('applyToAllProducts', checked);
                            if (checked) {
                              updateField('products', []);
                            }
                          }}
                        />
                      </div>

                      {!formData.applyToAllProducts && (
                        <div className='space-y-2'>
                          <label className='text-sm font-medium text-gray-700 dark:text-slate-300'>
                            Products <span className='text-red-500'>*</span>
                          </label>
                          <div className='flex gap-2'>
                            <div className='flex-1'>
                              <Dropdown
                                options={[
                                  { label: 'Select', value: '' },
                                  ...availableProducts
                                    .filter(p => !formData.products.includes(p._id))
                                    .map(p => ({ label: p.name, value: p._id })),
                                ]}
                                placeholder='Select'
                                withSearch={true}
                                value={selectedProduct}
                                onChange={option => setSelectedProduct(option.value)}
                              />
                            </div>
                            <Button
                              type='button'
                              onClick={handleAddProduct}
                              disabled={!selectedProduct}
                              className='bg-orange-500 hover:bg-orange-600'>
                              Add
                            </Button>
                          </div>
                          {formData.products.length > 0 && (
                            <div className='flex flex-wrap gap-2 mt-2'>
                              {formData.products.map(productId => {
                                const product = availableProducts.find(p => p._id === productId);
                                return (
                                  <div
                                    key={productId}
                                    className='flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full text-sm'>
                                    <span>{product?.name || productId}</span>
                                    <button
                                      type='button'
                                      onClick={() => handleRemoveProduct(productId)}
                                      className='text-red-500 hover:text-red-700'>
                                      ×
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {getFieldError('products') && (
                            <p className='text-red-500 text-xs mt-1'>{getFieldError('products')}</p>
                          )}
                        </div>
                      )}

                      <div className='space-y-2'>
                        <label className='text-sm font-medium text-gray-700 dark:text-slate-300'>
                          Minimum Spend <span className='text-red-500'>*</span>
                        </label>
                        <div className='relative'>
                          <span className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500'>₹</span>
                          <input
                            type='number'
                            step='0.01'
                            placeholder='Enter Minimum Spend'
                            value={formData.minimumSpend || ''}
                            onChange={e => updateField('minimumSpend', parseFloat(e.target.value) || 0)}
                            className='w-full border rounded-md pl-8 pr-3 py-3 text-sm bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition'
                          />
                        </div>
                        <p className='text-xs text-slate-500 mt-1'>
                          *Define the minimum order value needed to utilize the coupon.
                        </p>
                        {getFieldError('minimumSpend') && (
                          <p className='text-red-500 text-xs mt-1'>{getFieldError('minimumSpend')}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'usage' && (
                    <div className='space-y-6'>
                      <div>
                        <h3 className='text-xl font-semibold text-slate-900'>Usage Settings</h3>
                        <p className='text-sm text-slate-500'>Define coupon usage limits.</p>
                      </div>

                      <div className='flex items-center justify-between p-4 border rounded-lg'>
                        <div>
                          <Label htmlFor='isUnlimited' className='text-sm font-medium'>
                            Is Unlimited
                          </Label>
                        </div>
                        <Switch
                          id='isUnlimited'
                          checked={formData.isUnlimited}
                          onCheckedChange={checked => {
                            updateField('isUnlimited', checked);
                            if (checked) {
                              updateField('usagePerCoupon', 0);
                              updateField('usagePerCustomer', 0);
                            }
                          }}
                        />
                      </div>

                      {!formData.isUnlimited && (
                        <>
                          <div className='space-y-2'>
                            <label className='text-sm font-medium text-gray-700 dark:text-slate-300'>
                              Usage Per Coupon
                            </label>
                            <input
                              type='number'
                              placeholder='Enter Value'
                              value={formData.usagePerCoupon || ''}
                              onChange={e => updateField('usagePerCoupon', parseInt(e.target.value) || 0)}
                              className='w-full border rounded-md px-3 py-3 text-sm bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition'
                            />
                            <p className='text-xs text-slate-500 mt-1'>
                              Specify the maximum number of times a single coupon can be utilized.
                            </p>
                            {getFieldError('usagePerCoupon') && (
                              <p className='text-red-500 text-xs mt-1'>{getFieldError('usagePerCoupon')}</p>
                            )}
                          </div>

                          <div className='space-y-2'>
                            <label className='text-sm font-medium text-gray-700 dark:text-slate-300'>
                              Usage Per Customer
                            </label>
                            <input
                              type='number'
                              placeholder='Enter Value'
                              value={formData.usagePerCustomer || ''}
                              onChange={e => updateField('usagePerCustomer', parseInt(e.target.value) || 0)}
                              className='w-full border rounded-md px-3 py-3 text-sm bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition'
                            />
                            <p className='text-xs text-slate-500 mt-1'>
                              Specify the maximum number of times a single customer can utilize the coupon.
                            </p>
                            {getFieldError('usagePerCustomer') && (
                              <p className='text-red-500 text-xs mt-1'>{getFieldError('usagePerCustomer')}</p>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </Card>

              <div className='flex flex-col sm:flex-row gap-3 justify-end pt-4'>
                <Button
                  type='button'
                  variant='outline'
                  className='border-slate-200'
                  onClick={() => router.push('/admin/coupons')}
                  disabled={saving}>
                  Cancel
                </Button>
                <Button type='submit' disabled={saving} className='bg-orange-500 hover:bg-orange-600'>
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </section>
          </div>
        </form>
      </div>
    </div>
  );
}

