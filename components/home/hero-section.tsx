'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface HeroBanner {
  _id: string;
  tag: string;
  title: string;
  subtitle?: string;
  buttonText: string;
  buttonLink: string;
  image: string;
  textColor: string;
  gradient?: string;
  type: 'big' | 'medium' | 'small';
  order: number;
}

export default function HeroSection() {
  const [bigBanners, setBigBanners] = useState<HeroBanner[]>([]);
  const [mediumBanners, setMediumBanners] = useState<HeroBanner[]>([]);
  const [smallBanners, setSmallBanners] = useState<HeroBanner[]>([]);
  const [loading, setLoading] = useState(true);

  /* BIG CARD SLIDER INDEX */
  const [bigIndex, setBigIndex] = useState(0);

  /* MEDIUM CARD SLIDER INDEX */
  const [mediumIndex, setMediumIndex] = useState(0);

  /* FETCH HERO BANNERS - Optimized with browser cache and prefetching */
  useEffect(() => {
    const fetchBanners = async () => {
      try {
        setLoading(true);

        // Use browser cache for faster loading on repeat visits
        const response = await fetch('/api/cms/hero-banners/all', {
          cache: 'force-cache', // Use browser cache
        });

        if (response.ok) {
          const data = await response.json();
          const big = Array.isArray(data.big) ? data.big : [];
          const medium = Array.isArray(data.medium) ? data.medium : [];
          const small = Array.isArray(data.small) ? data.small : [];

          // Set banners immediately
          setBigBanners(big);
          setMediumBanners(medium);
          setSmallBanners(small);

          // Preload images for next slides for smooth transitions
          if (big.length > 1) {
            big.forEach((banner: HeroBanner, idx: number) => {
              if (idx !== 0) {
                const img = new window.Image();
                img.src = banner.image;
              }
            });
          }
          if (medium.length > 1) {
            medium.forEach((banner: HeroBanner, idx: number) => {
              if (idx !== 0) {
                const img = new window.Image();
                img.src = banner.image;
              }
            });
          }
        } else {
          setBigBanners([]);
          setMediumBanners([]);
          setSmallBanners([]);
        }
      } catch (error) {
        console.error('Failed to fetch hero banners:', error);
        setBigBanners([]);
        setMediumBanners([]);
        setSmallBanners([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBanners();
  }, []);

  /* AUTOPLAY FOR BIG + MEDIUM SLIDER - Preload next image before switching */
  useEffect(() => {
    if (bigBanners.length === 0 && mediumBanners.length === 0) return;

    const bigInterval = setInterval(() => {
      if (bigBanners.length > 0) {
        const nextIndex = (bigIndex + 1) % bigBanners.length;
        // Preload next image before switching
        if (bigBanners[nextIndex]) {
          const img = new window.Image();
          img.src = bigBanners[nextIndex].image;
        }
        setBigIndex(nextIndex);
      }
    }, 4000);

    const mediumInterval = setInterval(() => {
      if (mediumBanners.length > 0) {
        const nextIndex = (mediumIndex + 1) % mediumBanners.length;
        // Preload next image before switching
        if (mediumBanners[nextIndex]) {
          const img = new window.Image();
          img.src = mediumBanners[nextIndex].image;
        }
        setMediumIndex(nextIndex);
      }
    }, 4000);

    return () => {
      clearInterval(bigInterval);
      clearInterval(mediumInterval);
    };
  }, [bigBanners, mediumBanners, bigIndex, mediumIndex]);

  const bigCard = bigBanners[bigIndex] || null;
  const mediumCard = mediumBanners[mediumIndex] || null;
  const smallCardOne = smallBanners[0] || null;
  const smallCardTwo = smallBanners[1] || null;

  if (loading) {
    return (
      <section className='py-8 sm:py-6'>
        <div className='site-container'>
          <div className='grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6'>
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:col-span-2 gap-4 sm:gap-6'>
              {/* Big Card Skeleton */}
              <div className='relative min-h-[360px] sm:min-h-[420px] lg:min-h-[520px] rounded-3xl overflow-hidden bg-gray-200 animate-pulse'>
                <div className='absolute inset-0 bg-gradient-to-t from-black/20 to-transparent' />
              </div>
              {/* Medium Card Skeleton */}
              <div className='relative min-h-[360px] sm:min-h-[420px] lg:min-h-[520px] rounded-3xl overflow-hidden bg-gray-200 animate-pulse'>
                <div className='absolute inset-0 bg-gradient-to-t from-black/20 to-transparent' />
              </div>
            </div>
            {/* Small Cards Skeleton */}
            <div className='flex flex-col gap-4 sm:gap-6'>
              <div className='h-[220px] sm:h-[245px] rounded-3xl bg-gray-200 animate-pulse' />
              <div className='h-[220px] sm:h-[250px] rounded-3xl bg-gray-200 animate-pulse' />
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!bigCard && !mediumCard && !smallCardOne && !smallCardTwo) {
    return null;
  }

  return (
    <section className='pt-2 pb-10'>
      <div className='site-container'>
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6'>
          {/* LEFT SIDE — BIG + MEDIUM SLIDERS */}
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:col-span-2 gap-4 sm:gap-6'>
            {/* BIG SLIDER */}
            {bigCard && (
              <div className='relative min-h-[360px] sm:min-h-[420px] lg:min-h-[520px] rounded-3xl overflow-hidden shadow-xl group cursor-pointer transition-all duration-500'>
                <Image
                  src={bigCard.image}
                  alt={bigCard.title || 'Hero banner'}
                  fill
                  priority
                  sizes='(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 50vw'
                  className='object-cover transition-opacity duration-300'
                  quality={85}
                  loading='eager'
                />
                <div className={`absolute inset-0 ${bigCard.gradient || 'bg-gradient-to-t from-black/60 via-black/20 to-transparent'}`} />

                <div className='absolute inset-0 flex flex-col justify-end p-6 sm:p-8 lg:p-10'>
                  <p className={`text-xs sm:text-sm uppercase tracking-wider mb-2 ${bigCard.textColor} opacity-90`}>{bigCard.tag}</p>

                  <h2 className={`text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 ${bigCard.textColor}`}>{bigCard.title}</h2>

                  <Link
                    href={bigCard.buttonLink || '/products'}
                    className='self-start px-6 sm:px-8 py-3 bg-white text-gray-900 rounded-full font-semibold text-sm sm:text-base hover:bg-gray-100 transition transform hover:scale-105 shadow-lg'>
                    {bigCard.buttonText}
                  </Link>
                </div>
              </div>
            )}

            {/* MEDIUM SLIDER */}
            {mediumCard && (
              <div className='relative min-h-[360px] sm:min-h-[420px] lg:min-h-[520px] rounded-3xl overflow-hidden shadow-xl group cursor-pointer'>
                <Image
                  src={mediumCard.image}
                  alt={mediumCard.title || 'Hero banner'}
                  fill
                  priority
                  sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
                  className='object-cover transition-opacity duration-300'
                  quality={85}
                  loading='eager'
                />
                <div
                  className={`absolute inset-0 ${
                    mediumCard.gradient || 'bg-gradient-to-t from-purple-900/70 via-purple-600/40 to-transparent'
                  }`}
                />

                <div className='absolute inset-0 flex flex-col justify-end p-6 sm:p-8'>
                  <p className={`text-xs sm:text-sm uppercase tracking-wider mb-1 ${mediumCard.textColor} opacity-90`}>{mediumCard.tag}</p>

                  <h3 className={`text-3xl sm:text-4xl font-bold mb-4 ${mediumCard.textColor}`}>{mediumCard.title}</h3>

                  <Link
                    href={mediumCard.buttonLink || '/products'}
                    className='self-start px-5 sm:px-6 py-2.5 bg-white text-gray-900 rounded-full font-semibold text-sm hover:bg-gray-100 transition transform hover:scale-105 shadow-lg'>
                    {mediumCard.buttonText}
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT SIDE STATIC SMALL CARDS */}
          <div className='flex flex-col gap-4 sm:gap-6'>
            {/* SMALL CARD 1 */}
            {smallCardOne && (
              <div className='relative h-[220px] sm:h-[245px] rounded-3xl overflow-hidden shadow-xl group cursor-pointer'>
                <Image
                  src={smallCardOne.image}
                  alt={smallCardOne.tag || 'Hero banner'}
                  fill
                  sizes='(max-width: 768px) 100vw, 33vw'
                  className='object-cover'
                  quality={85}
                />
                <div
                  className={`absolute inset-0 ${
                    smallCardOne.gradient || 'bg-gradient-to-t from-pink-900/70 via-pink-600/40 to-transparent'
                  }`}
                />

                <div className='absolute inset-0 flex flex-col justify-end p-5 sm:p-6'>
                  <h4 className={`text-lg sm:text-xl font-bold mb-1 ${smallCardOne.textColor}`}>{smallCardOne.tag}</h4>
                  {smallCardOne.subtitle && (
                    <p className={`text-xs sm:text-sm mb-3 ${smallCardOne.textColor} opacity-90`}>{smallCardOne.subtitle}</p>
                  )}

                  <Link
                    href={smallCardOne.buttonLink || '/products'}
                    className='self-start px-4 sm:px-5 py-2 bg-white text-gray-900 rounded-full font-semibold text-xs sm:text-sm hover:bg-gray-100 transition transform hover:scale-105 shadow-lg'>
                    {smallCardOne.buttonText}
                  </Link>
                </div>
              </div>
            )}

            {/* SMALL CARD 2 */}
            {smallCardTwo && (
              <div className='relative h-[220px] sm:h-[250px] rounded-3xl overflow-hidden shadow-xl group cursor-pointer'>
                <Image
                  src={smallCardTwo.image}
                  alt={smallCardTwo.tag || 'Hero banner'}
                  fill
                  sizes='(max-width: 768px) 100vw, 33vw'
                  className='object-cover'
                  quality={85}
                />
                <div
                  className={`absolute inset-0 ${
                    smallCardTwo.gradient || 'bg-gradient-to-t from-blue-900/70 via-blue-600/40 to-transparent'
                  }`}
                />

                <div className='absolute inset-0 flex flex-col justify-end p-5 sm:p-6'>
                  <h4 className={`text-lg sm:text-xl font-bold mb-1 ${smallCardTwo.textColor}`}>{smallCardTwo.tag}</h4>
                  {smallCardTwo.subtitle && (
                    <p className={`text-xs sm:text-sm mb-3 ${smallCardTwo.textColor} opacity-90`}>{smallCardTwo.subtitle}</p>
                  )}

                  <Link
                    href={smallCardTwo.buttonLink || '/products'}
                    className='self-start px-4 sm:px-5 py-2 bg-white text-gray-900 rounded-full font-semibold text-xs sm:text-sm hover:bg-gray-100 transition transform hover:scale-105 shadow-lg'>
                    {smallCardTwo.buttonText}
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
