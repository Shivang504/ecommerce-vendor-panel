'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { WishlistButton } from '@/components/wishlist/wishlist-button';

interface MonthlyBanner {
  title: string;
  description: string;
  categories: string[];
  products: Array<{
    id: number | string;
    name: string;
    price: string;
    image: string;
  }>;
}

export default function OctoberCleanerFashion() {
  const [bannerData, setBannerData] = useState<MonthlyBanner | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMonthlyBanner = async () => {
      try {
        setLoading(true);
        const currentDate = new Date();
        const response = await fetch(
          `/api/cms/monthly-banners?month=${currentDate.getMonth() + 1}&year=${currentDate.getFullYear()}`
        );
        if (response.ok) {
          const data = await response.json();
          if (data) {
            setBannerData(data);
          }
        }
      } catch (error) {
        console.error('Failed to fetch monthly banner:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMonthlyBanner();
  }, []);

  if (loading) {
    return null;
  }

  if (!bannerData) {
    return null;
  }

  return (
    <div className='site-container py-20 grid grid-cols-1 lg:grid-cols-3 gap-10'>
      {/* Left Section */}
      <div className='flex flex-col justify-center gap-4'>
        <p className='text-sm text-gray-500'>Seasonal Edition</p>
        <h1 className='text-4xl font-bold'>{bannerData.title}</h1>
        <p className='text-gray-600 text-sm max-w-sm'>{bannerData.description}</p>

        {bannerData.categories && bannerData.categories.length > 0 && (
          <ul className='mt-4 text-gray-700 text-sm space-y-2'>
            {bannerData.categories.map((category, index) => (
              <li key={index}>{category}</li>
            ))}
          </ul>
        )}

        <Link
          href='/products'
          className='w-fit bg-white hover:bg-web border border-web text-web hover:text-white mt-4 rounded-full px-6 py-2 font-semibold inline-block transition'>
          Shop All Products
        </Link>
      </div>

      {/* Product Cards */}
      {bannerData.products.map(product => (
        <div key={product.id} className='block rounded-2xl overflow-hidden !h-fit shadow-md hover:shadow-lg transition group'>
          <CardContent className='p-0 relative'>
            <Link href={`/products/${product.id}`} className='block'>
              <Image src={product.image || '/placeholder.jpg'} alt={product.name} width={500} height={500} className='object-cover w-full h-80 group-hover:scale-110 transition-transform duration-300' />
            </Link>
            
            <div className='absolute top-3 right-3 opacity-0 group-hover:opacity-100 z-10 transition'>
              <WishlistButton productId={String(product.id)} variant='icon' size='md' />
            </div>

            <div className='absolute bottom-0 left-0 right-0 bg-black/40 text-white p-4'>
              <h2 className='text-lg font-semibold'>{product.name}</h2>
              <p className='font-bold mt-1'>{product.price}</p>

              <Link href={`/products/${product.id}`}>
                <span className='mt-3 inline-block rounded-full bg-white text-black px-4 py-1 text-sm hover:bg-gray-100 font-semibold transition cursor-pointer'>
                  Shop Now
                </span>
              </Link>
            </div>
          </CardContent>
        </div>
      ))}
    </div>
  );
}
