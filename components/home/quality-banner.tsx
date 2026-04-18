'use client';

import { useEffect, useState } from 'react';
import { Gem, Award, Heart } from 'lucide-react';

interface Feature {
  id: number;
  icon: string; // 'Gem' | 'Award' | 'Heart'
  title: string;
  description: string;
}

interface QualityBannerData {
  title: string;
  features: Feature[];
}

const iconMap: Record<string, typeof Gem> = {
  Gem,
  Award,
  Heart,
};

export function QualityBanner() {
  const [bannerData, setBannerData] = useState<QualityBannerData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBanner = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/cms/quality-banners');
        if (response.ok) {
          const data = await response.json();
          if (data) {
            setBannerData(data);
          }
        }
      } catch (error) {
        console.error('Failed to fetch quality banner:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBanner();
  }, []);

  if (loading) {
    return null;
  }

  if (!bannerData) {
    return null;
  }

  return (
    <section className='bg-web text-white py-4 sm:py-8'>
      <div className='site-container'>
        <div className='grid grid-cols-1 md:grid-cols-4 gap-8 sm:gap-10 items-center'>
          {/* LEFT TITLE */}
          <div className='md:col-span-1 text-center md:text-left'>
            <h2 className='text-3xl sm:text-4xl md:text-5xl font-bold leading-tight'>{bannerData.title}</h2>
          </div>

          {/* RIGHT FEATURE ITEMS */}
          <div className='md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-10'>
            {bannerData.features.map(item => {
              const Icon = iconMap[item.icon] || Gem;
              return (
                <div key={item.id} className='flex flex-col items-center text-center'>
                  <div className='mb-4'>
                    <Icon className='w-12 h-12 sm:w-14 sm:h-14 text-white' />
                  </div>
                  <h3 className='text-xl sm:text-2xl font-bold mb-3'>{item.title}</h3>
                  <p className='text-sm sm:text-base text-white/90 max-w-xs'>{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
