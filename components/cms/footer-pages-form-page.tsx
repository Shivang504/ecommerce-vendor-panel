'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FooterPageFormData {
  title: string;
  slug: string;
  section: 'about' | 'help' | 'consumer-policy';
  content: string;
  status: 'draft' | 'published';
}

interface FooterPageFormPageProps {
  pageId?: string;
}

export function FooterPageFormPage({ pageId }: FooterPageFormPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<FooterPageFormData>({
    title: '',
    slug: '',
    section: 'about',
    content: '',
    status: 'draft',
  });

  useEffect(() => {
    if (pageId) {
      fetchPage();
    }
  }, [pageId]);

  const fetchPage = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/cms/footer-pages/${pageId}`);
      if (response.ok) {
        const data = await response.json();
        setFormData({
          title: data.title || '',
          slug: data.slug || '',
          section: data.section || 'about',
          content: data.content || '',
          status: data.status || 'draft',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load footer page',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('[v0] Failed to fetch footer page:', error);
      toast({
        title: 'Error',
        description: 'Failed to load footer page',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof FooterPageFormData, value: any) => {
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

  const handleTitleChange = (value: string) => {
    updateField('title', value);
    // Auto-generate slug if creating new page or slug is empty
    if (!pageId || !formData.slug) {
      const slug = value
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '');
      updateField('slug', slug);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!formData.slug.trim()) {
      newErrors.slug = 'Slug is required';
    }
    if (!formData.section) {
      newErrors.section = 'Section is required';
    }
    if (!formData.content.trim()) {
      newErrors.content = 'Content is required';
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
      const url = pageId ? `/api/admin/cms/footer-pages/${pageId}` : '/api/admin/cms/footer-pages';
      const method = pageId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Footer page ${pageId ? 'updated' : 'created'} successfully`,
          variant: 'success',
        });
        router.push('/admin/cms/footer-pages');
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || `Failed to ${pageId ? 'update' : 'create'} footer page`,
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

  if (loading && pageId) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4'></div>
          <p className='text-gray-600'>Loading footer page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-4'>
          <Button variant='outline' onClick={() => router.back()} className='gap-2'>
            <ArrowLeft className='h-4 w-4' />
            Back
          </Button>
          <h1 className='text-3xl font-bold'>{pageId ? 'Edit Footer Page' : 'Add New Footer Page'}</h1>
        </div>
      </div>

      <Card className='p-6 shadow-md'>
        <form onSubmit={handleSubmit} className='space-y-6'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <div className='space-y-2'>
              <Label htmlFor='title'>
                Page Title <span className='text-red-500'>*</span>
              </Label>
              <Input
                id='title'
                value={formData.title}
                onChange={e => handleTitleChange(e.target.value)}
                placeholder='e.g., About Us, Help, Consumer Policy'
                className={errors.title ? 'border-red-500' : ''}
              />
              {errors.title && <p className='text-sm text-red-500'>{errors.title}</p>}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='slug'>
                Slug <span className='text-red-500'>*</span>
                <span className='text-gray-500 text-xs ml-2'>(auto-generated, editable)</span>
              </Label>
              <Input
                id='slug'
                value={formData.slug}
                onChange={e => updateField('slug', e.target.value)}
                placeholder='e.g., about-us, help, consumer-policy'
                className={errors.slug ? 'border-red-500' : ''}
              />
              {errors.slug && <p className='text-sm text-red-500'>{errors.slug}</p>}
            </div>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <div className='space-y-2'>
              <Label htmlFor='section'>
                Section <span className='text-red-500'>*</span>
              </Label>
              <Select
                value={formData.section}
                onValueChange={(value: 'about' | 'help' | 'consumer-policy') => updateField('section', value)}>
                <SelectTrigger className={errors.section ? 'border-red-500' : ''}>
                  <SelectValue placeholder='Select section' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='about'>About</SelectItem>
                  <SelectItem value='help'>Help</SelectItem>
                  <SelectItem value='consumer-policy'>Consumer Policy</SelectItem>
                </SelectContent>
              </Select>
              {errors.section && <p className='text-sm text-red-500'>{errors.section}</p>}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='status'>
                Status <span className='text-red-500'>*</span>
              </Label>
              <Select
                value={formData.status}
                onValueChange={(value: 'draft' | 'published') => updateField('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder='Select status' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='draft'>Draft</SelectItem>
                  <SelectItem value='published'>Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='content'>
              Content (Markdown) <span className='text-red-500'>*</span>
              <span className='text-gray-500 text-xs ml-2'>
                Supports Markdown syntax. Use # for headings, ** for bold, * for italic, etc.
              </span>
            </Label>
            <Textarea
              id='content'
              value={formData.content}
              onChange={e => updateField('content', e.target.value)}
              placeholder='Write your page content in Markdown format...'
              className={`min-h-[400px] font-mono text-sm ${errors.content ? 'border-red-500' : ''}`}
              rows={20}
            />
            {errors.content && <p className='text-sm text-red-500'>{errors.content}</p>}
            <p className='text-xs text-gray-500 mt-1'>
              Markdown tips: Use # for H1, ## for H2, **bold**, *italic*, - for lists, [link](url) for links
            </p>
          </div>

          <div className='flex justify-end gap-4 pt-4 border-t'>
            <Button
              type='button'
              variant='outline'
              onClick={() => router.back()}
              disabled={loading}>
              Cancel
            </Button>
            <Button type='submit' disabled={loading} className='bg-[#22c55e] hover:bg-[#16a34a]'>
              {loading ? (
                <>
                  <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2'></div>
                  {pageId ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                pageId ? 'Update Page' : 'Create Page'
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

