'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getProductUrl } from '@/app/utils/helper';
import { useRouter } from 'next/navigation';
import { WishlistButton } from '@/components/wishlist/wishlist-button';

interface Product {
  _id: string;
  id?: string;
  name: string;
  sellingPrice?: number;
  price?: number;
  mainImage?: string;
  category?: string;
  status?: string;
  trending?: boolean;
  bestSeller?: boolean;
  createdAt?: string;
  urlSlug?: string | null;
  originalPrice?: any;
}

export function FeatureCollection() {
  const [activeTab, setActiveTab] = useState('new-items');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchProducts = async (type: string) => {
    try {
      setLoading(true);
      let url = '/api/products';

      // Add query parameters based on the tab
      const params = new URLSearchParams();

      if (type === 'trending') {
        params.append('trending', 'true');
      } else if (type === 'bestsellers') {
        params.append('bestSeller', 'true');
      } else if (type === 'new-items') {
        params.append('sortBy', 'createdAt');
        params.append('sortOrder', 'desc');
      }

      params.append('limit', '8');
      params.append('lightweight', 'true'); // Use lightweight mode for home page

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (Array.isArray(data)) {
        setProducts(data);
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts(activeTab);
  }, [activeTab]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const getProductPrice = (product: Product) => {
    return product.sellingPrice || product.price || 0;
  };

  const getProductImage = (product: Product) => {
    return product.mainImage || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=600&q=80';
  };

  return (
    <section className='site-container py-4 sm:py-8'>
      <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 sm:mb-10 gap-4'>
        <h2 className='text-3xl sm:text-4xl font-bold text-web'>Feature Collection</h2>
        {/* <Link
          href='/products'
          className='text-web font-semibold text-base sm:text-lg hover:underline whitespace-nowrap flex items-center gap-1'>
          View All
        </Link> */}
        <div className='flex items-center gap-4 sm:gap-6 overflow-x-auto w-full sm:w-auto scrollbar-hide pb-2'>
          <button
            onClick={() => handleTabChange('new-items')}
            className={`pb-2 border-b-2 whitespace-nowrap cursor-pointer text-base sm:text-lg ${
              activeTab === 'new-items' ? 'border-web text-web font-semibold' : 'border-transparent text-gray-600'
            }`}>
            New Items
          </button>
          <button
            onClick={() => handleTabChange('trending')}
            className={`pb-2 border-b-2 whitespace-nowrap  cursor-pointer text-base sm:text-lg ${
              activeTab === 'trending' ? 'border-web text-web font-semibold' : 'border-transparent text-gray-600'
            }`}>
            Trending Now
          </button>
          <button
            onClick={() => handleTabChange('bestsellers')}
            className={`pb-2 border-b-2 whitespace-nowrap cursor-pointer text-base sm:text-lg ${
              activeTab === 'bestsellers' ? 'border-web text-web font-semibold' : 'border-transparent text-gray-600'
            }`}>
            Best Sellers
          </button>
          <button
            onClick={() => router.push('/products')}
            className={`pb-2 border-b-2 whitespace-nowrap cursor-pointer text-base sm:text-lg hover:border-web border-b ${
              activeTab === 'view all' ? 'border-web text-web font-semibold' : 'border-transparent text-gray-600'
            }`}>
            View All{' '}
          </button>
        </div>
      </div>

      {loading ? (
        <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6'>
          {[...Array(8)].map((_, index) => (
            <div key={index} className='block bg-white rounded-lg overflow-hidden border border-gray-100'>
              <div className='relative overflow-hidden bg-gray-200 aspect-square animate-pulse'></div>
              <div className='p-4'>
                <div className='h-3 bg-gray-200 rounded mb-2 animate-pulse'></div>
                <div className='h-4 bg-gray-200 rounded mb-2 animate-pulse'></div>
                <div className='h-5 bg-gray-200 rounded animate-pulse'></div>
              </div>
            </div>
          ))}
        </div>
      ) : products.length > 0 ? (
        <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6'>
          {products.map((product, index) => {
            const productId = product.id || product._id;
            return (
              <div
                key={productId || index}
                className='block bg-white rounded-lg overflow-hidden border border-gray-100 hover:shadow-lg transition group'>
                <div className='relative overflow-hidden bg-gray-100 aspect-square'>
                  <Link href={getProductUrl(productId, product.urlSlug)} className='block w-full h-full relative'>
                    <Image
                      src={getProductImage(product)}
                      alt={product.name}
                      fill
                      sizes='(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw'
                      className='object-cover group-hover:scale-110 transition-transform duration-300'
                      quality={85}
                    />
                  </Link>
                  <div className='absolute top-3 right-3 opacity-0 group-hover:opacity-100 z-10 transition'>
                    <WishlistButton productId={productId} variant='icon' size='md' />
                  </div>
                  <div className='absolute bottom-4 left-1/2 -translate-x-1/2 bg-white text-gray-900 px-4 py-2 rounded-lg font-semibold whitespace-nowrap shadow-lg hover:bg-gray-100 transition opacity-0 group-hover:opacity-100 pointer-events-none'>
                    View Details
                  </div>
                </div>
                <div className='p-4'>
                  <p className='text-sm text-gray-500 mb-1 uppercase tracking-wide'>{product.category || 'Product'}</p>
                  <Link href={getProductUrl(productId, product.urlSlug)}>
                    <h3 className='font-semibold mb-2 text-gray-900 text-base sm:text-lg line-clamp-2 hover:text-web transition'>
                      {product.name}
                    </h3>
                  </Link>

                  <div className='flex items-center gap-2 mb-4'>
                    <p className='text-lg sm:text-xl font-bold text-web'>₹{getProductPrice(product)}</p>
                    {product?.originalPrice && (
                      <span className='text-sm text-gray-500 line-through'>₹{product?.originalPrice?.toFixed(2)}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className='text-center py-12'>
          <div className='text-gray-500 text-lg mb-2'>No products found</div>
          <div className='text-gray-400 text-sm'>
            {activeTab === 'trending' && 'No trending products available'}
            {activeTab === 'bestsellers' && 'No best sellers available'}
            {activeTab === 'new-items' && 'No new items available'}
          </div>
        </div>
      )}

      {/* View All Link */}
      {/* <div className='text-center mt-8'>
        <Link
          href='/products'
          className='inline-flex items-center gap-2 bg-web text-white px-6 py-3 rounded-lg font-semibold hover:bg-web/90 transition-colors'>
          View All Products
          <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
          </svg>
        </Link> */}
      {/* </div> */}
    </section>
  );
}
