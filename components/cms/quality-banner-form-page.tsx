'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Feature {
  id: number;
  icon: string; // 'Gem' | 'Award' | 'Heart'
  title: string;
  description: string;
}

interface QualityBannerFormData {
  title: string;
  features: Feature[];
  order: number;
  status: 'active' | 'inactive';
}

interface QualityBannerFormPageProps {
  bannerId?: string;
}

const iconOptions = [
  { value: 'Gem', label: 'Gem' },
  { value: 'Award', label: 'Award' },
  { value: 'Heart', label: 'Heart' },
];

export function QualityBannerFormPage({ bannerId }: QualityBannerFormPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<QualityBannerFormData>({
    title: '',
    features: [],
    order: 0,
    status: 'active',
  });

  useEffect(() => {
    if (bannerId) {
      fetchBanner();
    }
  }, [bannerId]);

  const fetchBanner = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/cms/quality-banners/${bannerId}`);
      if (response.ok) {
        const data = await response.json();
        setFormData({
          title: data.title || '',
          features: data.features || [],
          order: data.order || 0,
          status: data.status || 'active',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load quality banner',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('[v0] Failed to fetch quality banner:', error);
      toast({
        title: 'Error',
        description: 'Failed to load quality banner',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof QualityBannerFormData, value: any) => {
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

  const addFeature = () => {
    const newFeature: Feature = {
      id: Date.now(),
      icon: 'Gem',
      title: '',
      description: '',
    };
    updateField('features', [...formData.features, newFeature]);
  };

  const removeFeature = (id: number) => {
    updateField('features', formData.features.filter(f => f.id !== id));
  };

  const updateFeature = (id: number, field: keyof Feature, value: string) => {
    updateField(
      'features',
      formData.features.map(f => (f.id === id ? { ...f, [field]: value } : f))
    );
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (formData.features.length === 0) {
      newErrors.features = 'At least one feature is required';
    }
    formData.features.forEach((feature, index) => {
      if (!feature.title.trim()) {
        newErrors[`feature_${index}_title`] = 'Feature title is required';
      }
      if (!feature.description.trim()) {
        newErrors[`feature_${index}_description`] = 'Feature description is required';
      }
    });
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
      const url = bannerId ? `/api/admin/cms/quality-banners/${bannerId}` : '/api/admin/cms/quality-banners';
      const method = bannerId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Quality banner ${bannerId ? 'updated' : 'created'} successfully`,
          variant: 'success',
        });
        router.push('/admin/cms/quality-banners');
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || `Failed to ${bannerId ? 'update' : 'create'} quality banner`,
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
          <h1 className='text-3xl font-bold'>{bannerId ? 'Edit Quality Banner' : 'Add New Quality Banner'}</h1>
        </div>
      </div>

      <Card className='p-6 shadow-md'>
        <form onSubmit={handleSubmit} className='space-y-6'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <div className='space-y-2'>
              <Label htmlFor='title'>
                Title <span className='text-red-500'>*</span>
              </Label>
              <Input
                id='title'
                value={formData.title}
                onChange={e => updateField('title', e.target.value)}
                placeholder='Premium Quality, Durability & Style'
                className={errors.title ? 'border-red-500' : ''}
              />
              {errors.title && <p className='text-sm text-red-500'>{errors.title}</p>}
            </div>

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

          <div className='space-y-4'>
            <div className='flex items-center justify-between'>
              <Label>
                Features <span className='text-red-500'>*</span>
              </Label>
              <Button type='button' onClick={addFeature} variant='outline' size='sm' className='gap-2'>
                <Plus className='h-4 w-4' />
                Add Feature
              </Button>
            </div>
            {errors.features && <p className='text-sm text-red-500'>{errors.features}</p>}

            <div className='space-y-4'>
              {formData.features.map((feature, index) => (
                <Card key={feature.id} className='p-4 border border-gray-200'>
                  <div className='flex items-start justify-between mb-4'>
                    <h4 className='font-semibold'>Feature {index + 1}</h4>
                    <Button
                      type='button'
                      onClick={() => removeFeature(feature.id)}
                      variant='ghost'
                      size='sm'
                      className='text-red-500 hover:text-red-700'>
                      <X className='h-4 w-4' />
                    </Button>
                  </div>

                  <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                    <div className='space-y-2'>
                      <Label>Icon</Label>
                      <Select value={feature.icon} onValueChange={value => updateFeature(feature.id, 'icon', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {iconOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className='space-y-2'>
                      <Label>
                        Title <span className='text-red-500'>*</span>
                      </Label>
                      <Input
                        value={feature.title}
                        onChange={e => updateFeature(feature.id, 'title', e.target.value)}
                        placeholder='Premium Materials'
                        className={errors[`feature_${index}_title`] ? 'border-red-500' : ''}
                      />
                      {errors[`feature_${index}_title`] && (
                        <p className='text-sm text-red-500'>{errors[`feature_${index}_title`]}</p>
                      )}
                    </div>

                    <div className='space-y-2'>
                      <Label>
                        Description <span className='text-red-500'>*</span>
                      </Label>
                      <Textarea
                        value={feature.description}
                        onChange={e => updateFeature(feature.id, 'description', e.target.value)}
                        placeholder='82% of our products feature organic or recycled materials...'
                        rows={2}
                        className={errors[`feature_${index}_description`] ? 'border-red-500' : ''}
                      />
                      {errors[`feature_${index}_description`] && (
                        <p className='text-sm text-red-500'>{errors[`feature_${index}_description`]}</p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
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
              {loading ? 'Saving...' : bannerId ? 'Update Quality Banner' : 'Create Quality Banner'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

