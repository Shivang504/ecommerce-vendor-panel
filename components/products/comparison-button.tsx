'use client';

import { useState, useEffect } from 'react';
import { GitCompare, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface ComparisonButtonProps {
  productId: string;
  variant?: 'default' | 'icon' | 'outline';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function ComparisonButton({ 
  productId, 
  variant = 'default', 
  className = '',
  size = 'md'
}: ComparisonButtonProps) {
  const [inComparison, setInComparison] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const checkComparisonStatus = async () => {
      if (!productId) return;

      const token = localStorage.getItem('customerToken');
      if (!token) {
        setChecking(false);
        return;
      }

      try {
        const response = await fetch(`/api/comparison/${productId}`, {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          setInComparison(data.inComparison || false);
        }
      } catch (error) {
        // Silently fail if not authenticated
      } finally {
        setChecking(false);
      }
    };

    checkComparisonStatus();
  }, [productId]);

  const handleToggleComparison = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const token = localStorage.getItem('customerToken');
    if (!token) {
      toast({
        title: 'Login Required',
        description: 'Please login to compare products',
        variant: 'destructive',
      });
      router.push('/user-login');
      return;
    }

    setLoading(true);

    try {
      if (inComparison) {
        // If already in comparison, navigate to comparison page
        router.push('/comparison');
        return;
      } else {
        // Add to comparison
        const response = await fetch(`/api/comparison/${productId}`, {
          method: 'POST',
          credentials: 'include',
        });

        const data = await response.json();
        if (data.success) {
          setInComparison(true);
          toast({
            title: 'Added',
            description: data.message || 'Product added to comparison. Redirecting to comparison page...',
            variant: 'success',
          });
          window.dispatchEvent(new CustomEvent('comparisonUpdated'));
          
          // Navigate to comparison page after a short delay
          setTimeout(() => {
            router.push('/comparison');
          }, 1000);
        } else {
          // Check if limit reached
          if (data.error && data.error.includes('limit')) {
            toast({
              title: 'Limit Reached',
              description: 'Maximum 4 products can be compared. Please remove a product from comparison first.',
              variant: 'destructive',
            });
            // Navigate to comparison page to manage
            setTimeout(() => {
              router.push('/comparison');
            }, 1500);
          } else {
            toast({
              title: 'Error',
              description: data.message || data.error || 'Failed to add to comparison',
              variant: 'destructive',
            });
          }
        }
      }
    } catch (error: any) {
      console.error('Comparison error:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return null; // Don't show while checking
  }

  if (variant === 'icon') {
    return (
      <button
        onClick={handleToggleComparison}
        disabled={loading}
        className={`p-2 rounded-lg border transition-all ${
          inComparison
            ? 'bg-blue-50 border-blue-300 text-blue-600'
            : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
        } ${className}`}
        title={inComparison ? 'Remove from comparison' : 'Add to comparison'}>
        {loading ? (
          <Loader2 className='w-4 h-4 animate-spin' />
        ) : (
          <GitCompare className={`w-4 h-4 ${inComparison ? 'fill-current' : ''}`} />
        )}
      </button>
    );
  }

  const sizeClasses = {
    sm: 'text-sm px-3 py-1.5',
    md: 'text-base px-4 py-2',
    lg: 'text-lg px-6 py-3',
  };

  return (
    <Button
      onClick={handleToggleComparison}
      disabled={loading}
      variant={inComparison ? 'default' : 'outline'}
      className={`gap-2 ${sizeClasses[size]} ${className} ${
        inComparison 
          ? 'bg-green-600 text-white border-green-600 hover:bg-green-700' 
          : 'border-web text-web hover:bg-web hover:text-white'
      }`}>
      {loading ? (
        <>
          <Loader2 className='w-4 h-4 animate-spin' />
          {inComparison ? 'Opening...' : 'Adding...'}
        </>
      ) : (
        <>
          <GitCompare className={`w-4 h-4 ${inComparison ? 'fill-current' : ''}`} />
          {inComparison ? 'In Comparison' : 'Compare'}
        </>
      )}
    </Button>
  );
}

