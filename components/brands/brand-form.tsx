'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Plus, X } from 'lucide-react';

interface BrandFormProps {
  brand?: {
    id: string;
    name: string;
    image: string;
    bannerImage: string;
    metaTitle: string;
    metaDescription: string;
    metaImage: string;
    status: 'active' | 'inactive';
  } | null;
  onClose: () => void;
  onSave: (brand: any) => void;
}

export default function BrandForm({ brand, onClose, onSave }: BrandFormProps) {
  const [formData, setFormData] = useState({
    name: brand?.name || '',
    image: brand?.image || '',
    bannerImage: brand?.bannerImage || '',
    metaTitle: brand?.metaTitle || '',
    metaDescription: brand?.metaDescription || '',
    metaImage: brand?.metaImage || '',
    status: brand?.status || 'active',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = brand ? `/api/admin/brands/${brand.id}` : '/api/admin/brands';

      const method = brand ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        onSave(data.brand);
      }
    } catch (error) {
      console.error('Failed to save brand:', error);
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

  return (
    <Card className='p-6 shadow-md'>
      <h3 className='text-xl font-semibold mb-6'>{brand ? 'Edit Brand' : 'Add New Brand'}</h3>

      <form onSubmit={handleSubmit} className='space-y-4'>
        <div className='grid grid-cols-[200px_1fr] items-center gap-4'>
          <Label htmlFor='name' className='text-right font-medium'>
            Name
          </Label>
          <Input
            id='name'
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            required
            placeholder='Enter brand name'
          />
        </div>

        <div className='grid grid-cols-[200px_1fr] items-center gap-4'>
          <Label htmlFor='image' className='text-right font-medium'>
            Image
          </Label>
          <div>
            {!formData.image ? (
              <div className='border-2 border-dashed border-slate-300 rounded-lg p-4'>
                <Input
                  type='file'
                  accept='image/*'
                  onChange={e => {
                    if (e.target.files?.[0]) {
                      const reader = new FileReader();
                      reader.onload = event => {
                        setFormData({ ...formData, image: event.target?.result as string });
                      };
                      reader.readAsDataURL(e.target.files[0]);
                    }
                  }}
                  className='hidden'
                  id='image'
                />
                <label htmlFor='image' className='cursor-pointer flex flex-col items-center gap-2'>
                  <div className='w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center'>
                    <Plus className='w-6 h-6 text-gray-400' />
                  </div>
                  <p className='text-sm text-gray-600'>Upload Image</p>
                  <p className='text-xs text-gray-500'>PNG, JPG up to 5MB</p>
                </label>
              </div>
            ) : (
              <div className='relative inline-block'>
                <img src={formData.image} alt='Brand' className='h-32 w-32 object-cover rounded-lg border' />
                <button
                  type='button'
                  onClick={() => setFormData({ ...formData, image: '' })}
                  className='absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600'>
                  <X className='w-4 h-4' />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className='grid grid-cols-[200px_1fr] items-center gap-4'>
          <Label htmlFor='bannerImage' className='text-right font-medium'>
            Banner Image
          </Label>
          <div>
            {!formData.bannerImage ? (
              <div className='border-2 border-dashed border-slate-300 rounded-lg p-4'>
                <Input
                  type='file'
                  accept='image/*'
                  onChange={e => {
                    if (e.target.files?.[0]) {
                      const reader = new FileReader();
                      reader.onload = event => {
                        setFormData({ ...formData, bannerImage: event.target?.result as string });
                      };
                      reader.readAsDataURL(e.target.files[0]);
                    }
                  }}
                  className='hidden'
                  id='bannerImage'
                />
                <label htmlFor='bannerImage' className='cursor-pointer flex flex-col items-center gap-2'>
                  <div className='w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center'>
                    <Plus className='w-6 h-6 text-gray-400' />
                  </div>
                  <p className='text-sm text-gray-600'>Upload Banner</p>
                  <p className='text-xs text-gray-500'>PNG, JPG up to 5MB</p>
                </label>
              </div>
            ) : (
              <div className='relative inline-block'>
                <img src={formData.bannerImage} alt='Banner' className='h-32 w-auto object-cover rounded-lg border' />
                <button
                  type='button'
                  onClick={() => setFormData({ ...formData, bannerImage: '' })}
                  className='absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600'>
                  <X className='w-4 h-4' />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className='grid grid-cols-[200px_1fr] items-center gap-4'>
          <Label htmlFor='metaTitle' className='text-right font-medium'>
            Meta Title
          </Label>
          <Input
            id='metaTitle'
            value={formData.metaTitle}
            onChange={e => setFormData({ ...formData, metaTitle: e.target.value })}
            placeholder='SEO title for search engines'
          />
        </div>

        <div className='grid grid-cols-[200px_1fr] items-center gap-4'>
          <Label htmlFor='metaDescription' className='text-right font-medium'>
            Meta Description
          </Label>
          <Textarea
            id='metaDescription'
            value={formData.metaDescription}
            onChange={e => setFormData({ ...formData, metaDescription: e.target.value })}
            rows={3}
            placeholder='SEO description for search engines'
          />
        </div>

        <div className='grid grid-cols-[200px_1fr] items-center gap-4'>
          <Label htmlFor='metaImage' className='text-right font-medium'>
            Meta Image
          </Label>
          <div>
            {!formData.metaImage ? (
              <div className='border-2 border-dashed border-slate-300 rounded-lg p-4'>
                <Input
                  type='file'
                  accept='image/*'
                  onChange={e => {
                    if (e.target.files?.[0]) {
                      const reader = new FileReader();
                      reader.onload = event => {
                        setFormData({ ...formData, metaImage: event.target?.result as string });
                      };
                      reader.readAsDataURL(e.target.files[0]);
                    }
                  }}
                  className='hidden'
                  id='metaImage'
                />
                <label htmlFor='metaImage' className='cursor-pointer flex flex-col items-center gap-2'>
                  <div className='w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center'>
                    <Plus className='w-6 h-6 text-gray-400' />
                  </div>
                  <p className='text-sm text-gray-600'>Upload Meta Image</p>
                  <p className='text-xs text-gray-500'>PNG, JPG up to 5MB</p>
                </label>
              </div>
            ) : (
              <div className='relative inline-block'>
                <img src={formData.metaImage} alt='Meta' className='h-32 w-32 object-cover rounded-lg border' />
                <button
                  type='button'
                  onClick={() => setFormData({ ...formData, metaImage: '' })}
                  className='absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600'>
                  <X className='w-4 h-4' />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className='grid grid-cols-[200px_1fr] items-center gap-4'>
          <Label htmlFor='status' className='text-right font-medium'>
            Status
          </Label>
          <Select value={formData.status} onValueChange={value => setFormData({ ...formData, status: value as 'active' | 'inactive' })}>
            <SelectTrigger id='status'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='active'>Active</SelectItem>
              <SelectItem value='inactive'>Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className='flex justify-end gap-2 pt-4 border-t'>
          <Button type='button' variant='outline' onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type='submit' className='!bg-primary' disabled={loading}>
            {loading ? 'Saving...' : 'Save Brand'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
