'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getProductUrl } from '@/app/utils/helper';
import { Loader2 } from 'lucide-react';

interface Product {
  id: string;
  _id: string;
  name: string;
  price: number;
  originalPrice: number;
  image: string;
  urlSlug: string;
}

interface ProductRecommendationsProps {
  title: string;
  apiUrl: string;
  limit?: number;
  excludeProductId?: string;
}

export function ProductRecommendations({ 
  title, 
  apiUrl, 
  limit = 10,
  excludeProductId 
}: ProductRecommendationsProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await fetch(apiUrl);
        const data = await response.json();
        
        if (data.products && Array.isArray(data.products)) {
          // Filter out current product if excludeProductId is provided
          let filteredProducts = data.products;
          if (excludeProductId) {
            filteredProducts = data.products.filter(
              (p: any) => {
                const productId = p.id || p._id;
                return productId !== excludeProductId;
              }
            );
          }
          
          // Normalize product format (handle different API response formats)
          const normalizedProducts = filteredProducts.slice(0, limit).map((p: any) => ({
            id: p.id || p._id?.toString() || p._id,
            _id: p._id?.toString() || p._id || p.id,
            name: p.name,
            price: p.price || p.sellingPrice || p.regularPrice || 0,
            originalPrice: p.originalPrice || p.regularPrice || p.sellingPrice || 0,
            image: p.image || p.mainImage || '/placeholder.jpg',
            urlSlug: p.urlSlug || p._id?.toString() || p._id || p.id
          }));
          
          setProducts(normalizedProducts);
        }
      } catch (error) {
        console.error(`Error fetching ${title}:`, error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [apiUrl, limit, excludeProductId, title]);

  if (loading) {
    return (
      <div className='bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-6'>
        <h2 className='text-xl font-semibold text-gray-900 mb-6'>{title}</h2>
        <div className='flex items-center justify-center py-12'>
          <Loader2 className='w-8 h-8 animate-spin text-primary' />
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <div className='bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-6'>
      <h2 className='text-xl font-semibold text-gray-900 mb-6'>{title}</h2>
      <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6'>
        {products.map((product) => {
          const discountPercentage = product.originalPrice > product.price
            ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
            : 0;

          return (
            <Link
              key={product.id}
              href={getProductUrl(product.id, product.urlSlug)}
              className='group border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-all'>
              <div className='aspect-square bg-gray-100 overflow-hidden'>
                <img
                  src={product.image || '/placeholder.jpg'}
                  alt={product.name}
                  className='w-full h-full object-cover transition-transform duration-300 group-hover:scale-110'
                />
              </div>
              <div className='p-3 sm:p-4'>
                <h3 className='text-sm sm:text-base font-medium text-gray-900 mb-2 line-clamp-2 min-h-[2.5rem]'>
                  {product.name}
                </h3>
                <div className='flex items-baseline gap-2 flex-wrap'>
                  <p className='text-base sm:text-lg font-semibold text-gray-900'>
                    ₹{product.price.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </p>
                  {discountPercentage > 0 && (
                    <>
                      <p className='text-xs sm:text-sm text-gray-500 line-through'>
                        ₹{product.originalPrice.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </p>
                      <span className='text-xs font-semibold text-green-600'>
                        {discountPercentage}% off
                      </span>
                    </>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
