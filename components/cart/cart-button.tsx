'use client';

import { useState } from 'react';
import { ShoppingBag, Loader2, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface CartButtonProps {
  productId: string;
  quantity?: number;
  variant?: 'default' | 'icon' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
}

export function CartButton({
  productId,
  quantity = 1,
  variant = 'default',
  size = 'md',
  className = '',
  disabled = false,
}: CartButtonProps) {
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);
  const router = useRouter();

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!productId || disabled) return;

    // Check if user is logged in
    const customerToken = localStorage.getItem('customerToken');
    if (!customerToken) {
      toast({
        title: 'Login Required',
        description: 'Please login to add items to your cart.',
        variant: 'info',
      });
      
      // Trigger customer login modal event - header will listen and open the modal
      window.dispatchEvent(new CustomEvent('openCustomerLogin'));
      
      return;
    }

    setLoading(true);
    setAdded(false);

    try {
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          productId,
          quantity,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setAdded(true);
        
        // Show different toast based on whether item already existed
        if (data.alreadyExists || data.updated) {
          toast({
            title: 'Quantity updated in cart',
            variant: 'success',
          });
        } else {
          toast({
            title: 'Added to cart successfully',
            variant: 'success',
          });
        }
        
        // Trigger cart update event
        window.dispatchEvent(new Event('cartUpdated'));

        // Reset added state after 2 seconds
        setTimeout(() => setAdded(false), 2000);
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to add product to cart',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Cart error:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'text-sm px-3 py-1.5',
    md: 'text-base px-4 py-2',
    lg: 'text-lg px-6 py-3',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  if (variant === 'icon') {
    return (
      <button
        onClick={handleAddToCart}
        disabled={loading || disabled}
        className={`p-2 bg-white rounded-full shadow-md transition ${className}
          ${added ? 'bg-green-50 text-green-600' : 'text-gray-600 hover:bg-gray-50 hover:text-web'}
          ${loading || disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}>
        {loading ? (
          <Loader2 className={`${iconSizes[size]} animate-spin`} />
        ) : added ? (
          <Check className={`${iconSizes[size]}`} />
        ) : (
          <ShoppingBag className={`${iconSizes[size]}`} />
        )}
      </button>
    );
  }

  if (variant === 'outline') {
    return (
      <button
        onClick={handleAddToCart}
        disabled={loading || disabled}
        className={`flex items-center justify-center gap-2 border border-web text-web rounded-full font-semibold hover:bg-web hover:text-white transition ${sizeClasses[size]} ${className}
          ${loading || disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}>
        {loading ? (
          <>
            <Loader2 className={`${iconSizes[size]} animate-spin`} />
            Adding...
          </>
        ) : added ? (
          <>
            <Check className={`${iconSizes[size]}`} />
            Added!
          </>
        ) : (
          <>
            <ShoppingBag className={`${iconSizes[size]}`} />
            Add to Cart
          </>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleAddToCart}
      disabled={loading || disabled}
      className={`flex items-center justify-center gap-2 bg-web text-white rounded-full font-semibold hover:bg-web/90 transition ${sizeClasses[size]} ${className}
        ${loading || disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}>
      {loading ? (
        <>
          <Loader2 className={`${iconSizes[size]} animate-spin`} />
          Adding...
        </>
      ) : added ? (
        <>
          <Check className={`${iconSizes[size]}`} />
          Added!
        </>
      ) : (
        <>
          <ShoppingBag className={`${iconSizes[size]}`} />
          Add to Cart
        </>
      )}
    </button>
  );
}

