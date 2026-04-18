'use client';

import { Skeleton } from '@/components/ui/skeleton';

export function HomeSkeleton() {
  return (
    <div className='space-y-0'>
      {/* Hero Section Skeleton */}
      <section className='px-4 sm:px-6 lg:px-8 py-8 sm:py-10 pt-5'>
        <div className='max-w-[1400px] mx-auto'>
          <div className='grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6'>
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:col-span-2 gap-4 sm:gap-6'>
              <Skeleton className='min-h-[360px] sm:min-h-[420px] lg:min-h-[520px] rounded-3xl' />
              <Skeleton className='min-h-[360px] sm:min-h-[420px] lg:min-h-[520px] rounded-3xl' />
            </div>
            <div className='flex flex-col gap-4 sm:gap-6'>
              <Skeleton className='h-[220px] sm:h-[245px] rounded-3xl' />
              <Skeleton className='h-[220px] sm:h-[250px] rounded-3xl' />
            </div>
          </div>
        </div>
      </section>

      {/* Collections Section Skeleton */}
      <section className='px-4 sm:px-6 lg:px-8 py-8 sm:py-10'>
        <div className='max-w-[1400px] mx-auto'>
          <Skeleton className='h-10 w-64 mb-8' />
          <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6'>
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className='aspect-square rounded-2xl' />
            ))}
          </div>
        </div>
      </section>

      {/* Promo Section Skeleton */}
      <section className='max-w-[1400px] mx-auto px-4 py-4 sm:py-8'>
        <Skeleton className='h-10 w-48 mb-8' />
        <div className='bg-gradient-to-r from-amber-100 to-yellow-100 rounded-2xl px-6 sm:px-8 md:px-12 py-10 sm:py-12'>
          <div className='flex flex-col gap-10 md:gap-12 lg:flex-row lg:items-center lg:justify-between'>
            <div className='text-center lg:text-left max-w-full lg:max-w-[340px] mx-auto lg:mx-0 space-y-4'>
              <Skeleton className='h-6 w-32' />
              <Skeleton className='h-10 w-full' />
            </div>
            <div className='flex flex-wrap items-center justify-center gap-4'>
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className='h-16 w-16 rounded-xl' />
              ))}
            </div>
            <div className='flex flex-col items-center lg:items-end gap-4'>
              <Skeleton className='h-5 w-48' />
              <Skeleton className='h-12 w-40 rounded-full' />
            </div>
          </div>
        </div>
      </section>

      {/* Feature Collection Skeleton */}
      <section className='px-4 sm:px-6 lg:px-8 py-8 sm:py-10'>
        <div className='max-w-[1400px] mx-auto'>
          <div className='flex gap-4 mb-6'>
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className='h-10 w-24 rounded-full' />
            ))}
          </div>
          <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6'>
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className='space-y-3'>
                <Skeleton className='aspect-square rounded-lg' />
                <Skeleton className='h-4 w-3/4' />
                <Skeleton className='h-4 w-1/2' />
                <Skeleton className='h-5 w-1/3' />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Explore Section Skeleton */}
      <section className='px-4 sm:px-6 lg:px-8 py-8 sm:py-10'>
        <div className='max-w-[1400px] mx-auto'>
          <Skeleton className='h-10 w-64 mb-8' />
          <div className='flex gap-4 sm:gap-6 overflow-x-auto pb-4'>
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className='w-64 sm:w-72 md:w-80 aspect-[3/4] rounded-2xl flex-shrink-0' />
            ))}
          </div>
        </div>
      </section>

      {/* Quality Banner Skeleton */}
      <section className='bg-web py-4 sm:py-8'>
        <div className='max-w-[1400px] mx-auto px-4'>
          <div className='grid grid-cols-1 md:grid-cols-4 gap-8 sm:gap-10 items-center'>
            <Skeleton className='h-20 w-full' />
            <div className='md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-10'>
              {[1, 2, 3].map(i => (
                <div key={i} className='flex flex-col items-center text-center space-y-4'>
                  <Skeleton className='w-14 h-14 rounded-full' />
                  <Skeleton className='h-6 w-32' />
                  <Skeleton className='h-4 w-full' />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products Skeleton */}
      <section className='bg-white pb-4 sm:pb-8'>
        <div className='w-full mx-auto'>
          <div className='relative min-h-[450px] sm:min-h-[550px] md:min-h-[650px] lg:min-h-[700px]'>
            <div className='absolute inset-0 flex flex-col lg:flex-row lg:left-1/4 lg:right-1/4'>
              <div className='w-full lg:w-1/2 bg-gradient-to-br from-amber-100 to-yellow-100 flex items-center justify-center p-6 sm:p-8 md:p-10'>
                <div className='w-full max-w-xs sm:max-w-sm md:max-w-md mx-auto space-y-4'>
                  <Skeleton className='aspect-square rounded-lg' />
                  <Skeleton className='h-10 w-full rounded-full' />
                  <Skeleton className='h-4 w-24' />
                  <Skeleton className='h-6 w-3/4' />
                  <Skeleton className='h-5 w-20' />
                </div>
              </div>
              <div className='w-full lg:w-1/2 bg-web flex items-center justify-center p-6 sm:p-8 md:p-10'>
                <div className='text-white max-w-md space-y-6'>
                  <Skeleton className='h-8 w-48' />
                  <Skeleton className='h-6 w-full' />
                  <Skeleton className='h-6 w-3/4' />
                  <Skeleton className='h-6 w-1/2' />
                  <div className='flex items-center gap-4'>
                    <Skeleton className='h-10 w-10 rounded-full' />
                    <Skeleton className='h-5 w-12' />
                    <Skeleton className='h-10 w-10 rounded-full' />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Monthly Banner Skeleton */}
      <section className='max-w-[1400px] mx-auto px-10 py-20'>
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-10'>
          <div className='space-y-4'>
            <Skeleton className='h-4 w-32' />
            <Skeleton className='h-10 w-full' />
            <Skeleton className='h-4 w-3/4' />
            <div className='space-y-2'>
              <Skeleton className='h-4 w-40' />
              <Skeleton className='h-4 w-40' />
              <Skeleton className='h-4 w-40' />
            </div>
            <Skeleton className='h-10 w-40 rounded-full' />
          </div>
          {[1, 2].map(i => (
            <Skeleton key={i} className='h-80 rounded-2xl' />
          ))}
        </div>
      </section>
    </div>
  );
}
