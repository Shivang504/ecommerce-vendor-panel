'use client';

import { useState, useEffect } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import Link from 'next/link';
import Image from 'next/image';

import 'swiper/css';

interface Category {
  _id: string;
  name: string;
  slug?: string;
  image?: string;
  status?: string;
  description?: string;
}

export function CollectionsSection() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);


  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/categories');
      const data = await response.json();

      if (Array.isArray(data)) {
        // Filter only active categories and limit to show in collections
        const activeCategories = data.filter(cat => cat.status === 'active').slice(0, 12);
        setCategories(activeCategories);
      } else {
        setCategories([]);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const getCategoryImage = (category: Category) => {
    return category.image || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=600&q=80';
  };

  const getCategoryLink = (category: Category) => {
    // Check if it's K Store or Skin & Beauty - route to dedicated pages
    const normalizedName = category.name.toLowerCase().replace(/[-\s&]/g, '');
    if (normalizedName === 'kstore' || normalizedName === 'k-store') {
      return '/k-store';
    }
    if (normalizedName === 'skinbeauty' || normalizedName === 'skin&beauty') {
      return '/skin-beauty';
    }
    // For other categories, go to product list
    return `/products?category=${encodeURIComponent(category.name)}`;
  };

  return (
    <section className='site-container py-4 sm:py-8'>
      <div className='flex items-center justify-between mb-8 sm:mb-10'>
        <h2 className='text-3xl sm:text-4xl font-bold text-web'>Shop by Collections</h2>

        <div className='flex items-center gap-4'>
          <Link
            href='/categories'
            className='text-web hidden sm:block font-semibold text-base sm:text-lg hover:underline whitespace-nowrap flex items-center gap-1'>
            View All
          </Link>
          <button className='swiper-collections-button-prev p-2 rounded-full border border-gray-300 hover:bg-gray-50 transition-colors'>
            <ChevronLeft className='w-5 h-5 text-gray-600' />
          </button>
          <button className='swiper-collections-button-next p-2 rounded-full border border-gray-300 hover:bg-gray-50 transition-colors'>
            <ChevronRight className='w-5 h-5 text-gray-600' />
          </button>
        </div>
      </div>

      {loading ? (
        <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6'>
          {[...Array(6)].map((_, index) => (
            <div key={index} className='bg-white rounded-2xl overflow-hidden shadow-md border border-gray-200'>
              <div className='h-64 bg-gray-200 animate-pulse'></div>
              <div className='p-5'>
                <div className='h-5 bg-gray-200 rounded animate-pulse'></div>
              </div>
            </div>
          ))}
        </div>
      ) : categories.length > 0 ? (
        <>
          {/* Swiper Slider */}
          <Swiper
            modules={[Navigation]}
            navigation={{
              nextEl: '.swiper-collections-button-next',
              prevEl: '.swiper-collections-button-prev',
            }}
            spaceBetween={24}
            slidesPerView={1.4}
            breakpoints={{
              640: { slidesPerView: 2.2, spaceBetween: 20 },
              768: { slidesPerView: 3, spaceBetween: 24 },
              1024: { slidesPerView: 6, spaceBetween: 24 },
            }}
            className='pb-6'>
            {categories.map((category, index) => (
              <SwiperSlide key={category._id || index}>
                <Link href={getCategoryLink(category)} className='block'>
                  <div className='group bg-white rounded-2xl border border-gray-200 overflow-hidden cursor-pointer'>
                    {/* Image */}
                    <div className='relative h-56 bg-gray-100 overflow-hidden'>
                      <Image
                        src={getCategoryImage(category)}
                        alt={category.name}
                        fill
                        sizes='(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw'
                        className='object-cover object-center transition-transform duration-300 group-hover:scale-105'
                        quality={80}
                      />
                    </div>

                    {/* Content */}
                    <div className='flex items-center justify-between p-4 bg-white'>
                      <p className='text-lg font-semibold text-gray-900 truncate max-w-[80%]'>{category.name}</p>
                      <ArrowRight className='w-5 h-5 text-gray-500 transition-colors duration-200 group-hover:text-black' />
                    </div>
                  </div>
                </Link>
              </SwiperSlide>
            ))}
          </Swiper>

          {/* View All Categories Link */}
          {/* <div className='text-center mt-8'>
            <Link
              href='/categories'
              className='inline-flex items-center gap-2 bg-web text-white px-6 py-3 rounded-lg font-semibold hover:bg-web/90 transition-colors'>
              View All Categories
              <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
              </svg>
            </Link>
          </div> */}
        </>
      ) : (
        <div className='text-center py-12'>
          <div className='text-gray-500 text-lg mb-2'>No categories found</div>
          <div className='text-gray-400 text-sm'>Categories will appear here once they are added</div>
        </div>
      )}
    </section>
  );
}
