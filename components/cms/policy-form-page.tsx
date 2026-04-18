'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RichTextEditor } from '@/components/ui/rich-text-editor';

interface PolicyFormData {
  type: string;
  title: string;
  content: string;
  metaTitle: string;
  metaDescription: string;
  status: 'active' | 'inactive';
}

interface PolicyFormPageProps {
  policyType: 'privacy' | 'terms' | 'refund' | 'cancellation' | 'shipping';
}

const policyConfig = {
  privacy: {
    title: 'Privacy Policy',
    apiPath: '/api/admin/cms/policies/privacy',
    route: '/admin/cms/privacy-policy',
  },
  terms: {
    title: 'Terms & Conditions',
    apiPath: '/api/admin/cms/policies/terms',
    route: '/admin/cms/terms-conditions',
  },
  refund: {
    title: 'Refund and Return Policy',
    apiPath: '/api/admin/cms/policies/refund',
    route: '/admin/cms/refund-return',
  },
  cancellation: {
    title: 'Cancellation Policy',
    apiPath: '/api/admin/cms/policies/cancellation',
    route: '/admin/cms/cancellation',
  },
  shipping: {
    title: 'Shipping Policy',
    apiPath: '/api/admin/cms/policies/shipping',
    route: '/admin/cms/shipping',
  },
};

export function PolicyFormPage({ policyType }: PolicyFormPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const config = policyConfig[policyType];

  const [formData, setFormData] = useState<PolicyFormData>({
    type: policyType,
    title: config.title,
    content: '',
    metaTitle: '',
    metaDescription: '',
    status: 'active',
  });

  useEffect(() => {
    fetchPolicy();
  }, [policyType]);

  const fetchPolicy = async () => {
    try {
      setFetching(true);
      const response = await fetch(config.apiPath);
      if (response.ok) {
        const data = await response.json();
        setFormData({
          type: data.type || policyType,
          title: data.title || config.title,
          content: data.content || '',
          metaTitle: data.metaTitle || '',
          metaDescription: data.metaDescription || '',
          status: data.status || 'active',
        });
      }
    } catch (error) {
      console.error('[v0] Failed to fetch policy:', error);
      toast({
        title: 'Error',
        description: 'Failed to load policy',
        variant: 'destructive',
      });
    } finally {
      setFetching(false);
    }
  };

  const updateField = (field: keyof PolicyFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();

    setLoading(true);
    try {
      const response = await fetch(config.apiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `${config.title} saved successfully`,
          variant: 'success',
        });
        router.push(config.route);
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to save policy',
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

  if (fetching) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <div className='text-center'>
          <div className='w-12 h-12 rounded-full border-4 border-slate-200 border-t-green-600 animate-spin mx-auto mb-4'></div>
          <p className='text-slate-600'>Loading...</p>
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
          <h1 className='text-3xl font-bold'>{config.title}</h1>
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
              <div className='space-y-2'>
                <Label htmlFor='title'>Title</Label>
                <Input
                  id='title'
                  value={formData.title}
                  onChange={e => updateField('title', e.target.value)}
                  placeholder='Enter policy title'
                />
              </div>

              <RichTextEditor
                label='Content'
                value={formData.content}
                onChange={val => updateField('content', val)}
                placeholder='Enter policy content...'
                helperText='Use the toolbar to format your content with bold, italic, lists, quotes, and more'
              />

              <div className='flex items-center gap-2'>
                <Switch
                  checked={formData.status === 'active'}
                  onCheckedChange={checked => updateField('status', checked ? 'active' : 'inactive')}
                />
                <Label>Active</Label>
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
            </TabsContent>
          </Tabs>

          <div className='flex justify-end gap-4'>
            <Button type='button' variant='outline' onClick={() => router.back()} disabled={loading}>
              Cancel
            </Button>
            <Button type='submit' disabled={loading} className='bg-[#22c55e]'>
              {loading ? 'Saving...' : 'Save Policy'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

