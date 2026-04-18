'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Star, Check, Truck, MapPin, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface OtherSeller {
  productId: string;
  productName: string;
  urlSlug: string;
  price: number;
  regularPrice: number;
  stock: number;
  image: string;
  freeShipping: boolean;
  vendor: {
    id: string;
    storeName: string;
    storeSlug: string;
    location: string | null;
    gstVerified: boolean;
    rating: number;
    totalReviews: number;
  };
}

interface OtherSellersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  currentPrice?: number;
}

export function OtherSellersModal({ open, onOpenChange, productId, currentPrice = 0 }: OtherSellersModalProps) {
  const [sellers, setSellers] = useState<OtherSeller[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (open && productId) {
      fetchOtherSellers();
    }
  }, [open, productId]);

  const fetchOtherSellers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/products/${productId}/other-sellers`);
      const data = await response.json();
      if (data.otherSellers) {
        setSellers(data.otherSellers);
      }
    } catch (error) {
      console.error('Error fetching other sellers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSeller = (seller: OtherSeller) => {
    // Navigate to the selected seller's product page
    const productUrl = `/products/${seller.urlSlug}`;
    router.push(productUrl);
    onOpenChange(false);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getSavings = (price: number) => {
    if (currentPrice === 0 || price >= currentPrice) return null;
    const savings = currentPrice - price;
    const savingsPercent = ((savings / currentPrice) * 100).toFixed(0);
    return { amount: savings, percent: savingsPercent };
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">See Other Sellers</DialogTitle>
          <p className="text-sm text-gray-600 mt-1">
            Compare prices and ratings from different sellers
          </p>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : sellers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No other sellers found for this product</p>
          </div>
        ) : (
          <div className="space-y-4 mt-4">
            {sellers.map((seller, index) => {
              const savings = getSavings(seller.price);
              const isBestPrice = index === 0 && seller.price < currentPrice;
              
              return (
                <div
                  key={seller.productId}
                  className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
                    isBestPrice ? 'border-green-500 bg-green-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex gap-4">
                    {/* Product Image */}
                    <div className="flex-shrink-0">
                      <img
                        src={seller.image}
                        alt={seller.productName}
                        className="w-20 h-20 object-cover rounded border"
                      />
                    </div>

                    {/* Seller Info & Price */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          {/* Seller Name & Rating */}
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg text-gray-900">
                              {seller.vendor.storeName}
                            </h3>
                            {seller.vendor.rating > 0 && (
                              <div className="flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-semibold">
                                <Star className="w-3 h-3 fill-current" />
                                <span>{seller.vendor.rating.toFixed(1)}</span>
                                {seller.vendor.totalReviews > 0 && (
                                  <span className="text-gray-600">
                                    ({seller.vendor.totalReviews})
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Seller Location & Badges */}
                          <div className="flex items-center gap-3 flex-wrap mb-3">
                            {seller.vendor.location && (
                              <div className="flex items-center gap-1 text-xs text-gray-600">
                                <MapPin className="w-3 h-3" />
                                <span>{seller.vendor.location}</span>
                              </div>
                            )}
                            {seller.vendor.gstVerified && (
                              <div className="flex items-center gap-1 text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded">
                                <Shield className="w-3 h-3" />
                                <span>GST Verified</span>
                              </div>
                            )}
                            {seller.freeShipping && (
                              <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                                <Truck className="w-3 h-3" />
                                <span>Free Shipping</span>
                              </div>
                            )}
                          </div>

                          {/* Stock Status */}
                          <div className="flex items-center gap-2 mb-3">
                            {seller.stock > 0 ? (
                              <div className="flex items-center gap-1 text-sm text-green-600">
                                <Check className="w-4 h-4" />
                                <span>In Stock ({seller.stock} available)</span>
                              </div>
                            ) : (
                              <div className="text-sm text-red-600">Out of Stock</div>
                            )}
                          </div>
                        </div>

                        {/* Price Section */}
                        <div className="flex-shrink-0 text-right">
                          <div className="mb-2">
                            <div className="text-2xl font-bold text-gray-900">
                              {formatPrice(seller.price)}
                            </div>
                            {seller.regularPrice > seller.price && (
                              <div className="text-sm text-gray-500 line-through">
                                {formatPrice(seller.regularPrice)}
                              </div>
                            )}
                          </div>
                          
                          {savings && (
                            <div className="text-sm text-green-600 font-semibold mb-2">
                              Save {formatPrice(savings.amount)} ({savings.percent}%)
                            </div>
                          )}
                          
                          {isBestPrice && (
                            <div className="text-xs bg-green-600 text-white px-2 py-1 rounded mb-2 inline-block">
                              Best Price
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="mt-4 pt-4 border-t">
                        <Button
                          onClick={() => handleSelectSeller(seller)}
                          className="w-full"
                          disabled={seller.stock === 0}
                        >
                          {seller.stock === 0 ? 'Out of Stock' : 'Go to Seller'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
