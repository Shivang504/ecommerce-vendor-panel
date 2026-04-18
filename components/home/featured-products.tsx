'use client';
import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { WishlistButton } from '@/components/wishlist/wishlist-button';

interface Product {
  id: number | string | null;
  category: string;
  name: string;
  price: string;
  image: string;
}

interface TestimonialSlide {
  _id: string;
  quote: string;
  author: string;
  location: string;
  product: Product;
  leftBanner: string;
  rightBanner: string;
  order: number;
}

export default function FeaturedProducts() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slides, setSlides] = useState<TestimonialSlide[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSlides = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/cms/testimonial-slides');
        if (response.ok) {
          const data = await response.json();
          setSlides(Array.isArray(data) ? data : []);
        } else {
          setSlides([]);
        }
      } catch (error) {
        console.error('Failed to fetch testimonial slides:', error);
        setSlides([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSlides();
  }, []);

  const nextSlide = () => {
    if (slides.length === 0) return;
    setCurrentSlide(prev => (prev === slides.length - 1 ? 0 : prev + 1));
  };

  const prevSlide = () => {
    if (slides.length === 0) return;
    setCurrentSlide(prev => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  if (loading) {
    return (
      <div className='bg-white flex items-center justify-center pb-4 sm:pb-8 min-h-[700px]'>
        <div className='text-gray-500'>Loading...</div>
      </div>
    );
  }

  if (slides.length === 0) {
    return null;
  }

  const currentSlideData = slides[currentSlide];

  return (
    <div className='bg-white flex items-center justify-center pb-4 sm:pb-8'>
      <div className='w-full mx-auto'>
        {/* View All Button */}
        <div className='relative min-h-[450px] sm:min-h-[550px] md:min-h-[650px] lg:min-h-[700px] overflow-hidden'>
          {/* Left Banner (Desktop Only) */}
          {currentSlideData.leftBanner && (
            <Link
              href='/products'
              className='hidden lg:block absolute left-0 top-0 bottom-0 w-1/4 overflow-hidden cursor-pointer hover:opacity-90 transition'>
              <Image
                src={currentSlideData.leftBanner}
                alt='Left banner'
                fill
                sizes='25vw'
                className='object-cover'
                quality={80}
              />
            </Link>
          )}

          {/* Right Banner (Desktop Only) */}
          {currentSlideData.rightBanner && (
            <Link
              href='/products'
              className='hidden lg:block absolute right-0 top-0 bottom-0 w-1/4 overflow-hidden cursor-pointer hover:opacity-90 transition'>
              <Image
                src={currentSlideData.rightBanner}
                alt='Right banner'
                fill
                sizes='25vw'
                className='object-cover'
                quality={80}
              />
            </Link>
          )}

          {/* Center Content */}
          <div className='absolute inset-0 flex flex-col lg:flex-row lg:left-1/4 lg:right-1/4'>
            {/* Product Card */}
            <div className='w-full lg:w-1/2 bg-gradient-to-br from-amber-100 to-yellow-100 flex items-center justify-center p-6 sm:p-8 md:p-10'>
              <div className='relative w-full max-w-xs sm:max-w-sm md:max-w-md mx-auto'>
                <div className='hidden md:block absolute -right-6 -bottom-6 w-24 h-24 bg-amber-200 rotate-45 rounded-lg'></div>

                <div className='relative bg-white rounded-lg shadow-xl p-6'>
                  {currentSlideData.product?.image && (
                    <div className='relative aspect-square bg-gray-100 rounded-lg mb-4 overflow-hidden group'>
                      <Link
                        href={currentSlideData.product?.id ? `/products/${currentSlideData.product.id}` : '/products'}
                        className='block w-full h-full relative'>
                        <Image
                          src={currentSlideData.product.image}
                          alt={currentSlideData.product.name || 'Product'}
                          fill
                          sizes='(max-width: 768px) 100vw, 50vw'
                          className='object-cover group-hover:scale-110 transition-transform duration-300'
                          quality={85}
                        />
                      </Link>
                      {currentSlideData.product?.id && (
                        <div className='absolute top-3 right-3 opacity-0 group-hover:opacity-100 z-10 transition'>
                          <WishlistButton productId={String(currentSlideData.product.id)} variant='icon' size='md' />
                        </div>
                      )}
                    </div>
                  )}

                  {currentSlideData.product?.id && (
                    <Link
                      href={`/products/${currentSlideData.product.id}`}
                      className='block w-full mt-2 bg-gray-900 text-white py-2.5 rounded-full text-sm font-semibold shadow text-center hover:bg-gray-800 transition'>
                      View Details
                    </Link>
                  )}

                  {currentSlideData.product?.category && (
                    <p className='text-sm text-gray-500 mt-4 uppercase tracking-wide'>{currentSlideData.product.category}</p>
                  )}
                  {currentSlideData.product?.name && (
                    <h3 className='text-lg font-bold text-gray-900'>{currentSlideData.product.name}</h3>
                  )}
                  {currentSlideData.product?.price && (
                    <p className='text-xl font-bold text-web'>{currentSlideData.product.price}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Testimonial Section */}
            <div className='w-full lg:w-1/2 bg-web flex items-center justify-center p-6 sm:p-8 md:p-10'>
              <div className='text-white max-w-md'>
                <h2 className='text-2xl sm:text-3xl font-bold mb-6'>Customer Favorites</h2>

                <div className='mb-6'>
                  <p className='text-lg sm:text-xl md:text-2xl font-medium leading-relaxed mb-6'>"{currentSlideData.quote}"</p>

                  <div>
                    <p className='font-bold text-lg md:text-xl'>{currentSlideData.author}</p>
                    {currentSlideData.location && (
                      <p className='text-white/90 text-base'>{currentSlideData.location}</p>
                    )}
                  </div>
                </div>

                {/* Navigation */}
                <div className='flex items-center gap-4'>
                  <button onClick={prevSlide} className='p-2 rounded-full border-2 border-white/50 bg-white/10' aria-label='Previous slide'>
                    <ChevronLeft className='w-5 h-5 md:w-6 md:h-6' />
                  </button>

                  <span className='text-base md:text-lg font-medium'>
                    {currentSlide + 1}/{slides.length}
                  </span>

                  <button onClick={nextSlide} className='p-2 rounded-full border-2 border-white/50 bg-white/10' aria-label='Next slide'>
                    <ChevronRight className='w-5 h-5 md:w-6 md:h-6' />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
