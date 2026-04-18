'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';
import { MainImageUpload } from '@/components/media/main-image-upload';
import { useToast } from '@/hooks/use-toast';

interface Product {
  id: number | string | null;
  category: string;
  name: string;
  price: string;
  image: string;
}

interface TestimonialSlideFormData {
  quote: string;
  author: string;
  location: string;
  product: Product;
  leftBanner: string;
  rightBanner: string;
  order: number;
  status: 'active' | 'inactive';
}

interface TestimonialSlideFormPageProps {
  slideId?: string;
}

export function TestimonialSlideFormPage({ slideId }: TestimonialSlideFormPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<TestimonialSlideFormData>({
    quote: '',
    author: '',
    location: '',
    product: {
      id: null,
      category: '',
      name: '',
      price: '',
      image: '',
    },
    leftBanner: '',
    rightBanner: '',
    order: 0,
    status: 'active',
  });

  useEffect(() => {
    if (slideId) {
      fetchSlide();
    }
  }, [slideId]);

  const fetchSlide = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/cms/testimonial-slides/${slideId}`);
      if (response.ok) {
        const data = await response.json();
        setFormData({
          quote: data.quote || '',
          author: data.author || '',
          location: data.location || '',
          product: data.product || {
            id: null,
            category: '',
            name: '',
            price: '',
            image: '',
          },
          leftBanner: data.leftBanner || '',
          rightBanner: data.rightBanner || '',
          order: data.order || 0,
          status: data.status || 'active',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load testimonial slide',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('[v0] Failed to fetch testimonial slide:', error);
      toast({
        title: 'Error',
        description: 'Failed to load testimonial slide',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadImage = async (file: File) => {
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
      return data.url as string;
    } catch (error) {
      console.error('[v0] Image upload error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to upload image',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const updateField = (field: keyof TestimonialSlideFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const updateProductField = (field: keyof Product, value: any) => {
    setFormData(prev => ({
      ...prev,
      product: {
        ...prev.product,
        [field]: value,
      },
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.quote.trim()) {
      newErrors.quote = 'Quote is required';
    }
    if (!formData.author.trim()) {
      newErrors.author = 'Author is required';
    }
    if (!formData.product.name.trim()) {
      newErrors.productName = 'Product name is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the highlighted fields',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const url = slideId ? `/api/admin/cms/testimonial-slides/${slideId}` : '/api/admin/cms/testimonial-slides';
      const method = slideId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Testimonial slide ${slideId ? 'updated' : 'created'} successfully`,
          variant: 'success',
        });
        router.push('/admin/cms/testimonial-slides');
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || `Failed to ${slideId ? 'update' : 'create'} testimonial slide`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('[v0] Submit error:', error);
      toast({
        title: 'Error',
        description: 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-4'>
          <Button variant='outline' onClick={() => router.back()} className='gap-2'>
            <ArrowLeft className='h-4 w-4' />
            Back
          </Button>
          <h1 className='text-3xl font-bold'>{slideId ? 'Edit Testimonial Slide' : 'Add New Testimonial Slide'}</h1>
        </div>
      </div>

      <Card className='p-6 shadow-md'>
        <form onSubmit={handleSubmit} className='space-y-6'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <div className='space-y-2'>
              <Label htmlFor='order'>Display Order</Label>
              <Input
                id='order'
                type='number'
                value={formData.order}
                onChange={e => updateField('order', parseInt(e.target.value) || 0)}
                placeholder='0'
              />
            </div>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='quote'>
              Quote <span className='text-red-500'>*</span>
            </Label>
            <Textarea
              id='quote'
              value={formData.quote}
              onChange={e => updateField('quote', e.target.value)}
              placeholder='Customer testimonial quote...'
              rows={3}
              className={errors.quote ? 'border-red-500' : ''}
            />
            {errors.quote && <p className='text-sm text-red-500'>{errors.quote}</p>}
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <div className='space-y-2'>
              <Label htmlFor='author'>
                Author <span className='text-red-500'>*</span>
              </Label>
              <Input
                id='author'
                value={formData.author}
                onChange={e => updateField('author', e.target.value)}
                placeholder='Sarah Johnson'
                className={errors.author ? 'border-red-500' : ''}
              />
              {errors.author && <p className='text-sm text-red-500'>{errors.author}</p>}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='location'>Location</Label>
              <Input
                id='location'
                value={formData.location}
                onChange={e => updateField('location', e.target.value)}
                placeholder='New York, NY'
              />
            </div>
          </div>

          <div className='border-t pt-6'>
            <h3 className='text-lg font-semibold mb-4'>Product Information</h3>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <div className='space-y-2'>
                <Label htmlFor='productId'>Product ID</Label>
                <Input
                  id='productId'
                  type='number'
                  value={formData.product.id || ''}
                  onChange={e => updateProductField('id', e.target.value ? parseInt(e.target.value) : null)}
                  placeholder='1'
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='productCategory'>Product Category</Label>
                <Input
                  id='productCategory'
                  value={formData.product.category}
                  onChange={e => updateProductField('category', e.target.value)}
                  placeholder='Outerwear'
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='productName'>
                  Product Name <span className='text-red-500'>*</span>
                </Label>
                <Input
                  id='productName'
                  value={formData.product.name}
                  onChange={e => updateProductField('name', e.target.value)}
                  placeholder='Premium Wool Overcoat'
                  className={errors.productName ? 'border-red-500' : ''}
                />
                {errors.productName && <p className='text-sm text-red-500'>{errors.productName}</p>}
              </div>

              <div className='space-y-2'>
                <Label htmlFor='productPrice'>Product Price</Label>
                <Input
                  id='productPrice'
                  value={formData.product.price}
                  onChange={e => updateProductField('price', e.target.value)}
                  placeholder='$249.99'
                />
              </div>
            </div>

            <div className='space-y-2 mt-4'>
              <Label htmlFor='productImage'>Product Image</Label>
              <MainImageUpload
                value={formData.product.image}
                onChange={val => updateProductField('image', val)}
                uploadHandler={uploadImage}
                hideLabel
                recommendedText='Recommended: 600×600px, JPG/PNG'
              />
            </div>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <div className='space-y-2'>
              <Label htmlFor='leftBanner'>Left Banner Image</Label>
              <MainImageUpload
                value={formData.leftBanner}
                onChange={val => updateField('leftBanner', val)}
                uploadHandler={uploadImage}
                hideLabel
                recommendedText='Recommended: 800×700px, JPG/PNG'
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='rightBanner'>Right Banner Image</Label>
              <MainImageUpload
                value={formData.rightBanner}
                onChange={val => updateField('rightBanner', val)}
                uploadHandler={uploadImage}
                hideLabel
                recommendedText='Recommended: 800×700px, JPG/PNG'
              />
            </div>
          </div>

          <div className='flex items-center gap-2'>
            <Switch
              checked={formData.status === 'active'}
              onCheckedChange={checked => updateField('status', checked ? 'active' : 'inactive')}
            />
            <Label>Active</Label>
          </div>

          <div className='flex justify-end gap-4'>
            <Button type='button' variant='outline' onClick={() => router.back()} disabled={loading}>
              Cancel
            </Button>
            <Button type='submit' disabled={loading} className='bg-[#22c55e]'>
              {loading ? 'Saving...' : slideId ? 'Update Testimonial Slide' : 'Create Testimonial Slide'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

