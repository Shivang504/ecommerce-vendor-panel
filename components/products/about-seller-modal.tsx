'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Star, Loader2 } from 'lucide-react';

interface SellerProfile {
  _id: string;
  storeName: string;
  storeSlug: string;
  description: string;
  logo: string;
  banner: string;
  location: string | null;
  gstVerified: boolean;
  joinedDate: string;
  metrics: {
    totalOrders: number;
    productCount: number;
    averageRating: number;
    totalReviews: number;
    onTimeDeliveryRate: number;
    avgDeliveryDays: number;
  };
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

interface AboutSellerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sellerId?: string;
  sellerSlug?: string;
}

export function AboutSellerModal({ open, onOpenChange, sellerId, sellerSlug }: AboutSellerModalProps) {
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && (sellerId || sellerSlug)) {
      fetchSellerData();
    }
  }, [open, sellerId, sellerSlug]);

  const fetchSellerData = async () => {
    try {
      setLoading(true);
      const id = sellerSlug || sellerId;
      const response = await fetch(`/api/seller/${id}`);
      
      if (!response.ok) {
        console.error('Failed to fetch seller data');
        return;
      }

      const data = await response.json();
      setSeller(data);
    } catch (error) {
      console.error('Error fetching seller data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate seller since (years and months)
  const getSellerSince = (joinedDate: string) => {
    if (!joinedDate) return 'N/A';
    const joined = new Date(joinedDate);
    const now = new Date();
    const years = now.getFullYear() - joined.getFullYear();
    const months = now.getMonth() - joined.getMonth();
    
    if (months < 0) {
      return `${years - 1} years ${12 + months} months`;
    }
    return `${years} years ${months} months`;
  };

  // Calculate Product Quality (based on average rating)
  const productQuality = seller?.metrics.averageRating || 0;
  
  // Calculate Service Quality (based on on-time delivery and rating combination)
  const serviceQuality = seller 
    ? ((seller.metrics.averageRating * 0.6) + (seller.metrics.onTimeDeliveryRate / 20 * 0.4)).toFixed(1)
    : 0;

  // Circular progress component
  const CircularProgress = ({ value, max = 5, size = 80 }: { value: number; max?: number; size?: number }) => {
    const percentage = (value / max) * 100;
    const radius = (size - 8) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    return (
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#e5e7eb"
            strokeWidth="6"
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#22c55e"
            strokeWidth="6"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-300"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-gray-900">{value.toFixed(1)}</span>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-left text-lg font-semibold">About the Seller</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : seller ? (
          <div className="space-y-6 py-4">
            {/* Seller Name and Rating */}
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">{seller.storeName}</h3>
              <div className="flex items-center gap-1 bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                <span className="font-semibold">{seller.metrics.averageRating.toFixed(1)}</span>
                <Star className="w-4 h-4 fill-current" />
              </div>
            </div>

            {/* Seller Since */}
            <div className="text-sm text-gray-600">
              <span className="font-medium">Seller since</span>{' '}
              <span>{getSellerSince(seller.joinedDate)}</span>
            </div>

            {/* Contact Seller - Just display text, no link for now */}
            {/* Future: Can add contact functionality here */}

            {/* Quality Metrics */}
            <div className="flex items-start gap-8 pt-4 border-t">
              {/* Product Quality */}
              <div className="flex-1 text-center">
                <CircularProgress value={productQuality} />
                <p className="text-sm font-medium text-gray-700 mt-2">Product Quality</p>
                <span className="text-blue-600 text-xs mt-1 inline-block">
                  Based on customer reviews
                </span>
              </div>

              {/* Service Quality */}
              <div className="flex-1 text-center">
                <CircularProgress value={Number(serviceQuality)} />
                <p className="text-sm font-medium text-gray-700 mt-2">Service Quality</p>
                <span className="text-blue-600 text-xs mt-1 inline-block">
                  Based on delivery performance
                </span>
              </div>
            </div>

            {/* Explanation Text */}
            <p className="text-xs text-gray-500 pt-2 border-t">
              Seller Score is calculated based on customer feedback and seller's performance.
            </p>
          </div>
        ) : (
          <div className="py-8 text-center text-gray-500">
            Seller information not available
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
