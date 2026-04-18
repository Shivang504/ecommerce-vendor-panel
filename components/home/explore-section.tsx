'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef } from 'react';
import Link from 'next/link';

export function ExploreSection() {
  const scrollContainer = useRef<HTMLDivElement | null>(null);

  const items = [
    { id: 5, name: 'Leather Handbags', image: 'https://images.unsplash.com/photo-1594633313593-bab3825d0caf?w=600&q=80' },
    { id: 6, name: 'Designer Shoes', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80' },
    { id: 11, name: 'Backpacks', image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80' },
    { id: 6, name: 'Casual Sneakers', image: 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=600&q=80' },
    { id: 12, name: 'Evening Clutches', image: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=600&q=80' },
    { id: 6, name: 'Casual Sneakers', image: 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=600&q=80' },
    { id: 12, name: 'Evening Clutches', image: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=600&q=80' },
    { id: 5, name: 'Leather Handbags', image: 'https://images.unsplash.com/photo-1594633313593-bab3825d0caf?w=600&q=80' },
    { id: 6, name: 'Designer Shoes', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80' },
    { id: 11, name: 'Backpacks', image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80' },
    { id: 6, name: 'Casual Sneakers', image: 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=600&q=80' },
    { id: 12, name: 'Evening Clutches', image: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=600&q=80' },
    { id: 6, name: 'Casual Sneakers', image: 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=600&q=80' },
    { id: 12, name: 'Evening Clutches', image: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=600&q=80' },
  ];

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainer.current) return;
    const amount = scrollContainer.current.clientWidth * 0.8;
    scrollContainer.current.scrollBy({ left: direction === 'right' ? amount : -amount, behavior: 'smooth' });
  };

  return (
    <section className='w-full py-12 sm:py-16 md:py-20 relative'>
      <div className='site-container'>
        <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 sm:mb-10 gap-4'>
          <Link
            href='/products'
            className='text-web font-semibold text-base sm:text-lg hover:underline whitespace-nowrap flex items-center gap-1'>
            View All
          </Link>
          <div className='tex-center'>
            <p className='text-sm sm:text-base text-gray-500 mb-2 uppercase tracking-wide text-center'>Effortless Elegance</p>
            <h2 className='text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 texet-center'>Explore Our Collection of Shoes & Bags</h2>
          </div>
          <div className='flex items-center gap-3 flex-shrink-0'>
            <button onClick={() => scroll('left')} className='p-2 cursor-pointer rounded-full border border-gray-300 bg-white'>
              <ChevronLeft className='w-5 h-5' />
            </button>
            <button onClick={() => scroll('right')} className='p-2 cursor-pointer rounded-full border border-gray-300 bg-white'>
              <ChevronRight className='w-5 h-5' />
            </button>
          </div>
        </div>

        <div ref={scrollContainer} className='flex gap-4 sm:gap-6 overflow-x-auto pb-4 scrollbar-hide'>
          {items.map((item, index) => (
            <Link key={index} href={`/products/${item.id}`} className='flex-shrink-0 w-64 sm:w-72 md:w-80 rounded-2xl overflow-hidden shadow-lg relative group block'>
              {/* IMAGE SECTION */}
              <div className='relative aspect-[3/4]'>
                <img src={item.image} alt={item.name} className='w-full h-full object-cover group-hover:scale-110 transition-transform duration-300' />

                {/* GRADIENT OVERLAY */}
                <div className='absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent'></div>

                {/* OVERLAY TEXT */}
                <div className='absolute bottom-20 left-6 text-white'>
                  <h3 className='text-2xl font-bold'>{item.tagline || 'Relic Relaxed'}</h3>
                </div>

                {/* SHOP NOW BUTTON */}
                <div className='absolute bottom-6 left-6'>
                  <span className='inline-block bg-white text-gray-900 cursor-pointer px-6 py-2 rounded-full font-semibold text-sm hover:bg-gray-100 transition-colors'>
                    Shop Now
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
