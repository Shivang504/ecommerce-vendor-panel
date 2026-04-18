import React from 'react';

export type SkeletonVariant = 'product' | 'list' | 'details';

interface SkeletonProps {
  variant: SkeletonVariant;
  count?: number;
}

const Skeleton: React.FC<SkeletonProps> = ({ variant, count = 8 }) => {
  const renderSkeleton = (): React.ReactNode => {
    switch (variant) {
      case 'product':
        return (
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className='border rounded-2xl p-3 shadow-sm bg-white animate-pulse'>
                {/* Image */}
                <div className='h-40 bg-gray-200 rounded-xl mb-3' />

                {/* Title */}
                <div className='h-4 bg-gray-200 rounded w-3/4 mb-2' />

                {/* Small text */}
                <div className='h-3 bg-gray-200 rounded w-1/2 mb-3' />

                {/* Price */}
                <div className='h-4 bg-gray-200 rounded w-1/3 mb-4' />

                {/* Button */}
                <div className='h-10 bg-gray-300 rounded-xl w-full' />
              </div>
            ))}
          </div>
        );

      case 'list':
        return (
          <div className='space-y-4 animate-pulse'>
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className='flex items-center gap-3 border rounded-lg p-3 bg-white'>
                <div className='h-16 w-16 bg-gray-200 rounded' />

                <div className='flex-1'>
                  <div className='h-4 bg-gray-200 w-3/4 mb-2' />
                  <div className='h-3 bg-gray-200 w-1/2' />
                </div>
              </div>
            ))}
          </div>
        );

      case 'details':
        return (
          <div className='animate-pulse'>
            <div className='h-64 bg-gray-200 rounded-xl mb-4' />
            <div className='h-5 bg-gray-200 w-3/4 mb-2' />
            <div className='h-4 bg-gray-200 w-1/2 mb-4' />
            <div className='h-10 bg-gray-300 w-40 rounded-xl' />
          </div>
        );

      default:
        return null;
    }
  };

  return <>{renderSkeleton()}</>;
};

export default Skeleton;
