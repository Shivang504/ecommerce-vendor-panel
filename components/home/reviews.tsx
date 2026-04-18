'use client';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay } from 'swiper/modules';
import 'swiper/css';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, RotateCcw, ShieldCheck, Star, Truck } from 'lucide-react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function TestimonialSlider() {
  const data = [
    {
      id: 1,
      name: 'Sarah Martinez',
      role: 'Verified Buyer',
      rating: 5,
      text: 'Absolutely love this jacket! The quality is exceptional and it fits perfectly. Highly recommend to anyone looking for premium outerwear.',
      product: 'Premium Wool Overcoat',
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80',
    },
    {
      id: 2,
      name: 'James Wilson',
      role: 'Verified Buyer',
      rating: 5,
      text: 'Outstanding quality and craftsmanship. The attention to detail is remarkable. This is now my go-to piece for any occasion.',
      product: 'Classic Denim Jacket',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
    },
    {
      id: 3,
      name: 'Emily Chen',
      role: 'Verified Buyer',
      rating: 5,
      text: 'Exceeded all my expectations! The material feels luxurious and the design is timeless. Worth every penny and more.',
      product: 'Elegant Evening Dress',
      image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80',
    },
    {
      id: 4,
      name: 'James Wilson',
      role: 'Verified Buyer',
      rating: 5,
      text: 'Outstanding quality and craftsmanship. The attention to detail is remarkable. This is now my go-to piece for any occasion.',
      product: 'Classic Denim Jacket',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
    },
    {
      id: 6,
      name: 'Emily Chen',
      role: 'Verified Buyer',
      rating: 5,
      text: 'Exceeded all my expectations! The material feels luxurious and the design is timeless. Worth every penny and more.',
      product: 'Elegant Evening Dress',
      image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80',
    },
  ];

  return (
    <div className='w-full bg-web py-4 sm:py-8'>
      <div className='site-container'>
        <div className='flex justify-between items-center mb-8 sm:mb-10'>
          <h2 className='text-white text-2xl sm:text-3xl font-bold'>What Our Customers Say</h2>

          <div className='flex items-center gap-3'>
            <button className='swiper-collections-button-prev p-2 text-white cursor-pointer rounded-full border border-gray-300'>
              <ChevronLeft className='w-5 h-5' />
            </button>
            <button className='swiper-collections-button-next  text-white p-2 cursor-pointer rounded-full border border-gray-300'>
              <ChevronRight className='w-5 h-5' />
            </button>
          </div>
        </div>

        <Swiper
          spaceBetween={15}
          slidesPerView={1}
          breakpoints={{
            640: { slidesPerView: 2, spaceBetween: 20 },
            1024: { slidesPerView: 3, spaceBetween: 20 },
          }}
          className='mySwiper'>
          {data.map(item => (
            <SwiperSlide key={item.id}>
              <Card className='rounded-2xl p-4 shadow bg-white'>
                <CardContent>
                  <div className='flex items-center gap-3 mb-3'>
                    <div className='relative w-16 h-16 rounded-xl overflow-hidden'>
                      <Image src={item.image} alt='profile' fill className='object-cover' sizes='64px' quality={80} />
                    </div>
                    <div>
                      <h3 className='font-semibold text-gray-900'>{item.name}</h3>
                      <p className='text-sm text-gray-500'>{item.role}</p>
                    </div>
                  </div>

                  <div className='flex text-yellow-600 mb-3 gap-2'>
                    {Array.from({ length: item.rating }).map((_, index) => (
                      <Star key={index} size={18} />
                    ))}
                  </div>

                  <p className='text-gray-700 text-sm mb-4'>{item.text}</p>

                  <Link href='/products' className='flex items-center gap-2 pt-2 border-t hover:opacity-80 transition'>
                    <div className='relative w-10 h-10 rounded overflow-hidden'>
                      <Image src={item.image} alt='product' fill className='object-cover' sizes='40px' quality={80} />
                    </div>
                    <p className='text-sm font-medium'>{item.product}</p>
                  </Link>
                </CardContent>
              </Card>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </div>
  );
}

export function PopularSearchSlider() {
  const items = [
    { id: 1, label: 'Wool Overcoats', image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=200&q=80' },
    { id: 2, label: 'Designer Handbags', image: 'https://images.unsplash.com/photo-1594633313593-bab3825d0caf?w=200&q=80' },
    { id: 3, label: 'Leather Boots', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&q=80' },
    { id: 4, label: 'Evening Dresses', image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=200&q=80' },
    { id: 5, label: 'Luxury Watches', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&q=80' },
    { id: 6, label: 'Wool Overcoats', image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=200&q=80' },
    { id: 7, label: 'Designer Handbags', image: 'https://images.unsplash.com/photo-1594633313593-bab3825d0caf?w=200&q=80' },
    { id: 8, label: 'Leather Boots', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&q=80' },
    { id: 9, label: 'Evening Dresses', image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=200&q=80' },
    { id: 10, label: 'Luxury Watches', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&q=80' },
  ];

  return (
    <div className='w-full py-4 sm:py-8 site-container'>
      <h2 className='text-center text-2xl sm:text-3xl text-web font-bold mb-8 sm:mb-10'>Popular Searches</h2>

      <div className='relative'>
        <Swiper
          spaceBetween={10}
          slidesPerView={2}
          breakpoints={{
            640: { slidesPerView: 3, spaceBetween: 15 },
            768: { slidesPerView: 4, spaceBetween: 20 },
            1024: { slidesPerView: 5, spaceBetween: 20 },
          }}
          navigation={{
            nextEl: '.swiper-collections-button-next',
            prevEl: '.swiper-collections-button-prev',
          }}
          className='mySwiper'>
          {items.map(item => (
            <SwiperSlide key={item.id}>
              <Link
                href='/products'
                className='flex items-center gap-2 border rounded-full pl-3 pr-4 py-2 shadow-sm bg-white cursor-pointer hover:bg-gray-50 transition'>
                <div className='relative w-8 h-8 rounded-full overflow-hidden'>
                  <Image src={item.image} alt='item' fill className='object-cover' sizes='32px' quality={80} />
                </div>
                <p className='text-sm font-medium whitespace-nowrap'>{item.label}</p>
              </Link>
            </SwiperSlide>
          ))}
        </Swiper>

        {/* Left Button */}
      </div>
    </div>
  );
}

export function Brands() {
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBrands = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/brands');
      const data = await response.json();

      if (Array.isArray(data)) {
        // Filter only active brands and limit to show in brands section
        const activeBrands = data.filter(brand => brand.status === 'active').slice(0, 12);
        setBrands(activeBrands);
      } else {
        setBrands([]);
      }
    } catch (error) {
      console.error('Failed to fetch brands:', error);
      setBrands([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  const getBrandLink = (brand: any) => {
    return `/products?brand=${encodeURIComponent(brand.name)}`;
  };

  if (loading) {
    return (
      <div className='py-4 sm:py-8 site-container'>
        <h2 className='text-center text-2xl sm:text-[36px] font-bold mb-8 sm:mb-10 text-web'>Shop By Brands</h2>
        <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4'>
          {[...Array(6)].map((_, index) => (
            <div key={index} className='h-24 sm:h-32 bg-gray-200 rounded-lg animate-pulse'></div>
          ))}
        </div>
      </div>
    );
  }

  if (brands.length === 0) {
    return (
      <div className='py-4 sm:py-8 site-container'>
        <h2 className='text-center text-2xl sm:text-[36px] font-bold mb-8 sm:mb-10 text-web'>Shop By Brands</h2>
        <div className='text-center py-8'>
          <div className='text-gray-500 text-lg mb-2'>No brands found</div>
          <div className='text-gray-400 text-sm'>Brands will appear here once they are added</div>
        </div>
      </div>
    );
  }

  return (
    <div className='site-container py-4 sm:py-8'>
      <h2 className='text-center text-2xl sm:text-[36px] font-bold mb-8 sm:mb-10 text-web'>Shop By Brands</h2>

      <Swiper
        modules={[Autoplay]}
        spaceBetween={20}
        slidesPerView={2}
        autoplay={{
          delay: 3000,
          disableOnInteraction: false,
          pauseOnMouseEnter: true,
        }}
        loop={true}
        breakpoints={{
          640: { slidesPerView: 3, spaceBetween: 30 },
          768: { slidesPerView: 4, spaceBetween: 30 },
          1024: { slidesPerView: 6, spaceBetween: 30 },
        }}
        className='flex items-center'>
        {brands.map((brand, index) => (
          <SwiperSlide key={brand._id || index}>
            <Link href={getBrandLink(brand)} className='block group'>
              <div className='bg-white border border-gray-200 rounded-lg p-4 sm:p-6 hover:shadow-lg hover:border-web transition-all duration-300 h-full flex flex-col items-center justify-center min-h-[120px] sm:min-h-[150px]'>
                {brand.image ? (
                  <div className='relative w-full h-16 sm:h-20 mb-3 flex items-center justify-center'>
                    <Image
                      src={brand.image}
                      alt={brand.name || 'Brand'}
                      fill
                      className='object-contain group-hover:scale-105 transition-transform duration-300'
                      sizes='(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw'
                    />
                  </div>
                ) : (
                  <div className='w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-web/10 flex items-center justify-center mb-3 group-hover:bg-web/20 transition-colors'>
                    <span className='text-web text-xl sm:text-2xl font-bold'>{brand.name ? brand.name.charAt(0).toUpperCase() : 'B'}</span>
                  </div>
                )}
                <p className='text-sm sm:text-base font-medium text-gray-700 group-hover:text-web transition-colors text-center line-clamp-2'>
                  {brand.name}
                </p>
              </div>
            </Link>
          </SwiperSlide>
        ))}
      </Swiper>

      {/* View All Brands Link */}
      <div className='text-center mt-8'>
        <Link
          href='/products'
          className='inline-flex items-center gap-2 bg-web text-white px-6 py-3 rounded-lg font-semibold hover:bg-web/90 transition-colors'>
          View All Brands
          <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
          </svg>
        </Link>
      </div>
    </div>
  );
}

export function FeatureSection() {
  const features = [
    {
      icon: <Truck className='w-12 h-12' />,
      title: 'Free Shipping',
      desc: 'Free express shipping on all orders over $120. Fast and reliable delivery to your doorstep.',
    },
    {
      icon: <RotateCcw className='w-12 h-12' />,
      title: '30-Day Returns',
      desc: 'Not satisfied? Return any item within 30 days for a full refund. No questions asked.',
    },
    {
      icon: <ShieldCheck className='w-12 h-12' />,
      title: 'Secure Payment',
      desc: 'Your payment information is encrypted and secure. We accept all major credit cards and PayPal.',
    },
  ];

  return (
    <section className='py-4 sm:py-8 bg-white border-t border-gray-200'>
      <div className='site-container grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12 text-center'>
        {features.map((f, idx) => (
          <div key={idx} className='flex flex-col items-center gap-4'>
            <div className='text-web'>{f.icon}</div>
            <h3 className='font-bold text-xl text-gray-900'>{f.title}</h3>
            <p className='text-base text-gray-600 max-w-sm leading-relaxed'>{f.desc}</p>
            <Link href='/products' className='text-base font-semibold flex items-center gap-2 mt-2 text-web hover:underline'>
              Learn More
              <ChevronRight />
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ShopThisLook() {
  const [selectedVariants, setSelectedVariants] = useState({});
  const [looks, setLooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSeasonalBanners = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/cms/seasonal-banners');
        if (response.ok) {
          const data = await response.json();
          setLooks(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error('Failed to fetch seasonal banners:', error);
        setLooks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSeasonalBanners();
  }, []);

  const handleVariantChange = (productId: string, variant: string) => {
    setSelectedVariants(prev => ({ ...prev, [productId]: variant }));
  };

  const addAllToCart = (products: any) => {
    console.log('Adding to cart:', products);
    alert('Products added to cart!');
  };

  if (loading) {
    return null;
  }

  if (looks.length === 0) {
    return null;
  }

  return (
    <>
      <div className='bg-gradient-to-b from-gray-50 to-white pt-4 sm:pt-12 mt-6'>
        <div className='site-container'>
          {looks.map((look, index) => (
            <div key={look.id || look._id || `look-${index}`} className={`mb-24 ${index > 0 ? 'mt-32' : ''}`}>
              <div className='text-center mb-12'>
                <p className='text-sm uppercase tracking-widest text-gray-500 mb-2'>ICONIC AESTHETIC</p>
                <h2 className='text-center text-2xl sm:text-[36px] font-bold mb-8 sm:mb-10 text-web'>{look.title}</h2>
              </div>

              <div className='grid lg:grid-cols-2 gap-12 items-center'>
                <div className='order-2 lg:order-1'>
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-6'>
                    {look.products.map((product, productIndex) => (
                      <div
                        key={product.id || product._id || `product-${index}-${productIndex}`}
                        className='bg-white rounded-2xl shadow-md border border-gray-100 hover:shadow-lg transition-all duration-300'>
                        <Link
                          href={`/products/${product.id}`}
                          className='block relative h-[140px] overflow-hidden rounded-t-2xl bg-gray-50 group'>
                          <Image
                            src={product.image}
                            alt={product.name}
                            fill
                            sizes='(max-width: 640px) 50vw, 25vw'
                            className='object-cover transition-transform duration-500 group-hover:scale-105'
                            quality={85}
                          />
                          <div className='absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full shadow-sm'>
                            <span className='text-[10px] font-medium text-gray-700'>{product.brand}</span>
                          </div>
                        </Link>

                        <div className='px-5 py-4 space-y-1.5'>
                          {product.brand && <p className='text-[11px] uppercase tracking-wide text-gray-500'>{product.brand}</p>}
                          <h3 className='font-semibold text-gray-900 text-base leading-snug'>{product.name}</h3>
                          <p className='text-xl font-bold text-gray-900'>
                            ₹{typeof product.price === 'number' ? product.price.toFixed(2) : product.price}
                          </p>

                          <Link
                            href={`/products/${product.id}`}
                            className='block w-full bg-white border border-web text-web hover:text-white cursor-pointer px-5 py-2 rounded-full font-semibold hover:bg-web transition-all duration-300 text-center'>
                            Add to Cart
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Hero Image Section */}
                <div className='order-1 lg:order-2'>
                  <Link
                    href='/products'
                    className='block relative rounded-3xl overflow-hidden shadow-2xl cursor-pointer hover:opacity-90 transition h-[600px]'>
                    <Image
                      src={look.heroImage}
                      alt={look.title}
                      fill
                      sizes='(max-width: 1024px) 100vw, 50vw'
                      className='object-cover'
                      quality={85}
                    />
                    <div className='absolute inset-0 bg-gradient-to-t from-black/20 to-transparent'></div>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
