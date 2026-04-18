'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import FormField from '@/components/formField/formField';
import { ArrowLeft, Star, Loader2 } from 'lucide-react';
import Dropdown from '@/components/customDropdown/customDropdown';

interface Product {
  _id: string;
  name: string;
}

interface ReviewFormData {
  productId: string;
  customerName: string;
  customerEmail: string;
  customerAvatar: string;
  rating: number;
  title: string;
  description: string;
  photos: string[];
  verifiedPurchase: boolean;
  status: 'approved';
}

export function ReviewFormPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [formData, setFormData] = useState<ReviewFormData>({
    productId: '',
    customerName: '',
    customerEmail: '',
    customerAvatar: '',
    rating: 0,
    title: '',
    description: '',
    photos: [],
    verifiedPurchase: false,
    status: 'approved',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  useEffect(() => {
    // Hide scroll
    document.body.style.overflowY = 'hidden';

    // Cleanup when leaving page
    return () => {
      document.body.style.overflowY = 'auto';
    };
  }, []);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      const response = await fetch('/api/admin/products', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        const products = Array.isArray(data) ? data : data.products || [];
        setAvailableProducts(products.filter((p: Product) => p && p.name && p._id));
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.productId) newErrors.productId = 'Product is required';
    if (!formData.rating || formData.rating === 0) newErrors.rating = 'Rating is required';
    if (!formData.customerName.trim()) newErrors.customerName = 'Customer name is required';
    if (!formData.customerEmail.trim()) newErrors.customerEmail = 'Customer email is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields correctly',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/admin/reviews/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Review created successfully',
          variant: 'success'
        });
        router.push('/admin/reviews');
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to add review',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error adding review:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while saving the review',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className='min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8'>
      <div className='max-w-5xl mx-auto space-y-6'>
        <div className='bg-white rounded-lg shadow-sm p-4 md:p-6'>
          <div className='flex items-center gap-4'>
            <button
              type='button'
              onClick={() => router.push('/admin/reviews')}
              className='inline-flex items-center justify-center cursor-pointer bg-white p-2 text-slate-700 hover:bg-slate-50 rounded-lg border border-slate-200'>
              <ArrowLeft className='h-5 w-5' />
            </button>
            <div>
              <h1 className='text-2xl md:text-3xl font-bold text-slate-900'>Add New Review</h1>
              <p className='text-sm text-slate-500'>Add a new product review. Reviews will go live directly after submission.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className='space-y-6'>
          <section className='space-y-6'>
            <Card className='bg-white border border-slate-200'>
              <div className='space-y-6 px-6 py-6'>
                <div className='space-y-4'>
                  <h3 className='text-xl font-semibold text-slate-900'>Product & Rating</h3>
                  <p className='text-sm text-slate-500'>Select the product and provide a rating.</p>

                  <div className='space-y-2'>
                    <label className='text-sm font-medium text-gray-700'>
                      Product <span className='text-black'>*</span>
                    </label>
                    <Dropdown
                      options={[
                        { label: 'Select Product', value: '' },
                        ...availableProducts
                          .filter(p => p && p._id && p.name && typeof p.name === 'string' && p.name.trim() !== '')
                          .map(p => ({
                            label: String(p.name).trim(),
                            value: String(p._id),
                          })),
                      ].filter(opt => opt && opt.label && opt.value)}
                      placeholder='Select Product'
                      withSearch={true}
                      value={formData.productId}
                      onChange={option => {
                        setFormData(prev => ({ ...prev, productId: option.value }));
                        if (errors.productId) {
                          setErrors(prev => ({ ...prev, productId: '' }));
                        }
                      }}
                      error={errors.productId}
                    />
                    {loadingProducts && <p className='text-xs text-slate-500 mt-1'>Loading products...</p>}
                  </div>

                  <div className='space-y-2'>
                    <label className='text-sm font-medium text-gray-700'>
                      Rating <span className='text-black'>*</span>
                    </label>
                    <div className='flex gap-1'>
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          type='button'
                          onClick={() => {
                            setFormData(prev => ({ ...prev, rating: star }));
                            if (errors.rating) {
                              setErrors(prev => ({ ...prev, rating: '' }));
                            }
                          }}
                          className='focus:outline-none'>
                          <Star
                            className={`w-8 h-8 transition-colors ${
                              star <= formData.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    {errors.rating && <p className='text-red-500 text-xs mt-1'>{errors.rating}</p>}
                  </div>
                </div>

                <div className='space-y-4'>
                  <h3 className='text-xl font-semibold text-slate-900'>Customer Information</h3>
                  <p className='text-sm text-slate-500'>Provide customer details for this review.</p>

                  <FormField
                    label='Customer Name'
                    required
                    id='customerName'
                    name='customerName'
                    value={formData.customerName}
                    onChange={handleInputChange}
                    placeholder='Enter customer name'
                    disabled={submitting}
                    error={errors.customerName}
                  />

                  <FormField
                    label='Customer Email'
                    required
                    id='customerEmail'
                    name='customerEmail'
                    type='email'
                    value={formData.customerEmail}
                    onChange={handleInputChange}
                    placeholder='Enter customer email'
                    disabled={submitting}
                    error={errors.customerEmail}
                  />

                  <FormField
                    label='Customer Avatar URL'
                    id='customerAvatar'
                    name='customerAvatar'
                    type='url'
                    value={formData.customerAvatar}
                    onChange={handleInputChange}
                    placeholder='Enter avatar URL (optional)'
                    disabled={submitting}
                    helperText='Optional: URL to customer avatar image'
                  />
                </div>

                <div className='space-y-4'>
                  <h3 className='text-xl font-semibold text-slate-900'>Review Content</h3>
                  <p className='text-sm text-slate-500'>Write the review title and description.</p>

                  <FormField
                    label='Review Title'
                    id='title'
                    name='title'
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder='Enter review title (optional)'
                    disabled={submitting}
                    helperText='Optional: A brief title for the review'
                  />

                  <FormField
                    label='Description'
                    required
                    textarea
                    id='description'
                    name='description'
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder='Enter review description'
                    disabled={submitting}
                    error={errors.description}
                    rows={4}
                  />
                </div>

                <div className='space-y-4'>
                  <h3 className='text-xl font-semibold text-slate-900'>Additional Settings</h3>
                  <p className='text-sm text-slate-500'>Configure review display options.</p>

                  <div className='flex items-center justify-between p-4 border rounded-lg'>
                    <div>
                      <p className='text-sm font-medium'>Verified Purchase</p>
                      <p className='text-xs text-muted-foreground'>Mark this review as from a verified purchase</p>
                    </div>
                    <Switch
                      id='verifiedPurchase'
                      checked={formData.verifiedPurchase}
                      onCheckedChange={checked => setFormData(prev => ({ ...prev, verifiedPurchase: checked }))}
                    />
                  </div>
                </div>
              </div>
            </Card>

            <div className='flex flex-col sm:flex-row gap-3 justify-end pt-4'>
              <Button
                type='button'
                variant='outline'
                className='border-slate-200'
                onClick={() => router.push('/admin/reviews')}
                disabled={submitting}>
                Cancel
              </Button>
              <Button type='submit' disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                    Adding...
                  </>
                ) : (
                  'Add Review'
                )}
              </Button>
            </div>
          </section>
        </form>
      </div>
    </div>
  );
}

