'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TagFormData {
  name: string;
  description: string;
  status: 'active' | 'inactive';
}

interface TagFormPageProps {
  tagId?: string;
}

export function TagFormPage({ tagId }: TagFormPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<TagFormData>({
    name: '',
    description: '',
    status: 'active',
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
    if (tagId) {
      fetchTag();
    }
  }, [tagId]);

  const fetchTag = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/tags/${tagId}`);
      if (response.ok) {
        const data = await response.json();
        setFormData({
          name: data.name || '',
          description: data.description || '',
          status: data.status || 'active',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load tag',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('[v0] Failed to fetch tag:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tag',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof TagFormData, value: any) => {
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
      const url = tagId ? `/api/admin/tags/${tagId}` : '/api/admin/tags';
      const method = tagId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Tag ${tagId ? 'updated' : 'created'} successfully`,
          variant : 'success'
        });
        router.push('/admin/tags');
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to save tag',
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
        description: 'An error occurred while saving the tag',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading && tagId) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <p className='text-muted-foreground'>Loading tag...</p>
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
              onClick={() => router.push('/admin/tags')}
              className='inline-flex items-center justify-center cursor-pointer bg-white p-2 text-slate-700 hover:bg-slate-50 rounded-lg border border-slate-200'>
              <ArrowLeft className='h-5 w-5' />
            </button>
            <div>
              <h1 className='text-2xl md:text-3xl font-bold text-slate-900'>{tagId ? 'Edit Tag' : 'Add Tag'}</h1>
              <p className='text-sm text-slate-500'>Manage tag information and settings.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className='space-y-6'>
          <section className='space-y-6'>
            <Card className='bg-white border border-slate-200'>
              <div className='space-y-6 px-6 py-6'>
                <div className='space-y-4'>
                  <h3 className='text-xl font-semibold text-slate-900'>Basic Information</h3>
                  <p className='text-sm text-slate-500'>Provide the tag's profile details.</p>

                  <div className='space-y-2'>
                    <label htmlFor='name' className='text-sm font-medium text-slate-900'>
                      Name <span className='text-red-500'>*</span>
                    </label>
                    <Input
                      id='name'
                      value={formData.name}
                      onChange={e => updateField('name', e.target.value)}
                      placeholder='Enter Tag Name'
                      className='h-[48px]'
                    />
                    {errors.name && <p className='text-sm text-red-500'>{errors.name}</p>}
                  </div>

                  <div className='space-y-2'>
                    <label htmlFor='description' className='text-sm font-medium text-slate-900'>
                      Description
                    </label>
                    <textarea
                      id='description'
                      value={formData.description}
                      onChange={e => updateField('description', e.target.value)}
                      placeholder='Enter Description'
                      className='w-full border rounded-md p-3 text-sm bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition min-h-[100px] resize-y'
                      rows={4}
                    />
                  </div>
                </div>

                <div className='space-y-4'>
                  <h3 className='text-xl font-semibold text-slate-900'>Status</h3>
                  <p className='text-sm text-slate-500'>Control tag availability.</p>

                  <div className='flex items-center justify-between p-4 border rounded-lg'>
                    <div>
                      <p className='text-sm font-medium'>Tag Status</p>
                      <p className='text-xs text-muted-foreground'>Inactive tags won't be visible</p>
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
                onClick={() => router.push('/admin/tags')}
                disabled={loading}>
                Cancel
              </Button>
              <Button type='submit' disabled={loading}>
                {loading ? 'Saving...' : tagId ? 'Update Tag' : 'Create Tag'}
              </Button>
            </div>
          </section>
        </form>
      </div>
    </div>
  );
}