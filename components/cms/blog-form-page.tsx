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
import { MainImageUpload } from '@/components/media/main-image-upload';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RichTextEditor } from '@/components/ui/rich-text-editor';

interface BlogFormData {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  featuredImage: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  author: string;
  status: 'draft' | 'published';
}

interface BlogFormPageProps {
  blogId?: string;
}

export function BlogFormPage({ blogId }: BlogFormPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<BlogFormData>({
    title: '',
    slug: '',
    content: '',
    excerpt: '',
    featuredImage: '',
    metaTitle: '',
    metaDescription: '',
    metaKeywords: '',
    author: '',
    status: 'draft',
  });

  useEffect(() => {
    if (blogId) {
      fetchBlog();
    }
  }, [blogId]);

  const fetchBlog = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/cms/blog/${blogId}`);
      if (response.ok) {
        const data = await response.json();
        setFormData({
          title: data.title || '',
          slug: data.slug || '',
          content: data.content || '',
          excerpt: data.excerpt || '',
          featuredImage: data.featuredImage || '',
          metaTitle: data.metaTitle || '',
          metaDescription: data.metaDescription || '',
          metaKeywords: data.metaKeywords || '',
          author: data.author || '',
          status: data.status || 'draft',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load blog post',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('[v0] Failed to fetch blog:', error);
      toast({
        title: 'Error',
        description: 'Failed to load blog post',
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

  const updateField = (field: keyof BlogFormData, value: any) => {
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
    if (!blogId || !formData.slug) {
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
      const url = blogId ? `/api/admin/cms/blog/${blogId}` : '/api/admin/cms/blog';
      const method = blogId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Blog post ${blogId ? 'updated' : 'created'} successfully`,
          variant: 'success',
        });
        router.push('/admin/cms/blog');
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || `Failed to ${blogId ? 'update' : 'create'} blog post`,
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
          <h1 className='text-3xl font-bold'>{blogId ? 'Edit Blog Post' : 'Add New Blog Post'}</h1>
        </div>
      </div>

      <Card className='p-6 shadow-md'>
        <form onSubmit={handleSubmit} className='space-y-6'>
          <Tabs defaultValue='content' className='w-full'>
            <TabsList>
              <TabsTrigger value='content'>Content</TabsTrigger>
              <TabsTrigger value='seo'>SEO</TabsTrigger>
            </TabsList>

            <TabsContent value='content' className='space-y-6'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                <div className='space-y-2'>
                  <Label htmlFor='title'>
                    Title <span className='text-red-500'>*</span>
                  </Label>
                  <Input
                    id='title'
                    value={formData.title}
                    onChange={e => handleTitleChange(e.target.value)}
                    placeholder='Enter blog post title'
                    className={errors.title ? 'border-red-500' : ''}
                  />
                  {errors.title && <p className='text-sm text-red-500'>{errors.title}</p>}
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='slug'>
                    Slug <span className='text-red-500'>*</span>
                  </Label>
                  <Input
                    id='slug'
                    value={formData.slug}
                    onChange={e => updateField('slug', e.target.value)}
                    placeholder='blog-post-slug'
                    className={errors.slug ? 'border-red-500' : ''}
                  />
                  {errors.slug && <p className='text-sm text-red-500'>{errors.slug}</p>}
                </div>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='excerpt'>Excerpt</Label>
                <Textarea
                  id='excerpt'
                  value={formData.excerpt}
                  onChange={e => updateField('excerpt', e.target.value)}
                  placeholder='Short description of the blog post'
                  rows={3}
                />
              </div>

              <RichTextEditor
                label='Content'
                required
                value={formData.content}
                onChange={val => updateField('content', val)}
                placeholder='Enter blog post content...'
                error={errors.content}
                helperText='Use the toolbar to format your content with bold, italic, lists, and more'
              />

              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                <div className='space-y-2'>
                  <Label htmlFor='author'>Author</Label>
                  <Input
                    id='author'
                    value={formData.author}
                    onChange={e => updateField('author', e.target.value)}
                    placeholder='Author name'
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='status'>Status</Label>
                  <Select value={formData.status} onValueChange={val => updateField('status', val)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='draft'>Draft</SelectItem>
                      <SelectItem value='published'>Published</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='featuredImage'>Featured Image</Label>
                <MainImageUpload
                  value={formData.featuredImage}
                  onChange={val => updateField('featuredImage', val)}
                  uploadHandler={uploadImage}
                  hideLabel
                  recommendedText='Recommended: 1200×630px, JPG/PNG'
                />
              </div>
            </TabsContent>

            <TabsContent value='seo' className='space-y-6'>
              <div className='space-y-2'>
                <Label htmlFor='metaTitle'>Meta Title</Label>
                <Input
                  id='metaTitle'
                  value={formData.metaTitle}
                  onChange={e => updateField('metaTitle', e.target.value)}
                  placeholder='SEO title'
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='metaDescription'>Meta Description</Label>
                <Textarea
                  id='metaDescription'
                  value={formData.metaDescription}
                  onChange={e => updateField('metaDescription', e.target.value)}
                  placeholder='SEO description'
                  rows={3}
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='metaKeywords'>Meta Keywords</Label>
                <Input
                  id='metaKeywords'
                  value={formData.metaKeywords}
                  onChange={e => updateField('metaKeywords', e.target.value)}
                  placeholder='keyword1, keyword2, keyword3'
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className='flex justify-end gap-4'>
            <Button type='button' variant='outline' onClick={() => router.back()} disabled={loading}>
              Cancel
            </Button>
            <Button type='submit' disabled={loading} className='bg-[#22c55e]'>
              {loading ? 'Saving...' : blogId ? 'Update Blog Post' : 'Create Blog Post'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

