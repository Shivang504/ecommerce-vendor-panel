'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

const gradientColorMap: Record<string, string> = {
  'amber-100': 'rgb(254, 243, 199)',
  'yellow-100': 'rgb(254, 249, 195)',
  'orange-100': 'rgb(255, 237, 213)',
  'red-100': 'rgb(254, 226, 226)',
  'pink-100': 'rgb(252, 231, 243)',
  'purple-100': 'rgb(243, 232, 255)',
  'blue-100': 'rgb(219, 234, 254)',
  'green-100': 'rgb(220, 252, 231)',
};

const getGradientColor = (color: string): string => {
  return gradientColorMap[color] || gradientColorMap['amber-100'];
};

type TimeLeft = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

interface PromoSectionData {
  title: string;
  tagline: string;
  mainHeading: string;
  ctaText: string;
  ctaLink: string;
  gradientFrom: string;
  gradientTo: string;
  countdown: TimeLeft;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
}

export function PromoSection() {
  const [promoData, setPromoData] = useState<PromoSectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isExpired, setIsExpired] = useState(false);
  const [isNotStarted, setIsNotStarted] = useState(false);
  const countdownUnits: (keyof TimeLeft)[] = ['days', 'hours', 'minutes', 'seconds'];

  useEffect(() => {
    const fetchPromo = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/cms/promo-section');
        if (response.ok) {
          const data = await response.json();
          if (data) {
            setPromoData(data);
            // Check if promo has started
            if (data.startDate && data.startTime) {
              const now = new Date();
              const startDateTime = new Date(data.startDate);
              const [hours, minutes] = (data.startTime || '00:00').split(':').map(Number);
              startDateTime.setHours(hours || 0, minutes || 0, 0, 0);

              if (now < startDateTime) {
                setIsNotStarted(true);
                return;
              }
            }

            // Initialize countdown from date/time (required)
            if (data.endDate && data.endTime) {
              calculateCountdownFromDateTime(data.endDate, data.endTime);
            } else {
              // If no date/time set, don't show promo
              setPromoData(null);
              return;
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch promo section:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPromo();
  }, []);

  const calculateCountdownFromDateTime = (endDate: string | Date, endTime: string) => {
    const now = new Date();
    const endDateTime = new Date(endDate);
    const [hours, minutes] = (endTime || '00:00').split(':').map(Number);
    endDateTime.setHours(hours || 0, minutes || 0, 0, 0);

    const diff = endDateTime.getTime() - now.getTime();

    if (diff <= 0) {
      setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      setIsExpired(true);
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hoursRem = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutesRem = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secondsRem = Math.floor((diff % (1000 * 60)) / 1000);

    setTimeLeft({ days, hours: hoursRem, minutes: minutesRem, seconds: secondsRem });
    setIsExpired(false);
  };

  useEffect(() => {
    if (!promoData) return;

    let startCheckInterval: NodeJS.Timeout | null = null;
    let countdownInterval: NodeJS.Timeout | null = null;

    // Check if promo has started
    if (promoData.startDate && promoData.startTime) {
      const checkStart = () => {
        const now = new Date();
        const startDateTime = new Date(promoData.startDate!);
        const [hours, minutes] = (promoData.startTime || '00:00').split(':').map(Number);
        startDateTime.setHours(hours || 0, minutes || 0, 0, 0);

        if (now < startDateTime) {
          setIsNotStarted(true);
          return true; // Not started yet
        }
        setIsNotStarted(false);
        return false; // Has started
      };

      const notStarted = checkStart();
      startCheckInterval = setInterval(() => {
        checkStart();
      }, 1000);

      if (notStarted) {
        return () => {
          if (startCheckInterval) clearInterval(startCheckInterval);
        };
      }
    } else {
      setIsNotStarted(false);
    }

    // Calculate countdown from endDate and endTime (required)
    if (promoData.endDate && promoData.endTime) {
      countdownInterval = setInterval(() => {
        const now = new Date();
        const endDateTime = new Date(promoData.endDate!);
        const [hours, minutes] = (promoData.endTime || '00:00').split(':').map(Number);
        endDateTime.setHours(hours || 0, minutes || 0, 0, 0);

        const diff = endDateTime.getTime() - now.getTime();

        if (diff <= 0) {
          setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
          setIsExpired(true);
          return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hoursRem = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutesRem = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secondsRem = Math.floor((diff % (1000 * 60)) / 1000);

        setTimeLeft({ days, hours: hoursRem, minutes: minutesRem, seconds: secondsRem });
        setIsExpired(false);
      }, 1000);
    }

    return () => {
      if (startCheckInterval) clearInterval(startCheckInterval);
      if (countdownInterval) clearInterval(countdownInterval);
    };
  }, [promoData]);

  if (loading) {
    return <div></div>;
  }

  if (!promoData) {
    return null;
  }

  // Auto-hide when not started, expired, or countdown reaches zero (no refresh needed)
  if (isNotStarted || isExpired || (timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0)) {
    return null;
  }

  return (
    <section className='site-container py-3 sm:py-5'>
      <div className='flex flex-col lg:flex-row items-center gap-4 lg:gap-6 bg-gradient-to-r from-amber-100 to-yellow-100 lg:px-8 py-3 shadow-sm rounded-2xl border border-amber-200'>
        {/* Left Content */}
        <div className='flex-1 text-left max-w-full lg:max-w-[500px]'>
          <p className='text-[10px] sm:text-xs font-semibold tracking-wide uppercase text-gray-600 mb-1'>{promoData.tagline}</p>
          <h3 className='text-sm sm:text-lg lg:text-2xl font-extrabold text-gray-900 leading-snug'>{promoData.mainHeading}</h3>
        </div>

        {/* Countdown (CENTER) */}
        <div className='flex flex-col items-center gap-1'>
          <p className='text-[10px] sm:text-xs text-gray-600 font-medium'>Time Remaining</p>

          <div className='flex items-center gap-2 sm:gap-4'>
            {countdownUnits.map(unit => (
              <div key={unit} className='flex flex-col items-center w-[36px] sm:w-[48px] lg:w-[64px]'>
                <span className='bg-white border border-gray-200 rounded-lg text-center text-sm sm:text-base lg:text-xl font-semibold px-1.5 py-1 w-full'>
                  {String(timeLeft[unit]).padStart(2, '0')}
                </span>
                <span className='text-[8px] sm:text-[10px] uppercase text-gray-500 mt-0.5'>
                  {unit === 'days' ? 'Days' : unit === 'hours' ? 'Hrs' : unit === 'minutes' ? 'Min' : 'Sec'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className='flex-1 flex flex-col items-end text-right gap-2'>
          <p className='text-[10px] sm:text-xs text-gray-600 xl:mr-2'>Use code before time ends</p>
          <Link
            href={promoData.ctaLink || '/products'}
            className='inline-flex items-center justify-center rounded-full bg-white border border-gray-900 text-gray-900 font-semibold text-xs sm:text-sm px-4 py-2 hover:bg-gray-100 transition'>
            {promoData.ctaText}
          </Link>
        </div>
      </div>
    </section>
  );
}
