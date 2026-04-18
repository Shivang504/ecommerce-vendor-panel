'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Star, Trash2, Search, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DataTableBody } from '@/components/ui/data-table-body';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Review {
  _id: string;
  productId: string;
  customerName: string;
  customerEmail: string;
  rating: number;
  title?: string;
  description: string;
  photos: string[];
  helpfulCount: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  verifiedPurchase?: boolean;
}


export function ReviewListAdmin() {
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState<string | null>(null);
  const [isVendor, setIsVendor] = useState(false);

  useEffect(() => {
    // Check if user is a vendor
    const adminUserStr = localStorage.getItem('adminUser');
    if (adminUserStr) {
      try {
        const adminUser = JSON.parse(adminUserStr);
        if (adminUser?.role === 'vendor') {
          setIsVendor(true);
        }
      } catch (error) {
        console.error('Error parsing adminUser:', error);
      }
    }
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/reviews', {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setReviews(data.reviews || []);
      } else {
        toast.error('Failed to fetch reviews');
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast.error('Failed to fetch reviews');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (productId: string) => {
    setReviewToDelete(productId);
    setDeleteDialogOpen(true);
  };

  const deleteReview = async () => {
    if (!reviewToDelete) return;

    try {
      const response = await fetch(`/api/admin/reviews?reviewId=${reviewToDelete}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        toast.success('Review deleted successfully');
        fetchReviews();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete review');
      }
    } catch (error) {
      console.error('Error deleting review:', error);
      toast.error('Failed to delete review');
    }
  };

  const filteredReviews = reviews.filter(review => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      review.customerName.toLowerCase().includes(query) ||
      review.customerEmail.toLowerCase().includes(query) ||
      review.description.toLowerCase().includes(query) ||
      review.title?.toLowerCase().includes(query)
    );
  });

  const renderStars = (rating: number) => {
    return (
      <div className='flex items-center gap-1'>
        {[...Array(5)].map((_, i) => (
          <Star key={i} className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
        ))}
      </div>
    );
  };

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <h1 className='text-3xl font-bold'>Product Reviews</h1>
        <Button onClick={() => router.push('/admin/reviews/add')} className='flex items-center gap-2'>
          <Plus className='w-5 h-5' />
          Add Review
        </Button>
      </div>

      <Card className='p-6 shadow-md border border-gray-200 overflow-hidden'>
        {/* Search */}
        <div className='flex flex-row gap-3 mb-4 items-center justify-between'>
          <Input placeholder='Search reviews...' value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className='max-w-xs' />
        </div>

        {/* Reviews Table */}
        <div className='overflow-x-auto'>
          <Table>
            <TableHeader>
              <TableRow className='bg-gray-50 border-b border-gray-200 hover:bg-gray-50'>
                <TableHead className='font-semibold text-gray-700 py-4'>Rating</TableHead>
                <TableHead className='font-semibold text-gray-700 py-4'>Customer</TableHead>
                <TableHead className='font-semibold text-gray-700 py-4'>Review</TableHead>
                <TableHead className='font-semibold text-gray-700 py-4'>Product</TableHead>
                <TableHead className='font-semibold text-gray-700 py-4'>Photos</TableHead>
                <TableHead className='font-semibold text-gray-700 py-4'>Status</TableHead>
                <TableHead className='font-semibold text-gray-700 py-4'>Date</TableHead>
                <TableHead className='font-semibold text-gray-700 py-4 text-right'>Action</TableHead>
              </TableRow>
            </TableHeader>
            <DataTableBody
              loading={loading}
              data={filteredReviews}
              columns={8}
              loadingText='Loading reviews...'
              emptyText={searchQuery ? 'No reviews found matching your search' : 'No reviews found'}>
              {filteredReviews.map(review => (
                <TableRow key={review._id} className='border-b border-gray-200 hover:bg-green-50 transition-colors duration-150'>
                  <TableCell className='py-4'>{renderStars(review.rating)}</TableCell>
                  <TableCell className='py-4'>
                    <div>
                      <p className='font-semibold text-gray-900'>{review.customerName}</p>
                      <p className='text-xs text-gray-500'>{review.customerEmail}</p>
                      {review.verifiedPurchase && (
                        <Badge variant='default' className='mt-1 px-2 text-xs'>
                          Verified
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className='py-4'>
                    <div className='max-w-md'>
                      {review.title && <p className='font-semibold text-gray-900 mb-1 max-w-md truncate'>{review.title}</p>}
                      <p className='text-sm text-gray-700 line-clamp-2 max-w-md truncate'>{review.description}</p>
                    </div>
                  </TableCell>
                  <TableCell className='py-4'>
                    <a
                      href={`/products/${review.productId}`}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='text-blue-600 hover:underline text-sm'>
                      View Product
                    </a>
                  </TableCell>
                  <TableCell className='py-4'>
                    {review.photos && review.photos.length > 0 ? (
                      <div className='flex gap-1'>
                        {review.photos.slice(0, 3).map((photo, index) => (
                          <img
                            key={index}
                            src={photo}
                            alt={`Review photo ${index + 1}`}
                            className='w-10 h-10 object-cover rounded border border-gray-200'
                          />
                        ))}
                        {review.photos.length > 3 && <span className='text-xs text-gray-500 self-center'>+{review.photos.length - 3}</span>}
                      </div>
                    ) : (
                      <span className='text-gray-400 text-sm'>No photos</span>
                    )}
                  </TableCell>
                  <TableCell className='py-4'>
                    <Badge variant='default' className='px-3'>
                      LIVE
                    </Badge>
                  </TableCell>
                  <TableCell className='text-gray-600 py-4'>
                    <span className='text-sm'>{format(new Date(review.createdAt), 'MMM dd, yyyy')}</span>
                  </TableCell>
                  <TableCell className='py-4'>
                    <div className='flex items-center justify-end gap-2'>
                      {!isVendor && (
                        <button
                          onClick={() => handleDeleteClick(review._id || '')}
                          className='p-2 text-red-600 hover:bg-red-50 rounded transition'
                          title='Delete Review'>
                          <Trash2 className='w-4 h-4' />
                        </button>
                      )}
                      {isVendor && (
                        <span className='text-gray-400 text-xs'>Delete not allowed</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </DataTableBody>
          </Table>
        </div>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className='bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-slate-900 dark:text-white'>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription className='text-slate-600 dark:text-slate-400'>
              This action cannot be undone. This will permanently delete the review from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className='border-slate-200 dark:border-slate-700'>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteReview} className='bg-red-600 hover:bg-red-700 text-white'>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
