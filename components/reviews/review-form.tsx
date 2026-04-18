'use client';

import { useState, useRef } from 'react';
import { Star, X, Upload, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ReviewFormProps {
  productId: string;
  productName: string;
  onSubmit: () => void;
  onCancel?: () => void;
}

export function ReviewForm({ productId, productName, onSubmit, onCancel }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Limit to 5 photos
    const filesToUpload = Array.from(files).slice(0, 5 - photos.length);
    
    if (files.length > 5 - photos.length) {
      toast.error('You can only upload up to 5 photos');
    }

    setUploading(true);
    try {
      const uploadPromises = filesToUpload.map(async (file) => {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          throw new Error(`${file.name} is not an image`);
        }

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`${file.name} is too large. Maximum size is 5MB`);
        }

        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Upload failed');
        }

        return data.url;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      setPhotos((prev) => [...prev, ...uploadedUrls]);
      toast.success('Photos uploaded successfully');
    } catch (error: any) {
      console.error('Error uploading photos:', error);
      toast.error(error.message || 'Failed to upload photos');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!rating || rating === 0) {
      toast.error('Please provide a rating');
      return;
    }

    if (!description.trim()) {
      toast.error('Please write a review description');
      return;
    }

    if (description.trim().length < 10) {
      toast.error('Review description must be at least 10 characters');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('customerToken') || document.cookie
        .split('; ')
        .find(row => row.startsWith('customerToken='))
        ?.split('=')[1];

      if (!token) {
        toast.error('Please login to submit a review');
        return;
      }

      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        credentials: 'include',
        body: JSON.stringify({
          productId,
          rating,
          title: title.trim() || undefined,
          description: description.trim(),
          photos,
          verifiedPurchase: false, // Can be enhanced to check if customer purchased
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || 'Review submitted successfully!');
        // Reset form
        setRating(0);
        setTitle('');
        setDescription('');
        setPhotos([]);
        onSubmit();
      } else {
        toast.error(data.error || 'Failed to submit review');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className='border border-gray-200 rounded-lg p-4 sm:p-6 bg-gray-50'>
      <h3 className='text-lg sm:text-xl font-bold text-gray-900 mb-4'>Write a Review</h3>
      
      <form onSubmit={handleSubmit} className='space-y-4'>
        {/* Rating */}
        <div>
          <label className='block text-sm font-semibold text-gray-700 mb-2'>
            Rating <span className='text-red-500'>*</span>
          </label>
          <div 
            className='flex gap-1'
            onMouseLeave={() => setHoveredRating(0)}
          >
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type='button'
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                className='focus:outline-none'
              >
                <Star
                  className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${
                    star <= (hoveredRating || rating)
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className='text-sm text-gray-600 mt-1'>
              {rating === 5 && 'Excellent!'}
              {rating === 4 && 'Good'}
              {rating === 3 && 'Average'}
              {rating === 2 && 'Poor'}
              {rating === 1 && 'Very Poor'}
            </p>
          )}
        </div>

        {/* Title */}
        <div>
          <label htmlFor='review-title' className='block text-sm font-semibold text-gray-700 mb-2'>
            Review Title (Optional)
          </label>
          <input
            id='review-title'
            type='text'
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder='Give your review a title'
            maxLength={100}
            className='w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-web focus:border-transparent'
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor='review-description' className='block text-sm font-semibold text-gray-700 mb-2'>
            Your Review <span className='text-red-500'>*</span>
          </label>
          <textarea
            id='review-description'
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder='Share your experience with this product...'
            rows={5}
            minLength={10}
            maxLength={2000}
            className='w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-web focus:border-transparent resize-none'
            required
          />
          <p className='text-xs text-gray-500 mt-1'>
            {description.length}/2000 characters (minimum 10)
          </p>
        </div>

        {/* Photo Upload */}
        <div>
          <label className='block text-sm font-semibold text-gray-700 mb-2'>
            Photos (Optional) - Max 5
          </label>
          <input
            ref={fileInputRef}
            type='file'
            accept='image/*'
            multiple
            onChange={handlePhotoUpload}
            disabled={uploading || photos.length >= 5}
            className='hidden'
            id='review-photos'
          />
          <label
            htmlFor='review-photos'
            className={`flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-md cursor-pointer transition ${
              uploading || photos.length >= 5
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:border-web hover:bg-web/5'
            }`}
          >
            <Upload className='w-5 h-5 text-gray-500' />
            <span className='text-sm font-medium text-gray-700'>
              {uploading ? 'Uploading...' : photos.length >= 5 ? 'Maximum 5 photos' : 'Upload Photos'}
            </span>
          </label>

          {/* Photo Preview */}
          {photos.length > 0 && (
            <div className='grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 mt-3'>
              {photos.map((photo, index) => (
                <div key={index} className='relative group'>
                  <img
                    src={photo}
                    alt={`Review photo ${index + 1}`}
                    className='w-full h-20 object-cover rounded-md border border-gray-200'
                  />
                  <button
                    type='button'
                    onClick={() => removePhoto(index)}
                    className='absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition'
                  >
                    <X className='w-4 h-4' />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

          {/* Submit Buttons */}
        <div className='flex flex-col sm:flex-row gap-3 pt-4'>
          <button
            type='submit'
            disabled={submitting || !rating || !description.trim()}
            className='flex-1 bg-web text-white px-4 sm:px-6 py-2 sm:py-3 rounded-md text-sm sm:text-base font-semibold hover:bg-web/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'
          >
            {submitting ? (
              <>
                <Loader2 className='w-5 h-5 animate-spin' />
                <span>Submitting...</span>
              </>
            ) : (
              'Submit Review'
            )}
          </button>
          {onCancel && (
            <button
              type='button'
              onClick={onCancel}
              disabled={submitting}
              className='px-4 sm:px-6 py-2 sm:py-3 border border-gray-300 rounded-md text-sm sm:text-base font-semibold text-gray-700 hover:bg-gray-50 transition disabled:opacity-50'
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

