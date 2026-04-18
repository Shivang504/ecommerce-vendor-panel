'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';
import { MainImageUpload } from '@/components/media/main-image-upload';
import { useToast } from '@/hooks/use-toast';

interface BrandFormData {
  name: string;
  image: string;
  bannerImage: string;
  metaTitle: string;
  metaDescription: string;
  metaImage: string;
  status: 'active' | 'inactive';
}

interface BrandFormPageProps {
  brandId?: string;
}

export function BrandFormPage({ brandId }: BrandFormPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<BrandFormData>({
    name: '',
    image: '',
    bannerImage: '',
    metaTitle: '',
    metaDescription: '',
    metaImage: '',
    status: 'active',
  });

  useEffect(() => {
    if (brandId) {
      fetchBrand();
    }
  }, [brandId]);

  const fetchBrand = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/brands/${brandId}`);
      if (response.ok) {
        const data = await response.json();
        setFormData({
          name: data.name || '',
          image: data.image || '',
          bannerImage: data.bannerImage || '',
          metaTitle: data.metaTitle || '',
          metaDescription: data.metaDescription || '',
          metaImage: data.metaImage || '',
          status: data.status || 'active',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load brand',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('[v0] Failed to fetch brand:', error);
      toast({
        title: 'Error',
        description: 'Failed to load brand',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadBrandAsset = async (file: File) => {
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
      // toast({
      //   title: 'Success',
      //   description: 'Image uploaded successfully',
      // });
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

  const updateField = (field: keyof BrandFormData, value: any) => {
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

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Name is a required field';
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
      const url = brandId ? `/api/admin/brands/${brandId}` : '/api/admin/brands';
      const method = brandId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Brand ${brandId ? 'updated' : 'created'} successfully`,
          variant :"success"
        });
        router.push('/admin/brands');
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to save brand',
          variant: 'destructive',
        });
        if (error.error && error.error.includes('name')) {
          setErrors({ name: error.error });
        }
      }
    } catch (error) {
      console.error('[v0] Submit error:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while saving the brand',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Hide scroll
    document.body.style.overflowY = 'hidden';

    // Cleanup when leaving page
    return () => {
      document.body.style.overflowY = 'auto';
    };
  }, []);

  if (loading && brandId) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <p className='text-muted-foreground'>Loading brand...</p>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8'>
      <div className='max-w-5xl mx-auto space-y-6'>
        <div className='bg-white rounded-lg shadow-sm p-4 md:p-6'>
          <div className='flex items-center gap-4'>
            <button
              type='button'
              onClick={() => router.push('/admin/brands')}
              className='inline-flex items-center justify-center cursor-pointer bg-white p-2 text-slate-700 hover:bg-slate-50 rounded-lg border border-slate-200'>
              <ArrowLeft className='h-5 w-5' />
            </button>
            <div>
              <h1 className='text-2xl md:text-3xl font-bold text-slate-900'>{brandId ? 'Edit Brand' : 'Create Brand'}</h1>
              <p className='text-sm text-slate-500'>Manage brand information and settings.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className='space-y-6'>
          <section className='space-y-6'>
            <Card className='bg-white border border-slate-200'>
              <div className='space-y-6 px-6 py-6'>
                <div className='space-y-4'>
                  <h3 className='text-xl font-semibold text-slate-900'>Basic Information</h3>
                  <p className='text-sm text-slate-500'>Provide the brand's profile details.</p>

                  <div className='space-y-2'>
                    <label htmlFor='name' className='text-sm font-medium text-slate-900'>
                      Name <span className='text-red-500'>*</span>
                    </label>
                    <Input
                      id='name'
                      value={formData.name}
                      onChange={e => updateField('name', e.target.value)}
                      placeholder='Enter Name'
                      className='h-[48px]'
                    />
                    {errors.name && <p className='text-sm text-red-500'>{errors.name}</p>}
                  </div>
                </div>

                <div className='space-y-4'>
                  <h3 className='text-xl font-semibold text-slate-900'>Brand Assets</h3>
                  <p className='text-sm text-slate-500'>Upload images for your brand.</p>

                  <div className='space-y-2'>
                    <label className='text-sm font-medium text-slate-900'>Image</label>
                    <MainImageUpload
                      value={formData.image}
                      onChange={val => updateField('image', val)}
                      uploadHandler={uploadBrandAsset}
                      hideLabel
                    />
                  </div>

                  <div className='space-y-2'>
                    <label className='text-sm font-medium text-slate-900'>Banner Image</label>
                    <MainImageUpload
                      value={formData.bannerImage}
                      onChange={val => updateField('bannerImage', val)}
                      uploadHandler={uploadBrandAsset}
                      hideLabel
                    />
                  </div>
                </div>

                <div className='space-y-4'>
                  <h3 className='text-xl font-semibold text-slate-900'>SEO Settings</h3>
                  <p className='text-sm text-slate-500'>Optimize your brand for search engines.</p>

                  <div className='space-y-2'>
                    <label htmlFor='metaTitle' className='text-sm font-medium text-slate-900'>
                      Meta Title
                    </label>
                    <Input
                      id='metaTitle'
                      value={formData.metaTitle}
                      onChange={e => updateField('metaTitle', e.target.value)}
                      placeholder='Enter Meta Title'
                      className='h-[48px]'
                    />
                  </div>

                  <div className='space-y-2'>
                    <label htmlFor='metaDescription' className='text-sm font-medium text-slate-900'>
                      Meta Description
                    </label>
                    <textarea
                      id='metaDescription'
                      value={formData.metaDescription}
                      onChange={e => updateField('metaDescription', e.target.value)}
                      placeholder='Enter Meta Description'
                      className='w-full border rounded-md p-3 text-sm bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition min-h-[100px] resize-y'
                      rows={4}
                    />
                  </div>

                  <div className='space-y-2'>
                    <label className='text-sm font-medium text-slate-900'>Meta Image</label>
                    <MainImageUpload
                      value={formData.metaImage}
                      onChange={val => updateField('metaImage', val)}
                      uploadHandler={uploadBrandAsset}
                      hideLabel
                    />
                  </div>
                </div>

                <div className='space-y-4'>
                  <h3 className='text-xl font-semibold text-slate-900'>Status</h3>
                  <p className='text-sm text-slate-500'>Control brand availability.</p>

                  <div className='flex items-center justify-between p-4 border rounded-lg'>
                    <div>
                      <p className='text-sm font-medium'>Brand Status</p>
                      <p className='text-xs text-muted-foreground'>Inactive brands won't be visible</p>
                    </div>
                    <Switch
                      id='status'
                      checked={formData.status === 'active'}
                      onCheckedChange={checked => updateField('status', checked ? 'active' : 'inactive')}
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
                onClick={() => router.push('/admin/brands')}
                disabled={loading}>
                Cancel
              </Button>
              <Button type='submit' disabled={loading}>
                {loading ? 'Saving...' : brandId ? 'Update Brand' : 'Create Brand'}
              </Button>
            </div>
          </section>
        </form>
      </div>
    </div>
  );
}