'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

interface PromoSectionFormData {
  title: string;
  tagline: string;
  mainHeading: string;
  ctaText: string;
  ctaLink: string;
  gradientFrom: string;
  gradientTo: string;
  countdown: Countdown;
  order: number;
  status: 'active' | 'inactive';
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
}

interface PromoSectionFormPageProps {
  promoId?: string;
}

const gradientOptions = [
  { value: 'amber-100', label: 'Amber 100' },
  { value: 'yellow-100', label: 'Yellow 100' },
  { value: 'orange-100', label: 'Orange 100' },
  { value: 'red-100', label: 'Red 100' },
  { value: 'pink-100', label: 'Pink 100' },
  { value: 'purple-100', label: 'Purple 100' },
  { value: 'blue-100', label: 'Blue 100' },
  { value: 'green-100', label: 'Green 100' },
];

export function PromoSectionFormPage({ promoId }: PromoSectionFormPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<PromoSectionFormData>({
    title: 'Promo Offer',
    tagline: 'The Last Chance',
    mainHeading: 'Save up to 50% on trending fashion',
    ctaText: 'Use Code: SAVE50',
    ctaLink: '/products',
    gradientFrom: 'amber-100',
    gradientTo: 'yellow-100',
    countdown: {
      days: 7,
      hours: 12,
      minutes: 45,
      seconds: 30,
    },
    order: 0,
    status: 'active',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
  });
  const [adminCountdown, setAdminCountdown] = useState<Countdown>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    if (promoId) {
      fetchPromo();
    }
  }, [promoId]);

  // Calculate countdown from endDate + endTime
  useEffect(() => {
    if (!formData.endDate || !formData.endTime) {
      setAdminCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      return;
    }

    const calculateCountdown = () => {
      const now = new Date();
      const [hours, minutes] = formData.endTime.split(':').map(Number);
      const endDateTime = new Date(formData.endDate);
      endDateTime.setHours(hours || 0, minutes || 0, 0, 0);

      const diff = endDateTime.getTime() - now.getTime();

      if (diff <= 0) {
        setAdminCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hoursRem = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutesRem = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secondsRem = Math.floor((diff % (1000 * 60)) / 1000);

      setAdminCountdown({ days, hours: hoursRem, minutes: minutesRem, seconds: secondsRem });
    };

    calculateCountdown();
    const interval = setInterval(calculateCountdown, 1000);

    return () => clearInterval(interval);
  }, [formData.endDate, formData.endTime]);

  const fetchPromo = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/cms/promo-section/${promoId}`);
      if (response.ok) {
        const data = await response.json();
        setFormData({
          title: data.title || '',
          tagline: data.tagline || '',
          mainHeading: data.mainHeading || '',
          ctaText: data.ctaText || '',
          ctaLink: data.ctaLink || '/products',
          gradientFrom: data.gradientFrom || 'amber-100',
          gradientTo: data.gradientTo || 'yellow-100',
          countdown: data.countdown || {
            days: 7,
            hours: 12,
            minutes: 45,
            seconds: 30,
          },
          order: data.order || 0,
          status: data.status || 'active',
          startDate: data.startDate ? new Date(data.startDate).toISOString().split('T')[0] : '',
          endDate: data.endDate ? new Date(data.endDate).toISOString().split('T')[0] : '',
          startTime: data.startTime || '',
          endTime: data.endTime || '',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load promo section',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('[v0] Failed to fetch promo section:', error);
      toast({
        title: 'Error',
        description: 'Failed to load promo section',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof PromoSectionFormData, value: any) => {
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
    if (!formData.mainHeading.trim()) {
      newErrors.mainHeading = 'Main heading is required';
    }
    if (!formData.ctaText.trim()) {
      newErrors.ctaText = 'CTA text is required';
    }
    if (!formData.endDate) {
      newErrors.endDate = 'End date is required';
    }
    if (!formData.endTime) {
      newErrors.endTime = 'End time is required';
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
      const url = promoId ? `/api/admin/cms/promo-section/${promoId}` : '/api/admin/cms/promo-section';
      const method = promoId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Promo section ${promoId ? 'updated' : 'created'} successfully`,
          variant: 'success',
        });
        router.push('/admin/cms/promo-section');
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || `Failed to ${promoId ? 'update' : 'create'} promo section`,
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
          <h1 className='text-3xl font-bold'>{promoId ? 'Edit Promo Section' : 'Add New Promo Section'}</h1>
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
                placeholder='Promo Offer'
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

          <div className='space-y-2'>
            <Label htmlFor='tagline'>Tagline</Label>
            <Input
              id='tagline'
              value={formData.tagline}
              onChange={e => updateField('tagline', e.target.value)}
              placeholder='The Last Chance'
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='mainHeading'>
              Main Heading <span className='text-red-500'>*</span>
            </Label>
            <Input
              id='mainHeading'
              value={formData.mainHeading}
              onChange={e => updateField('mainHeading', e.target.value)}
              placeholder='Save up to 50% on trending fashion'
              className={errors.mainHeading ? 'border-red-500' : ''}
            />
            {errors.mainHeading && <p className='text-sm text-red-500'>{errors.mainHeading}</p>}
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <div className='space-y-2'>
              <Label htmlFor='ctaText'>
                CTA Text <span className='text-red-500'>*</span>
              </Label>
              <Input
                id='ctaText'
                value={formData.ctaText}
                onChange={e => updateField('ctaText', e.target.value)}
                placeholder='Use Code: SAVE50'
                className={errors.ctaText ? 'border-red-500' : ''}
              />
              {errors.ctaText && <p className='text-sm text-red-500'>{errors.ctaText}</p>}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='ctaLink'>CTA Link</Label>
              <Input id='ctaLink' value={formData.ctaLink} onChange={e => updateField('ctaLink', e.target.value)} placeholder='/products' />
            </div>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <div className='space-y-2'>
              <Label htmlFor='gradientFrom'>Gradient From</Label>
              <Select value={formData.gradientFrom} onValueChange={value => updateField('gradientFrom', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {gradientOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='gradientTo'>Gradient To</Label>
              <Select value={formData.gradientTo} onValueChange={value => updateField('gradientTo', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {gradientOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className='border-t pt-6'>
            <Label className='text-lg font-semibold mb-4 block'>Promo Schedule</Label>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-6'>
              <div className='space-y-2'>
                <Label htmlFor='startDate'>Start Date</Label>
                <Input
                  id='startDate'
                  type='date'
                  value={formData.startDate || ''}
                  onChange={e => updateField('startDate', e.target.value)}
                />
                <p className='text-xs text-gray-500'>When the promo becomes active</p>
              </div>
              <div className='space-y-2'>
                <Label htmlFor='startTime'>Start Time</Label>
                <Input
                  id='startTime'
                  type='time'
                  value={formData.startTime || ''}
                  onChange={e => updateField('startTime', e.target.value)}
                />
                <p className='text-xs text-gray-500'>Start time (24-hour format)</p>
              </div>
              <div className='space-y-2'>
                <Label htmlFor='endDate'>
                  End Date <span className='text-red-500'>*</span>
                </Label>
                <Input
                  id='endDate'
                  type='date'
                  value={formData.endDate || ''}
                  onChange={e => updateField('endDate', e.target.value)}
                  min={formData.startDate || undefined}
                  className={errors.endDate ? 'border-red-500' : ''}
                />
                <p className='text-xs text-gray-500'>When the promo expires</p>
                {errors.endDate && <p className='text-sm text-red-500'>{errors.endDate}</p>}
              </div>
              <div className='space-y-2'>
                <Label htmlFor='endTime'>
                  End Time <span className='text-red-500'>*</span>
                </Label>
                <Input
                  id='endTime'
                  type='time'
                  value={formData.endTime || ''}
                  onChange={e => updateField('endTime', e.target.value)}
                  className={errors.endTime ? 'border-red-500' : ''}
                />
                <p className='text-xs text-gray-500'>End time (24-hour format)</p>
                {errors.endTime && <p className='text-sm text-red-500'>{errors.endTime}</p>}
              </div>
            </div>

            {/* Live Countdown Timer in Admin Panel */}
            {formData.endDate && formData.endTime && (
              <div className='border rounded-lg p-4 bg-gray-50 dark:bg-gray-800 mb-6'>
                <Label className='text-base font-semibold mb-3 block'>Live Countdown Timer</Label>
                <div className='flex items-center gap-4 text-2xl font-bold'>
                  <div className='flex flex-col justify-center items-center gap-2'>
                    <span className='text-sm font-normal text-gray-600 dark:text-gray-400'>Days:</span>
                    <span className='px-3 py-1 bg-white dark:bg-gray-700 rounded'>{String(adminCountdown.days).padStart(2, '0')}</span>
                  </div>
                  <span>:</span>
                  <div className='flex items-center gap-2'>
                    <span className='text-sm font-normal text-gray-600 dark:text-gray-400'>Hours:</span>
                    <span className='px-3 py-1 bg-white dark:bg-gray-700 rounded'>{String(adminCountdown.hours).padStart(2, '0')}</span>
                  </div>
                  <span>:</span>
                  <div className='flex items-center gap-2'>
                    <span className='text-sm font-normal text-gray-600 dark:text-gray-400'>Minutes:</span>
                    <span className='px-3 py-1 bg-white dark:bg-gray-700 rounded'>{String(adminCountdown.minutes).padStart(2, '0')}</span>
                  </div>
                  <span>:</span>
                  <div className='flex items-center gap-2'>
                    <span className='text-sm font-normal text-gray-600 dark:text-gray-400'>Seconds:</span>
                    <span className='px-3 py-1 bg-white dark:bg-gray-700 rounded'>{String(adminCountdown.seconds).padStart(2, '0')}</span>
                  </div>
                </div>
                {adminCountdown.days === 0 &&
                  adminCountdown.hours === 0 &&
                  adminCountdown.minutes === 0 &&
                  adminCountdown.seconds === 0 && <p className='text-sm text-red-500 mt-2'>⚠️ Promo has expired!</p>}
              </div>
            )}
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
              {loading ? 'Saving...' : promoId ? 'Update Promo Section' : 'Create Promo Section'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
