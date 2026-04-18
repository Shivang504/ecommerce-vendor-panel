'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import FormField from '@/components/formField/formField';
import { ArrowLeft } from 'lucide-react';
import { MainImageUpload } from '@/components/media/main-image-upload';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SubcategoryFormData {
  name: string;
  slug: string;
  categoryId: string | null;
  description: string;
  shortDescription: string;
  image: string;
  icon: string;
  banner: string;
  position: number;
  status: 'active' | 'inactive';
  metaTitle: string;
  metaDescription: string;
}

interface SubcategoryFormPageProps {
  subcategoryId?: string;
}

export function SubcategoryFormPage({ subcategoryId }: SubcategoryFormPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<SubcategoryFormData>({
    name: '',
    slug: '',
    categoryId: null,
    description: '',
    shortDescription: '',
    image: '',
    icon: '',
    banner: '',
    position: 0,
    status: 'active',
    metaTitle: '',
    metaDescription: '',
  });

  const [categories, setCategories] = useState<any[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  useEffect(() => {
    // Hide scroll
    document.body.style.overflowY = 'hidden';

    // Cleanup when leaving page
    return () => {
      document.body.style.overflowY = 'auto';
    };
  }, []);

  useEffect(() => {
    fetchCategories();
    if (subcategoryId) {
      fetchSubcategory();
    }
  }, [subcategoryId]);

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await fetch('/api/admin/categories');
      if (response.ok) {
        const data = await response.json();
        const cats = Array.isArray(data) ? data : Array.isArray(data.categories) ? data.categories : [];
        setCategories(cats);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setLoadingCategories(false);
    }
  };

  const clearFieldError = (field: string) => {
    setErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const updateField = (field: keyof SubcategoryFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    clearFieldError(field as string);
  };

  const uploadAsset = async (file: File) => {
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
        description: 'Image uploaded successfully',
        variant: 'success'
      });
      return data.url as string;
    } catch (error) {
      console.error('Image upload error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to upload image',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const fetchSubcategory = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/subcategories/${subcategoryId}`);
      if (response.ok) {
        const data = await response.json();
        setFormData(prev => ({
          ...prev,
          ...data,
          categoryId: data.categoryId || null,
        }));
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to load subcategory details',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to fetch subcategory:', error);
      toast({
        title: 'Error',
        description: 'Failed to load subcategory details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const processedValue = name === 'position' ? (value === '' ? 0 : parseInt(value) || 0) : value;
    updateField(name as keyof SubcategoryFormData, processedValue);

    if (name === 'name' && !subcategoryId) {
      const slug = value.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/^-+|-+$/g, '');
      updateField('slug', slug);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Subcategory name is required';
    if (!formData.categoryId) newErrors.categoryId = 'Please select a category';
    setErrors(newErrors);
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

    setLoading(true);
    try {
      const url = subcategoryId ? `/api/admin/subcategories/${subcategoryId}` : '/api/admin/subcategories';
      const method = subcategoryId ? 'PUT' : 'POST';

      const { _id, createdAt, updatedAt, ...submitData } = formData as any;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Subcategory ${subcategoryId ? 'updated' : 'created'} successfully`,
          variant: 'success'
        });
        router.push('/admin/subcategories');
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.details || error.error || 'Failed to save subcategory',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Submit error:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while saving the subcategory',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading && subcategoryId) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <p className='text-muted-foreground'>Loading subcategory...</p>
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
              onClick={() => router.push('/admin/subcategories')}
              className='inline-flex items-center justify-center cursor-pointer bg-white p-2 text-slate-700 hover:bg-slate-50 rounded-lg border border-slate-200'>
              <ArrowLeft className='h-5 w-5' />
            </button>
            <div>
              <h1 className='text-2xl md:text-3xl font-bold text-slate-900'>{subcategoryId ? 'Edit Subcategory' : 'Add New Subcategory'}</h1>
              <p className='text-sm text-slate-500'>Manage subcategory information and settings from a single workspace.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className='space-y-6'>
          <section className='space-y-6'>
            <Card className='bg-white border border-slate-200'>
              <div className='space-y-6 px-6 py-6'>
                <div className='space-y-4'>
                  <h3 className='text-xl font-semibold text-slate-900'>Basic Information</h3>
                  <p className='text-sm text-slate-500'>Provide the subcategory details.</p>

                  <FormField
                    label='Subcategory Name'
                    required
                    id='name'
                    name='name'
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder='Enter Subcategory Name'
                    disabled={loading}
                    error={errors.name}
                  />

                  <FormField
                    label='Slug'
                    required
                    id='slug'
                    name='slug'
                    value={formData.slug}
                    onChange={handleInputChange}
                    placeholder='Enter URL Slug'
                    disabled={loading}
                    error={errors.slug}
                  />

                  <div className='space-y-2'>
                    <label className='text-sm font-medium text-gray-700'>
                      Category <span className='text-black'>*</span>
                    </label>
                    <Select
                      value={formData.categoryId || 'none'}
                      onValueChange={val => updateField('categoryId', val === 'none' ? null : val)}
                      disabled={loadingCategories || loading}>
                      <SelectTrigger className='h-[48px]'>
                        <SelectValue placeholder='Select Category' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='none'>Select Category</SelectItem>
                        {categories.map(cat => (
                          <SelectItem key={cat._id} value={cat._id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.categoryId && <p className='text-red-500 text-xs mt-1'>{errors.categoryId}</p>}
                  </div>

                  <FormField
                    label='Description'
                    textarea
                    id='description'
                    name='description'
                    value={formData.description}
                    onChange={e => updateField('description', e.target.value)}
                    placeholder='Enter Subcategory Description'
                    disabled={loading}
                    rows={4}
                  />
                </div>

                <div className='space-y-4'>
                  <h3 className='text-xl font-semibold text-slate-900'>Media</h3>
                  <p className='text-sm text-slate-500'>Upload images for the subcategory.</p>

                  <div className='space-y-2'>
                    <label className='text-sm font-medium text-gray-700'>Image</label>
                    <MainImageUpload
                      value={formData.image}
                      onChange={val => updateField('image', val)}
                      uploadHandler={uploadAsset}
                      hideLabel
                    />
                  </div>

                  <div className='space-y-2'>
                    <label className='text-sm font-medium text-gray-700'>Banner</label>
                    <MainImageUpload
                      value={formData.banner}
                      onChange={val => updateField('banner', val)}
                      uploadHandler={uploadAsset}
                      hideLabel
                    />
                  </div>
                </div>

                <div className='space-y-4'>
                  <h3 className='text-xl font-semibold text-slate-900'>Settings</h3>
                  <p className='text-sm text-slate-500'>Configure subcategory display and ordering.</p>

                  <FormField
                    label='Position'
                    id='position'
                    name='position'
                    type='number'
                    value={formData.position.toString()}
                    onChange={handleInputChange}
                    placeholder='Enter Position'
                    disabled={loading}
                    min='0'
                  />

                  <div className='flex items-center justify-between p-4 border rounded-lg'>
                    <div>
                      <p className='text-sm font-medium'>Subcategory Status</p>
                      <p className='text-xs text-muted-foreground'>Inactive subcategories won't be displayed</p>
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
                onClick={() => router.push('/admin/subcategories')}
                disabled={loading}>
                Cancel
              </Button>
              <Button type='submit' disabled={loading}>
                {loading ? 'Saving...' : subcategoryId ? 'Update Subcategory' : 'Create Subcategory'}
              </Button>
            </div>
          </section>
        </form>
      </div>
    </div>
  );
}

