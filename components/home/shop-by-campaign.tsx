'use client';

import Link from 'next/link';

export function ShopByCampaign() {
  const campaigns = [
    {
      image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&q=80',
      category: 'Summer Collection',
      items: '24 items',
    },
    {
      image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&q=80',
      category: 'New Arrivals',
      items: '18 items',
    },
    {
      image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&q=80',
      category: 'Sale Items',
      items: '32 items',
    },
    {
      image: 'https://images.unsplash.com/photo-1594633313593-bab3825d0caf?w=600&q=80',
      category: 'Premium Line',
      items: '15 items',
    },
  ];

  return (
    <section className='site-container py-4 sm:py-8'>
      <h2 className='text-3xl sm:text-4xl font-bold text-web mb-8 sm:mb-10'>Shop By Campaign</h2>
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8'>
        {campaigns.map((campaign, index) => (
          <Link
            key={index}
            href='/products'
            className='block bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-lg transition'>
            <div className='aspect-square bg-white overflow-hidden group'>
              <img
                src={campaign.image}
                alt={campaign.category}
                className='w-full h-full object-cover group-hover:scale-110 transition-transform duration-300'
              />
            </div>

            <div className='p-5 sm:p-6 flex flex-row items-center justify-between bg-white'>
              <div>
                <p className='text-base sm:text-lg text-gray-900 font-semibold mb-1'>{campaign.category}</p>
                <p className='text-sm text-gray-600'>{campaign.items}</p>
              </div>

              <span className='inline-block rounded-full bg-white text-web px-4 sm:px-6 py-2 sm:py-2.5 whitespace-nowrap font-semibold text-sm sm:text-base border border-gray-200 hover:bg-web hover:text-white transition'>
                Shop Now
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
