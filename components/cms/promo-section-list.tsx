'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Spinner } from '@/components/ui/spinner';

interface PromoSection {
  _id: string;
  title: string;
  tagline: string;
  mainHeading: string;
  ctaText: string;
  ctaLink: string;
  gradientFrom: string;
  gradientTo: string;
  countdown: {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  };
  order: number;
  status: 'active' | 'inactive';
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function PromoSectionList() {
  const router = useRouter();
  const { toast } = useToast();
  const [promo, setPromo] = useState<PromoSection | null>(null);
  const [loading, setLoading] = useState(true);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [liveCountdown, setLiveCountdown] = useState<Countdown>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    fetchPromo();
  }, []);

  // Live countdown timer based on endDate + endTime
  useEffect(() => {
    if (!promo || !promo.endDate || !promo.endTime) {
      setLiveCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      return;
    }

    const calculateCountdown = () => {
      const now = new Date();
      const endDateTime = new Date(promo.endDate!);
      const [hours, minutes] = (promo.endTime || '00:00').split(':').map(Number);
      endDateTime.setHours(hours || 0, minutes || 0, 0, 0);

      const diff = endDateTime.getTime() - now.getTime();

      if (diff <= 0) {
        setLiveCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hoursRem = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutesRem = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secondsRem = Math.floor((diff % (1000 * 60)) / 1000);

      setLiveCountdown({ days, hours: hoursRem, minutes: minutesRem, seconds: secondsRem });
    };

    // Calculate immediately
    calculateCountdown();

    // Update every second
    const interval = setInterval(calculateCountdown, 1000);

    return () => clearInterval(interval);
  }, [promo]);

  const fetchPromo = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/cms/promo-section');
      if (response.ok) {
        const data = await response.json();
        setPromo(data || null);
      } else {
        setPromo(null);
      }
    } catch (error) {
      console.error('[v0] Failed to fetch promo section:', error);
      setPromo(null);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!promo) return;
    const newStatus = promo.status === 'active' ? 'inactive' : 'active';
    try {
      setTogglingStatus(true);
      const response = await fetch(`/api/admin/cms/promo-section/${promo._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Promo section ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`,
          variant: 'success',
        });
        fetchPromo();
      } else {
        toast({
          title: 'Error',
          description: 'Failed to update promo section status',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setTogglingStatus(false);
    }
  };

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-3xl font-bold'>Promo Section</h1>
        <Button
          onClick={() => router.push(promo ? `/admin/cms/promo-section/edit/${promo._id}` : '/admin/cms/promo-section/add')}
          className='gap-2 bg-[#22c55e]'>
          <Pencil className='h-4 w-4' />
          {promo ? 'Edit Promo Section' : 'Add Promo Section'}
        </Button>
      </div>

      <Card className='shadow-md border border-gray-200 overflow-hidden'>
        {loading ? (
          <div className='p-8 text-center'>
            <Spinner className='h-6 w-6 mx-auto' />
          </div>
        ) : promo ? (
          <div className='p-6 space-y-6'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <div>
                <Label className='text-sm text-gray-500'>Title</Label>
                <p className='text-lg font-semibold mt-1'>{promo.title}</p>
              </div>
              <div>
                <Label className='text-sm text-gray-500'>Tagline</Label>
                <p className='text-lg font-semibold mt-1'>{promo.tagline}</p>
              </div>
              <div className='md:col-span-2'>
                <Label className='text-sm text-gray-500'>Main Heading</Label>
                <p className='text-lg font-semibold mt-1'>{promo.mainHeading}</p>
              </div>
              <div>
                <Label className='text-sm text-gray-500'>CTA Text</Label>
                <p className='text-lg font-semibold mt-1'>{promo.ctaText}</p>
              </div>
              <div>
                <Label className='text-sm text-gray-500'>CTA Link</Label>
                <p className='text-lg font-semibold mt-1'>{promo.ctaLink}</p>
              </div>
              <div>
                <Label className='text-sm text-gray-500'>Gradient</Label>
                <p className='text-lg font-semibold mt-1'>
                  {promo.gradientFrom} → {promo.gradientTo}
                </p>
              </div>
              <div>
                <Label className='text-sm text-gray-500'>Live Countdown</Label>
                {promo.endDate && promo.endTime ? (
                  <div className='mt-1'>
                    <div className='flex items-center gap-2 text-lg font-semibold'>
                      <span className='px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded font-mono'>
                        {String(liveCountdown.days).padStart(2, '0')}
                      </span>
                      <span className='text-gray-400'>d</span>
                      <span className='px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded font-mono'>
                        {String(liveCountdown.hours).padStart(2, '0')}
                      </span>
                      <span className='text-gray-400'>h</span>
                      <span className='px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded font-mono'>
                        {String(liveCountdown.minutes).padStart(2, '0')}
                      </span>
                      <span className='text-gray-400'>m</span>
                      <span className='px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded font-mono'>
                        {String(liveCountdown.seconds).padStart(2, '0')}
                      </span>
                      <span className='text-gray-400'>s</span>
                    </div>
                    {liveCountdown.days === 0 && liveCountdown.hours === 0 && liveCountdown.minutes === 0 && liveCountdown.seconds === 0 && (
                      <p className='text-sm text-red-500 mt-1'>⚠️ Promo has expired</p>
                    )}
                  </div>
                ) : (
                  <p className='text-lg font-semibold mt-1 text-gray-400'>No end date/time set</p>
                )}
              </div>
              <div className='flex items-center gap-4'>
                <Label>Status</Label>
                {togglingStatus ? (
                  <Spinner className='h-4 w-4' />
                ) : (
                  <Switch checked={promo.status === 'active'} onCheckedChange={handleToggleStatus} />
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className='p-8 text-center text-gray-500'>
            <p>No promo section configured. Click "Add Promo Section" to create one.</p>
          </div>
        )}
      </Card>
    </div>
  );
}

