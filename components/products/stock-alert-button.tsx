'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface StockAlertButtonProps {
  productId: string;
  productName: string;
  stock: number;
  variant?: 'default' | 'icon' | 'outline';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function StockAlertButton({ 
  productId, 
  productName,
  stock,
  variant = 'default', 
  className = '',
  size = 'md'
}: StockAlertButtonProps) {
  const [hasAlert, setHasAlert] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const checkAlertStatus = async () => {
      if (!productId) return;

      const token = localStorage.getItem('customerToken');
      if (!token) {
        setChecking(false);
        return;
      }

      try {
        const response = await fetch(`/api/stock-alerts/${productId}`, {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          setHasAlert(data.hasAlert || false);
        }
      } catch (error) {
        // Silently fail if not authenticated
      } finally {
        setChecking(false);
      }
    };

    checkAlertStatus();

    // Get customer email if available
    if (typeof window !== 'undefined') {
      const customerData = localStorage.getItem('currentCustomer');
      if (customerData) {
        try {
          const customer = JSON.parse(customerData);
          setEmail(customer.email || '');
        } catch (error) {
          // Ignore
        }
      }
    }
  }, [productId]);

  const handleToggleAlert = async () => {
    if (hasAlert) {
      // Remove alert
      await handleRemoveAlert();
    } else {
      // Show dialog to add alert
      setShowDialog(true);
    }
  };

  const handleAddAlert = async () => {
    if (!email.trim()) {
      toast({
        title: 'Error',
        description: 'Email is required',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('customerToken');
      if (!token) {
        toast({
          title: 'Login Required',
          description: 'Please login to set stock alerts',
          variant: 'destructive',
        });
        return;
      }

      const response = await fetch(`/api/stock-alerts/${productId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, phone }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        if (data.inStock) {
          toast({
            title: 'Product In Stock',
            description: 'This product is already in stock',
            variant: 'default',
          });
        } else {
          setHasAlert(true);
          setShowDialog(false);
          toast({
            title: 'Alert Set',
            description: 'You will be notified when this product is back in stock',
            variant: 'success',
          });
        }
      } else {
        toast({
          title: 'Error',
          description: data.error || data.message || 'Failed to set stock alert',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Stock alert error:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAlert = async () => {
    setLoading(true);

    try {
      const token = localStorage.getItem('customerToken');
      if (!token) return;

      const response = await fetch(`/api/stock-alerts/${productId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setHasAlert(false);
        toast({
          title: 'Alert Removed',
          description: 'Stock alert removed successfully',
          variant: 'default',
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to remove stock alert',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Stock alert error:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Don't show if product is in stock
  if (stock > 0) {
    return null;
  }

  if (checking) {
    return null; // Don't show while checking
  }

  if (variant === 'icon') {
    return (
      <>
        <button
          onClick={handleToggleAlert}
          disabled={loading}
          className={`p-2 rounded-lg border transition-all ${
            hasAlert
              ? 'bg-orange-50 border-orange-300 text-orange-600'
              : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
          } ${className}`}
          title={hasAlert ? 'Remove stock alert' : 'Notify me when in stock'}>
          {loading ? (
            <Loader2 className='w-4 h-4 animate-spin' />
          ) : (
            <Bell className={`w-4 h-4 ${hasAlert ? 'fill-current' : ''}`} />
          )}
        </button>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Notify Me When In Stock</DialogTitle>
              <DialogDescription>
                We'll send you an email when {productName} is back in stock.
              </DialogDescription>
            </DialogHeader>
            <div className='space-y-4 py-4'>
              <div>
                <Label htmlFor='email'>Email *</Label>
                <Input
                  id='email'
                  type='email'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder='your@email.com'
                  required
                />
              </div>
              <div>
                <Label htmlFor='phone'>Phone (Optional)</Label>
                <Input
                  id='phone'
                  type='tel'
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder='+91 1234567890'
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant='outline' onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddAlert} disabled={loading || !email.trim()}>
                {loading ? (
                  <>
                    <Loader2 className='w-4 h-4 animate-spin mr-2' />
                    Setting...
                  </>
                ) : (
                  'Set Alert'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  const sizeClasses = {
    sm: 'text-sm px-3 py-1.5',
    md: 'text-base px-4 py-2',
    lg: 'text-lg px-6 py-3',
  };

  return (
    <>
      <Button
        onClick={handleToggleAlert}
        disabled={loading}
        variant={hasAlert ? 'default' : 'outline'}
        className={`gap-2 ${sizeClasses[size]} ${className}`}>
        {loading ? (
          <>
            <Loader2 className='w-4 h-4 animate-spin' />
            {hasAlert ? 'Removing...' : 'Setting...'}
          </>
        ) : (
          <>
            {hasAlert ? (
              <>
                <BellOff className='w-4 h-4' />
                Remove Alert
              </>
            ) : (
              <>
                <Bell className='w-4 h-4' />
                Notify Me
              </>
            )}
          </>
        )}
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notify Me When In Stock</DialogTitle>
            <DialogDescription>
              We'll send you an email when {productName} is back in stock.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4 py-4'>
            <div>
              <Label htmlFor='email'>Email *</Label>
              <Input
                id='email'
                type='email'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder='your@email.com'
                required
              />
            </div>
            <div>
              <Label htmlFor='phone'>Phone (Optional)</Label>
              <Input
                id='phone'
                type='tel'
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder='+91 1234567890'
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddAlert} disabled={loading || !email.trim()}>
              {loading ? (
                <>
                  <Loader2 className='w-4 h-4 animate-spin mr-2' />
                  Setting...
                </>
              ) : (
                'Set Alert'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

