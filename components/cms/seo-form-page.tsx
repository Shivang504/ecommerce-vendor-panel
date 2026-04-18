'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';
import { MainImageUpload } from '@/components/media/main-image-upload';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface SeoFormData {
  siteName: string;
  siteTitle: string;
  siteDescription: string;
  siteKeywords: string;
  ogImage: string;
  favicon: string;
  headerLogo: string;
  footerLogo: string;
  googleAnalyticsId: string;
  googleTagManagerId: string;
  facebookPixelId: string;
  twitterHandle: string;
  facebookPage: string;
  instagramHandle: string;
}

export function SeoFormPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const [formData, setFormData] = useState<SeoFormData>({
    siteName: '',
    siteTitle: '',
    siteDescription: '',
    siteKeywords: '',
    ogImage: '',
    favicon: '',
    headerLogo: '',
    footerLogo: '',
    googleAnalyticsId: '',
    googleTagManagerId: '',
    facebookPixelId: '',
    twitterHandle: '',
    facebookPage: '',
    instagramHandle: '',
  });

  useEffect(() => {
    fetchSeo();
  }, []);

  const fetchSeo = async () => {
    try {
      setFetching(true);
      const response = await fetch('/api/admin/cms/seo');
      if (response.ok) {
        const data = await response.json();
        setFormData({
          siteName: data.siteName || '',
          siteTitle: data.siteTitle || '',
          siteDescription: data.siteDescription || '',
          siteKeywords: data.siteKeywords || '',
          ogImage: data.ogImage || '',
          favicon: data.favicon || '',
          headerLogo: data.headerLogo || '',
          footerLogo: data.footerLogo || '',
          googleAnalyticsId: data.googleAnalyticsId || '',
          googleTagManagerId: data.googleTagManagerId || '',
          facebookPixelId: data.facebookPixelId || '',
          twitterHandle: data.twitterHandle || '',
          facebookPage: data.facebookPage || '',
          instagramHandle: data.instagramHandle || '',
        });
      }
    } catch (error) {
      console.error('[v0] Failed to fetch SEO settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load SEO settings',
        variant: 'destructive',
      });
    } finally {
      setFetching(false);
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

  const updateField = (field: keyof SeoFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();

    setLoading(true);
    try {
      const response = await fetch('/api/admin/cms/seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'SEO settings saved successfully',
          variant: 'success',
        });
        router.push('/admin/cms/seo');
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to save SEO settings',
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
          <h1 className='text-3xl font-bold'>SEO Settings</h1>
        </div>
      </div>

      <Card className='p-6 shadow-md'>
        <form onSubmit={handleSubmit} className='space-y-6'>
          <Tabs defaultValue='basic' className='w-full'>
            <TabsList>
              <TabsTrigger value='basic'>Basic</TabsTrigger>
              <TabsTrigger value='logos'>Logos</TabsTrigger>
              <TabsTrigger value='analytics'>Analytics</TabsTrigger>
              <TabsTrigger value='social'>Social Media</TabsTrigger>
            </TabsList>

            <TabsContent value='basic' className='space-y-6'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                <div className='space-y-2'>
                  <Label htmlFor='siteName'>Site Name</Label>
                  <Input
                    id='siteName'
                    value={formData.siteName}
                    onChange={e => updateField('siteName', e.target.value)}
                    placeholder='Your Site Name'
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='siteTitle'>Site Title</Label>
                  <Input
                    id='siteTitle'
                    value={formData.siteTitle}
                    onChange={e => updateField('siteTitle', e.target.value)}
                    placeholder='Your Site Title'
                  />
                </div>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='siteDescription'>Site Description</Label>
                <Textarea
                  id='siteDescription'
                  value={formData.siteDescription}
                  onChange={e => updateField('siteDescription', e.target.value)}
                  placeholder='Brief description of your website'
                  rows={3}
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='siteKeywords'>Site Keywords</Label>
                <Input
                  id='siteKeywords'
                  value={formData.siteKeywords}
                  onChange={e => updateField('siteKeywords', e.target.value)}
                  placeholder='keyword1, keyword2, keyword3'
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='ogImage'>Open Graph Image</Label>
                <MainImageUpload
                  value={formData.ogImage}
                  onChange={val => updateField('ogImage', val)}
                  uploadHandler={uploadImage}
                  hideLabel
                  recommendedText='Recommended: 1200×630px, JPG/PNG'
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='favicon'>Favicon</Label>
                <MainImageUpload
                  value={formData.favicon}
                  onChange={val => updateField('favicon', val)}
                  uploadHandler={uploadImage}
                  hideLabel
                  recommendedText='Recommended: 32×32px, ICO/PNG'
                />
              </div>
            </TabsContent>

            <TabsContent value='logos' className='space-y-6'>
              <div className='space-y-2'>
                <Label htmlFor='headerLogo'>Header Logo</Label>
                <MainImageUpload
                  value={formData.headerLogo}
                  onChange={val => updateField('headerLogo', val)}
                  uploadHandler={uploadImage}
                  hideLabel
                  recommendedText='Recommended: 200×60px, PNG with transparent background'
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='footerLogo'>Footer Logo</Label>
                <MainImageUpload
                  value={formData.footerLogo}
                  onChange={val => updateField('footerLogo', val)}
                  uploadHandler={uploadImage}
                  hideLabel
                  recommendedText='Recommended: 200×60px, PNG with transparent background'
                />
              </div>
            </TabsContent>

            <TabsContent value='analytics' className='space-y-6'>
              <div className='space-y-2'>
                <Label htmlFor='googleAnalyticsId'>Google Analytics ID</Label>
                <Input
                  id='googleAnalyticsId'
                  value={formData.googleAnalyticsId}
                  onChange={e => updateField('googleAnalyticsId', e.target.value)}
                  placeholder='G-XXXXXXXXXX'
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='googleTagManagerId'>Google Tag Manager ID</Label>
                <Input
                  id='googleTagManagerId'
                  value={formData.googleTagManagerId}
                  onChange={e => updateField('googleTagManagerId', e.target.value)}
                  placeholder='GTM-XXXXXXX'
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='facebookPixelId'>Facebook Pixel ID</Label>
                <Input
                  id='facebookPixelId'
                  value={formData.facebookPixelId}
                  onChange={e => updateField('facebookPixelId', e.target.value)}
                  placeholder='123456789012345'
                />
              </div>
            </TabsContent>

            <TabsContent value='social' className='space-y-6'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                <div className='space-y-2'>
                  <Label htmlFor='twitterHandle'>Twitter Handle</Label>
                  <Input
                    id='twitterHandle'
                    value={formData.twitterHandle}
                    onChange={e => updateField('twitterHandle', e.target.value)}
                    placeholder='@yourhandle'
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='facebookPage'>Facebook Page</Label>
                  <Input
                    id='facebookPage'
                    value={formData.facebookPage}
                    onChange={e => updateField('facebookPage', e.target.value)}
                    placeholder='https://facebook.com/yourpage'
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='instagramHandle'>Instagram Handle</Label>
                  <Input
                    id='instagramHandle'
                    value={formData.instagramHandle}
                    onChange={e => updateField('instagramHandle', e.target.value)}
                    placeholder='@yourhandle'
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className='flex justify-end gap-4'>
            <Button type='button' variant='outline' onClick={() => router.back()} disabled={loading}>
              Cancel
            </Button>
            <Button type='submit' disabled={loading} className='bg-[#22c55e]'>
              {loading ? 'Saving...' : 'Save SEO Settings'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

