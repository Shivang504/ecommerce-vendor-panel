'use client';

import { useState, useEffect } from 'react';
import { Star, ThumbsUp, ChevronDown, ChevronUp } from 'lucide-react';
import { ReviewItem } from './review-item';
import { ReviewForm } from './review-form';
import { Loader2 } from 'lucide-react';

interface Review {
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
  customerId?: string;
}

interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

interface ReviewsSectionProps {
  productId: string;
  productName: string;
  currentCustomerId?: string;
}

export function ReviewsSection({ productId, productName, currentCustomerId }: ReviewsSectionProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'recent' | 'helpful' | 'rating'>('recent');
  const [filterBy, setFilterBy] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [checkingPurchase, setCheckingPurchase] = useState(false);

  // Check if customer already reviewed
  const hasReviewed = reviews.some(review => review.customerId === currentCustomerId);

  useEffect(() => {
    fetchReviews();
  }, [productId]);

  // Check if customer has purchased the product
  useEffect(() => {
    if (currentCustomerId) {
      checkPurchaseStatus();
    } else {
      setHasPurchased(false);
    }
  }, [currentCustomerId, productId]);

  const checkPurchaseStatus = async () => {
    if (!currentCustomerId) {
      setHasPurchased(false);
      return;
    }

    try {
      setCheckingPurchase(true);
      const token = localStorage.getItem('customerToken') || document.cookie
        .split('; ')
        .find(row => row.startsWith('customerToken='))
        ?.split('=')[1];

      if (!token) {
        setHasPurchased(false);
        return;
      }

      const response = await fetch(`/api/reviews/check-purchase?productId=${productId}`, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setHasPurchased(data.hasPurchased || false);
      } else {
        setHasPurchased(false);
      }
    } catch (error) {
      console.error('Error checking purchase status:', error);
      setHasPurchased(false);
    } finally {
      setCheckingPurchase(false);
    }
  };

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/reviews?productId=${productId}`);
      const data = await response.json();

      if (response.ok) {
        setReviews(data.reviews || []);
        setStats(data.stats || null);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSubmitted = () => {
    setShowReviewForm(false);
    fetchReviews();
    // Recheck purchase status after review submission
    if (currentCustomerId) {
      checkPurchaseStatus();
    }
  };

  const handleLikeReview = () => {
    // Refresh reviews to update like counts
    fetchReviews();
  };

  const handleDeleteReview = async (reviewId: string) => {
    try {
      const token =
        localStorage.getItem('customerToken') ||
        document.cookie
          .split('; ')
          .find(row => row.startsWith('customerToken='))
          ?.split('=')[1];

      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        credentials: 'include',
      });

      if (response.ok) {
        fetchReviews();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete review');
      }
    } catch (error) {
      console.error('Error deleting review:', error);
      alert('Failed to delete review');
    }
  };

  // Sort reviews
  const sortedReviews = [...reviews].sort((a, b) => {
    if (sortBy === 'recent') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else if (sortBy === 'helpful') {
      return (b.helpfulCount || 0) - (a.helpfulCount || 0);
    } else if (sortBy === 'rating') {
      return b.rating - a.rating;
    }
    return 0;
  });

  // Filter reviews
  const filteredReviews = filterBy ? sortedReviews.filter(review => review.rating === filterBy) : sortedReviews;

  const renderStars = (rating: number, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClasses = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
    };

    return (
      <div className='flex items-center gap-1'>
        {[...Array(5)].map((_, i) => (
          <Star key={i} className={`${sizeClasses[size]} ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center py-12'>
        <Loader2 className='w-8 h-8 animate-spin text-web' />
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Reviews Header with Stats */}
      <div className='border-b border-gray-200 pb-6'>
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6'>
          <div>
            <h2 className='text-xl sm:text-2xl font-bold text-gray-900 mb-2'>Customer Reviews</h2>
            {stats && stats.totalReviews > 0 && (
              <div className='flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4'>
                <div className='flex items-center gap-2'>
                  {renderStars(Math.round(stats.averageRating), 'lg')}
                  <span className='text-lg sm:text-xl font-bold text-gray-900'>{stats.averageRating.toFixed(1)}</span>
                  <span className='text-sm sm:text-base text-gray-600'>
                    ({stats.totalReviews} {stats.totalReviews === 1 ? 'review' : 'reviews'})
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Write Review Button - Only show if customer has purchased and received the product */}
          {currentCustomerId && !hasReviewed && hasPurchased && !checkingPurchase && (
            <button
              onClick={() => setShowReviewForm(!showReviewForm)}
              className='px-4 sm:px-6 py-2 sm:py-3 bg-web text-white rounded-full text-sm sm:text-base font-semibold hover:bg-web/90 transition whitespace-nowrap w-full sm:w-auto'>
              {showReviewForm ? 'Cancel Review' : 'Write a Review'}
            </button>
          )}
        </div>

        {/* Rating Distribution */}
        {stats && stats.totalReviews > 0 && (
          <div className='space-y-2'>
            {[5, 4, 3, 2, 1].map(star => {
              const count = stats.ratingDistribution[star as keyof typeof stats.ratingDistribution];
              const percentage = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;

              return (
                <button
                  key={star}
                  onClick={() => {
                    setFilterBy(filterBy === star ? null : star);
                    setShowAllReviews(false); // Reset to show 5 reviews when filter changes
                  }}
                  className={`w-full flex items-center gap-2 sm:gap-3 text-xs sm:text-sm ${
                    filterBy === star ? 'font-semibold text-web' : 'text-gray-700'
                  }`}>
                  <span className='w-10 sm:w-12'>{star} star</span>
                  <div className='flex-1 h-2 bg-gray-200 rounded-full overflow-hidden'>
                    <div
                      className={`h-full transition-all ${filterBy === star ? 'bg-web' : 'bg-gray-400'}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className='w-8 sm:w-12 text-right text-xs sm:text-sm'>{count}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Review Form */}
      {showReviewForm && currentCustomerId && !hasReviewed && hasPurchased && (
        <ReviewForm
          productId={productId}
          productName={productName}
          onSubmit={handleReviewSubmitted}
          onCancel={() => setShowReviewForm(false)}
        />
      )}

      {/* Sort and Filter Controls */}
      {reviews.length > 0 && (
        <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
          <div className='flex items-center gap-2 flex-wrap'>
            <span className='text-sm font-medium text-gray-700'>Sort by:</span>
            <select
              value={sortBy}
              onChange={e => {
                setSortBy(e.target.value as any);
                setShowAllReviews(false); // Reset to show 5 reviews when sort changes
              }}
              className='px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-web'>
              <option value='recent'>Most Recent</option>
              <option value='helpful'>Most Helpful</option>
              <option value='rating'>Highest Rating</option>
            </select>

            {filterBy && (
              <button
                onClick={() => {
                  setFilterBy(null);
                  setShowAllReviews(false); // Reset to show 5 reviews when clearing filter
                }}
                className='px-3 py-1.5 text-sm text-web hover:underline'>
                Clear filter ({filterBy} stars)
              </button>
            )}
          </div>

          <p className='text-xs sm:text-sm text-gray-600 whitespace-normal sm:whitespace-nowrap'>
            Showing {showAllReviews ? filteredReviews.length : Math.min(5, filteredReviews.length)} of {filteredReviews.length} reviews
            {filteredReviews.length !== reviews.length && ` (${reviews.length} total)`}
          </p>
        </div>
      )}

      {/* Reviews List */}
      {filteredReviews.length > 0 ? (
        <div className='space-y-0'>
          {(showAllReviews ? filteredReviews : filteredReviews.slice(0, 5)).map(review => (
            <ReviewItem
              key={review._id}
              review={review}
              currentCustomerId={currentCustomerId}
              onLike={handleLikeReview}
              onDelete={currentCustomerId === review.customerId ? handleDeleteReview : undefined}
            />
          ))}

          {/* View More / Show Less Button */}
          {filteredReviews.length > 5 && (
            <div className='flex justify-center mt-6 pt-6 border-t border-gray-200'>
              <button
                onClick={() => setShowAllReviews(!showAllReviews)}
                className='px-4 sm:px-6 py-2 sm:py-3 bg-web text-white rounded-md text-sm sm:text-base font-semibold hover:bg-web/90 transition'>
                {showAllReviews ? (
                  <>
                    <span className='hidden sm:inline'>Show Less (Showing all {filteredReviews.length} reviews)</span>
                    <span className='sm:hidden'>Show Less</span>
                  </>
                ) : (
                  <>
                    <span className='hidden sm:inline'>View More ({filteredReviews.length - 5} more reviews)</span>
                    <span className='sm:hidden'>View More ({filteredReviews.length - 5})</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className='text-center py-12 border border-gray-200 rounded-lg'>
          {filterBy ? (
            <>
              <p className='text-gray-600 mb-2'>No reviews with {filterBy} stars</p>
              <button
                onClick={() => {
                  setFilterBy(null);
                  setShowAllReviews(false); // Reset to show 5 reviews
                }}
                className='text-web hover:underline'>
                Show all reviews
              </button>
            </>
          ) : (
            <>
              <p className='text-gray-600 mb-4'>No reviews yet</p>
              {!currentCustomerId && <p className='text-sm text-gray-500'>Be the first to review this product!</p>}
            </>
          )}
        </div>
      )}

      {/* No Reviews Message */}
      {/* {!loading && reviews.length === 0 && !showReviewForm && (
        <div className='text-center py-12 border border-gray-200 rounded-lg'>
          <p className='text-gray-600 mb-4'>No reviews yet</p>
          {currentCustomerId ? (
            <button
              onClick={() => setShowReviewForm(true)}
              className='px-6 py-3 bg-web text-white rounded-md font-semibold hover:bg-web/90 transition'>
              Write the First Review
            </button>
          ) : (
            <p className='text-sm text-gray-500'>Be the first to review this product!</p>
          )}
        </div>
      )} */}
    </div>
  );
}
