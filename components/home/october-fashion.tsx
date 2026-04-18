'use client';

import { useScrollAnimation } from './use-scroll-animation';
import Link from 'next/link';
import { WishlistButton } from '@/components/wishlist/wishlist-button';

type OctoberCategory = string;

type OctoberProduct = {
  id: number | string;
  name: string;
  price: string;
  image: string;
};

type OctoberFashionData = {
  title: string;
  description: string;
  categories: OctoberCategory[];
  products: OctoberProduct[];
};

const defaultData: OctoberFashionData = {
  title: 'The October Cleaner Fashion',
  description: 'We create care products that really work and are designed to make you feel good.',
  categories: ['Outerwear Collection', 'Cashmere Sweaters', 'The Cold Weather'],
  products: [
    {
      id: 1,
      name: 'Cotton Hooded Flannel',
      price: '$500.00',
      image: 'https://images.unsplash.com/photo-1571875257727-256c39da42af?w=800',
    },
    {
      id: 2,
      name: 'Soft Winter Jacket',
      price: '$620.00',
      image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800',
    },
  ],
};

export function OctoberFashion({ data }: { data?: OctoberFashionData }) {
  const { ref, isVisible } = useScrollAnimation();

  // Merge provided data with default fallback to prevent undefined errors
  const merged = { ...defaultData, ...data };

  const { title, description, categories, products } = merged;

  return (
    <section ref={ref} className='container mx-auto px-4 py-12'>
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-12'>
        {/* LEFT SIDE */}
        <div className={`transform transition-all duration-700 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}>
          <h2 className='text-3xl font-bold text-[#4C1D95] mb-6'>{title}</h2>

          <p className='text-gray-700 mb-8 leading-relaxed'>{description}</p>

          <div className='space-y-4 mb-8'>
            {categories.map((category, index) => (
              <div
                key={index}
                className={`flex items-center gap-3 transform transition-all duration-500 ${
                  isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
                }`}
                style={{ transitionDelay: `${index * 100}ms` }}>
                <div className='w-2 h-2 rounded-full bg-[#4C1D95]'></div>
                <p className='text-gray-700 font-medium'>{category}</p>
              </div>
            ))}
          </div>

          <Link
            href='/products'
            className='inline-block bg-[#4C1D95] text-white px-8 py-3 rounded-lg font-semibold hover:bg-[#3B1A6E] hover:scale-105 transition-all duration-300'>
            Shop All Products
          </Link>
        </div>

        {/* RIGHT SIDE */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          {products.map((product, index) => (
            <div
              key={product.id}
              className={`bg-white rounded-lg overflow-hidden shadow-sm group transform transition-all duration-500 hover:-translate-y-2 hover:shadow-xl ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
              style={{ transitionDelay: `${index * 200}ms` }}>
              <div className='relative aspect-square bg-gray-100 overflow-hidden'>
                <Link href={`/products/${product.id}`} className='block w-full h-full'>
                  <img
                    src={product.image}
                    alt={product.name}
                    className='w-full h-full object-cover group-hover:scale-110 transition-transform duration-500'
                  />
                </Link>
                <div className='absolute top-3 right-3 opacity-0 group-hover:opacity-100 z-10 transition'>
                  <WishlistButton productId={String(product.id)} variant='icon' size='md' />
                </div>
              </div>

              <div className='p-4'>
                <p className='text-sm text-gray-600 mb-1'>{product.name}</p>
                <p className='text-lg font-bold text-gray-900 mb-3'>{product.price}</p>

                <Link
                  href={`/products/${product.id}`}
                  className='block w-full bg-[#4C1D95] text-white px-4 py-2 rounded-lg font-semibold hover:bg-[#3B1A6E] hover:scale-105 transition-all duration-300 text-center'>
                  Shop Now
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
