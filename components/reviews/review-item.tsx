'use client';

import { useState } from 'react';
import { Star, ThumbsUp, MoreVertical, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';

interface ReviewItemProps {
  review: {
    _id: string;
    customerName: string;
    customerAvatar?: string;
    rating: number;
    title?: string;
    description: string;
    photos: string[];
    helpfulCount: number;
    verifiedPurchase?: boolean;
    createdAt: string;
    likes?: string[];
  };
  currentCustomerId?: string;
  onLike?: (reviewId: string) => void;
  onDelete?: (reviewId: string) => void;
}

export function ReviewItem({ 
  review, 
  currentCustomerId, 
  onLike,
  onDelete 
}: ReviewItemProps) {
  const [isLiked, setIsLiked] = useState(
    currentCustomerId && review.likes?.includes(currentCustomerId)
  );
  const [helpfulCount, setHelpfulCount] = useState(review.helpfulCount || 0);
  const [loading, setLoading] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);

  const handleLike = async () => {
    if (!currentCustomerId) {
      toast.error('Please login to like reviews');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('customerToken') || document.cookie
        .split('; ')
        .find(row => row.startsWith('customerToken='))
        ?.split('=')[1];

      const response = await fetch(`/api/reviews/${review._id}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok) {
        setIsLiked(data.isLiked);
        setHelpfulCount(data.helpfulCount);
        if (onLike) onLike(review._id);
      } else {
        toast.error(data.error || 'Failed to like review');
      }
    } catch (error) {
      console.error('Error liking review:', error);
      toast.error('Failed to like review');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this review?')) return;

    if (onDelete) {
      onDelete(review._id);
    }
  };

  const description = review.description || '';
  const shouldTruncate = description.length > 300;
  const displayDescription = showFullDescription || !shouldTruncate 
    ? description 
    : `${description.substring(0, 300)}...`;

  return (
    <div className='border-b border-gray-200 pb-6 mb-6 last:border-b-0 last:mb-0'>
      {/* Review Header */}
      <div className='flex items-start justify-between mb-3 gap-2'>
        <div className='flex items-center gap-2 sm:gap-3 flex-1 min-w-0'>
          {/* Avatar */}
          <div className='w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0'>
            {review.customerAvatar ? (
              <img 
                src={review.customerAvatar} 
                alt={review.customerName}
                className='w-full h-full object-cover'
              />
            ) : (
              <span className='text-gray-600 font-semibold text-sm'>
                {review.customerName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <div className='min-w-0 flex-1'>
            <div className='flex items-center gap-1 sm:gap-2 flex-wrap'>
              <p className='font-semibold text-gray-900 text-sm sm:text-base truncate'>{review.customerName}</p>
              {review.verifiedPurchase && (
                <span className='inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium whitespace-nowrap border border-green-200'>
                  <svg className='w-3 h-3' fill='currentColor' viewBox='0 0 20 20'>
                    <path fillRule='evenodd' d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z' clipRule='evenodd' />
                  </svg>
                  Verified Purchase
                </span>
              )}
            </div>
            <div className='flex items-center gap-1 sm:gap-2 mt-1 flex-wrap'>
              {/* Star Rating */}
              <div className='flex items-center gap-0.5 sm:gap-1'>
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3 h-3 sm:w-4 sm:h-4 ${
                      i < review.rating
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className='text-xs text-gray-500 whitespace-nowrap'>
                {format(new Date(review.createdAt), 'MMM dd, yyyy')}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        {onDelete && (
          <button
            onClick={handleDelete}
            className='p-2 hover:bg-gray-100 rounded-full transition'
            aria-label='Delete review'
          >
            <Trash2 className='w-4 h-4 text-gray-500' />
          </button>
        )}
      </div>

      {/* Review Title */}
      {review.title && (
        <h4 className='font-semibold text-gray-900 mb-2 text-sm sm:text-base'>{review.title}</h4>
      )}

      {/* Review Description */}
      <p className='text-sm sm:text-base text-gray-700 mb-3 whitespace-pre-wrap break-words'>
        {displayDescription}
        {shouldTruncate && (
          <button
            onClick={() => setShowFullDescription(!showFullDescription)}
            className='text-web hover:underline ml-2 font-medium'
          >
            {showFullDescription ? 'Show less' : 'Read more'}
          </button>
        )}
      </p>

      {/* Review Photos */}
      {review.photos && review.photos.length > 0 && (
        <div className='flex gap-2 mb-4 flex-wrap'>
          {review.photos.map((photo, index) => (
            <button
              key={index}
              onClick={() => {
                // Open image in modal/fullscreen
                window.open(photo, '_blank');
              }}
              className='w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-lg overflow-hidden border border-gray-200 hover:border-web transition cursor-pointer flex-shrink-0'
            >
              <img
                src={photo}
                alt={`Review photo ${index + 1}`}
                className='w-full h-full object-cover'
              />
            </button>
          ))}
        </div>
      )}

      {/* Helpful Button */}
      <div className='flex items-center gap-4'>
        <button
          onClick={handleLike}
          disabled={loading || !currentCustomerId}
          className={`flex items-center gap-2 text-sm font-medium transition ${
            isLiked
              ? 'text-web'
              : 'text-gray-600 hover:text-web'
          } ${!currentCustomerId ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <ThumbsUp className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
          <span>Helpful ({helpfulCount})</span>
        </button>
      </div>
    </div>
  );
}

