'use client';

import { useState, useEffect } from 'react';
import { Heart, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from '@/hooks/use-toast';

interface WishlistButtonProps {
  productId: string;
  variant?: 'icon' | 'button';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  initialWishlistStatus?: boolean; // Optional: if provided, skip API call
}

export function WishlistButton({ productId, variant = 'icon', className = '', size = 'md', initialWishlistStatus }: WishlistButtonProps) {
  const router = useRouter();
  const [inWishlist, setInWishlist] = useState(initialWishlistStatus ?? false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false); // Don't check by default

  useEffect(() => {
    // Always use initial status if provided (even if false)
    // This prevents individual API calls when batch fetch is used
    if (initialWishlistStatus !== undefined) {
      setInWishlist(initialWishlistStatus);
      setChecking(false);
      return;
    }

    // Only make individual API call if:
    // 1. User is logged in
    // 2. AND initial status was not provided (meaning this is not in a batch context)
    const token = localStorage.getItem('customerToken') || document.cookie.includes('customerToken');
    if (!token) {
      setInWishlist(false);
      setChecking(false);
      return;
    }

    // For products page, we should always have initial status from batch fetch
    // Skip individual API call to prevent multiple requests
    // If status is truly needed, it will be updated via wishlistUpdated event
    setInWishlist(false);
    setChecking(false);
  }, [productId, initialWishlistStatus]);

  const toggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!productId) return;

    // Check if user is logged in
    const token = localStorage.getItem('customerToken') || document.cookie.includes('customerToken');
    if (!token) {
      toast.error('Please login to add items to wishlist');
      router.push('/');
      return;
    }

    try {
      setLoading(true);

      if (inWishlist) {
        // Remove from wishlist
        const response = await fetch(`/api/wishlist/${productId}`, {
          method: 'DELETE',
          credentials: 'include',
        });

        const data = await response.json();
        if (data.success) {
          setInWishlist(false);
          toast.success('Removed from wishlist');
          window.dispatchEvent(new CustomEvent('wishlistUpdated'));
        } else {
          toast.error(data.error || 'Failed to remove from wishlist');
        }
      } else {
        // Add to wishlist
        const response = await fetch('/api/wishlist', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ productId }),
        });

        const data = await response.json();
        if (data.success) {
          setInWishlist(true);
          if (!data.alreadyInWishlist) {
            toast.success('Added to wishlist');
          }
          window.dispatchEvent(new CustomEvent('wishlistUpdated'));
        } else {
          toast.error(data.error || 'Failed to add to wishlist');
        }
      }
    } catch (error: any) {
      console.error('Error toggling wishlist:', error);
      toast.error('Failed to update wishlist');
    } finally {
      setLoading(false);
    }
  };

  if (checking && variant === 'icon') {
    return null; // Don't show loading state for icon variant
  }

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  if (variant === 'button') {
    return (
      <button
        onClick={toggleWishlist}
        disabled={loading}
        className={`border rounded-full px-4 sm:px-6 py-3 sm:py-4 font-semibold transition flex items-center justify-center gap-2 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed ${
          inWishlist 
            ? 'border-red-500 bg-red-50 text-red-600 hover:bg-red-100' 
            : 'border-web text-web hover:bg-web hover:text-white'
        } ${className}`}>
        {loading ? (
          <Loader2 className='w-4 h-4 sm:w-5 sm:h-5 animate-spin' />
        ) : (
          <Heart className={`w-4 h-4 sm:w-5 sm:h-5 ${inWishlist ? 'fill-current' : ''}`} />
        )}
        <span className='hidden sm:inline'>
          {inWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}
        </span>
        <span className='sm:hidden'>{inWishlist ? 'Remove' : 'Wishlist'}</span>
      </button>
    );
  }

  return (
    <button
      onClick={toggleWishlist}
      disabled={loading || checking}
      className={`p-2 bg-white rounded-full shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed ${
        inWishlist
          ? 'text-red-500 hover:bg-red-50'
          : 'text-gray-600 hover:text-red-500 hover:bg-red-50'
      } ${className}`}>
      {loading || checking ? (
        <Loader2 className={`${sizeClasses[size]} animate-spin`} />
      ) : (
        <Heart className={`${sizeClasses[size]} ${inWishlist ? 'fill-current' : ''}`} />
      )}
    </button>
  );
}
