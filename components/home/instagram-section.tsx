'use client';

import Link from 'next/link';
import { ChevronRight, Instagram } from 'lucide-react';

export function InstagramSection() {
  const posts = [
    {
      image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&q=80',
      username: '@fashionstore',
    },
    {
      image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&q=80',
      username: '@fashionstore',
    },
    {
      image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&q=80',
      username: '@fashionstore',
    },
    {
      image: 'https://images.unsplash.com/photo-1594633313593-bab3825d0caf?w=600&q=80',
      username: '@fashionstore',
    },
    {
      image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80',
      username: '@fashionstore',
    },
  ];

  return (
    <section className='site-container py-4 sm:py-8'>
      <div className='flex items-center lg:pr-3 justify-between mb-8 sm:mb-10'>
        <h2 className='text-3xl sm:text-4xl font-bold text-web'>Follow Us on Instagram</h2>
        <Link href='#' className='text-web font-semibold text-base sm:text-lg'>
          <div className='flex flex-row justify-center gap-2'>
            {' '}
            View All <ChevronRight />
          </div>
        </Link>
      </div>
      <div className='flex gap-4 sm:gap-6 overflow-x-auto pb-4 scrollbar-hide'>
        {posts.map((post, index) => (
          <Link key={index} href='/products' className='flex-shrink-0 w-64 sm:w-72 md:w-80 relative block'>
            <div className='relative aspect-square rounded-lg overflow-hidden bg-gray-100 group'>
              <img
                src={post.image}
                alt={`Instagram post ${index + 1}`}
                className='w-full h-full object-cover group-hover:scale-110 transition-transform duration-300'
              />
              <div className='absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition'>
                <Instagram className='w-8 h-8 sm:w-10 sm:h-10 text-white' />
              </div>
            </div>
            <div className='absolute bottom-3 left-3 flex items-center gap-2 text-white text-sm'>
              <Instagram className='w-4 h-4' />
              <span className='font-medium'>{post.username}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
