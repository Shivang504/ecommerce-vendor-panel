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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface HeroBannerFormData {
  tag: string;
  title: string;
  subtitle: string;
  buttonText: string;
  buttonLink: string;
  image: string;
  textColor: string;
  gradient: string;
  type: 'big' | 'medium' | 'small';
  order: number;
  status: 'active' | 'inactive';
}

interface HeroBannerFormPageProps {
  bannerId?: string;
}

export function HeroBannerFormPage({ bannerId }: HeroBannerFormPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<HeroBannerFormData>({
    tag: '',
    title: '',
    subtitle: '',
    buttonText: '',
    buttonLink: '/products',
    image: '',
    textColor: 'text-white',
    gradient: '',
    type: 'big',
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
      const response = await fetch(`/api/admin/cms/hero-banners/${bannerId}`);
      if (response.ok) {
        const data = await response.json();
        setFormData({
          tag: data.tag || '',
          title: data.title || '',
          subtitle: data.subtitle || '',
          buttonText: data.buttonText || '',
          buttonLink: data.buttonLink || '/products',
          image: data.image || '',
          textColor: data.textColor || 'text-white',
          gradient: data.gradient || '',
          type: data.type || 'big',
          order: data.order || 0,
          status: data.status || 'active',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load hero banner',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('[v0] Failed to fetch hero banner:', error);
      toast({
        title: 'Error',
        description: 'Failed to load hero banner',
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

  const updateField = (field: keyof HeroBannerFormData, value: any) => {
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
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!formData.image.trim()) {
      newErrors.image = 'Image is required';
    }
    if (!formData.tag.trim()) {
      newErrors.tag = 'Tag is required';
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
      const url = bannerId ? `/api/admin/cms/hero-banners/${bannerId}` : '/api/admin/cms/hero-banners';
      const method = bannerId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Hero banner ${bannerId ? 'updated' : 'created'} successfully`,
          variant: 'success',
        });
        router.push('/admin/cms/hero-banners');
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || `Failed to ${bannerId ? 'update' : 'create'} hero banner`,
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
          <h1 className='text-3xl font-bold'>{bannerId ? 'Edit Hero Banner' : 'Add New Hero Banner'}</h1>
        </div>
      </div>

      <Card className='p-6 shadow-md'>
        <form onSubmit={handleSubmit} className='space-y-6'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <div className='space-y-2'>
              <Label htmlFor='type'>
                Type <span className='text-red-500'>*</span>
              </Label>
              <Select value={formData.type} onValueChange={(value: 'big' | 'medium' | 'small') => updateField('type', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='big'>Big</SelectItem>
                  <SelectItem value='medium'>Medium</SelectItem>
                  <SelectItem value='small'>Small</SelectItem>
                </SelectContent>
              </Select>
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

          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <div className='space-y-2'>
              <Label htmlFor='tag'>
                Tag <span className='text-red-500'>*</span>
              </Label>
              <Input
                id='tag'
                value={formData.tag}
                onChange={e => updateField('tag', e.target.value)}
                placeholder='Holiday Collection'
                className={errors.tag ? 'border-red-500' : ''}
              />
              {errors.tag && <p className='text-sm text-red-500'>{errors.tag}</p>}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='title'>
                Title <span className='text-red-500'>*</span>
              </Label>
              <Input
                id='title'
                value={formData.title}
                onChange={e => updateField('title', e.target.value)}
                placeholder='Relic Relaxed'
                className={errors.title ? 'border-red-500' : ''}
              />
              {errors.title && <p className='text-sm text-red-500'>{errors.title}</p>}
            </div>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='subtitle'>Subtitle (for small cards)</Label>
            <Input
              id='subtitle'
              value={formData.subtitle}
              onChange={e => updateField('subtitle', e.target.value)}
              placeholder='Starting at $100'
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='image'>
              Banner Image <span className='text-red-500'>*</span>
            </Label>
            <MainImageUpload
              value={formData.image}
              onChange={val => updateField('image', val)}
              uploadHandler={uploadImage}
              hideLabel
              recommendedText='Recommended: 1920×600px, JPG/PNG'
            />
            {errors.image && <p className='text-sm text-red-500'>{errors.image}</p>}
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <div className='space-y-2'>
              <Label htmlFor='buttonText'>Button Text</Label>
              <Input
                id='buttonText'
                value={formData.buttonText}
                onChange={e => updateField('buttonText', e.target.value)}
                placeholder='Shop Now'
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='buttonLink'>Button Link</Label>
              <Input
                id='buttonLink'
                value={formData.buttonLink}
                onChange={e => updateField('buttonLink', e.target.value)}
                placeholder='/products'
              />
            </div>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <div className='space-y-2'>
              <Label htmlFor='textColor'>Text Color</Label>
              <Select value={formData.textColor} onValueChange={value => updateField('textColor', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='text-white'>White</SelectItem>
                  <SelectItem value='text-black'>Black</SelectItem>
                  <SelectItem value='text-gray-900'>Dark Gray</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='gradient'>Gradient Overlay (optional)</Label>
              <Input
                id='gradient'
                value={formData.gradient}
                onChange={e => updateField('gradient', e.target.value)}
                placeholder='from-black/60 via-black/20 to-transparent'
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
              {loading ? 'Saving...' : bannerId ? 'Update Hero Banner' : 'Create Hero Banner'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

